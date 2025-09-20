#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import oauth2ReportDelivery from './src/services/oauth2ReportDelivery.js';
import fs from 'fs/promises';

async function testSimpleGoogleDoc() {
  try {
    console.log('🔥 Testing simple Google Doc creation...');

    // Load the extracted perfect format as test data
    const perfectFormat = await fs.readFile('./EXTRACTED_PERFECT_FORMAT.md', 'utf-8');

    // Create a mock report structure based on the perfect format
    const mockReport = {
      metadata: {
        weekStart: "Sep 19, 2025",
        generated: new Date().toISOString(),
        totalSources: 52
      },
      executiveSummary: "This week reveals accelerated AI skills demand across industries, continued expansion of pay transparency legislation, and the formalization of hybrid work policies at major employers.",
      keyStories: [
        {
          title: "AI Skills Gap Reaches Critical Point as Investment Concentrates",
          link: "https://example.com/ai-skills-gap",
          why: "Multiple data sources show 67% of employers now require AI familiarity for mid-level roles, yet only 23% of professionals have hands-on experience—creating massive opportunity for targeted upskilling content.",
          sources: ["Harvard Business Review", "Forbes", "LinkedIn Workforce Report"],
          hooks: [
            "The AI skill gap just hit 67%—are you in the winning 23%?",
            "Companies are demanding AI skills faster than people can learn them",
            "While everyone fears AI taking jobs, smart professionals are taking AI skills"
          ],
          narrative: "Problem → Massive skills gap creating career vulnerability; Evidence → 67% employer demand vs 23% worker readiness; Application → Build systematic AI literacy plan focusing on practical applications, not theory.",
          storyHook: "Your company posts a new role requiring 'AI familiarity'—do you apply confidently or scroll past hoping they find someone else?",
          communityQuestion: "What's the first AI tool you actually use in your daily work—and how did you learn it?"
        }
      ],
      contentHooks: {
        challengeAssumptions: [
          "Most people think career pivots require starting over—here's why that's expensive advice",
          "The biggest mistake in salary negotiation isn't asking too high—it's this"
        ],
        dataBackedClaims: [
          "67% of employers now require AI skills—here's the 20% you actually need to learn",
          "Pay transparency laws in 15 states just changed negotiation forever"
        ]
      },
      platformIdeas: {
        tiktok: [
          "3 Career Red Flags Hidden in Every Job Posting - Quick visual breakdown with examples",
          "AI Skills You Can Learn This Weekend (That Employers Actually Want) - Fast-paced tutorial list"
        ],
        linkedin: [
          "The AI Skills Gap Reality Check - Carousel with data and actionable steps",
          "Pay Transparency Playbook: 15 States, 15 Strategies - Educational long-form post"
        ]
      },
      engagementPrompts: [
        "What's one career assumption you've completely changed your mind about this year?",
        "Share your biggest salary negotiation win (or lesson learned from a miss)"
      ],
      researchSources: [
        {
          category: "Strategic Growth & Skills Development",
          sources: [
            {
              title: "Harvard Business Review: AI Skills in the Modern Workplace",
              url: "https://hbr.org/ai-workplace-skills-2025",
              excerpt: "New research shows 67% of employers now require AI familiarity for mid-level positions..."
            }
          ]
        }
      ]
    };

    console.log('📝 Creating Google Doc with test data...');

    // Test the Google Doc creation
    const result = await oauth2ReportDelivery.createGoogleDoc(mockReport, "Test Report - Sept 20, 2025");

    console.log('✅ Google Doc created successfully!');
    console.log('🔗 Document URL:', result.url);
    console.log('📄 Document ID:', result.documentId);

    return result;
  } catch (error) {
    console.error('❌ Error testing Google Doc:', error);
    throw error;
  }
}

testSimpleGoogleDoc();