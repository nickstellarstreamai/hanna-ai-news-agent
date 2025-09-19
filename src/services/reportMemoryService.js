#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { format, subWeeks, parseISO } from 'date-fns';
import { logger } from '../utils/logger.js';

/**
 * Report Memory Service for Hanna AI News Agent
 *
 * This service manages historical report data to avoid duplication and improve
 * content quality by building on past insights and tracking covered topics.
 *
 * Features:
 * - Store report summaries and key insights
 * - Track covered stories and themes
 * - Identify patterns across weeks
 * - Prevent content duplication
 * - Build narrative continuity
 */
class ReportMemoryService {
  constructor() {
    this.reportsDir = './reports';
    this.memoryFile = './data/report-memory.json';
    this.insightsFile = './data/cumulative-insights.md';
  }

  /**
   * Initialize memory system and ensure directories exist
   */
  async initialize() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
      await fs.mkdir('./data', { recursive: true });

      // Ensure memory file exists
      try {
        await fs.access(this.memoryFile);
      } catch {
        await this.initializeMemoryFile();
      }

      // Ensure insights file exists
      try {
        await fs.access(this.insightsFile);
      } catch {
        await this.initializeInsightsFile();
      }

      logger.info('Report memory system initialized');
    } catch (error) {
      logger.error('Failed to initialize report memory system:', error);
      throw error;
    }
  }

  /**
   * Initialize empty memory file with schema
   */
  async initializeMemoryFile() {
    const initialMemory = {
      version: '1.0.0',
      lastUpdate: new Date().toISOString(),
      reports: [],
      coveredTopics: {},
      insights: {
        recurringThemes: [],
        emergingTrends: [],
        audienceReactions: [],
        contentPerformance: []
      },
      statistics: {
        totalReports: 0,
        totalSources: 0,
        avgSourcesPerReport: 0,
        topPillars: {},
        topDomains: {}
      }
    };

    await fs.writeFile(this.memoryFile, JSON.stringify(initialMemory, null, 2));
    logger.info('Memory file initialized');
  }

  /**
   * Initialize cumulative insights markdown file
   */
  async initializeInsightsFile() {
    const initialInsights = `# Hanna AI - Cumulative Intelligence Insights

*This file tracks patterns, themes, and insights across all weekly reports to improve future content generation*

## 🧠 Key Patterns Discovered

### Recurring Themes
- *Will be populated as reports are analyzed*

### Emerging Trends
- *Will track new developments over time*

### Audience Engagement Patterns
- *Will identify what resonates most*

### Content Performance Insights
- *Will track which topics and formats work best*

---

## 📊 Historical Coverage

### Top Content Pillars
- *Will show which areas get most coverage*

### Frequently Covered Topics
- *Will help avoid repetition*

### Source Analysis
- *Will show most valuable information sources*

---

## 🎯 Strategic Recommendations

### Content Gaps
- *Will identify underexplored opportunities*

### Format Optimization
- *Will suggest best approaches for different topics*

### Timing Insights
- *Will identify optimal timing for different content types*

---

*Last Updated: ${format(new Date(), 'MMM dd, yyyy \'at\' h:mm a')}*
`;

    await fs.writeFile(this.insightsFile, initialInsights);
    logger.info('Insights file initialized');
  }

  /**
   * Store a new report in memory system
   */
  async storeReport(reportData, reportContent) {
    try {
      const memory = await this.loadMemory();

      // Extract key information from report
      const reportSummary = this.extractReportSummary(reportData, reportContent);

      // Add to memory
      memory.reports.unshift(reportSummary); // Most recent first

      // Keep only last 12 weeks of reports
      memory.reports = memory.reports.slice(0, 12);

      // Update covered topics
      this.updateCoveredTopics(memory, reportSummary);

      // Update statistics
      this.updateStatistics(memory, reportSummary);

      // Update timestamp
      memory.lastUpdate = new Date().toISOString();

      // Save updated memory
      await fs.writeFile(this.memoryFile, JSON.stringify(memory, null, 2));

      // Update cumulative insights
      await this.updateCumulativeInsights(memory);

      logger.info(`Report stored in memory: ${reportSummary.weekStart}`);

    } catch (error) {
      logger.error('Failed to store report in memory:', error);
    }
  }

  /**
   * Extract key summary information from a report
   */
  extractReportSummary(reportData, reportContent) {
    const sources = reportData.sources || [];
    const topics = this.extractTopics(reportContent);
    const themes = this.extractThemes(reportContent);

    return {
      weekStart: reportData.metadata?.weekStart || format(new Date(), 'MMM dd, yyyy'),
      date: new Date().toISOString(),
      totalSources: sources.length,
      pillars: reportData.rawResearch?.pillars || [],
      topics: topics,
      themes: themes,
      sources: sources.slice(0, 10).map(s => ({
        title: s.title,
        url: s.url,
        pillar: s.pillar,
        domain: new URL(s.url).hostname
      })),
      executiveSummary: reportData.executiveSummary?.substring(0, 500) || '',
      contentIdeasCount: this.countContentIdeas(reportContent),
      keyInsights: this.extractKeyInsights(reportContent)
    };
  }

  /**
   * Extract main topics from report content
   */
  extractTopics(content) {
    const topicKeywords = [
      'salary negotiation', 'career pivot', 'linkedin', 'personal branding',
      'remote work', 'hybrid work', 'ai skills', 'upskilling', 'burnout',
      'workplace culture', 'pay transparency', 'job search', 'networking',
      'leadership', 'promotion', 'career development', 'work-life balance'
    ];

    return topicKeywords.filter(topic =>
      content.toLowerCase().includes(topic.toLowerCase())
    );
  }

  /**
   * Extract themes from report content
   */
  extractThemes(content) {
    const themePatterns = [
      { name: 'AI Transformation', patterns: ['ai', 'artificial intelligence', 'automation', 'machine learning'] },
      { name: 'Future of Work', patterns: ['remote work', 'hybrid work', 'workplace trends', 'future of work'] },
      { name: 'Career Development', patterns: ['career growth', 'promotion', 'skill development', 'upskilling'] },
      { name: 'Workplace Rights', patterns: ['pay transparency', 'employee rights', 'workplace advocacy'] },
      { name: 'Work-Life Balance', patterns: ['burnout', 'work-life balance', 'wellness', 'sustainable work'] }
    ];

    const contentLower = content.toLowerCase();
    return themePatterns.filter(theme =>
      theme.patterns.some(pattern => contentLower.includes(pattern))
    ).map(theme => theme.name);
  }

  /**
   * Extract key insights from report
   */
  extractKeyInsights(content) {
    // Simple extraction - could be enhanced with NLP
    const insights = [];

    // Look for insight patterns
    const insightPatterns = [
      /key insight[s]?[:\s]([^.]*\.) /gi,
      /important[ly]?[:\s]([^.]*\.) /gi,
      /trend[s]?[:\s]([^.]*\.) /gi,
      /opportunity[:\s]([^.]*\.) /gi
    ];

    insightPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        insights.push(...matches.slice(0, 3));
      }
    });

    return insights.slice(0, 5);
  }

  /**
   * Count content ideas in report
   */
  countContentIdeas(content) {
    const ideaMarkers = content.match(/^\s*\d+\./gm);
    return ideaMarkers ? ideaMarkers.length : 0;
  }

  /**
   * Update covered topics tracking
   */
  updateCoveredTopics(memory, reportSummary) {
    reportSummary.topics.forEach(topic => {
      if (!memory.coveredTopics[topic]) {
        memory.coveredTopics[topic] = [];
      }
      memory.coveredTopics[topic].push({
        date: reportSummary.date,
        week: reportSummary.weekStart
      });

      // Keep only last 8 weeks for each topic
      memory.coveredTopics[topic] = memory.coveredTopics[topic].slice(-8);
    });
  }

  /**
   * Update statistics
   */
  updateStatistics(memory, reportSummary) {
    memory.statistics.totalReports++;
    memory.statistics.totalSources += reportSummary.totalSources;
    memory.statistics.avgSourcesPerReport =
      Math.round(memory.statistics.totalSources / memory.statistics.totalReports);

    // Update pillar stats
    reportSummary.pillars.forEach(pillar => {
      memory.statistics.topPillars[pillar] = (memory.statistics.topPillars[pillar] || 0) + 1;
    });

    // Update domain stats
    reportSummary.sources.forEach(source => {
      const domain = source.domain;
      memory.statistics.topDomains[domain] = (memory.statistics.topDomains[domain] || 0) + 1;
    });
  }

  /**
   * Update cumulative insights file
   */
  async updateCumulativeInsights(memory) {
    const insights = this.generateCumulativeInsights(memory);
    await fs.writeFile(this.insightsFile, insights);
  }

  /**
   * Generate cumulative insights content
   */
  generateCumulativeInsights(memory) {
    const topPillars = Object.entries(memory.statistics.topPillars)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    const topDomains = Object.entries(memory.statistics.topDomains)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const frequentTopics = Object.entries(memory.coveredTopics)
      .map(([topic, occurrences]) => ({ topic, count: occurrences.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentThemes = [...new Set(
      memory.reports.slice(0, 4).flatMap(r => r.themes)
    )];

    return `# Hanna AI - Cumulative Intelligence Insights

*This file tracks patterns, themes, and insights across ${memory.statistics.totalReports} weekly reports*

## 🧠 Key Patterns Discovered

### Recent Recurring Themes (Last 4 Weeks)
${recentThemes.map(theme => `- ${theme}`).join('\n')}

### Most Covered Content Pillars
${topPillars.map(([pillar, count]) => `- **${pillar}**: ${count} reports`).join('\n')}

### Frequently Covered Topics
${frequentTopics.map(({ topic, count }) => `- **${topic}**: ${count} times`).join('\n')}

### Most Valuable Sources
${topDomains.map(([domain, count]) => `- **${domain}**: ${count} articles`).join('\n')}

---

## 📊 Historical Coverage Analysis

### Report Statistics
- **Total Reports Generated**: ${memory.statistics.totalReports}
- **Total Sources Analyzed**: ${memory.statistics.totalSources}
- **Average Sources per Report**: ${memory.statistics.avgSourcesPerReport}

### Coverage Patterns
${Object.entries(memory.coveredTopics).length > 0 ?
  Object.entries(memory.coveredTopics).map(([topic, occurrences]) =>
    `- **${topic}**: Last covered ${occurrences[occurrences.length - 1]?.week}`
  ).slice(0, 10).join('\n')
  : '- *No patterns identified yet*'}

---

## 🎯 Strategic Recommendations

### Content Gaps to Explore
${this.identifyContentGaps(memory).map(gap => `- ${gap}`).join('\n')}

### Avoid Over-Coverage
${frequentTopics.slice(0, 3).map(({ topic }) => `- **${topic}** (recently covered frequently)`).join('\n')}

### Trending Opportunities
${recentThemes.slice(0, 3).map(theme => `- Build on **${theme}** momentum`).join('\n')}

---

## 📈 Recent Report Summaries

${memory.reports.slice(0, 3).map(report => `### Week of ${report.weekStart}
- **Sources**: ${report.totalSources}
- **Topics**: ${report.topics.slice(0, 5).join(', ')}
- **Key Insight**: ${report.keyInsights[0] || 'N/A'}
`).join('\n')}

---

*Last Updated: ${format(new Date(), 'MMM dd, yyyy \'at\' h:mm a')}*
*Memory System Version: ${memory.version}*
`;
  }

  /**
   * Identify content gaps based on coverage patterns
   */
  identifyContentGaps(memory) {
    const allPillars = [
      'Career Clarity & Goals',
      'Personal Branding & Visibility',
      'Strategic Growth & Skills Development',
      'Workplace Trends, Rights & Advocacy',
      'Work that Complements Life'
    ];

    const underCoveredPillars = allPillars.filter(pillar =>
      (memory.statistics.topPillars[pillar] || 0) < memory.statistics.totalReports * 0.15
    );

    const gaps = [
      ...underCoveredPillars.map(pillar => `Increase coverage of "${pillar}"`),
      'Explore international workplace trends',
      'Focus on Gen Z career perspectives',
      'Cover more startup vs corporate career paths',
      'Address career transitions post-40'
    ];

    return gaps.slice(0, 5);
  }

  /**
   * Load memory data
   */
  async loadMemory() {
    try {
      const content = await fs.readFile(this.memoryFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      logger.warn('Could not load memory file, initializing new one');
      await this.initializeMemoryFile();
      return this.loadMemory();
    }
  }

  /**
   * Get context for new report generation
   */
  async getReportContext() {
    const memory = await this.loadMemory();
    const insights = await this.loadInsights();

    return {
      recentReports: memory.reports.slice(0, 4),
      coveredTopics: memory.coveredTopics,
      insights: insights,
      statistics: memory.statistics,
      recommendations: this.identifyContentGaps(memory),
      topSources: Object.entries(memory.statistics.topDomains)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    };
  }

  /**
   * Load cumulative insights
   */
  async loadInsights() {
    try {
      return await fs.readFile(this.insightsFile, 'utf8');
    } catch (error) {
      logger.warn('Could not load insights file');
      return 'No historical insights available yet.';
    }
  }

  /**
   * Check if topic was recently covered
   */
  async wasRecentlyCovered(topic, withinWeeks = 2) {
    const memory = await this.loadMemory();
    const cutoffDate = subWeeks(new Date(), withinWeeks);

    if (!memory.coveredTopics[topic]) return false;

    return memory.coveredTopics[topic].some(coverage =>
      parseISO(coverage.date) > cutoffDate
    );
  }

  /**
   * Get trending topics not recently covered
   */
  async getFreshTopicOpportunities() {
    const memory = await this.loadMemory();
    const allTopics = Object.keys(memory.coveredTopics);
    const cutoffDate = subWeeks(new Date(), 3);

    const staleTopics = allTopics.filter(topic => {
      const lastCoverage = memory.coveredTopics[topic][memory.coveredTopics[topic].length - 1];
      return parseISO(lastCoverage.date) < cutoffDate;
    });

    const freshTopics = [
      'AI career skills', 'salary negotiation 2025', 'remote work evolution',
      'personal branding trends', 'workplace culture shifts', 'career pivot strategies'
    ].filter(topic => !allTopics.includes(topic));

    return [...staleTopics, ...freshTopics].slice(0, 10);
  }
}

export { ReportMemoryService };