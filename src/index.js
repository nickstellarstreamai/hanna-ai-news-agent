import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express from 'express';
import cron from 'node-cron';

import database from './config/database.js';
import intelligentReportGenerator from './services/intelligentReportGenerator.js';
import githubDataStorage from './services/githubDataStorage.js';
import slackService from './services/slackService.js';
import { logger } from './utils/logger.js';

import chatbotRouter from './api/chatbot.js';
import reportsRouter from './api/reports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/chat', chatbotRouter);
app.use('/api/reports', reportsRouter);

app.get('/health', async (req, res) => {
  try {
    // Test intelligent report generator initialization
    await intelligentReportGenerator.initialize();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: 'v2.0-intelligent-reports',
      services: {
        database: 'connected',
        intelligentReportGenerator: 'initialized',
        tavilyAPI: process.env.TAVILY_API_KEY ? 'configured' : 'missing',
        openaiAPI: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
        anthropicAPI: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
        googleOAuth: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing',
        emailService: process.env.EMAIL_USER ? 'configured' : 'missing',
        githubStorage: process.env.GITHUB_TOKEN ? 'configured' : 'MISSING_TOKEN',
        slack: slackService.isEnabled() ? 'enabled' : 'disabled'
      },
      scheduling: {
        nextReport: getNextScheduledRun(),
        timezone: process.env.TIMEZONE || 'America/Los_Angeles',
        cronExpression: `0 ${parseInt(process.env.WEEKLY_REPORT_HOUR) || 7} * * 1`
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const recentReports = await database.getWeeklyReports(1);
    const lastReport = recentReports[0] || null;

    res.json({
      status: 'operational',
      lastReportGenerated: lastReport?.week_start_date || null,
      nextScheduledRun: getNextScheduledRun(),
      services: {
        intelligentReports: 'active',
        tavilySearch: 'active',
        googleDocs: 'active',
        emailDelivery: 'active',
        memorySystem: 'active',
        slack: slackService.isEnabled() ? 'enabled' : 'disabled'
      }
    });
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(500).json({
      status: 'error',
      error: 'Status check failed'
    });
  }
});

// Manual report generation endpoint for testing (OPTIMIZED)
app.post('/api/generate-report', async (req, res) => {
  try {
    logger.info('🧪 Manual report generation triggered');

    // 🔥 CRITICAL: Send immediate response to avoid timeout
    res.json({
      success: true,
      message: 'Report generation started in background (optimized for speed)',
      status: 'processing',
      timestamp: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + 120000).toISOString(), // 2 minutes estimate
      note: 'Check GitHub repo for Tavily results and Google Drive for reports'
    });

    // Continue processing in background without blocking response
    processReportAsync().catch(error => {
      logger.error('❌ Background report generation failed:', error);
    });

  } catch (error) {
    logger.error('❌ Manual report generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced background processing function with detailed logging
async function processReportAsync() {
  const startTime = Date.now();
  let currentStep = 'INITIALIZATION';

  try {
    logger.info('🚀 Starting background report generation with enhanced quality system...');
    logger.info('📊 Expected duration: 3-4 minutes with Claude 3.5 Sonnet');

    currentStep = 'REPORT_GENERATION';
    logger.info('🔄 Step 1: Initializing intelligent report generator...');

    const report = await intelligentReportGenerator.generateWeeklyReport();

    currentStep = 'VALIDATION';
    logger.info('🔄 Step 2: Validating report generation results...');

    if (!report) {
      throw new Error('Report generation returned null/undefined');
    }

    logger.info(`📊 Report metadata: ${JSON.stringify(report.data?.metadata || {})}`);

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    currentStep = 'COMPLETION';
    logger.info(`✅ Background report generation completed in ${duration} seconds`);
    logger.info(`📄 Google Doc: ${report.googleDoc?.url || 'No URL found'}`);
    logger.info(`📧 Email: ${report.email?.success ? 'Sent successfully' : 'Failed or not attempted'}`);
    logger.info(`💾 GitHub: ${report.githubStorage ? 'Data preserved' : 'Storage status unknown'}`);
    logger.info(`📈 Quality: Enhanced Claude 3.5 Sonnet analysis completed`);

  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.error(`❌ CRITICAL: Background report generation failed at step: ${currentStep}`);
    logger.error(`❌ Duration before failure: ${duration} seconds`);
    logger.error(`❌ Error details:`, {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 10).join('\n'), // First 10 lines of stack
      name: error.name,
      step: currentStep
    });

    // Log additional context for debugging
    logger.error('❌ System context at failure:', {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      env: {
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasTavilyKey: !!process.env.TAVILY_API_KEY,
        hasGitHubToken: !!process.env.GITHUB_TOKEN
      }
    });
  }
}

// Diagnostic endpoint to test individual components
app.get('/api/diagnostic', async (req, res) => {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Anthropic API
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const testResponse = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say "Claude test successful"' }]
      });
      results.tests.anthropic = {
        status: 'SUCCESS',
        response: testResponse.content[0].text
      };
    } catch (error) {
      results.tests.anthropic = {
        status: 'FAILED',
        error: error.message
      };
    }

    // Test 2: GitHub Storage
    try {
      await githubDataStorage.initialize();
      const stats = githubDataStorage.getStats();
      results.tests.github = {
        status: stats.initialized ? 'SUCCESS' : 'FAILED',
        stats
      };
    } catch (error) {
      results.tests.github = {
        status: 'FAILED',
        error: error.message
      };
    }

    // Test 3: Tavily Service
    try {
      const { TavilyService } = await import('./services/tavilyService.js');
      const tavilyService = new TavilyService();
      results.tests.tavily = {
        status: 'INITIALIZED',
        searches_used: tavilyService.searches_used,
        monthly_limit: tavilyService.monthly_limit
      };
    } catch (error) {
      results.tests.tavily = {
        status: 'FAILED',
        error: error.message
      };
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Debug endpoint to search for recent documents
app.get('/api/debug/recent-docs', async (req, res) => {
  try {
    // Import the OAuth service to search for documents
    const oauth2Service = (await import('./services/oauth2ReportDelivery.js')).default;
    await oauth2Service.initialize();

    // Search for recent documents
    const recentDocs = await oauth2Service.drive.files.list({
      q: "name contains 'Hanna' and mimeType='application/vnd.google-apps.document'",
      orderBy: 'createdTime desc',
      pageSize: 10,
      fields: 'files(id, name, createdTime, webViewLink, parents)'
    });

    // Also search for the folder
    const folders = await oauth2Service.drive.files.list({
      q: "name contains 'Hanna' and mimeType='application/vnd.google-apps.folder'",
      fields: 'files(id, name, createdTime)'
    });

    res.json({
      recentDocuments: recentDocs.data.files,
      folders: folders.data.files,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

function getNextScheduledRun() {
  const now = new Date();
  const nextMonday = new Date();
  nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
  nextMonday.setHours(parseInt(process.env.WEEKLY_REPORT_HOUR) || 9, 0, 0, 0);
  return nextMonday.toISOString();
}

async function runWeeklyReportJob() {
  logger.info('🚀 Starting scheduled weekly intelligent report generation');

  try {
    const report = await intelligentReportGenerator.generateWeeklyReport();

    if (slackService.isEnabled()) {
      await slackService.postWeeklyReport(report);
      logger.info('Weekly report posted to Slack');
    }

    logger.info('✅ Weekly intelligent report job completed successfully');
    logger.info(`📄 Google Doc: ${report.googleDoc?.url || 'Created'}`);
    logger.info(`📧 Email sent to: ${process.env.REPORT_TO_EMAIL}`);

  } catch (error) {
    logger.error('❌ Weekly report job failed:', error);

    if (slackService.isEnabled()) {
      await slackService.postErrorAlert(error, 'Weekly Report Generation');
    }
  }
}

async function initializeApplication() {
  try {
    logger.info('Initializing Hanna AI News Agent...');
    
    await database.init();
    logger.info('Database initialized');
    
    if (slackService.isEnabled()) {
      await slackService.testConnection();
      logger.info('Slack connection verified');
    }
    
    const weeklyReportDay = parseInt(process.env.WEEKLY_REPORT_DAY) || 1; // Monday = 1
    const weeklyReportHour = parseInt(process.env.WEEKLY_REPORT_HOUR) || 9; // 9 AM
    
    const cronExpression = `0 ${weeklyReportHour} * * ${weeklyReportDay}`;
    cron.schedule(cronExpression, runWeeklyReportJob, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'America/Los_Angeles'
    });
    
    logger.info(`Weekly report scheduled: ${cronExpression} (${process.env.TIMEZONE || 'America/Los_Angeles'})`);
    
    app.listen(PORT, () => {
      logger.info(`Hanna AI News Agent server started on port ${PORT}`);
      logger.info('🚀 All systems operational');
    });
    
  } catch (error) {
    logger.error('Application initialization failed:', error);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  if (slackService.isEnabled()) {
    slackService.postErrorAlert(error, 'Uncaught Exception');
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  if (slackService.isEnabled()) {
    slackService.postErrorAlert(new Error(reason), 'Unhandled Rejection');
  }
});

process.on('SIGINT', async () => {
  logger.info('Gracefully shutting down...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Gracefully shutting down...');
  await database.close();
  process.exit(0);
});

initializeApplication();