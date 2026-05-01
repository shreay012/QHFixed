# 🔐 GITHUB SECRETS - FINAL STEP-BY-STEP GUIDE

**Goal**: Add your 5 tokens to GitHub so auto-deployment works  
**Time**: 5 minutes  
**Difficulty**: Easy ✅

---

## 📋 YOUR 5 VALUES

Before you start, have these ready:

```
From Vercel:
1️⃣  VERCEL_TOKEN          = [paste your value]
2️⃣  VERCEL_ORG_ID         = [paste your value]
3️⃣  VERCEL_PROJECT_ID     = [paste your value]

From Render:
4️⃣  RENDER_API_KEY        = [paste your value]
5️⃣  RENDER_SERVICE_ID     = [paste your value]
```

---

## ✅ STEP 1: GO TO GITHUB SECRETS PAGE

### Open Your Repository
1. Go to: **https://github.com/shreay012/QHFixed**
2. Make sure you're logged in to GitHub

### Navigate to Secrets
3. Click **"Settings"** (top menu bar)
   ```
   [Code] [Issues] [Pull requests] [Settings] ← Click here
   ```
4. On the left sidebar, look for **"Secrets and variables"**
5. Hover over it → Click **"Actions"**
   ```
   Left Sidebar:
   - General
   - Collaborators
   - ...
   - Secrets and variables → Actions ← Click here
   ```

### You should now see:
```
Repository secrets
[New repository secret] button
```

**✓ You're on the Secrets Page!**

---

## ✅ STEP 2: ADD FIRST SECRET (VERCEL_TOKEN)

### Click "New repository secret"
1. Click the **"New repository secret"** button

### Fill in Secret 1
2. **Name** field: Type exactly: `VERCEL_TOKEN`
3. **Secret** field: Paste your Vercel token value
   ```
   Name:   VERCEL_TOKEN
   Secret: prj_1234567890abcdefghijklmnopqrst
   ```
4. Click **"Add secret"** button

### Confirm
5. You'll see green checkmark: ✅ VERCEL_TOKEN added

---

## ✅ STEP 3: ADD SECOND SECRET (VERCEL_ORG_ID)

### Click "New repository secret" Again
1. Click the **"New repository secret"** button

### Fill in Secret 2
2. **Name** field: Type exactly: `VERCEL_ORG_ID`
3. **Secret** field: Paste your Vercel Org ID
   ```
   Name:   VERCEL_ORG_ID
   Secret: abc123def456
   ```
4. Click **"Add secret"** button

### Confirm
5. You'll see green checkmark: ✅ VERCEL_ORG_ID added

---

## ✅ STEP 4: ADD THIRD SECRET (VERCEL_PROJECT_ID)

### Click "New repository secret" Again
1. Click the **"New repository secret"** button

### Fill in Secret 3
2. **Name** field: Type exactly: `VERCEL_PROJECT_ID`
3. **Secret** field: Paste your Vercel Project ID
   ```
   Name:   VERCEL_PROJECT_ID
   Secret: prj_abc123def456ghi789jkl012mno345
   ```
4. Click **"Add secret"** button

### Confirm
5. You'll see green checkmark: ✅ VERCEL_PROJECT_ID added

---

## ✅ STEP 5: ADD FOURTH SECRET (RENDER_API_KEY)

### Click "New repository secret" Again
1. Click the **"New repository secret"** button

### Fill in Secret 4
2. **Name** field: Type exactly: `RENDER_API_KEY`
3. **Secret** field: Paste your Render API Key
   ```
   Name:   RENDER_API_KEY
   Secret: rnd_abc123def456ghi789jkl012mno345pqr
   ```
4. Click **"Add secret"** button

### Confirm
5. You'll see green checkmark: ✅ RENDER_API_KEY added

---

## ✅ STEP 6: ADD FIFTH SECRET (RENDER_SERVICE_ID)

### Click "New repository secret" One More Time
1. Click the **"New repository secret"** button

### Fill in Secret 5
2. **Name** field: Type exactly: `RENDER_SERVICE_ID`
3. **Secret** field: Paste your Render Service ID
   ```
   Name:   RENDER_SERVICE_ID
   Secret: srv_abc123def456ghi789jkl
   ```
4. Click **"Add secret"** button

### Confirm
5. You'll see green checkmark: ✅ RENDER_SERVICE_ID added

---

## ✅ ALL SECRETS ADDED!

You should now see all 5 in the list:

```
Repository secrets
✅ RENDER_API_KEY
✅ RENDER_SERVICE_ID
✅ VERCEL_ORG_ID
✅ VERCEL_PROJECT_ID
✅ VERCEL_TOKEN
```

**✓ Step 6 Complete!**

---

## 🚀 FINAL STEP: TRIGGER DEPLOYMENT

### Push Your Code
Now that secrets are added, push your code to trigger auto-deployment:

```bash
cd /Users/orange/Documents/QHAIMODE
git push origin main
```

### What Happens Next

When you push:
1. **GitHub detects the push** (5 seconds)
2. **GitHub Actions starts** (10 seconds)
3. **Frontend deploys to Vercel** (~30 seconds) ✅
4. **Backend deploys to Render** (~5-10 minutes) ✅
5. **Your app is LIVE!** 🎉

### Monitor Deployment
1. Go to: **https://github.com/shreay012/QHFixed**
2. Click **"Actions"** tab (top menu)
3. You'll see workflows running:
   ```
   ✅ Deploy Frontend to Vercel
   ✅ Deploy Backend to Render
   ```
4. Watch them complete!

---

## 📊 WHAT YOU'LL SEE

### In GitHub Actions Tab:
```
Workflow run #X

✅ Deploy Frontend to Vercel
   Step 1: Checkout code ✅
   Step 2: Deploy to Vercel ✅
   → Deployed in ~30 seconds

✅ Deploy Backend to Render
   Step 1: Checkout code ✅
   Step 2: Deploy to Render ✅
   → Deployed in ~5-10 minutes
```

### Your App Will Be Live At:
```
Frontend:  https://quickhire-frontend.vercel.app
Backend:   https://quickhire-backend.onrender.com
```

---

## ✅ DEPLOYMENT COMPLETE!

### Timeline:
```
5 min  - Collect tokens from Vercel & Render
5 min  - Add secrets to GitHub
1 min  - Push code (git push origin main)
30 sec - Frontend deployed to Vercel ✅
5-10 min - Backend deployed to Render ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
~20-25 min TOTAL - App is LIVE! 🎉
```

---

## 🆘 TROUBLESHOOTING

### Q: Secret name is wrong
**A**: GitHub shows an error. Delete it and create again with exact name:
- `VERCEL_TOKEN` (not `vercel_token` or `Vercel_Token`)
- Names are CASE SENSITIVE!

### Q: Workflow shows error
**A**: 
- Go to Actions tab
- Click the failed workflow
- Look at the error message
- Usually means a secret is missing or wrong

### Q: Deployment seems stuck
**A**:
- Render free tier sleeps after 15 minutes idle
- First deploy takes longer as services wake up
- Wait 10-15 minutes before checking

### Q: Can't find Actions tab
**A**:
- On GitHub repo page, top menu has: Code, Issues, PRs, Actions
- Click "Actions"

---

## 🎉 YOU'RE DONE!

Your QuickHire application is now set to auto-deploy every time you push code!

**Next time you push to main:**
- Frontend auto-deploys in 30 seconds
- Backend auto-deploys in 5-10 minutes
- No manual steps needed! 🚀

---

## 📝 SUMMARY

✅ Collected 5 tokens from Vercel and Render  
✅ Added all 5 secrets to GitHub  
✅ Pushed code to trigger deployment  
✅ App is deploying now!  

**Check your email for Vercel deployment confirmation!**

---

**Deployment Status: LIVE IN PROGRESS** 🚀

Go to https://github.com/shreay012/QHFixed → Actions to watch!
