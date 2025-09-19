#!/usr/bin/env node

import { tavily } from '@tavily/core';
import { CONTENT_PILLARS } from '../config/contentPillars.js';

/**
 * Tavily Search Service for Hanna AI News Agent
 *
 * This service integrates with Tavily's AI-optimized search API to fetch
 * real-time, relevant content based on Hanna's 2025 content strategy pillars.
 *
 * Features:
 * - Content pillar-specific search queries
 * - Time-filtered searches for recent content
 * - AI-optimized results with citations
 * - Cost-effective with 1000 free monthly searches
 */
class TavilyService {
  constructor() {
    this.tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
    this.searches_used = 0;
    this.monthly_limit = 1000; // Free tier limit
  }

  /**
   * Generate targeted search queries based on Hanna's content strategy
   */
  generateSearchQueries() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    return {
      'Career Clarity & Goals': [
        `career clarity assessment tools ${currentYear}`,
        `career pivot strategies for professionals ${currentYear}`,
        `goal setting frameworks for career development ${currentYear}`,
        `career transition trends ${currentMonth} ${currentYear}`,
        `professional development planning ${currentYear}`
      ],

      'Personal Branding & Visibility': [
        `LinkedIn personal branding strategies ${currentYear}`,
        `professional visibility tactics ${currentYear}`,
        `personal brand building for career advancement`,
        `LinkedIn algorithm changes ${currentYear}`,
        `networking strategies for career growth ${currentYear}`
      ],

      'Strategic Growth & Skills Development': [
        `salary negotiation strategies ${currentYear}`,
        `in-demand skills for professionals ${currentYear}`,
        `upskilling trends workplace ${currentYear}`,
        `career advancement tactics ${currentYear}`,
        `professional skill development programs`
      ],

      'Workplace Trends, Rights & Advocacy': [
        `workplace trends ${currentYear}`,
        `remote work statistics ${currentYear}`,
        `pay transparency laws ${currentYear}`,
        `employee rights workplace advocacy`,
        `diversity inclusion workplace trends ${currentYear}`,
        `future of work predictions ${currentYear}`
      ],

      'Work that Complements Life': [
        `work life balance strategies ${currentYear}`,
        `burnout prevention workplace wellness`,
        `flexible work arrangements ${currentYear}`,
        `sustainable productivity methods`,
        `work from home best practices ${currentYear}`
      ]
    };
  }

  /**
   * Perform targeted searches for each content pillar
   */
  async searchByContentPillar(pillarName, maxResultsPerQuery = 3) {
    const queries = this.generateSearchQueries();

    if (!queries[pillarName]) {
      throw new Error(`Unknown content pillar: ${pillarName}`);
    }

    const pillarQueries = queries[pillarName];
    const results = [];

    for (const query of pillarQueries) {
      if (this.searches_used >= this.monthly_limit) {
        console.warn('⚠️  Tavily monthly search limit reached');
        break;
      }

      try {
        console.log(`🔍 Searching: ${query}`);

        const response = await this.tvly.search(query, {
          search_depth: 'advanced', // Better for content research
          max_results: maxResultsPerQuery,
          include_domains: [
            'harvard.edu', 'linkedin.com', 'hbr.org', 'forbes.com',
            'wsj.com', 'nytimes.com', 'fastcompany.com', 'inc.com',
            'entrepreneur.com', 'glassdoor.com', 'indeed.com'
          ],
          exclude_domains: [
            'youtube.com', 'tiktok.com', 'instagram.com', 'facebook.com'
          ],
          days: 30 // Content from last 30 days
        });

        results.push({
          query,
          pillar: pillarName,
          results: response.results || [],
          answer: response.answer || null,
          search_metadata: {
            timestamp: new Date().toISOString(),
            search_depth: 'advanced',
            results_count: response.results ? response.results.length : 0
          }
        });

        this.searches_used++;

        // Rate limiting - be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error searching for "${query}":`, error.message);
      }
    }

    return results;
  }

  /**
   * Search across all content pillars for comprehensive coverage
   */
  async searchAllPillars() {
    const allResults = {};
    const pillars = Object.keys(this.generateSearchQueries());

    console.log('🚀 Starting comprehensive Tavily search across all content pillars...');
    console.log(`📊 Monthly usage: ${this.searches_used}/${this.monthly_limit} searches used`);

    for (const pillar of pillars) {
      console.log(`\n📍 Searching pillar: ${pillar}`);
      allResults[pillar] = await this.searchByContentPillar(pillar, 2); // 2 results per query to stay within limits

      console.log(`✅ Completed ${pillar}: ${allResults[pillar].reduce((sum, item) => sum + item.results.length, 0)} results found`);
    }

    console.log(`\n🎯 Search complete! Usage: ${this.searches_used}/${this.monthly_limit} searches used`);

    return allResults;
  }

  /**
   * Search for trending topics in Hanna's industry
   */
  async searchTrendingTopics() {
    const trendingQueries = [
      'career development trends 2024 2025',
      'workplace culture changes 2024',
      'salary negotiation trends professionals',
      'LinkedIn personal branding strategies',
      'remote work future predictions 2025'
    ];

    const results = [];

    for (const query of trendingQueries) {
      if (this.searches_used >= this.monthly_limit) break;

      try {
        const response = await this.tvly.search(query, {
          search_depth: 'advanced',
          max_results: 5,
          days: 7 // Very recent trends
        });

        results.push({
          query,
          type: 'trending',
          results: response.results || [],
          answer: response.answer,
          timestamp: new Date().toISOString()
        });

        this.searches_used++;
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error searching trending topic "${query}":`, error.message);
      }
    }

    return results;
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      searches_used: this.searches_used,
      monthly_limit: this.monthly_limit,
      remaining_searches: this.monthly_limit - this.searches_used,
      usage_percentage: ((this.searches_used / this.monthly_limit) * 100).toFixed(1)
    };
  }

  /**
   * Extract content from specific URLs for deeper analysis
   */
  async extractContent(urls) {
    if (!Array.isArray(urls)) {
      urls = [urls];
    }

    const results = [];

    for (const url of urls) {
      try {
        console.log(`📄 Extracting content from: ${url}`);

        const response = await this.tvly.extract([url]);

        results.push({
          url,
          content: response.results?.[0]?.content || null,
          title: response.results?.[0]?.title || null,
          extracted_at: new Date().toISOString()
        });

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Error extracting content from ${url}:`, error.message);
      }
    }

    return results;
  }
}

export { TavilyService };