# QA Test Plan: RevenueCat IAP Integration — Grow Daisy iOS

**Date:** 2026-02-26
**Feature:** In-App Purchases via RevenueCat for Grow Daisy iOS
**Priority:** Critical (App Store submission blocker)

---

## Prerequisites

- [ ] Physical iOS device or Simulator with StoreKit testing enabled
- [ ] Xcode installed with the `ios-growdaisy` project configured
- [ ] Apple Sandbox tester account created in App Store Connect (Users & Access → Sandbox → Testers)
- [ ] RevenueCat dashboard access: [app.revenuecat.com](https://app.revenuecat.com)
- [ ] Supabase dashboard access to inspect the `profiles` table
- [ ] A Supabase user account to sign into the app

---

## Environment Setup

1. **Build the app in Xcode:**
   ```
   Open ios-growdaisy/App/App.xcworkspace in Xcode
   Select a physical device or simulator
   Build and run (Cmd+R)
   ```

2. **Configure Sandbox tester on device:**
   - Go to **Settings → App Store → Sandbox Account**
   - Sign in with your sandbox tester credentials
   - (On simulator: StoreKit sandbox is automatic)

3. **Sign into the app:**
   - Open Grow Daisy → sign in with a Supabase account
   - Note down the user's Supabase UUID (visible in Supabase dashboard → Authentication → Users)

---

## Test Cases

### TC-1: Premium Page Loads with RevenueCat Prices

**Steps:**
1. Navigate to `/grow/premium`
2. Wait for the pricing cards to load

**Expected:**
- [ ] Pricing cards display for all tiers (Sprout, Bloom, Harvest, Orchard)
- [ ] Prices are shown in the device's local currency (fetched from App Store via RevenueCat, not hardcoded EUR)
- [ ] Billing toggle works: Monthly / Annual / Lifetime
- [ ] No "Coming Soon" placeholder is shown
- [ ] Voucher code input is **NOT** visible on iOS
- [ ] "Restore Purchases" button is visible below pricing cards

---

### TC-2: Purchase Flow — Monthly Subscription

**Steps:**
1. On `/grow/premium`, select **Bloom Monthly**
2. Tap the subscribe/purchase button
3. The native StoreKit purchase sheet should appear
4. Confirm the purchase using sandbox credentials

**Expected:**
- [ ] StoreKit purchase sheet appears with correct product name and price
- [ ] After confirming, the app shows an "Activating..." state
- [ ] Within 5-10 seconds, the UI updates to show Bloom tier as active
- [ ] RevenueCat dashboard → Customers → search by Supabase UUID → shows the transaction
- [ ] Supabase `profiles` table for this user shows:
  - `grow_subscription_tier` = `bloom`
  - `grow_subscription_type` = `monthly`
  - `grow_subscription_start` = populated
  - `grow_subscription_end` = populated (future date)
  - `revenuecat_customer_id` = Supabase UUID

---

### TC-3: Purchase Flow — Annual Subscription

**Steps:**
1. Use a fresh sandbox tester or cancel the previous subscription first
2. On `/grow/premium`, toggle to **Annual** billing
3. Select **Harvest Annual** and complete the purchase

**Expected:**
- [ ] StoreKit sheet shows annual pricing
- [ ] UI updates to Harvest tier
- [ ] Supabase shows `grow_subscription_tier` = `harvest`, `grow_subscription_type` = `annual`

---

### TC-4: Purchase Flow — Lifetime (Non-Consumable)

**Steps:**
1. On `/grow/premium`, toggle to **Lifetime** billing
2. Select **Sprout Lifetime** and complete the purchase

**Expected:**
- [ ] StoreKit sheet shows one-time purchase price
- [ ] UI updates to Sprout tier
- [ ] Supabase shows `grow_subscription_tier` = `sprout`, `grow_subscription_type` = `lifetime`
- [ ] `grow_subscription_end` = `null` (lifetime has no expiry)

---

### TC-5: User Cancels Purchase

**Steps:**
1. Tap a subscribe button to trigger StoreKit sheet
2. Tap **Cancel** on the StoreKit sheet

**Expected:**
- [ ] App returns to premium page silently (no error toast or alert)
- [ ] Tier remains unchanged

---

### TC-6: Restore Purchases

**Steps:**
1. Sign out and sign back in (or reinstall the app)
2. Navigate to `/grow/premium`
3. Tap **Restore Purchases**

**Expected:**
- [ ] Previously purchased subscription is restored
- [ ] UI updates to show the correct tier
- [ ] Supabase profile reflects the restored subscription

---

### TC-7: Restore Purchases (from SubscriptionCard)

**Steps:**
1. Navigate to the Grow Daisy dashboard or account page where the SubscriptionCard is displayed
2. Tap **Restore Purchases** button below the subscription card

**Expected:**
- [ ] Restore completes successfully
- [ ] Subscription card updates to reflect the active tier

---

### TC-8: Manage Subscription Link (iOS)

**Steps:**
1. With an active subscription, find the **Manage Subscription** link on the SubscriptionCard

**Expected:**
- [ ] Tapping the link opens iOS Settings → Subscriptions (via `itms-apps://apps.apple.com/account/subscriptions`)
- [ ] The Grow Daisy subscription appears in the list

---

### TC-9: Subscription Expiration (Sandbox)

**Steps:**
1. Complete a monthly subscription purchase in sandbox
2. In sandbox mode, subscriptions auto-renew at accelerated rates (monthly = ~5 minutes)
3. Cancel the subscription via iOS Settings → Subscriptions
4. Wait for the sandbox subscription to expire

**Expected:**
- [ ] While cancelled but not expired: tier remains active (CANCELLATION event logged, no downgrade)
- [ ] After expiration: EXPIRATION webhook fires
- [ ] Supabase `grow_subscription_tier` reverts to `seed`
- [ ] UI reflects the downgrade

---

### TC-10: Unauthenticated User

**Steps:**
1. Sign out of the app
2. Navigate to `/grow/premium`
3. Tap a subscribe button

**Expected:**
- [ ] User is prompted to sign in before purchase proceeds
- [ ] No crash or unhandled error

---

### TC-11: Webhook Deduplication

**Steps:**
1. Complete a purchase
2. Check Supabase `grow_subscription_events` table

**Expected:**
- [ ] Event is recorded with a `revenuecat_event_id`
- [ ] If the same webhook is delivered twice, only one row exists (unique constraint on `revenuecat_event_id`)

---

### TC-12: Web Fallback — Stripe Unchanged

**Steps:**
1. Open Grow Daisy in a **web browser** (not the iOS app)
2. Navigate to `/grow/premium`

**Expected:**
- [ ] Stripe checkout flow is shown (not RevenueCat)
- [ ] Voucher code input IS visible on web
- [ ] Prices are displayed in EUR (static, from subscription.ts)
- [ ] No references to "App Store" or "Restore Purchases" on web

---

## Audit Trail Verification

After running tests, verify in Supabase:

```sql
-- Check subscription events
SELECT * FROM grow_subscription_events
WHERE user_id = '<test-user-uuid>'
ORDER BY created_at DESC;

-- Check profile state
SELECT id, grow_subscription_tier, grow_subscription_type,
       grow_subscription_start, grow_subscription_end,
       revenuecat_customer_id
FROM profiles
WHERE id = '<test-user-uuid>';
```

---

## RevenueCat Dashboard Checks

- [ ] All 11 products visible under Products
- [ ] 4 entitlements (sprout_access, bloom_access, harvest_access, orchard_access) with correct product attachments
- [ ] Default offering with 11 packages
- [ ] Webhook configured: `https://grow.godaisy.io/api/revenuecat/webhook`
- [ ] Webhook events log shows successful deliveries (HTTP 200)

---

## Known Sandbox Limitations

- Sandbox subscriptions renew at accelerated rates (monthly ~5 min, annual ~1 hour)
- Sandbox payment methods don't charge real money
- StoreKit sheet may look slightly different in sandbox vs production
- Webhook delivery in sandbox may have slight delays

---

## Sign-Off

| Tester | Date | Result | Notes |
|--------|------|--------|-------|
|        |      |        |       |
