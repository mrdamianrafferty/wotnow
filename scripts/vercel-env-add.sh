#!/bin/bash
#
# Safe Vercel Environment Variable Helper
# Removes line breaks from values before adding to Vercel
#
# Usage:
#   ./scripts/vercel-env-add.sh VAR_NAME "value" [environment]
#   ./scripts/vercel-env-add.sh VAR_NAME "value"              # defaults to production
#
# Examples:
#   ./scripts/vercel-env-add.sh MY_API_KEY "sk_live_abc123"
#   ./scripts/vercel-env-add.sh FCM_PRIVATE_KEY "$(cat key.pem)"
#   ./scripts/vercel-env-add.sh MY_VAR "value" preview
#

set -e

VAR_NAME="$1"
VAR_VALUE="$2"
ENVIRONMENT="${3:-production}"

if [ -z "$VAR_NAME" ] || [ -z "$VAR_VALUE" ]; then
  echo "Usage: $0 VAR_NAME \"value\" [environment]"
  echo ""
  echo "Environment defaults to 'production' if not specified."
  exit 1
fi

# Remove all line breaks (both \n and \r\n)
CLEAN_VALUE=$(echo "$VAR_VALUE" | tr -d '\n\r')

# Check if value was modified
ORIGINAL_LEN=${#VAR_VALUE}
CLEAN_LEN=${#CLEAN_VALUE}

if [ "$ORIGINAL_LEN" != "$CLEAN_LEN" ]; then
  echo "⚠️  Removed $((ORIGINAL_LEN - CLEAN_LEN)) line break characters from value"
fi

# Remove existing var if present (ignore errors)
vercel env rm "$VAR_NAME" "$ENVIRONMENT" -y 2>/dev/null || true

# Add the clean value
echo "$CLEAN_VALUE" | vercel env add "$VAR_NAME" "$ENVIRONMENT"

echo "✅ $VAR_NAME added to $ENVIRONMENT environment"
