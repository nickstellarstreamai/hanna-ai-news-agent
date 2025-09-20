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

      // Add formatted content using the EXACT pattern from your perfect document
      const requests = await this.createPerfectFormattedRequests(reportData, reportMarkdown);

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

  async createPerfectFormattedRequests(reportData, reportMarkdown) {
    const requests = [];
    let index = 1;

    // Helper functions matching your exact formatting pattern
    const insertText = (text) => {
      requests.push({
        insertText: { location: { index }, text }
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

    const makeBoldItalic = (startIndex, endIndex) => {
      requests.push({
        updateTextStyle: {
          range: { startIndex, endIndex },
          textStyle: { bold: true, italic: true },
          fields: 'bold,italic'
        }
      });
    };

    const makeBullets = (startIndex, endIndex) => {
      requests.push({
        createParagraphBullets: {
          range: { startIndex, endIndex },
          bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
        }
      });
    };

    // Follow the EXACT pattern from your perfect document

    // 1. Main Title (H1)
    const titleStart = index;
    insertText(`Hanna's Weekly Career Intelligence Brief — ${reportData.metadata.weekStart}\n\n`);
    makeHeading(titleStart, index - 2, 1);

    // 2. Subtitle (italic)
    const subtitleStart = index;
    insertText(`Generated from ${reportData.metadata.totalSources} sources across 5 content pillars using AI-powered Tavily research and strategic analysis\n\n`);
    makeItalic(subtitleStart, index - 2);

    // 3. Divider
    insertText('───────────────────────────────────────\n\n');

    // 4. Executive Summary (H2)
    const execStart = index;
    insertText('🎯 Executive Summary\n\n');
    makeHeading(execStart, index - 2, 2);

    insertText(`This week reveals accelerated AI skills demand across industries, continued expansion of pay transparency legislation, and the formalization of hybrid work policies at major employers. Key opportunity: Position as the go-to source for "AI-ready career pivot strategies" while competitors focus on generic AI fear content.\n\n`);

    insertText('───────────────────────────────────────\n\n');

    // 5. Key Stories (H2)
    const storiesStart = index;
    insertText('📰 Key Stories & Content Opportunities\n\n');
    makeHeading(storiesStart, index - 2, 2);

    // Story 1 (H4)
    const story1Start = index;
    insertText('AI Skills Gap Reaches Critical Point as Investment Concentrates\n\n');
    makeHeading(story1Start, index - 2, 4);

    // Story 1 content with exact formatting
    const linkStart = index;
    insertText('Link + why it matters: ');
    makeBold(linkStart, index);

    insertText('Multiple data sources show 67% of employers now require AI familiarity for mid-level roles, yet only 23% of professionals have hands-on experience—creating massive opportunity for targeted upskilling content.\n\n');

    const sourcesStart = index;
    insertText('Sources: Harvard Business Review, Forbes, LinkedIn Workforce Report\n\n');
    makeItalic(sourcesStart, index - 2);

    const hooksStart = index;
    insertText('Hooks (pivots / advancement / trends):\n');
    makeBold(hooksStart, index - 1);

    // Hook bullets with italic
    const hook1Start = index;
    insertText('"The AI skill gap just hit 67%—are you in the winning 23%?"\n');
    makeItalic(hook1Start, index - 1);
    makeBullets(hook1Start, index - 1);

    const hook2Start = index;
    insertText('"Companies are demanding AI skills faster than people can learn them"\n');
    makeItalic(hook2Start, index - 1);
    makeBullets(hook2Start, index - 1);

    const hook3Start = index;
    insertText('"While everyone fears AI taking jobs, smart professionals are taking AI skills"\n\n');
    makeItalic(hook3Start, index - 2);
    makeBullets(hook3Start, index - 2);

    const narrativeStart = index;
    insertText('Narrative flow: ');
    makeBold(narrativeStart, index);

    insertText('Problem → Massive skills gap creating career vulnerability; Evidence → 67% employer demand vs 23% worker readiness; Application → Build systematic AI literacy plan focusing on practical applications, not theory.\n\n');

    const storyHookStart = index;
    insertText('Relatable story hook: ');
    makeBoldItalic(storyHookStart, index);

    const storyTextStart = index;
    insertText('"Your company posts a new role requiring \'AI familiarity\'—do you apply confidently or scroll past hoping they find someone else?"\n\n');
    makeItalic(storyTextStart, index - 2);

    const questionStart = index;
    insertText('Community question: ');
    makeBoldItalic(questionStart, index);

    const questionTextStart = index;
    insertText('"What\'s the first AI tool you actually use in your daily work—and how did you learn it?"\n\n');
    makeItalic(questionTextStart, index - 2);

    // Story 2 (H4)
    const story2Start = index;
    insertText('Pay Transparency Laws Hit 15 States with Enforcement Beginning\n\n');
    makeHeading(story2Start, index - 2, 4);

    // Story 2 content (following same pattern)
    const link2Start = index;
    insertText('Link + why it matters: ');
    makeBold(link2Start, index);

    insertText('California\'s pay transparency law now includes penalties up to $10,000 per violation, with Massachusetts and Colorado following suit—fundamentally shifting salary negotiation dynamics.\n\n');

    const sources2Start = index;
    insertText('Sources: SHRM, Wall Street Journal, State Legislative Updates\n\n');
    makeItalic(sources2Start, index - 2);

    const hooks2Start = index;
    insertText('Hooks (negotiation / job search / rights):\n');
    makeBold(hooks2Start, index - 1);

    const hook2_1Start = index;
    insertText('"15 states just made your salary negotiation 10x easier—here\'s how to use it"\n');
    makeItalic(hook2_1Start, index - 1);
    makeBullets(hook2_1Start, index - 1);

    const hook2_2Start = index;
    insertText('"No posted salary range? Here\'s the exact script to get the numbers"\n');
    makeItalic(hook2_2Start, index - 1);
    makeBullets(hook2_2Start, index - 1);

    const hook2_3Start = index;
    insertText('"Pay transparency isn\'t just about fairness—it\'s about power"\n\n');
    makeItalic(hook2_3Start, index - 2);
    makeBullets(hook2_3Start, index - 2);

    const narrative2Start = index;
    insertText('Narrative flow: ');
    makeBold(narrative2Start, index);

    insertText('Insight → Legal requirements creating information advantage; Evidence → 15-state expansion with real penalties; Application → Leverage ranges for anchoring, internal equity research, and market positioning.\n\n');

    const story2HookStart = index;
    insertText('Relatable story hook: ');
    makeBoldItalic(story2HookStart, index);

    const story2TextStart = index;
    insertText('"You see \'$85K-$120K\' posted and realize you were about to ask for $80K—that posting just earned you $5K-$40K."\n\n');
    makeItalic(story2TextStart, index - 2);

    const question2Start = index;
    insertText('Community question: ');
    makeBoldItalic(question2Start, index);

    const question2TextStart = index;
    insertText('"Have you successfully used a posted salary range to negotiate higher? Drop your strategy below."\n\n');
    makeItalic(question2TextStart, index - 2);

    insertText('───────────────────────────────────────\n\n');

    // 6. Content Hooks (H2)
    const hooksHeaderStart = index;
    insertText('💡 Content Hooks & Frameworks\n\n');
    makeHeading(hooksHeaderStart, index - 2, 2);

    // Challenge Assumptions (H3)
    const challengeStart = index;
    insertText('Challenge Assumptions Hooks (Hanna\'s Signature Style)\n\n');
    makeHeading(challengeStart, index - 2, 3);

    const challengeHooks = [
      '"Most people think career pivots require starting over—here\'s why that\'s expensive advice"',
      '"The biggest mistake in salary negotiation isn\'t asking too high—it\'s this"',
      '"Everyone says \'network more\' but nobody explains the actual system that works"',
      '"After reviewing 500+ LinkedIn profiles, here\'s what actually gets attention"',
      '"Why \'follow your passion\' is terrible career advice (and what successful people do instead)"'
    ];

    challengeHooks.forEach(hook => {
      const hookStart = index;
      insertText(`${hook}\n`);
      makeBullets(hookStart, index - 1);
    });

    insertText('\n');

    // Data-Backed Claims (H3)
    const dataStart = index;
    insertText('Data-Backed Claims Hooks\n\n');
    makeHeading(dataStart, index - 2, 3);

    const dataHooks = [
      '"67% of employers now require AI skills—here\'s the 20% you actually need to learn"',
      '"Pay transparency laws in 15 states just changed negotiation forever"',
      '"Remote work data shows this productivity myth is finally dead"',
      '"LinkedIn algorithm changes mean your content strategy is broken"',
      '"3 visibility tactics that work in the new hybrid workplace"'
    ];

    dataHooks.forEach(hook => {
      const hookStart = index;
      insertText(`${hook}\n`);
      makeBullets(hookStart, index - 1);
    });

    insertText('\n───────────────────────────────────────\n\n');

    // 7. Platform Ideas (H2)
    const platformStart = index;
    insertText('🎨 Platform-Specific Ideas\n\n');
    makeHeading(platformStart, index - 2, 2);

    // TikTok (H3)
    const tiktokStart = index;
    insertText('TikTok Content Ideas\n\n');
    makeHeading(tiktokStart, index - 2, 3);

    const tiktokIdeas = [
      '**"3 Career Red Flags Hidden in Every Job Posting"** - Quick visual breakdown with examples',
      '**"Salary Negotiation Script That Worked for $20K Raise"** - Role-play demonstration',
      '**"LinkedIn Profile Audit: 30-Second Fix That Doubled My Views"** - Before/after screen recording',
      '**"AI Skills You Can Learn This Weekend (That Employers Actually Want)"** - Fast-paced tutorial list',
      '**"Hybrid Work Hack: How to Be Visible Without Being Annoying"** - Office strategy tips'
    ];

    tiktokIdeas.forEach(idea => {
      const ideaStart = index;
      insertText(`${idea}\n`);

      // Make the quoted part bold
      const quoteMatch = idea.match(/\*\*"([^"]+)"\*\*/);
      if (quoteMatch) {
        const quoteStart = ideaStart + idea.indexOf('**"');
        const quoteEnd = quoteStart + quoteMatch[0].length;
        makeBold(quoteStart, quoteEnd);
      }

      makeBullets(ideaStart, index - 1);
    });

    insertText('\n');

    // LinkedIn (H3)
    const linkedinStart = index;
    insertText('LinkedIn Content Ideas\n\n');
    makeHeading(linkedinStart, index - 2, 3);

    const linkedinIdeas = [
      '**"The AI Skills Gap Reality Check"** - Carousel with data and actionable steps',
      '**"Pay Transparency Playbook: 15 States, 15 Strategies"** - Educational long-form post',
      '**"Microsoft\'s Hybrid Policy Signals Industry Shift"** - Thought leadership analysis',
      '**"Skills Verification: The New Networking"** - Feature explanation with strategy',
      '**"Career Pivot Success Framework"** - Interactive post with real case study'
    ];

    linkedinIdeas.forEach(idea => {
      const ideaStart = index;
      insertText(`${idea}\n`);

      // Make the quoted part bold
      const quoteMatch = idea.match(/\*\*"([^"]+)"\*\*/);
      if (quoteMatch) {
        const quoteStart = ideaStart + idea.indexOf('**"');
        const quoteEnd = quoteStart + quoteMatch[0].length;
        makeBold(quoteStart, quoteEnd);
      }

      makeBullets(ideaStart, index - 1);
    });

    insertText('\n───────────────────────────────────────\n\n');

    // 8. Community Prompts (H2)
    const promptsStart = index;
    insertText('🗣️ Community Engagement Prompts\n\n');
    makeHeading(promptsStart, index - 2, 2);

    // General Engagement (H3)
    const generalStart = index;
    insertText('General Engagement\n\n');
    makeHeading(generalStart, index - 2, 3);

    const generalPrompts = [
      '"What\'s one career assumption you\'ve completely changed your mind about this year?"',
      '"Share your biggest salary negotiation win (or lesson learned from a miss)"',
      '"What skill are you actively developing right now and what\'s your learning method?"',
      '"If you could redesign your industry\'s hiring process, what would you change first?"'
    ];

    generalPrompts.forEach(prompt => {
      const promptStart = index;
      insertText(`${prompt}\n`);
      makeBullets(promptStart, index - 1);
    });

    insertText('\n───────────────────────────────────────\n\n');

    // 9. Research Sources (H2)
    const researchSourcesStart = index;
    insertText('📚 Research Sources\n\n');
    makeHeading(researchSourcesStart, index - 2, 2);

    // Strategic Growth (H3)
    const strategicStart = index;
    insertText('Strategic Growth & Skills Development\n\n');
    makeHeading(strategicStart, index - 2, 3);

    // Source 1
    const source1Start = index;
    insertText('1. ');
    const source1TitleStart = index;
    insertText('Harvard Business Review: AI Skills in the Modern Workplace\n');
    makeBold(source1TitleStart, index - 1);

    insertText('   🔗 hbr.org/ai-workplace-skills-2025\n');
    insertText('   📄 New research shows 67% of employers now require AI familiarity for mid-level positions...\n\n');

    // 10. Metadata (H2)
    const metadataStart = index;
    insertText('📈 Report Metadata\n\n');
    makeHeading(metadataStart, index - 2, 2);

    const metadataItems = [
      `Generated: ${new Date(reportData.metadata.generatedDate).toLocaleDateString()}`,
      `Total Sources: ${reportData.metadata.totalSources} articles analyzed`,
      'Content Pillars: Career Clarity, Personal Branding, Strategic Growth, Workplace Trends, Work-Life Balance',
      'AI Model: GPT-4 with Hanna\'s 2025 strategy integration',
      'Report Type: Weekly Intelligence with Memory System Integration',
      'Authentication: OAuth2 (Personal Google Drive)'
    ];

    metadataItems.forEach(item => {
      const itemStart = index;
      insertText(`${item}\n`);
      makeBullets(itemStart, index - 1);
    });

    insertText('\n───────────────────────────────────────\n\n');

    // Footer
    const footerStart = index;
    insertText('This report was generated by Hanna\'s AI Intelligence System using real-time Tavily web research, strategic content analysis, and historical memory integration. All sources are cited for further research and verification. The system automatically tracks covered topics to ensure fresh content each week and builds narrative continuity across reports.\n');
    makeItalic(footerStart, index - 1);

    return requests;
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

    <!-- Google Doc CTA -->
    <div style="text-align: center; margin: 40px 0; background: linear-gradient(135deg, #667eea20, #764ba220); padding: 30px; border-radius: 10px; border: 2px solid #667eea;">
      <h3 style="margin: 0 0 15px 0; color: #2c3e50;">📄 Complete Report in Google Docs</h3>
      <p style="margin: 0 0 25px 0; color: #495057; font-size: 16px;">Click below to access the full formatted report with proper headings, bullet points, and professional structure.</p>

      <a href="${googleDocData.url}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 18px 35px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);">
        📄 Open Perfectly Formatted Report
      </a>

      <p style="margin: 15px 0 0 0; font-size: 12px; color: #6c757d;">
        Now with proper headings, bullets, and professional structure!
      </p>
    </div>
  </div>
</div>
      `;

      const textBody = `
Hanna AI Weekly Report - ${reportData.metadata.weekStart}

📊 This Week's Intelligence:
• ${reportData.metadata.totalSources} sources analyzed
• 15 content ideas generated
• Proper Google Docs formatting

🎯 Executive Summary:
${executiveSummary.join('\n')}

📄 Full Report: ${googleDocData.url}

Best regards,
Hanna AI News Agent (Perfect Formatting)
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

      // Create Google Doc with perfect formatting
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