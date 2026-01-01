#!/bin/bash
# Bump version for a specific app
# Usage: ./scripts/bump-version.sh <app> <type>
# Example: ./scripts/bump-version.sh findr patch
# Types: major, minor, patch

set -e

APP=$1
TYPE=$2

if [ -z "$APP" ] || [ -z "$TYPE" ]; then
  echo "Usage: ./scripts/bump-version.sh <app> <type>"
  echo "  app: findr, godaisy, growdaisy"
  echo "  type: major, minor, patch"
  exit 1
fi

if [ "$APP" != "findr" ] && [ "$APP" != "godaisy" ] && [ "$APP" != "growdaisy" ]; then
  echo "Error: app must be one of: findr, godaisy, growdaisy"
  exit 1
fi

if [ "$TYPE" != "major" ] && [ "$TYPE" != "minor" ] && [ "$TYPE" != "patch" ]; then
  echo "Error: type must be one of: major, minor, patch"
  exit 1
fi

VERSION_FILE="app-versions.json"

if [ ! -f "$VERSION_FILE" ]; then
  echo "Error: $VERSION_FILE not found"
  exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./$VERSION_FILE').$APP.versionName")
CURRENT_CODE=$(node -p "require('./$VERSION_FILE').$APP.versionCode")

echo "Current version: $CURRENT_VERSION (code: $CURRENT_CODE)"

# Parse version parts
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Bump version
case $TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
NEW_CODE=$((CURRENT_CODE + 1))

echo "New version: $NEW_VERSION (code: $NEW_CODE)"

# Update JSON file using node
node -e "
const fs = require('fs');
const versions = require('./$VERSION_FILE');
versions.$APP.versionName = '$NEW_VERSION';
versions.$APP.versionCode = $NEW_CODE;
fs.writeFileSync('$VERSION_FILE', JSON.stringify(versions, null, 2) + '\n');
"

echo "Updated $VERSION_FILE"

# Git operations
git add "$VERSION_FILE"
git commit -m "chore($APP): bump version to $NEW_VERSION"

# Create tag
TAG="${APP}-v${NEW_VERSION}"
git tag "$TAG"

echo "Created commit and tag: $TAG"
echo ""
echo "To push:"
echo "  git push && git push origin $TAG"
