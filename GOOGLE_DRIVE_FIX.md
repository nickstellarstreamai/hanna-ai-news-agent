# 🔧 Google Drive Storage Fix

## 🎯 **Problem Identified**
The service account `hanna-ai-news-agent@crypto-arcade-414202.iam.gserviceaccount.com` has **0 GB storage** allocated, causing the "quota exceeded" error when trying to create documents.

## 🚀 **Quick Fix: Create New Service Account**

### **Step 1: Create New Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (e.g., "hanna-ai-reports")
3. Enable billing on the project

### **Step 2: Enable APIs**
1. Go to APIs & Services > Library
2. Enable **Google Drive API**
3. Enable **Google Docs API**

### **Step 3: Create Service Account**
1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "Service Account"
3. Name: `hanna-reports-service`
4. Grant roles: **Project Editor**
5. Create and download JSON key

### **Step 4: Share Drive Folder**
1. Go to [Google Drive](https://drive.google.com)
2. Find the "Hanna AI Weekly Reports" folder
3. Right-click > Share
4. Add the service account email with **Editor** permissions
5. The email will be something like: `hanna-reports-service@PROJECT-ID.iam.gserviceaccount.com`

### **Step 5: Update Environment**
Replace the `GOOGLE_SERVICE_ACCOUNT_KEY` in `.env` with the new service account JSON.

---

## 🔄 **Alternative: Fix Current Account**

### **Option A: Google Workspace**
1. Upgrade the Google Cloud project to use Google Workspace
2. This gives the service account proper Drive storage

### **Option B: Use Personal Account Integration**
1. Instead of service account, use OAuth2 with your personal Google account
2. This uses your personal Drive storage (15 GB free)

---

## 🧪 **Test the Fix**

After implementing either solution, test with:
```bash
node diagnose-google-connection.js
```

The storage line should show actual GB amounts instead of `0 GB used / 0 GB total`.

---

## 🎯 **Recommended Approach**

**Quick Fix**: Create new service account and share existing folder
**Long-term**: Consider Google Workspace for the project or personal account OAuth

The new service account will have access to create documents in the shared folder using your personal Google Drive storage.