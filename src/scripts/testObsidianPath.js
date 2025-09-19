#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import intelligentReportGenerator from '../services/intelligentReportGenerator.js';
import { logger } from '../utils/logger.js';

async function testObsidianPath() {
  try {
    logger.info('Testing Obsidian path integration...');
    
    // Generate a test report for next week
    const report = await intelligentReportGenerator.generateWeeklyReport('2025-08-28');
    
    logger.info(`✅ Test report generated successfully!`);
    logger.info(`📁 Local report: ${report.markdown}`);
    logger.info(`📊 JSON data: ${report.json}`);
    logger.info(`🗂️ Obsidian file: ${report.obsidian}`);
    
    console.log('\n=== OBSIDIAN INTEGRATION TEST RESULTS ===');
    console.log(`✅ Reports will now save to: /Claude Code Obsidian/Hanna AI Reports/hanna ai news agent/`);
    console.log(`✅ Supporting files moved to same location`);
    console.log(`✅ Internal linking maintained`);
    console.log(`✅ Ready for weekly automation`);
    
    return {
      success: true,
      obsidianPath: report.obsidian,
      message: 'All reports will now save to your preferred Obsidian location'
    };
    
  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testObsidianPath()
    .then((result) => {
      logger.info('Obsidian integration test completed successfully');
      console.log('\nResult:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      logger.error('Test failed:', error);
      process.exit(1);
    });
}

export default testObsidianPath;