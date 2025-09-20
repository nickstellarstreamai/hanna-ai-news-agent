#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import intelligentReportGenerator from './src/services/intelligentReportGenerator.js';

async function testTimeoutSystem() {
  try {
    console.log('🚀 Testing timeout protection system...');
    console.log('⏱️  Will gracefully handle timeouts and use fallbacks');

    // Run with a shorter overall timeout to test the system
    const result = await intelligentReportGenerator.generateWeeklyReport();

    console.log('\n✅ Report generation completed successfully!');

    if (result.fallback) {
      console.log('🛡️ System used fallback content due to processing constraints');
    } else {
      console.log('🎯 Full analysis completed within timeout limits');
    }

    if (result.googleDocUrl) {
      console.log('📄 Google Doc URL:', result.googleDocUrl);
    }

    if (result.emailSent) {
      console.log('📧 Email sent successfully');
    }

    console.log('\n📊 Report Summary:');
    console.log('- Week:', result.metadata?.weekStart || 'N/A');
    console.log('- Sources:', result.metadata?.totalSources || 'N/A');
    console.log('- Generated:', result.metadata?.generatedDate || 'N/A');
    console.log('- Fallback used:', result.fallback ? 'Yes' : 'No');

    return result;
  } catch (error) {
    console.error('❌ Error testing timeout system:', error);
    throw error;
  }
}

testTimeoutSystem();