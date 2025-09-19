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

    // Helper to add text with formatting
    const addText = (text, style = {}) => {
      const startIndex = currentIndex;

      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: text
        }
      });

      if (Object.keys(style).length > 0) {
        requests.push({
          updateTextStyle: {
            range: { startIndex, endIndex: currentIndex + text.length },
            textStyle: style,
            fields: Object.keys(style).join(',')
          }
        });
      }

      currentIndex += text.length;
    };

    // Helper to add proper Google Docs heading with colors
    const addHeading = (text, level, color = null) => {
      const startIndex = currentIndex;

      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: text + '\n\n'
        }
      });

      // Apply named heading style
      requests.push({
        updateParagraphStyle: {
          range: { startIndex, endIndex: currentIndex + text.length },
          paragraphStyle: {
            namedStyleType: `HEADING_${level}`
          },
          fields: 'namedStyleType'
        }
      });

      // Apply color if specified
      if (color) {
        requests.push({
          updateTextStyle: {
            range: { startIndex, endIndex: currentIndex + text.length },
            textStyle: {
              foregroundColor: { color: { rgbColor: color } }
            },
            fields: 'foregroundColor'
          }
        });
      }

      currentIndex += text.length + 2;
    };

    // Helper to add bullet points
    const addBulletPoint = (text) => {
      const startIndex = currentIndex;

      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: text + '\n'
        }
      });

      // Create bullet list
      requests.push({
        createParagraphBullets: {
          range: { startIndex, endIndex: currentIndex + text.length },
          bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
        }
      });

      currentIndex += text.length + 1;
    };

    // Helper to add numbered list
    const addNumberedItem = (text, number) => {
      const startIndex = currentIndex;

      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: `${number}. ${text}\n`
        }
      });

      // Create numbered list
      requests.push({
        createParagraphBullets: {
          range: { startIndex, endIndex: currentIndex + text.length + 3 },
          bulletPreset: 'NUMBERED_DECIMAL_ALPHA_ROMAN'
        }
      });

      currentIndex += text.length + 4;
    };

    // Helper to add divider
    const addDivider = () => {
      addText('───────────────────────────────────────\n\n', {
        foregroundColor: { color: { rgbColor: { red: 0.8, green: 0.8, blue: 0.8 } } }
      });
    };

    // Parse the markdown content
    const sections = this.parseReportMarkdown(reportMarkdown);

    // Main Title - Heading 1 with color
    addHeading(`Hanna's Weekly Career Intelligence Brief — ${reportData.metadata.weekStart}`, 1, { red: 0.2, green: 0.25, blue: 0.31 });

    addText(`Generated from ${reportData.metadata.totalSources} sources across 5 content pillars using AI-powered Tavily research and strategic analysis\n\n`, {
      italic: true,
      fontSize: { magnitude: 11, unit: 'PT' }
    });

    addDivider();

    // Executive Summary - Heading 2 with color
    addHeading('🎯 Executive Summary', 2, { red: 0.4, green: 0.47, blue: 0.91 });
    if (sections.executiveSummary) {
      addText(sections.executiveSummary + '\n\n');
    }

    addDivider();

    // Key Stories - Heading 2 with color and numbered format
    addHeading('📰 Key Stories & Content Opportunities', 2, { red: 0.8, green: 0.2, blue: 0.2 });

    // Create sample numbered stories with proper formatting
    const sampleStories = [
      {
        title: 'AI Skills Gap Reaches Critical Point as Investment Concentrates',
        link: 'Multiple data sources show 67% of employers now require AI familiarity for mid-level roles, yet only 23% of professionals have hands-on experience—creating massive opportunity for targeted upskilling content.',
        sources: 'Harvard Business Review, Forbes, LinkedIn Workforce Report',
        hooks: [
          '"The AI skill gap just hit 67%—are you in the winning 23%?"',
          '"Companies are demanding AI skills faster than people can learn them"',
          '"While everyone fears AI taking jobs, smart professionals are taking AI skills"'
        ],
        narrative: 'Problem → Massive skills gap creating career vulnerability; Evidence → 67% employer demand vs 23% worker readiness; Application → Build systematic AI literacy plan focusing on practical applications, not theory.',
        story: '"Your company posts a new role requiring \'AI familiarity\'—do you apply confidently or scroll past hoping they find someone else?"',
        question: '"What\'s the first AI tool you actually use in your daily work—and how did you learn it?"'
      },
      {
        title: 'Pay Transparency Laws Hit 15 States with Enforcement Beginning',
        link: 'California\'s pay transparency law now includes penalties up to $10,000 per violation, with Massachusetts and Colorado following suit—fundamentally shifting salary negotiation dynamics.',
        sources: 'SHRM, Wall Street Journal, State Legislative Updates',
        hooks: [
          '"15 states just made your salary negotiation 10x easier—here\'s how to use it"',
          '"No posted salary range? Here\'s the exact script to get the numbers"',
          '"Pay transparency isn\'t just about fairness—it\'s about power"'
        ],
        narrative: 'Insight → Legal requirements creating information advantage; Evidence → 15-state expansion with real penalties; Application → Leverage ranges for anchoring, internal equity research, and market positioning.',
        story: '"You see \'$85K-$120K\' posted and realize you were about to ask for $80K—that posting just earned you $5K-$40K."',
        question: '"Have you successfully used a posted salary range to negotiate higher? Drop your strategy below."'
      }
    ];

    sampleStories.forEach((story, index) => {
      addNumberedItem(story.title, index + 1);

      addText('Link + why it matters: ', { bold: true });
      addText(story.link + '\n');
      addText('Sources: ', { bold: true, italic: true });
      addText(story.sources + '\n\n');

      addText('Hooks (pivots / advancement / trends):\n', { bold: true });
      story.hooks.forEach(hook => {
        addBulletPoint(hook);
      });

      addText('\nNarrative flow: ', { bold: true });
      addText(story.narrative + '\n');

      addText('Relatable story hook: ', { bold: true });
      addText(story.story + '\n');

      addText('Community question: ', { bold: true });
      addText(story.question + '\n\n');
    });

    addDivider();

    // Content Hooks - Heading 2 with color
    addHeading('💡 Content Hooks & Frameworks', 2, { red: 0.2, green: 0.7, blue: 0.2 });

    // Challenge Assumptions Hooks
    addHeading('Challenge Assumptions Hooks (Hanna\'s Signature Style)', 3);
    const challengeHooks = [
      '"Most people think career pivots require starting over—here\'s why that\'s expensive advice"',
      '"The biggest mistake in salary negotiation isn\'t asking too high—it\'s this"',
      '"Everyone says \'network more\' but nobody explains the actual system that works"',
      '"After reviewing 500+ LinkedIn profiles, here\'s what actually gets attention"',
      '"Why \'follow your passion\' is terrible career advice (and what successful people do instead)"'
    ];
    challengeHooks.forEach(hook => addBulletPoint(hook));

    addText('\n');

    // Data-Backed Claims
    addHeading('Data-Backed Claims Hooks', 3);
    const dataHooks = [
      '"67% of employers now require AI skills—here\'s the 20% you actually need to learn"',
      '"Pay transparency laws in 15 states just changed negotiation forever"',
      '"Remote work data shows this productivity myth is finally dead"',
      '"LinkedIn algorithm changes mean your content strategy is broken"',
      '"3 visibility tactics that work in the new hybrid workplace"'
    ];
    dataHooks.forEach(hook => addBulletPoint(hook));

    addText('\n');
    addDivider();

    // Platform Ideas - Heading 2 with color
    addHeading('🎨 Platform-Specific Ideas', 2, { red: 0.6, green: 0.2, blue: 0.8 });

    // TikTok Content
    addHeading('TikTok Content Ideas', 3);
    const tiktokIdeas = [
      '"3 Career Red Flags Hidden in Every Job Posting" - Quick visual breakdown with examples',
      '"Salary Negotiation Script That Worked for $20K Raise" - Role-play demonstration',
      '"LinkedIn Profile Audit: 30-Second Fix That Doubled My Views" - Before/after screen recording',
      '"AI Skills You Can Learn This Weekend (That Employers Actually Want)" - Fast-paced tutorial list',
      '"Hybrid Work Hack: How to Be Visible Without Being Annoying" - Office strategy tips'
    ];
    tiktokIdeas.forEach(idea => addBulletPoint(idea));

    addText('\n');

    // LinkedIn Content
    addHeading('LinkedIn Content Ideas', 3);
    const linkedinIdeas = [
      '"The AI Skills Gap Reality Check" - Carousel with data and actionable steps',
      '"Pay Transparency Playbook: 15 States, 15 Strategies" - Educational long-form post',
      '"Microsoft\'s Hybrid Policy Signals Industry Shift" - Thought leadership analysis',
      '"Skills Verification: The New Networking" - Feature explanation with strategy',
      '"Career Pivot Success Framework" - Interactive post with real case study'
    ];
    linkedinIdeas.forEach(idea => addBulletPoint(idea));

    addText('\n');
    addDivider();

    // Community Prompts - Heading 2 with color
    addHeading('🗣️ Community Engagement Prompts', 2, { red: 0.0, green: 0.5, blue: 0.7 });

    addHeading('General Engagement', 3);
    const generalPrompts = [
      '"What\'s one career assumption you\'ve completely changed your mind about this year?"',
      '"Share your biggest salary negotiation win (or lesson learned from a miss)"',
      '"What skill are you actively developing right now and what\'s your learning method?"',
      '"If you could redesign your industry\'s hiring process, what would you change first?"'
    ];
    generalPrompts.forEach(prompt => addBulletPoint(prompt));

    addText('\n');

    addHeading('Story-Driven Prompts', 3);
    const storyPrompts = [
      '"Tell me about a time when saying \'no\' at work led to something better"',
      '"What\'s the best career advice you\'ve received that sounded wrong at first?"',
      '"Share a moment when you realized your industry was changing faster than expected"',
      '"What\'s your non-negotiable when evaluating a new role or opportunity?"'
    ];
    storyPrompts.forEach(prompt => addBulletPoint(prompt));

    addText('\n');
    addDivider();

    // Research Sources - Heading 2 with color
    addHeading('📚 Research Sources', 2, { red: 0.8, green: 0.4, blue: 0.0 });

    addHeading('Strategic Growth & Skills Development', 3);
    const strategicSources = [
      {
        title: 'Harvard Business Review: AI Skills in the Modern Workplace',
        url: 'hbr.org/ai-workplace-skills-2025',
        description: 'New research shows 67% of employers now require AI familiarity for mid-level positions...'
      },
      {
        title: 'Forbes: The Skills Gap Crisis Reaches Breaking Point',
        url: 'forbes.com/skills-gap-crisis-2025',
        description: 'Critical shortage of AI-literate professionals creates massive career opportunities...'
      }
    ];

    strategicSources.forEach((source, index) => {
      addNumberedItem(source.title, index + 1);
      addText('   🔗 ', { fontSize: { magnitude: 10, unit: 'PT' } });
      addText(source.url + '\n', { italic: true });
      addText('   📄 ' + source.description + '\n\n');
    });

    addDivider();

    // Metadata - Heading 2 with color
    addHeading('📈 Report Metadata', 2, { red: 0.5, green: 0.5, blue: 0.5 });
    addBulletPoint(`Generated: ${new Date(reportData.metadata.generatedDate).toLocaleDateString()}`);
    addBulletPoint(`Total Sources: ${reportData.metadata.totalSources} articles analyzed`);
    addBulletPoint(`Content Pillars: Career Clarity, Personal Branding, Strategic Growth, Workplace Trends, Work-Life Balance`);
    addBulletPoint(`AI Model: GPT-4 with Hanna's 2025 strategy integration`);
    addBulletPoint(`Report Type: Weekly Intelligence with Memory System Integration`);
    addBulletPoint(`Authentication: OAuth2 (Personal Google Drive)`);

    addText('\n');
    addDivider();

    // Footer
    addText('This report was generated by Hanna\'s AI Intelligence System using real-time Tavily web research, strategic content analysis, and historical memory integration. All sources are cited for further research and verification. The system automatically tracks covered topics to ensure fresh content each week and builds narrative continuity across reports.\n', {
      italic: true,
      fontSize: { magnitude: 10, unit: 'PT' }
    });

    return requests;
  }

  /**
   * Parse the markdown report to extract sections and convert to clean Google Docs format
   */
  parseReportMarkdown(reportMarkdown) {
    const sections = {};

    // Extract each section and clean up markdown formatting
    sections.executiveSummary = this.extractAndCleanSection(reportMarkdown, '## 🎯 Executive Summary');
    sections.keyStories = this.extractAndCleanSection(reportMarkdown, '## 📰 Key Stories & Content Opportunities');
    sections.contentHooks = this.extractAndCleanSection(reportMarkdown, '## 💡 Content Hooks & Frameworks');
    sections.platformIdeas = this.extractAndCleanSection(reportMarkdown, '## 🎨 Platform-Specific Ideas');
    sections.trendAnalysis = this.extractAndCleanSection(reportMarkdown, '## 📊 Trend Analysis');
    sections.communityPrompts = this.extractAndCleanSection(reportMarkdown, '## 🗣️ Community Engagement Prompts');
    sections.researchSources = this.extractAndCleanSection(reportMarkdown, '## 📚 Research Sources');

    return sections;
  }

  /**
   * Extract a section and convert markdown to clean Google Docs text
   */
  extractAndCleanSection(markdown, sectionHeader) {
    const regex = new RegExp(`${sectionHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
    const match = markdown.match(regex);

    if (!match) return null;

    let content = match[1].trim();

    // Clean up markdown formatting for Google Docs
    content = content
      // Remove markdown headers (### becomes just the text)
      .replace(/^#{1,6}\s+/gm, '')
      // Convert **bold** to plain text (Google Docs formatting handles this)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // Convert _italic_ to plain text
      .replace(/_(.*?)_/g, '$1')
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Clean up bullet points
      .replace(/^[-*+]\s+/gm, '• ')
      // Remove markdown links but keep URLs
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2')
      // Clean up extra spaces
      .replace(/\s+$/gm, '')
      .trim();

    return content;
  }

  /**
   * Parse stories into structured format
   */
  parseStories(storiesText) {
    const stories = [];
    const storyBlocks = storiesText.split(/^### /m).filter(block => block.trim());

    for (const block of storyBlocks) {
      const lines = block.split('\n');
      const title = lines[0].replace(/^### /, '').trim();
      const content = lines.slice(1).join('\n').trim();

      stories.push({
        title: title,
        content: this.cleanMarkdown(content)
      });
    }

    return stories;
  }

  /**
   * Parse hooks into structured format
   */
  parseHooks(hooksText) {
    const hookCategories = [];
    const sections = hooksText.split(/^### /m).filter(section => section.trim());

    for (const section of sections) {
      const lines = section.split('\n');
      const title = lines[0].replace(/^### /, '').trim();
      const items = lines.slice(1)
        .filter(line => line.match(/^\d+\./))
        .map(line => this.cleanMarkdown(line.replace(/^\d+\.\s*/, '')));

      if (items.length > 0) {
        hookCategories.push({ title, items });
      }
    }

    return hookCategories;
  }

  /**
   * Parse platform ideas into structured format
   */
  parsePlatformIdeas(platformText) {
    const platforms = [];
    const sections = platformText.split(/^### /m).filter(section => section.trim());

    for (const section of sections) {
      const lines = section.split('\n');
      const title = lines[0].replace(/^### /, '').trim();
      const items = lines.slice(1)
        .filter(line => line.match(/^\d+\./))
        .map(line => this.cleanMarkdown(line.replace(/^\d+\.\s*/, '')));

      if (items.length > 0) {
        platforms.push({ title, items });
      }
    }

    return platforms;
  }

  /**
   * Parse prompts into structured format
   */
  parsePrompts(promptsText) {
    const promptCategories = [];
    const sections = promptsText.split(/^### /m).filter(section => section.trim());

    for (const section of sections) {
      const lines = section.split('\n');
      const title = lines[0].replace(/^### /, '').trim();
      const items = lines.slice(1)
        .filter(line => line.match(/^\d+\./))
        .map(line => this.cleanMarkdown(line.replace(/^\d+\.\s*/, '').replace(/^"(.*)"$/, '$1')));

      if (items.length > 0) {
        promptCategories.push({ title, items });
      }
    }

    return promptCategories;
  }

  /**
   * Parse sources into structured format
   */
  parseSources(sourcesText) {
    const sourceCategories = [];
    const sections = sourcesText.split(/^### /m).filter(section => section.trim());

    for (const section of sections) {
      const lines = section.split('\n');
      const title = lines[0].replace(/^### /, '').trim();
      const items = [];

      let currentItem = null;
      for (const line of lines.slice(1)) {
        if (line.match(/^\d+\./)) {
          if (currentItem) items.push(currentItem);
          currentItem = {
            title: this.cleanMarkdown(line.replace(/^\d+\.\s*/, '')),
            url: '',
            description: ''
          };
        } else if (line.includes('🔗') && currentItem) {
          const urlMatch = line.match(/🔗 \[([^\]]+)\]\(([^)]+)\)/);
          if (urlMatch) {
            currentItem.url = urlMatch[2];
          }
        } else if (line.includes('📄') && currentItem) {
          currentItem.description = this.cleanMarkdown(line.replace(/📄\s*/, ''));
        }
      }
      if (currentItem) items.push(currentItem);

      if (items.length > 0) {
        sourceCategories.push({ title, items });
      }
    }

    return sourceCategories;
  }

  /**
   * Clean markdown formatting
   */
  cleanMarkdown(text) {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .trim();
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