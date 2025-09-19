import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import { logger } from '../utils/logger.js';

class ReportDeliveryService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Initialize Google Docs API (using service account)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      this.auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: [
          'https://www.googleapis.com/auth/documents',
          'https://www.googleapis.com/auth/drive'
        ]
      });
    }
    
    this.docs = google.docs({ version: 'v1', auth: this.auth });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
    
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    this.initialized = true;
  }

  async createGoogleDoc(reportData, reportMarkdown) {
    try {
      await this.initialize();
      
      logger.info('Creating Google Doc from report...');
      
      // First, ensure the "Hanna AI Weekly Reports" folder exists
      const folderId = await this.ensureReportsFolder();
      
      // Create a new document directly in the folder
      const createResponse = await this.drive.files.create({
        requestBody: {
          name: `Hanna AI Weekly Reports - ${reportData.metadata.weekStart}`,
          mimeType: 'application/vnd.google-apps.document',
          parents: [folderId]
        }
      });
      
      const documentId = createResponse.data.id;
      logger.info(`Created Google Doc in reports folder: ${documentId}`);
      
      // Create properly formatted content
      const requests = await this.createFormattedDocumentRequests(reportData, reportMarkdown);
      
      if (requests.length > 0) {
        await this.docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: requests
          }
        });
        logger.info('Document content formatted and inserted');
      }
      
      // Make the document shareable (anyone with link can view)
      await this.drive.permissions.create({
        fileId: documentId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });
      
      const docUrl = `https://docs.google.com/document/d/${documentId}`;
      logger.info(`Google Doc created and made shareable: ${docUrl}`);
      
      return {
        documentId,
        url: docUrl,
        title: `Hanna AI Weekly Reports - ${reportData.metadata.weekStart}`,
        folderId
      };
      
    } catch (error) {
      logger.error('Error creating Google Doc:', error);
      throw error; // Let it fail up to the fallback handler
    }
  }

  async ensureReportsFolder() {
    try {
      // Search for existing "Hanna AI Weekly Reports" folder
      const searchResponse = await this.drive.files.list({
        q: "name='Hanna AI Weekly Reports' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)'
      });
      
      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        const folderId = searchResponse.data.files[0].id;
        logger.info(`Found existing reports folder: ${folderId}`);
        return folderId;
      }
      
      // Create the folder if it doesn't exist
      const createResponse = await this.drive.files.create({
        requestBody: {
          name: 'Hanna AI Weekly Reports',
          mimeType: 'application/vnd.google-apps.folder'
        }
      });
      
      const folderId = createResponse.data.id;
      logger.info(`Created new reports folder: ${folderId}`);
      return folderId;
      
    } catch (error) {
      logger.error('Error managing reports folder:', error);
      return null; // Continue without folder organization
    }
  }

  async createFormattedDocumentRequests(reportData, reportMarkdown) {
    const requests = [];
    let currentIndex = 1;
    
    // Helper function to add text with formatting
    const addFormattedText = (text, formatting = {}) => {
      const startIndex = currentIndex;
      const endIndex = currentIndex + text.length;
      
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: text
        }
      });
      
      if (Object.keys(formatting).length > 0) {
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
    
    // Add header with branding
    addFormattedText('🚀 Hanna AI Weekly Intelligence Report\n', {
      fontSize: { magnitude: 24, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.2, green: 0.25, blue: 0.31 } } }
    });
    
    addFormattedText(`Week of ${reportData.metadata.weekStart}\n\n`, {
      fontSize: { magnitude: 16, unit: 'PT' },
      italic: true
    });
    
    // Add metadata table
    addFormattedText('📊 Report Overview\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true
    });
    
    const overviewText = `• Generated: ${reportData.metadata.generatedDate}
• Research Sources: ${reportData.metadata.totalSources}
• Content Ideas: 15
• Data Timestamp: ${new Date(reportData.metadata.researchTimestamp).toLocaleString()}

`;
    addFormattedText(overviewText);
    
    // Add executive summary
    addFormattedText('🎯 Executive Summary\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.4, green: 0.47, blue: 0.91 } } }
    });
    
    const summaryPoints = reportData.executiveSummary.split('\n').filter(point => point.trim());
    summaryPoints.forEach((point, index) => {
      addFormattedText(`${index + 1}. ${point.trim()}\n\n`);
    });
    
    // Add content ideas section
    addFormattedText('💡 Content Ideas (15)\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.16, green: 0.65, blue: 0.27 } } }
    });
    
    // Parse and format content ideas
    const contentIdeas = this.parseContentIdeas(reportData.contentIdeas);
    contentIdeas.forEach((idea, index) => {
      addFormattedText(`Content Idea ${index + 1}: ${idea.title || 'Strategic Content'}\n`, {
        fontSize: { magnitude: 14, unit: 'PT' },
        bold: true
      });
      
      if (idea.platform) addFormattedText(`Platform: ${idea.platform}\n`);
      if (idea.format) addFormattedText(`Format: ${idea.format}\n`);
      if (idea.hooks && idea.hooks.length > 0) {
        addFormattedText('Hook Options:\n');
        idea.hooks.forEach(hook => {
          addFormattedText(`  • "${hook}"\n`, { italic: true });
        });
      }
      addFormattedText('\n');
    });
    
    // Add research analysis
    addFormattedText('📊 Research Analysis\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true,
      foregroundColor: { color: { rgbColor: { red: 0.4, green: 0.47, blue: 0.91 } } }
    });
    
    addFormattedText(reportData.analysis + '\n\n');
    
    // Add watchlist
    addFormattedText('👀 Next Week\'s Watchlist\n', {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true
    });
    
    addFormattedText(reportData.watchlist + '\n\n');
    
    // Add sources
    addFormattedText(`📚 Research Sources (${reportData.sources.length})\n`, {
      fontSize: { magnitude: 18, unit: 'PT' },
      bold: true
    });
    
    reportData.sources.forEach((source, index) => {
      const sourceText = `${index + 1}. ${source.platform}: ${source.title}`;
      addFormattedText(sourceText);
      
      if (source.url) {
        addFormattedText(` (${source.url})`, {
          foregroundColor: { color: { rgbColor: { red: 0.0, green: 0.0, blue: 1.0 } } },
          underline: true
        });
      }
      
      addFormattedText(` - Accessed: ${new Date(source.accessed).toLocaleDateString()}\n`);
    });
    
    // Add footer
    addFormattedText('\n\n---\n');
    addFormattedText('Generated by Hanna AI Intelligence System\n', {
      fontSize: { magnitude: 12, unit: 'PT' },
      italic: true,
      foregroundColor: { color: { rgbColor: { red: 0.6, green: 0.6, blue: 0.6 } } }
    });
    
    return requests;
  }

  parseContentIdeas(contentIdeasText) {
    if (!contentIdeasText || typeof contentIdeasText !== 'string') {
      return [{ title: 'Content ideas generated - see raw data section' }];
    }
    
    const ideas = [];
    const sections = contentIdeasText.split(/Content Idea \\d+:|\\d+\\. \\*\\*Title\\*\\*:/);
    
    for (const section of sections.slice(1)) { // Skip first empty section
      const idea = { hooks: [] };
      const lines = section.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.includes('**Title**:')) {
          idea.title = trimmedLine.replace(/.*\\*\\*Title\\*\\*:\\s*"?([^"]*)"?.*/, '$1');
        } else if (trimmedLine.includes('**Platform**:')) {
          idea.platform = trimmedLine.replace(/.*\\*\\*Platform\\*\\*:\\s*([^(]*).*/, '$1').trim();
        } else if (trimmedLine.includes('**Format**:')) {
          idea.format = trimmedLine.replace(/.*\\*\\*Format\\*\\*:\\s*([^"]*).*/, '$1').trim();
        } else if (trimmedLine.includes('- "') && idea.hooks.length < 3) {
          const hook = trimmedLine.replace(/.*- "([^"]*)".*/, '$1');
          if (hook !== trimmedLine) idea.hooks.push(hook);
        }
      }
      
      if (idea.title || idea.platform) ideas.push(idea);
    }
    
    return ideas.length > 0 ? ideas.slice(0, 15) : [{ title: 'Strategic content recommendations available' }];
  }

  async createFallbackGoogleDoc(reportData, reportMarkdown) {
    try {
      // Create a simple document with just the title and content
      const createResponse = await this.docs.documents.create({
        requestBody: {
          title: `Hanna AI News Report - ${reportData.metadata.weekStart} (Fallback)`
        }
      });
      
      const documentId = createResponse.data.documentId;
      
      // Insert the markdown content as plain text
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            insertText: {
              location: { index: 1 },
              text: reportMarkdown
            }
          }]
        }
      });
      
      // Make shareable
      await this.drive.permissions.create({
        fileId: documentId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });
      
      const docUrl = `https://docs.google.com/document/d/${documentId}`;
      
      return {
        documentId,
        url: docUrl,
        title: `Hanna AI News Report - ${reportData.metadata.weekStart} (Fallback)`
      };
    } catch (error) {
      logger.error('Error creating fallback Google Doc:', error);
      throw error;
    }
  }

  async sendEmailWithReport(recipientEmail, googleDocData, reportData) {
    try {
      await this.initialize();

      // Handle multiple recipients - primary and CC
      const primaryEmail = process.env.REPORT_TO_EMAIL || recipientEmail;
      const ccEmail = process.env.REPORT_CC_EMAIL;

      logger.info(`Sending email to ${primaryEmail}${ccEmail ? ` (CC: ${ccEmail})` : ''}...`);
      
      const emailSubject = `🚀 Hanna AI Weekly Report - ${reportData.metadata.weekStart}`;
      
      // Extract key content for email
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
        ${executiveSummary.map(point => `<p style="margin: 0 0 12px 0; line-height: 1.5;"><strong>${point.split(':')[0]}:</strong> ${point.split(':').slice(1).join(':').trim()}</p>`).join('')}
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
      
      <a href="${googleDocData.url}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 18px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3); transition: transform 0.2s;">
        📄 Open Complete Report
      </a>
      
      <div style="margin: 25px 0 0 0; padding: 15px; background: rgba(255,255,255,0.8); border-radius: 6px;">
        <p style="margin: 0; font-size: 14px; color: #6c757d; line-height: 1.5;">
          <strong>📁 Organized in:</strong> "Hanna AI Weekly Reports" Google Drive folder<br>
          <strong>🔗 Shareable:</strong> Anyone with link can view<br>
          <strong>📱 Accessible:</strong> Works on all devices - mobile, tablet, desktop
        </p>
      </div>
    </div>

    <!-- Alternative Access -->
    <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 3px solid #6c757d;">
      <h4 style="margin: 0 0 10px 0; color: #495057; font-size: 14px;">📋 Also Available In:</h4>
      <p style="margin: 0; font-size: 13px; color: #6c757d;">
        • Obsidian: <code>Hanna AI Reports/hanna ai news agent/</code><br>
        • Local: <code>./reports/</code> folder for system integration
      </p>
    </div>

    <!-- Next Steps -->
    <div style="background: #d4edda; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 30px 0;">
      <h4 style="margin: 0 0 15px 0; color: #155724;">✅ Ready for Implementation</h4>
      <ul style="margin: 0; padding-left: 20px; color: #155724;">
        <li style="margin-bottom: 8px;">Review complete analysis in Google Doc</li>
        <li style="margin-bottom: 8px;">Prioritize top 3 content ideas for immediate creation</li>
        <li style="margin-bottom: 8px;">Monitor trending topics for next week's opportunities</li>
        <li>Check Obsidian vault for detailed strategic notes</li>
      </ul>
    </div>
  </div>

  <!-- Footer -->
  <div style="background: #f8f9fa; padding: 25px; text-align: center; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px;">
      <strong>Generated:</strong> ${reportData.metadata.generatedDate}<br>
      <strong>Data Sources:</strong> Reddit, RSS feeds, career newsletters, competitor analysis
    </p>
    <p style="margin: 0; color: #6c757d; font-size: 12px;">
      🤖 <strong>Hanna AI News Agent</strong> | Built by Nick @ StellarStream AI<br>
      Next report: ${this.getNextWeekDate(reportData.metadata.weekStart)}
    </p>
  </div>
</div>
      `;
      
      const textBody = `
Hi Nick,

Your weekly Hanna AI news report is ready!

📊 REPORT STATS:
• Week: ${reportData.metadata.weekStart}
• Generated: ${reportData.metadata.generatedDate}
• Research Sources: ${reportData.metadata.totalSources}
• Content Ideas: 15

🎯 EXECUTIVE SUMMARY:
${executiveSummary.join('\n')}

🔗 VIEW COMPLETE REPORT:
${googleDocData.url}

The full report includes 15 content ideas, research analysis, trending themes, and source citations.

Best regards,
Hanna AI News Agent
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
    if (!contentIdeas || typeof contentIdeas !== 'string') {
      return '<p><strong>Priority content ideas are available in the full report.</strong></p>';
    }
    
    // Extract first content idea
    const lines = contentIdeas.split('\n');
    let title = '', platform = '', format = '', hooks = [];
    
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i].trim();
      if (line.includes('**Title**:')) {
        title = line.replace(/.*\*\*Title\*\*:\s*"?([^"]*)"?.*/, '$1');
      } else if (line.includes('**Platform**:')) {
        platform = line.replace(/.*\*\*Platform\*\*:\s*([^(]*).*/, '$1').trim();
      } else if (line.includes('**Format**:')) {
        format = line.replace(/.*\*\*Format\*\*:\s*([^"]*).*/, '$1').trim();
      } else if (line.includes('- "') && hooks.length < 2) {
        const hook = line.replace(/.*- "([^"]*)".*/, '$1');
        if (hook !== line) hooks.push(hook);
      }
    }
    
    return `
      <h4 style="margin: 0 0 10px 0; color: #2c3e50;">${title || 'Priority Content Strategy'}</h4>
      <div style="margin-bottom: 15px;">
        <span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">${platform || 'Multi-Platform'}</span>
        <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${format || 'Strategic Content'}</span>
      </div>
      ${hooks.length > 0 ? `
        <p style="margin: 0 0 10px 0; color: #495057;"><strong>Hook Example:</strong></p>
        <p style="margin: 0; font-style: italic; color: #6c757d; padding: 10px; background: #f8f9fa; border-radius: 4px;">"${hooks[0]}"</p>
      ` : '<p style="margin: 0; color: #6c757d;">Strategic content recommendations available in full report.</p>'}
    `;
  }

  getNextWeekDate(currentWeek) {
    try {
      const date = new Date(currentWeek);
      date.setDate(date.getDate() + 7);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Next week';
    }
  }

  async createLocalHtmlReport(reportData, reportMarkdown) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Create a formatted HTML version
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Hanna AI Weekly Report - ${reportData.metadata.weekStart}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #667eea; }
        .summary { background: #e3f2fd; padding: 25px; border-radius: 8px; border-left: 5px solid #2196f3; margin: 20px 0; }
        .content-idea { background: #fff; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #28a745; }
        h1 { color: white; margin: 0; }
        h2 { color: #2c3e50; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .highlight { background: #fff3cd; padding: 3px 8px; border-radius: 3px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Hanna AI Weekly Report</h1>
        <p>Week of ${reportData.metadata.weekStart}</p>
        <p>Generated: ${reportData.metadata.generatedDate}</p>
    </div>
    
    <div class="stats">
        <div class="stat">
            <div style="font-size: 2em; font-weight: bold; color: #667eea;">${reportData.metadata.totalSources}</div>
            <div>Sources Analyzed</div>
        </div>
        <div class="stat">
            <div style="font-size: 2em; font-weight: bold; color: #28a745;">15</div>
            <div>Content Ideas</div>
        </div>
    </div>
    
    <div class="summary">
        <h2>🎯 Executive Summary</h2>
        ${reportData.executiveSummary.split('\n').map(line => `<p>${line}</p>`).join('')}
    </div>
    
    <h2>📋 Complete Report</h2>
    <pre>${reportMarkdown}</pre>
    
    <div style="text-align: center; margin: 40px 0; padding: 20px; background: #d4edda; border-radius: 8px;">
        <h3>📁 Also Available In:</h3>
        <p>• Obsidian Vault: <code>Hanna AI Reports/hanna ai news agent/</code></p>
        <p>• JSON Data: Local reports folder for chatbot integration</p>
    </div>
</body>
</html>
      `;
      
      const reportDir = path.resolve('./reports');
      const fileName = `hanna-report-${reportData.metadata.weekStart.replace(/[^0-9A-Za-z]/g, '-')}.html`;
      const filePath = path.join(reportDir, fileName);
      
      await fs.writeFile(filePath, htmlContent, 'utf-8');
      return filePath;
      
    } catch (error) {
      logger.error('Error creating local HTML report:', error);
      return './reports/report-fallback.html';
    }
  }

  async deliverReport(reportData, reportMarkdown, recipientEmail) {
    try {
      logger.info('Starting report delivery process...');
      
      // Step 1: Try to create Google Doc (or use fallback)
      let googleDoc;
      try {
        googleDoc = await this.createGoogleDoc(reportData, reportMarkdown);
      } catch (error) {
        logger.warn('Google Doc creation failed, using fallback link:', error.message);
        // Create a fallback with the Obsidian location
        // Create local HTML report as alternative
        const localHtmlPath = await this.createLocalHtmlReport(reportData, reportMarkdown);
        googleDoc = {
          url: `file://${localHtmlPath}`,
          title: `Hanna AI Weekly Report - ${reportData.metadata.weekStart}`,
          documentId: 'local-html-report',
          note: 'Report available locally and in Obsidian vault'
        };
      }
      
      // Step 2: Send email with link
      const emailResult = await this.sendEmailWithReport(recipientEmail, googleDoc, reportData);
      
      logger.info('Report delivery completed successfully');
      
      return {
        googleDoc,
        email: emailResult,
        success: true
      };
      
    } catch (error) {
      logger.error('Report delivery failed:', error);
      
      // Fallback: just send the markdown file as attachment
      return await this.sendFallbackEmail(recipientEmail, reportMarkdown, reportData);
    }
  }

  async sendFallbackEmail(recipientEmail, reportMarkdown, reportData) {
    try {
      await this.initialize();
      
      logger.info('Sending fallback email with markdown attachment...');
      
      const emailSubject = `Hanna AI Weekly Report - ${reportData.metadata.weekStart} (Fallback)`;
      const emailBody = `
Hi Nick,

Your weekly Hanna AI news report is attached as a markdown file.

📋 **Report Details:**
• Week: ${reportData.metadata.weekStart}
• Generated: ${reportData.metadata.generatedDate}
• Research Sources: ${reportData.metadata.totalSources}

Note: Google Docs integration encountered an issue, so the report is provided as a markdown attachment.

Best regards,
Hanna AI News Agent
      `;
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: emailSubject,
        text: emailBody,
        attachments: [{
          filename: `hanna-weekly-report-${reportData.metadata.weekStart.replace(/[^0-9]/g, '-')}.md`,
          content: reportMarkdown,
          contentType: 'text/markdown'
        }]
      };
      
      await this.emailTransporter.sendMail(mailOptions);
      
      logger.info(`Fallback email sent successfully to ${recipientEmail}`);
      
      return {
        success: true,
        recipient: recipientEmail,
        subject: emailSubject,
        method: 'fallback_attachment'
      };
      
    } catch (error) {
      logger.error('Fallback email failed:', error);
      throw error;
    }
  }
}

export default new ReportDeliveryService();