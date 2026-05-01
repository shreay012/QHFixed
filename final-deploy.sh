#!/bin/bash

# 🚀 QuickHire - AUTOMATED DEPLOYMENT COMPLETION
# This script finishes the entire deployment process

set -e

PROJECT_DIR="/Users/orange/Documents/QHAIMODE"
cd "$PROJECT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 QuickHire Deployment - Final Automation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check prerequisites
echo -e "${BLUE}📋 Checking Prerequisites...${NC}"
echo ""

if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not installed${NC}"
    echo "Install with: brew install gh"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"
echo ""

# Display current repository status
echo -e "${BLUE}📊 Repository Status${NC}"
echo "URL: https://github.com/shreay012/QHFixed"
echo "Branch: main"
echo "Latest commit:"
git log -1 --oneline
echo ""

# Display deployment guides available
echo -e "${BLUE}📚 Available Deployment Guides${NC}"
echo "Start with:"
echo "  - RENDER_BACKEND_SERVICE_SETUP.md (create service)"
echo "  - RENDER_ENV_VARS_QUICK_REFERENCE.md (environment vars)"
echo "  - DEPLOYMENT_INFRASTRUCTURE_COMPLETE.md (full status)"
echo ""

# Display secrets status
echo -e "${BLUE}🔐 Deployment Secrets Status${NC}"
echo ""

SECRETS_LIST=$(gh secret list 2>&1 || echo "")

check_secret() {
    local secret_name=$1
    if echo "$SECRETS_LIST" | grep -q "$secret_name"; then
        echo -e "${GREEN}✅${NC} $secret_name - Configured"
        return 0
    else
        echo -e "${RED}❌${NC} $secret_name - Missing"
        return 1
    fi
}

check_secret "VERCEL_TOKEN"
check_secret "VERCEL_ORG_ID"
check_secret "VERCEL_PROJECT_ID"
check_secret "RENDER_API_KEY"
check_secret "RENDER_SERVICE_ID"

echo ""

# Count configured secrets
CONFIGURED_COUNT=$(echo "$SECRETS_LIST" | wc -l 2>/dev/null || echo "0")

if [ "$CONFIGURED_COUNT" -ge 5 ]; then
    echo -e "${YELLOW}All secrets configured!${NC}"
    echo ""
    echo -e "${YELLOW}🚀 Ready to deploy? (yes/no)${NC}"
    read -p "Type 'yes' to push and trigger deployment: " user_input
    
    if [ "$user_input" = "yes" ] || [ "$user_input" = "YES" ]; then
        echo ""
        echo -e "${BLUE}Pushing to main...${NC}"
        git push origin main 2>&1
        
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✅ DEPLOYMENT TRIGGERED!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "📊 Watch Deployment Progress:"
        echo "   https://github.com/shreay012/QHFixed/actions"
        echo ""
        echo "⏱️  Timeline:"
        echo "   Frontend (Vercel):  30 seconds"
        echo "   Backend (Render):   5-10 minutes"
        echo "   Total:              ~15 minutes"
        echo ""
        echo "🌍 Your App Will Be Live At:"
        echo "   Frontend: https://quickhire-frontend.vercel.app"
        echo "   Backend:  https://quickhire-backend.onrender.com"
        echo ""
    else
        echo -e "${YELLOW}❌ Deployment cancelled${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ Not all secrets configured${NC}"
    echo ""
    echo "Missing secrets. Complete these steps:"
    echo ""
    echo "1️⃣  Create Render backend service:"
    echo "   Read: RENDER_BACKEND_SERVICE_SETUP.md"
    echo ""
    echo "2️⃣  Get environment variables:"
    echo "   Read: RENDER_ENV_VARS_QUICK_REFERENCE.md"
    echo ""
    echo "3️⃣  Add secrets to GitHub:"
    echo ""
    echo "   gh secret set VERCEL_TOKEN --body 'your_token'"
    echo "   gh secret set VERCEL_ORG_ID --body 'team_6YFtS1qijJAZjnuJjYRDwf35'"
    echo "   gh secret set VERCEL_PROJECT_ID --body 'prj_kUUBdsgS74g3YMYGqSVT0AIS19i5'"
    echo "   gh secret set RENDER_API_KEY --body 'your_api_key'"
    echo "   gh secret set RENDER_SERVICE_ID --body 'your_service_id'"
    echo ""
    echo "4️⃣  Then run this script again"
    echo ""
    exit 1
fi

echo ""
