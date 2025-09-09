#!/bin/bash
# vercel-build.sh - Optimized build script for Vercel deployments

set -e  # Exit on any error

# Print versions for debugging
echo "🔧 Build Environment:"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Working directory: $(pwd)"

# Clean up any existing build artifacts
echo "🧹 Cleaning up previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies with exact versions
echo "📦 Installing dependencies..."
npm ci --production=false

# Update browserslist database
echo "🔄 Updating browserslist database..."
npx update-browserslist-db@latest

# Run image optimizations (if script exists)
if [ -f "img-optimizer/optimize-images.js" ]; then
  echo "🖼️  Running image optimizations..."
  node img-optimizer/optimize-images.js
else
  echo "ℹ️  No image optimizer found, skipping..."
fi

# Check for required environment variables
echo "🔐 Checking environment variables..."
if [ -z "$NEXT_PUBLIC_OPENWEATHER_KEY" ]; then
  echo "⚠️  Warning: NEXT_PUBLIC_OPENWEATHER_KEY not set"
fi

# Run the Next.js build
echo "🚀 Running Next.js build..."
npx next build

# Verify build output
if [ -d ".next" ]; then
  echo "✅ Build completed successfully!"
  echo "📊 Build statistics:"
  du -sh .next
else
  echo "❌ Build failed - .next directory not found"
  exit 1
fi
