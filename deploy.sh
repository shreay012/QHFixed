#!/bin/bash

# QuickHire Deployment Final Steps
# Run this to complete your deployment in 15 minutes!

echo "================================"
echo "🚀 QuickHire Final Deployment"
echo "================================"
echo ""
echo "This guide will help you finish deployment in 3 easy steps!"
echo ""

# Step 1: Collect Secrets
echo "📋 STEP 1: Collect Your 5 Token Values"
echo "================================"
echo ""
echo "You need to collect 5 values. Open these in your browser:"
echo ""
echo "1️⃣  VERCEL_TOKEN"
echo "   → https://vercel.com/account/tokens"
echo "   → Create Token → Copy it"
echo ""
echo "2️⃣  VERCEL_ORG_ID"
echo "   → https://vercel.com/dashboard"
echo "   → Click your project → Settings → Team Settings"
echo ""
echo "3️⃣  VERCEL_PROJECT_ID"
echo "   → https://vercel.com/dashboard"
echo "   → Click your project → Settings → General"
echo ""
echo "4️⃣  RENDER_API_KEY"
echo "   → https://dashboard.render.com"
echo "   → Account → API Keys → Create"
echo ""
echo "5️⃣  RENDER_SERVICE_ID"
echo "   → https://dashboard.render.com"
echo "   → Click backend service → Copy from URL (srv_xxxxx)"
echo ""

read -p "Press Enter when you have all 5 values..."

# Step 2: Add to GitHub
echo ""
echo "🔐 STEP 2: Add Secrets to GitHub"
echo "================================"
echo ""
echo "Go to: https://github.com/shreay012/QHFixed"
echo "   → Settings → Secrets and variables → Actions"
echo "   → Click 'New repository secret' (5 times)"
echo ""
echo "Add each value:"
echo "  1. VERCEL_TOKEN = [paste value]"
echo "  2. VERCEL_ORG_ID = [paste value]"
echo "  3. VERCEL_PROJECT_ID = [paste value]"
echo "  4. RENDER_API_KEY = [paste value]"
echo "  5. RENDER_SERVICE_ID = [paste value]"
echo ""

read -p "Press Enter when all 5 secrets are added to GitHub..."

# Step 3: Push Code
echo ""
echo "🚀 STEP 3: Push Code to Deploy"
echo "================================"
echo ""

cd "/Users/orange/Documents/QHAIMODE"

echo "Adding untracked files..."
git add .

echo "Committing..."
git commit -m "setup: GitHub Actions secrets configured - ready for deployment" || echo "Nothing new to commit"

echo "Pushing to GitHub..."
git push origin main

echo ""
echo "================================"
echo "✨ Deployment Started!"
echo "================================"
echo ""
echo "📊 What's happening now:"
echo "  1. GitHub Actions detected your push"
echo "  2. Frontend building on Vercel (30 sec)..."
echo "  3. Backend redeploying on Render (5-10 min)..."
echo ""
echo "👀 Watch the deployment:"
echo "  → GitHub Actions: https://github.com/shreay012/QHFixed/actions"
echo "  → Vercel: https://vercel.com/dashboard"
echo "  → Render: https://dashboard.render.com"
echo ""
echo "🎉 Your app will be live at:"
echo "  Frontend: https://quickhire-frontend.vercel.app"
echo "  Backend: https://quickhire-backend.onrender.com"
echo ""
echo "⏱️  Total deployment time: ~15 minutes"
echo ""
echo "🚀 Done! Your QuickHire platform is deploying!"
