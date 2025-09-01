#!/bin/bash
# vercel-build.sh - Custom build script for Vercel deployments

# Print versions for debugging
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Clean up node_modules cache if it exists
if [ -d "node_modules/.cache" ]; then
  echo "Cleaning node_modules cache..."
  rm -rf node_modules/.cache
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Update caniuse-lite database
echo "Updating caniuse-lite database..."
npx update-browserslist-db@latest

# Explicitly install cssnano with latest versions
echo "Installing cssnano and related packages..."
npm install --no-save cssnano@latest cssnano-preset-default@latest

# Run optimizations
echo "Running image optimizations..."
node img-optimizer/optimize-images.js

# Run the Next.js build
echo "Running Next.js build..."
npx next build

# Success message
echo "Build completed successfully!"
