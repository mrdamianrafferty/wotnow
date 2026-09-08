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

# --- Arguments -------------------------------------------------------------
#
# The first non-flag argument is still the commit message, as it always was:
#
#     ./deploy.sh "fix the thing"
#
# The flags exist so the script can run with nothing attached to its stdin —
# a CI job, a `&`, an agent. Step 4 used to ask a question there, and a
# question asked of a closed stdin is answered instantly with EOF, so the
# script would sail past the prompt having "decided" nothing. Under `set -e`
# a failing `read` is worse: it takes the whole deploy down AFTER the deploy
# has already happened, reporting failure for a successful release.
#
#   --clear-cache      clear the prediction cache, do not ask
#   --no-clear-cache   do not clear it, do not ask
#   --allow-dirty      commit and push uncommitted changes without a terminal
#
COMMIT_MSG=""
CLEAR_CACHE="${CLEAR_CACHE:-ask}"
ALLOW_DIRTY="${ALLOW_DIRTY:-no}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --clear-cache)    CLEAR_CACHE="yes"; shift ;;
        --no-clear-cache) CLEAR_CACHE="no";  shift ;;
        --allow-dirty)    ALLOW_DIRTY="yes"; shift ;;
        -h|--help)
            echo "usage: ./deploy.sh [commit message] [--clear-cache|--no-clear-cache] [--allow-dirty]"
            exit 0 ;;
        *)  if [[ -z "$COMMIT_MSG" ]]; then COMMIT_MSG="$1"; else
                echo -e "${RED}Unknown argument: $1${NC}" >&2; exit 2
            fi
            shift ;;
    esac
done

COMMIT_MSG="${COMMIT_MSG:-Update: Auto-deploy $(date '+%Y-%m-%d %H:%M')}"

# Is there a human at the other end of stdin?
interactive() { [[ -t 0 ]]; }

# Resolve "ask" now, so the answer is settled before anything is deployed.
CLEAR_CACHE_SOURCE="the command line"
if [[ "$CLEAR_CACHE" == "ask" ]] && ! interactive; then
    CLEAR_CACHE="no"
    CLEAR_CACHE_SOURCE="the default with no terminal to ask at"
fi

# Step 1: Check for uncommitted changes
echo -e "${YELLOW}📝 Step 1: Checking for changes...${NC}"
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${GREEN}   ✓ Changes detected${NC}"
    
    # Show status
    git status --short
    echo ""

    # `git add -A` unattended is how a stray file gets committed and pushed by
    # something nobody was watching. With a terminal it is what the script has
    # always done and stays that way; without one it has to be asked for.
    if ! interactive && [[ "$ALLOW_DIRTY" != "yes" ]]; then
        echo -e "${RED}   ✗ Uncommitted changes, and no terminal to confirm them${NC}"
        echo -e "${YELLOW}   Commit them yourself, or re-run with --allow-dirty${NC}"
        exit 1
    fi
    
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
if [[ "$CLEAR_CACHE" == "ask" ]]; then
    # `|| true` because `set -e` is on and a `read` that reaches EOF returns
    # non-zero: without it, a stdin that closes mid-run fails the deploy after
    # the deploy has already succeeded.
    read -p "   Clear cache? (y/N): " -n 1 -r || true
    echo ""
    [[ $REPLY =~ ^[Yy]$ ]] && CLEAR_CACHE="yes" || CLEAR_CACHE="no"
else
    echo -e "${YELLOW}   ${CLEAR_CACHE} — from ${CLEAR_CACHE_SOURCE}${NC}"
fi
if [[ "$CLEAR_CACHE" == "yes" ]]; then
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
