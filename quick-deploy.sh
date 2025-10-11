#!/bin/bash

# quick-deploy.sh - Fast deployment without prompts
# Usage: ./quick-deploy.sh "Your commit message"

set -e

COMMIT_MSG="${1:-Update: Quick deploy $(date '+%Y-%m-%d %H:%M')}"

echo "🚀 Quick Deploy..."
echo ""

# Commit if changes
if [[ -n $(git status --porcelain) ]]; then
    git add -A
    git commit -m "$COMMIT_MSG"
    echo "✓ Committed"
fi

# Push
git push origin $(git branch --show-current)
echo "✓ Pushed to GitHub"

# Deploy
npx vercel --prod --yes
echo ""
echo "✅ Done! Hard refresh your browser (Cmd+Shift+R)"
