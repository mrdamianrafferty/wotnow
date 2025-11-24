# Findr Subscription: Phase 1 Implementation
## Web-Only, Monthly Subscription - Production Ready

**Status:** Ready to Implement
**Date:** 2025-11-24
**Estimated Time:** 12-15 hours
**Scope:** Web payments only (Stripe), Premium Monthly subscription

---

## 🎯 PHASE 1 GOALS

**Ship the minimum viable monetization:**
- ✅ Monthly Premium subscription (€10/month, 7-day trial)
- ✅ Stripe Customer Portal for cancellations
- ✅ Basic voucher support (percentage discounts only)
- ✅ Pricing page + Account page
- ✅ Feature gates for Premium features
- ✅ Offline subscription cache (24h)

**Explicitly OUT OF SCOPE for Phase 1:**
- ❌ iOS IAP / RevenueCat (Phase 2)
- ❌ Lifetime subscriptions (Phase 2)
- ❌ Complex voucher types (free_months, etc.) (Phase 2)
- ❌ Partner analytics dashboard (Phase 2)
- ❌ Advanced monitoring/alerts (Phase 2)

**Why this scope:**
- Gets money flowing fastest
- Proves demand before iOS complexity
- Validates pricing and messaging
- Testable in 2-3 days
- Rollback is simple (just hide pricing page)

---

## 📋 IMPLEMENTATION CHECKLIST

### Part 1: Database (2 hours)

**File:** `supabase/migrations/20251124_subscriptions_phase1.sql`

```sql
-- ============================================================================
-- PHASE 1: WEB-ONLY SUBSCRIPTIONS
-- Profiles + Subscription Events + Basic Vouchers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROFILES TABLE
-- ----------------------------------------------------------------------------

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
    CHECK (subscription_status IN ('free', 'premium')),
  ADD COLUMN IF NOT EXISTS payment_platform TEXT DEFAULT 'web'
    CHECK (payment_platform IN ('web', 'ios', 'android')),

  -- Stripe fields
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,

  -- Voucher fields
  ADD COLUMN IF NOT EXISTS voucher_code TEXT,
  ADD COLUMN IF NOT EXISTS voucher_applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,

  -- Subscription dates
  ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_source ON public.profiles(referral_source);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- AUTO-CREATE PROFILE ON SIGNUP
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- SUBSCRIPTION EVENTS (audit trail)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
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

-- ----------------------------------------------------------------------------
-- VOUCHERS TABLE (simplified for Phase 1)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Phase 1: Only percentage discounts
  discount_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC(10,2) NOT NULL,

  -- Usage limits
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,

  -- Validity period
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Partner attribution
  partner_name TEXT,

  -- Status
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON public.vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON public.vouchers(active);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active vouchers" ON public.vouchers;
CREATE POLICY "Anyone can view active vouchers"
  ON public.vouchers FOR SELECT
  USING (active = true AND (valid_until IS NULL OR valid_until > NOW()));

DROP POLICY IF EXISTS "Service role can manage vouchers" ON public.vouchers;
CREATE POLICY "Service role can manage vouchers"
  ON public.vouchers FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- VOUCHER USAGE TRACKING
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.voucher_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  discount_applied NUMERIC(10,2),
  original_price NUMERIC(10,2),
  final_price NUMERIC(10,2)
);

CREATE INDEX IF NOT EXISTS idx_voucher_usage_user ON public.voucher_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher ON public.voucher_usage(voucher_id);

ALTER TABLE public.voucher_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own voucher usage" ON public.voucher_usage;
CREATE POLICY "Users can view own voucher usage"
  ON public.voucher_usage FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage voucher usage" ON public.voucher_usage;
CREATE POLICY "Service role can manage voucher usage"
  ON public.voucher_usage FOR ALL
  USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- VOUCHER VALIDATION FUNCTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_voucher(
  voucher_code_input TEXT,
  user_id_input UUID
) RETURNS JSONB AS $$
DECLARE
  voucher_record RECORD;
BEGIN
  voucher_code_input := UPPER(TRIM(voucher_code_input));

  SELECT * INTO voucher_record
  FROM public.vouchers
  WHERE code = voucher_code_input
    AND active = true
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);

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

-- ----------------------------------------------------------------------------
-- APPLY VOUCHER FUNCTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_voucher(
  voucher_id_input UUID,
  user_id_input UUID,
  original_price_input NUMERIC,
  final_price_input NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  voucher_code_val TEXT;
BEGIN
  SELECT code INTO voucher_code_val
  FROM public.vouchers
  WHERE id = voucher_id_input;

  INSERT INTO public.voucher_usage (
    voucher_id,
    user_id,
    discount_applied,
    original_price,
    final_price
  ) VALUES (
    voucher_id_input,
    user_id_input,
    original_price_input - final_price_input,
    original_price_input,
    final_price_input
  );

  UPDATE public.vouchers
  SET current_uses = current_uses + 1
  WHERE id = voucher_id_input;

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

-- ----------------------------------------------------------------------------
-- ANALYTICS VIEW
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.subscription_overview AS
SELECT
  subscription_status,
  payment_platform,
  COUNT(*) as user_count,
  COUNT(CASE WHEN trial_ends_at > NOW() THEN 1 END) as trialing_count
FROM profiles
GROUP BY subscription_status, payment_platform;

GRANT SELECT ON public.subscription_overview TO authenticated;

-- ----------------------------------------------------------------------------
-- SEED DATA
-- ----------------------------------------------------------------------------

INSERT INTO public.vouchers (code, description, discount_type, discount_value, max_uses, partner_name)
VALUES
  ('EARLYBIRD25', '25% off first month - Early Adopter', 'percentage', 25, 100, 'Launch Promo'),
  ('FISHINGSHOP20', '20% off - Fishing Shop Partner', 'percentage', 20, NULL, 'Partner Network')
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE public.profiles IS 'User profiles with subscription status';
COMMENT ON TABLE public.vouchers IS 'Promotional voucher codes (Phase 1: percentage only)';
COMMENT ON TABLE public.subscription_events IS 'Audit log of Stripe events';
```

**Deploy:**
```bash
supabase db push
```

---

### Part 2: Install Dependencies (10 mins)

```bash
npm install stripe @stripe/stripe-js
npm install --save-dev @types/stripe
```

---

### Part 3: Environment Variables (10 mins)

**Add to `.env.local`:**
```bash
# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price ID (get after creating product)
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxx

# Existing Supabase vars
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

### Part 4: Code Implementation (8 hours)

#### 4.1 Stripe Server Client

**File:** `lib/stripe/server.ts`

```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Use account's default API version (safer for v1)
  typescript: true,
  appInfo: {
    name: 'Findr',
    version: '1.0.0',
    url: 'https://fishfindr.eu',
  },
});
```

#### 4.2 Stripe Client (Browser)

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

#### 4.3 Offline Subscription Cache

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

#### 4.4 Subscription Hook (FIXED)

**File:** `hooks/useSubscription.ts`

```typescript
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cacheSubscriptionStatus, getCachedSubscriptionStatus } from '@/lib/offline/subscriptionCache';

export type SubscriptionStatus = 'free' | 'premium';

export interface SubscriptionState {
  status: SubscriptionStatus;
  loading: boolean;
  isPremium: boolean;
  isFree: boolean;
  isTrialing: boolean;
  trialEndsAt: Date | null;
}

export function useSubscription(): SubscriptionState {
  const [status, setStatus] = useState<SubscriptionStatus>('free');
  const [loading, setLoading] = useState(true);
  const [isTrialing, setIsTrialing] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let userId: string | null = null;

    async function fetchSubscription() {
      try {
        // Try cached first
        const cached = await getCachedSubscriptionStatus();
        if (cached) {
          setStatus(cached as SubscriptionStatus);
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        userId = user.id;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_status, trial_ends_at')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching subscription:', error);
          setLoading(false);
          return;
        }

        if (profile) {
          const newStatus = profile.subscription_status as SubscriptionStatus;
          setStatus(newStatus);

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

    // Subscribe to realtime updates (FIXED: filter by user ID)
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: userId ? `id=eq.${userId}` : undefined,
        },
        async (payload) => {
          // Double-check it's for this user
          if (payload.new.id !== userId) return;

          if (payload.new.subscription_status) {
            const newStatus = payload.new.subscription_status as SubscriptionStatus;
            setStatus(newStatus);
            await cacheSubscriptionStatus(newStatus);
          }

          if (payload.new.trial_ends_at) {
            const trialEnd = new Date(payload.new.trial_ends_at);
            setTrialEndsAt(trialEnd);
            setIsTrialing(trialEnd > new Date());
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
    loading,
    isPremium: status === 'premium',
    isFree: status === 'free',
    isTrialing,
    trialEndsAt,
  };
}
```

#### 4.5 Voucher Validation API

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

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Voucher code required' });
    }

    const { data, error } = await supabase.rpc('validate_voucher', {
      voucher_code_input: code.toUpperCase(),
      user_id_input: user.id,
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

#### 4.6 Stripe Checkout Session API (FIXED)

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

    const { voucherId } = req.body;
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID;

    if (!priceId) {
      return res.status(500).json({ error: 'Price ID not configured' });
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

    // Handle voucher discount (FIXED: only percentage and fixed_amount)
    const discounts = [];
    if (voucherId) {
      const { data: voucher } = await supabase
        .from('vouchers')
        .select('*')
        .eq('id', voucherId)
        .single();

      if (voucher && voucher.active) {
        const couponId = `voucher_${voucher.code}`;

        try {
          await stripe.coupons.retrieve(couponId);
        } catch {
          if (voucher.discount_type === 'percentage') {
            await stripe.coupons.create({
              id: couponId,
              percent_off: voucher.discount_value,
              duration: 'once',
            });
          } else if (voucher.discount_type === 'fixed_amount') {
            await stripe.coupons.create({
              id: couponId,
              amount_off: Math.round(voucher.discount_value * 100),
              currency: 'eur',
              duration: 'once',
            });
          }
        }

        discounts.push({ coupon: couponId });
      }
    }

    const sessionConfig: any = {
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/findr/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/findr/pricing`,
      allow_promotion_codes: !voucherId,
      automatic_tax: { enabled: true },
      customer_update: {
        address: 'auto',
      },
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          supabase_user_id: user.id,
        },
      },
      metadata: {
        supabase_user_id: user.id,
        voucher_id: voucherId || '',
      },
    };

    if (discounts.length > 0) {
      sessionConfig.discounts = discounts;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
```

#### 4.7 Stripe Webhook Handler

**File:** `pages/api/stripe/webhook.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';

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

        // Apply voucher if present
        if (voucherId && session.amount_total !== null) {
          await supabase.rpc('apply_voucher', {
            voucher_id_input: voucherId,
            user_id_input: userId,
            original_price_input: (session.amount_subtotal || 0) / 100,
            final_price_input: session.amount_total / 100,
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

#### 4.8 Customer Portal API

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

---

### Part 5: Testing (2 hours)

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 9995`

**Test Scenarios:**

1. **Basic Subscription Flow**
   - [ ] Navigate to /findr/pricing
   - [ ] Click "Start Free Trial"
   - [ ] Complete Stripe checkout
   - [ ] Verify redirected to /findr/account
   - [ ] Check database: `subscription_status = 'premium'`
   - [ ] Check `trial_ends_at` is 7 days from now

2. **Voucher Application**
   - [ ] Enter "EARLYBIRD25"
   - [ ] Verify price shows €7.50 (€10 - 25%)
   - [ ] Complete checkout
   - [ ] Check `voucher_usage` table has record

3. **Subscription Cancellation**
   - [ ] Go to /findr/account
   - [ ] Click "Manage Subscription"
   - [ ] Cancel in Stripe portal
   - [ ] Verify status remains 'premium' until period end

4. **Webhook Testing**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger customer.subscription.created
```

5. **Offline Cache**
   - [ ] Subscribe to premium
   - [ ] Disconnect internet
   - [ ] Reload app
   - [ ] Verify still shows premium (cached)

---

### Part 6: Deployment (1 hour)

**Pre-deployment:**
1. Create Stripe product (Premium Monthly, €10/month, 7-day trial)
2. Copy Price ID to Vercel env: `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID`
3. Create webhook: https://fishfindr.eu/api/stripe/webhook
4. Copy webhook secret to Vercel env: `STRIPE_WEBHOOK_SECRET`
5. Enable Stripe Tax in dashboard

**Deploy:**
```bash
git add .
git commit -m "feat: add Phase 1 subscription system (web-only)"
git push origin main
```

**Post-deployment:**
1. Test live checkout with real card
2. Immediately cancel and refund
3. Verify webhook logs in Stripe dashboard
4. Check Supabase subscription_events table

---

## 🎯 SUCCESS METRICS (WEEK 1)

- [ ] 10+ paying subscribers
- [ ] Zero critical bugs reported
- [ ] < 1% payment failures
- [ ] Webhook success rate > 95%
- [ ] All test vouchers working

---

## 🚀 PHASE 2 ROADMAP (FUTURE)

**After Phase 1 is stable:**
1. iOS IAP + RevenueCat integration
2. Lifetime subscription option
3. Advanced voucher types (free_months, etc.)
4. Partner analytics dashboard
5. Monitoring alerts

**Estimated Phase 2 time:** 10-15 hours

---

## 📞 SUPPORT

**If bugs found:**
1. Check Vercel logs for API errors
2. Check Stripe dashboard → Webhooks → Logs
3. Check Supabase logs for RLS policy errors
4. Rollback: Hide pricing page from navigation

**Common issues:**
- **Webhook 401 errors:** Service role key not set in Vercel
- **RLS policy denials:** Using anon key instead of service role in webhooks
- **Test card declined:** Use 4242 4242 4242 4242

---

**TOTAL PHASE 1 TIME: 12-15 hours**

This scope is actually achievable in the estimate and gets money flowing immediately.
