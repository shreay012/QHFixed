#!/bin/bash

# 🚀 QuickHire Real-Time Deployment Monitor
# This script continuously monitors your deployment progress

set -e

PROJECT_DIR="/Users/orange/Documents/QHAIMODE"
cd "$PROJECT_DIR"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
FRONTEND_URL="https://quickhire-frontend.vercel.app"
BACKEND_URL="https://quickhire-backend.onrender.com/health"
GITHUB_ACTIONS_URL="https://api.github.com/repos/shreay012/QHFixed/actions/runs"

# Counters
ITERATION=0
MAX_ITERATIONS=240  # 4 hours (monitoring every minute)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 QuickHire Deployment Monitor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Monitoring your deployment progress..."
echo "Check times: Every 30 seconds"
echo "Monitor duration: Up to 4 hours"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Function to check service status
check_frontend() {
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ Frontend: LIVE${NC} (HTTP $http_code)"
        return 0
    elif [ "$http_code" = "000" ]; then
        echo -e "${YELLOW}⏳ Frontend: Deploying...${NC}"
        return 1
    else
        echo -e "${YELLOW}⏳ Frontend: Deploying...${NC} (HTTP $http_code)"
        return 1
    fi
}

check_backend() {
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ Backend: LIVE${NC} (HTTP $http_code)"
        return 0
    elif [ "$http_code" = "000" ]; then
        echo -e "${YELLOW}⏳ Backend: Deploying...${NC}"
        return 1
    else
        echo -e "${YELLOW}⏳ Backend: Deploying...${NC} (HTTP $http_code)"
        return 1
    fi
}

check_github_actions() {
    # Try to get latest workflow run status
    if command -v gh &> /dev/null; then
        local status=$(gh run list --repo shreay012/QHFixed --limit 1 --json status --jq '.[0].status' 2>/dev/null || echo "unknown")
        
        case "$status" in
            "completed")
                echo -e "${GREEN}✅ GitHub Actions: COMPLETED${NC}"
                return 0
                ;;
            "in_progress")
                echo -e "${YELLOW}⏳ GitHub Actions: Running...${NC}"
                return 1
                ;;
            "queued")
                echo -e "${YELLOW}⏳ GitHub Actions: Queued...${NC}"
                return 1
                ;;
            *)
                echo -e "${BLUE}ℹ️  GitHub Actions: Check manually${NC}"
                return 1
                ;;
        esac
    else
        echo -e "${BLUE}ℹ️  GitHub Actions: Install gh CLI to monitor${NC}"
        return 1
    fi
}

check_github_secrets() {
    if command -v gh &> /dev/null; then
        local secrets=$(gh secret list 2>&1 | wc -l)
        if [ "$secrets" -ge 5 ]; then
            echo -e "${GREEN}✅ GitHub Secrets: All 5 configured${NC}"
            return 0
        else
            echo -e "${YELLOW}⏳ GitHub Secrets: $secrets of 5 configured${NC}"
            return 1
        fi
    fi
}

# Main monitoring loop
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}Check #$ITERATION - $TIMESTAMP${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Check all services
    FRONTEND_OK=0
    BACKEND_OK=0
    ACTIONS_OK=0
    SECRETS_OK=0
    
    check_frontend && FRONTEND_OK=1
    check_backend && BACKEND_OK=1
    check_github_actions && ACTIONS_OK=1
    check_github_secrets && SECRETS_OK=1
    
    echo ""
    
    # Check if everything is live
    if [ $FRONTEND_OK -eq 1 ] && [ $BACKEND_OK -eq 1 ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo -e "${GREEN}✅ Frontend: $FRONTEND_URL${NC}"
        echo -e "${GREEN}✅ Backend: $BACKEND_URL${NC}"
        echo -e "${GREEN}✅ Admin: https://quickhire-frontend.vercel.app/admin${NC}"
        echo ""
        echo "Your QuickHire app is LIVE! 🚀"
        echo ""
        break
    fi
    
    # Wait before next check
    sleep 30
done

if [ $ITERATION -ge $MAX_ITERATIONS ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Monitoring timeout reached (4 hours)${NC}"
    echo "Check GitHub Actions for detailed deployment status:"
    echo "  https://github.com/shreay012/QHFixed/actions"
fi

echo ""
echo "Monitor completed at: $(date '+%Y-%m-%d %H:%M:%S')"
