# Grow Daisy: Converting Stripe from Test to Live Mode

This guide explains how to convert the Grow Daisy subscription system from Stripe test mode to live (production) mode.

## Current Setup (Test Mode)

The subscription system is currently configured with **test mode** Stripe products, prices, and webhooks. This means:
- No real charges are processed
- Test card numbers work (e.g., `4242 4242 4242 4242`)
- Dashboard shows test data separate from live data

## Prerequisites

Before converting to live mode:

1. **Stripe Account Verified**: Ensure your Stripe account is fully verified for live payments
2. **Business Details Complete**: Company info, bank account, tax settings configured
3. **Test Mode Working**: Verify the full flow works in test mode first

## Step-by-Step Conversion

### Step 1: Create Live Mode Products & Prices

Open a terminal and switch to live mode:

```bash
# Check current mode
stripe config --list

# If in test mode, the CLI uses live keys by default when they exist
# You can verify by checking livemode in responses
```

Create the products and prices (copy these commands):

```bash
# SPROUT Product
stripe products create \
  --name="Grow Daisy Sprout" \
  --description="Track up to 75 plants, 20 AI IDs/month, 7-day forecast" \
  -d "metadata[app]=grow_daisy" \
  -d "metadata[tier]=sprout"

# Note the product ID (prod_xxx) from the output, then create prices:

# SPROUT Monthly - €3.99
stripe prices create \
  --product="prod_YOUR_SPROUT_ID" \
  --unit-amount=399 \
  --currency=eur \
  --recurring.interval=month \
  -d "metadata[tier]=sprout" \
  -d "metadata[billing]=monthly"

# SPROUT Annual - €29.99
stripe prices create \
  --product="prod_YOUR_SPROUT_ID" \
  --unit-amount=2999 \
  --currency=eur \
  --recurring.interval=year \
  -d "metadata[tier]=sprout" \
  -d "metadata[billing]=annual"

# SPROUT Lifetime - €59.99
stripe prices create \
  --product="prod_YOUR_SPROUT_ID" \
  --unit-amount=5999 \
  --currency=eur \
  -d "metadata[tier]=sprout" \
  -d "metadata[billing]=lifetime"
```

Repeat for **BLOOM**, **HARVEST**, and **ORCHARD** tiers:

```bash
# BLOOM Product (€6.99/mo, €49.99/yr, €99.99 lifetime)
stripe products create \
  --name="Grow Daisy Bloom" \
  --description="Unlimited plants, soil temperature at 4 depths, frost alerts, weather threats" \
  -d "metadata[app]=grow_daisy" \
  -d "metadata[tier]=bloom"

# BLOOM Prices
stripe prices create --product="prod_YOUR_BLOOM_ID" --unit-amount=699 --currency=eur --recurring.interval=month -d "metadata[tier]=bloom" -d "metadata[billing]=monthly"
stripe prices create --product="prod_YOUR_BLOOM_ID" --unit-amount=4999 --currency=eur --recurring.interval=year -d "metadata[tier]=bloom" -d "metadata[billing]=annual"
stripe prices create --product="prod_YOUR_BLOOM_ID" --unit-amount=9999 --currency=eur -d "metadata[tier]=bloom" -d "metadata[billing]=lifetime"

# HARVEST Product (€11.99/mo, €79.99/yr, €149.99 lifetime)
stripe products create \
  --name="Grow Daisy Harvest" \
  --description="Everything in Bloom plus unlimited diagnostics, analytics, team sharing, crop rotation" \
  -d "metadata[app]=grow_daisy" \
  -d "metadata[tier]=harvest"

# HARVEST Prices
stripe prices create --product="prod_YOUR_HARVEST_ID" --unit-amount=1199 --currency=eur --recurring.interval=month -d "metadata[tier]=harvest" -d "metadata[billing]=monthly"
stripe prices create --product="prod_YOUR_HARVEST_ID" --unit-amount=7999 --currency=eur --recurring.interval=year -d "metadata[tier]=harvest" -d "metadata[billing]=annual"
stripe prices create --product="prod_YOUR_HARVEST_ID" --unit-amount=14999 --currency=eur -d "metadata[tier]=harvest" -d "metadata[billing]=lifetime"

# ORCHARD Product (€199/yr, €399 lifetime - no monthly)
stripe products create \
  --name="Grow Daisy Orchard" \
  --description="Professional tier with white-label client portals, API access, commercial license" \
  -d "metadata[app]=grow_daisy" \
  -d "metadata[tier]=orchard"

# ORCHARD Prices (no monthly option)
stripe prices create --product="prod_YOUR_ORCHARD_ID" --unit-amount=19900 --currency=eur --recurring.interval=year -d "metadata[tier]=orchard" -d "metadata[billing]=annual"
stripe prices create --product="prod_YOUR_ORCHARD_ID" --unit-amount=39900 --currency=eur -d "metadata[tier]=orchard" -d "metadata[billing]=lifetime"
```

### Step 2: Create Live Mode Webhook

```bash
stripe webhook_endpoints create \
  --url="https://grow.godaisy.io/api/stripe/webhook" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d "metadata[app]=grow_daisy" \
  -d "description=Grow Daisy subscription webhook (LIVE)"
```

**Save the webhook secret** (`whsec_xxx`) from the output!

### Step 3: Update Environment Variables

Update Vercel with the **live mode** price IDs and webhook secret:

```bash
# Remove old test mode values (optional, or just update them)
# vercel env rm STRIPE_GROW_SPROUT_MONTHLY_PRICE_ID production

# Add live mode values
vercel env add STRIPE_GROW_SPROUT_MONTHLY_PRICE_ID production
# Enter: price_YOUR_LIVE_SPROUT_MONTHLY_ID

vercel env add STRIPE_GROW_SPROUT_ANNUAL_PRICE_ID production
# Enter: price_YOUR_LIVE_SPROUT_ANNUAL_ID

vercel env add STRIPE_GROW_SPROUT_LIFETIME_PRICE_ID production
# Enter: price_YOUR_LIVE_SPROUT_LIFETIME_ID

# Repeat for BLOOM, HARVEST, ORCHARD...

vercel env add STRIPE_GROW_BLOOM_MONTHLY_PRICE_ID production
vercel env add STRIPE_GROW_BLOOM_ANNUAL_PRICE_ID production
vercel env add STRIPE_GROW_BLOOM_LIFETIME_PRICE_ID production

vercel env add STRIPE_GROW_HARVEST_MONTHLY_PRICE_ID production
vercel env add STRIPE_GROW_HARVEST_ANNUAL_PRICE_ID production
vercel env add STRIPE_GROW_HARVEST_LIFETIME_PRICE_ID production

vercel env add STRIPE_GROW_ORCHARD_ANNUAL_PRICE_ID production
vercel env add STRIPE_GROW_ORCHARD_LIFETIME_PRICE_ID production

# Update webhook secret
vercel env add STRIPE_GROW_WEBHOOK_SECRET production
# Enter: whsec_YOUR_LIVE_WEBHOOK_SECRET
```

### Step 4: Redeploy

```bash
npm run deploy
```

Or trigger a new deployment from Vercel dashboard.

## Quick Reference: Test vs Live Price IDs

### Test Mode (Current)

| Tier | Monthly | Annual | Lifetime |
|------|---------|--------|----------|
| Sprout | `price_1Srij4HIvKlDUWIxIDED1mIE` | `price_1SrijLHIvKlDUWIxzHgWXQeq` | `price_1SrijNHIvKlDUWIxNLmjIZm8` |
| Bloom | `price_1SrijpHIvKlDUWIxuP4YRFci` | `price_1SrijsHIvKlDUWIxrOlGzSef` | `price_1SrijwHIvKlDUWIxYkw7nwps` |
| Harvest | `price_1SrijzHIvKlDUWIxQngDIqT8` | `price_1Srik5HIvKlDUWIxprdU1q4d` | `price_1Srik8HIvKlDUWIxS754zuVP` |
| Orchard | - | `price_1SrikCHIvKlDUWIxq2BimQij` | `price_1SrikFHIvKlDUWIxKoBl2odn` |

### Live Mode (Fill in after creating)

| Tier | Monthly | Annual | Lifetime |
|------|---------|--------|----------|
| Sprout | `price_` | `price_` | `price_` |
| Bloom | `price_` | `price_` | `price_` |
| Harvest | `price_` | `price_` | `price_` |
| Orchard | - | `price_` | `price_` |

## Verification Checklist

After converting to live mode, verify:

- [ ] Products appear in Stripe Dashboard (Live mode toggle ON)
- [ ] Prices show correct amounts and currencies
- [ ] Webhook endpoint shows "Enabled" status
- [ ] Test a real purchase with a real card (refund immediately if needed)
- [ ] Webhook events appear in Stripe Dashboard > Developers > Webhooks > Events
- [ ] User's `grow_subscription_tier` updates in Supabase after purchase
- [ ] `grow_subscription_events` table logs the event

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook status in Stripe Dashboard
2. Verify URL is correct: `https://grow.godaisy.io/api/stripe/webhook`
3. Check Vercel function logs: `vercel logs grow.godaisy.io --filter=stripe`
4. Verify `STRIPE_GROW_WEBHOOK_SECRET` is set correctly

### Payments Failing

1. Verify live mode keys are being used (not test keys)
2. Check Stripe Dashboard > Payments for error details
3. Ensure your Stripe account can accept payments in EUR

### Subscription Not Updating in Database

1. Check `grow_subscription_events` table for webhook logs
2. Verify `metadata.app === 'grow_daisy'` in Stripe subscription
3. Check Supabase logs for RLS policy errors

## Rollback to Test Mode

If you need to revert to test mode:

1. Update Vercel env vars back to test price IDs
2. Update webhook secret back to test webhook secret
3. Redeploy

## Files Reference

Key files involved in the subscription system:

```
lib/grow/subscription.ts           # Tier definitions, price ID lookups
pages/api/grow/create-checkout-session.ts  # Creates Stripe checkout
pages/api/stripe/webhook.ts        # Handles Stripe events
hooks/useGrowSubscription.ts       # Frontend subscription state
components/grow/premium/           # Premium gate components
```

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe CLI Reference: https://stripe.com/docs/stripe-cli
- Vercel Environment Variables: https://vercel.com/docs/environment-variables
