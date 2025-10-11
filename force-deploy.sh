#!/bin/bash

# force-deploy.sh - Force a complete rebuild with cache clearing
# Use this when regular deploys aren't showing up

set -e

echo "🔥 FORCE DEPLOY - Clean Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Commit message
COMMIT_MSG="${1:-Force deploy: Clean build $(date '+%Y-%m-%d %H:%M')}"

# Step 1: Commit changes
if [[ -n $(git status --porcelain) ]]; then
    echo "📝 Committing changes..."
    git add -A
    git commit -m "$COMMIT_MSG"
    echo "✓ Committed"
    echo ""
fi

# Step 2: Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin $(git branch --show-current)
echo "✓ Pushed"
echo ""

# Step 3: Clean local build cache
echo "🧹 Cleaning local build cache..."
rm -rf .next
rm -rf node_modules/.cache
echo "✓ Local cache cleared"
echo ""

# Step 4: Force deploy with no cache
echo "🚀 Force deploying to Vercel (--force flag)..."
npx vercel --prod --force --yes
echo ""

# Step 5: Get deployment URL
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FORCE DEPLOY COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 IMPORTANT STEPS TO SEE CHANGES:"
echo ""
echo "1. Wait 2-3 minutes for CDN propagation"
echo ""
echo "2. Clear browser cache completely:"
echo "   • Chrome: Settings → Privacy → Clear browsing data"
echo "   • Check 'Cached images and files'"
echo "   • Time range: 'All time'"
echo ""
echo "3. Or use Incognito mode:"
echo "   • Chrome: Cmd+Shift+N (Mac) or Ctrl+Shift+N (Windows)"
echo ""
echo "4. Hard refresh multiple times:"
echo "   • Mac: Cmd+Shift+R (press 3-5 times)"
echo "   • Windows: Ctrl+Shift+R (press 3-5 times)"
echo ""
echo "5. Check the bundle hash in DevTools Console"
echo "   • Look for logs with .js filenames"
echo "   • Hash should be different from: 6f0a31f4891134b7"
echo ""
echo "6. If STILL not updating, try a different browser"
echo ""
echo "🎯 Testing URL: https://www.godaisy.io/findr"
echo ""
