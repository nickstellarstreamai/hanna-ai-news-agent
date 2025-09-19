#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import intelligentReportGenerator from '../services/intelligentReportGenerator.js';
import { logger } from '../utils/logger.js';

async function testIntelligentReport() {
  try {
    logger.info('Testing intelligent report generation...');
    
    const report = await intelligentReportGenerator.generateWeeklyReport();
    
    logger.info('Intelligent report generated successfully!');
    logger.info(`Report saved to: ${report.markdown}`);
    
    return report;
  } catch (error) {
    logger.error('Failed to generate intelligent report:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testIntelligentReport()
    .then(() => {
      logger.info('Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Test failed:', error);
      process.exit(1);
    });
}

export default testIntelligentReport;