# 🔐 OAuth2 Setup Guide for Google Drive/Docs

## 🎯 **Why OAuth2 is Better**
- Uses your personal Google Drive storage (15 GB free)
- No service account quota issues
- More reliable and straightforward
- Direct access to your existing folders

## 🚀 **Step-by-Step Setup**

### **Step 1: Enable APIs in Google Cloud Console**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: `crypto-arcade-414202`
3. Go to **APIs & Services > Library**
4. Search and enable:
   - **Google Drive API** ✅
   - **Google Docs API** ✅

### **Step 2: Create OAuth2 Credentials**
1. Go to **APIs & Services > Credentials**
2. Click **"Create Credentials"** > **"OAuth 2.0 Client IDs"**
3. If prompted, configure OAuth consent screen:
   - **User Type**: External
   - **App Name**: "Hanna AI Reports"
   - **User Support Email**: Your email
   - **Scopes**: Add `/auth/drive` and `/auth/documents`
4. **Application Type**: Desktop Application
5. **Name**: "Hanna AI Reports OAuth"
6. **Authorized Redirect URIs**: `http://localhost:3000/auth/callback`
7. Click **"Create"**
8. **Download the JSON** file

### **Step 3: Add Credentials to .env**
From the downloaded JSON, add to your `.env` file:
```bash
# OAuth2 Credentials
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### **Step 4: Run OAuth2 Setup**
```bash
node setup-oauth2.js
```

This will:
1. Open your browser to Google authorization
2. Ask you to sign in and grant permissions
3. Save the refresh token for future use
4. Test the connection

### **Step 5: Test the Integration**
```bash
node test-oauth2-google-docs.js
```

## 🔧 **Configuration Details**

**Scopes Required:**
- `https://www.googleapis.com/auth/drive` - Create/manage files
- `https://www.googleapis.com/auth/documents` - Create/edit Google Docs

**Redirect URI:**
- `http://localhost:3000/auth/callback`

**Storage:**
- Uses your personal Google Drive (15 GB free)
- Documents created in your "Hanna AI Weekly Reports" folder

## 🎉 **After Setup**

Once OAuth2 is configured:
- ✅ Weekly reports will create real Google Docs
- ✅ Documents will be in your personal Drive
- ✅ No more quota/storage issues
- ✅ Reliable, long-term solution

The system will automatically refresh tokens as needed, so this is a one-time setup!