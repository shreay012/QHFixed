# ✅ MASTER DEPLOYMENT CHECKLIST

**Your Complete Step-by-Step Deployment Guide**  
**Status**: Ready to Deploy  
**Time**: ~30 minutes total  
**Date**: April 28, 2026  

---

## 📋 SECTION 1: VERCEL SETUP (10 minutes)

### Get VERCEL_TOKEN
- [ ] Go to: https://vercel.com/account/tokens
- [ ] Click "Create Token"
- [ ] Name: `github-deploy`
- [ ] Scope: `Full Account`
- [ ] Click "Create"
- [ ] **Copy the token** (shows only once!)
- [ ] **SAVE IT** → `VERCEL_TOKEN`

**Read guide**: `VERCEL_SETUP_STEP_BY_STEP.md`

---

### Get VERCEL_ORG_ID
- [ ] Go to: https://vercel.com/dashboard
- [ ] Click your project
- [ ] Click "Settings"
- [ ] Find "Team Settings" or scroll to "Team ID"
- [ ] **Copy the ID** (numbers/letters format)
- [ ] **SAVE IT** → `VERCEL_ORG_ID`

---

### Get VERCEL_PROJECT_ID
- [ ] Still in Settings
- [ ] Click "General" tab
- [ ] Find "Project ID"
- [ ] **Copy the Project ID** (looks like: prj_xxxxx)
- [ ] **SAVE IT** → `VERCEL_PROJECT_ID`

---

### ✅ VERCEL COMPLETE - You should have:
```
✅ VERCEL_TOKEN
✅ VERCEL_ORG_ID
✅ VERCEL_PROJECT_ID
```

---

## 📋 SECTION 2: RENDER SETUP (10 minutes)

### Get RENDER_API_KEY
- [ ] Go to: https://dashboard.render.com
- [ ] Click your profile icon (top-right)
- [ ] Select "Account"
- [ ] Find "API Keys" section
- [ ] Click "Create API Key"
- [ ] Name: `github-deployment`
- [ ] Click "Create"
- [ ] **Copy the API Key** (shows only once!)
- [ ] **SAVE IT** → `RENDER_API_KEY`

**Read guide**: `RENDER_SETUP_STEP_BY_STEP.md`

---

### Get RENDER_SERVICE_ID
- [ ] Go to: https://dashboard.render.com
- [ ] Click "Services" (left sidebar)
- [ ] Click your backend service
- [ ] Look at the **URL bar** in your browser
- [ ] Find the part: `srv_xxxxxxxxxxxxx`
- [ ] **Copy just that part** (the Service ID)
- [ ] **SAVE IT** → `RENDER_SERVICE_ID`

---

### ✅ RENDER COMPLETE - You should have:
```
✅ RENDER_API_KEY
✅ RENDER_SERVICE_ID
```

---

## 📋 SECTION 3: ADD GITHUB SECRETS (5 minutes)

### Go to GitHub Secrets Page
- [ ] Go to: https://github.com/shreay012/QHFixed
- [ ] Click "Settings" (top menu)
- [ ] Left sidebar → "Secrets and variables"
- [ ] Click "Actions"

---

### Add All 5 Secrets (One by One)

**Secret 1: VERCEL_TOKEN**
- [ ] Click "New repository secret"
- [ ] Name: `VERCEL_TOKEN` (exactly)
- [ ] Secret: Paste your Vercel token
- [ ] Click "Add secret"
- [ ] ✅ Confirm green checkmark

**Secret 2: VERCEL_ORG_ID**
- [ ] Click "New repository secret"
- [ ] Name: `VERCEL_ORG_ID` (exactly)
- [ ] Secret: Paste your Vercel Org ID
- [ ] Click "Add secret"
- [ ] ✅ Confirm green checkmark

**Secret 3: VERCEL_PROJECT_ID**
- [ ] Click "New repository secret"
- [ ] Name: `VERCEL_PROJECT_ID` (exactly)
- [ ] Secret: Paste your Vercel Project ID
- [ ] Click "Add secret"
- [ ] ✅ Confirm green checkmark

**Secret 4: RENDER_API_KEY**
- [ ] Click "New repository secret"
- [ ] Name: `RENDER_API_KEY` (exactly)
- [ ] Secret: Paste your Render API key
- [ ] Click "Add secret"
- [ ] ✅ Confirm green checkmark

**Secret 5: RENDER_SERVICE_ID**
- [ ] Click "New repository secret"
- [ ] Name: `RENDER_SERVICE_ID` (exactly)
- [ ] Secret: Paste your Render Service ID
- [ ] Click "Add secret"
- [ ] ✅ Confirm green checkmark

---

### ✅ ALL SECRETS ADDED - Verify:
```
You should see all 5 in the list:
✅ RENDER_API_KEY
✅ RENDER_SERVICE_ID
✅ VERCEL_ORG_ID
✅ VERCEL_PROJECT_ID
✅ VERCEL_TOKEN
```

**Read guide**: `ADD_GITHUB_SECRETS_FINAL.md`

---

## 📋 SECTION 4: TRIGGER DEPLOYMENT (1 minute)

### Push Your Code
- [ ] Open Terminal
- [ ] Run this command:
```bash
cd /Users/orange/Documents/QHAIMODE
git push origin main
```
- [ ] Wait for it to complete

---

## 📋 SECTION 5: MONITOR DEPLOYMENT (5-15 minutes)

### Watch Frontend Deploy
- [ ] Go to: https://github.com/shreay012/QHFixed
- [ ] Click "Actions" tab
- [ ] You should see: "Deploy Frontend to Vercel"
- [ ] Status: 🟡 In Progress → 🟢 Completed
- [ ] Time: ~30 seconds
- [ ] ✅ Check: Frontend deployed when you see green checkmark

### Watch Backend Deploy
- [ ] Still in Actions tab
- [ ] You should see: "Deploy Backend to Render"
- [ ] Status: 🟡 In Progress → 🟢 Completed
- [ ] Time: ~5-10 minutes (Render is slower)
- [ ] ✅ Check: Backend deployed when you see green checkmark

---

## 🎉 SECTION 6: VERIFY YOUR APP IS LIVE

### Check Frontend
- [ ] Go to: https://quickhire-frontend.vercel.app
- [ ] Should see your app load
- [ ] If not: Check Actions for errors

### Check Backend
- [ ] Go to: https://quickhire-backend.onrender.com
- [ ] Should see API response (or JSON)
- [ ] If not: Check Actions for errors

---

## 📊 YOUR 5 VALUES TRACKING

### From Vercel:
```
☐ VERCEL_TOKEN          = _________________________________
☐ VERCEL_ORG_ID         = _________________________________
☐ VERCEL_PROJECT_ID     = _________________________________
```

### From Render:
```
☐ RENDER_API_KEY        = _________________________________
☐ RENDER_SERVICE_ID     = _________________________________
```

---

## ⏱️ TIMELINE

```
T+0 min   START
T+10 min  Vercel setup complete ✓
T+20 min  Render setup complete ✓
T+22 min  Add 5 secrets to GitHub ✓
T+23 min  Push code (git push origin main) ✓
T+23.5 min GitHub Actions triggers ✓
T+24 min  Frontend deployed to Vercel ✓
T+29 min  Backend deployed to Render ✓
T+30 min  ✅ APP IS LIVE! 🎉
```

---

## 🆘 TROUBLESHOOTING QUICK LINKS

| Issue | Solution |
|-------|----------|
| Can't find token button | Read: `VERCEL_SETUP_STEP_BY_STEP.md` → Troubleshooting |
| Secret name error | Check spelling (CASE SENSITIVE) |
| Workflow failed | Go to Actions tab, click workflow, read error |
| App not loading | Wait 2 minutes, refresh page |
| Backend still deploying | Render free tier is slow, wait 10 min |

---

## ✅ FINAL CHECKLIST

Before you declare success:

- [ ] All 5 secrets added to GitHub
- [ ] `git push origin main` completed
- [ ] GitHub Actions showing 2 workflows (frontend + backend)
- [ ] Frontend workflow: ✅ Green checkmark
- [ ] Backend workflow: ✅ Green checkmark
- [ ] Frontend URL loads your app
- [ ] Backend URL responds
- [ ] You can see your app in browser!

---

## 📚 ALL GUIDES IN THIS REPOSITORY

1. **DEPLOYMENT_ROADMAP.md** ← Start here for overview
2. **VERCEL_SETUP_STEP_BY_STEP.md** ← Detailed Vercel steps
3. **RENDER_SETUP_STEP_BY_STEP.md** ← Detailed Render steps
4. **ADD_GITHUB_SECRETS_FINAL.md** ← How to add secrets
5. **MASTER_DEPLOYMENT_CHECKLIST.md** ← This file (complete reference)

---

## 🎯 NEXT STEP

**Start with SECTION 1**: Go collect your Vercel tokens!

1. Open: `VERCEL_SETUP_STEP_BY_STEP.md`
2. Follow each step
3. Come back here and check off boxes
4. Move to next section

---

## 💡 PRO TIPS

✅ **Keep this checklist open** while deploying  
✅ **Take your time** - no rush, each step is simple  
✅ **Copy-paste carefully** - one typo breaks it  
✅ **Don't share tokens** with anyone  
✅ **Check off each box** as you complete  
✅ **Read troubleshooting** if stuck  

---

## 🎉 YOU GOT THIS!

Your app is ready to deploy. Follow this checklist from top to bottom, and you'll have a live production app in 30 minutes!

**Questions?** Check the troubleshooting sections in each guide.

**Ready?** Open `VERCEL_SETUP_STEP_BY_STEP.md` and get started! 👇

---

**Repository**: https://github.com/shreay012/QHFixed  
**Status**: Ready for deployment ✅  
**Your next action**: Start Section 1 (Vercel Setup)  

Good luck! 🚀
