#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import intelligentReportGenerator from '../services/intelligentReportGenerator.js';
import reportDelivery from '../services/reportDelivery.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';

async function testReportDelivery() {
  try {
    logger.info('Testing end-to-end report delivery for week Aug 21-28, 2025...');
    
    // Step 1: Generate the report
    logger.info('Step 1: Generating intelligent report...');
    const reportResult = await intelligentReportGenerator.generateWeeklyReport('2025-08-21');
    
    // Step 2: Read the generated markdown file
    logger.info('Step 2: Reading generated report files...');
    const markdownContent = await fs.readFile(reportResult.markdown, 'utf-8');
    const reportData = JSON.parse(await fs.readFile(reportResult.json, 'utf-8'));
    
    // Step 3: Check if we have email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      logger.warn('Email configuration not found. Will create local demo instead.');
      
      // Create a demo HTML file locally
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Hanna AI Weekly Report - ${reportData.metadata.weekStart}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; }
        h2 { color: #34495e; margin-top: 30px; }
        h3 { color: #7f8c8d; }
        .executive-summary { background: #ecf0f1; padding: 15px; border-radius: 5px; }
        .content-idea { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #3498db; }
        .hook { font-style: italic; color: #2c3e50; }
        .metadata { color: #7f8c8d; font-size: 0.9em; }
    </style>
</head>
<body>
    ${markdownContent.replace(/\n/g, '<br>').replace(/# /g, '<h1>').replace(/## /g, '<h2>').replace(/### /g, '<h3>')}
</body>
</html>
      `;
      
      const demoFilename = `demo-report-${reportData.metadata.weekStart.replace(/[^0-9]/g, '-')}.html`;
      const demoPath = `./reports/${demoFilename}`;
      await fs.writeFile(demoPath, htmlContent);
      
      logger.info(`Demo report created: ${demoPath}`);
      
      // Create a simple summary for Nick
      const summary = {
        success: true,
        report: {
          week: reportData.metadata.weekStart,
          generated: reportData.metadata.generatedDate,
          sources: reportData.metadata.totalSources,
          ideas: reportData.contentIdeas ? 'Generated successfully' : 'Generated with mock data',
          demoFile: demoPath,
          actualFiles: {
            markdown: reportResult.markdown,
            json: reportResult.json
          }
        },
        nextSteps: [
          'Review the demo HTML file to see report formatting',
          'Set up email credentials (EMAIL_USER, EMAIL_PASSWORD) for delivery',
          'Set up Google service account for Google Docs integration',
          'Test email delivery once credentials are configured'
        ]
      };
      
      console.log('\\n=== REPORT DELIVERY TEST SUMMARY ===');
      console.log(JSON.stringify(summary, null, 2));
      
      return summary;
    }
    
    // Step 3: Deliver report (if email configured)
    logger.info('Step 3: Delivering report to nick@stellarstreamai.com...');
    const deliveryResult = await reportDelivery.deliverReport(
      reportData,
      markdownContent,
      'nick@stellarstreamai.com'
    );
    
    logger.info('Report delivery test completed successfully!');
    
    return {
      reportGeneration: reportResult,
      delivery: deliveryResult,
      success: true
    };
    
  } catch (error) {
    logger.error('Report delivery test failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testReportDelivery()
    .then((result) => {
      logger.info('Test completed successfully');
      console.log('\\nResult:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      logger.error('Test failed:', error);
      process.exit(1);
    });
}

export default testReportDelivery;