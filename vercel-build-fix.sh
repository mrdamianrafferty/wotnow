#!/bin/bash
set -e

# Update caniuse-lite database
echo "Updating caniuse-lite database..."
npx update-browserslist-db@latest

# Run the Next.js build
echo "Running Next.js build..."
next build
