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

# Bake the share photography.
#
# satori cannot decode WebP and applies CSS filters to TEXT, so the photo
# treatment the app does in CSS has to be burnt into the pixels before an image
# reaches the renderer. Without this the share endpoint 503s on every activity
# that has not been baked — and the share IS the growth model, so a deploy that
# cannot render a card is not a deploy worth shipping. Failing here is deliberate.
#
# ~20 s cold; near-zero afterwards, because it skips crops already on disk.
echo "🎞️  Baking share photography..."
npx tsx scripts/prebake-call-images.ts

# Run the Next.js build
echo "🚀 Running Next.js build..."
npx next build

# Verify build output
if [ -d ".next" ]; then
  echo "✅ Build completed successfully!"
  echo "📊 Build statistics (before cache cleanup):"
  du -sh .next

  # Clean up build cache to reduce serverless function size
  echo "🧹 Removing build cache..."
  rm -rf .next/cache

  echo "📊 Final build size:"
  du -sh .next
else
  echo "❌ Build failed - .next directory not found"
  exit 1
fi
