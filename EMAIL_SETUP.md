# Email & Google Docs Setup Guide

## Current Status ✅
- **Report Generation:** Fully working with real data
- **Content Analysis:** 15 high-quality ideas with platform recommendations  
- **Source Citations:** Complete tracking for further research
- **Demo Report:** `reports/demo-hanna-report-aug-20-2025.html`

## Next Steps for Full Automation

### 1. Email Configuration (5 minutes)
Add these to your `.env` file:

```bash
# Gmail configuration (recommended)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Or use any SMTP service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

**For Gmail:**
1. Enable 2-factor authentication
2. Create an "App Password" in Google Account settings
3. Use the app password (not your regular password)

### 2. Google Docs Integration (Optional)
Add to `.env` file:

```bash
# Google Service Account (for automatic Google Docs creation)
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Docs API and Google Drive API
4. Create a Service Account
5. Download the JSON key and add it to .env as a string

### 3. Test Email Delivery
Once configured, run:
```bash
npm run test-email
```

### 4. Schedule Weekly Reports
The system includes a scheduler. To activate:
```bash
npm run start-scheduler
```

## Current Report Quality

✅ **Week of Aug 21-28, 2025 Analysis:**
- 13 sources analyzed (Reddit, RSS, newsletters)
- 15 content ideas generated with:
  - Platform recommendations (TikTok, LinkedIn, Instagram)
  - Hanna's proven hook styles
  - Target audience mapping
  - Engagement potential scoring
- Executive summary with strategic insights
- Next week's monitoring watchlist
- Full source citations

## Files Ready for Review
1. `reports/demo-hanna-report-aug-20-2025.html` - Formatted preview
2. `reports/weekly-report-2025-08-28.md` - Full markdown report
3. `reports/weekly-report-2025-08-28.json` - Structured data

## Test Command
```bash
# Generate and deliver report for specific week
npm run weekly-report

# Test with email delivery (once configured)
node src/scripts/testReportDelivery.js
```

The system is production-ready! Just need email credentials to start automated delivery to `nick@stellarstreamai.com`.