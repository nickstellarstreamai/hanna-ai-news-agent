#!/usr/bin/env node

import { tavily } from '@tavily/core';
import { CONTENT_PILLARS } from '../config/contentPillars.js';
import fs from 'fs/promises';
import path from 'path';

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
 * - Search result caching to prevent credit waste during debugging
 */
class TavilyService {
  constructor() {
    this.tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
    this.searches_used = 0;
    this.monthly_limit = 1000; // Free tier limit
    this.cacheDir = './data/tavily-cache';
  }

  /**
   * Get cache file path for today's searches
   */
  getCacheFilePath() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.cacheDir, `tavily-search-${today}.json`);
  }

  /**
   * Load cached search results if they exist and are from today
   */
  async loadCachedResults() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const cacheFile = this.getCacheFilePath();
      const data = await fs.readFile(cacheFile, 'utf-8');
      const cached = JSON.parse(data);
      console.log(`📋 Loading cached search results from ${cacheFile}`);
      console.log(`💰 Saved credits: Using cached results instead of ${cached.searchCount} new searches`);
      return cached;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save search results to cache for today
   */
  async saveCachedResults(results, searchCount) {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const cacheFile = this.getCacheFilePath();
      const cacheData = {
        timestamp: new Date().toISOString(),
        searchCount,
        results
      };
      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`💾 Cached search results to ${cacheFile} (${searchCount} searches)`);
    } catch (error) {
      console.error('Warning: Failed to cache search results:', error.message);
    }
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
   * Search across all content pillars for comprehensive coverage (OPTIMIZED)
   */
  async searchAllPillars() {
    // Check for cached results first
    const cached = await this.loadCachedResults();
    if (cached) {
      return cached.results;
    }

    const allResults = {};
    const pillars = Object.keys(this.generateSearchQueries());

    console.log('🚀 Starting OPTIMIZED Tavily search across all content pillars...');
    console.log(`📊 Monthly usage: ${this.searches_used}/${this.monthly_limit} searches used`);

    const searchStartCount = this.searches_used;

    // 🔥 OPTIMIZATION 1: Parallel processing instead of sequential
    const pillarPromises = pillars.map(async (pillar) => {
      console.log(`📍 Starting parallel search: ${pillar}`);
      const results = await this.searchByContentPillarOptimized(pillar, 1); // Only 1 result per query for speed
      console.log(`✅ Completed ${pillar}: ${results.reduce((sum, item) => sum + item.results.length, 0)} results found`);
      return { pillar, results };
    });

    // Wait for all pillars to complete in parallel
    const pillarResults = await Promise.all(pillarPromises);

    // Organize results
    pillarResults.forEach(({ pillar, results }) => {
      allResults[pillar] = results;
    });

    console.log(`\n🎯 OPTIMIZED search complete! Usage: ${this.searches_used}/${this.monthly_limit} searches used`);

    // 🚨 EMERGENCY FIX: Skip caching to prevent crashes
    try {
      const searchesUsed = this.searches_used - searchStartCount;
      await this.saveCachedResults(allResults, searchesUsed);
    } catch (error) {
      console.error('❌ EMERGENCY: Caching crashed, skipping:', error.message);
    }

    console.log('✅ EMERGENCY: Tavily search completed successfully, returning results...');
    return allResults;
  }

  /**
   * Optimized pillar search with fewer queries and faster processing
   */
  async searchByContentPillarOptimized(pillarName, maxResultsPerQuery = 1) {
    const queries = this.generateSearchQueries();

    if (!queries[pillarName]) {
      throw new Error(`Unknown content pillar: ${pillarName}`);
    }

    // 🔥 OPTIMIZATION 2: Reduce queries from 5 to 2 per pillar for speed
    const pillarQueries = queries[pillarName].slice(0, 2); // Only take first 2 queries
    const results = [];

    // 🔥 OPTIMIZATION 3: Parallel query processing within pillar
    const queryPromises = pillarQueries.map(async (query) => {
      if (this.searches_used >= this.monthly_limit) {
        console.warn('⚠️  Tavily monthly search limit reached');
        return null;
      }

      try {
        console.log(`🔍 Fast search: ${query}`);

        const response = await this.tvly.search(query, {
          search_depth: 'basic', // 🔥 OPTIMIZATION 4: Use basic instead of advanced for speed
          max_results: maxResultsPerQuery,
          include_domains: [
            'harvard.edu', 'linkedin.com', 'hbr.org', 'forbes.com',
            'wsj.com', 'nytimes.com', 'fastcompany.com'
          ],
          days: 30
        });

        this.searches_used++;

        return {
          query,
          pillar: pillarName,
          results: response.results || [],
          answer: response.answer || null,
          search_metadata: {
            timestamp: new Date().toISOString(),
            search_depth: 'basic',
            results_count: response.results ? response.results.length : 0
          }
        };

      } catch (error) {
        console.error(`❌ Error searching for "${query}":`, error.message);
        return null;
      }
    });

    // Wait for all queries in this pillar to complete
    const queryResults = await Promise.all(queryPromises);

    // Filter out null results and add to main results
    queryResults.filter(result => result !== null).forEach(result => {
      results.push(result);
    });

    // 🔥 OPTIMIZATION 5: Reduce wait time between requests
    await new Promise(resolve => setTimeout(resolve, 200)); // Reduced from 1000ms to 200ms

    return results;
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