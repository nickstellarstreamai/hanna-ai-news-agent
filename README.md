# Hanna AI News Agent

An AI-powered content intelligence system for career/work content creators. Uses real-time web search (Tavily API), memory-enhanced analysis, and OAuth2 Google Docs integration to automatically generate strategic weekly intelligence reports with 15+ content ideas, trend analysis, and professional delivery.

## Features

🔍 **Real-Time Web Search**: Tavily API integration for fresh content discovery (1000 free searches/month)
🧠 **Memory System**: Historical tracking prevents duplication and builds narrative continuity across reports
📄 **OAuth2 Google Docs**: Reliable document creation using personal Google Drive storage
📊 **Strategic Reports**: Weekly intelligence with detailed frameworks matching Hanna's content strategy
📧 **Automated Email Delivery**: Professional HTML reports to hanna@hannagetshired.com + nick@stellarstreamai.com
🎯 **Content Pillars**: 5 specialized categories aligned with Hanna's 2025 strategy
📱 **Platform-Specific Ideas**: TikTok and LinkedIn content with hooks, narratives, and engagement prompts
🤖 **AI Content Assistant**: Interactive chatbot with trend knowledge and historical performance
💬 **Slack Integration**: Weekly summaries posted automatically to Slack
⏰ **Automated Scheduling**: Monday 7 AM Pacific Time delivery  

## Quick Start

### 1. Installation

```bash
# Clone or download the project
cd hanna-ai-news-agent

# Install dependencies  
npm install

# Copy environment file
cp .env.example .env
```

### 2. Configuration

Edit `.env` with your API keys:

```bash
# Required: At least one AI provider
OPENAI_API_KEY=your_openai_key_here
# OR
ANTHROPIC_API_KEY=your_anthropic_key_here

# Required: Tavily search API (1000 free searches/month)
TAVILY_API_KEY=your_tavily_key_here

# Optional: Social Media APIs
TIKTOK_API_KEY=your_tiktok_key_here
LINKEDIN_API_KEY=your_linkedin_key_here

# Required: OAuth2 for Google Docs integration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Optional: Slack notifications  
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=your_channel_id

# Reddit API (optional)
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
```

### 3. Setup OAuth2 for Google Drive/Docs

```bash
# Setup OAuth2 authentication (one-time)
node setup-oauth2.js

# Follow the browser authorization flow
# This saves tokens for automated Google Docs creation
```

### 4. Run the System

```bash
# Start the server
npm start

# Or run in development mode
npm run dev
```

The server will be available at `http://localhost:3000`

## Usage

### Generate Weekly Report

```bash
# Manual generation with Tavily integration
npm run weekly-report

# Test Tavily integration specifically
node test-tavily-integration.js

# Test full workflow with Tavily
node test-full-workflow-with-tavily.js

# With Slack posting
npm run weekly-report -- --slack

# For specific week
npm run weekly-report -- 2024-01-08
```

### Import Hanna's Historical Data

```bash
# From CSV file
node src/scripts/importHannaData.js ./data/hanna_posts.csv

# From JSON file  
node src/scripts/importHannaData.js ./data/hanna_posts.json
```

### Use the Chatbot API

```bash
curl -X POST http://localhost:3000/api/chat/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "hanna",
    "message": "What should I post on TikTok today about salary negotiation?"
  }'
```

### Check System Health

```bash
curl http://localhost:3000/health
```

## API Endpoints

### Chatbot
- `POST /api/chat/chat` - Send message to AI assistant
- `GET /api/chat/suggestions` - Get conversation starters
- `POST /api/chat/generate-idea` - Generate specific content idea

### Reports  
- `POST /api/reports/generate` - Generate new weekly report
- `GET /api/reports/recent` - Get recent reports
- `GET /api/reports/:id` - Get specific report
- `GET /api/reports/:id/ideas` - Get ideas from specific report

### System
- `GET /health` - Basic health check
- `GET /api/status` - Detailed system status

## Content Pillars

The system organizes content around 6 main pillars:

1. **Career Development** - Job search, transitions, skill building
2. **Workplace Culture** - Remote work, team dynamics, company culture  
3. **Leadership & Management** - Executive presence, team management
4. **Salary & Negotiation** - Compensation, pay transparency
5. **Personal Branding** - LinkedIn strategy, professional presence
6. **Future of Work** - AI impact, automation, gig economy

## Data Sources

### News & Trends
- LinkedIn News, HR Brew, Harvard Business Review
- Morning Brew, FlexOS Future of Work
- Substacks: Joel Uili, Laetitia@Work, Adam Grant, FullStack HR

### Social Media  
- **Competitors**: inspiredmediaco, CatGPT, Taiwo Ade, mckenzie.mack, bylillianzhang, graceandrewsss, erinondemand, siliconvalleygirl, gannon.meyer, tomnoske
- **Career Focused**: internshipgirl, Sophworkbaby, Kyyahabdul, Janel Abrahami

### Reddit Communities
- r/AskManagers, r/careerguidance, r/jobs, r/recruitinghell
- r/negotiation, r/futureofwork, r/resumes, r/sidehustle

## Weekly Report Format

Each weekly report includes:

### Executive Summary  
3 bullet points highlighting key trends and opportunities

### Content Ideas (12-20)
- Platform recommendation (TikTok/LinkedIn)
- Format suggestion (talking head, carousel, etc.)
- 3 hook options  
- 3-5 key points to cover
- Rationale for why it fits
- Source links for credibility

### Themes & Trends
- 3-7 thematic clusters from the week's content
- Engagement metrics and insights

### Watchlist
- 10 keywords/topics to monitor next week

## Chatbot Capabilities

Ask the AI assistant:

- "What's trending in career content this week?"
- "Give me 3 TikTok ideas about remote work" 
- "I need a LinkedIn carousel about salary negotiation"
- "What would you post today about AI and jobs?"
- "What's your opinion on posting about layoffs?"

The chatbot has access to:
- All historical weekly reports  
- Hanna's performance data
- Competitor insights
- Real-time trends and news
- Content pillar expertise

## Scheduled Automation

The system runs automatically:
- **Weekly Reports**: Every Monday at 7:00 AM Pacific Time (configured)
- **Email Delivery**: Professional reports to hanna@hannagetshired.com + nick@stellarstreamai.com
- **Google Docs**: Automatic creation in "Hanna AI Weekly Reports" folder
- **Memory System**: Historical tracking and pattern analysis
- **Slack Notifications**: Automatic weekly summaries (optional)

## System Architecture

### **Core Integrations**

**🔍 Tavily API Integration**
- **Primary Data Source**: Real-time web search replacing unreliable RSS feeds
- **Search Strategy**: Targeted queries across 5 content pillars
- **Cost**: 1,000 free searches per month (current usage: ~50/month)
- **Quality**: AI-optimized results with citations designed for LLM consumption

**🧠 Memory System**
- **Historical Tracking**: `data/report-memory.json` stores past report summaries
- **Pattern Analysis**: `data/cumulative-insights.md` identifies trends and gaps
- **Duplication Prevention**: AI analysis includes historical context
- **Narrative Continuity**: Builds on previous insights across weeks

**🔐 OAuth2 Google Docs**
- **Authentication**: Personal Google Drive using OAuth2 (not service account)
- **Storage**: 15 GB personal Drive storage (no quota issues)
- **Format**: Professional documents matching `SAMPLE_REPORT.md` structure
- **Sharing**: Automatic public sharing with anyone-with-link permissions

**📧 Email Automation**
- **Recipients**: hanna@hannagetshired.com (primary) + nick@stellarstreamai.com (CC)
- **Schedule**: Every Monday 7:00 AM Pacific Time
- **Format**: Professional HTML with Google Doc links and content previews

**📈 Strategy Integration**
- **Context Document**: `Hanna 2025 Content Pillars Strategy.md`
- **AI Analysis**: GPT-4 with full strategy context
- **Content Alignment**: Supports Momentum Tracker, coaching, membership goals

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tavily API    │    │ Social Platforms│    │   Hanna Data    │
│                 │    │                 │    │                 │
│ • Real-time Web │    │ • TikTok API    │    │ • Analytics     │
│ • AI-Optimized  │    │ • LinkedIn API  │    │ • Historical    │
│ • Content Pillars│   │ • Mock Data     │    │ • Performance   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └─────────────────────────┼───────────────────────┘
                                   │
                    ┌─────────────────────────────┐
                    │     Data Ingestion          │
                    │                             │
                    │ • Content Classification    │
                    │ • Pillar Mapping           │  
                    │ • Engagement Scoring       │
                    └─────────────────────────────┘
                                   │
                    ┌─────────────────────────────┐
                    │    Content Analysis         │
                    │                             │
                    │ • Semantic Clustering      │
                    │ • Theme Detection          │
                    │ • Trend Analysis           │
                    └─────────────────────────────┘
                                   │
                    ┌─────────────────────────────┐
                    │    Idea Generation          │
                    │                             │
                    │ • Platform-specific Ideas  │
                    │ • Hook Generation          │
                    │ • Historical Winners       │
                    └─────────────────────────────┘
                                   │
         ┌─────────────────────────────────────────────────┐
         │                                                 │
┌─────────────────┐                            ┌─────────────────┐
│ Weekly Reports  │                            │   AI Chatbot    │
│                 │                            │                 │
│ • Google Docs   │                            │ • OpenAI/Claude │
│ • Local Files   │                            │ • Context-aware │
│ • Database      │                            │ • Multi-turn    │
└─────────────────┘                            └─────────────────┘
         │                                                 │
         └─────────────────────┐      ┌────────────────────┘
                               │      │
                    ┌─────────────────────────────┐
                    │    Output Channels          │
                    │                             │
                    │ • Slack Notifications      │
                    │ • REST API                 │
                    │ • Web Interface            │
                    └─────────────────────────────┘
```

## Development

### Project Structure
```
src/
├── config/          # Configuration files
│   ├── contentPillars.js
│   ├── dataSources.js  
│   └── database.js
├── services/        # Core business logic
│   ├── newsIngestion.js
│   ├── socialMediaService.js
│   ├── contentAnalysis.js
│   ├── ideaGeneration.js
│   ├── reportGeneration.js
│   ├── chatbotService.js
│   └── slackService.js
├── api/            # REST API routes
│   ├── chatbot.js
│   └── reports.js
├── scripts/        # Utility scripts
│   ├── generateWeeklyReport.js
│   └── importHannaData.js
├── utils/          # Helper utilities
│   └── logger.js
└── index.js        # Main application
```

### Adding New Data Sources

1. Update `src/config/dataSources.js`
2. Extend ingestion logic in `src/services/newsIngestion.js`
3. Add any new pillars to `src/config/contentPillars.js`

### Customizing Content Pillars

Edit `src/config/contentPillars.js` to modify:
- Pillar names and descriptions
- Keywords for content classification  
- Sample topics

### Extending the Chatbot

The chatbot automatically learns from:
- New weekly reports
- Imported analytics data
- Updated content pillars
- Fresh ingestion data

No additional training required.

## Support

For issues or questions:
1. Check the logs in `./logs/` directory
2. Verify API keys in `.env` file
3. Test individual components with the provided scripts
4. Check system status at `/api/status` endpoint

## Success Metrics

Track these metrics to measure system effectiveness:

- **Usage**: Hanna selects ≥3 ideas/week from reports or chatbot
- **Engagement**: +15% median engagement on posts derived from system ideas  
- **Trust**: ≥4/5 usefulness rating for weekly reports
- **Coverage**: ≥70% of ideas map clearly to content pillars
- **Sources**: ≥80% of ideas include credible citations

---

*🤖 Generated with Claude Code - AI-powered content intelligence for @hannagetshired*