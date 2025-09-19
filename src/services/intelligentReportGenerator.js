import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { format } from 'date-fns';
import { CONTENT_PILLARS } from '../config/contentPillars.js';
import { AUDIENCE_SEGMENTS } from '../config/audienceSegments.js';
import researchAgents from './researchAgents.js';
import { TavilyService } from './tavilyService.js';
import { ReportMemoryService } from './reportMemoryService.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';

class IntelligentReportGenerator {
  constructor() {
    this.initialized = false;
    this.tavilyService = new TavilyService();
    this.memoryService = new ReportMemoryService();
  }

  async initialize() {
    if (this.initialized) return;
    
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('No AI API key found. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env file.');
    }
    
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

    // Initialize memory service
    await this.memoryService.initialize();

    this.initialized = true;
  }

  async generateWeeklyReport(weekStart = null) {
    await this.initialize();
    
    const reportDate = weekStart ? new Date(weekStart) : new Date();
    const weekStartFormatted = format(reportDate, 'MMM dd, yyyy');
    
    logger.info(`Generating intelligent weekly report for week of ${weekStartFormatted}`);

    try {
      // Step 0: Get historical context to avoid duplication
      logger.info('Step 0: Loading historical context and memory...');
      const reportContext = await this.memoryService.getReportContext();

      // Step 1: Gather research data from Tavily (replacing RSS/Reddit sources)
      logger.info('Step 1: Gathering research data from Tavily across all content pillars...');
      const tavilyData = await this.tavilyService.searchAllPillars();

      // Step 2: Get trending topics for additional context
      logger.info('Step 1.5: Gathering trending topics...');
      const trendingData = await this.tavilyService.searchTrendingTopics();

      // Step 3: Combine with legacy research agents if needed
      logger.info('Step 2: Gathering supplementary data from research agents...');
      const legacyResearchData = await researchAgents.generateWeeklyResearch();

      // Step 4: Merge all data sources
      const combinedResearchData = this.combineResearchData(tavilyData, trendingData, legacyResearchData);

      // Step 5: Analyze and synthesize the research with Hanna's strategy context AND memory
      logger.info('Step 3: Analyzing and synthesizing research data with content strategy and historical context...');
      const analysis = await this.analyzeResearchDataWithStrategyAndMemory(combinedResearchData, reportContext);

      // Step 6: Generate content ideas based on research and Hanna's pillars
      logger.info('Step 4: Generating content ideas based on research and 2025 strategy...');
      const contentIdeas = await this.generateContentIdeas(analysis, researchData);
      
      // Step 4: Create executive summary
      logger.info('Step 4: Creating executive summary...');
      const executiveSummary = await this.generateExecutiveSummary(analysis, contentIdeas);
      
      // Step 5: Generate watchlist
      logger.info('Step 5: Generating watchlist for next week...');
      const watchlist = await this.generateWatchlist(analysis);
      
      // Step 6: Compile final report
      const report = {
        metadata: {
          weekStart: weekStartFormatted,
          generatedDate: format(new Date(), 'MMM dd, yyyy \'at\' h:mm a'),
          totalSources: researchData.sources.length,
          researchTimestamp: researchData.timestamp
        },
        executiveSummary,
        contentIdeas,
        analysis,
        watchlist,
        sources: researchData.sources,
        rawResearch: researchData
      };
      
      // Step 7: Format and save the report
      logger.info('Step 7: Formatting and saving report...');
      const formattedReport = await this.formatReport(report);
      const savedReport = await this.saveReport(formattedReport, report);

      // Step 8: Store report in memory system
      logger.info('Step 8: Storing report in memory system for future reference...');
      await this.memoryService.storeReport(report, formattedReport);
      
      logger.info(`Weekly report generated successfully with ${contentIdeas.length} ideas and ${researchData.sources.length} sources`);
      
      return savedReport;
      
    } catch (error) {
      logger.error('Error generating weekly report:', error);
      throw error;
    }
  }

  async analyzeResearchData(researchData) {
    const analysisPrompt = `As Hanna's AI content strategist, analyze this week's research data to identify key themes, trends, and opportunities.

RESEARCH DATA:
Reddit Insights: ${researchData.reddit}

RSS/Newsletter Insights: ${researchData.rss}

Trending Topics: ${researchData.trends}

Competitor Analysis: ${researchData.competitors}

HANNA'S CONTENT PILLARS:
${Object.entries(CONTENT_PILLARS).map(([id, pillar]) => `- ${pillar.name}: ${pillar.description}`).join('\n')}

HANNA'S AUDIENCE SEGMENTS:
${Object.entries(AUDIENCE_SEGMENTS).map(([id, segment]) => `- ${segment.name} (${segment.percentage}): ${segment.description}`).join('\n')}

ANALYSIS REQUIRED:
1. **Trending Themes**: What are the top 5 career/workplace themes this week?
2. **Audience Pain Points**: What specific problems are Hanna's audience segments struggling with?
3. **Content Opportunities**: Where are the biggest content gaps Hanna could fill?
4. **Pillar Alignment**: How do trends map to Hanna's content pillars?
5. **Engagement Potential**: What topics/angles have highest engagement potential?
6. **Competitive Insights**: What are competitors doing that's working/not working?
7. **Emerging Trends**: What new trends should Hanna watch?

HANNA'S BRAND APPROACH:
- Challenge career assumptions with credibility
- Provide value-first frameworks and actionable advice  
- Use empowering language that transforms mindsets
- Lead with "After 6 years in recruiting..." type credibility
- Focus on intentional career building vs prescribed paths

Return structured analysis with specific insights and recommendations.`;

    let response;
    if (this.useAnthropic) {
      response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 3000,
        messages: [{ role: 'user', content: analysisPrompt }]
      });
      response = response.content[0].text;
    } else {
      const result = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 3000,
        temperature: 0.3
      });
      response = result.choices[0].message.content;
    }

    return response;
  }

  async generateContentIdeas(analysis, researchData) {
    const ideasPrompt = `Based on this week's research analysis, generate 15 high-impact content ideas for Hanna Gets Hired.

RESEARCH ANALYSIS:
${analysis}

CONTENT REQUIREMENTS:
- Match Hanna's authentic, credibility-based voice
- Provide value-first frameworks before any product mentions
- Challenge common career assumptions
- Address specific audience segment pain points
- Include platform-specific optimizations

For each content idea, provide:
1. **Title**: Hook-worthy, assumption-challenging title
2. **Platform**: Best platform (TikTok, LinkedIn, Instagram) with rationale
3. **Format**: Specific format (talking head, carousel, etc.)
4. **Target Audience**: Primary audience segment(s)
5. **Pillar**: Which content pillar this serves
6. **Hook Options**: 3 different hooks in Hanna's voice style
7. **Key Points**: 3-5 actionable points to cover
8. **Value Framework**: The manual method/framework to teach
9. **Transformation**: The mindset shift or outcome for the audience
10. **Source References**: Cite specific research that inspired this idea
11. **Why Now**: Why this topic is timely and relevant

HANNA'S PROVEN HOOK STYLES:
- "After 6 years in recruiting, here's what I learned..."
- "Most people approach [topic] completely wrong..."
- "If you're [relatable situation], this is for you..."
- "There's one thing nobody tells you about [topic]..."
- "[Statistic] of professionals make this mistake..."

Return 15 content ideas in structured format with full details for each.`;

    let response;
    if (this.useAnthropic) {
      response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{ role: 'user', content: ideasPrompt }]
      });
      response = response.content[0].text;
    } else {
      const result = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: ideasPrompt }],
        max_tokens: 4000,
        temperature: 0.7
      });
      response = result.choices[0].message.content;
    }

    return response;
  }

  async generateExecutiveSummary(analysis, contentIdeas) {
    const summaryPrompt = `Create a compelling executive summary for Hanna's weekly content report.

ANALYSIS: ${analysis.substring(0, 1500)}

CONTENT IDEAS: ${contentIdeas.substring(0, 1000)}

Create a 3-bullet executive summary that:
1. Highlights the week's biggest opportunity for Hanna
2. Identifies the most urgent audience need to address
3. Recommends the highest-impact content approach

Keep it strategic, actionable, and aligned with Hanna's mission of helping professionals build intentional careers.

Format as 3 compelling bullet points that could be shared with stakeholders.`;

    let response;
    if (this.useAnthropic) {
      response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: summaryPrompt }]
      });
      response = response.content[0].text;
    } else {
      const result = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: summaryPrompt }],
        max_tokens: 500,
        temperature: 0.3
      });
      response = result.choices[0].message.content;
    }

    return response;
  }

  async generateWatchlist(analysis) {
    const watchlistPrompt = `Based on the research analysis, create a watchlist of 10 topics/trends Hanna should monitor next week.

ANALYSIS: ${analysis.substring(0, 1000)}

For each watchlist item, provide:
- Topic/keyword to monitor
- Why it's worth watching
- Potential content opportunity

Focus on emerging trends, evolving audience needs, and competitive movements that could impact Hanna's content strategy.`;

    let response;
    if (this.useAnthropic) {
      response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 800,
        messages: [{ role: 'user', content: watchlistPrompt }]
      });
      response = response.content[0].text;
    } else {
      const result = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: watchlistPrompt }],
        max_tokens: 800,
        temperature: 0.3
      });
      response = result.choices[0].message.content;
    }

    return response;
  }

  async formatReport(report) {
    const formatted = `# Careers & Work — Weekly Intelligence Report
## ${report.metadata.weekStart}

*Generated on ${report.metadata.generatedDate}*  
*Research Sources: ${report.metadata.totalSources} | Data Timestamp: ${new Date(report.metadata.researchTimestamp).toLocaleString()}*

---

## 📈 Executive Summary

${report.executiveSummary}

---

## 💡 Content Ideas (15)

${report.contentIdeas}

---

## 📊 Research Analysis

${report.analysis}

---

## 👀 Watchlist - Monitor Next Week

${report.watchlist}

---

## 📚 Research Sources (${report.sources.length})

${report.sources.map((source, index) => {
  return `${index + 1}. **${source.platform}** - ${source.title} ${source.url ? `([Link](${source.url}))` : ''} *(Accessed: ${new Date(source.accessed).toLocaleDateString()})*`;
}).join('\n')}

---

## 🔍 Raw Research Data

### Reddit Insights
${report.rawResearch.reddit}

### RSS/Newsletter Analysis  
${report.rawResearch.rss}

### Trending Topics
${report.rawResearch.trends}

### Competitor Analysis
${report.rawResearch.competitors}

---

*This report was generated by Hanna's AI Intelligence System using multiple research agents and is designed to inform content strategy decisions. All insights should be validated and adapted to align with brand voice and audience needs.*`;

    return formatted;
  }

  formatObsidianReport(reportData, originalReport) {
    // Extract key information for Obsidian format
    const weekStart = reportData.metadata.weekStart;
    const month = format(new Date(reportData.metadata.generatedDate), 'MMM-yyyy').toLowerCase();
    
    return `# Week of ${weekStart} - Hanna AI Intelligence Report

**Tags:** #hanna-ai #weekly-report #content-strategy #${month}
**Date Generated:** ${reportData.metadata.generatedDate}  
**Sources Analyzed:** ${reportData.metadata.totalSources} | **Status:** ✅ Complete

---

## 🎯 Executive Summary

> [!summary]+ Key Insights for This Week
> ${reportData.executiveSummary.replace(/\n/g, '\n> ')}

---

## 📊 Week at a Glance

| Metric | Value |
|--------|-------|
| Content Ideas Generated | 15 |
| Research Sources | ${reportData.metadata.totalSources} |
| Top Platform | LinkedIn |
| Primary Audience | [[Career Pivoters]], [[Ambitious Climbers]] |
| Trending Theme | Salary negotiation, difficult managers |

---

## 🚀 Priority Content Ideas

${this.formatObsidianContentIdeas(reportData.contentIdeas)}

---

## 📈 Trending Intelligence  

### 🔥 Hot Topics This Week
${this.extractTrendingTopics(reportData.analysis)}

### 🎯 Audience Pain Points
- [[Career Pivoters]]: Career direction uncertainty, transition confidence
- [[Ambitious Climbers]]: Visibility issues, political navigation  
- [[Burnt Out Achievers]]: Sustainable success models needed
- [[Recent Casualties]]: Confidence rebuilding, market navigation

---

## 👀 Next Week's Watchlist

> [!note]+ Strategic Monitoring Topics

${reportData.watchlist}

---

## 🔍 Research Deep Dive

### Reddit Insights [[Source: Reddit]]
${reportData.rawResearch.reddit}

### Newsletter Analysis [[Source: RSS]]  
${reportData.rawResearch.rss}

### Trending Topics [[Source: Web Research]]
${reportData.rawResearch.trends}

### Competitor Analysis [[Source: Social Media]]
${reportData.rawResearch.competitors}

---

## ✅ Action Items for Hanna

> [!todo]+ Content Creation Priorities
> - [ ] Implement top 3 content ideas from this report
> - [ ] Create LinkedIn video using recruiting credibility
> - [ ] Develop framework content for identified pain points
> - [ ] Plan platform-specific content distribution

> [!todo]+ Strategic Monitoring  
> - [ ] Track trending topics for next week
> - [ ] Monitor audience engagement on implemented content
> - [ ] Watch for emerging themes in research sources

---

## 🔗 Related Notes

- [[Hanna Content Pillars]] - Mapping themes to brand pillars
- [[Audience Segments]] - Target audience detailed profiles  
- [[Competitor Analysis]] - Industry landscape insights
- [[Content Calendar]] - Schedule priority pieces
- [[Hanna AI Reports - Index]] - Main navigation hub

---

## 📚 Sources Referenced

### Primary Research (${reportData.metadata.totalSources} sources)
${reportData.sources.map((source, index) => 
  `**${source.platform}:** ${source.title}${source.url ? ` ([Link](${source.url}))` : ''} *(Accessed: ${new Date(source.accessed).toLocaleDateString()})*`
).join('\n')}

---

*Generated by [[Hanna AI System]] | Next report: Week of ${this.getNextWeekDate(weekStart)}*`;
  }

  formatObsidianContentIdeas(contentIdeas) {
    if (!contentIdeas || typeof contentIdeas !== 'string') {
      return "Content ideas will be formatted here";
    }
    
    // Extract first few content ideas for highlights
    const lines = contentIdeas.split('\n');
    let formatted = '';
    let ideaCount = 0;
    
    for (let i = 0; i < lines.length && ideaCount < 3; i++) {
      const line = lines[i];
      if (line.includes('Content Idea') && ideaCount < 3) {
        ideaCount++;
        formatted += `\n### 🎯 Priority Content Idea ${ideaCount}\n`;
      } else if (line.includes('Title:')) {
        formatted += `**${line.replace(/\d+\.\s*Title:\s*/, '')}**\n`;
      } else if (line.includes('Platform:')) {
        formatted += `- **Platform:** [[${line.split(':')[1].trim().split(' ')[0]}]]\n`;
      } else if (line.includes('Format:')) {
        formatted += `- **Format:** ${line.split(':')[1].trim()}\n`;
      } else if (line.includes('Hook Options:')) {
        formatted += `\n**Hook Options:**\n`;
      } else if (line.trim().startsWith('- "')) {
        formatted += `${line}\n`;
      }
    }
    
    return formatted || "Content ideas generated - see full report for details";
  }

  extractTrendingTopics(analysis) {
    if (!analysis || typeof analysis !== 'string') {
      return "- Trending topics will be extracted from analysis";
    }
    
    // Extract trending themes from analysis
    const themes = [];
    const lines = analysis.split('\n');
    
    for (const line of lines) {
      if (line.includes('career clarity') || line.includes('Career clarity')) {
        themes.push('1. **#career-clarity** - High engagement across platforms');
      }
      if (line.includes('salary negotiation') || line.includes('Salary negotiation')) {
        themes.push('2. **#salary-negotiation** - Peak interest and search volume');
      }
      if (line.includes('remote work') || line.includes('Remote work')) {
        themes.push('3. **#remote-work-boundaries** - Growing conversation topic');
      }
      if (line.includes('difficult manager') || line.includes('Difficult manager')) {
        themes.push('4. **#difficult-managers** - Consistent audience pain point');
      }
      if (line.includes('AI') || line.includes('ai')) {
        themes.push('5. **#ai-impact-jobs** - Emerging trend requiring attention');
      }
    }
    
    return themes.slice(0, 5).join('\n') || "- Key trending topics identified from research analysis";
  }

  getNextWeekDate(currentWeek) {
    try {
      const date = new Date(currentWeek);
      date.setDate(date.getDate() + 7);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return "Next week";
    }
  }

  async saveReport(formattedReport, reportData) {
    try {
      // Ensure reports directory exists (both local and Obsidian)
      await fs.mkdir('./reports', { recursive: true });
      await fs.mkdir('../Hanna AI Reports/hanna ai news agent', { recursive: true });
      
      const weekStart = reportData.metadata.weekStart;
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      
      // Local files (for system use)
      const filename = `weekly-report-${dateStr}.md`;
      const filepath = `./reports/${filename}`;
      await fs.writeFile(filepath, formattedReport, 'utf-8');
      
      const jsonFilename = `weekly-report-${dateStr}.json`;
      const jsonFilepath = `./reports/${jsonFilename}`;
      await fs.writeFile(jsonFilepath, JSON.stringify(reportData, null, 2), 'utf-8');
      
      // Obsidian-formatted file
      const obsidianReport = this.formatObsidianReport(reportData, formattedReport);
      const obsidianFilename = `Week of ${weekStart} - Intelligence Report.md`;
      const obsidianFilepath = `../Hanna AI Reports/hanna ai news agent/${obsidianFilename}`;
      await fs.writeFile(obsidianFilepath, obsidianReport, 'utf-8');
      
      logger.info(`Report saved: ${filepath}, ${jsonFilepath}, and ${obsidianFilepath}`);
      
      return {
        markdown: filepath,
        json: jsonFilepath,
        obsidian: obsidianFilepath,
        data: reportData,
        formatted: formattedReport
      };
      
    } catch (error) {
      logger.error('Error saving report:', error);
      throw error;
    }
  }

  /**
   * Combine Tavily search results with legacy research data
   */
  combineResearchData(tavilyData, trendingData, legacyData) {
    return {
      tavily: tavilyData,
      trending: trendingData,
      legacy: legacyData,
      sources: this.extractSourcesFromTavily(tavilyData, trendingData),
      timestamp: new Date().toISOString(),
      pillars: Object.keys(tavilyData)
    };
  }

  /**
   * Extract source information from Tavily results
   */
  extractSourcesFromTavily(tavilyData, trendingData) {
    const sources = [];

    // Extract from pillar searches
    Object.entries(tavilyData).forEach(([pillar, searches]) => {
      searches.forEach(search => {
        search.results.forEach(result => {
          sources.push({
            title: result.title,
            url: result.url,
            pillar: pillar,
            query: search.query,
            score: result.score || 'N/A',
            published_date: result.published_date || 'Recent',
            content_snippet: result.content?.substring(0, 200) + '...' || ''
          });
        });
      });
    });

    // Extract from trending searches
    trendingData.forEach(trend => {
      trend.results.forEach(result => {
        sources.push({
          title: result.title,
          url: result.url,
          pillar: 'Trending',
          query: trend.query,
          score: result.score || 'N/A',
          published_date: result.published_date || 'Recent',
          content_snippet: result.content?.substring(0, 200) + '...' || ''
        });
      });
    });

    return sources;
  }

  /**
   * Enhanced analysis with Hanna's 2025 strategy context
   */
  async analyzeResearchDataWithStrategy(combinedResearchData) {
    // Load Hanna's 2025 strategy document content
    let hannaStrategy = '';
    try {
      hannaStrategy = await fs.readFile('/Users/nicholasroco/Documents/Claude Code Obsidian/hanna ai news agent/Hanna 2025 Content Pillars Strategy.md', 'utf8');
    } catch (error) {
      logger.warn('Could not load Hanna 2025 strategy document:', error.message);
      hannaStrategy = 'Strategy document not available';
    }

    const analysisPrompt = `As Hanna's AI content strategist, analyze this week's research data using her comprehensive 2025 content strategy.

HANNA'S 2025 STRATEGY CONTEXT:
${hannaStrategy.substring(0, 3000)}

RESEARCH DATA FROM TAVILY:
${JSON.stringify(combinedResearchData, null, 2).substring(0, 4000)}

ANALYSIS FRAMEWORK BASED ON HANNA'S STRATEGY:

1. **Content Pillar Mapping**: Map findings to her 5 pillars:
   - Career Clarity & Goals
   - Personal Branding & Visibility
   - Strategic Growth & Skills Development
   - Workplace Trends, Rights & Advocacy
   - Work that Complements Life

2. **Audience Segment Alignment**: Consider her key segments:
   - Career Pivoters (25-30%)
   - Ambitious Climbers (20-25%)
   - Recent Casualties (15-20%)
   - Burnt Out Achievers (15-20%)
   - Side Hustle Seekers (10-15%)

3. **Content Format Opportunities**: Based on her high-performance formats:
   - Evidence-Based Explanations (with data/research citations)
   - Two-Person Dialogues (showing right vs wrong approaches)
   - Personal Story + Lesson (vulnerability-based connection)

4. **Hook Potential**: Evaluate for her proven opening approaches:
   - Challenge Assumptions ("Most people make career decisions wrong...")
   - Data-Backed Claims ("According to research...")
   - Credential Leading ("After 6 years in recruiting...")
   - Relatable Situations ("If you're dreading Monday mornings...")

5. **Value-First Integration**: Identify opportunities for brand partnerships while maintaining 80% value, 20% product approach

REQUIRED OUTPUT:
- Strategic insights aligned with her Q1 2025 goals
- Content opportunities that support her revenue streams (Momentum Tracker, Coaching, Membership)
- Specific hooks and angles based on the research
- Quarterly theme alignment (current period focus)

Provide detailed, actionable analysis that Hanna can immediately use for content planning.`;

    let response;
    if (this.useAnthropic) {
      response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{ role: 'user', content: analysisPrompt }]
      });
      response = response.content[0].text;
    } else {
      const result = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 4000,
        temperature: 0.3
      });
      response = result.choices[0].message.content;
    }

    return response;
  }

  /**
   * Enhanced analysis with Hanna's 2025 strategy context AND historical memory
   */
  async analyzeResearchDataWithStrategyAndMemory(combinedResearchData, reportContext) {
    // Load Hanna's 2025 strategy document content
    let hannaStrategy = '';
    try {
      hannaStrategy = await fs.readFile('/Users/nicholasroco/Documents/Claude Code Obsidian/hanna ai news agent/Hanna 2025 Content Pillars Strategy.md', 'utf8');
    } catch (error) {
      logger.warn('Could not load Hanna 2025 strategy document:', error.message);
      hannaStrategy = 'Strategy document not available';
    }

    // Format historical context for AI analysis
    const recentTopics = Object.entries(reportContext.coveredTopics)
      .map(([topic, occurrences]) => `${topic} (covered ${occurrences.length} times, last: ${occurrences[occurrences.length - 1]?.week})`)
      .join('\n');

    const analysisPrompt = `As Hanna's AI content strategist, analyze this week's research data using her comprehensive 2025 content strategy AND historical context to avoid duplication and build on previous insights.

HANNA'S 2025 STRATEGY CONTEXT:
${hannaStrategy.substring(0, 2500)}

HISTORICAL CONTEXT - AVOID DUPLICATION:
Recent Reports: ${reportContext.recentReports.length} reports in memory
Recently Covered Topics:
${recentTopics}

Content Gaps to Explore:
${reportContext.recommendations.join('\n')}

Top Performing Sources:
${reportContext.topSources.slice(0, 5).map(([domain, count]) => `${domain} (${count} articles)`).join('\n')}

RESEARCH DATA FROM TAVILY:
${JSON.stringify(combinedResearchData, null, 2).substring(0, 3500)}

ENHANCED ANALYSIS FRAMEWORK:

1. **Fresh Angles on Familiar Topics**: For any topics recently covered, identify new angles, data points, or perspectives that build on previous coverage rather than repeat it.

2. **Content Pillar Gaps**: Focus extra attention on pillars that have been under-covered historically.

3. **Narrative Continuity**: Reference insights or trends from previous reports when relevant (e.g., "Following up on last month's discussion of...")

4. **Emerging vs. Recurring Patterns**: Distinguish between genuinely new trends and ongoing themes that need fresh treatment.

5. **Strategic Evolution**: How do this week's findings support or modify Hanna's Q1 2025 goals and product launches?

REQUIRED OUTPUT:
- Strategic insights that build on (not repeat) previous coverage
- Content opportunities that fill identified gaps
- Specific hooks that advance ongoing narratives
- Quarterly theme alignment with memory of past focus areas
- Clear differentiation from recently covered topics

Provide detailed, non-repetitive analysis that advances Hanna's content narrative strategically.`;

    let response;
    if (this.useAnthropic) {
      response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{ role: 'user', content: analysisPrompt }]
      });
      response = response.content[0].text;
    } else {
      const result = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 4000,
        temperature: 0.3
      });
      response = result.choices[0].message.content;
    }

    return response;
  }
}

export default new IntelligentReportGenerator();