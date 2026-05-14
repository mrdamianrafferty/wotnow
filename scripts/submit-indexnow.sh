#!/usr/bin/env bash
# IndexNow submission for grow.godaisy.io species pages
#
# Pushes URL changes to Bing, Yandex, and other IndexNow-participating engines.
# Bing's index feeds ChatGPT Search, Microsoft Copilot, and DuckDuckGo.
# Google does NOT participate in IndexNow (use Search Console URL Inspection for Google).
#
# Setup verification before running:
#   1. Key file deployed at https://grow.godaisy.io/a7c9e4b2f1d8a3e6c5b9d2f4a8e1c7b5.txt
#      (file should be served by Vercel from public/ directory)
#   2. Payload at data/grow-content/indexnow-payload.json (120 species URLs)
#
# To verify the key file is live (after Vercel deploy):
#   curl -s https://grow.godaisy.io/a7c9e4b2f1d8a3e6c5b9d2f4a8e1c7b5.txt
#   # Expected: a7c9e4b2f1d8a3e6c5b9d2f4a8e1c7b5
#
# Usage:
#   ./scripts/submit-indexnow.sh
#
# Expected response: HTTP 200 OK (immediate accept) or HTTP 202 Accepted (queued for processing).
# Any other response = error in payload or key file unreachable.

set -e

PAYLOAD="data/grow-content/indexnow-payload.json"
KEY_URL="https://grow.godaisy.io/a7c9e4b2f1d8a3e6c5b9d2f4a8e1c7b5.txt"
EXPECTED_KEY="a7c9e4b2f1d8a3e6c5b9d2f4a8e1c7b5"

# Step 1: confirm key file is live and serves the right content
echo "Step 1: Verifying key file is accessible at $KEY_URL"
KEY_CONTENT=$(curl -s "$KEY_URL")
if [ "$KEY_CONTENT" != "$EXPECTED_KEY" ]; then
  echo "ERROR: Key file content mismatch."
  echo "  Expected: $EXPECTED_KEY"
  echo "  Got:      $KEY_CONTENT"
  echo "Cannot submit until key file is deployed. Push public/$EXPECTED_KEY.txt to production and wait for Vercel deploy."
  exit 1
fi
echo "Key file verified OK."
echo ""

# Step 2: confirm payload exists and is valid JSON
echo "Step 2: Validating payload at $PAYLOAD"
if [ ! -f "$PAYLOAD" ]; then
  echo "ERROR: Payload file not found at $PAYLOAD"
  exit 1
fi
URL_COUNT=$(python3 -c "import json; d = json.load(open('$PAYLOAD')); print(len(d['urlList']))")
echo "Payload valid. URLs to submit: $URL_COUNT"
echo ""

# Step 3: submit
echo "Step 3: Submitting to IndexNow API"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  --data @"$PAYLOAD" \
  https://api.indexnow.org/indexnow)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
if [ -n "$BODY" ]; then
  echo "Body: $BODY"
fi
echo ""

case "$HTTP_CODE" in
  200)
    echo "✅ SUCCESS — IndexNow accepted $URL_COUNT URLs immediately."
    echo "Bing typically begins crawling within hours; ChatGPT Search and DuckDuckGo benefit within days."
    ;;
  202)
    echo "✅ ACCEPTED — IndexNow queued $URL_COUNT URLs for processing."
    echo "Same downstream effect as 200; expect Bing crawl within hours."
    ;;
  400)
    echo "❌ BAD REQUEST — payload malformed. Check JSON structure."
    exit 1
    ;;
  403)
    echo "❌ FORBIDDEN — key verification failed. Check that the key file at $KEY_URL serves exactly '$EXPECTED_KEY' with no trailing whitespace."
    exit 1
    ;;
  422)
    echo "❌ UNPROCESSABLE — key/keyLocation mismatch with payload. Re-check payload structure."
    exit 1
    ;;
  429)
    echo "⚠️  RATE LIMITED — too many requests recently. Wait an hour and retry."
    exit 1
    ;;
  *)
    echo "⚠️  Unexpected status: $HTTP_CODE. Investigate."
    exit 1
    ;;
esac

echo ""
echo "Verification: check Bing Webmaster Tools → URL Inspection → Submit URLs history"
echo "https://www.bing.com/webmasters/"
