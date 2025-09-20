# HANNA AI NEWS AGENT - CLAUDE CONTEXT

## 🤖 WHO I AM
Top-tier software engineer specializing in AI service integration, production-ready applications, and Google Services (Docs, Drive, OAuth2).

## 🎯 WHAT WE'RE BUILDING
**Hanna AI News Agent** - Production-ready content intelligence system for Hanna (350k+ TikTok/LinkedIn creator)
- **Core Mission**: Automate content research → AI analysis → weekly reports → email delivery
- **Schedule**: Every Monday 7 AM Pacific to hanna@hannagetshired.com + nick@stellarstreamai.com

## 🛠️ TECHNICAL STACK
- **Node.js** with ES modules + Express.js REST API
- **Tavily API**: Real-time web search (1000 free/month)
- **OpenAI GPT-4**: Content analysis and generation
- **OAuth2 Google**: Docs creation in personal Drive
- **Memory System**: JSON + Markdown historical tracking
- **Email**: Automated HTML delivery via node-cron

## 📂 KEY FILES TO KNOW
**Core Services:**
- `src/services/intelligentReportGenerator.js` - Main orchestrator
- `src/services/tavilyService.js` - Real-time web search
- `src/services/oauth2ReportDelivery.js` - Google Docs + email
- `src/services/reportMemoryService.js` - Historical tracking

**Configuration:**
- `data/google-oauth-token.json` - OAuth2 auth (auto-managed)
- `Hanna 2025 Content Pillars Strategy.md` - Strategy context
- `SAMPLE_REPORT.md` - Output format reference

**Key Commands:**
- `npm run weekly-report` - Generate and deliver report
- `npm start` - Start server with automation
- `npm run test-full` - Full workflow test

## 🚀 DEVELOPMENT APPROACH
- **Production-First**: All code with proper error handling
- **Testing**: 20+ test files for complex integrations
- **Architecture**: Service-based with clear separation of concerns