# Add GitHub Secrets - Manual Web-Based Setup

Complete step-by-step guide to add all 5 secrets through GitHub website.

---

## 🎯 Overview

We'll add 5 secrets one-by-one through GitHub's web interface. Each takes 30 seconds.

**Total time: 5 minutes**

---

## 📋 Your 5 Secrets

Before starting, have these ready:

```
1. VERCEL_TOKEN = [get from https://vercel.com/account/tokens]
2. VERCEL_ORG_ID = [get from Vercel Project Settings]
3. VERCEL_PROJECT_ID = [get from Vercel Project Settings]
4. RENDER_API_KEY = [get from https://dashboard.render.com]
5. RENDER_SERVICE_ID = [get from your Render service URL]
```

See FINAL_DEPLOYMENT_SETUP.md to collect these values first!

---

## ✅ Step 1: Open GitHub Settings

```
1. Go to: https://github.com/shreay012/QHFixed
2. Click "Settings" tab (top right)
3. Left sidebar → "Secrets and variables"
4. Click "Actions"
```

You should see a screen that says:
```
Repository secrets
No secrets
```

---

## ✅ Step 2: Add First Secret (VERCEL_TOKEN)

```
1. Click "New repository secret" button
2. Fill in:
   Name:  VERCEL_TOKEN
   Value: [paste your token]
3. Click "Add secret"
4. ✓ You'll see it in the list with a green checkmark
```

---

## ✅ Step 3: Add Second Secret (VERCEL_ORG_ID)

```
1. Click "New repository secret" button
2. Fill in:
   Name:  VERCEL_ORG_ID
   Value: [paste your org ID]
3. Click "Add secret"
4. ✓ Should appear in the list
```

---

## ✅ Step 4: Add Third Secret (VERCEL_PROJECT_ID)

```
1. Click "New repository secret" button
2. Fill in:
   Name:  VERCEL_PROJECT_ID
   Value: [paste your project ID]
3. Click "Add secret"
4. ✓ Should appear in the list
```

---

## ✅ Step 5: Add Fourth Secret (RENDER_API_KEY)

```
1. Click "New repository secret" button
2. Fill in:
   Name:  RENDER_API_KEY
   Value: [paste your API key]
3. Click "Add secret"
4. ✓ Should appear in the list
```

---

## ✅ Step 6: Add Fifth Secret (RENDER_SERVICE_ID)

```
1. Click "New repository secret" button
2. Fill in:
   Name:  RENDER_SERVICE_ID
   Value: [paste your service ID]
3. Click "Add secret"
4. ✓ Should appear in the list
```

---

## ✨ Verify All Added

You should now see all 5 in the list:

```
✓ RENDER_API_KEY
✓ RENDER_SERVICE_ID
✓ VERCEL_ORG_ID
✓ VERCEL_PROJECT_ID
✓ VERCEL_TOKEN
```

(Order might be different - that's fine!)

---

## 🚀 Final Step: Push Code to Trigger Deployment

After adding all 5 secrets, run in terminal:

```bash
cd "/Users/orange/Documents/QHAIMODE"
git add .
git commit -m "setup: Add GitHub Actions secrets"
git push origin main
```

---

## 📊 What Happens After Push

1. **GitHub detects push** (5 sec)
2. **Actions tab** shows workflow running
3. **Vercel builds** frontend (30 sec)
4. **Render redeploys** backend (5-10 min)
5. **App is live!** ✅

---

## 🔗 Check Your Deployment

After ~15 minutes, visit:

```
Frontend: https://quickhire-frontend.vercel.app
Backend: https://quickhire-backend.onrender.com
```

---

## ✅ Final Checklist

- [ ] All 5 secrets collected
- [ ] All 5 secrets added to GitHub (green checkmarks)
- [ ] Code pushed to main branch
- [ ] GitHub Actions tab shows running workflow
- [ ] Vercel deployment complete
- [ ] Render deployment complete
- [ ] App is live!

---

## 🎉 You're Done!

Auto-deployment is now active! Every future push to `main` will automatically:
- Deploy frontend to Vercel
- Deploy backend to Render

No manual deployments ever again! 🚀
