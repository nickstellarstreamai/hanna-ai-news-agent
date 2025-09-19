# 🚀 Quick Start Guide - Hanna AI News Agent

*Updated September 19, 2025 - Production Ready System*

## ⚡ **One-Command Setup**

```bash
# 1. Clone and install
git clone https://github.com/nickstellarstreamai/hanna-ai-news-agent.git
cd hanna-ai-news-agent
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys (see below)

# 3. Setup OAuth2 for Google Docs (one-time)
node setup-oauth2.js

# 4. Start the system
npm start
```

## 🔑 **Required API Keys**

Add these to your `.env` file:

```bash
# AI Provider (required)
OPENAI_API_KEY=your_openai_key

# Tavily Search (required - 1000 free/month)
TAVILY_API_KEY=your_tavily_key

# OAuth2 Google (required)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Email delivery (required)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password

# Recipients (required)
REPORT_TO_EMAIL=hanna@hannagetshired.com
REPORT_CC_EMAIL=nick@stellarstreamai.com
```

## 🎯 **Get API Keys**

1. **Tavily**: Sign up at https://tavily.com (1000 free searches/month)
2. **OpenAI**: Get key at https://platform.openai.com/api-keys
3. **Google OAuth2**: Follow `OAUTH2_SETUP_GUIDE.md`
4. **Gmail**: Generate App Password in Google Account settings

## ✅ **Verify Setup**

```bash
# Test individual components
node setup-oauth2.js          # Setup Google OAuth2
npm run weekly-report          # Generate test report

# Check automation
curl http://localhost:3000/health
```

## 📧 **Expected Output**

Every Monday 7 AM Pacific, both email addresses receive:
- Professional HTML email with report preview
- Working Google Doc link with complete intelligence report
- 15+ strategic content ideas with hooks and engagement prompts
- Research sources with clickable links
- Platform-specific TikTok and LinkedIn ideas

## 🔧 **Troubleshooting**

**Email not sending?**
- Verify Gmail App Password (not regular password)
- Check EMAIL_USER and EMAIL_PASSWORD in .env

**Google Docs not working?**
- Run `node setup-oauth2.js` to re-authorize
- Check OAuth2 credentials in .env

**Tavily searches failing?**
- Verify TAVILY_API_KEY in .env
- Check usage at https://tavily.com dashboard

## 📊 **System Status**

- **✅ Production Ready**: All systems tested and operational
- **✅ Memory System**: Prevents content duplication across weeks
- **✅ Strategy Integration**: Uses Hanna's complete 2025 content strategy
- **✅ Automated Delivery**: Monday 7 AM Pacific to both recipients
- **✅ Professional Quality**: Enterprise-level formatting and analysis

The system is ready for immediate production use!