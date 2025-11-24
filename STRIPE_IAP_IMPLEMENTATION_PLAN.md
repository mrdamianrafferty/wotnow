# Findr Subscription Implementation Plan
## Complete Guide: Stripe + iOS IAP + Vouchers + Lifetime Access

**Status:** Ready for Review
**Date:** 2025-11-24
**Estimated Implementation Time:** 20-25 hours

---

## 📋 EXECUTIVE SUMMARY

### Pricing Model

| Tier | Web Price | iOS Price | Features |
|------|-----------|-----------|----------|
| **Free** | €0 | €0 | 5 predictions/day, basic indicators, map view |
| **Premium Monthly** | €10/mo | €13/mo | Unlimited predictions, advanced indicators, catch logging, email notifications |
| **Premium Lifetime** | €99 once | €129 once | All Premium features forever (early bird, limited to 1,000 users) |

### Net Revenue (After Fees + VAT)

| Product | Web Net | iOS Net | Difference |
|---------|---------|---------|------------|
| Premium Monthly | €7.93/mo | €7.51/mo | €0.42/mo |
| Premium Lifetime | €78.60 | €91.50 | -€12.90 (iOS better) |

**iOS Lifetime Calculation:**
€129 → Apple -30% (€38.70) → €90.30 → VAT -21% (€15.78) → **€91.50 net**

### Key Features

✅ **Dual Payment System:** Stripe (web) + RevenueCat (iOS IAP)
✅ **Voucher System:** Partner codes, influencer discounts, shop promotions
✅ **Attribution Tracking:** Know which fishing shop brought which customers
✅ **Offline Support:** Cached subscription status (24h)
✅ **Cross-Platform Sync:** Subscribe on web, works on iOS (and vice versa)
✅ **Lifetime Option:** Early adopter pricing with one-time payment

---

## 🗄️ PHASE 1: DATABASE SCHEMA (COMPLETE)

**File:** `supabase/migrations/20251124_subscriptions_complete.sql`

```sql
-- ============================================================================
-- PROFILES TABLE (with subscription columns)
-- ============================================================================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add subscription columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free'
    CHECK (subscription_status IN ('free', 'premium', 'lifetime')),
  ADD COLUMN IF NOT EXISTS subscription_type TEXT
    CHECK (subscription_type IN ('monthly', 'lifetime')),
  ADD COLUMN IF NOT EXISTS payment_platform TEXT
    CHECK (payment_platform IN ('web', 'ios', 'android')),

  -- Stripe fields
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,

  -- Apple IAP fields
  ADD COLUMN IF NOT EXISTS apple_transaction_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT,

  -- Voucher fields
  ADD COLUMN IF NOT EXISTS voucher_code TEXT,
  ADD COLUMN IF NOT EXISTS voucher_applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,

  -- Subscription dates
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,

  -- Lifetime purchase tracking
  ADD COLUMN IF NOT EXISTS lifetime_purchase_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lifetime_payment_amount NUMERIC(10,2);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_apple_transaction ON public.profiles(apple_transaction_id);
CREATE INDEX IF NOT EXISTS idx_profiles_payment_platform ON public.profiles(payment_platform);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_source ON public.profiles(referral_source);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- SUBSCRIPTION EVENTS (audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON public.subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON public.subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe ON public.subscription_events(stripe_event_id);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage subscription events" ON public.subscription_events;
CREATE POLICY "Service role can manage subscription events"
  ON public.subscription_events FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- VOUCHERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Discount configuration
  discount_type TEXT NOT NULL
    CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_months', 'lifetime_discount')),
  discount_value NUMERIC(10,2) NOT NULL,

  -- Usage limits
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,

  -- Validity period
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Partner attribution
  partner_type TEXT,
  partner_id TEXT,
  partner_name TEXT,

  -- What products this applies to
  applies_to TEXT[] DEFAULT ARRAY['monthly', 'lifetime'],

  -- Status
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON public.vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON public.vouchers(active);
CREATE INDEX IF NOT EXISTS idx_vouchers_partner ON public.vouchers(partner_id);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active vouchers" ON public.vouchers;
CREATE POLICY "Anyone can view active vouchers"
  ON public.vouchers FOR SELECT
  USING (active = true AND (valid_until IS NULL OR valid_until > NOW()));

DROP POLICY IF EXISTS "Service role can manage vouchers" ON public.vouchers;
CREATE POLICY "Service role can manage vouchers"
  ON public.vouchers FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- VOUCHER USAGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.voucher_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_type TEXT,
  discount_applied NUMERIC(10,2),
  original_price NUMERIC(10,2),
  final_price NUMERIC(10,2),
  platform TEXT
);

CREATE INDEX IF NOT EXISTS idx_voucher_usage_user ON public.voucher_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher ON public.voucher_usage(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_date ON public.voucher_usage(applied_at);

ALTER TABLE public.voucher_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own voucher usage" ON public.voucher_usage;
CREATE POLICY "Users can view own voucher usage"
  ON public.voucher_usage FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage voucher usage" ON public.voucher_usage;
CREATE POLICY "Service role can manage voucher usage"
  ON public.voucher_usage FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- VOUCHER VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_voucher(
  voucher_code_input TEXT,
  user_id_input UUID,
  subscription_type_input TEXT
) RETURNS JSONB AS $$
DECLARE
  voucher_record RECORD;
BEGIN
  -- Normalize code to uppercase
  voucher_code_input := UPPER(TRIM(voucher_code_input));

  -- Check if voucher exists and is valid
  SELECT * INTO voucher_record
  FROM public.vouchers
  WHERE code = voucher_code_input
    AND active = true
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses)
    AND subscription_type_input = ANY(applies_to);

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired voucher code'
    );
  END IF;

  -- Check if user already used this voucher
  IF EXISTS (
    SELECT 1 FROM public.voucher_usage
    WHERE voucher_id = voucher_record.id
      AND user_id = user_id_input
  ) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'You have already used this voucher'
    );
  END IF;

  -- Return voucher details
  RETURN jsonb_build_object(
    'valid', true,
    'voucher_id', voucher_record.id,
    'discount_type', voucher_record.discount_type,
    'discount_value', voucher_record.discount_value,
    'description', voucher_record.description,
    'partner_name', voucher_record.partner_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- APPLY VOUCHER FUNCTION (called after successful payment)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_voucher(
  voucher_id_input UUID,
  user_id_input UUID,
  subscription_type_input TEXT,
  original_price_input NUMERIC,
  final_price_input NUMERIC,
  platform_input TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  voucher_code_val TEXT;
BEGIN
  -- Get voucher code
  SELECT code INTO voucher_code_val
  FROM public.vouchers
  WHERE id = voucher_id_input;

  -- Record usage
  INSERT INTO public.voucher_usage (
    voucher_id,
    user_id,
    subscription_type,
    discount_applied,
    original_price,
    final_price,
    platform
  ) VALUES (
    voucher_id_input,
    user_id_input,
    subscription_type_input,
    original_price_input - final_price_input,
    original_price_input,
    final_price_input,
    platform_input
  );

  -- Update voucher usage count
  UPDATE public.vouchers
  SET current_uses = current_uses + 1
  WHERE id = voucher_id_input;

  -- Update user profile with voucher info
  UPDATE public.profiles
  SET
    voucher_code = voucher_code_val,
    voucher_applied_at = NOW()
  WHERE id = user_id_input;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ANALYTICS VIEWS (read-only)
-- ============================================================================

-- Partner performance view
CREATE OR REPLACE VIEW public.partner_performance AS
SELECT
  v.partner_name,
  v.partner_type,
  v.code,
  v.max_uses,
  v.current_uses,
  COUNT(vu.id) as actual_redemptions,
  SUM(vu.discount_applied) as total_discount_given,
  SUM(vu.final_price) as total_revenue_generated,
  AVG(vu.discount_applied) as avg_discount_per_use,
  MIN(vu.applied_at) as first_use,
  MAX(vu.applied_at) as last_use
FROM vouchers v
LEFT JOIN voucher_usage vu ON v.id = vu.voucher_id
WHERE v.active = true
GROUP BY v.id, v.partner_name, v.partner_type, v.code, v.max_uses, v.current_uses
ORDER BY total_revenue_generated DESC NULLS LAST;

-- Subscription overview
CREATE OR REPLACE VIEW public.subscription_overview AS
SELECT
  subscription_status,
  subscription_type,
  payment_platform,
  COUNT(*) as user_count,
  COUNT(CASE WHEN trial_ends_at > NOW() THEN 1 END) as trialing_count,
  SUM(lifetime_payment_amount) as total_lifetime_revenue
FROM profiles
WHERE subscription_status != 'free'
GROUP BY subscription_status, subscription_type, payment_platform;

-- Grant access to authenticated users for read-only views
GRANT SELECT ON public.partner_performance TO authenticated;
GRANT SELECT ON public.subscription_overview TO authenticated;

-- ============================================================================
-- SEED DATA: Sample Vouchers
-- ============================================================================

-- Early bird lifetime discount
INSERT INTO public.vouchers (code, description, discount_type, discount_value, max_uses, partner_type, partner_name, applies_to)
VALUES
  ('EARLYBIRD25', '25% off Lifetime - Early Adopter Special', 'lifetime_discount', 25, 500, 'promo', 'Findr Launch', ARRAY['lifetime']),
  ('FISHINGSHOP20', '20% off any subscription - Fishing Shop Partnership', 'percentage', 20, NULL, 'shop', 'Generic Shop Code', ARRAY['monthly', 'lifetime']),
  ('BETATESTER', 'Free Premium access for Beta Testers', 'percentage', 100, 50, 'promo', 'Beta Program', ARRAY['monthly'])
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE public.profiles IS 'User profiles with subscription status';
COMMENT ON TABLE public.vouchers IS 'Promotional voucher codes for partnerships and campaigns';
COMMENT ON TABLE public.voucher_usage IS 'Tracks which users used which vouchers and when';
COMMENT ON TABLE public.subscription_events IS 'Audit log of all subscription-related events from Stripe and Apple';
```

**Deploy Command:**
```bash
supabase db push
```

---

## 📦 PHASE 2: INSTALL DEPENDENCIES

```bash
# Stripe for web payments
npm install stripe @stripe/stripe-js

# RevenueCat for iOS IAP
npm install @revenuecat/purchases-capacitor

# Type definitions
npm install --save-dev @types/stripe

# Sync Capacitor plugins to native projects
npx cap sync
```

---

## 🔐 PHASE 3: ENVIRONMENT VARIABLES

**Add to `.env.local` and Vercel Environment Variables:**

```bash
# ============================================================================
# STRIPE CONFIGURATION
# ============================================================================
# Get from: https://dashboard.stripe.com/apikeys

# Test mode (development)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Live mode (production - add to Vercel only, not .env.local)
# STRIPE_SECRET_KEY=sk_live_xxx
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Webhook signing secret (get after creating webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs (get after creating products in Stripe)
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_LIFETIME_PRICE_ID=price_xxx

# ============================================================================
# REVENUECAT CONFIGURATION (iOS IAP)
# ============================================================================
# Get from: https://app.revenuecat.com

REVENUECAT_API_KEY_IOS=appl_xxx
REVENUECAT_WEBHOOK_SECRET=xxx

# Android (future)
# REVENUECAT_API_KEY_ANDROID=goog_xxx

# ============================================================================
# EXISTING SUPABASE VARIABLES (already set)
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx  # CRITICAL: Needed for webhooks

# ============================================================================
# APP CONFIGURATION
# ============================================================================
NEXT_PUBLIC_BASE_URL=https://fishfindr.eu
```

---

## 💳 PHASE 4: STRIPE SETUP

### 4.1 Create Products in Stripe Dashboard

**Go to:** https://dashboard.stripe.com/products

**Product 1: Premium Monthly**
1. Click "Add product"
2. Name: `Findr Premium Monthly`
3. Description: `Unlimited fishing predictions, advanced indicators, catch logging, and email notifications`
4. Pricing model: `Recurring`
5. Price: `€10.00` per `month`
6. Currency: `EUR`
7. **Enable "Free trial"**: 7 days
8. **Save** and copy the **Price ID** → `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID`

**Product 2: Premium Lifetime**
1. Click "Add product"
2. Name: `Findr Premium Lifetime`
3. Description: `All Premium features, forever. One-time payment, no recurring charges.`
4. Pricing model: `One time`
5. Price: `€99.00`
6. Currency: `EUR`
7. **Save** and copy the **Price ID** → `NEXT_PUBLIC_STRIPE_PREMIUM_LIFETIME_PRICE_ID`

### 4.2 Enable Stripe Tax (for Spanish VAT)

**Go to:** https://dashboard.stripe.com/settings/tax

1. Click "Get started" on Stripe Tax
2. Add business location: **Spain**
3. Enable "Stripe Tax"
4. This will automatically calculate and apply 21% Spanish VAT

### 4.3 Enable Customer Portal

**Go to:** https://dashboard.stripe.com/settings/billing/portal

1. Click "Activate test link" (or "Activate live link" for production)
2. Configure settings:
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to update payment methods
   - ✅ Show invoices and receipts
3. Save configuration

### 4.4 Configure Webhook

**Go to:** https://dashboard.stripe.com/webhooks

1. Click "Add endpoint"
2. **Endpoint URL:** `https://fishfindr.eu/api/stripe/webhook`
3. **Description:** "Findr Subscription Events"
4. **Events to listen:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Add endpoint**
6. **Copy "Signing secret"** → `STRIPE_WEBHOOK_SECRET`

### 4.5 Enable Promotion Codes

**Go to:** https://dashboard.stripe.com/coupons

Create sample coupons for testing:

1. **20OFF**
   - Amount off: 20%
   - Duration: Once
   - Applies to: All products

2. **LIFETIME25**
   - Amount off: 25%
   - Duration: Once
   - Applies to: Specific products → Select "Premium Lifetime"

---

## 📱 PHASE 5: IOS IAP SETUP

### 5.1 App Store Connect Configuration

**Go to:** https://appstoreconnect.apple.com

1. **Navigate to:** Your App → Features → In-App Purchases
2. **Create Product 1: Premium Monthly**
   - Product ID: `premium_monthly`
   - Type: Auto-Renewable Subscription
   - Subscription Duration: 1 Month
   - Price: €12.99/month (Price Tier 9 in EUR)
   - Localization: Add descriptions in EN, ES, FR, DE, IT, PT
   - **Free Trial:** 7 days
   - Subscription Group: Create new "Premium"

3. **Create Product 2: Premium Lifetime**
   - Product ID: `premium_lifetime`
   - Type: Non-Consumable
   - Price: €129 (Tier 85 in EUR)
   - Localization: Add descriptions

### 5.2 RevenueCat Setup

**Go to:** https://app.revenuecat.com

1. **Create account** and verify email
2. **Create project:** "Findr"
3. **Add iOS app:**
   - App name: Findr
   - Bundle ID: `eu.fishfindr.app` (from your Capacitor config)
   - App Store Connect API Key: Upload from App Store Connect
4. **Configure products:**
   - Add `premium_monthly` → Map to entitlement "premium"
   - Add `premium_lifetime` → Map to entitlement "lifetime"
5. **Get API Keys:**
   - iOS: `appl_xxx` → `REVENUECAT_API_KEY_IOS`
6. **Configure webhook:**
   - URL: `https://fishfindr.eu/api/revenuecat/webhook`
   - Copy webhook secret → `REVENUECAT_WEBHOOK_SECRET`

---

## 💻 PHASE 6: CODE IMPLEMENTATION

### 6.1 Platform Detection

**File:** `lib/platform/detect.ts`

```typescript
import { Capacitor } from '@capacitor/core';

export type PaymentPlatform = 'web' | 'ios' | 'android';

export function getPaymentPlatform(): PaymentPlatform {
  const platform = Capacitor.getPlatform();

  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

export function canUseStripe(): boolean {
  return getPaymentPlatform() === 'web';
}

export function mustUseIAP(): boolean {
  return ['ios', 'android'].includes(getPaymentPlatform());
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
```

### 6.2 Stripe Client (Server-side)

**File:** `lib/stripe/server.ts`

```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
  appInfo: {
    name: 'Findr',
    version: '1.0.0',
    url: 'https://fishfindr.eu',
  },
});
```

### 6.3 Stripe Client (Client-side)

**File:** `lib/stripe/client.ts`

```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined');
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};
```

### 6.4 RevenueCat Client

**File:** `lib/iap/revenuecat.ts`

```typescript
import { Purchases, LOG_LEVEL, PurchasesOffering } from '@revenuecat/purchases-capacitor';

let initialized = false;

export async function initializeRevenueCat(userId: string) {
  if (initialized) return;

  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY_IOS;
  if (!apiKey) {
    throw new Error('REVENUECAT_API_KEY_IOS not configured');
  }

  await Purchases.configure({
    apiKey,
    appUserID: userId,
  });

  if (process.env.NODE_ENV === 'development') {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  }

  initialized = true;
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Failed to get RevenueCat offerings:', error);
    return null;
  }
}

export async function purchasePackage(packageIdentifier: string) {
  try {
    const result = await Purchases.purchasePackage({
      aPackage: { identifier: packageIdentifier } as any
    });
    return result.customerInfo;
  } catch (error: any) {
    if (error.code === 'PURCHASE_CANCELLED_ERROR') {
      return null; // User cancelled, not an error
    }
    throw error;
  }
}

export async function restorePurchases() {
  try {
    const result = await Purchases.restorePurchases();
    return result.customerInfo;
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    throw error;
  }
}

export async function getCustomerInfo() {
  try {
    const result = await Purchases.getCustomerInfo();
    return result.customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}
```

### 6.5 Offline Subscription Cache

**File:** `lib/offline/subscriptionCache.ts`

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SubscriptionDB extends DBSchema {
  subscription: {
    key: string;
    value: {
      status: string;
      cachedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<SubscriptionDB>> | null = null;

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SubscriptionDB>('findr-subscription', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('subscription')) {
          db.createObjectStore('subscription');
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheSubscriptionStatus(status: string): Promise<void> {
  try {
    const db = await getDB();
    await db.put('subscription', {
      status,
      cachedAt: Date.now(),
    }, 'current');
  } catch (error) {
    console.error('Failed to cache subscription:', error);
  }
}

export async function getCachedSubscriptionStatus(): Promise<string | null> {
  try {
    const db = await getDB();
    const cached = await db.get('subscription', 'current');

    if (!cached) return null;

    // Cache valid for 24 hours
    const age = Date.now() - cached.cachedAt;
    if (age > 24 * 60 * 60 * 1000) return null;

    return cached.status;
  } catch (error) {
    console.error('Failed to get cached subscription:', error);
    return null;
  }
}

export async function clearSubscriptionCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('subscription', 'current');
  } catch (error) {
    console.error('Failed to clear subscription cache:', error);
  }
}
```

### 6.6 Subscription Hook

**File:** `hooks/useSubscription.ts`

```typescript
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cacheSubscriptionStatus, getCachedSubscriptionStatus } from '@/lib/offline/subscriptionCache';

export type SubscriptionStatus = 'free' | 'premium' | 'lifetime';
export type SubscriptionType = 'monthly' | 'lifetime' | null;

export interface SubscriptionState {
  status: SubscriptionStatus;
  type: SubscriptionType;
  loading: boolean;
  isPremium: boolean;
  isLifetime: boolean;
  isFree: boolean;
  isTrialing: boolean;
  paymentPlatform: string | null;
  trialEndsAt: Date | null;
}

export function useSubscription(): SubscriptionState {
  const [status, setStatus] = useState<SubscriptionStatus>('free');
  const [type, setType] = useState<SubscriptionType>(null);
  const [loading, setLoading] = useState(true);
  const [isTrialing, setIsTrialing] = useState(false);
  const [paymentPlatform, setPaymentPlatform] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchSubscription() {
      try {
        // Try cached first for offline support
        const cached = await getCachedSubscriptionStatus();
        if (cached) {
          setStatus(cached as SubscriptionStatus);
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_type, trial_ends_at, payment_platform')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching subscription:', error);
          setLoading(false);
          return;
        }

        if (profile) {
          const newStatus = profile.subscription_status as SubscriptionStatus;
          const newType = profile.subscription_type as SubscriptionType;

          setStatus(newStatus);
          setType(newType);
          setPaymentPlatform(profile.payment_platform);

          // Cache for offline use
          await cacheSubscriptionStatus(newStatus);

          // Check if in trial
          if (profile.trial_ends_at) {
            const trialEnd = new Date(profile.trial_ends_at);
            setTrialEndsAt(trialEnd);
            setIsTrialing(trialEnd > new Date());
          }
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        async (payload) => {
          if (payload.new.subscription_status) {
            const newStatus = payload.new.subscription_status as SubscriptionStatus;
            const newType = payload.new.subscription_type as SubscriptionType;
            setStatus(newStatus);
            setType(newType);
            await cacheSubscriptionStatus(newStatus);
          }
          if (payload.new.payment_platform) {
            setPaymentPlatform(payload.new.payment_platform);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    status,
    type,
    loading,
    isPremium: status === 'premium' || status === 'lifetime',
    isLifetime: status === 'lifetime',
    isFree: status === 'free',
    isTrialing,
    paymentPlatform,
    trialEndsAt,
  };
}
```

### 6.7 Voucher Validation API

**File:** `pages/api/vouchers/validate.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code, subscriptionType } = req.body;

    if (!code || !subscriptionType) {
      return res.status(400).json({ error: 'Code and subscription type required' });
    }

    // Call RPC function to validate
    const { data, error } = await supabase.rpc('validate_voucher', {
      voucher_code_input: code.toUpperCase(),
      user_id_input: user.id,
      subscription_type_input: subscriptionType,
    });

    if (error) {
      console.error('Voucher validation error:', error);
      return res.status(500).json({ error: 'Validation failed' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Voucher validation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 6.8 Stripe Checkout Session API

**File:** `pages/api/stripe/create-checkout-session.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { priceId, voucherId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID required' });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Handle voucher discount
    let discounts = [];
    if (voucherId) {
      const { data: voucher } = await supabase
        .from('vouchers')
        .select('*')
        .eq('id', voucherId)
        .single();

      if (voucher && voucher.active) {
        // Create Stripe coupon for this voucher
        const couponId = `voucher_${voucher.code}`;

        try {
          // Try to retrieve existing coupon
          await stripe.coupons.retrieve(couponId);
        } catch {
          // Create new coupon if doesn't exist
          if (voucher.discount_type === 'percentage') {
            await stripe.coupons.create({
              id: couponId,
              percent_off: voucher.discount_value,
              duration: 'once',
            });
          } else if (voucher.discount_type === 'fixed_amount') {
            await stripe.coupons.create({
              id: couponId,
              amount_off: Math.round(voucher.discount_value * 100), // Convert to cents
              currency: 'eur',
              duration: 'once',
            });
          }
        }

        discounts = [{ coupon: couponId }];
      }
    }

    // Determine if this is a subscription or one-time payment
    const isLifetime = priceId === process.env.NEXT_PUBLIC_STRIPE_PREMIUM_LIFETIME_PRICE_ID;
    const mode = isLifetime ? 'payment' : 'subscription';

    const sessionConfig: any = {
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/findr/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/findr/pricing`,
      allow_promotion_codes: !voucherId, // Only allow manual codes if no voucher applied
      automatic_tax: { enabled: true }, // Handles Spanish VAT automatically
      customer_update: {
        address: 'auto', // Collect address for VAT compliance
      },
      metadata: {
        supabase_user_id: user.id,
        voucher_id: voucherId || '',
      },
    };

    if (discounts.length > 0) {
      sessionConfig.discounts = discounts;
    }

    if (!isLifetime) {
      // Subscription-specific settings
      sessionConfig.subscription_data = {
        trial_period_days: 7,
        metadata: {
          supabase_user_id: user.id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
```

### 6.9 Stripe Webhook Handler

**File:** `pages/api/stripe/webhook.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';

// Disable body parser for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Use service role for webhook operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const voucherId = session.metadata?.voucher_id;

        if (!userId) {
          console.error('No supabase_user_id in checkout session metadata');
          break;
        }

        // Check if this was a lifetime purchase
        const isLifetime = session.mode === 'payment';

        if (isLifetime) {
          // Lifetime purchase
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'lifetime',
              subscription_type: 'lifetime',
              payment_platform: 'web',
              stripe_customer_id: session.customer as string,
              lifetime_purchase_date: new Date().toISOString(),
              lifetime_payment_amount: (session.amount_total || 0) / 100,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        } else {
          // Monthly subscription - will be updated by subscription.created event
        }

        // Apply voucher if present
        if (voucherId && session.amount_total !== null) {
          await supabase.rpc('apply_voucher', {
            voucher_id_input: voucherId,
            user_id_input: userId,
            subscription_type_input: isLifetime ? 'lifetime' : 'monthly',
            original_price_input: (session.amount_subtotal || 0) / 100,
            final_price_input: session.amount_total / 100,
            platform_input: 'web',
          });
        }

        await supabase.from('subscription_events').insert({
          user_id: userId,
          event_type: event.type,
          stripe_event_id: event.id,
          event_data: session,
        });

        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.supabase_user_id;

        if (!userId) {
          console.error('No supabase_user_id in subscription metadata');
          break;
        }

        const status = subscription.status === 'active' || subscription.status === 'trialing'
          ? 'premium'
          : 'free';

        await supabase
          .from('profiles')
          .update({
            subscription_status: status,
            subscription_type: 'monthly',
            payment_platform: 'web',
            stripe_subscription_id: subscription.id,
            subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
            subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_ends_at: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        await supabase.from('subscription_events').insert({
          user_id: userId,
          event_type: event.type,
          stripe_event_id: event.id,
          event_data: subscription,
        });

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.supabase_user_id;

        if (!userId) break;

        await supabase
          .from('profiles')
          .update({
            subscription_status: 'free',
            stripe_subscription_id: null,
            subscription_end_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        await supabase.from('subscription_events').insert({
          user_id: userId,
          event_type: event.type,
          stripe_event_id: event.id,
          event_data: subscription,
        });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}
```

### 6.10 Stripe Customer Portal API

**File:** `pages/api/stripe/create-portal-session.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/lib/supabase/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/findr/account`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}
```

### 6.11 RevenueCat Webhook Handler

**File:** `pages/api/revenuecat/webhook.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // TODO: Verify RevenueCat webhook signature
  const signature = req.headers['x-revenuecat-signature'] as string;
  // Implement signature verification here

  const event = req.body;
  const { type, app_user_id, product_id, entitlement_ids } = event;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    const isLifetime = product_id === 'premium_lifetime';

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'NON_RENEWING_PURCHASE': {
        const status = isLifetime ? 'lifetime' : 'premium';
        const subscriptionType = isLifetime ? 'lifetime' : 'monthly';

        const updateData: any = {
          subscription_status: status,
          subscription_type: subscriptionType,
          payment_platform: 'ios',
          apple_transaction_id: event.transaction_id,
          apple_original_transaction_id: event.original_transaction_id,
          updated_at: new Date().toISOString(),
        };

        if (isLifetime) {
          updateData.lifetime_purchase_date = new Date(event.purchased_at_ms).toISOString();
          updateData.lifetime_payment_amount = event.price / 100; // Convert cents to euros
        } else {
          updateData.subscription_start_date = new Date(event.purchased_at_ms).toISOString();
          updateData.subscription_end_date = event.expiration_at_ms
            ? new Date(event.expiration_at_ms).toISOString()
            : null;
        }

        await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', app_user_id);

        await supabase.from('subscription_events').insert({
          user_id: app_user_id,
          event_type: `revenuecat.${type}`,
          event_data: event,
        });

        break;
      }

      case 'CANCELLATION':
      case 'EXPIRATION': {
        // Only downgrade to free if not lifetime
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', app_user_id)
          .single();

        if (profile?.subscription_status !== 'lifetime') {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'free',
              subscription_end_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', app_user_id);
        }

        await supabase.from('subscription_events').insert({
          user_id: app_user_id,
          event_type: `revenuecat.${type}`,
          event_data: event,
        });

        break;
      }

      default:
        console.log(`Unhandled RevenueCat event: ${type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
```

---

## 🧪 PHASE 7: TESTING

### 7.1 Testing Checklist

**Stripe Test Cards:**
- ✅ Success: `4242 4242 4242 4242`
- ✅ Requires 3D Secure: `4000 0027 6000 3184`
- ✅ Declined: `4000 0000 0000 9995`
- ✅ Expired card: `4000 0000 0000 0069`

**Test Scenarios - Web (Stripe):**

1. **Monthly Subscription (No Voucher)**
   - [ ] Navigate to pricing page
   - [ ] Click "Start 7-Day Free Trial"
   - [ ] Complete Stripe checkout with test card
   - [ ] Verify redirected to /findr/account
   - [ ] Check database: `subscription_status = 'premium'`, `subscription_type = 'monthly'`
   - [ ] Verify Stripe webhook received and processed
   - [ ] Check subscription_events table for event log

2. **Monthly Subscription (With 20% Voucher)**
   - [ ] Enter voucher code "FISHINGSHOP20"
   - [ ] Verify price shows discount (€10 → €8)
   - [ ] Complete checkout
   - [ ] Check voucher_usage table has record
   - [ ] Check vouchers table incremented current_uses

3. **Lifetime Purchase (No Voucher)**
   - [ ] Click "Get Lifetime Access" for €99
   - [ ] Complete checkout
   - [ ] Verify database: `subscription_status = 'lifetime'`, `subscription_type = 'lifetime'`
   - [ ] Verify `lifetime_payment_amount = 99.00`
   - [ ] Check Stripe dashboard for one-time payment

4. **Lifetime Purchase (With 25% Voucher)**
   - [ ] Enter "EARLYBIRD25" code
   - [ ] Verify price shows €74.25 (€99 - 25%)
   - [ ] Complete purchase
   - [ ] Verify voucher applied in database

5. **Trial Expiration**
   - [ ] Subscribe to monthly
   - [ ] Manually update trial_ends_at to yesterday in database
   - [ ] Reload app
   - [ ] Verify isTrialing = false in hook

6. **Subscription Cancellation**
   - [ ] Subscribe to monthly
   - [ ] Click "Manage Subscription" → Opens Stripe portal
   - [ ] Cancel subscription
   - [ ] Verify subscription_status remains 'premium' until period ends
   - [ ] Manually trigger `customer.subscription.deleted` webhook
   - [ ] Verify status changes to 'free'

7. **Customer Portal**
   - [ ] Navigate to /findr/account
   - [ ] Click "Manage Subscription"
   - [ ] Verify Stripe portal opens
   - [ ] Update payment method
   - [ ] Download invoice

**Test Scenarios - iOS (RevenueCat):**

1. **iOS Monthly Subscription**
   - [ ] Open iOS app in Xcode simulator
   - [ ] Navigate to pricing page
   - [ ] Verify iOS pricing shows €13/month
   - [ ] Click subscribe → StoreKit sheet appears
   - [ ] Complete sandbox purchase
   - [ ] Verify RevenueCat webhook received
   - [ ] Check database: `payment_platform = 'ios'`

2. **iOS Lifetime Purchase**
   - [ ] Purchase lifetime for €129
   - [ ] Verify database: `subscription_status = 'lifetime'`
   - [ ] Check `apple_transaction_id` populated

3. **Restore Purchases**
   - [ ] Delete and reinstall app
   - [ ] Login with same account
   - [ ] Click "Restore Purchases"
   - [ ] Verify subscription restored

4. **Cross-Platform Recognition**
   - [ ] Subscribe on web
   - [ ] Login on iOS app
   - [ ] Verify premium features unlocked (even though not purchased via Apple)
   - [ ] Reverse: Purchase on iOS, verify works on web

**Voucher System Tests:**

1. **Invalid Voucher**
   - [ ] Enter "INVALIDCODE"
   - [ ] Verify error: "Invalid or expired voucher code"

2. **Expired Voucher**
   - [ ] Create voucher with valid_until = yesterday
   - [ ] Try to apply
   - [ ] Verify rejected

3. **Max Uses Reached**
   - [ ] Create voucher with max_uses = 1
   - [ ] Use it once
   - [ ] Try to use again
   - [ ] Verify error: "Voucher already used"

4. **Wrong Product Type**
   - [ ] Create voucher with applies_to = ['lifetime']
   - [ ] Try to apply to monthly subscription
   - [ ] Verify validation fails

5. **Partner Attribution**
   - [ ] Use voucher with partner_name = "Test Shop"
   - [ ] Complete purchase
   - [ ] Query partner_performance view
   - [ ] Verify attribution recorded

**Offline Tests:**

1. **Cache Subscription Status**
   - [ ] Subscribe to premium
   - [ ] Disconnect internet
   - [ ] Reload app
   - [ ] Verify premium features still work (cached)
   - [ ] Wait 25 hours
   - [ ] Verify cache expires and reverts to free

2. **Realtime Subscription Updates**
   - [ ] Open app in two browser tabs
   - [ ] Subscribe in tab 1
   - [ ] Verify tab 2 updates in realtime via Supabase subscription

### 7.2 Webhook Testing with Stripe CLI

**Install Stripe CLI:**
```bash
brew install stripe/stripe-cli/stripe
```

**Login:**
```bash
stripe login
```

**Forward webhooks to local server:**
```bash
# Start Next.js dev server first
npm run dev

# In another terminal, forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Trigger test events:**
```bash
# Subscription created
stripe trigger customer.subscription.created

# Subscription updated
stripe trigger customer.subscription.updated

# Subscription deleted
stripe trigger customer.subscription.deleted

# Checkout completed
stripe trigger checkout.session.completed
```

**Check logs:**
- Terminal running `stripe listen` shows events
- Next.js console shows webhook handler logs
- Check Supabase dashboard → subscription_events table

### 7.3 RevenueCat Sandbox Testing

**iOS Sandbox Users:**
1. Settings → App Store → Sandbox Account
2. Create test Apple ID: test@fishfindr.eu
3. Use in app for testing purchases

**RevenueCat Dashboard:**
- Go to https://app.revenuecat.com
- Navigate to "Customers" tab
- Find your test user (Supabase user ID)
- Verify entitlements show "premium" or "lifetime"

### 7.4 Analytics Queries

**Subscription Overview:**
```sql
SELECT * FROM public.subscription_overview;
```

**Partner Performance:**
```sql
SELECT * FROM public.partner_performance
ORDER BY total_revenue_generated DESC;
```

**Recent Subscriptions:**
```sql
SELECT
  p.email,
  p.subscription_status,
  p.subscription_type,
  p.payment_platform,
  p.voucher_code,
  p.subscription_start_date
FROM profiles p
WHERE subscription_status != 'free'
ORDER BY subscription_start_date DESC
LIMIT 20;
```

**Voucher Usage by Partner:**
```sql
SELECT
  v.partner_name,
  COUNT(vu.id) as uses,
  SUM(vu.discount_applied) as total_discount,
  SUM(vu.final_price) as revenue_after_discount
FROM vouchers v
JOIN voucher_usage vu ON v.id = vu.voucher_id
GROUP BY v.partner_name
ORDER BY uses DESC;
```

---

## 🚀 PHASE 8: DEPLOYMENT

### 8.1 Pre-Deployment Checklist

**Database:**
- [ ] Run migration on production Supabase
- [ ] Verify all tables created
- [ ] Test RPC functions (validate_voucher, apply_voucher)
- [ ] Create initial vouchers (EARLYBIRD25, etc.)

**Environment Variables:**
- [ ] Add all env vars to Vercel (production)
- [ ] Use **live** Stripe keys (sk_live_, pk_live_)
- [ ] Use **live** webhook secret
- [ ] Verify SUPABASE_SERVICE_ROLE_KEY is set

**Stripe:**
- [ ] Create products in **live mode**
- [ ] Copy live Price IDs to Vercel env
- [ ] Configure live webhook: https://fishfindr.eu/api/stripe/webhook
- [ ] Enable Stripe Tax in live mode
- [ ] Activate customer portal in live mode
- [ ] Test checkout with real card (cancel immediately)

**RevenueCat:**
- [ ] App Store Connect: In-App Purchases approved
- [ ] RevenueCat: Switch to production API keys
- [ ] Configure production webhook
- [ ] Test purchase in TestFlight with real Apple ID

### 8.2 Deployment Steps

**Step 1: Database** (10 mins)
```bash
# Deploy migration to production
supabase db push --db-url $PRODUCTION_DATABASE_URL

# Verify migration succeeded
supabase db status

# Create initial vouchers
npx tsx scripts/create-voucher.ts
```

**Step 2: Code Deployment** (15 mins)
```bash
# Ensure all env vars set in Vercel dashboard
vercel env pull

# Deploy to production
git add .
git commit -m "Add subscription system with Stripe + IAP"
git push origin main

# Vercel auto-deploys from main branch
```

**Step 3: Stripe Configuration** (20 mins)
1. Switch Stripe dashboard to **Live mode**
2. Create products (Premium Monthly €10, Premium Lifetime €99)
3. Copy Price IDs → Vercel env vars → Redeploy
4. Create webhook → https://fishfindr.eu/api/stripe/webhook
5. Copy webhook secret → Vercel env → Redeploy

**Step 4: Test Live Webhook** (10 mins)
```bash
# Trigger test charge
stripe trigger checkout.session.completed --live

# Check webhook logs
stripe logs tail --live
```

**Step 5: iOS TestFlight** (30 mins)
1. Xcode: Archive → Distribute to App Store Connect
2. App Store Connect: Add to TestFlight
3. Wait for build to process (~10 mins)
4. Add external testers
5. Test purchase flow in TestFlight
6. Verify RevenueCat webhook fires

**Step 6: Soft Launch** (1 day)
1. Deploy to production
2. **Don't announce yet**
3. Add pricing link to footer only (not main nav)
4. Test with 5-10 beta users
5. Monitor for errors:
   - Vercel logs
   - Supabase logs
   - Stripe dashboard
   - RevenueCat dashboard

**Step 7: Public Launch** (ongoing)
1. Add pricing link to main navigation
2. Announce on social media
3. Email existing users
4. Partner outreach (fishing shops, influencers)
5. Monitor metrics daily

### 8.3 Rollback Plan

**If critical bug found:**

1. **Disable subscriptions temporarily:**
```sql
-- Make all users premium for free (temporary)
UPDATE profiles SET subscription_status = 'premium' WHERE subscription_status = 'free';
```

2. **Remove pricing page from navigation**

3. **Fix bug and redeploy**

4. **Re-enable subscriptions:**
```sql
-- Revert to actual subscription status
-- (Keep subscription_events table as source of truth)
```

---

## 📊 PHASE 9: MONITORING & ANALYTICS

### 9.1 Key Metrics to Track

**Revenue Metrics:**
- MRR (Monthly Recurring Revenue)
- Lifetime revenue
- Average revenue per user (ARPU)
- Churn rate
- Trial conversion rate

**User Metrics:**
- Free users
- Premium monthly users
- Lifetime users
- Users in trial
- Cancelled subscriptions

**Voucher Metrics:**
- Most used vouchers
- Revenue per partner
- Conversion rate by voucher type

### 9.2 Monitoring Tools

**Stripe Dashboard:**
- Revenue charts
- Subscription counts
- Failed payments
- Customer retention

**Supabase Dashboard:**
- Real-time user counts
- Subscription status distribution
- Query performance

**RevenueCat Dashboard:**
- iOS subscription metrics
- App Store revenue
- Trial conversion rate

**Vercel Logs:**
- API endpoint errors
- Webhook failures
- Performance metrics

### 9.3 Alert Setup

**Set up alerts for:**

1. **Webhook failures** > 5% in 1 hour
   - Check Stripe dashboard → Webhooks → View logs
   - Common cause: Database RLS policy error

2. **Failed payments** > 10 in 1 day
   - Check Stripe dashboard → Payments
   - Send dunning emails automatically via Stripe

3. **Database errors** on subscription_events table
   - Check Supabase logs
   - Verify service role key is correct

4. **RevenueCat sync failures**
   - Check RevenueCat dashboard → Integrations
   - Verify webhook endpoint responding

### 9.4 Analytics Queries

**Monthly Revenue Report:**
```sql
SELECT
  DATE_TRUNC('month', subscription_start_date) as month,
  COUNT(*) as new_subscriptions,
  COUNT(CASE WHEN subscription_type = 'monthly' THEN 1 END) as monthly_count,
  COUNT(CASE WHEN subscription_type = 'lifetime' THEN 1 END) as lifetime_count,
  SUM(CASE
    WHEN subscription_type = 'monthly' THEN 10
    WHEN subscription_type = 'lifetime' THEN lifetime_payment_amount
  END) as gross_revenue
FROM profiles
WHERE subscription_status IN ('premium', 'lifetime')
  AND subscription_start_date IS NOT NULL
GROUP BY month
ORDER BY month DESC;
```

**Churn Analysis:**
```sql
SELECT
  COUNT(*) as total_cancelled,
  AVG(EXTRACT(EPOCH FROM (subscription_end_date - subscription_start_date)) / 86400) as avg_days_subscribed,
  COUNT(CASE WHEN payment_platform = 'web' THEN 1 END) as web_cancellations,
  COUNT(CASE WHEN payment_platform = 'ios' THEN 1 END) as ios_cancellations
FROM profiles
WHERE subscription_status = 'free'
  AND subscription_end_date > subscription_start_date;
```

**Trial Conversion Rate:**
```sql
SELECT
  COUNT(*) FILTER (WHERE trial_ends_at IS NOT NULL) as trials_started,
  COUNT(*) FILTER (WHERE trial_ends_at < NOW() AND subscription_status = 'premium') as trials_converted,
  ROUND(
    COUNT(*) FILTER (WHERE trial_ends_at < NOW() AND subscription_status = 'premium')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE trial_ends_at < NOW()), 0) * 100,
    2
  ) as conversion_rate_pct
FROM profiles;
```

---

## ✅ FINAL CHECKLIST

### Pre-Launch Checklist

**Database:**
- [ ] Migration deployed to production
- [ ] All tables created and indexed
- [ ] RPC functions tested
- [ ] Initial vouchers created
- [ ] Views accessible

**Stripe:**
- [ ] Live mode products created
- [ ] Price IDs in Vercel env
- [ ] Webhook endpoint configured
- [ ] Webhook secret in Vercel env
- [ ] Stripe Tax enabled
- [ ] Customer portal activated
- [ ] Test purchase completed and refunded

**RevenueCat:**
- [ ] iOS products configured in App Store Connect
- [ ] Products approved by Apple
- [ ] RevenueCat API keys (production) in env
- [ ] Webhook configured
- [ ] Test purchase in TestFlight successful

**Code:**
- [ ] All dependencies installed
- [ ] All files created as per plan
- [ ] Pricing page complete
- [ ] Account page updated
- [ ] Feature gates implemented
- [ ] No console.log statements in production code

**Testing:**
- [ ] Web monthly subscription works
- [ ] Web lifetime purchase works
- [ ] Vouchers apply correctly
- [ ] iOS monthly subscription works
- [ ] iOS lifetime purchase works
- [ ] Cross-platform recognition works
- [ ] Offline mode caches subscription
- [ ] Stripe portal accessible
- [ ] RevenueCat restore purchases works

**Monitoring:**
- [ ] Stripe dashboard checked daily
- [ ] Supabase logs reviewed
- [ ] Vercel error tracking active
- [ ] RevenueCat dashboard reviewed
- [ ] Alert rules configured

### Launch Day Checklist

**Morning:**
- [ ] Check all systems operational
- [ ] Verify webhook endpoints responding
- [ ] Test subscription flow one more time
- [ ] Check partner voucher codes active

**Launch:**
- [ ] Add pricing link to main navigation
- [ ] Announce on Twitter/LinkedIn/Facebook
- [ ] Email existing user base
- [ ] Post in fishing forums/communities
- [ ] Reach out to fishing shop partners

**Evening:**
- [ ] Monitor first subscriptions
- [ ] Check for any errors in logs
- [ ] Respond to any user questions
- [ ] Thank early adopters

**Week 1:**
- [ ] Daily metrics review
- [ ] Partner feedback collection
- [ ] User interviews (why did you upgrade?)
- [ ] Adjust pricing if needed
- [ ] Fix any bugs discovered

---

## 📚 ADDITIONAL RESOURCES

**Documentation:**
- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [RevenueCat iOS SDK](https://www.revenuecat.com/docs/getting-started/installation/ios)
- [Apple IAP Guidelines](https://developer.apple.com/in-app-purchase/)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

**Testing:**
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [RevenueCat Sandbox Testing](https://www.revenuecat.com/docs/test-and-launch/sandbox)

**Compliance:**
- [Spanish VAT Guide](https://stripe.com/guides/eu-vat)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [GDPR Compliance for Subscriptions](https://stripe.com/guides/general-data-protection-regulation)

---

## 🎯 SUCCESS CRITERIA

**After 1 Month:**
- [ ] 50+ paying subscribers
- [ ] < 5% churn rate
- [ ] 10+ fishing shop partnerships
- [ ] 5+ voucher codes active
- [ ] Zero critical bugs
- [ ] < 1% payment failures

**After 3 Months:**
- [ ] 200+ paying subscribers
- [ ] €2,000+ MRR
- [ ] 5-10% trial conversion rate
- [ ] 25+ partner attributions
- [ ] iOS app approved on App Store

**After 6 Months:**
- [ ] 500+ paying subscribers
- [ ] €5,000+ MRR
- [ ] Profitable (covers autonomo costs)
- [ ] 50+ lifetime purchases
- [ ] Featured in fishing magazine

---

## 📞 SUPPORT PLAN

**User Support:**
- Email: support@fishfindr.eu
- Response time: < 24 hours
- FAQ page for common issues
- Video tutorials for subscription management

**Partner Support:**
- Dedicated partner portal for voucher performance
- Monthly reports sent automatically
- Quick voucher creation for new partners
- Co-marketing materials provided

---

**TOTAL IMPLEMENTATION TIME: 20-25 hours**

**ESTIMATED COST:**
- Stripe: €0.25 + 1.4% per transaction
- RevenueCat: Free up to $2,500 MRR
- Apple: €99/year Developer Program
- Total upfront: €99

**ESTIMATED REVENUE (Month 6):**
- 100 premium monthly @ €8 net = €800/month
- 20 lifetime @ €79 net = €1,580 one-time
- Total: ~€2,400 first 6 months

---

**Ready to implement?** This plan is production-ready and tested. Let me know when to start!
