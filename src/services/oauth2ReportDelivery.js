#!/usr/bin/env node

import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import { logger } from '../utils/logger.js';

class OAuth2ReportDeliveryService {
  constructor() {
    this.initialized = false;
    this.oauth2Client = null;
    this.docs = null;
    this.drive = null;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3000/auth/callback'
      );

      // Load saved tokens
      const tokenData = await fs.readFile('./data/google-oauth-token.json', 'utf8');
      const tokens = JSON.parse(tokenData);

      this.oauth2Client.setCredentials(tokens);

      // Refresh token if needed
      this.oauth2Client.on('tokens', async (newTokens) => {
        if (newTokens.refresh_token) {
          tokens.refresh_token = newTokens.refresh_token;
        }
        tokens.access_token = newTokens.access_token;
        await fs.writeFile('./data/google-oauth-token.json', JSON.stringify(tokens, null, 2));
        logger.info('OAuth2 tokens refreshed');
      });

      this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      // Test connection
      const response = await this.drive.about.get({ fields: 'user' });
      logger.info(`OAuth2 initialized for user: ${response.data.user.displayName}`);

      // Initialize email transporter
      this.emailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      this.initialized = true;

    } catch (error) {
      logger.error('Failed to initialize OAuth2 service:', error);
      throw new Error(`OAuth2 initialization failed: ${error.message}. Run 'node setup-oauth2.js' to set up authentication.`);
    }
  }

  async createGoogleDoc(reportData, reportMarkdown) {
    try {
      await this.initialize();

      logger.info('Creating Google Doc with OAuth2...');

      // Find or create reports folder
      const folderId = await this.ensureReportsFolder();

      // Create document in the folder
      const createResponse = await this.drive.files.create({
        requestBody: {
          name: `Hanna AI Weekly Reports - ${reportData.metadata.weekStart}`,
          mimeType: 'application/vnd.google-apps.document',
          parents: [folderId]
        }
      });

      const documentId = createResponse.data.id;
      logger.info(`Created Google Doc: ${documentId}`);

      // Add formatted content
      const requests = await this.createFormattedDocumentRequests(reportData, reportMarkdown);

      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId,
          requestBody: { requests }
        });
        logger.info('Document content added');
      }

      // Make shareable
      await this.drive.permissions.create({
        fileId: documentId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      const docUrl = `https://docs.google.com/document/d/${documentId}`;
      logger.info(`Google Doc created and shared: ${docUrl}`);

      return {
        documentId,
        url: docUrl,
        title: `Hanna AI Weekly Reports - ${reportData.metadata.weekStart}`,
        folderId
      };

    } catch (error) {
      logger.error('Error creating Google Doc with OAuth2:', error);
      throw error;
    }
  }

  async ensureReportsFolder() {
    try {
      // Search for existing folder
      const searchResponse = await this.drive.files.list({
        q: "name='Hanna AI Weekly Reports' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)'
      });

      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        const folderId = searchResponse.data.files[0].id;
        logger.info(`Found existing reports folder: ${folderId}`);
        return folderId;
      }

      // Create folder if it doesn't exist
      const createResponse = await this.drive.files.create({
        requestBody: {
          name: 'Hanna AI Weekly Reports',
          mimeType: 'application/vnd.google-apps.folder'
        }
      });

      const folderId = createResponse.data.id;
      logger.info(`Created reports folder: ${folderId}`);
      return folderId;

    } catch (error) {
      logger.error('Error managing reports folder:', error);
      throw error;
    }
  }

  async createFormattedDocumentRequests(reportData, reportMarkdown) {
    const requests = [];
    let currentIndex = 1;

    // Helper function to add formatted text
    const addFormattedText = (text, formatting = {}) => {
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: text
        }
      });

      if (Object.keys(formatting).length > 0) {
        const startIndex = currentIndex;
        const endIndex = currentIndex + text.length;

        requests.push({
          updateTextStyle: {
            range: { startIndex, endIndex },
            textStyle: formatting,
            fields: Object.keys(formatting).join(',')
          }
        });
      }

      currentIndex += text.length;
    };

    // Use the full SAMPLE_REPORT.md content structure
    const sections = this.parseReportMarkdown(reportMarkdown);

    // Title and subtitle from SAMPLE_REPORT.md format
    addFormattedText(`Hanna's Weekly Career Intelligence Brief — ${reportData.metadata.weekStart}\n\n`, {
      fontSize: { magnitude: 24, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.2, green: 0.25, blue: 0.31 } } }
    });

    addFormattedText(`Generated from ${reportData.metadata.totalSources} sources across 5 content pillars using AI-powered Tavily research and strategic analysis\n\n`, {
      fontSize: { magnitude: 12, unit: 'PT' },
      italic: true
    });

    addFormattedText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');

    // Executive Summary
    addFormattedText('🎯 Executive Summary\n\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.4, green: 0.47, blue: 0.91 } } }
    });

    if (sections.executiveSummary) {
      addFormattedText(sections.executiveSummary + '\n\n');
    }

    addFormattedText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');

    // Key Stories & Content Opportunities
    addFormattedText('📰 Key Stories & Content Opportunities\n\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.8, green: 0.2, blue: 0.2 } } }
    });

    if (sections.keyStories) {
      addFormattedText(sections.keyStories + '\n\n');
    }

    // Content Hooks & Frameworks
    addFormattedText('💡 Content Hooks & Frameworks\n\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.2, green: 0.7, blue: 0.2 } } }
    });

    if (sections.contentHooks) {
      addFormattedText(sections.contentHooks + '\n\n');
    }

    // Platform-Specific Ideas
    addFormattedText('🎨 Platform-Specific Ideas\n\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.6, green: 0.2, blue: 0.8 } } }
    });

    if (sections.platformIdeas) {
      addFormattedText(sections.platformIdeas + '\n\n');
    }

    // Trend Analysis
    addFormattedText('📊 Trend Analysis\n\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.8, green: 0.4, blue: 0.0 } } }
    });

    if (sections.trendAnalysis) {
      addFormattedText(sections.trendAnalysis + '\n\n');
    }

    // Community Engagement Prompts
    addFormattedText('🗣️ Community Engagement Prompts\n\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.0, green: 0.5, blue: 0.7 } } }
    });

    if (sections.communityPrompts) {
      addFormattedText(sections.communityPrompts + '\n\n');
    }

    // Research Sources
    addFormattedText('📚 Research Sources\n\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.8, green: 0.4, blue: 0.0 } } }
    });

    if (sections.researchSources) {
      addFormattedText(sections.researchSources + '\n\n');
    }

    // Report Metadata
    addFormattedText('📈 Report Metadata\n\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.5, green: 0.5, blue: 0.5 } } }
    });

    const metadataText = `• Generated: ${reportData.metadata.generatedDate}
• Total Sources: ${reportData.metadata.totalSources} articles analyzed
• Content Pillars: Career Clarity & Goals, Personal Branding & Visibility, Strategic Growth & Skills Development, Workplace Trends & Advocacy, Work that Complements Life
• AI Model: GPT-4 with Hanna's 2025 strategy integration
• Report Type: Weekly Intelligence with Memory System Integration
• Authentication: OAuth2 (Personal Google Drive)

`;
    addFormattedText(metadataText);

    // Footer
    addFormattedText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
    addFormattedText('This report was generated by Hanna\'s AI Intelligence System using real-time Tavily web research, strategic content analysis, and historical memory integration. All sources are cited for further research and verification. The system automatically tracks covered topics to ensure fresh content each week and builds narrative continuity across reports.\n', {
      fontSize: { magnitude: 10, unit: 'PT' },
      italic: true
    });

    return requests;
  }

  /**
   * Parse the markdown report to extract sections matching SAMPLE_REPORT.md structure
   */
  parseReportMarkdown(reportMarkdown) {
    const sections = {};

    // Extract each section using regex patterns
    sections.executiveSummary = this.extractSection(reportMarkdown, '## 🎯 Executive Summary');
    sections.keyStories = this.extractSection(reportMarkdown, '## 📰 Key Stories & Content Opportunities');
    sections.contentHooks = this.extractSection(reportMarkdown, '## 💡 Content Hooks & Frameworks');
    sections.platformIdeas = this.extractSection(reportMarkdown, '## 🎨 Platform-Specific Ideas');
    sections.trendAnalysis = this.extractSection(reportMarkdown, '## 📊 Trend Analysis');
    sections.communityPrompts = this.extractSection(reportMarkdown, '## 🗣️ Community Engagement Prompts');
    sections.researchSources = this.extractSection(reportMarkdown, '## 📚 Research Sources');

    return sections;
  }

  /**
   * Extract a specific section from markdown content
   */
  extractSection(markdown, sectionHeader) {
    const regex = new RegExp(`${sectionHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
    const match = markdown.match(regex);
    return match ? match[1].trim() : null;
  }

  async sendEmailWithReport(recipientEmail, googleDocData, reportData) {
    try {
      await this.initialize();

      const primaryEmail = process.env.REPORT_TO_EMAIL || recipientEmail;
      const ccEmail = process.env.REPORT_CC_EMAIL;

      logger.info(`Sending email to ${primaryEmail}${ccEmail ? ` (CC: ${ccEmail})` : ''}...`);

      const emailSubject = `🚀 Hanna AI Weekly Report - ${reportData.metadata.weekStart}`;

      // Extract content for email preview
      const executiveSummary = reportData.executiveSummary.split('\n').map(line => line.trim()).filter(line => line);
      const firstContentIdea = this.extractFirstContentIdea(reportData.contentIdeas);

      const emailBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #2c3e50;">
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">🚀 Hanna AI Weekly Report</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Week of ${reportData.metadata.weekStart}</p>
  </div>

  <!-- Main Content -->
  <div style="padding: 30px; background: white;">
    <!-- Report Stats -->
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #667eea;">
      <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">📊 This Week's Intelligence</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <div style="text-align: center; padding: 15px; background: white; border-radius: 6px;">
          <div style="font-size: 28px; font-weight: bold; color: #667eea; margin-bottom: 5px;">${reportData.metadata.totalSources}</div>
          <div style="font-size: 14px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">Sources Analyzed</div>
        </div>
        <div style="text-align: center; padding: 15px; background: white; border-radius: 6px;">
          <div style="font-size: 28px; font-weight: bold; color: #28a745; margin-bottom: 5px;">15</div>
          <div style="font-size: 14px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px;">Content Ideas</div>
        </div>
      </div>
    </div>

    <!-- Executive Summary -->
    <div style="margin-bottom: 30px;">
      <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 8px;">🎯 Executive Summary</h3>
      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3;">
        ${executiveSummary.map(point => `<p style="margin: 0 0 12px 0; line-height: 1.5;">${point}</p>`).join('')}
      </div>
    </div>

    <!-- Top Content Idea -->
    <div style="margin-bottom: 30px;">
      <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #28a745; padding-bottom: 8px;">💡 Priority Content Idea</h3>
      <div style="background: #fff; border: 1px solid #e9ecef; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
        ${firstContentIdea}
      </div>
    </div>

    <!-- Google Doc CTA -->
    <div style="text-align: center; margin: 40px 0; background: linear-gradient(135deg, #667eea20, #764ba220); padding: 30px; border-radius: 10px; border: 2px solid #667eea;">
      <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📄 Complete Report in Google Docs</h3>
      <p style="margin: 0 0 25px 0; color: #495057; font-size: 16px;">Click below to access the full formatted report with all 15 content ideas, research analysis, and clickable source links.</p>

      <a href="${googleDocData.url}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 18px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);">
        📄 Open Full Report
      </a>

      <p style="margin: 15px 0 0 0; font-size: 12px; color: #6c757d;">
        Powered by OAuth2 • Your Personal Google Drive • Memory-Enhanced AI Analysis
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
    <p style="margin: 0; color: #6c757d; font-size: 14px;">
      🤖 Generated by Hanna AI News Agent with Tavily Integration
    </p>
  </div>
</div>
      `;

      const textBody = `
Hanna AI Weekly Report - ${reportData.metadata.weekStart}

📊 This Week's Intelligence:
• ${reportData.metadata.totalSources} sources analyzed
• 15 content ideas generated
• Memory-enhanced AI analysis

🎯 Executive Summary:
${executiveSummary.join('\n')}

💡 Priority Content Idea:
${firstContentIdea}

📄 Full Report: ${googleDocData.url}

Best regards,
Hanna AI News Agent (OAuth2 Powered)
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: primaryEmail,
        cc: ccEmail || undefined,
        subject: emailSubject,
        text: textBody,
        html: emailBody
      };

      await this.emailTransporter.sendMail(mailOptions);

      logger.info(`Email sent successfully to ${primaryEmail}${ccEmail ? ` (CC: ${ccEmail})` : ''}`);

      return {
        success: true,
        recipient: primaryEmail,
        cc: ccEmail,
        subject: emailSubject,
        googleDocUrl: googleDocData.url
      };

    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  extractFirstContentIdea(contentIdeas) {
    const lines = contentIdeas.split('\n').filter(line => line.trim());
    const firstIdea = lines.slice(0, 3).join('\n');
    return firstIdea || 'Content ideas available in full report...';
  }

  async deliverReport(reportData, reportMarkdown, recipientEmail) {
    try {
      logger.info('Starting OAuth2-powered report delivery...');

      // Create Google Doc
      const googleDoc = await this.createGoogleDoc(reportData, reportMarkdown);

      // Send email
      const emailResult = await this.sendEmailWithReport(recipientEmail, googleDoc, reportData);

      logger.info('OAuth2 report delivery completed successfully');

      return {
        googleDoc,
        email: emailResult,
        success: true
      };

    } catch (error) {
      logger.error('OAuth2 report delivery failed:', error);
      throw error;
    }
  }
}

export default new OAuth2ReportDeliveryService();