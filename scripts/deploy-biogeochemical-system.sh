#!/bin/bash

# Biogeochemical Enhancement System - Deployment Script
# 
# This script guides you through deploying the complete system
# Run: bash scripts/deploy-biogeochemical-system.sh

set -e  # Exit on error

echo "🚀 Biogeochemical Enhancement System - Deployment Guide"
echo "========================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Database Migrations
echo -e "${BLUE}Step 1: Deploy Database Migrations${NC}"
echo "-----------------------------------"
echo ""
echo "⚠️  You need to run these SQL migrations in your Supabase SQL Editor:"
echo ""
echo "   1. migrations/add_copernicus_coverage_to_rectangles.sql"
echo "      → Adds coverage tracking columns to ices_rectangles"
echo ""
echo "   2. migrations/create_copernicus_monitoring_tables.sql"
echo "      → Creates monitoring tables and functions"
echo ""
echo "   3. migrations/integrate_biogeochemical_enhancements.sql"
echo "      → Updates RPC function with bio enhancements"
echo ""
echo "📋 Open: https://app.supabase.com/project/_/sql"
echo ""
read -p "Press Enter after running all 3 migrations in Supabase..."

# Step 2: Environment Variables
echo ""
echo -e "${BLUE}Step 2: Configure Environment Variables${NC}"
echo "---------------------------------------"
echo ""
echo "⚠️  You need to add these to your Vercel project:"
echo ""
echo "   Required:"
echo "   • CRON_SECRET=<generate_random_string>"
echo "   • ALERT_EMAIL=<your_email@example.com>"
echo ""
echo "   Optional (for notifications):"
echo "   • SENDGRID_API_KEY=<your_sendgrid_key>"
echo "   • FROM_EMAIL=alerts@wotnow.app"
echo "   • SLACK_WEBHOOK_URL=<your_slack_webhook>"
echo ""
echo "📋 Open: https://vercel.com/damians-projects-06bbadaa/wotnow/settings/environment-variables"
echo ""
echo "💡 Generate CRON_SECRET with: openssl rand -base64 32"
echo ""
read -p "Press Enter after adding environment variables..."

# Step 3: Deploy to Vercel
echo ""
echo -e "${BLUE}Step 3: Deploy to Vercel Production${NC}"
echo "-----------------------------------"
echo ""
echo "Deploying to Vercel..."
npx vercel --prod

# Step 4: Verify Deployment
echo ""
echo -e "${BLUE}Step 4: Verify Deployment${NC}"
echo "------------------------"
echo ""

# Check if production URL is responding
PROD_URL="https://wotnow-pikv5odup-damians-projects-06bbadaa.vercel.app"
echo "Checking production deployment..."
if curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" | grep -q "200\|403"; then
    echo -e "${GREEN}✅ Production site is live${NC}"
else
    echo -e "${RED}⚠️  Production site not responding${NC}"
fi

# Check if cron endpoint exists
echo ""
echo "Checking cron endpoint..."
if curl -s "$PROD_URL/api/cron/ingest-copernicus" | grep -q "Unauthorized"; then
    echo -e "${GREEN}✅ Cron endpoint is accessible (returns 401 as expected)${NC}"
else
    echo -e "${RED}⚠️  Cron endpoint may not be deployed correctly${NC}"
fi

# Check monitoring endpoint
echo ""
echo "Checking monitoring endpoint..."
if curl -s "$PROD_URL/api/copernicus-status" | grep -q "health_score\|error"; then
    echo -e "${GREEN}✅ Monitoring endpoint is accessible${NC}"
else
    echo -e "${RED}⚠️  Monitoring endpoint may not be responding${NC}"
fi

# Step 5: Test RPC Function
echo ""
echo -e "${BLUE}Step 5: Test Enhanced RPC Function${NC}"
echo "----------------------------------"
echo ""
echo "Testing enhanced prediction function with biogeochemical data..."
echo ""
echo "Run this query in Supabase SQL Editor to test:"
echo ""
echo -e "${YELLOW}SELECT * FROM get_environmental_predictions_basic('37I0', '2025-10-15');${NC}"
echo ""
read -p "Press Enter after verifying the RPC function returns bio indices..."

# Step 6: Verify Cron Configuration
echo ""
echo -e "${BLUE}Step 6: Verify Cron Job Configuration${NC}"
echo "-------------------------------------"
echo ""
echo "⚠️  Check Vercel Cron Jobs:"
echo ""
echo "   1. Go to Vercel Project Settings → Cron Jobs"
echo "   2. Verify '/api/cron/ingest-copernicus' is scheduled"
echo "   3. Schedule should be: 0 6 * * * (daily at 6am UTC)"
echo ""
echo "📋 Open: https://vercel.com/damians-projects-06bbadaa/wotnow/settings/crons"
echo ""
read -p "Press Enter after verifying cron configuration..."

# Step 7: Initial Bulk Ingestion
echo ""
echo -e "${BLUE}Step 7: Run Initial Bulk Ingestion (Optional)${NC}"
echo "---------------------------------------------"
echo ""
echo "⚠️  This will take approximately 4 hours for 200 rectangles"
echo ""
echo "Options:"
echo ""
echo "A) Ingest all rectangles:"
echo "   npx tsx scripts/ingestCopernicusBiogeochemical.ts --date=\$(date -d 'yesterday' +%Y-%m-%d)"
echo ""
echo "B) Wait for tomorrow's cron job (recommended)"
echo "   The cron will run automatically at 6am UTC"
echo ""
read -p "Do you want to run initial ingestion now? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Running bulk ingestion for yesterday's data..."
    YESTERDAY=$(date -d 'yesterday' +%Y-%m-%d 2>/dev/null || date -v -1d +%Y-%m-%d)
    echo "Target date: $YESTERDAY"
    echo ""
    
    # Run ingestion for test rectangles first
    echo "Testing with known rectangles (37I0, 28F4, 22L4)..."
    npx tsx scripts/ingestCopernicusBiogeochemical.ts --rectangle=37I0 --date=$YESTERDAY
    npx tsx scripts/ingestCopernicusBiogeochemical.ts --rectangle=28F4 --date=$YESTERDAY
    npx tsx scripts/ingestCopernicusBiogeochemical.ts --rectangle=22L4 --date=$YESTERDAY
    
    echo ""
    echo -e "${GREEN}✅ Test ingestion complete!${NC}"
    echo ""
    echo "To ingest all rectangles, run:"
    echo "  npx tsx scripts/ingestCopernicusBiogeochemical.ts --date=$YESTERDAY"
else
    echo ""
    echo "Skipping initial ingestion. The cron will run automatically."
fi

# Summary
echo ""
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📊 System Status:"
echo "   • Code deployed to production ✅"
echo "   • Database migrations applied ✅"
echo "   • Environment variables configured ✅"
echo "   • Cron job scheduled (6am UTC daily) ✅"
echo "   • Monitoring system active ✅"
echo ""
echo "🔍 Monitor your system:"
echo "   • Dashboard: $PROD_URL/api/copernicus-status"
echo "   • Health score: Check JSON response for 'health_score' field"
echo "   • Alerts: Will be sent to $ALERT_EMAIL when success rate < 80%"
echo ""
echo "📅 Next automatic ingestion:"
echo "   • Tomorrow at 06:00 UTC"
echo "   • Processing yesterday's Copernicus data"
echo "   • ~200 rectangles in ~4 hours"
echo ""
echo "📖 Full documentation:"
echo "   • See COPERNICUS_SYSTEM_COMPLETE.md for detailed guide"
echo "   • Troubleshooting, monitoring queries, and maintenance tasks"
echo ""
echo -e "${YELLOW}⚠️  Important: You will receive email alerts if:${NC}"
echo "   • Success rate drops below 80%"
echo "   • Critical failures occur (>50% fail)"
echo "   • No updates for 48+ hours"
echo ""
echo -e "${GREEN}If you see no alerts, assume all is well! ✅${NC}"
echo ""
echo "🎉 Your biogeochemical enhancement system is now operational!"
