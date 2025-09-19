# Gmail Setup Guide for Hanna AI Reports

## Current Status
✅ **Email User:** nick@stellarstreamai.com (configured)  
❌ **Email Password:** Not set (needs app password)

---

## Step-by-Step Setup

### 1. Enable 2-Factor Authentication (if not already enabled)
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click **Security** in the left sidebar
3. Under "Signing in to Google", click **2-Step Verification**
4. Follow the prompts to enable if not already active

### 2. Generate App Password
1. In Google Account → **Security**
2. Under "Signing in to Google", click **2-Step Verification**
3. At the bottom, click **App passwords**
4. Select app: **Mail**
5. Select device: **Mac** (or your device)
6. Click **Generate**
7. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

### 3. Add to .env File
Open the `.env` file in the project and update:
```bash
EMAIL_PASSWORD=your-16-character-app-password-here
```
**Important:** Use the app password, NOT your regular Gmail password!

### 4. Test Email Setup
Run this command to test:
```bash
npm run test-email
```

Or manually:
```bash
node src/scripts/setupGmailTest.js
```

---

## Security Notes
- ✅ App passwords are safer than regular passwords for applications
- ✅ You can revoke app passwords anytime in Google Account settings
- ✅ The app password is only used for this Hanna AI system
- ❌ Never share the app password or commit it to version control

---

## Troubleshooting

### "Authentication failed" Error
- Make sure you're using the 16-character app password
- Verify 2-factor authentication is enabled
- Try generating a new app password

### "Less secure app access" Error  
- This shouldn't happen with app passwords
- If it does, check that you're using the app password, not regular password

### Email not sending
- Check internet connection
- Verify the email address is correct: `nick@stellarstreamai.com`
- Try the test script: `node src/scripts/setupGmailTest.js`

---

## What Happens After Setup
Once configured, the system will:
1. ✅ Send weekly reports to `nick@stellarstreamai.com`
2. ✅ Include report summary and Google Doc link
3. ✅ Format emails with HTML for better readability
4. ✅ Handle delivery failures gracefully

---

## Next Steps After Gmail Works
1. Test email delivery ✉️
2. Generate full weekly report with email 📊  
3. Set up automated scheduling ⏰
4. Configure Google Docs integration (optional) 📝