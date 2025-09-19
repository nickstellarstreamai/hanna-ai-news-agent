import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { CONTENT_PILLARS } from '../config/contentPillars.js';
import database from '../config/database.js';
import ideaGeneration from './ideaGeneration.js';
import { logger } from '../utils/logger.js';

class ChatbotService {
  constructor() {
    this.openai = null;
    this.anthropic = null;
    this.useAnthropic = false;
    this.initialized = false;
    this.conversationHistory = new Map();
    
    this.systemPrompt = `You are Hanna's AI content assistant for "Hanna Gets Hired" - helping transform how professionals approach their careers.

MISSION: Help people build fulfilling, intentional careers aligned with their personal definition of success - not prescribed paths.

AUDIENCE: Primarily women 24-34, mid-level professionals with 3-10 years experience:
- Career Pivoters (25-30%): Dissatisfied but unclear on direction
- Ambitious Climbers (20-25%): Clear goals but stuck in execution  
- Recent Casualties (15-20%): Recently laid off, need confidence
- Burnt Out Achievers (15-20%): Successful but exhausted
- Side Hustle Seekers (10-15%): Want additional income streams

Content Pillars you work with:
${Object.entries(CONTENT_PILLARS).map(([id, pillar]) => `- ${pillar.name}: ${pillar.description} (Audience: ${pillar.audience})`).join('\n')}

HANNA'S BRAND VOICE:
- Authentic and relatable ("I've been there")
- Evidence-based with credibility ("After 6 years in recruiting...")
- Value-first approach (teach manual method before tools)
- Empowering language ("You deserve...", "You have every right to...")
- Challenge assumptions ("Most people think X, but actually...")
- Focus on transformation, not quick fixes

CONTENT APPROACH:
1. Lead with insight/statistic/contrarian view
2. Share expertise/experience for credibility  
3. Provide actionable framework
4. Keep 80% value, 20% product mentions
5. End with clear transformation/next steps

PLATFORM STRATEGIES:
- TikTok: Faster pace, entertainment value, trending hooks, 1:30-2:00 minutes
- LinkedIn: Professional insights, data-driven, carousel/long-form, save-worthy content
- Instagram: Educational frameworks, behind-the-scenes, community building

Capabilities:
1. Generate platform-specific content ideas with Hanna's voice
2. Provide value-first hooks that challenge assumptions
3. Create frameworks and actionable takeaways
4. Reference audience pain points and segments
5. Suggest engagement strategies and community building
6. Explain strategic reasoning behind recommendations`;
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
    this.initialized = true;
  }

  async processMessage(userId, message, context = {}) {
    try {
      logger.info(`Processing chatbot message from ${userId}: ${message.substring(0, 100)}...`);
      
      const conversationId = this.getConversationId(userId);
      const conversation = this.getConversation(conversationId);
      
      const contextData = await this.gatherContext(message, context);
      
      const response = await this.generateResponse(message, conversation, contextData);
      
      conversation.push({ role: 'user', content: message, timestamp: Date.now() });
      conversation.push({ role: 'assistant', content: response.content, timestamp: Date.now() });
      
      this.cleanupConversation(conversationId);
      
      logger.info(`Chatbot response generated for ${userId}`);
      
      return {
        content: response.content,
        sources: response.sources || [],
        suggestions: response.suggestions || [],
        conversationId
      };
    } catch (error) {
      logger.error('Error processing chatbot message:', error);
      return {
        content: "I'm having trouble processing your request right now. Could you try rephrasing your question?",
        sources: [],
        suggestions: []
      };
    }
  }

  async gatherContext(message, context) {
    const contextData = {
      recentReports: [],
      relevantArticles: [],
      hannaHistory: [],
      competitorInsights: []
    };

    try {
      const messageType = this.classifyMessage(message);
      
      switch (messageType) {
        case 'trending':
          contextData.recentReports = await this.getRecentReports(2);
          contextData.relevantArticles = await this.getRecentTrendingContent();
          break;
          
        case 'content_idea':
          contextData.hannaHistory = await this.getHannaTopPerformers();
          contextData.competitorInsights = await this.getCompetitorInsights();
          contextData.relevantArticles = await this.getRelevantArticles(message);
          break;
          
        case 'platform_specific':
          const platform = this.extractPlatform(message);
          contextData.hannaHistory = await this.getHannaHistoryByPlatform(platform);
          contextData.competitorInsights = await this.getCompetitorInsights(platform);
          break;
          
        case 'pillar_question':
          const pillar = this.extractPillar(message);
          contextData.relevantArticles = await this.getArticlesByPillar(pillar);
          contextData.hannaHistory = await this.getHannaHistoryByPillar(pillar);
          break;
          
        default:
          contextData.recentReports = await this.getRecentReports(1);
      }
      
      return contextData;
    } catch (error) {
      logger.error('Error gathering context:', error);
      return contextData;
    }
  }

  async generateResponse(message, conversation, contextData) {
    this.initialize();
    const contextPrompt = this.buildContextPrompt(contextData);
    
    const fullPrompt = `${this.systemPrompt}

Current Context:
${contextPrompt}

Conversation History:
${conversation.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User Question: ${message}

Instructions:
- Provide actionable, specific advice
- Cite sources when referencing data or trends
- If generating content ideas, include platform, format, hooks, and key points
- If discussing trends, explain why they matter for content creation
- Always be helpful and creative
- Keep responses focused but comprehensive`;

    try {
      let response;
      if (this.useAnthropic) {
        const result = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1500,
          messages: [
            { role: 'user', content: fullPrompt }
          ]
        });
        response = result.content[0].text;
      } else {
        const result = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'user', content: fullPrompt }
          ],
          max_tokens: 1500,
          temperature: 0.7
        });
        response = result.choices[0].message.content;
      }

      return {
        content: response,
        sources: this.extractSources(contextData),
        suggestions: await this.generateSuggestions(message, contextData)
      };
    } catch (error) {
      logger.error('Error generating AI response:', error);
      throw error;
    }
  }

  classifyMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('trend') || lowerMessage.includes('hot') || lowerMessage.includes('popular')) {
      return 'trending';
    }
    
    if (lowerMessage.includes('idea') || lowerMessage.includes('content') || lowerMessage.includes('post')) {
      return 'content_idea';
    }
    
    if (lowerMessage.includes('tiktok') || lowerMessage.includes('linkedin') || lowerMessage.includes('instagram')) {
      return 'platform_specific';
    }
    
    for (const [pillarId, pillar] of Object.entries(CONTENT_PILLARS)) {
      if (pillar.keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))) {
        return 'pillar_question';
      }
    }
    
    return 'general';
  }

  extractPlatform(message) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('tiktok')) return 'tiktok';
    if (lowerMessage.includes('linkedin')) return 'linkedin';
    if (lowerMessage.includes('instagram')) return 'instagram';
    return null;
  }

  extractPillar(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [pillarId, pillar] of Object.entries(CONTENT_PILLARS)) {
      if (pillar.keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))) {
        return pillarId;
      }
    }
    
    return null;
  }

  buildContextPrompt(contextData) {
    let prompt = '';
    
    if (contextData.recentReports.length > 0) {
      prompt += 'Recent Weekly Reports:\n';
      contextData.recentReports.forEach(report => {
        const data = JSON.parse(report.report_data);
        prompt += `- Week of ${report.week_start_date}: ${data.summary}\n`;
        prompt += `  Top themes: ${data.themes.slice(0, 3).map(t => t.cluster).join(', ')}\n`;
      });
      prompt += '\n';
    }
    
    if (contextData.relevantArticles.length > 0) {
      prompt += 'Relevant Recent Content:\n';
      contextData.relevantArticles.slice(0, 5).forEach(article => {
        prompt += `- "${article.title}" (${article.source}) - ${article.content.substring(0, 150)}...\n`;
      });
      prompt += '\n';
    }
    
    if (contextData.hannaHistory.length > 0) {
      prompt += "Hanna's Top Performing Content:\n";
      contextData.hannaHistory.slice(0, 3).forEach(post => {
        prompt += `- ${post.platform}: "${post.content}" (${post.performance_category} performance)\n`;
      });
      prompt += '\n';
    }
    
    if (contextData.competitorInsights.length > 0) {
      prompt += 'Competitor Insights:\n';
      contextData.competitorInsights.slice(0, 3).forEach(post => {
        prompt += `- ${post.creator_handle} (${post.platform}): "${post.content}" - ${post.performance_score} score\n`;
      });
      prompt += '\n';
    }
    
    return prompt;
  }

  extractSources(contextData) {
    const sources = [];
    
    contextData.relevantArticles?.forEach(article => {
      sources.push({
        title: article.title,
        url: article.url,
        source: article.source,
        type: 'article'
      });
    });
    
    contextData.recentReports?.forEach(report => {
      sources.push({
        title: `Weekly Report - ${report.week_start_date}`,
        type: 'report',
        date: report.week_start_date
      });
    });
    
    return sources;
  }

  async generateSuggestions(message, contextData) {
    const suggestions = [];
    
    const messageType = this.classifyMessage(message);
    
    switch (messageType) {
      case 'trending':
        suggestions.push('What should I post about this trend?');
        suggestions.push('How can I create unique angle on this?');
        suggestions.push('What platform works best for this topic?');
        break;
        
      case 'content_idea':
        suggestions.push('Generate 3 hook options for this idea');
        suggestions.push('What format works best for this content?');
        suggestions.push('How can I make this more engaging?');
        break;
        
      case 'platform_specific':
        suggestions.push('What\'s performing well on this platform?');
        suggestions.push('Best posting times for this content?');
        suggestions.push('How to adapt this for other platforms?');
        break;
        
      default:
        suggestions.push('What\'s trending in career content this week?');
        suggestions.push('Give me content ideas for LinkedIn');
        suggestions.push('What topics should I avoid?');
    }
    
    return suggestions;
  }

  getConversationId(userId) {
    return `${userId}_${Date.now().toString().slice(-8)}`;
  }

  getConversation(conversationId) {
    if (!this.conversationHistory.has(conversationId)) {
      this.conversationHistory.set(conversationId, []);
    }
    return this.conversationHistory.get(conversationId);
  }

  cleanupConversation(conversationId) {
    const conversation = this.conversationHistory.get(conversationId);
    if (conversation && conversation.length > 20) {
      conversation.splice(0, conversation.length - 20);
    }
  }

  async getRecentReports(limit = 2) {
    try {
      return await database.all(`
        SELECT * FROM weekly_reports 
        ORDER BY week_start_date DESC 
        LIMIT ?
      `, [limit]);
    } catch (error) {
      logger.error('Error getting recent reports:', error);
      return [];
    }
  }

  async getRecentTrendingContent(days = 7) {
    try {
      return await database.all(`
        SELECT * FROM news_articles 
        WHERE published_date >= datetime('now', '-${days} days')
        AND engagement_score > 0
        ORDER BY engagement_score DESC 
        LIMIT 10
      `);
    } catch (error) {
      logger.error('Error getting trending content:', error);
      return [];
    }
  }

  async getHannaTopPerformers(limit = 5) {
    try {
      return await database.all(`
        SELECT * FROM hanna_analytics 
        WHERE performance_category IN ('high', 'medium')
        ORDER BY imported_date DESC 
        LIMIT ?
      `, [limit]);
    } catch (error) {
      logger.error('Error getting Hanna top performers:', error);
      return [];
    }
  }

  async getCompetitorInsights(platform = null, limit = 5) {
    try {
      let query = `
        SELECT * FROM social_posts 
        WHERE performance_score > 60
      `;
      
      if (platform) {
        query += ` AND platform = '${platform}'`;
      }
      
      query += ` ORDER BY performance_score DESC LIMIT ?`;
      
      return await database.all(query, [limit]);
    } catch (error) {
      logger.error('Error getting competitor insights:', error);
      return [];
    }
  }

  async getRelevantArticles(message, limit = 5) {
    try {
      const keywords = message.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      
      if (keywords.length === 0) return [];
      
      const searchTerms = keywords.slice(0, 3).join('|');
      
      return await database.all(`
        SELECT * FROM news_articles 
        WHERE (title LIKE '%${searchTerms}%' OR content LIKE '%${searchTerms}%')
        AND published_date >= datetime('now', '-14 days')
        ORDER BY engagement_score DESC 
        LIMIT ?
      `, [limit]);
    } catch (error) {
      logger.error('Error getting relevant articles:', error);
      return [];
    }
  }

  async getArticlesByPillar(pillar, limit = 5) {
    try {
      return await database.all(`
        SELECT * FROM news_articles 
        WHERE pillar_tags LIKE '%${pillar}%'
        AND published_date >= datetime('now', '-14 days')
        ORDER BY engagement_score DESC 
        LIMIT ?
      `, [limit]);
    } catch (error) {
      logger.error('Error getting articles by pillar:', error);
      return [];
    }
  }

  async getHannaHistoryByPlatform(platform, limit = 3) {
    try {
      return await database.all(`
        SELECT * FROM hanna_analytics 
        WHERE platform = ? 
        ORDER BY imported_date DESC 
        LIMIT ?
      `, [platform, limit]);
    } catch (error) {
      logger.error('Error getting Hanna history by platform:', error);
      return [];
    }
  }

  async getHannaHistoryByPillar(pillar, limit = 3) {
    try {
      return await database.all(`
        SELECT * FROM hanna_analytics 
        WHERE pillar_tags LIKE '%${pillar}%'
        ORDER BY imported_date DESC 
        LIMIT ?
      `, [limit]);
    } catch (error) {
      logger.error('Error getting Hanna history by pillar:', error);
      return [];
    }
  }
}

export default new ChatbotService();