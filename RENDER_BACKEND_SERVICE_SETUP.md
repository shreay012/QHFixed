# 🚀 RENDER BACKEND SERVICE SETUP - STEP BY STEP

**Status**: Production environment is ready  
**Goal**: Create backend service and get RENDER_SERVICE_ID  
**Time**: 5-10 minutes

---

## 📋 BEFORE YOU START - Environment Variables

Copy these exact variable names and values. You'll need them when creating the service.

### Critical Variables (Must Have)
```
NODE_ENV = production
PORT = 4000
ALLOWED_ORIGINS = https://quickhire-frontend.vercel.app

MONGO_URI = [From MongoDB Atlas - your connection string]
MONGO_DB = quickhire

REDIS_URL = [From Upstash - your Redis connection string]

JWT_ISSUER = quickhire.services
JWT_AUDIENCE = quickhire-api
JWT_ACCESS_TTL = 7d
JWT_REFRESH_TTL = 30d

RAZORPAY_KEY_ID = [Your Razorpay key]
RAZORPAY_KEY_SECRET = [Your Razorpay secret]
RAZORPAY_WEBHOOK_SECRET = [Your webhook secret]

AWS_REGION = ap-south-1
S3_BUCKET_CHAT = quickhire-chat-attachments
S3_BUCKET_INVOICES = quickhire-invoices

SES_FROM = no-reply@quickhire.services
MAILGUN_API_KEY = [Your Mailgun key]
MAILGUN_DOMAIN = [Your Mailgun domain]

LOG_LEVEL = info
RATE_LIMIT_PER_MIN = 120
```

### JWT Keys (Special)
```
JWT_PRIVATE_KEY = [From backend/private.pem - Copy full content with \n between lines]
JWT_PUBLIC_KEY = [From backend/public.pem - Copy full content with \n between lines]
```

### Optional (For Later)
```
SENTRY_DSN = [If using Sentry]
ANTHROPIC_API_KEY = [For chatbot features]
MEILISEARCH_URL = [For search features]
MEILISEARCH_KEY = [For search features]
```

---

## 🎯 CREATE SERVICE ON RENDER

### Step 1: Click "Create new service"
You're already on this page. Click the black button.

### Step 2: Select "Web Service"
Choose the first option (not Static Site, not Background Worker)

### Step 3: Connect Repository
```
Select: shreay012/QHFixed
Branch: main
```

### Step 4: Configure Service Details
```
Name: quickhire-backend
Runtime: Node
Build Command: npm install
Start Command: npm start
Root Directory: backend
```

### Step 5: Add Environment Variables

**IMPORTANT**: Do this BEFORE clicking Deploy!

Click "Add Secret File" or "Environment" section

Add each variable one by one:
```
1. NODE_ENV = production
2. PORT = 4000
3. ALLOWED_ORIGINS = https://quickhire-frontend.vercel.app
4. MONGO_URI = [your value]
5. MONGO_DB = quickhire
6. REDIS_URL = [your value]
7. JWT_ISSUER = quickhire.services
8. JWT_AUDIENCE = quickhire-api
9. JWT_ACCESS_TTL = 7d
10. JWT_REFRESH_TTL = 30d
... (continue with all variables from above)
```

### Step 6: Deploy
```
Click "Create Web Service"
Wait 2-5 minutes for deployment
```

---

## 🔍 GET YOUR RENDER_SERVICE_ID

### After Deployment Completes

1. **Look at URL in browser**
   ```
   https://dashboard.render.com/services/srv_abc123def456ghi789jkl
                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                         THIS IS YOUR SERVICE ID
   ```

2. **Copy from URL**
   - Select the part starting with `srv_`
   - It will be ~24 characters
   - Format: `srv_[alphanumeric]`

3. **Share this value**
   - Provide the complete RENDER_SERVICE_ID
   - We'll add it to GitHub secrets
   - Then deploy! 🎉

---

## ✅ YOUR SERVICE IS LIVE

Once deployment shows green:
```
Frontend: https://quickhire-frontend.vercel.app
Backend: https://quickhire-backend.onrender.com/health
```

Test backend:
```
curl https://quickhire-backend.onrender.com/health
```

Should return: `{"status": "ok"}`

---

## 🚨 TROUBLESHOOTING

### Service shows building but never completes
- Check logs in Render dashboard
- Make sure `package.json` exists in `backend/` folder
- Make sure `npm start` command exists in package.json

### Service crashes after deploying
- Check Render logs for error messages
- Common: Missing environment variables
- Common: Database connection issue
- Check MongoDB Atlas is accepting connections from Render

### Can't find RENDER_SERVICE_ID
- Go to Services (left sidebar)
- Click your backend service
- Copy from URL bar after `/services/`

---

## 📍 NEXT STEPS AFTER YOU GET SERVICE ID

1. ✅ You have RENDER_SERVICE_ID
2. ✅ Add all 5 secrets to GitHub
3. ✅ Run: `git push origin main`
4. ✅ GitHub Actions auto-deploys everything
5. ✅ Your app is LIVE! 🎉

---

**Ready?** Create the service now and share the RENDER_SERVICE_ID!
