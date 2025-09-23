import { TavilyService } from './tavilyService.js';
import reportMemoryService from './reportMemoryService.js';
import { FocusedAnalysisAgents } from './focusedAnalysisAgents.js';
import oauth2Service from './oauth2ReportDelivery.js';
import githubDataStorage from './githubDataStorage.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 🧠 INTELLIGENT REPORT GENERATOR - ULTRA-COMPREHENSIVE CRASH-PROTECTED VERSION
 *
 * This version includes extensive diagnostics and crash protection for every single operation
 * to identify and resolve the persistent workflow crashes after 3+ hours of debugging.
 */
class IntelligentReportGenerator {
  constructor() {
    this.tavilyService = new TavilyService();
    this.memoryService = reportMemoryService;
    this.focusedAgents = new FocusedAnalysisAgents();
  }

  async initialize() {
    logger.info('🔄 Initializing Intelligent Report Generator...');
    try {
      if (this.memoryService.initialize) {
        await this.memoryService.initialize();
      }
      await githubDataStorage.initialize();
      logger.info('✅ Intelligent Report Generator initialized');
    } catch (error) {
      logger.error('❌ CRITICAL: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 🚨 ULTRA-COMPREHENSIVE CRASH-PROTECTED REPORT GENERATION
   */
  async generateWeeklyReport() {
    const startTime = Date.now();
    let currentStep = 'INITIALIZATION';
    let heartbeatInterval;

    // 🔥 HEARTBEAT MONITORING: Log every 10 seconds with detailed diagnostics
    heartbeatInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const memory = process.memoryUsage();
      logger.info(`💓 HEARTBEAT [${elapsed}s]: Step=${currentStep}, Memory=${Math.round(memory.heapUsed / 1024 / 1024)}MB, RSS=${Math.round(memory.rss / 1024 / 1024)}MB`);
    }, 10000);

    try {
      logger.info('🚨 ULTRA-DIAGNOSTIC MODE: Starting crash-protected weekly report generation...');
      logger.info('📊 System state at start:', {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        memoryUsage: process.memoryUsage()
      });

      currentStep = 'DATE_CALCULATION';
      logger.info('🔄 Step: Calculating week dates...');
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      const weekStartFormatted = weekStart.toISOString().split('T')[0];
      logger.info(`✅ DIAGNOSTIC: Week start calculated: ${weekStartFormatted}`);

      currentStep = 'MEMORY_LOADING';
      logger.info('🔄 Step 0: Loading historical context and memory...');
      let reportContext;
      try {
        reportContext = await this.memoryService.getReportContext();
        logger.info(`✅ DIAGNOSTIC: Memory context loaded - ${Object.keys(reportContext || {}).length} keys`);
      } catch (error) {
        logger.error('❌ DIAGNOSTIC: Memory loading failed:', error.message);
        reportContext = {}; // Use empty object as fallback
      }

      currentStep = 'TAVILY_SEARCH';
      logger.info('🔄 Step 1: Gathering research data from Tavily across all content pillars...');
      let tavilyData;
      try {
        tavilyData = await this.tavilyService.searchAllPillars();
        logger.info(`✅ DIAGNOSTIC: Tavily search completed successfully`);
        logger.info(`📊 DIAGNOSTIC: Tavily data structure:`, {
          type: typeof tavilyData,
          isNull: tavilyData === null,
          isUndefined: tavilyData === undefined,
          keys: tavilyData ? Object.keys(tavilyData) : 'NO_KEYS',
          keyCount: tavilyData ? Object.keys(tavilyData).length : 0
        });
      } catch (error) {
        logger.error('❌ CRITICAL: Tavily search crashed:', error);
        throw new Error(`Tavily search failed: ${error.message}`);
      }

      if (!tavilyData || typeof tavilyData !== 'object') {
        throw new Error(`Tavily returned invalid data: ${typeof tavilyData}`);
      }

      currentStep = 'GITHUB_SAVE';
      logger.info('🔄 Step 1.1: Saving Tavily search results to GitHub...');
      let githubTavilyResult = null;
      try {
        githubTavilyResult = await githubDataStorage.saveTavilyResults(tavilyData, weekStartFormatted);
        if (githubTavilyResult?.success) {
          logger.info(`✅ DIAGNOSTIC: Tavily data saved to GitHub: ${githubTavilyResult.url}`);
        } else {
          logger.warn(`⚠️ DIAGNOSTIC: GitHub save returned: ${JSON.stringify(githubTavilyResult)}`);
        }
      } catch (error) {
        logger.error('❌ DIAGNOSTIC: GitHub save crashed, continuing:', error.message);
        logger.error('❌ GitHub error stack:', error.stack);
      }

      currentStep = 'TRENDING_SEARCH';
      logger.info('🔄 Step 1.5: Gathering trending topics...');
      let trendingData = [];
      try {
        trendingData = await this.tavilyService.searchTrendingTopics();
        logger.info(`✅ DIAGNOSTIC: Trending search completed - ${Array.isArray(trendingData) ? trendingData.length : 'INVALID'} topics`);
      } catch (error) {
        logger.error('❌ DIAGNOSTIC: Trending search crashed:', error.message);
        trendingData = []; // Use empty array as fallback
      }

      currentStep = 'LEGACY_SKIP';
      logger.info('🔄 Step 2: Skipping legacy research agents (Task agents hanging in production)...');
      const legacyResearchData = {
        reddit: [], rss: [], trends: [], competitors: [], sources: [],
        timestamp: new Date().toISOString(),
        note: 'Legacy agents disabled due to Task tool hanging in Railway production'
      };
      logger.info('✅ DIAGNOSTIC: Legacy research data structure created');

      currentStep = 'DATA_MERGE';
      logger.info('🔄 Step 4: Merging all data sources...');
      let combinedResearchData;
      try {
        combinedResearchData = this.combineResearchData(tavilyData, trendingData, legacyResearchData);
        logger.info(`✅ DIAGNOSTIC: Data merge completed - ${Object.keys(combinedResearchData || {}).length} pillars`);
      } catch (error) {
        logger.error('❌ CRITICAL: Data merge crashed:', error);
        throw new Error(`Data merge failed: ${error.message}`);
      }

      currentStep = 'STRATEGY_LOADING';
      logger.info('🔄 Step 3: Loading basic strategy context...');
      let basicStrategy;
      try {
        basicStrategy = await this.loadBasicStrategy();
        logger.info(`✅ DIAGNOSTIC: Basic strategy loaded - ${basicStrategy ? basicStrategy.length : 0} characters`);
      } catch (error) {
        logger.error('❌ DIAGNOSTIC: Strategy loading failed:', error.message);
        basicStrategy = 'Basic strategy unavailable';
      }

      // ELITE CONTEXT ENGINEERING: Use focused sub-agents
      logger.info('🎯 Starting Elite Context Engineering with focused sub-agents...');

      currentStep = 'RESEARCH_SYNTHESIS';
      logger.info('🔄 FOCUSED AGENT 1: Research Synthesis...');
      let analysis;
      try {
        analysis = await this.focusedAgents.synthesizeResearch(combinedResearchData, basicStrategy);
        logger.info(`✅ DIAGNOSTIC: Research synthesis completed - ${analysis ? analysis.length : 0} characters`);
      } catch (error) {
        logger.error('❌ CRITICAL: Research synthesis crashed:', error);
        throw new Error(`Research synthesis failed: ${error.message}`);
      }

      currentStep = 'DATA_EXTRACTION';
      logger.info('🔄 Extracting top research items...');
      let topResearchItems;
      try {
        topResearchItems = this.focusedAgents.extractTopResearchItems(combinedResearchData);
        logger.info(`✅ DIAGNOSTIC: Extracted ${Array.isArray(topResearchItems) ? topResearchItems.length : 'INVALID'} research items`);
      } catch (error) {
        logger.error('❌ DIAGNOSTIC: Research extraction failed:', error.message);
        topResearchItems = [];
      }

      currentStep = 'KEY_STORIES';
      logger.info('🔄 FOCUSED AGENT 2: Key Stories Generation...');
      let keyStories;
      try {
        keyStories = await this.focusedAgents.generateKeyStories(analysis, topResearchItems);
        logger.info(`✅ DIAGNOSTIC: Generated ${Array.isArray(keyStories) ? keyStories.length : 'INVALID'} key stories`);
      } catch (error) {
        logger.error('❌ CRITICAL: Key stories generation crashed:', error);
        throw new Error(`Key stories generation failed: ${error.message}`);
      }

      currentStep = 'THEME_EXTRACTION';
      logger.info('🔄 Extracting key themes...');
      let keyThemes;
      try {
        keyThemes = Array.isArray(keyStories) ? keyStories.map(story => story.title).join(', ') : 'No themes available';
        logger.info(`✅ DIAGNOSTIC: Key themes extracted - ${keyThemes.length} characters`);
      } catch (error) {
        logger.error('❌ DIAGNOSTIC: Theme extraction failed:', error.message);
        keyThemes = 'Theme extraction failed';
      }

      currentStep = 'CONTENT_HOOKS';
      logger.info('🔄 FOCUSED AGENT 3: Content Hooks Creation...');
      let contentHooks;
      try {
        contentHooks = await this.focusedAgents.createContentHooks(analysis, keyThemes);
        logger.info(`✅ DIAGNOSTIC: Generated ${Array.isArray(contentHooks) ? contentHooks.length : 'INVALID'} content hooks`);
      } catch (error) {
        logger.error('❌ CRITICAL: Content hooks creation crashed:', error);
        throw new Error(`Content hooks creation failed: ${error.message}`);
      }

      currentStep = 'EXECUTIVE_SUMMARY';
      logger.info('🔄 FOCUSED AGENT 4: Executive Summary Creation...');
      let executiveSummary;
      try {
        const summaryData = {
          keyStories: keyStories || [],
          contentHooks: contentHooks || [],
          analysis: analysis || ''
        };
        executiveSummary = await this.focusedAgents.createExecutiveSummary(summaryData);
        logger.info(`✅ DIAGNOSTIC: Executive summary created - ${executiveSummary ? executiveSummary.length : 0} characters`);
      } catch (error) {
        logger.error('❌ CRITICAL: Executive summary creation crashed:', error);
        throw new Error(`Executive summary creation failed: ${error.message}`);
      }

      currentStep = 'CONTENT_IDEAS';
      logger.info('🔄 FOCUSED AGENT 5: Content Ideas Generation...');
      let contentIdeas;
      try {
        contentIdeas = await this.focusedAgents.generateContentIdeas(analysis, keyStories || []);
        logger.info(`✅ DIAGNOSTIC: Generated ${Array.isArray(contentIdeas) ? contentIdeas.length : 'INVALID'} content ideas`);
      } catch (error) {
        logger.error('❌ CRITICAL: Content ideas generation crashed:', error);
        throw new Error(`Content ideas generation failed: ${error.message}`);
      }

      currentStep = 'WATCHLIST';
      logger.info('🔄 FOCUSED AGENT 6: Watchlist Creation...');
      let watchlist;
      try {
        watchlist = await this.focusedAgents.createWatchlist(combinedResearchData);
        logger.info(`✅ DIAGNOSTIC: Created ${Array.isArray(watchlist) ? watchlist.length : 'INVALID'} watchlist items`);
      } catch (error) {
        logger.error('❌ CRITICAL: Watchlist creation crashed:', error);
        throw new Error(`Watchlist creation failed: ${error.message}`);
      }

      currentStep = 'REPORT_ASSEMBLY';
      logger.info('🔄 Step 6: Assembling final report...');
      let report;
      try {
        report = {
          weekStart: weekStartFormatted,
          executiveSummary: executiveSummary || 'Executive summary unavailable',
          keyStories: keyStories || [],
          contentHooks: contentHooks || [],
          contentIdeas: contentIdeas || [],
          analysis: analysis || 'Analysis unavailable',
          watchlist: watchlist || [],
          sources: combinedResearchData ? Object.values(combinedResearchData).flat() : [],
          rawResearch: combinedResearchData
        };
        logger.info(`✅ DIAGNOSTIC: Report assembled - ${Object.keys(report).length} sections`);
      } catch (error) {
        logger.error('❌ CRITICAL: Report assembly crashed:', error);
        throw new Error(`Report assembly failed: ${error.message}`);
      }

      currentStep = 'REPORT_FORMATTING';
      logger.info('🔄 Step 7: Formatting and saving report...');
      let formattedReport;
      try {
        formattedReport = await this.formatReport(report);
        logger.info(`✅ DIAGNOSTIC: Report formatted - ${formattedReport ? formattedReport.length : 0} characters`);
      } catch (error) {
        logger.error('❌ CRITICAL: Report formatting crashed:', error);
        throw new Error(`Report formatting failed: ${error.message}`);
      }

      currentStep = 'REPORT_SAVING';
      logger.info('🔄 Step 8: Saving report...');
      let savedReport;
      try {
        savedReport = await this.saveReport(formattedReport, report);
        logger.info(`✅ DIAGNOSTIC: Report saved successfully`);
      } catch (error) {
        logger.error('❌ CRITICAL: Report saving crashed:', error);
        throw new Error(`Report saving failed: ${error.message}`);
      }

      currentStep = 'MEMORY_STORAGE';
      logger.info('🔄 Step 9: Storing report in memory system...');
      try {
        await this.memoryService.storeReport(report, formattedReport);
        logger.info(`✅ DIAGNOSTIC: Report stored in memory system`);
      } catch (error) {
        logger.error('❌ DIAGNOSTIC: Memory storage failed:', error.message);
      }

      currentStep = 'GITHUB_STORAGE';
      logger.info('🔄 Step 10: Saving complete report data to GitHub...');
      try {
        const completeReportData = {
          report,
          formattedReport,
          metadata: {
            generatedAt: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime,
            version: 'v2.0-ultra-diagnostic'
          }
        };
        const githubResult = await githubDataStorage.saveCompleteReport(completeReportData, weekStartFormatted);
        if (githubResult?.success) {
          logger.info(`✅ DIAGNOSTIC: Complete report saved to GitHub: ${githubResult.url}`);
        }
      } catch (error) {
        logger.error('❌ DIAGNOSTIC: GitHub report storage failed:', error.message);
      }

      currentStep = 'COMPLETION';
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      logger.info(`🎉 ULTRA-DIAGNOSTIC SUCCESS: Report generation completed in ${duration} seconds`);
      logger.info(`📄 Google Doc URL: ${savedReport.googleDoc?.url || 'NO_GOOGLE_DOC_URL'}`);
      logger.info(`📧 Email status: ${savedReport.email?.success ? 'SENT_SUCCESSFULLY' : 'EMAIL_FAILED'}`);
      logger.info(`💾 GitHub storage: ${savedReport.githubStorage ? 'DATA_PRESERVED' : 'NO_GITHUB_STORAGE'}`);
      logger.info(`📈 Final memory usage:`, process.memoryUsage());

      return savedReport;

    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      logger.error('🚨 ULTRA-DIAGNOSTIC CRITICAL ERROR:');
      logger.error(`❌ Failed at step: ${currentStep}`);
      logger.error(`❌ Duration before failure: ${duration} seconds`);
      logger.error(`❌ Error name: ${error.name}`);
      logger.error(`❌ Error message: ${error.message}`);
      logger.error(`❌ Error stack:`, error.stack);
      logger.error('❌ System state at failure:', {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        memoryUsage: process.memoryUsage(),
        currentStep
      });
      throw error;

    } finally {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        logger.info('🔄 DIAGNOSTIC: Heartbeat monitoring stopped');
      }
    }
  }

  /**
   * Combine research data from multiple sources
   */
  combineResearchData(tavilyData, trendingData, legacyResearchData) {
    try {
      logger.info('🔄 Combining research data from all sources...');

      // Start with Tavily data as the primary source
      const combined = { ...tavilyData };

      // Add trending data if available
      if (Array.isArray(trendingData) && trendingData.length > 0) {
        combined.trending = trendingData;
      }

      // Add legacy data structure
      if (legacyResearchData && typeof legacyResearchData === 'object') {
        Object.keys(legacyResearchData).forEach(key => {
          if (key !== 'timestamp' && key !== 'note') {
            combined[`legacy_${key}`] = legacyResearchData[key];
          }
        });
      }

      logger.info(`✅ DIAGNOSTIC: Research data combined - ${Object.keys(combined).length} data sources`);
      return combined;
    } catch (error) {
      logger.error('❌ CRITICAL: Research data combination failed:', error);
      throw error;
    }
  }

  /**
   * Load basic strategy context
   */
  async loadBasicStrategy() {
    try {
      logger.info('🔄 Loading basic strategy context...');
      const strategyPath = path.join(process.cwd(), 'Hanna 2025 Content Pillars Strategy.md');
      const strategyContent = await fs.readFile(strategyPath, 'utf-8');
      logger.info(`✅ DIAGNOSTIC: Strategy loaded - ${strategyContent.length} characters`);
      return strategyContent;
    } catch (error) {
      logger.error('❌ DIAGNOSTIC: Strategy loading failed:', error.message);
      return 'Hanna is a 350k+ follower career development expert focusing on authentic, anti-corporate advice for professionals navigating career transitions, workplace challenges, and personal branding.';
    }
  }

  /**
   * Format the report for delivery
   */
  async formatReport(report) {
    try {
      logger.info('🔄 Formatting report for delivery...');

      let formatted = `# Hanna's Weekly Intelligence Report\n`;
      formatted += `**Week of ${report.weekStart}**\n\n`;

      formatted += `## Executive Summary\n${report.executiveSummary}\n\n`;

      if (Array.isArray(report.keyStories) && report.keyStories.length > 0) {
        formatted += `## Key Stories\n`;
        report.keyStories.forEach((story, index) => {
          formatted += `### ${index + 1}. ${story.title || 'Untitled Story'}\n`;
          formatted += `${story.summary || story.content || 'No content available'}\n\n`;
        });
      }

      if (Array.isArray(report.contentHooks) && report.contentHooks.length > 0) {
        formatted += `## Content Hooks\n`;
        report.contentHooks.forEach((hook, index) => {
          formatted += `${index + 1}. ${hook.title || hook.hook || hook}\n`;
        });
        formatted += `\n`;
      }

      if (Array.isArray(report.contentIdeas) && report.contentIdeas.length > 0) {
        formatted += `## Content Ideas\n`;
        report.contentIdeas.forEach((idea, index) => {
          formatted += `${index + 1}. ${idea.title || idea.idea || idea}\n`;
        });
        formatted += `\n`;
      }

      if (Array.isArray(report.watchlist) && report.watchlist.length > 0) {
        formatted += `## This Week's Watchlist\n`;
        report.watchlist.forEach((item, index) => {
          formatted += `${index + 1}. ${item.title || item.topic || item}\n`;
        });
        formatted += `\n`;
      }

      formatted += `## Strategic Analysis\n${report.analysis}\n\n`;

      formatted += `---\n*Generated by Hanna AI News Agent*\n`;

      logger.info(`✅ DIAGNOSTIC: Report formatted - ${formatted.length} characters`);
      return formatted;
    } catch (error) {
      logger.error('❌ CRITICAL: Report formatting failed:', error);
      throw error;
    }
  }

  /**
   * Save and deliver the report
   */
  async saveReport(formattedReport, reportData) {
    try {
      logger.info('🔄 Saving and delivering report...');

      // Initialize OAuth service
      await oauth2Service.initialize();

      // Create Google Doc and send email
      const result = await oauth2Service.createGoogleDocAndEmail({
        content: formattedReport,
        weekStart: reportData.weekStart,
        metadata: {
          keyStoriesCount: Array.isArray(reportData.keyStories) ? reportData.keyStories.length : 0,
          contentHooksCount: Array.isArray(reportData.contentHooks) ? reportData.contentHooks.length : 0,
          contentIdeasCount: Array.isArray(reportData.contentIdeas) ? reportData.contentIdeas.length : 0,
          watchlistCount: Array.isArray(reportData.watchlist) ? reportData.watchlist.length : 0
        }
      });

      logger.info(`✅ DIAGNOSTIC: Report saved and delivered successfully`);
      return result;
    } catch (error) {
      logger.error('❌ CRITICAL: Report saving/delivery failed:', error);
      throw error;
    }
  }
}

export default new IntelligentReportGenerator();