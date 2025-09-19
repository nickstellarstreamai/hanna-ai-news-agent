import RSSParser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { NEWS_SOURCES } from '../config/dataSources.js';
import { getPillarByKeyword, CONTENT_PILLARS } from '../config/contentPillars.js';
import database from '../config/database.js';
import { logger } from '../utils/logger.js';

class NewsIngestionService {
  constructor() {
    this.rssParser = new RSSParser();
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  async ingestAllSources(daysBack = 7) {
    logger.info('Starting news ingestion for all sources');
    const results = {
      newsletters: [],
      substacks: [],
      reddit: [],
      laborData: []
    };

    try {
      const newsletterPromises = NEWS_SOURCES.NEWSLETTERS.map(source => 
        this.ingestNewsletter(source).catch(err => {
          logger.error(`Failed to ingest newsletter ${source.name}:`, err);
          return null;
        })
      );

      const substackPromises = NEWS_SOURCES.SUBSTACKS.map(source => 
        this.ingestSubstack(source).catch(err => {
          logger.error(`Failed to ingest substack ${source.name}:`, err);
          return null;
        })
      );

      const redditPromises = NEWS_SOURCES.REDDIT_SUBREDDITS.map(source => 
        this.ingestRedditSubreddit(source).catch(err => {
          logger.error(`Failed to ingest reddit ${source.name}:`, err);
          return null;
        })
      );

      const [newsletters, substacks, reddit] = await Promise.all([
        Promise.allSettled(newsletterPromises),
        Promise.allSettled(substackPromises),
        Promise.allSettled(redditPromises)
      ]);

      results.newsletters = newsletters.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
      results.substacks = substacks.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
      results.reddit = reddit.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);

      const totalArticles = results.newsletters.length + results.substacks.length + results.reddit.length;
      logger.info(`Ingestion complete: ${totalArticles} articles processed`);

      return results;
    } catch (error) {
      logger.error('Error during news ingestion:', error);
      throw error;
    }
  }

  async ingestNewsletter(source) {
    try {
      if (source.type === 'rss' && source.rssUrl) {
        return await this.ingestRSSFeed(source);
      } else if (source.type === 'scraper') {
        return await this.scrapeWebsite(source);
      }
    } catch (error) {
      logger.error(`Error ingesting newsletter ${source.name}:`, error);
      throw error;
    }
  }

  async ingestSubstack(source) {
    try {
      return await this.ingestRSSFeed(source);
    } catch (error) {
      logger.error(`Error ingesting substack ${source.name}:`, error);
      throw error;
    }
  }

  async ingestRSSFeed(source) {
    const articles = [];
    
    try {
      const feed = await this.rssParser.parseURL(source.rssUrl || source.url);
      
      for (const item of feed.items.slice(0, 20)) {
        const publishedDate = new Date(item.pubDate || item.date);
        const daysAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysAgo <= 10) {
          const article = {
            title: item.title,
            url: item.link,
            content: this.cleanContent(item.content || item.summary || ''),
            source: source.name,
            author: item.creator || item.author || '',
            publishedDate: publishedDate.toISOString(),
            pillarTags: this.classifyContent(item.title + ' ' + (item.content || item.summary || '')),
            keywords: this.extractKeywords(item.title + ' ' + (item.content || item.summary || ''))
          };

          await database.insertArticle(article);
          articles.push(article);
        }
      }

      logger.info(`Ingested ${articles.length} articles from ${source.name}`);
      return articles;
    } catch (error) {
      logger.error(`RSS ingestion failed for ${source.name}:`, error);
      throw error;
    }
  }

  async scrapeWebsite(source) {
    const articles = [];
    
    try {
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HannaNewsAgent/1.0)'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      const selectors = {
        'linkedin.com': {
          articles: '.news-article',
          title: 'h3',
          link: 'a',
          summary: '.news-article__summary'
        },
        'default': {
          articles: 'article, .post, .entry',
          title: 'h1, h2, h3, .title',
          link: 'a',
          summary: '.summary, .excerpt, p'
        }
      };

      const siteSelectors = selectors[new URL(source.url).hostname] || selectors.default;
      
      $(siteSelectors.articles).each((i, element) => {
        if (i >= 15) return false;

        const $el = $(element);
        const title = $el.find(siteSelectors.title).first().text().trim();
        const link = $el.find(siteSelectors.link).first().attr('href');
        const summary = $el.find(siteSelectors.summary).first().text().trim();

        if (title && link) {
          const fullUrl = link.startsWith('http') ? link : new URL(link, source.url).href;
          
          const article = {
            title,
            url: fullUrl,
            content: this.cleanContent(summary),
            source: source.name,
            author: '',
            publishedDate: new Date().toISOString(),
            pillarTags: this.classifyContent(title + ' ' + summary),
            keywords: this.extractKeywords(title + ' ' + summary)
          };

          articles.push(article);
        }
      });

      for (const article of articles) {
        await database.insertArticle(article);
      }

      logger.info(`Scraped ${articles.length} articles from ${source.name}`);
      return articles;
    } catch (error) {
      logger.error(`Web scraping failed for ${source.name}:`, error);
      throw error;
    }
  }

  async ingestRedditSubreddit(source) {
    const posts = [];
    
    try {
      const response = await axios.get(`https://www.reddit.com/r/${source.subreddit}/hot.json`, {
        headers: {
          'User-Agent': process.env.REDDIT_USER_AGENT || 'HannaNewsAgent/1.0'
        },
        params: {
          limit: source.postLimit || 25
        }
      });

      const redditPosts = response.data.data.children;
      
      for (const postData of redditPosts) {
        const post = postData.data;
        const createdDate = new Date(post.created_utc * 1000);
        const daysAgo = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysAgo <= 7 && post.score > 10) {
          const content = post.selftext || post.title;
          
          const article = {
            title: post.title,
            url: `https://reddit.com${post.permalink}`,
            content: this.cleanContent(content),
            source: source.name,
            author: post.author,
            publishedDate: createdDate.toISOString(),
            pillarTags: this.classifyContent(post.title + ' ' + content),
            keywords: this.extractKeywords(post.title + ' ' + content),
            engagementScore: post.score + post.num_comments
          };

          await database.insertArticle(article);
          posts.push(article);
        }
      }

      logger.info(`Ingested ${posts.length} posts from ${source.name}`);
      return posts;
    } catch (error) {
      logger.error(`Reddit ingestion failed for ${source.name}:`, error);
      throw error;
    }
  }

  classifyContent(text) {
    const pillars = [];
    const lowerText = text.toLowerCase();

    Object.entries(CONTENT_PILLARS).forEach(([pillarId, pillar]) => {
      const matches = pillar.keywords.filter(keyword => 
        lowerText.includes(keyword.toLowerCase())
      );
      
      if (matches.length > 0) {
        pillars.push(pillarId);
      }
    });

    return pillars;
  }

  extractKeywords(text) {
    const keywords = [];
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    
    const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way']);
    
    words.forEach(word => {
      if (!commonWords.has(word) && word.length > 3) {
        keywords.push(word);
      }
    });

    return [...new Set(keywords)].slice(0, 10);
  }

  cleanContent(content) {
    return content
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000);
  }
}

export default new NewsIngestionService();