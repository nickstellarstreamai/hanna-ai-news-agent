#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import intelligentReportGenerator from './src/services/intelligentReportGenerator.js';

async function runFreshProductionTest() {
  try {
    console.log('🚀 RUNNING FULL PRODUCTION TEST WITH FRESH TAVILY DATA');
    console.log('📊 This will use real Tavily searches for current week');
    console.log('🎯 Elite Context Engineering with focused sub-agents');
    console.log('📄 Will create Google Doc and send email');
    console.log('💾 Will update memory system with new data\n');

    const startTime = Date.now();

    // Run the full intelligent report generation
    const result = await intelligentReportGenerator.generateWeeklyReport();

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\n🎉 PRODUCTION TEST COMPLETED SUCCESSFULLY!');
    console.log(`⏱️  Total time: ${duration} seconds`);

    if (result.googleDocUrl) {
      console.log('📄 Google Doc:', result.googleDocUrl);
    }

    if (result.emailSent) {
      console.log('📧 Email delivered to both recipients');
    }

    console.log('📊 Report metadata:');
    console.log('- Week:', result.metadata?.weekStart);
    console.log('- Sources analyzed:', result.metadata?.totalSources);
    console.log('- Generated:', result.metadata?.generatedDate);

    if (result.keyStories) {
      console.log('📰 Key stories generated:', Array.isArray(result.keyStories) ? result.keyStories.length : 'Available');
    }

    console.log('\n✅ Full production workflow complete with fresh data!');

    return result;
  } catch (error) {
    console.error('❌ Production test failed:', error);
    throw error;
  }
}

runFreshProductionTest();