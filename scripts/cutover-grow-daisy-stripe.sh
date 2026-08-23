#!/usr/bin/env bash
# Cutover: point wotnow (Grow Daisy + Go Daisy+) at its own Stripe account.
#
#   OLD  acct_1SX15MHIvKlDUWIx  "Rise Daisy & findr"  — keeps Rise Daisy + findr
#   NEW  acct_1U7aTUCvKhQ34Zxx  "Grow Daisy"          — 5 products, 13 prices
#
# Uses ./scripts/vercel-env-add.sh throughout: it strips line breaks. Four
# wotnow vars were found on 2026-08-23 carrying trailing newlines, which is
# why Go Daisy+ checkout was dead ("No such price"). Do not use
# `echo | vercel env add` here.
#
# REQUIRES ONE MANUAL STEP FIRST: STRIPE_SECRET_KEY.
# The CLI holds only a restricted key (rk_live_…). Get the account's standard
# secret key from:
#   https://dashboard.stripe.com/acct_1U7aTUCvKhQ34Zxx/apikeys
# and export it before running:
#   export NEW_SK=sk_live_...
set -uo pipefail
cd "$(dirname "$0")/.."
: "${NEW_SK:?export NEW_SK=sk_live_... first (see header)}"
ADD=./scripts/vercel-env-add.sh

FAILED=()
set_var() {  # name value
  if "$ADD" "$1" "$2" production >/dev/null 2>&1; then
    printf '  ok   %s\n' "$1"
  else
    printf '  FAIL %s\n' "$1"
    FAILED+=("$1")
  fi
}

# A variable that fails here has already been REMOVED by the helper, so a
# partial run leaves it absent rather than merely stale. Never exit quietly.
report() {
  echo
  if [ ${#FAILED[@]} -eq 0 ]; then
    echo "All variables set."
  else
    echo "!! ${#FAILED[@]} FAILED — each is now ABSENT from Vercel, not stale:"
    printf '     %s\n' "${FAILED[@]}"
    echo "!! DO NOT REDEPLOY until these are set. Re-run this script."
    exit 1
  fi
}
trap report EXIT

echo "── keys"
set_var STRIPE_SECRET_KEY "$NEW_SK"
set_var NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "pk_live_51U7aTUCvKhQ34ZxxOazblpJlu0vCOd2p0Ud7BYLHl48NuZORxnhs1okYJEtB2yFJf1U95Rr1lNae97AHLHD44sTt00oI45bb1J"
set_var STRIPE_WEBHOOK_SECRET "$(cat '/private/tmp/claude-501/-Users-damianrafferty-Projects-RiseDaisy/ad97aea3-51ed-4610-aaa8-24952d838818/scratchpad/grow_whsec.txt')"

echo "── price ids"
set_var STRIPE_GROW_SPROUT_MONTHLY_PRICE_ID "price_1U7boyCvKhQ34Zxx9gyU173l"
set_var STRIPE_GROW_SPROUT_ANNUAL_PRICE_ID "price_1U7bp0CvKhQ34Zxxmn3GU3t1"
set_var STRIPE_GROW_SPROUT_LIFETIME_PRICE_ID "price_1U7bpcCvKhQ34ZxxTbN5YdnK"
set_var STRIPE_GROW_BLOOM_MONTHLY_PRICE_ID "price_1U7bp3CvKhQ34Zxx2Op07PWU"
set_var STRIPE_GROW_BLOOM_ANNUAL_PRICE_ID "price_1U7bp5CvKhQ34ZxxAckemzL2"
set_var STRIPE_GROW_BLOOM_LIFETIME_PRICE_ID "price_1U7bpgCvKhQ34ZxxXVMvGGbz"
set_var STRIPE_GROW_HARVEST_MONTHLY_PRICE_ID "price_1U7bp8CvKhQ34Zxx2qjxORWf"
set_var STRIPE_GROW_HARVEST_ANNUAL_PRICE_ID "price_1U7bp9CvKhQ34ZxxCkMvQkU2"
set_var STRIPE_GROW_HARVEST_LIFETIME_PRICE_ID "price_1U7bpkCvKhQ34Zxxy7BzVrg5"
set_var STRIPE_GROW_ORCHARD_ANNUAL_PRICE_ID "price_1U7bpDCvKhQ34ZxxszitQdJ7"
set_var STRIPE_GROW_ORCHARD_LIFETIME_PRICE_ID "price_1U7bpmCvKhQ34ZxxDFlyGs5j"
set_var STRIPE_GODAISY_PLUS_MONTHLY_PRICE_ID "price_1U7bpGCvKhQ34ZxxQbWnzgyR"
set_var STRIPE_GODAISY_PLUS_ANNUAL_PRICE_ID "price_1U7bpICvKhQ34ZxxarlPejwf"

echo
echo "── STRIPE_GROW_WEBHOOK_SECRET is an accepted alias in the handler."
echo "   Remove it so only one secret is authoritative:"
vercel env rm STRIPE_GROW_WEBHOOK_SECRET production --yes >/dev/null 2>&1 || true

echo
echo "Done. NOW, IN THE SAME WINDOW, null the stale customer IDs —"
echo "Stripe customers belong to the account that created them, so every"
echo "stored cus_… is dangling on the new account and the billing portal"
echo "will fail for anyone holding one:"
cat <<'SQL'

  update profiles
     set stripe_customer_id = null,
         godaisy_stripe_customer_id = null
   where stripe_customer_id is not null
      or godaisy_stripe_customer_id is not null;

SQL
echo "Then redeploy:  vercel --prod   (or merge to main)"
