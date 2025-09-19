#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import database from '../config/database.js';
import socialMediaService from '../services/socialMediaService.js';
import { logger } from '../utils/logger.js';

dotenv.config();

async function importFromCSV(filePath) {
  try {
    const csvContent = await fs.readFile(filePath, 'utf-8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const posts = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      
      const post = {};
      headers.forEach((header, index) => {
        post[header] = values[index] || '';
      });
      
      if (post.content && post.platform) {
        posts.push({
          platform: post.platform.toLowerCase(),
          id: post.id || `imported_${Date.now()}_${i}`,
          content: post.content,
          date: post.date || post.posted_date || new Date().toISOString(),
          metrics: {
            likes: parseInt(post.likes || post.like_count || 0),
            comments: parseInt(post.comments || post.comment_count || 0),
            shares: parseInt(post.shares || post.share_count || 0),
            views: parseInt(post.views || post.view_count || 0)
          }
        });
      }
    }
    
    return posts;
  } catch (error) {
    logger.error('Error reading CSV file:', error);
    throw error;
  }
}

async function importFromJSON(filePath) {
  try {
    const jsonContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(jsonContent);
    
    if (Array.isArray(data)) {
      return data;
    } else if (data.posts && Array.isArray(data.posts)) {
      return data.posts;
    } else {
      throw new Error('Invalid JSON format - expected array of posts or object with posts property');
    }
  } catch (error) {
    logger.error('Error reading JSON file:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node importHannaData.js <file-path> [--format csv|json]

Examples:
  node importHannaData.js ./data/hanna_posts.csv
  node importHannaData.js ./data/hanna_posts.json --format json
  
Expected CSV columns:
  platform, content, date, likes, comments, shares, views
  
Expected JSON format:
  [
    {
      "platform": "tiktok",
      "content": "Post content here",
      "date": "2024-01-01T00:00:00.000Z",
      "metrics": {
        "likes": 100,
        "comments": 10,
        "shares": 5,
        "views": 1000
      }
    }
  ]
`);
    process.exit(1);
  }
  
  const filePath = args[0];
  const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : path.extname(filePath).substring(1);
  
  try {
    logger.info(`Starting Hanna data import from: ${filePath}`);
    
    await database.init();
    
    let posts = [];
    
    if (format === 'csv') {
      posts = await importFromCSV(filePath);
    } else if (format === 'json') {
      posts = await importFromJSON(filePath);
    } else {
      throw new Error(`Unsupported format: ${format}. Use 'csv' or 'json'`);
    }
    
    console.log(`📊 Found ${posts.length} posts to import`);
    
    await socialMediaService.importHannaAnalytics(posts);
    
    console.log(`✅ Successfully imported ${posts.length} Hanna posts`);
    
    const platformBreakdown = posts.reduce((acc, post) => {
      acc[post.platform] = (acc[post.platform] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📱 Platform breakdown:');
    Object.entries(platformBreakdown).forEach(([platform, count]) => {
      console.log(`  ${platform}: ${count} posts`);
    });
    
    const highPerformers = posts.filter(post => {
      const totalEngagement = Object.values(post.metrics || {}).reduce((sum, val) => sum + (val || 0), 0);
      return totalEngagement > 100;
    });
    
    console.log(`\n🔥 High performers (>100 total engagement): ${highPerformers.length}`);
    
    await database.close();
    process.exit(0);
    
  } catch (error) {
    logger.error('Data import failed:', error);
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

main();