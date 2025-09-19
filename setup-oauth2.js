#!/usr/bin/env node

import 'dotenv/config';
import { google } from 'googleapis';
import http from 'http';
import { parse } from 'url';
import { promises as fs } from 'fs';
import open from 'open';

console.log('🔐 Setting up OAuth2 for Google Drive/Docs...\n');

async function setupOAuth2() {
  try {
    console.log('📋 Step 1: Setting up OAuth2 credentials...');

    // You'll need to get these from Google Cloud Console
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || 'your-client-id',
      process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret',
      'http://localhost:3000/auth/callback' // Redirect URI
    );

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.log('\n⚠️  OAuth2 credentials not found in .env file');
      console.log('\n🔧 Setup Instructions:');
      console.log('1. Go to Google Cloud Console: https://console.cloud.google.com');
      console.log('2. Select your project (or create new one)');
      console.log('3. Go to APIs & Services > Credentials');
      console.log('4. Click "Create Credentials" > "OAuth 2.0 Client IDs"');
      console.log('5. Application type: "Desktop application"');
      console.log('6. Name: "Hanna AI Reports OAuth"');
      console.log('7. Add redirect URI: http://localhost:3000/auth/callback');
      console.log('8. Download the JSON and add to .env:');
      console.log('   GOOGLE_CLIENT_ID=your_client_id_here');
      console.log('   GOOGLE_CLIENT_SECRET=your_client_secret_here');
      console.log('\n📝 Then run this script again: node setup-oauth2.js');
      return;
    }

    console.log('✅ OAuth2 credentials found');

    // Check if we already have a refresh token
    try {
      const tokenData = await fs.readFile('./data/google-oauth-token.json', 'utf8');
      const tokens = JSON.parse(tokenData);

      if (tokens.refresh_token) {
        console.log('✅ Existing refresh token found - testing...');

        oauth2Client.setCredentials(tokens);

        // Test the token
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        const response = await drive.about.get({ fields: 'user,storageQuota' });

        console.log(`✅ OAuth2 working! User: ${response.data.user.displayName}`);

        const quota = response.data.storageQuota;
        if (quota) {
          const usedGB = Math.round(parseInt(quota.usage || 0) / (1024 * 1024 * 1024) * 100) / 100;
          const limitGB = Math.round(parseInt(quota.limit || 0) / (1024 * 1024 * 1024) * 100) / 100;
          console.log(`📊 Storage: ${usedGB} GB used / ${limitGB} GB available`);
        }

        console.log('\n🎉 OAuth2 setup complete! The system can now use your personal Google Drive.');
        return;
      }
    } catch (error) {
      console.log('ℹ️  No existing token found, starting OAuth flow...');
    }

    console.log('\n🌐 Step 2: Starting OAuth2 authorization flow...');

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/documents'
      ],
      prompt: 'consent' // Force consent screen to get refresh token
    });

    console.log('\n🔗 Opening authorization URL in your browser...');
    console.log(`If it doesn't open automatically, visit: ${authUrl}\n`);

    // Open the URL in the default browser
    await open(authUrl);

    // Start a local server to receive the callback
    const server = http.createServer(async (req, res) => {
      const urlParts = parse(req.url, true);

      if (urlParts.pathname === '/auth/callback') {
        const code = urlParts.query.code;

        if (code) {
          try {
            console.log('🔄 Exchanging authorization code for tokens...');

            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Save tokens for future use
            await fs.mkdir('./data', { recursive: true });
            await fs.writeFile('./data/google-oauth-token.json', JSON.stringify(tokens, null, 2));

            console.log('✅ Tokens saved successfully!');

            // Test the connection
            const drive = google.drive({ version: 'v3', auth: oauth2Client });
            const response = await drive.about.get({ fields: 'user,storageQuota' });

            console.log(`✅ OAuth2 setup complete! User: ${response.data.user.displayName}`);

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                  <h1 style="color: green;">✅ OAuth2 Setup Complete!</h1>
                  <p>You can close this window and return to the terminal.</p>
                  <p><strong>User:</strong> ${response.data.user.displayName}</p>
                  <p><strong>Email:</strong> ${response.data.user.emailAddress}</p>
                </body>
              </html>
            `);

            server.close();

          } catch (error) {
            console.error('❌ Error exchanging code for tokens:', error.message);

            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                  <h1 style="color: red;">❌ OAuth2 Setup Failed</h1>
                  <p>Error: ${error.message}</p>
                  <p>Check the terminal for details.</p>
                </body>
              </html>
            `);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: red;">❌ Authorization Failed</h1>
                <p>No authorization code received.</p>
              </body>
            </html>
          `);
        }
      }
    });

    server.listen(3000, () => {
      console.log('🔄 Waiting for authorization callback on http://localhost:3000/auth/callback');
      console.log('   (Server will close automatically after authorization)');
    });

  } catch (error) {
    console.error('❌ OAuth2 setup failed:', error.message);
  }
}

setupOAuth2();