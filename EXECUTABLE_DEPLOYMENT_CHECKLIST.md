# ✅ QUICKHIRE DEPLOYMENT - EXECUTABLE CHECKLIST

**Print this page. Check off each item as you complete it. When all items are checked, your app is LIVE.**

---

## 📋 PHASE 1: COLLECT CREDENTIALS (5-10 Minutes)

**Goal**: Gather 6 external values needed for the Render form

### Reference Document: GET_EXTERNAL_CREDENTIALS.md

```
☐ Step 1: Go to https://cloud.mongodb.com
  ☐ Login to your account
  ☐ Click "Connect" on your cluster
  ☐ Copy MongoDB URI connection string
  ☐ COLLECT: MONGO_URI = mongodb+srv://...

☐ Step 2: Go to https://console.upstash.com
  ☐ Login to your account
  ☐ Click your Redis database
  ☐ Copy Redis connection URL
  ☐ COLLECT: REDIS_URL = redis://...

☐ Step 3: Go to https://dashboard.razorpay.com
  ☐ Login to your account
  ☐ Go to Settings → API Keys
  ☐ Copy Key ID (starts with rzp_live_ or rzp_test_)
  ☐ COLLECT: RAZORPAY_KEY_ID = rzp_...
  ☐ Copy Key Secret
  ☐ COLLECT: RAZORPAY_KEY_SECRET = [long string]

☐ Step 4: Still in Razorpay dashboard
  ☐ Go to Settings → Webhooks
  ☐ If no webhook exists, create one:
    - URL: https://quickhire-backend.onrender.com/webhooks/razorpay
    - Events: Select all payment events
  ☐ Copy Signing Secret
  ☐ COLLECT: RAZORPAY_WEBHOOK_SECRET = [string]

☐ Step 5: Go to https://app.mailgun.com
  ☐ Login to your account
  ☐ Go to Sending → Domains
  ☐ Copy your domain
  ☐ COLLECT: MAILGUN_DOMAIN = mg.yourdomain.com

☐ Step 6: Open your backend files locally
  ☐ Open: quickhire AI mode /backend/private.pem
  ☐ Copy entire content, convert newlines to \n
  ☐ COLLECT: JWT_PRIVATE_KEY = [full key content]
  ☐ Open: quickhire AI mode /backend/public.pem
  ☐ Copy entire content, convert newlines to \n
  ☐ COLLECT: JWT_PUBLIC_KEY = [full key content]

✅ Phase 1 Complete: You have 6 values collected
```

---

## 📋 PHASE 2: FILL RENDER FORM (10-15 Minutes)

**Goal**: Create backend service on Render with correct configuration

### Reference Document: RENDER_FORM_COMPLETE_GUIDE.md

**You're on the Render "Create Web Service" page now**

```
☐ Step 1: Fix Name Field
  ☐ Change from: "QHFixed"
  ☐ Change to: "quickhire-backend"
  ☐ Press Tab to confirm

☐ Step 2: Verify Settings (Don't change these)
  ☐ Repository: shreay012/QHFixed ✓
  ☐ Branch: main ✓
  ☐ Root Directory: backend ✓
  ☐ Language: Docker ✓
  ☐ Region: Oregon ✓
  ☐ Instance: Free ✓

☐ Step 3: Add Environment Variables (One by one)
  
  Basic Server Config:
  ☐ NODE_ENV = production
  ☐ PORT = 4000
  ☐ ALLOWED_ORIGINS = https://quickhire-frontend.vercel.app
  ☐ LOG_LEVEL = info
  
  Database & Cache (from Phase 1):
  ☐ MONGO_URI = [your value from Step 1]
  ☐ MONGO_DB = quickhire
  ☐ REDIS_URL = [your value from Step 2]
  
  JWT Configuration:
  ☐ JWT_ISSUER = quickhire.services
  ☐ JWT_AUDIENCE = quickhire-api
  ☐ JWT_ACCESS_TTL = 7d
  ☐ JWT_REFRESH_TTL = 30d
  ☐ JWT_PRIVATE_KEY = [your value from Step 6]
  ☐ JWT_PUBLIC_KEY = [your value from Step 6]
  
  Payment Gateway (from Phase 1):
  ☐ RAZORPAY_KEY_ID = [your value from Step 3]
  ☐ RAZORPAY_KEY_SECRET = [your value from Step 3]
  ☐ RAZORPAY_WEBHOOK_SECRET = [your value from Step 4]
  
  Email & Storage:
  ☐ AWS_REGION = ap-south-1
  ☐ SES_FROM = no-reply@quickhire.services
  ☐ MAILGUN_DOMAIN = [your value from Step 5]

☐ Step 4: Create Service
  ☐ Scroll to bottom of form
  ☐ Click blue "Create Web Service" button
  ☐ Wait for page to load

✅ Phase 2 Complete: Service creation initiated
```

---

## 📋 PHASE 3: WAIT FOR DEPLOYMENT (5 Minutes)

**Goal**: Let Render build and deploy your service

```
☐ Step 1: Monitor Service Status
  ☐ Render dashboard shows: "Building..."
  ☐ Wait 2-3 minutes
  ☐ Status changes to: "Deploying..."
  ☐ Wait 2-3 more minutes
  ☐ Status changes to: "Live" ✅

☐ Step 2: Check Service Health
  ☐ Once status shows "Live"
  ☐ Look for a URL: https://quickhire-backend.onrender.com (or similar)
  ☐ Open it in browser
  ☐ Should see: {"status":"ok"} or similar response

✅ Phase 3 Complete: Service is deployed
```

---

## 📋 PHASE 4: COLLECT RENDER_SERVICE_ID (30 Seconds)

**Goal**: Get the service ID from Render dashboard

```
☐ Step 1: Find Service ID in URL
  ☐ Look at browser URL bar
  ☐ You'll see: https://dashboard.render.com/services/srv_abc123def456
  ☐ Copy the part after /services/
  ☐ Format: srv_[alphanumeric characters]
  ☐ COLLECT: RENDER_SERVICE_ID = srv_xxxxxxxxxxxxx

☐ Step 2: Verify Service ID Format
  ☐ Should start with: "srv_"
  ☐ Should be ~24 characters long
  ☐ Should be all alphanumeric (letters and numbers only)

✅ Phase 4 Complete: You have RENDER_SERVICE_ID
```

---

## 📋 PHASE 5: COMPLETE FINAL DEPLOYMENT (Automated - 2 Minutes)

**Goal**: Share RENDER_SERVICE_ID with agent to trigger final deployment

```
☐ Step 1: Share Your RENDER_SERVICE_ID
  ☐ Copy your SERVICE_ID from Phase 4
  ☐ Share it with the agent
  ☐ Example: "srv_abc123def456ghi789jkl"

☐ Step 2: Agent Adds Secrets to GitHub
  ☐ Agent will use GitHub CLI to add all 5 secrets:
    - VERCEL_TOKEN
    - VERCEL_ORG_ID
    - VERCEL_PROJECT_ID
    - RENDER_API_KEY
    - RENDER_SERVICE_ID (you just provided)

☐ Step 3: Agent Triggers Deployment
  ☐ Agent runs: git push origin main
  ☐ GitHub Actions automatically detects the push
  ☐ Both workflows start simultaneously

☐ Step 4: Watch Deployment Progress
  ☐ Go to: https://github.com/shreay012/QHFixed/actions
  ☐ You'll see two workflows running:
    - "Deploy Frontend to Vercel" (30 seconds)
    - "Deploy Backend to Render" (5-10 minutes)
  ☐ Wait for both to show green checkmarks ✅

✅ Phase 5 Complete: Deployment triggered
```

---

## 📋 PHASE 6: VERIFY LIVE APPLICATION (5 Minutes)

**Goal**: Confirm your app is running on the internet

```
☐ Step 1: Frontend Verification
  ☐ Go to: https://quickhire-frontend.vercel.app
  ☐ App should load in browser
  ☐ You should see: Login page
  ☐ ✅ No errors in browser console
  ☐ ✅ All page elements visible

☐ Step 2: Backend Health Check
  ☐ Go to: https://quickhire-backend.onrender.com/health
  ☐ You should see: {"status":"ok"} (or similar)
  ☐ ✅ Backend is responding

☐ Step 3: Create Test Account
  ☐ On frontend, go to: Sign Up
  ☐ Enter test credentials
  ☐ Click Sign Up
  ☐ ✅ Should succeed or redirect to login

☐ Step 4: Test Login
  ☐ Click Login
  ☐ Enter test credentials
  ☐ Click Login
  ☐ ✅ Should log in successfully

☐ Step 5: Browse Application
  ☐ Click around the app
  ☐ Try searching for bookings
  ☐ Try viewing profile
  ☐ Try switching languages
  ☐ ✅ No console errors

☐ Step 6: Admin Panel (Optional)
  ☐ Go to: https://quickhire-frontend.vercel.app/admin
  ☐ Login with admin credentials
  ☐ ✅ Should see admin dashboard

✅ Phase 6 Complete: App verified working
```

---

## 🎉 FINAL CHECKLIST - YOU'RE DONE!

```
✅ Phase 1: Credentials collected (6 values)
✅ Phase 2: Render form filled and service created
✅ Phase 3: Service deployed and live
✅ Phase 4: RENDER_SERVICE_ID collected
✅ Phase 5: GitHub secrets added and deployment triggered
✅ Phase 6: Application verified working

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 YOUR QUICKHIRE APP IS LIVE ON THE INTERNET!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deployment Complete Summary:
• Frontend: https://quickhire-frontend.vercel.app
• Backend: https://quickhire-backend.onrender.com
• Admin Panel: https://quickhire-frontend.vercel.app/admin
• Total Time: ~44-50 minutes
• Total Cost: $0/month (free tiers)
• Auto-Deployment: Enabled ✅
```

---

## 📞 TROUBLESHOOTING DURING PHASES

### Phase 1: Collecting Credentials
**Problem**: Can't find MongoDB URI
**Solution**: Go to MongoDB Atlas → Click cluster → Connect button → Look for "Drivers" option

**Problem**: Can't find Redis URL
**Solution**: Go to Upstash → Click database → Copy "UPSTASH_REDIS_REST_URL"

### Phase 2: Filling Form
**Problem**: Environment variable field won't accept my value
**Solution**: Make sure you're clicking in the correct field. Try clicking "Add Environment Variable" again.

**Problem**: Can't find the form fields
**Solution**: The form is on the Render website. Make sure you're logged in to Render.

### Phase 3: Waiting for Deployment
**Problem**: Service stuck at "Building..."
**Solution**: Check Render logs. Common issue: Missing environment variables. Go back and add them.

**Problem**: Service shows error
**Solution**: Click service → View logs → Look for error message → Check which env var is missing

### Phase 4: Getting SERVICE_ID
**Problem**: Can't find the URL with SERVICE_ID
**Solution**: Go to Render dashboard → Services → Click your service → Look at URL bar

### Phase 5: Final Deployment
**Problem**: Workflows not starting
**Solution**: Wait a few seconds after git push. Then refresh GitHub Actions page.

**Problem**: Frontend workflow fails
**Solution**: Vercel tokens might be wrong. Check that VERCEL_TOKEN is correct.

**Problem**: Backend workflow fails
**Solution**: Check that RENDER_SERVICE_ID is correct (should start with srv_)

### Phase 6: Verification
**Problem**: Frontend loads but shows errors
**Solution**: Open browser console (F12) → Look for error messages → Check if backend is running

**Problem**: Can't log in
**Solution**: Check database connection in Render logs. Make sure MONGO_URI is correct.

---

## ✅ YOU MADE IT!

Your QuickHire booking platform is now live, automated, and ready for users!

Every future code change will automatically deploy to both frontend and backend.

**Next Steps**:
- Invite users to try your app
- Monitor performance on Vercel/Render dashboards
- Scale up services as usage grows
- Add paid tiers when you're ready

**Congratulations! 🎉**

---

**Document**: Complete Deployment Checklist  
**Status**: Ready to execute  
**Time to live**: ~44-50 minutes from now  
**Cost**: $0/month  
**Support**: All 38 guides available in repository  
