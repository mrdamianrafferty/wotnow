#!/bin/bash
# Kill any existing Next.js dev server and clean up lock files

echo "🧹 Cleaning up Next.js dev environment..."

# Kill processes on ports 3000 and 3001
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null

# Also kill any lingering next dev processes
pkill -f "next dev" 2>/dev/null
pkill -f "next-router-worker" 2>/dev/null

# Wait a moment for processes to terminate
sleep 1

# Remove lock files
rm -rf .next/dev/lock 2>/dev/null
rm -rf .next/cache/webpack/client-development/.nft-lock 2>/dev/null
rm -rf .next/cache/webpack/server-development/.nft-lock 2>/dev/null

echo "✅ Cleanup complete"
echo ""
echo "Run 'npm run dev' to start the dev server"
