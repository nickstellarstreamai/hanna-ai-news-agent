import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/news_agent.db';

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(DB_PATH);
    
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));

    await this.createTables();
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS news_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT UNIQUE,
        content TEXT,
        source TEXT,
        author TEXT,
        published_date DATETIME,
        scraped_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        pillar_tags TEXT,
        keywords TEXT,
        engagement_score INTEGER DEFAULT 0,
        processed BOOLEAN DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS social_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT,
        creator_handle TEXT,
        post_id TEXT UNIQUE,
        content TEXT,
        engagement_metrics TEXT,
        posted_date DATETIME,
        scraped_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        pillar_tags TEXT,
        performance_score INTEGER DEFAULT 0
      )`,

      `CREATE TABLE IF NOT EXISTS weekly_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start_date DATE,
        week_end_date DATE,
        report_data TEXT,
        generated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        ideas_count INTEGER,
        themes TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS content_ideas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        platform TEXT,
        format TEXT,
        hooks TEXT,
        key_points TEXT,
        pillar_tags TEXT,
        rationale TEXT,
        source_links TEXT,
        week_id INTEGER,
        generated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (week_id) REFERENCES weekly_reports (id)
      )`,

      `CREATE TABLE IF NOT EXISTS hanna_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT,
        post_id TEXT,
        content TEXT,
        engagement_metrics TEXT,
        posted_date DATETIME,
        imported_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        pillar_tags TEXT,
        performance_category TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS keyword_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT,
        frequency INTEGER DEFAULT 0,
        sentiment REAL DEFAULT 0.0,
        week_start DATE,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    await this.run(`CREATE INDEX IF NOT EXISTS idx_articles_date ON news_articles(published_date)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_articles_pillar ON news_articles(pillar_tags)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_posts_date ON social_posts(posted_date)`);
    await this.run(`CREATE INDEX IF NOT EXISTS idx_reports_date ON weekly_reports(week_start_date)`);
  }

  async insertArticle(article) {
    const query = `
      INSERT OR REPLACE INTO news_articles 
      (title, url, content, source, author, published_date, pillar_tags, keywords, engagement_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    return await this.run(query, [
      article.title,
      article.url,
      article.content,
      article.source,
      article.author,
      article.publishedDate,
      JSON.stringify(article.pillarTags || []),
      JSON.stringify(article.keywords || []),
      article.engagementScore || 0
    ]);
  }

  async insertSocialPost(post) {
    const query = `
      INSERT OR REPLACE INTO social_posts 
      (platform, creator_handle, post_id, content, engagement_metrics, posted_date, pillar_tags, performance_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    return await this.run(query, [
      post.platform,
      post.creatorHandle,
      post.postId,
      post.content,
      JSON.stringify(post.engagementMetrics || {}),
      post.postedDate,
      JSON.stringify(post.pillarTags || []),
      post.performanceScore || 0
    ]);
  }

  async getRecentArticles(days = 7, pillarFilter = null) {
    let query = `
      SELECT * FROM news_articles 
      WHERE published_date >= datetime('now', '-${days} days')
    `;
    
    if (pillarFilter) {
      query += ` AND pillar_tags LIKE '%${pillarFilter}%'`;
    }
    
    query += ` ORDER BY published_date DESC`;
    
    return await this.all(query);
  }

  async saveWeeklyReport(report) {
    const query = `
      INSERT INTO weekly_reports (week_start_date, week_end_date, report_data, ideas_count, themes)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await this.run(query, [
      report.weekStart,
      report.weekEnd,
      JSON.stringify(report.data),
      report.ideasCount,
      JSON.stringify(report.themes)
    ]);
    
    return { lastID: this.db.lastInsertRowid };
  }

  async getWeeklyReports(limit = 10) {
    const query = `
      SELECT * FROM weekly_reports 
      ORDER BY week_start_date DESC 
      LIMIT ?
    `;
    
    return await this.all(query, [limit]);
  }

  async close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export default new Database();