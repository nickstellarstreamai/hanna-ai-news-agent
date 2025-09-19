# Setup Guide - Hanna AI News Agent

This guide will walk you through setting up the AI news agent step by step.

## Prerequisites

- Node.js 18+ installed
- At least one AI API key (OpenAI or Anthropic)
- Optional: Google account for Google Docs integration
- Optional: Slack workspace for notifications

## Step 1: Basic Setup

### 1.1 Install Dependencies

```bash
cd hanna-ai-news-agent
npm install
```

### 1.2 Create Environment File

```bash
cp .env.example .env
```

### 1.3 Configure Required APIs

**Option A: OpenAI (Recommended)**
```bash
OPENAI_API_KEY=sk-your-openai-key-here
```

**Option B: Anthropic (Alternative)**  
```bash
ANTHROPIC_API_KEY=your-anthropic-key-here
```

You only need one, but both can be configured for redundancy.

## Step 2: Test Basic Functionality

### 2.1 Test the System

```bash
npm start
```

Visit `http://localhost:3000/health` - you should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "slack": "disabled"
  }
}
```

### 2.2 Generate Your First Report

```bash
npm run weekly-report
```

This will:
- Create a database
- Ingest news from RSS feeds and Reddit
- Generate mock social media data
- Analyze content and create themes
- Generate 15+ content ideas
- Save everything to `./reports/weekly-report-YYYY-MM-DD.md`

## Step 3: Optional Integrations

### 3.1 Google Docs (Recommended)

This allows reports to be created as Google Docs instead of local files.

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable APIs**
   - Enable Google Docs API
   - Enable Google Drive API

3. **Create Service Account**
   - Go to IAM & Admin > Service Accounts
   - Create new service account
   - Download JSON key file

4. **Configure Environment**
   ```bash
   GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/your/service-account-key.json
   ```

### 3.2 Slack Integration (Recommended)

Get weekly reports posted automatically to Slack.

1. **Create Slack App**
   - Go to [Slack API](https://api.slack.com/apps)
   - Create new app "Hanna News Agent"
   - Go to "OAuth & Permissions"

2. **Set Bot Permissions**
   - Add `chat:write` scope
   - Add `channels:read` scope

3. **Install to Workspace**
   - Install app to your workspace
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`)

4. **Get Channel ID**
   - Right-click on your target channel in Slack
   - Copy link - the channel ID is the last part after the last `/`

5. **Configure Environment**
   ```bash
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_CHANNEL_ID=C1234567890
   ```

6. **Test Slack Integration**
   ```bash
   npm run weekly-report -- --slack
   ```

### 3.3 Social Media APIs (Optional)

For real social media data instead of mock data.

**TikTok Research API**
```bash
TIKTOK_API_KEY=your-tiktok-research-api-key
```

**LinkedIn API**
```bash  
LINKEDIN_API_KEY=your-linkedin-api-key
```

**Reddit API**
```bash
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
REDDIT_USER_AGENT=HannaNewsAgent/1.0
```

## Step 4: Import Hanna's Historical Data

### 4.1 Prepare Data File

**CSV Format** (`hanna_posts.csv`):
```csv
platform,content,date,likes,comments,shares,views
tiktok,"5 signs it's time to quit your job",2024-01-01,1500,89,34,25000
linkedin,"The hidden job market strategy that got me hired",2024-01-02,245,23,12,3400
```

**JSON Format** (`hanna_posts.json`):
```json
[
  {
    "platform": "tiktok",
    "content": "5 signs it's time to quit your job",
    "date": "2024-01-01T00:00:00.000Z",
    "metrics": {
      "likes": 1500,
      "comments": 89,
      "shares": 34,
      "views": 25000
    }
  }
]
```

### 4.2 Import the Data

```bash
# Import CSV
node src/scripts/importHannaData.js ./hanna_posts.csv

# Import JSON  
node src/scripts/importHannaData.js ./hanna_posts.json
```

## Step 5: Set Up Automation

### 5.1 Configure Schedule

Edit `.env`:
```bash
WEEKLY_REPORT_DAY=1      # Monday = 1, Sunday = 0
WEEKLY_REPORT_HOUR=9     # 9 AM
TIMEZONE=America/Los_Angeles
```

### 5.2 Start the Server

```bash
npm start
```

The system will now:
- Generate reports every Monday at 9 AM PT
- Post to Slack automatically (if configured)
- Keep the chatbot API running at all times

### 5.3 Production Deployment (Optional)

**Using PM2:**
```bash
npm install -g pm2
pm2 start src/index.js --name hanna-news-agent
pm2 startup
pm2 save
```

**Using Docker:**
```bash
# Create Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]

# Build and run
docker build -t hanna-news-agent .
docker run -p 3000:3000 --env-file .env hanna-news-agent
```

## Step 6: Test the Chatbot

### 6.1 API Test

```bash
curl -X POST http://localhost:3000/api/chat/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "hanna",
    "message": "What should I post on TikTok today?"
  }'
```

### 6.2 Common Queries

Try these with the chatbot:

- "What's trending in career content this week?"
- "Give me 3 LinkedIn ideas about salary negotiation"  
- "What should I post about remote work on TikTok?"
- "How can I create content about job interviews?"
- "What topics should I avoid this week?"
- "Show me my top performing content themes"

## Step 7: Monitoring & Maintenance

### 7.1 Check System Status

Visit: `http://localhost:3000/api/status`

### 7.2 View Logs

```bash
# Real-time logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log
```

### 7.3 Database Maintenance

```bash
# Check database size
ls -lh data/news_agent.db

# Backup database
cp data/news_agent.db data/backup_$(date +%Y%m%d).db
```

## Troubleshooting

### Common Issues

**"Database initialization failed"**
- Check file permissions in `./data/` directory
- Ensure sufficient disk space

**"OpenAI API error: Invalid key"**  
- Verify API key in `.env` file
- Check API key has sufficient credits

**"Slack posting failed"**
- Verify bot token starts with `xoxb-`
- Ensure bot is added to target channel
- Check bot has `chat:write` permission

**"No content ingested"**
- Check internet connection
- Some RSS feeds may be temporarily down (normal)
- Reddit API may require authentication for higher limits

**"Report generation takes too long"**
- This is normal for first run (creating embeddings)
- Subsequent runs are faster
- Consider using Anthropic API for faster responses

### Performance Optimization

**Reduce processing time:**
- Set `MAX_ARTICLES_PER_SOURCE=10` in `.env`
- Use Anthropic instead of OpenAI (faster)
- Limit social media creator list

**Reduce API costs:**
- Use OpenAI GPT-3.5-turbo instead of GPT-4
- Reduce `targetCount` in idea generation
- Cache responses when possible

### Getting Help

1. Check logs in `./logs/` directory
2. Test individual components:
   ```bash
   # Test news ingestion only
   node -e "import('./src/services/newsIngestion.js').then(s => s.default.ingestAllSources())"
   
   # Test idea generation only  
   node -e "import('./src/services/ideaGeneration.js').then(s => s.default.generateCustomIdea('remote work trends'))"
   ```
3. Verify environment variables are loaded correctly

## Success Checklist

After setup, you should have:

- ✅ Server running at `http://localhost:3000`
- ✅ Weekly reports generating successfully  
- ✅ Chatbot responding to queries
- ✅ Slack notifications (if configured)
- ✅ Historical data imported (if applicable)
- ✅ Automated scheduling working
- ✅ All logs showing no critical errors

You're now ready to use the Hanna AI News Agent! 🎉