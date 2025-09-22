import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import nodemailer from 'nodemailer';

class EnhancedOAuth2ReportDeliveryService {
  constructor() {
    this.oauth2Client = null;
    this.docs = null;
    this.drive = null;
  }

  async initialize() {
    if (this.oauth2Client) return;

    try {
      // Load tokens from environment variable first, then file
      let tokens;
      if (process.env.GOOGLE_OAUTH_TOKEN) {
        tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKEN);
        logger.info('Enhanced OAuth: Loaded tokens from environment variable');
      } else {
        const tokenData = await fs.readFile('./data/google-oauth-token.json', 'utf8');
        tokens = JSON.parse(tokenData);
        logger.info('Enhanced OAuth: Loaded tokens from file');
      }

      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      this.oauth2Client.setCredentials(tokens);

      this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      logger.info('Enhanced OAuth2 initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize OAuth2: ${error.message}`);
    }
  }

  async createEnhancedGoogleDoc(reportData, title) {
    await this.initialize();

    logger.info('Creating enhanced Google Doc with dynamic content...');

    // Find or create reports folder
    const folderId = await this.findOrCreateReportsFolder();

    // Create the document
    const createResponse = await this.docs.documents.create({
      requestBody: {
        title: `${title} - ${reportData.metadata.weekStart}`
      }
    });

    const documentId = createResponse.data.documentId;
    logger.info(`Created Google Doc: ${documentId}`);

    // Move to reports folder
    await this.drive.files.update({
      fileId: documentId,
      addParents: folderId,
      fields: 'id, parents'
    });

    // Build the document content
    await this.buildEnhancedDocumentContent(documentId, reportData);

    // Share the document
    await this.drive.permissions.create({
      fileId: documentId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const documentUrl = `https://docs.google.com/document/d/${documentId}`;
    logger.info(`Enhanced Google Doc created and shared: ${documentUrl}`);

    return {
      documentId,
      url: documentUrl
    };
  }

  async buildEnhancedDocumentContent(documentId, reportData) {
    const requests = [];
    let index = 1;

    const insertText = (text) => {
      requests.push({
        insertText: {
          location: { index },
          text: text
        }
      });
      index += text.length;
    };

    const makeHeading = (startIndex, endIndex, level) => {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex, endIndex },
          paragraphStyle: { namedStyleType: `HEADING_${level}` },
          fields: 'namedStyleType'
        }
      });
    };

    const makeBold = (startIndex, endIndex) => {
      requests.push({
        updateTextStyle: {
          range: { startIndex, endIndex },
          textStyle: { bold: true },
          fields: 'bold'
        }
      });
    };

    const makeItalic = (startIndex, endIndex) => {
      requests.push({
        updateTextStyle: {
          range: { startIndex, endIndex },
          textStyle: { italic: true },
          fields: 'italic'
        }
      });
    };

    // 1. Main Title
    const titleStart = index;
    insertText(`Hanna's Weekly Career Intelligence Brief — ${reportData.metadata.weekStart}\n\n`);
    makeHeading(titleStart, index - 2, 1);

    // 2. Subtitle
    const subtitleStart = index;
    insertText(`Generated from ${reportData.metadata.totalSources} sources across 5 content pillars using AI-powered research and strategic analysis\n\n`);
    makeItalic(subtitleStart, index - 2);

    // 3. Divider
    insertText('───────────────────────────────────────\n\n');

    // 4. Executive Summary
    const execStart = index;
    insertText('🎯 Executive Summary\n\n');
    makeHeading(execStart, index - 2, 2);

    insertText(`${reportData.executiveSummary}\n\n`);
    insertText('───────────────────────────────────────\n\n');

    // 5. Key Stories & Content Opportunities
    const storiesStart = index;
    insertText('📰 Key Stories & Content Opportunities\n\n');
    makeHeading(storiesStart, index - 2, 2);

    // Dynamic key stories from actual data
    if (reportData.keyStories && Array.isArray(reportData.keyStories)) {
      reportData.keyStories.forEach((story, i) => {
        // Story heading
        const storyStart = index;
        insertText(`${i + 1}. ${story.title}\n\n`);
        makeHeading(storyStart, index - 2, 4);

        // Link + Why it matters
        const linkStart = index;
        insertText('Link + why it matters:\n');
        makeBold(linkStart, index - 1);
        insertText(`${story.whyItMatters}\n`);
        if (story.sources && story.sources.length > 0) {
          const sourcesStart = index;
          insertText(`*Sources: ${story.sources.join(', ')}*\n\n`);
          makeItalic(sourcesStart, index - 2);
        }

        // Content Hooks
        if (story.contentHooks && story.contentHooks.length > 0) {
          const hooksStart = index;
          insertText('Hooks (pivots / advancement / trends):\n');
          makeBold(hooksStart, index - 1);
          story.contentHooks.forEach(hook => {
            insertText(`- "${hook}"\n`);
          });
          insertText('\n');
        }

        // Narrative Flow
        if (story.narrativeFlow) {
          const narrativeStart = index;
          insertText('Narrative flow:\n');
          makeBold(narrativeStart, index - 1);
          insertText(`${story.narrativeFlow}\n\n`);
        }

        // Story Hook
        if (story.storyHook) {
          const storyHookStart = index;
          insertText('***Relatable story hook:***\n');
          makeBold(storyHookStart, index - 1);
          makeItalic(storyHookStart, index - 1);
          insertText(`*"${story.storyHook}"*\n\n`);
        }

        // Community Question
        if (story.communityQuestion) {
          const communityStart = index;
          insertText('***Community question:***\n');
          makeBold(communityStart, index - 1);
          makeItalic(communityStart, index - 1);
          insertText(`*"${story.communityQuestion}"*\n\n`);
        }

        // Macro Analysis (NEW)
        if (story.macroAnalysis) {
          const macroStart = index;
          insertText('**Macro Analysis:**\n');
          makeBold(macroStart, index - 1);
          insertText(`${story.macroAnalysis}\n\n`);
        }

        insertText('───────────────────────────────────────\n\n');
      });
    }

    // 6. Content Hooks & Frameworks (Enhanced with reasoning)
    const hooksStart = index;
    insertText('💡 Content Hooks & Frameworks\n\n');
    makeHeading(hooksStart, index - 2, 2);

    if (reportData.contentHooks) {
      // Challenge Assumptions Hooks
      if (reportData.contentHooks.challengeAssumptions) {
        const challengeStart = index;
        insertText('Challenge Assumptions Hooks (Hanna\'s Signature Style)\n\n');
        makeHeading(challengeStart, index - 2, 3);

        reportData.contentHooks.challengeAssumptions.forEach(hook => {
          insertText(`- "${hook.hook}"\n`);
          if (hook.reasoning) {
            insertText(`  *Reasoning: ${hook.reasoning}*\n`);
          }
        });
        insertText('\n');
      }

      // Data-Backed Claims Hooks
      if (reportData.contentHooks.dataBackedClaims) {
        const dataStart = index;
        insertText('Data-Backed Claims Hooks\n\n');
        makeHeading(dataStart, index - 2, 3);

        reportData.contentHooks.dataBackedClaims.forEach(hook => {
          insertText(`- "${hook.hook}"\n`);
          if (hook.reasoning) {
            insertText(`  *Reasoning: ${hook.reasoning}*\n`);
          }
        });
        insertText('\n');
      }

      // Strategic Insight Hooks
      if (reportData.contentHooks.strategicInsights) {
        const strategicStart = index;
        insertText('Strategic Insight Hooks\n\n');
        makeHeading(strategicStart, index - 2, 3);

        reportData.contentHooks.strategicInsights.forEach(hook => {
          insertText(`- "${hook.hook}"\n`);
          if (hook.reasoning) {
            insertText(`  *Reasoning: ${hook.reasoning}*\n`);
          }
        });
        insertText('\n');
      }
    }

    insertText('───────────────────────────────────────\n\n');

    // 7. Community Engagement Prompts
    const engagementStart = index;
    insertText('🗣️ Community Engagement Prompts\n\n');
    makeHeading(engagementStart, index - 2, 2);

    // General Engagement
    const generalStart = index;
    insertText('General Engagement\n\n');
    makeHeading(generalStart, index - 2, 3);

    const generalPrompts = [
      "What's one career assumption you've completely changed your mind about this year?",
      "Share your biggest salary negotiation win (or lesson learned from a miss)",
      "What skill are you actively developing right now and what's your learning method?",
      "If you could redesign your industry's hiring process, what would you change first?"
    ];

    generalPrompts.forEach(prompt => {
      insertText(`- "${prompt}"\n`);
    });
    insertText('\n');

    insertText('───────────────────────────────────────\n\n');

    // 8. Research Sources (with actual links)
    const sourcesStart = index;
    insertText('📚 Research Sources\n\n');
    makeHeading(sourcesStart, index - 2, 2);

    if (reportData.sources && reportData.sources.length > 0) {
      // Group sources by category
      const sourcesByCategory = {};
      reportData.sources.forEach(source => {
        const category = source.category || 'General Research';
        if (!sourcesByCategory[category]) {
          sourcesByCategory[category] = [];
        }
        sourcesByCategory[category].push(source);
      });

      Object.entries(sourcesByCategory).forEach(([category, sources]) => {
        const categoryStart = index;
        insertText(`${category}\n\n`);
        makeHeading(categoryStart, index - 2, 3);

        sources.forEach(source => {
          if (source.title && source.url) {
            insertText(`- ${source.title}\n`);
            const urlStart = index;
            insertText(`🔗 ${source.url}\n`);
            makeBold(urlStart, index - 1);
            if (source.excerpt) {
              const excerptStart = index;
              insertText(`📄 ${source.excerpt}\n`);
              makeItalic(excerptStart, index - 1);
            }
            insertText('\n');
          }
        });
      });
    }

    insertText('───────────────────────────────────────\n\n');

    // 9. Report Metadata
    const metadataStart = index;
    insertText('📈 Report Metadata\n\n');
    makeHeading(metadataStart, index - 2, 2);

    insertText(`- **Generated:** ${reportData.metadata.generatedDate}\n`);
    insertText(`- **Total Sources:** ${reportData.metadata.totalSources} articles analyzed\n`);
    insertText(`- **Content Pillars:** Career Clarity, Personal Branding, Strategic Growth, Workplace Trends, Work-Life Balance\n`);
    insertText(`- **AI Model:** GPT-4 with Hanna's 2025 strategy integration\n`);
    insertText(`- **Report Type:** Weekly Intelligence with Memory System Integration\n`);
    insertText(`- **Authentication:** OAuth2 (Personal Google Drive)\n\n`);

    insertText('───────────────────────────────────────\n\n');

    // Footer
    const footerStart = index;
    insertText('*This report was generated by Hanna\'s AI Intelligence System using real-time Tavily web research, strategic content analysis, and historical memory integration. All sources are cited for further research and verification. The system automatically tracks covered topics to ensure fresh content each week and builds narrative continuity across reports.*\n');
    makeItalic(footerStart, index - 1);

    // Apply all formatting requests
    if (requests.length > 0) {
      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: { requests }
      });

      logger.info('Enhanced document content added with dynamic formatting');
    }
  }

  async findOrCreateReportsFolder() {
    const response = await this.drive.files.list({
      q: "name='Hanna AI Reports' and mimeType='application/vnd.google-apps.folder'",
      fields: 'files(id, name)'
    });

    if (response.data.files.length > 0) {
      const folderId = response.data.files[0].id;
      logger.info(`Found existing reports folder: ${folderId}`);
      return folderId;
    }

    const createResponse = await this.drive.files.create({
      requestBody: {
        name: 'Hanna AI Reports',
        mimeType: 'application/vnd.google-apps.folder'
      }
    });

    const folderId = createResponse.data.id;
    logger.info(`Created reports folder: ${folderId}`);
    return folderId;
  }

  async deliverEnhancedReport(reportData, documentResult) {
    logger.info('Delivering enhanced report via email...');

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      const keyStoriesCount = Array.isArray(reportData.keyStories) ? reportData.keyStories.length : 0;

      const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
    <h1 style="margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">📊 Hanna's Weekly Intelligence Brief</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">${reportData.metadata.weekStart}</p>
  </div>

  <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #667eea;">
    <h2 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 20px;">📈 This Week's Intelligence</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
      <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 24px; font-weight: 700; color: #667eea; margin-bottom: 5px;">${reportData.metadata.totalSources}</div>
        <div style="font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px;">Sources Analyzed</div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 24px; font-weight: 700; color: #764ba2; margin-bottom: 5px;">${keyStoriesCount}</div>
        <div style="font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px;">Key Stories</div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 24px; font-weight: 700; color: #28a745; margin-bottom: 5px;">✓</div>
        <div style="font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px;">Enhanced Format</div>
      </div>
    </div>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
    <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 22px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">🎯 Executive Summary</h2>
    <p style="margin: 0; color: #495057; font-size: 16px; line-height: 1.6;">${reportData.executiveSummary}</p>
  </div>

  <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
    <h3 style="margin: 0 0 15px 0;">📄 Complete Enhanced Report</h3>
    <p style="margin: 0 0 25px 0; font-size: 16px; opacity: 0.9;">Enhanced with 8-10 detailed key stories, macro analysis, reasoned content hooks, and proper source citations.</p>

    <a href="${documentResult.url}" style="display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 18px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; border: 2px solid rgba(255,255,255,0.3); transition: all 0.3s ease;">
      📊 Open Enhanced Intelligence Report
    </a>

    <p style="margin: 15px 0 0 0; font-size: 12px; opacity: 0.8;">
      Now with detailed analysis, macro trends, and strategic insights!
    </p>
  </div>

  <div style="text-align: center; padding: 20px; border-top: 1px solid #e9ecef; margin-top: 30px;">
    <p style="margin: 0; font-size: 14px; color: #6c757d;">Generated by Hanna AI Intelligence System</p>
    <p style="margin: 5px 0 0 0; font-size: 12px; color: #adb5bd;">Enhanced reporting with memory system and strategic analysis</p>
  </div>
</div>
      `;

      const textBody = `
Hanna AI Enhanced Weekly Report - ${reportData.metadata.weekStart}

📊 This Week's Intelligence:
• ${reportData.metadata.totalSources} sources analyzed with strategic context
• ${keyStoriesCount} detailed key stories with macro analysis
• Enhanced content hooks with reasoning
• Real source citations with links

🎯 Executive Summary:
${reportData.executiveSummary}

📄 Full Enhanced Report: ${documentResult.url}

Key Improvements:
✓ 8-10 detailed key stories (vs. previous 2-3)
✓ Macro analysis connecting to broader trends
✓ Content hooks with strategic reasoning
✓ Proper source citations with real links
✓ Memory system prevents duplication

Best regards,
Hanna AI Intelligence System (Enhanced)
      `;

      const primaryRecipient = process.env.REPORT_TO_EMAIL || 'hanna@hannagetshired.com';
      const ccRecipient = process.env.REPORT_CC_EMAIL || 'nick@stellarstreamai.com';

      const mailOptions = {
        from: `"Hanna AI Intelligence System" <${process.env.EMAIL_USER}>`,
        to: primaryRecipient,
        cc: ccRecipient,
        subject: `📊 Enhanced Weekly Intelligence Brief - ${reportData.metadata.weekStart}`,
        text: textBody,
        html: htmlBody
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Enhanced report emailed successfully to ${primaryRecipient} and ${ccRecipient}`);

      return {
        googleDoc: documentResult,
        emailSent: true,
        emailInfo: info,
        recipients: [primaryRecipient, ccRecipient]
      };

    } catch (error) {
      logger.error('Failed to send enhanced report email:', error);
      return {
        googleDoc: documentResult,
        emailSent: false,
        error: error.message
      };
    }
  }
}

export default new EnhancedOAuth2ReportDeliveryService();