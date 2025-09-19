import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CONTENT_PILLARS } from '../config/contentPillars.js';
import database from '../config/database.js';
import { logger } from '../utils/logger.js';

class IdeaGenerationService {
  constructor() {
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
    
    this.platformSpecs = {
      tiktok: {
        formats: ['talking head', 'two-person dialogue', 'personal story + lesson', 'evidence-based explanation'],
        hookStyles: ['challenge assumptions', 'credibility leading', 'relatable situations', 'contrarian view', 'data-backed claims'],
        keyPointsCount: 3,
        contentLength: '1:30-2:00 minutes',
        voiceElements: ['fast pace', 'entertainment value', 'trending hooks', 'authentic delivery']
      },
      linkedin: {
        formats: ['carousel', 'long-form post', 'video', 'infographic', 'data visualization'],
        hookStyles: ['professional insight', 'industry expertise', 'evidence-based', 'thought leadership', 'save-worthy framework'],
        keyPointsCount: 5,
        contentLength: 'medium-long',
        voiceElements: ['data-driven', 'save-worthy', 'professional credibility', 'actionable frameworks']
      },
      instagram: {
        formats: ['carousel', 'reel', 'story series', 'behind-the-scenes', 'framework post'],
        hookStyles: ['educational framework', 'behind-the-scenes', 'community building', 'personal journey'],
        keyPointsCount: 4,
        contentLength: 'medium',
        voiceElements: ['educational', 'community-focused', 'authentic', 'framework-driven']
      }
    };
  }

  async generateWeeklyIdeas(contentAnalysis, targetCount = 15) {
    logger.info(`Generating ${targetCount} content ideas from weekly analysis`);
    
    try {
      const ideas = [];
      
      for (const theme of contentAnalysis.themes.slice(0, 6)) {
        const themeIdeas = await this.generateIdeasForTheme(theme, Math.ceil(targetCount / contentAnalysis.themes.length));
        ideas.push(...themeIdeas);
      }

      const hannaWinners = await this.getHannaTopPerformers();
      const historyBasedIdeas = await this.generateHistoryBasedIdeas(hannaWinners, 3);
      ideas.push(...historyBasedIdeas);

      const finalIdeas = ideas.slice(0, targetCount);
      
      for (const idea of finalIdeas) {
        await this.saveIdeaToDatabase(idea);
      }

      logger.info(`Generated ${finalIdeas.length} content ideas`);
      return finalIdeas;
    } catch (error) {
      logger.error('Error generating weekly ideas:', error);
      throw error;
    }
  }

  async generateIdeasForTheme(theme, count = 3) {
    const ideas = [];
    
    try {
      const themeList = Array.isArray(theme.themes) ? theme.themes : [theme.themes];
      const themeContent = themeList.join(', ');
      const pillarInfo = CONTENT_PILLARS[theme.pillar] || {};
      
      const prompt = `You're creating content for Hanna Gets Hired, helping professionals build fulfilling, intentional careers.

BRAND CONTEXT:
- Audience: Women 24-34, mid-level professionals (Career Pivoters, Ambitious Climbers, Burnt Out Achievers, etc.)
- Voice: Authentic, evidence-based, empowering, challenges assumptions
- Approach: Value-first, transformation-focused, credibility-driven

Theme Analysis:
Theme: ${theme.cluster}
Key topics: ${themeContent}
Content pillar: ${pillarInfo.name || 'Career Clarity & Goals'}
Target audience: ${pillarInfo.audience || 'All segments'}
Engagement level: ${Math.round(theme.avgEngagement)}

Generate ${count} content ideas that:
1. Challenge common career assumptions
2. Lead with credibility/experience ("After 6 years in recruiting...")
3. Provide actionable frameworks
4. Use empowering language
5. Focus on intentional career building

For each idea:
1. Title that challenges assumptions or provides contrarian view
2. Best platform (TikTok, LinkedIn, or Instagram)
3. Format from Hanna's high-performance formats
4. 3 hook options using her proven opening approaches
5. Key points that provide actionable value
6. Why this resonates with the target audience segment

Use Hanna's proven hook styles:
- "Most people make career decisions the wrong way..."
- "After 6 years in recruiting, here's what I learned..."
- "If you're dreading Monday mornings..."
- "According to research..."
- "There's one thing nobody tells you about..."

Return as JSON array with this structure:
[
  {
    "title": "Transformational idea title",
    "platform": "tiktok|linkedin|instagram",
    "format": "specific format from platform specs",
    "hooks": ["credibility-based hook", "assumption-challenging hook", "relatable situation hook"],
    "keyPoints": ["actionable point 1", "framework element 2", "transformation insight 3"],
    "rationale": "Why this resonates with [audience segment] and drives transformation",
    "pillar": "${theme.pillar}",
    "sourceTheme": "${theme.cluster}",
    "audienceSegment": "Primary target segment"
  }
]`;

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
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.7
        });
        response = result.choices[0].message.content;
      }

      const generatedIdeas = JSON.parse(response);
      
      for (const idea of generatedIdeas) {
        const enhancedIdea = await this.enhanceIdeaWithSources(idea, theme);
        ideas.push(enhancedIdea);
      }

      return ideas;
    } catch (error) {
      logger.error(`Error generating ideas for theme ${theme.cluster}:`, error);
      return this.generateFallbackIdeas(theme, count);
    }
  }

  async generateHistoryBasedIdeas(hannaWinners, count = 3) {
    const ideas = [];
    
    if (!hannaWinners.length) {
      return ideas;
    }

    try {
      const topPosts = hannaWinners.slice(0, 5);
      const winnersText = topPosts.map(post => `${post.platform}: ${post.content}`).join('\n');

      const prompt = `Based on these top-performing posts from Hanna (career creator), generate ${count} new content ideas that follow similar patterns but with fresh angles:

Top performers:
${winnersText}

For each new idea:
1. Identify the winning pattern/format
2. Create a fresh angle on the same theme
3. Suggest platform and format
4. Provide 3 hook options
5. List 3-5 key points
6. Explain why this builds on past success

Return as JSON array with the same structure as before.`;

      let response;
      if (this.useAnthropic) {
        response = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }]
        });
        response = response.content[0].text;
      }

      const historyIdeas = JSON.parse(response);
      
      for (const idea of historyIdeas) {
        idea.sourceType = 'historical_winner';
        idea.pillar = this.classifyContentToPillar(idea.title + ' ' + idea.keyPoints.join(' '));
        ideas.push(idea);
      }

      return ideas;
    } catch (error) {
      logger.error('Error generating history-based ideas:', error);
      return [];
    }
  }

  async enhanceIdeaWithSources(idea, theme) {
    try {
      const sources = await database.all(`
        SELECT url, title, source FROM news_articles 
        WHERE pillar_tags LIKE ? 
        ORDER BY engagement_score DESC 
        LIMIT 2
      `, [`%${theme.pillar}%`]);

      idea.sourceLinks = sources.map(s => ({
        title: s.title,
        url: s.url,
        source: s.source
      }));

      idea.sourceTheme = theme.cluster;
      idea.engagementPotential = this.calculateEngagementPotential(idea, theme);
      
      return idea;
    } catch (error) {
      logger.error('Error enhancing idea with sources:', error);
      idea.sourceLinks = [];
      return idea;
    }
  }

  generateFallbackIdeas(theme, count) {
    const pillarInfo = CONTENT_PILLARS[theme.pillar] || {};
    const fallbackTemplates = [
      {
        title: `${pillarInfo.sampleTopics?.[0] || 'Career advice'} - what nobody tells you`,
        platform: 'tiktok',
        format: 'talking head',
        hooks: [
          'Nobody talks about this career mistake',
          'I wish someone told me this 5 years ago',
          'This career advice is actually terrible'
        ]
      },
      {
        title: `The hidden truth about ${theme.cluster.toLowerCase()}`,
        platform: 'linkedin',
        format: 'long-form post',
        hooks: [
          'After 10 years in the industry, here\'s what I\'ve learned',
          'The data reveals something surprising',
          'Most professionals get this wrong'
        ]
      }
    ];

    return fallbackTemplates.slice(0, count).map((template, index) => ({
      ...template,
      keyPoints: pillarInfo.keywords?.slice(0, 3) || ['Point 1', 'Point 2', 'Point 3'],
      rationale: `Addresses current themes in ${theme.cluster}`,
      pillar: theme.pillar,
      sourceTheme: theme.cluster,
      sourceLinks: [],
      engagementPotential: 50 + index * 10
    }));
  }

  calculateEngagementPotential(idea, theme) {
    let score = 50;
    
    if (theme.avgEngagement > 70) score += 20;
    else if (theme.avgEngagement > 40) score += 10;
    
    if (idea.platform === 'tiktok' && idea.hooks.some(h => h.includes('nobody') || h.includes('wish'))) {
      score += 15;
    }
    
    if (idea.platform === 'linkedin' && idea.format === 'carousel') {
      score += 10;
    }
    
    return Math.min(100, score);
  }

  classifyContentToPillar(content) {
    const lowerContent = content.toLowerCase();
    
    for (const [pillarId, pillar] of Object.entries(CONTENT_PILLARS)) {
      if (pillar.keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
        return pillarId;
      }
    }
    
    return 'CAREER_DEVELOPMENT';
  }

  async getHannaTopPerformers(limit = 10) {
    try {
      return await database.all(`
        SELECT * FROM hanna_analytics 
        WHERE performance_category = 'high'
        ORDER BY imported_date DESC 
        LIMIT ?
      `, [limit]);
    } catch (error) {
      logger.error('Error getting Hanna top performers:', error);
      return [];
    }
  }

  async saveIdeaToDatabase(idea, weekId = null) {
    try {
      await database.run(`
        INSERT INTO content_ideas 
        (title, platform, format, hooks, key_points, pillar_tags, rationale, source_links, week_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        idea.title,
        idea.platform,
        idea.format,
        JSON.stringify(idea.hooks),
        JSON.stringify(idea.keyPoints),
        JSON.stringify([idea.pillar]),
        idea.rationale,
        JSON.stringify(idea.sourceLinks || []),
        weekId
      ]);
    } catch (error) {
      logger.error('Error saving idea to database:', error);
    }
  }

  async generateCustomIdea(userPrompt, platform = null) {
    try {
      const prompt = `Generate a content idea for a career/work creator based on this request: "${userPrompt}"

Requirements:
- Platform: ${platform || 'best recommendation'}
- Provide 3 hook options
- List 3-5 key points
- Suggest format
- Map to content pillar
- Include rationale

Return as JSON with the standard structure.`;

      let response;
      if (this.useAnthropic) {
        response = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        });
        response = response.content[0].text;
      }

      const idea = JSON.parse(response);
      idea.sourceType = 'custom_request';
      
      return idea;
    } catch (error) {
      logger.error('Error generating custom idea:', error);
      throw error;
    }
  }
}

export default new IdeaGenerationService();