#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🤖 Starting Hanna AI News Agent...\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
  console.log('⚠️  No .env file found. Creating from template...');
  fs.copyFileSync('.env.example', '.env');
  console.log('✅ Created .env file. Please add your API keys before continuing.\n');
  console.log('Required: OPENAI_API_KEY or ANTHROPIC_API_KEY');
  console.log('Optional: SLACK_BOT_TOKEN, GOOGLE_SERVICE_ACCOUNT_JSON\n');
  process.exit(1);
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Create necessary directories
const dirs = ['data', 'logs', 'reports'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

console.log('\n🚀 Starting server...\n');

// Start the main application
try {
  await import('./src/index.js');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  
  if (error.message.includes('OPENAI_API_KEY') || error.message.includes('ANTHROPIC_API_KEY')) {
    console.log('\n💡 Make sure to set at least one AI API key in your .env file:');
    console.log('   OPENAI_API_KEY=your_key_here');
    console.log('   OR');
    console.log('   ANTHROPIC_API_KEY=your_key_here\n');
  }
  
  process.exit(1);
}