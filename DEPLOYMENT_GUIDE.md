# 🚀 Hanna AI News Agent - Railway Deployment Guide

## Prerequisites
- Railway account (https://railway.app/)
- All API keys and credentials ready
- GitHub repository up to date

## Step 1: Connect Railway to GitHub

1. **Login to Railway**: Go to https://railway.app/ and login
2. **New Project**: Click "New Project"
3. **Deploy from GitHub**: Select "Deploy from GitHub repo"
4. **Select Repository**: Choose `nickstellarstreamai/hanna-ai-news-agent`
5. **Authorize**: Give Railway access to your GitHub account if needed

## Step 2: Configure Environment Variables

In Railway dashboard, go to your project → **Variables** tab and add these:

### 🤖 AI API Keys
```
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
TAVILY_API_KEY=your_tavily_key_here
```

### 🔐 Google OAuth2 (Critical for Google Docs)
```
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

### 📧 Email Configuration
```
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
REPORT_TO_EMAIL=hanna@hannagetshired.com
REPORT_CC_EMAIL=nick@stellarstreamai.com
```

### ⚙️ System Settings
```
NODE_ENV=production
TZ=America/Los_Angeles
PORT=3000
```

## Step 3: Upload Google OAuth Token

1. **Settings Tab** in Railway
2. **Volume** section
3. Upload your local `data/google-oauth-token.json` file
4. Mount it to `/app/data/google-oauth-token.json`

## Step 4: Deploy

1. Railway will automatically build and deploy
2. Wait for deployment to complete (usually 2-3 minutes)
3. Check **Deployments** tab for status

## Step 5: Test the Live System

1. **Get your Railway URL** from the dashboard
2. **Test endpoint**: Visit `https://your-app.railway.app/health`
3. **Manual report test**: Visit `https://your-app.railway.app/api/generate-report`

## Step 6: Verify Automation

The system will automatically:
- ✅ Send weekly reports every Monday at 7 AM Pacific
- ✅ Create Google Docs in your Drive
- ✅ Email Hanna and Nick
- ✅ Track historical data to avoid duplication

## 🚨 Important Notes

### Database
Railway will automatically create a persistent volume for your SQLite database.

### Monitoring
- Check Railway **Logs** tab for any issues
- Reports are automatically logged with timestamps
- Failed reports will retry automatically

### Costs
- Railway: ~$5-20/month depending on usage
- APIs: Tavily (1000 free searches), OpenAI (~$10-50/month)

## 🆘 Troubleshooting

### If deployment fails:
1. Check **Logs** in Railway dashboard
2. Verify all environment variables are set
3. Ensure Google OAuth token is uploaded correctly

### If reports don't send:
1. Check email credentials in Variables
2. Verify Google OAuth token is valid
3. Check Railway logs for error messages

### If Google Docs fail:
1. Verify OAuth token is properly uploaded
2. Check Google API quotas
3. Ensure proper folder permissions

## ✅ Success Indicators

You'll know it's working when:
- Railway shows "Deployed" status
- Health check endpoint responds
- First test report creates Google Doc and sends email
- Logs show "Weekly report generated successfully"

## 🔄 Updates

When you push code changes to GitHub, Railway automatically rebuilds and redeploys. No manual intervention needed!