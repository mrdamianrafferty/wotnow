#!/bin/bash

# deploy.sh - Complete deployment script for WotNow
# Commits, pushes, deploys, and clears caches

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 WotNow Deployment Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if commit message provided
COMMIT_MSG="${1:-Update: Auto-deploy $(date '+%Y-%m-%d %H:%M')}"

# Step 1: Check for uncommitted changes
echo -e "${YELLOW}📝 Step 1: Checking for changes...${NC}"
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${GREEN}   ✓ Changes detected${NC}"
    
    # Show status
    git status --short
    echo ""
    
    # Stage all changes
    echo -e "${YELLOW}   Staging all changes...${NC}"
    git add -A
    
    # Commit with message
    echo -e "${YELLOW}   Committing with message: ${COMMIT_MSG}${NC}"
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}   ✓ Changes committed${NC}"
else
    echo -e "${GREEN}   ✓ No uncommitted changes${NC}"
fi
echo ""

# Step 2: Push to GitHub
echo -e "${YELLOW}📤 Step 2: Pushing to GitHub...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}   Branch: ${CURRENT_BRANCH}${NC}"

if git push origin "$CURRENT_BRANCH"; then
    echo -e "${GREEN}   ✓ Successfully pushed to GitHub${NC}"
else
    echo -e "${RED}   ✗ Push failed${NC}"
    exit 1
fi
echo ""

# Step 3: Deploy to Vercel
echo -e "${YELLOW}🚢 Step 3: Deploying to Vercel...${NC}"
if npx vercel --prod --yes; then
    echo -e "${GREEN}   ✓ Successfully deployed to Vercel${NC}"
else
    echo -e "${RED}   ✗ Vercel deployment failed${NC}"
    exit 1
fi
echo ""

# Step 4: Clear Supabase prediction cache (optional)
echo -e "${YELLOW}🗑️  Step 4: Clear prediction cache?${NC}"
echo -e "${YELLOW}   This will force fresh data on next load${NC}"
read -p "   Clear cache? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}   Clearing prediction cache via Supabase...${NC}"
    
    # Check if Supabase CLI is available
    if command -v supabase &> /dev/null; then
        echo "DELETE FROM findr_prediction_sessions;" | supabase db execute
        echo -e "${GREEN}   ✓ Cache cleared${NC}"
    else
        echo -e "${YELLOW}   ⚠ Supabase CLI not found${NC}"
        echo -e "${YELLOW}   Run this SQL manually in Supabase SQL editor:${NC}"
        echo -e "${BLUE}   DELETE FROM findr_prediction_sessions;${NC}"
    fi
else
    echo -e "${YELLOW}   ⊘ Skipped cache clear${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "   1. Wait 1-2 minutes for CDN propagation"
echo -e "   2. Hard refresh your browser:"
echo -e "      • Mac: ${BLUE}Cmd + Shift + R${NC}"
echo -e "      • Windows/Linux: ${BLUE}Ctrl + Shift + R${NC}"
echo -e "   3. Or use incognito mode to test"
echo ""
echo -e "${GREEN}🎣 Your changes are now live!${NC}"
echo ""
