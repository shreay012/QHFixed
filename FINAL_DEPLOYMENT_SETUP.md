# Auto-Deployment Setup - Final Step

Your code is on GitHub! Now just add 5 secrets and auto-deployment is live.

---

## 🎯 What You Need (5 Values)

| # | Name | Where to Get | Takes |
|---|------|-------------|-------|
| 1 | VERCEL_TOKEN | https://vercel.com/account/tokens → Create Token | 2 min |
| 2 | VERCEL_ORG_ID | Vercel Dashboard → Your project → Settings → Team Settings | 1 min |
| 3 | VERCEL_PROJECT_ID | Vercel → Your project → Settings → General | 1 min |
| 4 | RENDER_API_KEY | https://dashboard.render.com → Account → API Keys | 1 min |
| 5 | RENDER_SERVICE_ID | render.com/services/{your-backend} (from URL - `srv_xxxxx`) | 1 min |

**Total Time: ~6 minutes**

---

## 📋 Collect Your 5 Values

### Value 1: VERCEL_TOKEN

```
1. Open: https://vercel.com/account/tokens
2. Click "Create Token"
3. Fill:
   - Name: github-deploy
   - Scope: Full Account
   - Expiration: 90 days
4. Copy the token
5. Paste below:

VERCEL_TOKEN = ____________________________
```

### Value 2: VERCEL_ORG_ID

```
1. Go to: https://vercel.com/dashboard
2. Click your project
3. Settings → Team Settings
4. Find "Team ID" or "Organization ID"
5. Copy it (starts with "team_")
6. Paste below:

VERCEL_ORG_ID = ____________________________
```

### Value 3: VERCEL_PROJECT_ID

```
1. Go to: https://vercel.com/dashboard
2. Click your project
3. Settings → General
4. Find "Project ID" (starts with "prj_")
5. Copy it
6. Paste below:

VERCEL_PROJECT_ID = ____________________________
```

### Value 4: RENDER_API_KEY

```
1. Open: https://dashboard.render.com
2. Click profile icon → Account (bottom left)
3. Scroll to "API Keys"
4. Click "Create API Key"
5. Name: github-deploy
6. Copy the key
7. Paste below:

RENDER_API_KEY = ____________________________
```

### Value 5: RENDER_SERVICE_ID

```
1. Go to: https://dashboard.render.com
2. Click your backend service
3. Look at the URL in browser:
   https://dashboard.render.com/services/srv_a1b2c3d4...
4. Copy the "srv_xxxxx" part
5. Paste below:

RENDER_SERVICE_ID = ____________________________
```

---

## ✅ Add to GitHub (Copy & Paste Ready)

Once you have all 5 values, go here:

```
GitHub → Your Repo
↓
Settings (top tab) → Secrets and variables → Actions
↓
Click "New repository secret" (5 times)
```

**Add each one exactly as shown:**

### Secret #1
```
Name: VERCEL_TOKEN
Value: (paste from Value 1 above)
Click "Add secret"
```

### Secret #2
```
Name: VERCEL_ORG_ID
Value: (paste from Value 2 above)
Click "Add secret"
```

### Secret #3
```
Name: VERCEL_PROJECT_ID
Value: (paste from Value 3 above)
Click "Add secret"
```

### Secret #4
```
Name: RENDER_API_KEY
Value: (paste from Value 4 above)
Click "Add secret"
```

### Secret #5
```
Name: RENDER_SERVICE_ID
Value: (paste from Value 5 above)
Click "Add secret"
```

---

## ✨ Verify All Added

Go back to Settings → Secrets and variables → Actions

You should see:
```
✓ VERCEL_TOKEN
✓ VERCEL_ORG_ID
✓ VERCEL_PROJECT_ID
✓ RENDER_API_KEY
✓ RENDER_SERVICE_ID
```

All with green checkmarks ✓

---

## 🚀 Then Just Push!

```bash
cd "/Users/orange/Documents/QHAIMODE"
git add .
git commit -m "setup: GitHub Actions secrets configured"
git push origin main
```

**Auto-deployment starts automatically!**

---

## 📊 What Happens Next

After you push:

1. **GitHub Actions runs** (Actions tab shows workflow)
2. **Vercel gets code** → Builds & deploys frontend (30 sec)
3. **Render gets notification** → Redeploys backend (5-10 min)
4. **App is live!**
   - Frontend: https://quickhire-frontend.vercel.app
   - Backend: https://quickhire-backend.onrender.com

---

## 🎯 Current Status

```
✅ Code on GitHub
✅ GitHub Actions workflows ready
⏳ Waiting for: 5 GitHub Secrets

→ Add secrets → Auto-deploy starts! 🚀
```

---

## 📖 Detailed Guides (If Needed)

- Full instructions: GITHUB_ACTIONS_SETUP.md
- Quick checklist: GITHUB_ACTIONS_CHECKLIST.md
- Visual diagrams: GITHUB_ACTIONS_FLOW.md
- Token generation: ADD_GITHUB_SECRETS.md

---

## ⏱️ Timeline

| Step | Time | Status |
|------|------|--------|
| Collect 5 values | 6 min | ⏳ Next |
| Add to GitHub | 5 min | ⏳ Then |
| Push code | 1 min | ⏳ Finally |
| Deploy completes | 10 min | 🚀 Result |

**Total time to live: ~22 minutes**

---

## ✔️ Checklist

- [ ] Collected VERCEL_TOKEN
- [ ] Collected VERCEL_ORG_ID
- [ ] Collected VERCEL_PROJECT_ID
- [ ] Collected RENDER_API_KEY
- [ ] Collected RENDER_SERVICE_ID
- [ ] Added all 5 to GitHub Secrets
- [ ] All show green checkmarks ✓
- [ ] Pushed code to GitHub
- [ ] Auto-deployment in progress!

---

## 💾 Keep Safe

Save your 5 values securely (password manager):
```
VERCEL_TOKEN: __________________________
VERCEL_ORG_ID: __________________________
VERCEL_PROJECT_ID: __________________________
RENDER_API_KEY: __________________________
RENDER_SERVICE_ID: __________________________
```

---

## 🎉 After Deployment

Your app will be live at:
- **Frontend:** https://github.com/shreay012/QHFixed
- **Backend:** https://dashboard.render.com

Every push = automatic new deployment! 🚀

No more manual deployments needed!
