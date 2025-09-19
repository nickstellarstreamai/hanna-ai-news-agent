#!/usr/bin/env node

import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import database from '../config/database.js';
import reportGeneration from '../services/reportGeneration.js';
import slackService from '../services/slackService.js';
import { logger } from '../utils/logger.js';

async function main() {
  try {
    logger.info('Manual weekly report generation started');
    
    await database.init();
    
    const weekStart = process.argv[2] || null;
    
    const report = await reportGeneration.generateWeeklyReport(weekStart);
    
    console.log('\n✅ Weekly Report Generated Successfully!');
    console.log(`📊 Report ID: ${report.reportId}`);
    console.log(`📅 Week: ${report.weekStart} to ${report.weekEnd}`);
    console.log(`💡 Ideas Generated: ${report.ideas.length}`);
    console.log(`🎯 Themes Identified: ${report.themes.length}`);
    console.log(`📰 Articles Analyzed: ${report.stats.totalArticles}`);
    console.log(`📱 Social Posts Analyzed: ${report.stats.totalSocialPosts}`);
    
    if (report.reportUrl) {
      console.log(`🔗 Google Doc: ${report.reportUrl}`);
    }
    
    const postToSlack = process.argv.includes('--slack');
    
    if (postToSlack && slackService.isEnabled()) {
      console.log('\n📤 Posting to Slack...');
      await slackService.postWeeklyReport(report);
      console.log('✅ Posted to Slack successfully!');
    } else if (postToSlack) {
      console.log('\n⚠️  Slack not configured - skipping Slack post');
    }
    
    console.log('\n📋 Top 5 Ideas Generated:');
    report.ideas.slice(0, 5).forEach((idea, index) => {
      console.log(`${index + 1}. ${idea.title} (${idea.platform})`);
      console.log(`   Hook: "${idea.hooks[0]}"`);
      console.log('');
    });
    
    console.log('🎉 Report generation complete!');
    
    await database.close();
    process.exit(0);
    
  } catch (error) {
    logger.error('Manual report generation failed:', error);
    console.error('❌ Report generation failed:', error.message);
    
    if (slackService.isEnabled()) {
      await slackService.postErrorAlert(error, 'Manual Report Generation');
    }
    
    process.exit(1);
  }
}

main();