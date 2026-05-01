# 🎯 GET LAST TOKEN + AUTO-DEPLOY IN 2 COMMANDS

**Status**: 4 of 5 tokens collected  
**Last token**: RENDER_SERVICE_ID (takes 30 seconds to get)  
**Then**: One-command deployment!

---

## 🔍 FIND YOUR RENDER_SERVICE_ID (30 seconds)

### Visual Guide:

```
1. Open: https://dashboard.render.com
2. Look for "Services" in left sidebar
3. Click on your backend service
4. URL in browser will look like:
   https://dashboard.render.com/services/srv_abc123def456ghi789jkl
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                        COPY THIS PART
5. It starts with "srv_"
6. Copy the entire value (from srv_ to the end)
```

### Example:
If your URL is:
```
https://dashboard.render.com/services/srv_xyz123456789abc
```

Then your RENDER_SERVICE_ID is:
```
srv_xyz123456789abc
```

---

## ✅ YOU NOW HAVE:

```
VERCEL_TOKEN         = vcp_[Collected] (30+ char token)
VERCEL_ORG_ID        = team_6YFtS1qijJAZjnuJjYRDwf35
VERCEL_PROJECT_ID    = prj_kUUBdsgS74g3YMYGqSVT0AIS19i5
RENDER_API_KEY       = rnd_[Collected] (30+ char token)
RENDER_SERVICE_ID    = srv_????????????? (PENDING)
```

---

## 🚀 ONCE YOU HAVE THE SERVICE ID:

### Option A: Add Secrets to GitHub Manually (2 min)
```
1. Go: https://github.com/shreay012/QHFixed/settings/secrets/actions
2. Click "New repository secret" five times
3. Add each of the 5 values above (exact names, case-sensitive)
4. Click "Add secret" after each one
5. Done! Secrets are saved
```

### Option B: Use This Terminal Command (1 sec)
```bash
# After collecting RENDER_SERVICE_ID, replace tokens and run this:
cd /Users/orange/Documents/QHAIMODE && \
gh secret set VERCEL_TOKEN --body "[your-vercel-token]" && \
gh secret set VERCEL_ORG_ID --body "team_6YFtS1qijJAZjnuJjYRDwf35" && \
gh secret set VERCEL_PROJECT_ID --body "prj_kUUBdsgS74g3YMYGqSVT0AIS19i5" && \
gh secret set RENDER_API_KEY --body "[your-render-api-key]" && \
gh secret set RENDER_SERVICE_ID --body "[your-render-service-id]" && \
git push origin main && \
echo "✅ ALL SECRETS ADDED & DEPLOYMENT STARTED!"
```

---

## 📋 DEPLOY IN ONE COMMAND

After adding all 5 secrets to GitHub:

```bash
cd /Users/orange/Documents/QHAIMODE
git push origin main
```

That's it! GitHub Actions will:
1. ✅ Detect the push
2. ✅ Start frontend deployment to Vercel (~30 sec)
3. ✅ Start backend deployment to Render (~5-10 min)
4. ✅ Your app goes LIVE! 🎉

---

## 👀 WATCH DEPLOYMENT

Go to: https://github.com/shreay012/QHFixed/actions

You'll see both workflows running. Wait for green checkmarks.

---

## 🎉 YOUR APP IS LIVE AT:

```
Frontend: https://quickhire-frontend.vercel.app
Backend: https://quickhire-backend.onrender.com
```

---

## ⏱️ TOTAL TIME REMAINING:

```
Get RENDER_SERVICE_ID  = 30 sec
Add 5 secrets to GitHub = 1 min (or 1 sec with command)
Deploy                  = 15 min
━━━━━━━━━━━━━━━━━━━━━
TOTAL: 16.5 MINUTES
```

---

**Next step**: Get your RENDER_SERVICE_ID from dashboard, then you're done! 🚀
