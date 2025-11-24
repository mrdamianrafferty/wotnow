-- ============================================================================
-- PHASE 1: WEB-ONLY SUBSCRIPTIONS
-- Profiles + Subscription Events + Basic Vouchers
-- Created: 2025-11-24
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

  -- Phase 1: Only percentage and fixed_amount discounts
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
-- SEED DATA: Sample Vouchers
-- ----------------------------------------------------------------------------

INSERT INTO public.vouchers (code, description, discount_type, discount_value, max_uses, partner_name)
VALUES
  ('EARLYBIRD25', '25% off first month - Early Adopter', 'percentage', 25, 100, 'Launch Promo'),
  ('FISHINGSHOP20', '20% off - Fishing Shop Partner', 'percentage', 20, NULL, 'Partner Network')
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- COMMENTS
-- ----------------------------------------------------------------------------

COMMENT ON TABLE public.profiles IS 'User profiles with subscription status';
COMMENT ON TABLE public.vouchers IS 'Promotional voucher codes (Phase 1: percentage and fixed_amount only)';
COMMENT ON TABLE public.subscription_events IS 'Audit log of Stripe events';
COMMENT ON VIEW public.subscription_overview IS 'Real-time subscription metrics';
