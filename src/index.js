import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express from 'express';
import cron from 'node-cron';

import database from './config/database.js';
import reportGeneration from './services/reportGeneration.js';
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

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      slack: slackService.isEnabled() ? 'enabled' : 'disabled'
    }
  });
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
        newsIngestion: 'active',
        socialMedia: 'active',
        contentAnalysis: 'active',
        ideaGeneration: 'active',
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

function getNextScheduledRun() {
  const now = new Date();
  const nextMonday = new Date();
  nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
  nextMonday.setHours(parseInt(process.env.WEEKLY_REPORT_HOUR) || 9, 0, 0, 0);
  return nextMonday.toISOString();
}

async function runWeeklyReportJob() {
  logger.info('Starting scheduled weekly report generation');
  
  try {
    const report = await reportGeneration.generateWeeklyReport();
    
    if (slackService.isEnabled()) {
      await slackService.postWeeklyReport(report);
      logger.info('Weekly report posted to Slack');
    }
    
    logger.info('Weekly report job completed successfully');
  } catch (error) {
    logger.error('Weekly report job failed:', error);
    
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