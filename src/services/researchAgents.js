import { Task } from '../utils/taskRunner.js';
import { logger } from '../utils/logger.js';
import { CONTENT_PILLARS } from '../config/contentPillars.js';

class ResearchAgentService {
  constructor() {
    this.agents = {
      reddit: new RedditResearchAgent(),
      rss: new RSSResearchAgent(),
      trends: new TrendsResearchAgent(),
      competitors: new CompetitorResearchAgent()
    };
  }

  async generateWeeklyResearch() {
    logger.info('Starting comprehensive weekly research with specialized agents');
    
    const results = {
      reddit: [],
      rss: [],
      trends: [],
      competitors: [],
      sources: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Run all research agents in parallel
      const [redditData, rssData, trendsData, competitorData] = await Promise.allSettled([
        this.agents.reddit.research(),
        this.agents.rss.research(),
        this.agents.trends.research(),
        this.agents.competitors.research()
      ]);

      if (redditData.status === 'fulfilled') {
        results.reddit = redditData.value.data;
        results.sources.push(...redditData.value.sources);
      }
      
      if (rssData.status === 'fulfilled') {
        results.rss = rssData.value.data;
        results.sources.push(...rssData.value.sources);
      }
      
      if (trendsData.status === 'fulfilled') {
        results.trends = trendsData.value.data;
        results.sources.push(...trendsData.value.sources);
      }
      
      if (competitorData.status === 'fulfilled') {
        results.competitors = competitorData.value.data;
        results.sources.push(...competitorData.value.sources);
      }

      logger.info(`Research complete: ${results.sources.length} total sources collected`);
      return results;
      
    } catch (error) {
      logger.error('Error in weekly research:', error);
      throw error;
    }
  }
}

class RedditResearchAgent {
  constructor() {
    this.subreddits = [
      'careerguidance', 'jobs', 'AskManagers', 'recruitinghell',
      'negotiation', 'futureofwork', 'resumes', 'sidehustle'
    ];
  }

  async research() {
    const taskPrompt = `Research career-related discussions on Reddit for the past week.

TASK: Analyze Reddit discussions across career-focused subreddits to identify:
1. Top trending career concerns and pain points
2. Most upvoted advice and solutions
3. Emerging workplace trends and issues
4. Common questions from mid-level professionals

SUBREDDITS TO ANALYZE:
${this.subreddits.join(', ')}

FOR EACH SUBREDDIT:
1. Get top 15 posts from the past week
2. Focus on posts with 20+ upvotes
3. Extract key themes and pain points
4. Note specific advice that's resonating

OUTPUT REQUIRED:
- List of trending topics with vote counts
- Top 5 pain points mentioned across subreddits
- Best advice/solutions getting traction
- Specific post titles and URLs for citation
- Keywords appearing frequently

CONTENT FOCUS: Career clarity, workplace issues, negotiation, remote work, job search, leadership development.

Return structured data with full source citations.`;

    try {
      const result = await Task({
        subagent_type: 'general-purpose',
        description: 'Reddit career research',
        prompt: taskPrompt
      });

      return {
        data: this.parseRedditResults(result),
        sources: this.extractRedditSources(result)
      };
    } catch (error) {
      logger.error('Reddit research agent failed:', error);
      return { data: [], sources: [] };
    }
  }

  parseRedditResults(result) {
    // Parse the agent's research results
    try {
      if (typeof result === 'string' && result.includes('trending topics')) {
        return result;
      }
      return result || 'Reddit research completed - check logs for details';
    } catch (error) {
      logger.error('Error parsing Reddit results:', error);
      return [];
    }
  }

  extractRedditSources(result) {
    const sources = [];
    try {
      // Extract URLs and post references from the result
      const urlMatches = result.match(/https:\/\/www\.reddit\.com\/r\/\w+\/[^\s]+/g) || [];
      urlMatches.forEach(url => {
        sources.push({
          type: 'reddit',
          url: url,
          platform: 'Reddit',
          title: 'Career discussion',
          accessed: new Date().toISOString()
        });
      });
    } catch (error) {
      logger.error('Error extracting Reddit sources:', error);
    }
    return sources;
  }
}

class RSSResearchAgent {
  constructor() {
    this.feeds = [
      {
        name: 'Morning Brew',
        url: 'https://www.morningbrew.com/feed',
        focus: 'business trends'
      },
      {
        name: 'Joel Uili Substack',
        url: 'https://joeluili.substack.com/feed',
        focus: 'career advice'
      },
      {
        name: 'Laetitia@Work',
        url: 'https://laetitiawork.substack.com/feed', 
        focus: 'workplace culture'
      }
    ];
  }

  async research() {
    const taskPrompt = `Research career and workplace content from RSS feeds and newsletters.

TASK: Analyze recent articles from career-focused RSS feeds and newsletters to identify:
1. Latest workplace trends and insights
2. Career development strategies being discussed
3. Leadership and management topics
4. Remote work and future of work content
5. Salary and negotiation insights

FEEDS TO ANALYZE:
${this.feeds.map(f => `- ${f.name} (${f.url}) - Focus: ${f.focus}`).join('\n')}

FOR EACH FEED:
1. Get articles from the past 7 days
2. Extract key insights and trends
3. Identify actionable advice
4. Note data and statistics mentioned

CONTENT PILLARS TO MAP TO:
${Object.entries(CONTENT_PILLARS).map(([id, pillar]) => `- ${pillar.name}: ${pillar.description}`).join('\n')}

OUTPUT REQUIRED:
- Key insights by content pillar
- Trending topics and themes
- Data points and statistics
- Article titles and URLs for citation
- Expert quotes and advice

Return structured data with full source citations and publication dates.`;

    try {
      const result = await Task({
        subagent_type: 'general-purpose',
        description: 'RSS feed career research',
        prompt: taskPrompt
      });

      return {
        data: this.parseRSSResults(result),
        sources: this.extractRSSSources(result)
      };
    } catch (error) {
      logger.error('RSS research agent failed:', error);
      return { data: [], sources: [] };
    }
  }

  parseRSSResults(result) {
    try {
      return result || 'RSS research completed';
    } catch (error) {
      logger.error('Error parsing RSS results:', error);
      return [];
    }
  }

  extractRSSSources(result) {
    const sources = [];
    try {
      this.feeds.forEach(feed => {
        sources.push({
          type: 'rss',
          url: feed.url,
          platform: feed.name,
          title: `${feed.name} - Career Content`,
          focus: feed.focus,
          accessed: new Date().toISOString()
        });
      });
    } catch (error) {
      logger.error('Error extracting RSS sources:', error);
    }
    return sources;
  }
}

class TrendsResearchAgent {
  constructor() {}

  async research() {
    const taskPrompt = `Research current career and workplace trends across the internet.

TASK: Identify trending career topics and workplace discussions by searching for:
1. Recent career development trends
2. Workplace culture discussions
3. Salary negotiation trends and data
4. Remote work and future of work insights
5. Leadership development topics

RESEARCH AREAS:
- Google trends for career-related terms
- News articles about workplace trends
- Professional development discussions
- Industry reports on employment trends
- LinkedIn trending topics (if accessible)

FOCUS KEYWORDS:
career clarity, personal branding, salary negotiation, workplace trends, remote work, leadership development, career pivots, job market

CONTENT TO FIND:
- Recent surveys and data about careers
- Expert opinions on workplace trends
- New career strategies and frameworks
- Industry predictions and insights

OUTPUT REQUIRED:
- Top 10 trending career topics
- Key statistics and data points
- Expert insights and predictions
- Source URLs and publication info
- Trending keywords and phrases

Return comprehensive research with full citations.`;

    try {
      const result = await Task({
        subagent_type: 'general-purpose',
        description: 'Career trends research',
        prompt: taskPrompt
      });

      return {
        data: this.parseTrendsResults(result),
        sources: this.extractTrendsSources(result)
      };
    } catch (error) {
      logger.error('Trends research agent failed:', error);
      return { data: [], sources: [] };
    }
  }

  parseTrendsResults(result) {
    try {
      return result || 'Trends research completed';
    } catch (error) {
      logger.error('Error parsing trends results:', error);
      return [];
    }
  }

  extractTrendsSources(result) {
    const sources = [];
    try {
      // Extract any URLs from the research result
      const urlMatches = result.match(/https?:\/\/[^\s]+/g) || [];
      urlMatches.forEach(url => {
        sources.push({
          type: 'web',
          url: url,
          platform: 'Web Research',
          title: 'Career trend research',
          accessed: new Date().toISOString()
        });
      });
    } catch (error) {
      logger.error('Error extracting trends sources:', error);
    }
    return sources;
  }
}

class CompetitorResearchAgent {
  constructor() {
    this.creators = [
      'inspiredmediaco', 'CatGPT', 'Taiwo Ade', 'mckenzie.mack',
      'bylillianzhang', 'graceandrewsss', 'erinondemand'
    ];
  }

  async research() {
    const taskPrompt = `Research what career content creators are posting and what's performing well.

TASK: Analyze recent content from top career creators to identify:
1. Topics getting high engagement
2. Content formats that are working
3. Audience pain points being addressed  
4. Trending hooks and angles
5. Successful content strategies

CREATORS TO ANALYZE:
${this.creators.join(', ')}

FOR EACH CREATOR (where accessible):
1. Recent top-performing content (past week)
2. Content themes and topics
3. Engagement patterns
4. Hook styles and formats
5. Audience responses and comments

CONTENT ANALYSIS:
- What career topics are trending
- Which content formats get most engagement
- Common pain points being addressed
- Successful messaging and hooks
- Audience sentiment and responses

OUTPUT REQUIRED:
- Top performing content themes
- Most engaging content formats
- Popular hooks and messaging styles
- Audience pain points discovered
- Content strategy insights
- Platform-specific trends

Note: This is for competitive research to identify trending topics and successful approaches, not to copy content.

Return analysis with creator names and content examples for reference.`;

    try {
      const result = await Task({
        subagent_type: 'general-purpose',
        description: 'Competitor content research',
        prompt: taskPrompt
      });

      return {
        data: this.parseCompetitorResults(result),
        sources: this.extractCompetitorSources(result)
      };
    } catch (error) {
      logger.error('Competitor research agent failed:', error);
      return { data: [], sources: [] };
    }
  }

  parseCompetitorResults(result) {
    try {
      return result || 'Competitor research completed';
    } catch (error) {
      logger.error('Error parsing competitor results:', error);
      return [];
    }
  }

  extractCompetitorSources(result) {
    const sources = [];
    try {
      this.creators.forEach(creator => {
        sources.push({
          type: 'social',
          platform: 'Social Media',
          creator: creator,
          title: `${creator} - Career Content Analysis`,
          accessed: new Date().toISOString()
        });
      });
    } catch (error) {
      logger.error('Error extracting competitor sources:', error);
    }
    return sources;
  }
}

export default new ResearchAgentService();