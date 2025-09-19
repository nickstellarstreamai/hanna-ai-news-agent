# Google Docs & Drive Integration Setup

## What This Will Enable
✅ **Automatic Google Doc Creation** - Full reports with formatting  
✅ **Organized Drive Folder** - "Hanna AI Weekly Reports" folder  
✅ **Direct Email Links** - Click to open the actual Google Doc  
✅ **Shareable Reports** - Easy to share with team members  

---

## Step 1: Create Google Cloud Project & Service Account

### 1.1 Go to Google Cloud Console
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
   - Project name: "Hanna AI Reports" (or similar)

### 1.2 Enable Required APIs
1. Go to **APIs & Services** → **Library**
2. Search and enable these APIs:
   - **Google Docs API**
   - **Google Drive API**

### 1.3 Create Service Account
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Service account details:
   - Name: `hanna-ai-reports`
   - Description: `Service account for Hanna AI weekly reports`
4. Click **Create and Continue**
5. Skip role assignment for now (click **Continue**)
6. Click **Done**

### 1.4 Generate Service Account Key
1. Click on the created service account
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create** - this downloads the JSON file

---

## Step 2: Configure the Service Account

### 2.1 Add to .env File
1. Open the downloaded JSON file
2. Copy the entire contents
3. Add to your `.env` file:
```bash
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
```

### 2.2 Share Drive Folder (Important!)
1. Create a folder in your Google Drive called "Hanna AI Weekly Reports"
2. Right-click the folder → **Share**
3. Add the service account email (from the JSON file)
   - Email looks like: `hanna-ai-reports@your-project.iam.gserviceaccount.com`
4. Give it **Editor** permissions
5. Click **Send**

---

## Step 3: Test the Integration

Once configured, run:
```bash
npm run test-google-docs
```

This will:
- ✅ Test Google Docs API connection
- ✅ Create a sample Google Doc
- ✅ Organize it in the proper Drive folder
- ✅ Send test email with working Google Doc link

---

## What You'll Get

### Automatic Google Doc Features:
- **Professional formatting** with headers, tables, and styling
- **Complete report content** - all 15 content ideas, analysis, sources
- **Clickable links** to all research sources  
- **Table of contents** for easy navigation
- **Hanna branding** and consistent formatting

### Google Drive Organization:
```
📁 Hanna AI Weekly Reports/
├── 📄 Week of Aug 20, 2025 - Intelligence Report
├── 📄 Week of Aug 27, 2025 - Intelligence Report  
├── 📄 Week of Sep 03, 2025 - Intelligence Report
└── ...
```

### Email Integration:
- Single "View Complete Report" button
- Links directly to the Google Doc
- No more broken links or file location confusion
- Professional presentation for sharing

---

## Security Notes
✅ Service account has limited access (only to shared folders)  
✅ JSON key should be kept secure (already in .env)  
✅ Can revoke access anytime in Google Cloud Console  
✅ Documents are private unless you choose to share them  

---

## Troubleshooting

**"Login Required" Error:**
- Make sure the service account JSON is properly formatted in .env
- Check that the Google Docs and Drive APIs are enabled

**"Permission Denied" Error:**
- Ensure the Drive folder is shared with the service account email
- Verify the service account has Editor permissions

**"File Not Found" Error:**
- The service account needs access to the parent folder
- Try sharing your entire Drive or create a dedicated folder

---

## Ready to Configure?
1. Follow steps 1-2 above
2. Add the service account JSON to .env
3. Share the Google Drive folder with the service account
4. Run `npm run test-google-docs` to verify everything works

Once this is set up, every weekly report will automatically create a beautifully formatted Google Doc and email you the direct link!