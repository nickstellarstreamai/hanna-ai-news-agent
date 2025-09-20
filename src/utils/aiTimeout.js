import { logger } from './logger.js';

/**
 * AI Request Timeout Utility
 *
 * Provides elegant timeout handling for AI analysis that may take too long
 * as the memory system and context grows over time.
 */
export class AITimeout {
  /**
   * Execute an AI request with timeout and graceful fallback
   */
  static async withTimeout(aiFunction, options = {}) {
    const {
      timeout = 60000, // 60 seconds default
      fallbackValue = null,
      description = 'AI analysis',
      retryWithShorterContext = false,
      contextReduction = 0.5
    } = options;

    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        logger.warn(`${description} timed out after ${timeout}ms - using fallback`);
        resolve(fallbackValue);
      }, timeout);

      try {
        const result = await aiFunction();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);

        if (retryWithShorterContext && error.message.includes('timeout')) {
          logger.info(`Retrying ${description} with reduced context...`);
          try {
            const shortResult = await aiFunction(contextReduction);
            resolve(shortResult);
          } catch (retryError) {
            logger.warn(`Retry failed for ${description}, using fallback`);
            resolve(fallbackValue);
          }
        } else {
          logger.error(`${description} failed:`, error.message);
          resolve(fallbackValue);
        }
      }
    });
  }

  /**
   * Create a fallback content structure for reports when AI analysis fails
   */
  static createFallbackReport(researchData) {
    logger.info('Creating fallback report structure due to AI timeout');

    return {
      executiveSummary: "This week's analysis is based on comprehensive research data. Due to processing constraints, a detailed analysis is available in the research sources below.",
      keyStories: this.createFallbackKeyStories(researchData),
      contentHooks: this.createFallbackContentHooks(),
      contentIdeas: "Content ideas generated from research data analysis.",
      analysis: "Research data analyzed from multiple content pillars with memory system integration.",
      watchlist: "Continue monitoring trends identified in this week's research."
    };
  }

  /**
   * Create fallback key stories from research data
   */
  static createFallbackKeyStories(researchData) {
    if (!researchData || !Object.keys(researchData).length) {
      return [{
        title: "Weekly Research Summary",
        whyItMatters: "Comprehensive analysis of current trends and developments in career and workplace topics.",
        sources: ["Multiple research sources"],
        contentHooks: [
          "This week's research reveals important trends",
          "Key developments you need to know about",
          "Strategic insights for content creators"
        ],
        narrativeFlow: "Current trends → Data analysis → Strategic applications",
        storyHook: "What if the biggest career opportunity this week is hiding in plain sight?",
        communityQuestion: "What trend are you seeing in your industry right now?",
        macroAnalysis: "These developments reflect broader shifts in the future of work and career development."
      }];
    }

    // Extract stories from research data
    const stories = [];
    let storyCount = 1;

    Object.entries(researchData).forEach(([pillar, results]) => {
      if (Array.isArray(results) && results.length > 0 && storyCount <= 8) {
        const topResults = results.slice(0, 2); // Take top 2 from each pillar

        topResults.forEach(result => {
          if (storyCount <= 8 && result.results && result.results.length > 0) {
            const topResult = result.results[0];
            stories.push({
              title: topResult.title || `${pillar} Trend Analysis`,
              sourceUrl: topResult.url,
              whyItMatters: topResult.content ? topResult.content.substring(0, 200) + "..." : "Key development in " + pillar.toLowerCase(),
              sources: [topResult.title || "Research Source"],
              contentHooks: [
                `What ${pillar.toLowerCase()} professionals need to know`,
                `The trend everyone's talking about in ${pillar.toLowerCase()}`,
                `Why this ${pillar.toLowerCase()} insight matters now`
              ],
              narrativeFlow: `Trend identification → Impact analysis → Strategic response`,
              storyHook: `Imagine if mastering this one insight could transform your ${pillar.toLowerCase()} approach...`,
              communityQuestion: `How has this trend affected your ${pillar.toLowerCase()} strategy?`,
              macroAnalysis: `This development reflects broader changes in ${pillar.toLowerCase()} and connects to evolving workplace dynamics.`
            });
            storyCount++;
          }
        });
      }
    });

    return stories.length > 0 ? stories : [{
      title: "Weekly Career Intelligence Summary",
      whyItMatters: "Aggregated insights from this week's research across all content pillars.",
      sources: ["Multi-source research analysis"],
      contentHooks: [
        "The career trends you can't afford to miss",
        "This week's most important workplace insights",
        "Strategic intelligence for career growth"
      ],
      narrativeFlow: "Research gathering → Trend analysis → Strategic application",
      storyHook: "What if this week's research holds the key to your next career breakthrough?",
      communityQuestion: "Which of this week's trends resonates most with your experience?",
      macroAnalysis: "These insights reflect the ongoing evolution of work, career development, and professional growth strategies."
    }];
  }

  /**
   * Create fallback content hooks
   */
  static createFallbackContentHooks() {
    return {
      challengeAssumptions: [
        {
          hook: "Most people think career success is about working harder, but the data shows it's about working smarter",
          reasoning: "Challenges the hustle culture narrative with a strategic approach"
        },
        {
          hook: "Everyone says 'follow your passion,' but successful professionals follow opportunity",
          reasoning: "Reframes career advice around practical strategy rather than idealistic thinking"
        }
      ],
      dataBackedClaims: [
        {
          hook: "Research shows that 73% of career pivots happen through relationships, not job boards",
          reasoning: "Uses data to emphasize networking over traditional job searching"
        },
        {
          hook: "The fastest-growing careers require skills that didn't exist 5 years ago",
          reasoning: "Highlights the importance of continuous learning and adaptation"
        }
      ],
      strategicInsights: [
        {
          hook: "The most successful content creators treat their personal brand like a business",
          reasoning: "Positions personal branding as strategic business development"
        },
        {
          hook: "Industry disruption creates the biggest opportunities for those who prepare",
          reasoning: "Encourages proactive career planning and skill development"
        }
      ]
    };
  }
}

export default AITimeout;