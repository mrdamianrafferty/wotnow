#!/bin/bash

set -e

# Move to the project root (if not already there)
cd "$(dirname "$0")"

# Format date for commit message
DATE=$(date +"%Y-%m-%d")

echo "🔍 Checking git status…"
git status

echo ""
read -p "📝 Enter an optional commit message (or leave blank for default): " MSG

if [ -z "$MSG" ]; then
    MSG="Daily progress: $DATE"
fi

echo ""
echo "✅ Staging all changes…"
git add -A

echo "✅ Committing…"
git commit -m "$MSG"

echo "🚀 Pushing to origin main…"
git push origin main

echo "✅ All changes pushed to GitHub!"

# Optionally, tag this commit
read -p "🏷️  Tag this commit as 'daily-$DATE'? [y/N]: " TAG

if [[ "$TAG" == "y" || "$TAG" == "Y" ]]; then
    git tag "daily-$DATE"
    git push origin "daily-$DATE"
    echo "🏷️  Tagged as daily-$DATE"
fi

echo "🎉 Done!"
