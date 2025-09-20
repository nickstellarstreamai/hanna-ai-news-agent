#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import intelligentReportGenerator from './src/services/intelligentReportGenerator.js';

async function testGoogleDocsFormat() {
  try {
    console.log('🔥 Testing Google Docs report formatting...');

    // Generate a report using the Tavily-based system
    const result = await intelligentReportGenerator.generateWeeklyReport();

    console.log('✅ Report generated successfully!');
    console.log('📄 Google Doc URL:', result.googleDocUrl);
    console.log('📧 Email sent:', result.emailSent);
    console.log('📝 Report saved to:', result.reportPath);

    return result;
  } catch (error) {
    console.error('❌ Error testing Google Docs format:', error);
    throw error;
  }
}

testGoogleDocsFormat();