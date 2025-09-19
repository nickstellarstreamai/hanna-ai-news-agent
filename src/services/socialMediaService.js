import axios from 'axios';
import { SOCIAL_CREATORS } from '../config/dataSources.js';
import { getPillarByKeyword } from '../config/contentPillars.js';
import database from '../config/database.js';
import { logger } from '../utils/logger.js';

class SocialMediaService {
  constructor() {
    this.tiktokApiKey = process.env.TIKTOK_API_KEY;
    this.linkedinApiKey = process.env.LINKEDIN_API_KEY;
  }

  async collectAllCreatorData(daysBack = 7) {
    logger.info('Starting social media data collection');
    const results = {
      tiktok: [],
      linkedin: [],
      instagram: []
    };

    try {
      const allCreators = [
        ...SOCIAL_CREATORS.PRIMARY_COMPETITORS,
        ...SOCIAL_CREATORS.CAREER_FOCUSED
      ];

      for (const creator of allCreators) {
        for (const platform of creator.platforms) {
          try {
            const posts = await this.getCreatorPosts(creator.handle, platform, daysBack);
            results[platform] = results[platform] || [];
            results[platform].push(...posts);
          } catch (error) {
            logger.error(`Failed to collect data for ${creator.handle} on ${platform}:`, error);
          }
        }
      }

      const totalPosts = Object.values(results).reduce((sum, posts) => sum + posts.length, 0);
      logger.info(`Social media collection complete: ${totalPosts} posts processed`);

      return results;
    } catch (error) {
      logger.error('Error during social media collection:', error);
      throw error;
    }
  }

  async getCreatorPosts(handle, platform, daysBack = 7) {
    switch (platform) {
      case 'tiktok':
        return await this.getTikTokPosts(handle, daysBack);
      case 'linkedin':
        return await this.getLinkedInPosts(handle, daysBack);
      case 'instagram':
        return await this.getInstagramPosts(handle, daysBack);
      default:
        logger.warn(`Unsupported platform: ${platform}`);
        return [];
    }
  }

  async getTikTokPosts(handle, daysBack = 7) {
    const posts = [];
    
    try {
      if (!this.tiktokApiKey) {
        logger.warn('TikTok API key not configured, using mock data');
        return this.generateMockTikTokData(handle, daysBack);
      }

      const response = await axios.get(`https://open-api.tiktok.com/research/video/query/`, {
        headers: {
          'Authorization': `Bearer ${this.tiktokApiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          query: {
            and: [
              {
                operation: "EQ",
                field_name: "username",
                field_values: [handle]
              }
            ]
          },
          max_count: 20,
          cursor: 0,
          start_date: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        }
      });

      for (const video of response.data.data.videos || []) {
        const post = {
          platform: 'tiktok',
          creatorHandle: handle,
          postId: video.id,
          content: video.video_description || '',
          engagementMetrics: {
            views: video.view_count,
            likes: video.like_count,
            shares: video.share_count,
            comments: video.comment_count
          },
          postedDate: video.create_time,
          pillarTags: this.classifyContent(video.video_description || ''),
          performanceScore: this.calculatePerformanceScore('tiktok', {
            views: video.view_count,
            likes: video.like_count,
            shares: video.share_count,
            comments: video.comment_count
          })
        };

        await database.insertSocialPost(post);
        posts.push(post);
      }

      logger.info(`Collected ${posts.length} TikTok posts from @${handle}`);
      return posts;
    } catch (error) {
      logger.error(`TikTok collection failed for @${handle}:`, error);
      return this.generateMockTikTokData(handle, daysBack);
    }
  }

  async getLinkedInPosts(handle, daysBack = 7) {
    const posts = [];
    
    try {
      if (!this.linkedinApiKey) {
        logger.warn('LinkedIn API key not configured, using mock data');
        return this.generateMockLinkedInData(handle, daysBack);
      }

      logger.info(`Collecting LinkedIn posts from ${handle}`);
      
      return posts;
    } catch (error) {
      logger.error(`LinkedIn collection failed for ${handle}:`, error);
      return this.generateMockLinkedInData(handle, daysBack);
    }
  }

  async getInstagramPosts(handle, daysBack = 7) {
    const posts = [];
    
    try {
      logger.info(`Instagram data collection for ${handle} - using mock data`);
      return this.generateMockInstagramData(handle, daysBack);
    } catch (error) {
      logger.error(`Instagram collection failed for ${handle}:`, error);
      return [];
    }
  }

  generateMockTikTokData(handle, daysBack) {
    const mockPosts = [];
    const careerTopics = [
      "5 signs it's time to quit your job",
      "How to negotiate salary like a pro",
      "LinkedIn mistakes that are costing you jobs",
      "Remote work red flags to avoid",
      "Building your personal brand in 2024"
    ];

    for (let i = 0; i < Math.min(5, daysBack); i++) {
      const topic = careerTopics[i % careerTopics.length];
      const post = {
        platform: 'tiktok',
        creatorHandle: handle,
        postId: `mock_tiktok_${handle}_${i}`,
        content: topic,
        engagementMetrics: {
          views: Math.floor(Math.random() * 100000) + 10000,
          likes: Math.floor(Math.random() * 5000) + 500,
          shares: Math.floor(Math.random() * 200) + 20,
          comments: Math.floor(Math.random() * 300) + 30
        },
        postedDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        pillarTags: this.classifyContent(topic),
        performanceScore: Math.floor(Math.random() * 100) + 50
      };

      mockPosts.push(post);
    }

    return mockPosts;
  }

  generateMockLinkedInData(handle, daysBack) {
    const mockPosts = [];
    const careerTopics = [
      "The future of remote work: insights from 500+ companies",
      "Why soft skills matter more than technical skills in 2024",
      "Career pivot strategies that actually work",
      "How to build executive presence as a young professional",
      "The hidden job market: how to access it"
    ];

    for (let i = 0; i < Math.min(3, daysBack); i++) {
      const topic = careerTopics[i % careerTopics.length];
      const post = {
        platform: 'linkedin',
        creatorHandle: handle,
        postId: `mock_linkedin_${handle}_${i}`,
        content: topic,
        engagementMetrics: {
          likes: Math.floor(Math.random() * 1000) + 100,
          comments: Math.floor(Math.random() * 50) + 10,
          shares: Math.floor(Math.random() * 30) + 5,
          views: Math.floor(Math.random() * 10000) + 2000
        },
        postedDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        pillarTags: this.classifyContent(topic),
        performanceScore: Math.floor(Math.random() * 100) + 40
      };

      mockPosts.push(post);
    }

    return mockPosts;
  }

  generateMockInstagramData(handle, daysBack) {
    return [];
  }

  classifyContent(text) {
    const pillar = getPillarByKeyword(text);
    return pillar ? [pillar.id] : [];
  }

  calculatePerformanceScore(platform, metrics) {
    switch (platform) {
      case 'tiktok':
        return Math.min(100, Math.floor(
          (metrics.views / 1000) * 0.1 +
          (metrics.likes / 100) * 2 +
          (metrics.shares / 10) * 5 +
          (metrics.comments / 10) * 3
        ));
      case 'linkedin':
        return Math.min(100, Math.floor(
          (metrics.views / 100) * 0.5 +
          (metrics.likes / 10) * 3 +
          (metrics.comments / 2) * 8 +
          (metrics.shares / 2) * 10
        ));
      default:
        return 50;
    }
  }

  async importHannaAnalytics(analyticsData) {
    try {
      for (const post of analyticsData) {
        const hannaPost = {
          platform: post.platform,
          postId: post.id,
          content: post.content,
          engagementMetrics: post.metrics,
          postedDate: post.date,
          pillarTags: this.classifyContent(post.content),
          performanceCategory: this.categorizePerformance(post.metrics, post.platform)
        };

        await database.run(`
          INSERT OR REPLACE INTO hanna_analytics 
          (platform, post_id, content, engagement_metrics, posted_date, pillar_tags, performance_category)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          hannaPost.platform,
          hannaPost.postId,
          hannaPost.content,
          JSON.stringify(hannaPost.engagementMetrics),
          hannaPost.postedDate,
          JSON.stringify(hannaPost.pillarTags),
          hannaPost.performanceCategory
        ]);
      }

      logger.info(`Imported ${analyticsData.length} Hanna analytics entries`);
    } catch (error) {
      logger.error('Error importing Hanna analytics:', error);
      throw error;
    }
  }

  categorizePerformance(metrics, platform) {
    const score = this.calculatePerformanceScore(platform, metrics);
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }
}

export default new SocialMediaService();