# 🎯 INTERACTIVE DEPLOYMENT GUIDE - FOLLOW THIS NOW

**Follow these steps in order. Don't skip anything.**

---

## ✅ WHAT YOU HAVE

- VERCEL_TOKEN: ✅ (Already collected - keep it safe!)

---

## 🔵 STEP 1: GET VERCEL_ORG_ID (Right Now!)

### Action 1: Open Browser
Open this URL: **https://vercel.com/dashboard**

### Action 2: Select Your Project
Look for your QuickHire project in the list. Click it.

### Action 3: Go to Settings
Look for a "Settings" button. Click it. (Usually top right or in sidebar)

### Action 4: Find Team Settings
In the left menu, find "Team Settings" or scroll down. Click it.

### Action 5: Find Team ID
Look for a field labeled:
- "Team ID" OR
- "Organization ID" OR
- "Account ID"

You'll see something like: `team_abc123def456`

### Action 6: COPY IT
Copy that entire value. This is your **VERCEL_ORG_ID**

```
VERCEL_ORG_ID = [what you copied]
```

**✓ DONE WITH STEP 1**

---

## 🟠 STEP 2: GET VERCEL_PROJECT_ID (Right Now!)

### Action 1: Still in Settings
You're still in Vercel project settings from Step 1.

### Action 2: Go to General
Look for "General" tab in the settings menu. Click it.

### Action 3: Find Project ID
Look for "Project ID" field. You'll see something like:
`prj_abc123def456ghi789jkl012mno345`

### Action 4: COPY IT
Copy that entire value. This is your **VERCEL_PROJECT_ID**

```
VERCEL_PROJECT_ID = [what you copied]
```

**✓ DONE WITH STEP 2**

---

## 🔴 STEP 3: GET RENDER_API_KEY (Right Now!)

### Action 1: Open Browser
Open this URL: **https://dashboard.render.com**

### Action 2: Go to Account
Look for your profile icon (top right corner). Click it.

### Action 3: Select Account
You'll see a dropdown menu. Click "Account" or "Settings"

### Action 4: Find API Keys
In the Account page, look for "API Keys" section. You might need to scroll.

### Action 5: Create New Key
Click "Create API Key" button (or "New API Key")

### Action 6: Name It
A form will appear. In the "Name" field, type: `github-deployment`

### Action 7: Create
Click "Create" button

### Action 8: COPY IT (IMPORTANT - SHOWS ONCE ONLY!)
Your new key will appear. **Copy it immediately.** It will never show again!

It looks like: `rnd_abc123def456ghi789jkl012mno345pqr`

```
RENDER_API_KEY = [what you copied]
```

**✓ DONE WITH STEP 3**

---

## 🟣 STEP 4: GET RENDER_SERVICE_ID (Right Now!)

### Action 1: Still on Render Dashboard
You're at https://dashboard.render.com

### Action 2: Go to Services
Look for "Services" in the left sidebar. Click it.

### Action 3: Find Your Backend
You'll see a list of services. Find your backend service (should be named something like "QuickHire Backend" or "quickhire-backend")

### Action 4: Click It
Click on your backend service to open it.

### Action 5: Look at URL Bar
Look at your browser's address bar at the top.

You'll see a URL like:
```
https://dashboard.render.com/services/srv_abc123def456ghi789jkl
```

### Action 6: COPY THE SERVICE ID
The part after `/services/` is what you need:
```
srv_abc123def456ghi789jkl
```

This is your **RENDER_SERVICE_ID**

```
RENDER_SERVICE_ID = [what you copied]
```

**✓ DONE WITH STEP 4**

---

## ✅ YOU NOW HAVE ALL 5 VALUES

Write them down here:

```
1. VERCEL_TOKEN          = [your token - keep private]
2. VERCEL_ORG_ID         = ________________________________
3. VERCEL_PROJECT_ID     = ________________________________
4. RENDER_API_KEY        = ________________________________
5. RENDER_SERVICE_ID     = ________________________________
```

**✓ If you filled all 5, continue to STEP 5**

---

## 🟢 STEP 5: ADD SECRETS TO GITHUB (Right Now!)

### Action 1: Open GitHub
Go to: **https://github.com/shreay012/QHFixed**

### Action 2: Go to Settings
Click "Settings" button (top menu bar)

### Action 3: Go to Secrets
In left sidebar, find "Secrets and variables"
Hover over it → Click "Actions"

### Action 4: Create Secret 1 (VERCEL_TOKEN)
Click "New repository secret" button

Fill in:
- **Name**: `VERCEL_TOKEN`
- **Secret**: Paste the token you collected (keep it private!)

Click "Add secret"

✓ You'll see green checkmark

### Action 5: Create Secret 2 (VERCEL_ORG_ID)
Click "New repository secret" button again

Fill in:
- **Name**: `VERCEL_ORG_ID`
- **Secret**: Paste the value you copied in Step 1

Click "Add secret"

✓ Green checkmark appears

### Action 6: Create Secret 3 (VERCEL_PROJECT_ID)
Click "New repository secret" button again

Fill in:
- **Name**: `VERCEL_PROJECT_ID`
- **Secret**: Paste the value you copied in Step 2

Click "Add secret"

✓ Green checkmark appears

### Action 7: Create Secret 4 (RENDER_API_KEY)
Click "New repository secret" button again

Fill in:
- **Name**: `RENDER_API_KEY`
- **Secret**: Paste the value you copied in Step 3

Click "Add secret"

✓ Green checkmark appears

### Action 8: Create Secret 5 (RENDER_SERVICE_ID)
Click "New repository secret" button again

Fill in:
- **Name**: `RENDER_SERVICE_ID`
- **Secret**: Paste the value you copied in Step 4

Click "Add secret"

✓ Green checkmark appears

### Action 9: Verify All 5
You should now see all 5 secrets listed:
- ✅ RENDER_API_KEY
- ✅ RENDER_SERVICE_ID
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID
- ✅ VERCEL_TOKEN

**✓ DONE WITH STEP 5**

---

## 🚀 STEP 6: DEPLOY (Right Now!)

### Action 1: Open Terminal
Open your terminal/command prompt

### Action 2: Go to Project Directory
Type this and press Enter:
```bash
cd /Users/orange/Documents/QHAIMODE
```

### Action 3: Push Code
Type this and press Enter:
```bash
git push origin main
```

Wait for it to complete. You should see:
```
To https://github.com/shreay012/QHFixed.git
   ba3fce8..xxxxx  main -> main
```

**✓ DONE WITH STEP 6**

---

## 👀 STEP 7: WATCH DEPLOYMENT (Right Now!)

### Action 1: Go to GitHub Actions
Open: **https://github.com/shreay012/QHFixed/actions**

### Action 2: Watch Workflows
You should see two workflows running:

1. **Deploy Frontend to Vercel**
   - Status: 🟡 In Progress → 🟢 Completed
   - Time: ~30 seconds
   - When done: ✅ Green checkmark

2. **Deploy Backend to Render**
   - Status: 🟡 In Progress → 🟢 Completed
   - Time: ~5-10 minutes
   - When done: ✅ Green checkmark

### Action 3: Wait for Both to Complete
- Frontend completes first (~30 sec)
- Backend takes longer (~5-10 min)
- Both should show green checkmarks

**✓ DONE WITH STEP 7**

---

## 🎉 SUCCESS! YOUR APP IS LIVE!

### Check Your Live App

**Frontend** (Your web app):
https://quickhire-frontend.vercel.app

**Backend** (Your API):
https://quickhire-backend.onrender.com

Visit the frontend URL in your browser. Your QuickHire app should load!

---

## ✅ FINAL CHECKLIST

- ✅ Collected VERCEL_ORG_ID
- ✅ Collected VERCEL_PROJECT_ID
- ✅ Collected RENDER_API_KEY
- ✅ Collected RENDER_SERVICE_ID
- ✅ Added all 5 secrets to GitHub
- ✅ Pushed code
- ✅ Watched deployment complete
- ✅ Verified app is live

**YOU'RE DONE! 🎉**

---

**Status**: ✅ COMPLETE  
**App URL**: https://quickhire-frontend.vercel.app  
**Deployment Time**: ~15 minutes from push  
**Auto-Deploy**: Enabled - Future pushes will auto-deploy!

Your QuickHire app is now **LIVE IN PRODUCTION**! 🚀
