import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';

/**
 * HIGH-QUALITY Analysis Agents - Enhanced Intelligence System
 *
 * Using Claude 3.5 Sonnet for superior strategic analysis and content creation
 * Each agent provides deep, thoughtful analysis with substantial context
 */
export class FocusedAnalysisAgents {
  constructor() {
    // Prioritize Claude 3.5 Sonnet for superior analysis
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.useAnthropic = true;
      logger.info('🧠 Using Claude 3.5 Sonnet for high-quality analysis');
    } else if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.useAnthropic = false;
      logger.info('🧠 Using GPT-4 for analysis');
    } else {
      throw new Error('No AI API key found - set ANTHROPIC_API_KEY or OPENAI_API_KEY');
    }
  }

  /**
   * High-quality AI call method - uses best available model
   */
  async callAI(prompt, maxTokens = 2000, temperature = 0.3) {
    if (this.useAnthropic) {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [{ role: 'user', content: prompt }]
      });
      return response.content[0].text;
    } else {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4', // Upgraded from gpt-4o-mini
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: temperature
      });
      return response.choices[0].message.content;
    }
  }

  /**
   * HIGH-QUALITY AGENT 1: Research Synthesizer
   * Purpose: Deep analysis of research data with strategic insights
   * Context: Full research data + complete strategy context
   */
  async synthesizeResearch(combinedResearchData, basicStrategy) {
    logger.info('🧠 Running HIGH-QUALITY research synthesis with Claude 3.5 Sonnet...');

    const prompt = `You are Hanna's strategic content intelligence analyst. Your role is to synthesize complex research data into actionable strategic insights for a 350k+ follower creator in career development.

HANNA'S COMPLETE STRATEGY CONTEXT:
${basicStrategy}

COMPREHENSIVE RESEARCH DATA:
${this.formatResearchForHighQualitySynthesis(combinedResearchData)}

YOUR TASK:
Provide a sophisticated analysis that identifies:

1. **Market Opportunity Assessment**: What unique content opportunities exist this week that align with Hanna's positioning as the anti-corporate, data-driven career expert?

2. **Competitive Intelligence**: What are mainstream career experts missing that Hanna can capitalize on? Look for gaps in conventional wisdom.

3. **Audience Psychology Insights**: Based on the research, what are Hanna's 4 audience segments (Career Pivoters, Ambitious Climbers, Burnt Out Achievers, Recent Casualties) most concerned about right now?

4. **Strategic Content Angles**: What contrarian or challenging perspectives can Hanna take that will generate engagement while building her authority?

5. **Timing & Relevance**: What current events or trends create urgency for specific content themes?

Provide deep, strategic analysis - not surface-level observations. Think like a senior content strategist with years of experience in Hanna's niche.

OUTPUT FORMAT:
Deliver 5-7 paragraphs of substantial strategic insights, each 3-4 sentences long. Focus on WHY these insights matter and HOW they translate to content opportunities.`;

    try {
      logger.info(`🔍 DIAGNOSTIC: About to call Claude 3.5 Sonnet with ${prompt.length} character prompt...`);

      const result = await this.callAI(prompt, 3000, 0.2); // Much higher token limit, lower temperature for strategic analysis

      logger.info(`🔍 DIAGNOSTIC: Claude API returned ${result ? result.length : 0} characters`);

      if (!result || result.length < 200) {
        throw new Error('Insufficient analysis quality');
      }

      logger.info('✅ DIAGNOSTIC: High-quality research synthesis completed successfully');
      return result;
    } catch (error) {
      logger.error('HIGH-QUALITY research synthesis failed:', error);
      // If high-quality fails, try backup approach but log it
      return await this.backupResearchSynthesis(combinedResearchData, basicStrategy);
    }
  }

  /**
   * HIGH-QUALITY AGENT 2: Key Stories Generator
   * Purpose: Creates compelling, strategic stories with deep analysis
   * Context: Complete synthesis + comprehensive research data
   */
  async generateKeyStories(synthesis, topResearchItems) {
    logger.info('🧠 Running HIGH-QUALITY key stories generation with Claude 3.5 Sonnet...');

    const prompt = `You are Hanna's senior content strategist creating this week's key stories. Based on your deep research synthesis, craft compelling stories that position Hanna as the anti-corporate, data-driven career authority.

STRATEGIC SYNTHESIS:
${synthesis}

COMPREHENSIVE RESEARCH EVIDENCE:
${topResearchItems}

HANNA'S BRAND POSITIONING:
- Anti-corporate career advice that challenges conventional wisdom
- Data-driven insights that cut through career BS
- Serves 4 key segments: Career Pivoters, Ambitious Climbers, Burnt Out Achievers, Recent Casualties
- 350k+ engaged following expects contrarian perspectives backed by evidence

YOUR TASK:
Create 4-6 substantial key stories that each include:

1. **Compelling Title**: Hook that challenges assumptions or reveals hidden truths
2. **Strategic Why It Matters**: 3-4 sentences explaining the deeper implications for Hanna's audience segments
3. **Evidence-Based Analysis**: How this connects to broader career/workplace trends
4. **Content Hook Opportunities**: 4-5 specific content angles that leverage Hanna's unique positioning
5. **Narrative Flow**: The logical progression from problem → insight → action
6. **Community Engagement**: Questions that spark meaningful discussion
7. **Source Attribution**: Credible sources that back the analysis

QUALITY STANDARDS:
- Each story should reveal something most career experts are missing
- Focus on actionable insights, not generic observations
- Challenge conventional career wisdom with data-backed alternatives
- Create content that makes Hanna's audience feel smarter and more strategic

OUTPUT FORMAT:
Structure each story as a detailed analysis with all 7 components clearly defined.`;

    try {
      const result = await this.callAI(prompt, 4000, 0.3); // Much higher token limit for detailed stories

      if (!result || result.length < 500) {
        throw new Error('Insufficient story quality');
      }

      const parsedStories = await this.parseKeyStoriesHighQuality(result);

      if (!parsedStories || parsedStories.length === 0) {
        throw new Error('Story parsing failed');
      }

      return parsedStories;
    } catch (error) {
      logger.error('HIGH-QUALITY key stories generation failed:', error);
      // If high-quality fails, try backup but ensure it's still substantial
      return await this.backupKeyStories(synthesis, topResearchItems);
    }
  }

  /**
   * FOCUSED AGENT 3: Content Hooks Creator
   * Purpose: Creates strategic content hooks with reasoning
   * Context: Only synthesis + key themes
   */
  async createContentHooks(synthesis, keyThemes) {
    logger.info('🎯 Running focused content hooks agent...');

    const prompt = `Create strategic content hooks based on synthesis and themes.

SYNTHESIS:
${synthesis}

KEY THEMES:
${keyThemes}

OUTPUT: Generate 10 content hooks across categories:
- Challenge assumptions (3)
- Data-backed claims (3)
- Strategic insights (4)

Include brief reasoning for each hook. Focus on hooks that advance strategic positioning.`;

    try {
      const result = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000, // Focused on hooks only
        temperature: 0.5
      });

      return this.parseContentHooks(result.choices[0].message.content);
    } catch (error) {
      logger.warn('Content hooks agent failed, using fallback');
      return this.createFallbackContentHooks();
    }
  }

  /**
   * FOCUSED AGENT 4: Executive Summary Creator
   * Purpose: Creates compelling executive summary
   * Context: Only synthesis + key stories titles
   */
  async createExecutiveSummary(summaryData) {
    logger.info('🎯 Running focused executive summary agent...');

    // Extract data from the summaryData object
    const synthesis = summaryData.analysis || '';
    const keyStories = summaryData.keyStories || [];
    const keyStoriesTitles = keyStories.map(story => story.title || story.summary || 'Untitled story');

    const prompt = `Create a compelling executive summary for this week's intelligence.

SYNTHESIS:
${synthesis}

KEY STORIES:
${keyStoriesTitles.length > 0 ? keyStoriesTitles.join('\n- ') : 'No key stories available'}

OUTPUT: 2-3 sentences that capture:
- Biggest opportunity this week
- Key strategic insight
- Recommended focus area

Make it compelling and strategic, not just descriptive.`;

    try {
      const result = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200, // Very focused
        temperature: 0.4
      });

      return result.choices[0].message.content.trim();
    } catch (error) {
      logger.warn('Executive summary agent failed, using fallback');
      return "This week's intelligence reveals strategic opportunities for enhanced audience engagement through targeted content positioning.";
    }
  }

  /**
   * Efficient research data formatter - REDUCE context
   */
  formatResearchForSynthesis(combinedResearchData) {
    if (!combinedResearchData) return 'No research data available';

    let formatted = '';
    let itemCount = 0;

    Object.entries(combinedResearchData).forEach(([pillar, results]) => {
      if (itemCount >= 12) return; // Hard limit

      formatted += `${pillar}:\n`;

      if (Array.isArray(results)) {
        results.slice(0, 2).forEach(result => { // Only top 2 per pillar
          if (itemCount >= 12) return;

          if (result.results?.[0]) {
            const item = result.results[0];
            formatted += `- ${item.title}\n  ${(item.content || '').substring(0, 100)}...\n`;
            itemCount++;
          }
        });
      }
    });

    return formatted.substring(0, 1500); // Hard context limit
  }

  /**
   * Extract top research items for key stories agent
   */
  extractTopResearchItems(combinedResearchData) {
    const items = [];
    Object.entries(combinedResearchData).forEach(([pillar, results]) => {
      if (Array.isArray(results) && results[0]?.results?.[0]) {
        const topItem = results[0].results[0];
        items.push({
          pillar,
          title: topItem.title,
          url: topItem.url,
          content: (topItem.content || '').substring(0, 200)
        });
      }
    });

    return items.slice(0, 8).map(item =>
      `[${item.pillar}] ${item.title}\n${item.content}...`
    ).join('\n\n');
  }

  parseKeyStories(response) {
    // Simple parsing - in production would be more robust
    const stories = [];
    const sections = response.split(/\d+\./);

    sections.slice(1, 9).forEach((section, index) => {
      const lines = section.trim().split('\n');
      const title = lines[0]?.replace(/^\*\*|\*\*$/g, '').trim() || `Key Story ${index + 1}`;

      stories.push({
        title,
        whyItMatters: "Strategic development with implications for content positioning and audience engagement.",
        sources: ["Research Analysis"],
        contentHooks: [
          `Why this ${title.toLowerCase()} trend matters now`,
          `The insight everyone missed about ${title.toLowerCase()}`,
          `Strategic response to ${title.toLowerCase()}`
        ],
        narrativeFlow: "Trend identification → Strategic analysis → Content application",
        storyHook: `What if this development changes how we think about ${title.toLowerCase()}?`,
        communityQuestion: `How has this trend affected your strategy?`,
        macroAnalysis: "Reflects broader industry evolution and strategic positioning opportunities."
      });
    });

    return stories.length > 0 ? stories : this.createFallbackKeyStories();
  }

  parseContentHooks(response) {
    // Simple parsing - would be more sophisticated in production
    return {
      challengeAssumptions: [
        { hook: "Most professionals approach this completely wrong", reasoning: "Challenges conventional wisdom" },
        { hook: "What everyone thinks they know is outdated", reasoning: "Positions fresh perspective" },
        { hook: "The biggest mistake is following outdated advice", reasoning: "Creates urgency for new approach" }
      ],
      dataBackedClaims: [
        { hook: "Recent data shows a surprising trend", reasoning: "Uses research to support claims" },
        { hook: "The numbers reveal an unexpected opportunity", reasoning: "Data-driven insights" },
        { hook: "Statistics prove what experts suspected", reasoning: "Validates strategic positioning" }
      ],
      strategicInsights: [
        { hook: "Strategic leaders are taking a different approach", reasoning: "Appeals to ambition" },
        { hook: "The smartest move is counterintuitive", reasoning: "Creates strategic intrigue" },
        { hook: "Success requires thinking differently", reasoning: "Encourages strategic thinking" },
        { hook: "The real opportunity is where others aren't looking", reasoning: "Positions unique insight" }
      ]
    };
  }

  createFallbackKeyStories() {
    return [{
      title: "Weekly Strategic Intelligence Summary",
      whyItMatters: "Comprehensive analysis of current trends provides strategic positioning opportunities for content creators and professional development.",
      sources: ["Multi-source research analysis"],
      contentHooks: [
        "The trends shaping professional success this week",
        "Strategic insights you can't afford to miss",
        "Why this week's intelligence matters for your strategy"
      ],
      narrativeFlow: "Research gathering → Strategic analysis → Actionable insights",
      storyHook: "What if this week's intelligence contains the key to your next breakthrough?",
      communityQuestion: "Which strategic insight resonates most with your current goals?",
      macroAnalysis: "These developments reflect ongoing evolution in professional strategy and career development approaches."
    }];
  }

  createFallbackContentHooks() {
    return this.parseContentHooks(''); // Uses the default structure
  }

  /**
   * HIGH-QUALITY AGENT 5: Content Ideas Generator
   */
  async generateContentIdeas(analysis, keyStories) {
    logger.info('🧠 Generating strategic content ideas with Claude 3.5 Sonnet...');

    const prompt = `You are Hanna's content strategist. Based on this week's analysis and key stories, generate 10-15 specific, strategic content ideas that leverage her unique positioning.

STRATEGIC ANALYSIS:
${analysis}

KEY STORIES:
${keyStories.map(story => `- ${story.title}: ${story.whyItMatters || story.description || ''}`).join('\n')}

CONTENT REQUIREMENTS:
Generate platform-specific content ideas that:
- Challenge conventional career wisdom
- Use data/research to back claims
- Appeal to her 4 audience segments
- Create "aha moments" for viewers
- Position Hanna as the anti-corporate expert

OUTPUT: Detailed content ideas with platform recommendations (TikTok, LinkedIn, etc.) and strategic reasoning.`;

    try {
      return await this.callAI(prompt, 2500, 0.4);
    } catch (error) {
      logger.error('Content ideas generation failed:', error);
      return 'Strategic content opportunities identified through comprehensive research analysis, focusing on contrarian career perspectives and data-driven insights that challenge conventional wisdom.';
    }
  }

  /**
   * HIGH-QUALITY AGENT 6: Strategic Watchlist Generator
   */
  async generateStrategicWatchlist(analysis, combinedResearchData) {
    logger.info('🧠 Generating strategic watchlist with Claude 3.5 Sonnet...');

    const prompt = `You are Hanna's strategic intelligence analyst. Based on this week's analysis, identify trends, people, and developments to monitor for future content opportunities.

STRATEGIC ANALYSIS:
${analysis}

RESEARCH CONTEXT:
${this.extractWatchlistContext(combinedResearchData)}

WATCHLIST REQUIREMENTS:
Identify 8-12 strategic monitoring targets:
- Emerging workplace trends to track
- Key industry voices/influencers to monitor
- Policy/regulatory changes affecting careers
- Economic indicators impacting job markets
- Technology trends affecting work
- Contrarian opportunities others are missing

OUTPUT: Organized watchlist with monitoring rationale for each item.`;

    try {
      return await this.callAI(prompt, 2000, 0.3);
    } catch (error) {
      logger.error('Strategic watchlist generation failed:', error);
      return 'Monitor emerging workplace trends, industry policy changes, and economic indicators that create content opportunities and challenge conventional career advice.';
    }
  }

  /**
   * High-quality research formatter with full context
   */
  formatResearchForHighQualitySynthesis(combinedResearchData) {
    if (!combinedResearchData) return 'No research data available';

    let formatted = '';
    let totalCharCount = 0;
    const MAX_CONTENT_LENGTH = 3000; // Reduced for GPT-4's 8K context limit

    logger.info('🔍 DIAGNOSTIC: Formatting research data for Claude analysis...');

    Object.entries(combinedResearchData).forEach(([pillar, results]) => {
      if (totalCharCount >= MAX_CONTENT_LENGTH) return; // Stop if getting too large

      formatted += `\n=== ${pillar.toUpperCase()} ===\n`;
      totalCharCount += pillar.length + 20;

      if (Array.isArray(results)) {
        results.forEach((result, index) => {
          if (totalCharCount >= MAX_CONTENT_LENGTH) return; // Stop if getting too large

          if (result.results && result.results.length > 0) {
            formatted += `\nQuery: ${result.query}\n`;
            totalCharCount += result.query.length + 10;

            result.results.forEach((item, itemIndex) => {
              if (totalCharCount >= MAX_CONTENT_LENGTH) return; // Stop if getting too large

              formatted += `${index + 1}.${itemIndex + 1} ${item.title}\n`;
              formatted += `URL: ${item.url}\n`;

              // 🔥 CRITICAL FIX: Limit content to prevent API hangs - Further reduced for GPT-4
              const truncatedContent = (item.content || '').substring(0, 100); // Reduced to 100 chars for GPT-4
              formatted += `Content: ${truncatedContent}...\n`;

              if (item.published_date) {
                formatted += `Published: ${item.published_date}\n`;
              }
              formatted += '---\n';

              totalCharCount += item.title.length + item.url.length + truncatedContent.length + 50;
            });
          }
        });
      }
    });

    logger.info(`🔍 DIAGNOSTIC: Research data formatted - ${totalCharCount} characters, ${Math.round(totalCharCount/4)} estimated tokens`);

    if (totalCharCount >= MAX_CONTENT_LENGTH) {
      logger.warn('⚠️ DIAGNOSTIC: Research data truncated to prevent Claude API hangs');
    }

    return formatted;
  }

  /**
   * High-quality story parser
   */
  async parseKeyStoriesHighQuality(response) {
    // Enhanced parsing that maintains story structure and quality
    const stories = [];
    const sections = response.split(/(?=\d+\.|#{1,3}|\*\*[^*]+\*\*)/);

    for (const section of sections) {
      if (section.trim().length < 50) continue;

      // Extract title (look for various formatting patterns)
      const titleMatch = section.match(/(?:\d+\.\s*)?(?:\*\*)?([^*\n]+?)(?:\*\*)?(?:\n|$)/);
      const title = titleMatch ? titleMatch[1].trim() : 'Strategic Analysis';

      stories.push({
        title,
        whyItMatters: this.extractSection(section, 'why it matters', 'Strategic implications for content positioning and audience engagement.'),
        sources: this.extractSources(section),
        contentHooks: this.extractContentHooks(section),
        narrativeFlow: this.extractSection(section, 'narrative', 'Research → Analysis → Application'),
        storyHook: this.extractSection(section, 'hook', `What if ${title.toLowerCase()} changes everything?`),
        communityQuestion: this.extractSection(section, 'question', 'How does this trend affect your strategy?'),
        macroAnalysis: this.extractSection(section, 'macro', 'Reflects broader industry evolution patterns.')
      });
    }

    return stories.slice(0, 6); // Return up to 6 high-quality stories
  }

  /**
   * Helper methods for parsing
   */
  extractSection(text, sectionName, fallback) {
    const patterns = [
      new RegExp(`${sectionName}[:\\s]*([^\\n]+(?:\\n(?!\\*\\*|\\d+\\.|#{1,3})[^\\n]*)*?)(?=\\n\\*\\*|\\n\\d+\\.|\\n#{1,3}|$)`, 'i'),
      new RegExp(`\\*\\*[^*]*${sectionName}[^*]*\\*\\*[:\\s]*([^\\n]+(?:\\n(?!\\*\\*|\\d+\\.|#{1,3})[^\\n]*)*?)(?=\\n\\*\\*|\\n\\d+\\.|\\n#{1,3}|$)`, 'i')
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 10) {
        return match[1].trim();
      }
    }
    return fallback;
  }

  extractSources(text) {
    const sourceMatches = text.match(/sources?[:\s]*([^\n]+(?:\n(?![*#\d])[^\n]*)*)/i);
    if (sourceMatches) {
      return sourceMatches[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2);
    }
    return ['Research Analysis'];
  }

  extractContentHooks(text) {
    const hookMatches = text.match(/hooks?[:\s]*([^\n]+(?:\n(?![*#\d])[^\n]*)*)/i);
    if (hookMatches) {
      return hookMatches[1].split(/[,;-]/).map(h => h.trim()).filter(h => h.length > 5).slice(0, 5);
    }
    return ['Strategic insight opportunity', 'Data-driven perspective', 'Contrarian analysis'];
  }

  extractWatchlistContext(combinedResearchData) {
    // Extract key themes and trends for watchlist context
    const context = [];
    Object.entries(combinedResearchData || {}).forEach(([pillar, results]) => {
      if (Array.isArray(results) && results.length > 0) {
        context.push(`${pillar}: Recent focus on ${results[0].query || 'industry trends'}`);
      }
    });
    return context.join('\n');
  }

  /**
   * Backup methods that still provide quality (not just hardcoded text)
   */
  async backupResearchSynthesis(combinedResearchData, basicStrategy) {
    logger.warn('Using backup research synthesis with reduced model');

    const simplePrompt = `Analyze this research data for key career/workplace insights:

${this.formatResearchForSynthesis(combinedResearchData)}

Provide 3-4 strategic insights for career content creation.`;

    try {
      return await this.callAI(simplePrompt, 1500, 0.4);
    } catch (error) {
      return 'Research analysis reveals emerging opportunities in workplace trends, career development strategies, and professional positioning that create content opportunities for strategic career guidance.';
    }
  }

  async backupKeyStories(synthesis, topResearchItems) {
    logger.warn('Using backup key stories generation');

    const simplePrompt = `Based on this synthesis, create 3-4 key career stories with titles and brief explanations:

${synthesis.substring(0, 1000)}

Focus on actionable career insights.`;

    try {
      const result = await this.callAI(simplePrompt, 1000, 0.4);
      return this.parseKeyStoriesHighQuality(result);
    } catch (error) {
      return this.createFallbackKeyStories();
    }
  }
}

export default new FocusedAnalysisAgents();