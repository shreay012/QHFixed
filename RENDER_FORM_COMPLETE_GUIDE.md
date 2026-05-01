# 🚀 RENDER WEB SERVICE - COMPLETE SETUP GUIDE

**Your current form is ready. Follow these exact steps to complete.**

---

## 📋 FORM FIELD-BY-FIELD GUIDE

You're on the Render "New Web Service" page. Here's exactly what to enter in each field:

### ✅ Already Correct (Don't Change)
- **Source Code**: shreay012 / QHFixed
- **Language**: Docker
- **Branch**: main
- **Root Directory**: backend
- **Region**: Oregon (US West)
- **Instance Type**: Free

### 🔴 MUST FIX: Name Field

**Current**: `QHFixed`  
**Change to**: `quickhire-backend`

**How to fix**:
1. Click the Name field
2. Clear it completely
3. Type: `quickhire-backend`
4. Press Tab to move to next field

---

## 📝 ENVIRONMENT VARIABLES - EXACT VALUES TO ADD

Scroll down to find the **"Environment Variables"** section.

Click **"Add Environment Variable"** for each of these 16 variables:

### Group 1: Server Config (Add these 4)
```
1. NODE_ENV = production
2. PORT = 4000
3. ALLOWED_ORIGINS = https://quickhire-frontend.vercel.app
4. LOG_LEVEL = info
```

### Group 2: Database & Cache (Add these 3)
Before adding these, you need values from:
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Upstash**: https://console.upstash.com

```
5. MONGO_URI = mongodb+srv://[username]:[password]@cluster0.xxxxx.mongodb.net/quickhire?retryWrites=true&w=majority
6. MONGO_DB = quickhire
7. REDIS_URL = redis://default:[password]@[host]:[port]
```

**Getting MONGO_URI**:
1. Go to MongoDB Atlas
2. Click "Connect"
3. Choose "Drivers"
4. Copy the connection string
5. Paste it as the value

**Getting REDIS_URL**:
1. Go to Upstash
2. Click your Redis database
3. Copy the "Redis CLI" or "Connection URL"
4. Paste it as the value

### Group 3: JWT Configuration (Add these 4)
```
8. JWT_ISSUER = quickhire.services
9. JWT_AUDIENCE = quickhire-api
10. JWT_ACCESS_TTL = 7d
11. JWT_REFRESH_TTL = 30d
```

### Group 4: JWT Keys (Add these 2 - SPECIAL FORMAT)
These require copying from files in your backend:

**For JWT_PRIVATE_KEY**:
1. Open file: `quickhire AI mode /backend/private.pem`
2. Copy the ENTIRE content
3. Replace each newline (`\n` character) with literal `\n` text
4. Add as environment variable:
   ```
   JWT_PRIVATE_KEY = -----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...[content]...\n-----END RSA PRIVATE KEY-----
   ```

**For JWT_PUBLIC_KEY**:
1. Open file: `quickhire AI mode /backend/public.pem`
2. Copy the ENTIRE content
3. Replace each newline with literal `\n` text
4. Add as environment variable:
   ```
   JWT_PUBLIC_KEY = -----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEF...[content]...\n-----END PUBLIC KEY-----
   ```

### Group 5: Payment Gateway (Add these 3)
Get these from your Razorpay dashboard:
```
12. RAZORPAY_KEY_ID = rzp_live_[your_key_id]
13. RAZORPAY_KEY_SECRET = [your_key_secret]
14. RAZORPAY_WEBHOOK_SECRET = [your_webhook_secret]
```

### Group 6: AWS & Email (Add these 3)
```
15. AWS_REGION = ap-south-1
16. SES_FROM = no-reply@quickhire.services
17. MAILGUN_DOMAIN = [your_mailgun_domain]
```

---

## 🎯 HOW TO ADD EACH VARIABLE ON THE FORM

**For EACH variable above:**

1. **Find the empty field** labeled `NAME_OF_VARIABLE`
2. **Click in it** and enter the variable name (e.g., `NODE_ENV`)
3. **Click the `value` field** and enter the value (e.g., `production`)
4. **Click the green "+" button** or **"Add Environment Variable"** button
5. **Repeat** for the next variable

---

## 📊 QUICK CHECKLIST

```
Name: quickhire-backend ✓
Repository: shreay012/QHFixed ✓
Branch: main ✓
Root Directory: backend ✓
Language: Docker ✓
Region: Oregon ✓
Instance: Free ✓

Environment Variables Added:
☐ NODE_ENV = production
☐ PORT = 4000
☐ ALLOWED_ORIGINS = https://quickhire-frontend.vercel.app
☐ LOG_LEVEL = info
☐ MONGO_URI = [from MongoDB]
☐ MONGO_DB = quickhire
☐ REDIS_URL = [from Upstash]
☐ JWT_ISSUER = quickhire.services
☐ JWT_AUDIENCE = quickhire-api
☐ JWT_ACCESS_TTL = 7d
☐ JWT_REFRESH_TTL = 30d
☐ JWT_PRIVATE_KEY = [from file]
☐ JWT_PUBLIC_KEY = [from file]
☐ RAZORPAY_KEY_ID = [from Razorpay]
☐ RAZORPAY_KEY_SECRET = [from Razorpay]
☐ RAZORPAY_WEBHOOK_SECRET = [from Razorpay]
☐ AWS_REGION = ap-south-1
☐ SES_FROM = no-reply@quickhire.services
☐ MAILGUN_DOMAIN = [your domain]
```

---

## ✅ FINAL STEP: CREATE SERVICE

Once all environment variables are added:

1. **Scroll to bottom of form**
2. **Click the blue "Create Web Service" button**
3. **Wait 3-5 minutes** for deployment to start
4. **Service will show status**: Building → Deploying → Live

---

## 🔍 FIND YOUR RENDER_SERVICE_ID

After the service is created and deployed:

1. **Look at your browser URL**
   ```
   https://dashboard.render.com/services/srv_abc123def456ghi789jkl
   ```

2. **Copy the part after `/services/`**
   ```
   srv_abc123def456ghi789jkl ← This is your SERVICE_ID
   ```

3. **Share this SERVICE_ID** with the agent to complete deployment

---

## 🚀 AFTER SERVICE IS CREATED

Once your Render service is deployed:

1. ✅ You have RENDER_SERVICE_ID
2. ✅ Add all 5 secrets to GitHub
3. ✅ Run: `git push origin main`
4. ✅ GitHub Actions auto-deploys everything
5. ✅ Your app is LIVE! 🎉

---

## ⏱️ TIMELINE FROM NOW

```
Add env variables on form    = 10 min
Click "Create Web Service"   = 1 sec
Service deployment           = 5 min
Copy RENDER_SERVICE_ID       = 30 sec
Add secrets to GitHub        = 2 min
Push code to main            = 1 min
Auto deployment starts       = 1 sec
Frontend deploys             = 30 sec
Backend starts               = 1 min
Backend goes live            = ~10 min
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: ~30 MINUTES TO LIVE
```

---

## 🆘 TROUBLESHOOTING

### "What if I don't have MongoDB/Redis values?"
→ Go to RENDER_ENV_VARS_QUICK_REFERENCE.md for where to find them

### "What if I can't find JWT keys?"
→ They're in your backend folder: `private.pem` and `public.pem`

### "What if service doesn't deploy?"
→ Check the Render logs in the dashboard for error messages

### "Can't find RENDER_SERVICE_ID?"
→ Go to Services → Click your service → Copy from URL

---

## 📞 NEED HELP?

All resources available in your repository:
- RENDER_ENV_VARS_QUICK_REFERENCE.md
- RENDER_BACKEND_SERVICE_SETUP.md
- DEPLOYMENT_INFRASTRUCTURE_COMPLETE.md

---

**Ready?** Fill in the form with the values above, add all environment variables, then click "Create Web Service"! 🚀
