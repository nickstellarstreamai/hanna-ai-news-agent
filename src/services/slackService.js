import { WebClient } from '@slack/web-api';
import { logger } from '../utils/logger.js';

class SlackService {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.channelId = process.env.SLACK_CHANNEL_ID;
    this.enabled = !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID);
    
    if (!this.enabled) {
      logger.warn('Slack integration not configured - missing bot token or channel ID');
    }
  }

  async postWeeklyReport(reportData) {
    if (!this.enabled) {
      logger.warn('Slack integration disabled - skipping weekly report post');
      return null;
    }

    try {
      const summary = this.buildWeeklyReportSummary(reportData);
      
      const result = await this.client.chat.postMessage({
        channel: this.channelId,
        ...summary
      });

      logger.info(`Weekly report posted to Slack: ${result.ts}`);
      return result;
    } catch (error) {
      logger.error('Failed to post weekly report to Slack:', error);
      throw error;
    }
  }

  buildWeeklyReportSummary(reportData) {
    const weekStart = new Date(reportData.weekStart);
    const weekEnd = new Date(reportData.weekEnd);
    
    const summary = {
      text: `📊 Weekly Career Content Report - ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `📊 Weekly Ideas Report - ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Key Takeaways:*\n" + this.formatSummaryBullets(reportData.summary)
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*💡 Ideas Generated:*\n${reportData.ideas.length}`
            },
            {
              type: "mrkdwn",
              text: `*🎯 Themes Identified:*\n${reportData.themes.length}`
            },
            {
              type: "mrkdwn",
              text: `*📰 Articles Analyzed:*\n${reportData.stats.totalArticles}`
            },
            {
              type: "mrkdwn",
              text: `*📱 Social Posts:*\n${reportData.stats.totalSocialPosts}`
            }
          ]
        }
      ]
    };

    if (reportData.ideas.length > 0) {
      const topHooks = reportData.ideas.slice(0, 5).map((idea, i) => 
        `${i + 1}. "${idea.hooks[0]}" _(${idea.platform})_`
      ).join('\n');
      
      summary.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🎪 Top 5 Hooks to Test:*\n${topHooks}`
        }
      });
    }

    if (reportData.themes.length > 0) {
      const topThemes = reportData.themes.slice(0, 3).map((theme, i) => 
        `${i + 1}. *${theme.cluster}* (${theme.contentCount} pieces)`
      ).join('\n');
      
      summary.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*📈 This Week's Hot Themes:*\n${topThemes}`
        }
      });
    }

    if (reportData.reportUrl) {
      summary.blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📖 View Full Report",
              emoji: true
            },
            url: reportData.reportUrl,
            action_id: "view_report",
            style: "primary"
          }
        ]
      });
    }

    summary.blocks.push({
      type: "divider"
    });

    summary.blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Generated on ${new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })} | 🤖 Hanna's AI News Agent`
        }
      ]
    });

    return summary;
  }

  formatSummaryBullets(summary) {
    if (!summary) return "No summary available";
    
    return summary
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.startsWith('•') ? line : `• ${line}`)
      .join('\n');
  }

  async postCustomMessage(text, blocks = null) {
    if (!this.enabled) {
      logger.warn('Slack integration disabled - skipping custom message');
      return null;
    }

    try {
      const message = {
        channel: this.channelId,
        text
      };

      if (blocks) {
        message.blocks = blocks;
      }

      const result = await this.client.chat.postMessage(message);
      logger.info(`Custom message posted to Slack: ${result.ts}`);
      return result;
    } catch (error) {
      logger.error('Failed to post custom message to Slack:', error);
      throw error;
    }
  }

  async postErrorAlert(error, context = '') {
    if (!this.enabled) {
      return null;
    }

    try {
      const message = {
        channel: this.channelId,
        text: `🚨 System Error Alert`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🚨 System Error Alert"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Context:* ${context}\n*Error:* ${error.message}`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Time: ${new Date().toISOString()}`
              }
            ]
          }
        ]
      };

      const result = await this.client.chat.postMessage(message);
      return result;
    } catch (slackError) {
      logger.error('Failed to post error alert to Slack:', slackError);
    }
  }

  async postContentAlert(title, message, urgent = false) {
    if (!this.enabled) {
      return null;
    }

    try {
      const alert = {
        channel: this.channelId,
        text: `${urgent ? '🔥' : '📢'} ${title}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${urgent ? '🔥' : '📢'} ${title}*\n${message}`
            }
          }
        ]
      };

      const result = await this.client.chat.postMessage(alert);
      logger.info(`Content alert posted to Slack: ${result.ts}`);
      return result;
    } catch (error) {
      logger.error('Failed to post content alert to Slack:', error);
      throw error;
    }
  }

  async testConnection() {
    if (!this.enabled) {
      throw new Error('Slack integration not configured');
    }

    try {
      const result = await this.client.auth.test();
      logger.info(`Slack connection test successful: ${result.user}`);
      return result;
    } catch (error) {
      logger.error('Slack connection test failed:', error);
      throw error;
    }
  }

  isEnabled() {
    return this.enabled;
  }
}

export default new SlackService();