#!/bin/bash
# vercel-build.sh - Custom build script for Vercel deployments

# Print versions for debugging
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install dependencies
echo "Installing dependencies..."
npm install

# Run optimizations
echo "Running image optimizations..."
node img-optimizer/optimize-images.js

# Run the Next.js build
echo "Running Next.js build..."
npm run build

# Success message
echo "Build completed successfully!"
