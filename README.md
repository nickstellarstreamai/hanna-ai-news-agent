# Hanna AI News Agent

An AI-powered content intelligence system for career/work content creators. Automatically generates weekly content ideas, tracks trends, and provides an interactive chatbot assistant.

## Features

🤖 **AI Content Assistant**: Interactive chatbot that knows everything about trends, competitors, and historical performance  
📊 **Weekly Reports**: Automated reports with 12-20 content ideas, themes, and trends  
🎯 **Content Pillars**: Organized around career development, workplace culture, leadership, salary negotiation, personal branding, and future of work  
📰 **Multi-Source Intelligence**: Real-time web search via Tavily API, legacy RSS feeds, Reddit, and social media  
📱 **Platform-Specific Ideas**: TikTok and LinkedIn optimized content with hooks, formats, and key points  
📈 **Performance Analytics**: Track what works and generate ideas based on historical winners  
💬 **Slack Integration**: Weekly summaries posted automatically to Slack  

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

# Optional: Google Docs integration
GOOGLE_SERVICE_ACCOUNT_JSON=path/to/service-account.json

# Optional: Slack notifications  
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CHANNEL_ID=your_channel_id

# Reddit API (optional)
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
```

### 3. Run the System

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
- **Weekly Reports**: Every Monday at 9 AM PT (configurable)
- **Data Ingestion**: Continuous background updates
- **Slack Notifications**: Automatic weekly summaries

## Tavily Integration

This system now uses **Tavily's AI-powered search API** as the primary data source, replacing many unreliable RSS feeds with real-time, AI-optimized web content.

### Key Benefits:
- **Real-time Content**: Fresh web data instead of stale RSS feeds
- **AI-Optimized**: Results designed specifically for LLM consumption
- **Cost Effective**: 1,000 free searches per month
- **Content Pillar Mapping**: Searches automatically align with Hanna's 5 content pillars
- **Strategy Integration**: Full context from Hanna's 2025 Content Pillar Strategy
- **Citation Ready**: All results include proper source citations

### Search Strategy:
The system generates targeted searches for each of Hanna's content pillars:
1. **Career Clarity & Goals**: Career assessment, pivot strategies, goal setting
2. **Personal Branding & Visibility**: LinkedIn optimization, networking, thought leadership
3. **Strategic Growth & Skills**: Salary negotiation, upskilling, advancement tactics
4. **Workplace Trends & Advocacy**: Remote work, pay transparency, diversity initiatives
5. **Work that Complements Life**: Work-life balance, burnout prevention, flexibility

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