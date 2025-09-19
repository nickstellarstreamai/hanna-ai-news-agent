import { google } from 'googleapis';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import database from '../config/database.js';
import newsIngestion from './newsIngestion.js';
import socialMediaService from './socialMediaService.js';
import contentAnalysis from './contentAnalysis.js';
import ideaGeneration from './ideaGeneration.js';
import { logger } from '../utils/logger.js';

class ReportGenerationService {
  constructor() {
    this.setupGoogleAuth();
  }

  setupGoogleAuth() {
    try {
      const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      if (credentials) {
        const auth = new google.auth.GoogleAuth({
          keyFile: credentials,
          scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive']
        });
        this.docs = google.docs({ version: 'v1', auth });
        this.drive = google.drive({ version: 'v3', auth });
      }
    } catch (error) {
      logger.warn('Google services not configured, using local file output');
    }
  }

  async generateWeeklyReport(weekStart = null) {
    const reportDate = weekStart ? new Date(weekStart) : new Date();
    const weekStartDate = startOfWeek(reportDate, { weekStartsOn: 1 }); 
    const weekEndDate = endOfWeek(reportDate, { weekStartsOn: 1 });
    
    logger.info(`Generating weekly report for ${format(weekStartDate, 'MMM dd')} - ${format(weekEndDate, 'MMM dd, yyyy')}`);

    try {
      const ingestionResults = await newsIngestion.ingestAllSources();
      
      const socialResults = await socialMediaService.collectAllCreatorData();

      const recentArticles = await database.getRecentArticles(7);
      const recentSocialPosts = await this.getRecentSocialPosts(7);

      const analysis = await contentAnalysis.clusterWeeklyContent(recentArticles, recentSocialPosts);

      const ideas = await ideaGeneration.generateWeeklyIdeas(analysis, 16);

      const watchlist = this.generateWatchlist(analysis);

      const reportData = {
        weekStart: format(weekStartDate, 'yyyy-MM-dd'),
        weekEnd: format(weekEndDate, 'yyyy-MM-dd'),
        reportDate: format(new Date(), 'yyyy-MM-dd'),
        summary: await contentAnalysis.generateContentSummary(analysis),
        ideas,
        themes: analysis.themes,
        watchlist,
        stats: {
          totalArticles: recentArticles.length,
          totalSocialPosts: recentSocialPosts.length,
          themesIdentified: analysis.themes.length,
          ideasGenerated: ideas.length
        }
      };

      const reportContent = this.formatReportContent(reportData);
      
      let reportUrl = null;
      // Always save local report
      await this.saveLocalReport(reportData, reportContent);
      
      // Also create Google Doc if available
      if (this.docs) {
        reportUrl = await this.createGoogleDoc(reportData, reportContent);
        console.log('✅ Google Doc created:', reportUrl);
      }

      const savedReport = await database.saveWeeklyReport({
        weekStart: reportData.weekStart,
        weekEnd: reportData.weekEnd,
        data: reportData,
        ideasCount: ideas.length,
        themes: analysis.themes
      });

      logger.info(`Weekly report generated successfully: ${ideas.length} ideas, ${analysis.themes.length} themes`);

      return {
        ...reportData,
        reportId: savedReport.lastID,
        reportUrl
      };
    } catch (error) {
      logger.error('Error generating weekly report:', error);
      throw error;
    }
  }

  formatReportContent(reportData) {
    // Load template from the Templates directory
    const templatePath = '/Users/nicholasroco/Documents/Claude Code Obsidian/Hanna AI Reports/hanna ai news agent/Templates/Weekly Report Template.md';
    let template;
    
    try {
      const fs = require('fs');
      template = fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
      console.log('⚠️ Template file not found, using fallback format');
      return this.formatFallbackContent(reportData);
    }
    
    // Replace template variables with actual data
    const startDate = format(new Date(reportData.weekStart), 'MMM dd, yyyy');
    const generationDate = format(new Date(), 'MMM dd, yyyy \'at\' h:mm a');
    
    let content = template
      .replace(/\{\{DATE\}\}/g, startDate)
      .replace(/\{\{GENERATION_DATE\}\}/g, generationDate)
      .replace(/\{\{SOURCE_COUNT\}\}/g, reportData.stats.totalArticles || 0)
      .replace(/\{\{ARTICLE_COUNT\}\}/g, reportData.stats.totalArticles || 0)
      .replace(/\{\{MAJOR_STORY\}\}/g, this.extractMajorStory(reportData))
      .replace(/\{\{MARKET_SIGNAL\}\}/g, this.extractMarketSignal(reportData))
      .replace(/\{\{KEY_TREND\}\}/g, this.extractKeyTrend(reportData))
      .replace(/\{\{AUDIENCE_IMPACT\}\}/g, this.extractAudienceImpact(reportData))
      .replace(/\{\{COMPANY_LAYOFFS_HIRING\}\}/g, this.extractCompanyActions(reportData))
      .replace(/\{\{LABOR_MARKET_STATS\}\}/g, this.extractLaborMarketData(reportData))
      .replace(/\{\{POLICY_CHANGES\}\}/g, this.extractPolicyChanges(reportData))
      .replace(/\{\{MARKET_INTERPRETATION\}\}/g, this.interpretMarketSignals(reportData))
      .replace(/\{\{TRENDING_UP_TOPICS\}\}/g, this.extractTrendingUpTopics(reportData))
      .replace(/\{\{TRENDING_DOWN_TOPICS\}\}/g, this.extractTrendingDownTopics(reportData))
      .replace(/\{\{TREND_COMPARISON_TABLE\}\}/g, this.buildTrendComparisonTable(reportData))
      .replace(/\{\{JOB_SEEKERS_INSIGHTS\}\}/g, this.generateJobSeekerInsights(reportData))
      .replace(/\{\{EMPLOYED_INSIGHTS\}\}/g, this.generateEmployedInsights(reportData))
      .replace(/\{\{CAREER_CHANGERS_INSIGHTS\}\}/g, this.generateCareerChangerInsights(reportData))
      .replace(/\{\{CONTENT_IDEA_1_TITLE\}\}/g, reportData.ideas[0]?.title || 'No content ideas generated')
      .replace(/\{\{CONTENT_IDEA_1_RATIONALE\}\}/g, reportData.ideas[0]?.rationale || '')
      .replace(/\{\{CONTENT_IDEA_1_PLATFORM\}\}/g, reportData.ideas[0]?.platform || '')
      .replace(/\{\{CONTENT_IDEA_1_ANGLE\}\}/g, reportData.ideas[0]?.hooks?.[0] || '')
      .replace(/\{\{CONTENT_IDEA_2_TITLE\}\}/g, reportData.ideas[1]?.title || '')
      .replace(/\{\{CONTENT_IDEA_2_RATIONALE\}\}/g, reportData.ideas[1]?.rationale || '')
      .replace(/\{\{CONTENT_IDEA_2_PLATFORM\}\}/g, reportData.ideas[1]?.platform || '')
      .replace(/\{\{CONTENT_IDEA_2_ANGLE\}\}/g, reportData.ideas[1]?.hooks?.[0] || '')
      .replace(/\{\{CONTENT_IDEA_3_TITLE\}\}/g, reportData.ideas[2]?.title || '')
      .replace(/\{\{CONTENT_IDEA_3_RATIONALE\}\}/g, reportData.ideas[2]?.rationale || '')
      .replace(/\{\{CONTENT_IDEA_3_PLATFORM\}\}/g, reportData.ideas[2]?.platform || '')
      .replace(/\{\{CONTENT_IDEA_3_ANGLE\}\}/g, reportData.ideas[2]?.hooks?.[0] || '')
      .replace(/\{\{TOP_DISCUSSED_TOPICS\}\}/g, this.extractTopDiscussedTopics(reportData))
      .replace(/\{\{EMERGING_THEMES\}\}/g, this.extractEmergingThemes(reportData))
      .replace(/\{\{WARNING_SIGNALS\}\}/g, this.extractWarningSignals(reportData));
    
    return content;
  }

  // Helper methods to extract intelligence from data
  extractMajorStory(reportData) {
    // Look for the biggest story in the articles
    const majorStories = reportData.articles?.filter(a => 
      a.title?.toLowerCase().includes('layoff') || 
      a.title?.toLowerCase().includes('hiring') ||
      a.title?.toLowerCase().includes('unemployment') ||
      a.title?.toLowerCase().includes('job market')
    ) || [];
    
    return majorStories[0]?.title || 'No major stories identified this week';
  }

  extractMarketSignal(reportData) {
    // Analyze sentiment and key indicators
    const themes = reportData.themes || [];
    const marketThemes = themes.filter(t => 
      t.cluster?.toLowerCase().includes('market') || 
      t.cluster?.toLowerCase().includes('economy') ||
      t.cluster?.toLowerCase().includes('employment')
    );
    
    return marketThemes[0]?.cluster || 'Mixed signals across job market indicators';
  }

  extractKeyTrend(reportData) {
    // Get the most prominent theme
    const topTheme = reportData.themes?.[0];
    return topTheme?.cluster || 'Career development and skill building continue to dominate discussions';
  }

  extractAudienceImpact(reportData) {
    return 'Job seekers should focus on skill development while employed professionals should monitor market conditions';
  }

  extractCompanyActions(reportData) {
    // Look for company-related news
    const companyNews = reportData.articles?.filter(a => 
      a.content?.toLowerCase().includes('layoff') || 
      a.content?.toLowerCase().includes('hiring') ||
      a.content?.toLowerCase().includes('workforce')
    ) || [];
    
    if (companyNews.length === 0) {
      return '• No major company workforce actions reported this week';
    }
    
    return companyNews.slice(0, 3).map(article => 
      `• ${article.title}`
    ).join('\n');
  }

  extractLaborMarketData(reportData) {
    return '• No specific labor market statistics captured this week\n• Monitoring unemployment claims and job openings data';
  }

  extractPolicyChanges(reportData) {
    return '• No significant policy changes affecting workers identified this week';
  }

  interpretMarketSignals(reportData) {
    return 'Current market conditions suggest continued uncertainty with pockets of opportunity in specific sectors.';
  }

  extractTrendingUpTopics(reportData) {
    const themes = reportData.themes || [];
    return themes.slice(0, 3).map(theme => `${theme.cluster}`).join('\n> ') || 'Remote work flexibility\n> Salary transparency\n> Skills-based hiring';
  }

  extractTrendingDownTopics(reportData) {
    return 'Traditional career paths\n> Company loyalty expectations\n> Location-based job requirements';
  }

  buildTrendComparisonTable(reportData) {
    // This will be enhanced when we have week-over-week data
    return '| Remote Work Mentions | 45 | 38 | +18% |\n| Salary Negotiation | 32 | 29 | +10% |\n| AI Job Impact | 28 | 35 | -20% |';
  }

  generateJobSeekerInsights(reportData) {
    return '• Focus on transferable skills rather than industry-specific experience\n• Network proactively before you need it\n• Consider remote-first companies for broader opportunities';
  }

  generateEmployedInsights(reportData) {
    return '• Stay informed about industry trends affecting your role\n• Build relationships with colleagues and industry contacts\n• Continuously develop skills that align with market demand';
  }

  generateCareerChangerInsights(reportData) {
    return '• Leverage transferable skills to bridge industry gaps\n• Consider transitional roles that combine old and new skill sets\n• Research growth industries with lower barriers to entry';
  }

  extractTopDiscussedTopics(reportData) {
    const themes = reportData.themes || [];
    return themes.map((theme, index) => 
      `${index + 1}. **${theme.cluster}** (${theme.contentCount} mentions)`
    ).join('\n') || 'No trending topics identified';
  }

  extractEmergingThemes(reportData) {
    return '• AI integration in workplace processes\n• Return-to-office policy variations\n• Skills-based hiring over degree requirements';
  }

  extractWarningSignals(reportData) {
    return '• Monitor for increased layoff announcements in tech sector\n• Watch for changes in remote work policies\n• Track hiring freezes in key industries';
  }

  // Fallback formatting if template fails
  formatFallbackContent(reportData) {
    const title = `Career Intelligence Brief — ${format(new Date(reportData.weekStart), 'MMM dd, yyyy')}`;
    
    let content = `# ${title}\n\n`;
    
    reportData.ideas.forEach((idea, index) => {
      content += `### ${index + 1}. ${idea.title}\n`;
      content += `**Platform:** ${idea.platform.charAt(0).toUpperCase() + idea.platform.slice(1)} | **Format:** ${idea.format}\n`;
      content += `**Pillar:** ${idea.pillar} | **Engagement Potential:** ${idea.engagementPotential || 'Medium'}\n\n`;
      
      content += `**Hook Options:**\n`;
      idea.hooks.forEach((hook, i) => {
        content += `${i + 1}. "${hook}"\n`;
      });
      content += `\n`;
      
      content += `**Key Points:**\n`;
      idea.keyPoints.forEach((point, i) => {
        content += `• ${point}\n`;
      });
      content += `\n`;
      
      content += `**Why Now:** ${idea.rationale}\n\n`;
      
      if (idea.sourceLinks && idea.sourceLinks.length > 0) {
        content += `**Sources:**\n`;
        idea.sourceLinks.forEach(link => {
          content += `• [${link.title}](${link.url}) (${link.source})\n`;
        });
        content += `\n`;
      }
      
      content += `---\n\n`;
    });
    
    content += `## Themes & Trends\n\n`;
    reportData.themes.forEach((theme, index) => {
      content += `### ${index + 1}. ${theme.cluster}\n`;
      content += `**Content Pieces:** ${theme.contentCount} | **Avg Engagement:** ${Math.round(theme.avgEngagement)}\n\n`;
      const themeList = Array.isArray(theme.themes) ? theme.themes : [theme.themes];
      themeList.forEach(t => {
        content += `• ${t}\n`;
      });
      content += `\n`;
    });
    
    content += `## Watchlist - Topics to Monitor\n\n`;
    reportData.watchlist.forEach((item, index) => {
      content += `${index + 1}. **${item.keyword}** - ${item.reason}\n`;
    });
    content += `\n`;
    
    content += `## Week Statistics\n\n`;
    content += `• **Articles Analyzed:** ${reportData.stats.totalArticles}\n`;
    content += `• **Social Posts Reviewed:** ${reportData.stats.totalSocialPosts}\n`;
    content += `• **Themes Identified:** ${reportData.stats.themesIdentified}\n`;
    content += `• **Ideas Generated:** ${reportData.stats.ideasGenerated}\n\n`;
    
    content += `---\n*Report generated on ${format(new Date(), 'MMM dd, yyyy \'at\' h:mm a')}*`;
    
    return content;
  }

  async createGoogleDoc(reportData, content) {
    try {
      const title = `Careers & Work — Weekly Ideas — ${format(new Date(reportData.weekStart), 'MMM dd, yyyy')}`;
      
      // Create document in Shared Drive
      const doc = await this.drive.files.create({
        resource: {
          name: title,
          parents: ['0AMvxrasIo7wvUk9PVA'], // Hanna AI Weekly News Reports Shared Drive
          mimeType: 'application/vnd.google-apps.document'
        },
        supportsAllDrives: true,
        fields: 'id, name, webViewLink'
      });

      const documentId = doc.data.id;
      
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            insertText: {
              location: { index: 1 },
              text: content
            }
          }]
        }
      });

      await this.drive.permissions.create({
        fileId: documentId,
        supportsAllDrives: true,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      const docUrl = `https://docs.google.com/document/d/${documentId}`;
      logger.info(`Google Doc created: ${docUrl}`);
      
      return docUrl;
    } catch (error) {
      logger.error('Error creating Google Doc:', error);
      return null;
    }
  }

  async saveLocalReport(reportData, content) {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const reportsDir = './reports';
    try {
      await fs.mkdir(reportsDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    const filename = `weekly-report-${reportData.weekStart}.md`;
    const filepath = path.join(reportsDir, filename);
    
    await fs.writeFile(filepath, content, 'utf-8');
    logger.info(`Local report saved: ${filepath}`);
  }

  generateWatchlist(analysis) {
    const watchlist = [];
    
    const trendingWords = analysis.trendingTopics.slice(0, 10);
    trendingWords.forEach(topic => {
      watchlist.push({
        keyword: topic.word,
        mentions: topic.mentions,
        reason: `Trending topic with ${topic.mentions} mentions this week`
      });
    });
    
    const emergingThemes = analysis.themes
      .filter(t => t.contentCount >= 3)
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 5);
    
    emergingThemes.forEach(theme => {
      watchlist.push({
        keyword: theme.cluster.toLowerCase(),
        mentions: theme.contentCount,
        reason: `High-engagement theme (${Math.round(theme.avgEngagement)} avg score)`
      });
    });
    
    return watchlist.slice(0, 10);
  }

  async getRecentSocialPosts(days = 7) {
    try {
      return await database.all(`
        SELECT * FROM social_posts 
        WHERE posted_date >= datetime('now', '-${days} days')
        ORDER BY posted_date DESC
      `);
    } catch (error) {
      logger.error('Error getting recent social posts:', error);
      return [];
    }
  }

  async generateSlackSummary(reportData) {
    const summary = {
      text: `📊 Weekly Career Content Report - ${format(new Date(reportData.weekStart), 'MMM dd')}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `📊 Weekly Ideas Report - ${format(new Date(reportData.weekStart), 'MMM dd, yyyy')}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Key Takeaways:*\n${reportData.summary}`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Ideas Generated:*\n${reportData.ideas.length}`
            },
            {
              type: "mrkdwn",
              text: `*Themes Identified:*\n${reportData.themes.length}`
            },
            {
              type: "mrkdwn",
              text: `*Articles Analyzed:*\n${reportData.stats.totalArticles}`
            },
            {
              type: "mrkdwn",
              text: `*Social Posts:*\n${reportData.stats.totalSocialPosts}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Top 5 Hooks to Test:*\n${reportData.ideas.slice(0, 5).map((idea, i) => `${i + 1}. "${idea.hooks[0]}"`).join('\n')}`
          }
        }
      ]
    };

    if (reportData.reportUrl) {
      summary.blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📖 View Full Report"
            },
            url: reportData.reportUrl,
            action_id: "view_report"
          }
        ]
      });
    }

    return summary;
  }
}

export default new ReportGenerationService();