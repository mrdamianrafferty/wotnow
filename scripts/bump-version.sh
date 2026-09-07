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

# ---------------------------------------------------------------------------
# Everything that can refuse, BEFORE anything that writes.
#
# The first version of this wrote app-versions.json first and validated the
# Xcode project afterwards. A failure there — a renamed target, a moved
# project — left the JSON bumped, nothing committed, and the two platforms
# disagreeing: the exact drift this whole change exists to end, produced by the
# tool meant to prevent it. Re-running then compounded it, because the bump
# reads the JSON it had already advanced.
#
# So: resolve and check first, mutate second.
# ---------------------------------------------------------------------------

case $APP in
  findr)     IOS_PROJECT="ios/App/App.xcodeproj" ;;
  godaisy)   IOS_PROJECT="ios-godaisy/App/Go Daisy.xcodeproj" ;;
  growdaisy) IOS_PROJECT="ios-growdaisy/App/Grow Daisy.xcodeproj" ;;
esac

# The target Capacitor generates and the one every scheme here builds.
#
# NOT a wildcard, and not "the first target". Two of the three projects carry a
# SECOND native target called "App copy" — an accidental Xcode duplicate
# sharing the real target's bundle id, and Grow Daisy's carries a HIGHER
# version than the target it duplicates. A regex over project.pbxproj, or a
# script that took targets.first, would bump the wrong one.
IOS_TARGET="App"

if [ ! -d "$IOS_PROJECT" ]; then
  echo "Error: iOS project not found at $IOS_PROJECT" >&2
  exit 1
fi

# Fail rather than skip. A version bump that silently does half the job is how
# this drifted in the first place.
if ! ruby -e "require 'xcodeproj'" 2>/dev/null; then
  echo "Error: the 'xcodeproj' gem is required to bump the iOS version." >&2
  echo "       It ships with CocoaPods; otherwise: gem install xcodeproj" >&2
  exit 1
fi

ruby -e "
require 'xcodeproj'
project = Xcodeproj::Project.open(ARGV[0])
names = project.targets.map(&:name)
unless names.include?(ARGV[1])
  abort(\"Error: no target named '#{ARGV[1]}' in #{ARGV[0]} (found: #{names.join(', ')})\")
end
" "$IOS_PROJECT" "$IOS_TARGET" || exit 1

# --- Nothing above this line has written anything. ---

# Update JSON file using node
node -e "
const fs = require('fs');
const versions = require('./$VERSION_FILE');
versions.$APP.versionName = '$NEW_VERSION';
versions.$APP.versionCode = $NEW_CODE;
fs.writeFileSync('$VERSION_FILE', JSON.stringify(versions, null, 2) + '\n');
"

echo "Updated $VERSION_FILE"

# ---------------------------------------------------------------------------
# iOS
#
# app-versions.json is read by android/app/build.gradle and by NOTHING ELSE.
# Until now this script wrote only that file, so `bump-version.sh godaisy patch`
# left every Xcode project untouched and the two platforms drifted apart
# silently — Go Daisy reached Android 1.0.5/7 against iOS 4/9 that way, and the
# only reason anyone noticed was an archive that would have been rejected for
# reusing a build number.
#
# MARKETING_VERSION tracks versionName and CURRENT_PROJECT_VERSION tracks
# versionCode, so this file is now the single source of truth for all
# platforms.
# ---------------------------------------------------------------------------

ruby -e "
require 'xcodeproj'
project = Xcodeproj::Project.open(ARGV[0])
target  = project.targets.find { |t| t.name == ARGV[1] }

target.build_configurations.each do |config|
  config.build_settings['MARKETING_VERSION']       = ARGV[2]
  config.build_settings['CURRENT_PROJECT_VERSION'] = ARGV[3]
end
project.save
puts \"Updated #{ARGV[0]} (target #{ARGV[1]}): MARKETING_VERSION=#{ARGV[2]} CURRENT_PROJECT_VERSION=#{ARGV[3]}\"
" "$IOS_PROJECT" "$IOS_TARGET" "$NEW_VERSION" "$NEW_CODE"

# Git operations
git add "$VERSION_FILE" "$IOS_PROJECT/project.pbxproj"
git commit -m "chore($APP): bump version to $NEW_VERSION ($NEW_CODE)"

# Create tag
TAG="${APP}-v${NEW_VERSION}"
git tag "$TAG"

echo "Created commit and tag: $TAG"
echo ""
echo "To push:"
echo "  git push && git push origin $TAG"
