import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CONTENT_PILLARS } from '../config/contentPillars.js';
import database from '../config/database.js';
import { logger } from '../utils/logger.js';

class ContentAnalysisService {
  constructor() {
    this.openai = null;
    this.anthropic = null;
    this.useAnthropic = false;
    this.initialized = false;
  }
  
  initialize() {
    if (this.initialized) return;
    
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
    
    this.useAnthropic = !!process.env.ANTHROPIC_API_KEY;
    
    // Validate at least one API is available
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('No AI API key found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env file.');
    }
    
    this.initialized = true;
  }

  async clusterWeeklyContent(articles, socialPosts) {
    this.initialize();
    logger.info('Starting content clustering and theme detection');
    
    try {
      const allContent = [
        ...articles.map(a => ({
          id: a.id,
          type: 'article',
          content: `${a.title}\n${a.content}`,
          source: a.source,
          pillarTags: JSON.parse(a.pillar_tags || '[]'),
          engagementScore: a.engagement_score || 0,
          publishedDate: a.published_date
        })),
        ...socialPosts.map(p => ({
          id: p.id,
          type: 'social',
          content: p.content,
          source: `${p.platform}:${p.creator_handle}`,
          pillarTags: JSON.parse(p.pillar_tags || '[]'),
          engagementScore: p.performance_score || 0,
          publishedDate: p.posted_date
        }))
      ];

      const clusters = await this.performSemanticClustering(allContent);
      const themes = await this.extractThemes(clusters);
      const trendingTopics = await this.identifyTrendingTopics(allContent);
      
      const analysis = {
        clusters,
        themes,
        trendingTopics,
        totalContent: allContent.length,
        pillarDistribution: this.analyzePillarDistribution(allContent),
        engagementInsights: this.analyzeEngagement(allContent)
      };

      logger.info(`Content clustering complete: ${clusters.length} clusters, ${themes.length} themes`);
      return analysis;
    } catch (error) {
      logger.error('Error during content clustering:', error);
      throw error;
    }
  }

  async performSemanticClustering(content) {
    const clusters = [];
    
    try {
      const contentText = content.map(item => `${item.content.substring(0, 500)}`).join('\n\n---\n\n');
      
      const prompt = `Analyze this collection of career/work-related content and group it into 5-7 thematic clusters. For each cluster, provide:
1. Cluster name (2-4 words)
2. Brief description (1 sentence)
3. Key themes/topics within this cluster
4. Content IDs that belong to this cluster (based on content order)

Content to analyze:
${contentText}

Return response as JSON with this structure:
{
  "clusters": [
    {
      "name": "Cluster Name",
      "description": "Brief description",
      "themes": ["theme1", "theme2"],
      "contentIndices": [0, 3, 7],
      "pillarAlignment": "PILLAR_ID"
    }
  ]
}`;

      let response;
      if (this.useAnthropic) {
        response = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        });
        response = response.content[0].text;
      } else {
        const result = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.3
        });
        response = result.choices[0].message.content;
      }

      const parsed = JSON.parse(response);
      
      for (const cluster of parsed.clusters) {
        const clusterContent = cluster.contentIndices.map(i => content[i]).filter(Boolean);
        
        clusters.push({
          name: cluster.name,
          description: cluster.description,
          themes: cluster.themes,
          content: clusterContent,
          pillarAlignment: cluster.pillarAlignment,
          size: clusterContent.length,
          avgEngagement: clusterContent.reduce((sum, item) => sum + item.engagementScore, 0) / clusterContent.length || 0
        });
      }

      return clusters;
    } catch (error) {
      logger.error('Semantic clustering failed:', error);
      return this.fallbackClustering(content);
    }
  }

  fallbackClustering(content) {
    const clusters = {};
    
    content.forEach(item => {
      const primaryPillar = item.pillarTags[0] || 'UNCATEGORIZED';
      
      if (!clusters[primaryPillar]) {
        clusters[primaryPillar] = {
          name: CONTENT_PILLARS[primaryPillar]?.name || 'Other Topics',
          description: CONTENT_PILLARS[primaryPillar]?.description || 'Various career-related content',
          themes: CONTENT_PILLARS[primaryPillar]?.keywords || [],
          content: [],
          pillarAlignment: primaryPillar,
          size: 0,
          avgEngagement: 0
        };
      }
      
      clusters[primaryPillar].content.push(item);
      clusters[primaryPillar].size++;
    });

    Object.values(clusters).forEach(cluster => {
      cluster.avgEngagement = cluster.content.reduce((sum, item) => sum + item.engagementScore, 0) / cluster.size || 0;
    });

    return Object.values(clusters);
  }

  async extractThemes(clusters) {
    const themes = [];
    
    try {
      for (const cluster of clusters) {
        if (cluster.content.length < 2) continue;
        
        const clusterText = cluster.content.map(item => item.content).join(' ').substring(0, 1000);
        
        const prompt = `Analyze this cluster of career/work content and extract 3-5 key themes or insights. Focus on what's trending, what people are discussing, and actionable insights for content creators.

Cluster: ${cluster.name}
Content sample: ${clusterText}

Return themes as a JSON array of strings.`;

        let response;
        if (this.useAnthropic) {
          response = await this.anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
          });
          response = response.content[0].text;
        } else {
          const result = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.3
          });
          response = result.choices[0].message.content;
        }

        const clusterThemes = JSON.parse(response);
        
        themes.push({
          cluster: cluster.name,
          pillar: cluster.pillarAlignment,
          themes: clusterThemes,
          contentCount: cluster.size,
          avgEngagement: cluster.avgEngagement
        });
      }

      return themes;
    } catch (error) {
      logger.error('Theme extraction failed:', error);
      return clusters.map(c => ({
        cluster: c.name,
        pillar: c.pillarAlignment,
        themes: c.themes.slice(0, 3),
        contentCount: c.size,
        avgEngagement: c.avgEngagement
      }));
    }
  }

  async identifyTrendingTopics(content) {
    const topics = {};
    const recentContent = content.filter(item => {
      const publishedDate = new Date(item.publishedDate);
      const daysSincePublished = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSincePublished <= 3;
    });

    recentContent.forEach(item => {
      const words = item.content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      words.forEach(word => {
        topics[word] = (topics[word] || 0) + 1;
      });
    });

    const trendingWords = Object.entries(topics)
      .filter(([word, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({ word, mentions: count }));

    return trendingWords;
  }

  analyzePillarDistribution(content) {
    const distribution = {};
    
    content.forEach(item => {
      item.pillarTags.forEach(pillar => {
        distribution[pillar] = (distribution[pillar] || 0) + 1;
      });
    });

    const total = content.length;
    const percentages = {};
    
    Object.entries(distribution).forEach(([pillar, count]) => {
      percentages[pillar] = {
        count,
        percentage: Math.round((count / total) * 100)
      };
    });

    return percentages;
  }

  analyzeEngagement(content) {
    const insights = {
      topPerforming: content
        .filter(item => item.engagementScore > 0)
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 10),
      averageBySource: {},
      averageByPillar: {}
    };

    const sourceGroups = {};
    const pillarGroups = {};

    content.forEach(item => {
      if (!sourceGroups[item.source]) {
        sourceGroups[item.source] = [];
      }
      sourceGroups[item.source].push(item.engagementScore);

      item.pillarTags.forEach(pillar => {
        if (!pillarGroups[pillar]) {
          pillarGroups[pillar] = [];
        }
        pillarGroups[pillar].push(item.engagementScore);
      });
    });

    Object.entries(sourceGroups).forEach(([source, scores]) => {
      insights.averageBySource[source] = scores.reduce((sum, score) => sum + score, 0) / scores.length || 0;
    });

    Object.entries(pillarGroups).forEach(([pillar, scores]) => {
      insights.averageByPillar[pillar] = scores.reduce((sum, score) => sum + score, 0) / scores.length || 0;
    });

    return insights;
  }

  async generateContentSummary(analysis) {
    this.initialize();
    try {
      const prompt = `Based on this content analysis for a career/work creator, write a concise executive summary (3 bullet points) highlighting the week's key trends, opportunities, and insights.

Analysis:
- Total content pieces: ${analysis.totalContent}
- Main themes: ${analysis.themes.map(t => t.cluster).join(', ')}
- Trending topics: ${analysis.trendingTopics.slice(0, 5).map(t => t.word).join(', ')}
- Top performing content types: ${Object.entries(analysis.engagementInsights.averageBySource).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([source]) => source).join(', ')}

Focus on actionable insights for content creation.`;

      let response;
      if (this.useAnthropic) {
        response = await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }]
        });
        response = response.content[0].text;
      } else {
        const result = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.3
        });
        response = result.choices[0].message.content;
      }

      return response.trim();
    } catch (error) {
      logger.error('Summary generation failed:', error);
      return `• ${analysis.themes.length} key themes identified this week\n• ${analysis.trendingTopics.length} trending topics detected\n• Focus areas: ${analysis.themes.slice(0, 2).map(t => t.cluster).join(', ')}`;
    }
  }
}

export default new ContentAnalysisService();