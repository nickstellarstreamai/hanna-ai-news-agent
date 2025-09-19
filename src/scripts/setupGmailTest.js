#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

async function testGmailSetup() {
  console.log('\n📧 GMAIL SETUP AND TEST TOOL');
  console.log('=====================================');
  
  // Check if email credentials are configured
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  
  console.log(`\n📋 Current Configuration:`);
  console.log(`   Email User: ${emailUser || '❌ Not set'}`);
  console.log(`   Email Password: ${emailPassword ? '✅ Set' : '❌ Not set'}`);
  console.log(`   SMTP Host: ${process.env.EMAIL_HOST || 'smtp.gmail.com'}`);
  console.log(`   SMTP Port: ${process.env.EMAIL_PORT || '587'}`);
  
  if (!emailUser || !emailPassword) {
    console.log('\n🔧 SETUP REQUIRED:');
    console.log('');
    console.log('1. Go to Google Account Settings → Security');
    console.log('2. Enable 2-Factor Authentication (if not already enabled)');
    console.log('3. Go to App passwords → Generate new app password');
    console.log('4. Select "Mail" and your device');
    console.log('5. Copy the 16-character app password');
    console.log('6. Add this to your .env file:');
    console.log('   EMAIL_PASSWORD=your-16-character-app-password');
    console.log('');
    console.log('⚠️  Do NOT use your regular Gmail password - use the app password!');
    console.log('');
    return {
      success: false,
      message: 'Email credentials not configured. Please follow setup instructions above.'
    };
  }
  
  // Test email connection
  console.log('\n🔗 Testing Gmail Connection...');
  
  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
    
    // Verify connection
    await transporter.verify();
    console.log('✅ Gmail connection successful!');
    
    // Send test email
    console.log('\n📨 Sending test email...');
    
    const testEmailOptions = {
      from: emailUser,
      to: emailUser, // Send to self for testing
      subject: '🧪 Hanna AI System - Email Test',
      text: `
Hello Nick,

This is a test email from the Hanna AI News Agent system!

✅ Email delivery is working correctly
📧 Sent from: ${emailUser}
📅 Test time: ${new Date().toLocaleString()}

The system is now ready to send weekly Hanna AI reports automatically.

Next steps:
- Generate weekly reports
- Review report content in Obsidian
- Set up automated scheduling

Best regards,
Hanna AI News Agent System
      `,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2c3e50;">🧪 Hanna AI System - Email Test</h2>
  
  <p>Hello Nick,</p>
  
  <p>This is a test email from the <strong>Hanna AI News Agent system</strong>!</p>
  
  <div style="background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p><strong>✅ Email delivery is working correctly</strong></p>
    <p>📧 Sent from: ${emailUser}<br>
       📅 Test time: ${new Date().toLocaleString()}</p>
  </div>
  
  <p>The system is now ready to send weekly Hanna AI reports automatically.</p>
  
  <h3>Next steps:</h3>
  <ul>
    <li>Generate weekly reports</li>
    <li>Review report content in Obsidian</li>
    <li>Set up automated scheduling</li>
  </ul>
  
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #bdc3c7;">
  <p style="color: #7f8c8d; font-size: 0.9em;">
    Best regards,<br>
    <strong>Hanna AI News Agent System</strong>
  </p>
</div>
      `
    };
    
    await transporter.sendMail(testEmailOptions);
    
    console.log('✅ Test email sent successfully!');
    console.log(`📧 Check your inbox at: ${emailUser}`);
    
    return {
      success: true,
      message: 'Gmail setup and test completed successfully',
      emailSent: true,
      recipient: emailUser
    };
    
  } catch (error) {
    console.log('❌ Gmail test failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 AUTHENTICATION ERROR - Try this:');
      console.log('1. Make sure you\'re using an APP PASSWORD, not your regular password');
      console.log('2. Go to Google Account → Security → App passwords');
      console.log('3. Generate a new 16-character app password');
      console.log('4. Update EMAIL_PASSWORD in .env file');
    }
    
    return {
      success: false,
      message: 'Gmail test failed',
      error: error.message
    };
  }
}

// Self-executing function
if (import.meta.url === `file://${process.argv[1]}`) {
  testGmailSetup()
    .then((result) => {
      console.log('\n📊 TEST RESULTS:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test script error:', error);
      process.exit(1);
    });
}

export default testGmailSetup;