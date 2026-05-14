#!/bin/bash
# Submit URLs to IndexNow (Bing, Yandex, etc.)
# Key file must be live at: https://grow.godaisy.io/a7c9e4b2f1d8a3e6c5b9d2f4a8e1c7b5.txt

HOST="grow.godaisy.io"
KEY="a7c9e4b2f1d8a3e6c5b9d2f4a8e1c7b5"
KEY_LOCATION="https://${HOST}/${KEY}.txt"

echo "Step 1: Verifying key file is accessible at ${KEY_LOCATION}"
RESPONSE=$(curl -s "${KEY_LOCATION}")
if [ "$RESPONSE" != "$KEY" ]; then
  echo "ERROR: Key file content mismatch."
  echo "  Expected: $KEY"
  echo "  Got:      $RESPONSE"
  echo "Cannot submit until key file is deployed. Push public/${KEY}.txt to production and wait for Vercel deploy."
  exit 1
fi
echo "OK: Key file verified."

echo ""
echo "Step 2: Submitting URLs to IndexNow..."
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{
    \"host\": \"${HOST}\",
    \"key\": \"${KEY}\",
    \"keyLocation\": \"${KEY_LOCATION}\",
    \"urlList\": [
      \"https://${HOST}/\",
      \"https://${HOST}/grow\",
      \"https://${HOST}/grow/garden\",
      \"https://${HOST}/grow/plan\",
      \"https://${HOST}/grow/activities\",
      \"https://${HOST}/grow/settings\"
    ]
  }" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Done. HTTP 200 = accepted, 202 = queued."
