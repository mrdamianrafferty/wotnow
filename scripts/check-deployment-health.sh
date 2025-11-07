#!/bin/bash
# Quick deployment health check script
# Run this anytime to verify your deployments are working

set -e

echo "🔍 Checking Vercel Deployment Health..."
echo ""

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not installed. Install with: npm i -g vercel"
    exit 1
fi

# Get latest 3 deployments
echo "📊 Latest Deployments:"
vercel ls | head -8

echo ""
echo "🎯 Production Status:"

# Check if latest production deployment succeeded
PROD_STATUS=$(vercel ls | grep "Production" | head -1)

if echo "$PROD_STATUS" | grep -q "Error"; then
    echo "❌ LATEST PRODUCTION DEPLOYMENT FAILED!"
    echo ""
    echo "Details:"
    echo "$PROD_STATUS"
    echo ""
    echo "🔧 Common causes:"
    echo "   - Bundle size exceeded 250MB (check for large dependencies)"
    echo "   - Build errors (check Vercel dashboard for logs)"
    echo "   - Environment variables missing"
    echo ""
    echo "👉 Check Vercel dashboard: https://vercel.com/dashboard"
    exit 1
elif echo "$PROD_STATUS" | grep -q "Building"; then
    echo "⏳ Production deployment is currently building..."
    echo "$PROD_STATUS"
    exit 0
elif echo "$PROD_STATUS" | grep -q "Ready"; then
    echo "✅ Latest production deployment is healthy!"
    echo "$PROD_STATUS"
    echo ""

    # Optional: Check if site is responding
    echo "🌐 Checking site availability..."
    if curl -sf https://fishfindr.eu > /dev/null 2>&1; then
        echo "✅ Site is online and responding"
    else
        echo "⚠️  Site may be slow or unreachable"
    fi

    exit 0
else
    echo "⚠️  Unexpected status:"
    echo "$PROD_STATUS"
    exit 1
fi
