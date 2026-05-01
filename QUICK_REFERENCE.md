# ⚡ QUICK REFERENCE CARD

**Print this or keep it open while deploying!**

---

## 🎯 YOUR 5 VALUES TO COLLECT

```
From Vercel:
☐ VERCEL_TOKEN          = [paste here]
☐ VERCEL_ORG_ID         = [paste here]  
☐ VERCEL_PROJECT_ID     = [paste here]

From Render:
☐ RENDER_API_KEY        = [paste here]
☐ RENDER_SERVICE_ID     = [paste here]
```

---

## 📍 WHERE TO GET EACH VALUE

### 1️⃣ VERCEL_TOKEN
```
→ https://vercel.com/account/tokens
→ Click "Create Token"
→ Name: github-deploy
→ Scope: Full Account
→ Click "Create"
→ COPY IT (shows once!)
```

### 2️⃣ VERCEL_ORG_ID
```
→ https://vercel.com/dashboard
→ Click your project
→ Settings → Team Settings
→ Look for: Team ID or Organization ID
→ COPY IT
```

### 3️⃣ VERCEL_PROJECT_ID
```
→ Still in Settings
→ Click "General"
→ Look for: Project ID
→ COPY IT
```

### 4️⃣ RENDER_API_KEY
```
→ https://dashboard.render.com
→ Profile icon (top-right) → Account
→ Find: API Keys section
→ Click "Create API Key"
→ Name: github-deployment
→ COPY IT (shows once!)
```

### 5️⃣ RENDER_SERVICE_ID
```
→ https://dashboard.render.com
→ Left sidebar: Services
→ Click your backend service
→ Look at browser URL bar
→ Copy the part: srv_xxxxx
```

---

## ➕ ADD TO GITHUB (5 Minutes)

```
1. Go to: https://github.com/shreay012/QHFixed
2. Settings → Secrets and variables → Actions
3. Click "New repository secret" (5 times)

For each of your 5 values:
   Name: [EXACT NAME - case sensitive]
   Secret: [paste the value]
   Click "Add secret"

✓ Repeat 5 times total
```

---

## 🚀 DEPLOY (1 Minute)

```bash
cd /Users/orange/Documents/QHAIMODE
git push origin main
```

Then watch GitHub Actions deploy your app!

---

## ⏱️ TIMELINE

```
Collection (20 min) → GitHub Setup (5 min) → Deploy (1 min) → Done! (15 min wait)

TOTAL: ~40 minutes to LIVE ✅
```

---

## 📚 FULL GUIDES

Need details? Read these:

- **START_DEPLOYMENT.md** ← Start here
- **MASTER_DEPLOYMENT_CHECKLIST.md** ← Complete checklist
- **VERCEL_SETUP_STEP_BY_STEP.md** ← Full Vercel walkthrough
- **RENDER_SETUP_STEP_BY_STEP.md** ← Full Render walkthrough  
- **ADD_GITHUB_SECRETS_FINAL.md** ← Full GitHub walkthrough

---

## ✅ SUCCESS

When done:
```
✓ All 5 secrets added to GitHub
✓ Code pushed to main
✓ GitHub Actions showing 2 green checkmarks
✓ Frontend deployed to Vercel
✓ Backend deployed to Render
✓ Your app is LIVE! 🎉
```

---

**You have VERCEL_TOKEN ✅**
**Collect 4 more values → Add to GitHub → Push code → DONE! 🚀**
