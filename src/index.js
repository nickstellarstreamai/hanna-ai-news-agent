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
        githubStorage: process.env.GITHUB_TOKEN ? 'configured' : 'missing',
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

// Background processing function
async function processReportAsync() {
  try {
    logger.info('🚀 Starting background report generation with optimizations...');
    const startTime = Date.now();

    const report = await intelligentReportGenerator.generateWeeklyReport();

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    logger.info(`✅ Background report generation completed in ${duration} seconds`);
    logger.info(`📄 Google Doc: ${report.googleDoc?.url || 'Created'}`);
    logger.info(`📧 Email: ${report.email?.success ? 'Sent' : 'Check logs'}`);
    logger.info(`💾 GitHub: All Tavily data preserved in repository`);

  } catch (error) {
    logger.error('❌ Background report generation failed:', error);
  }
}

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