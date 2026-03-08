-- =============================================================================
-- Go Daisy+ Promo Codes
--
-- Promo code system for granting free Go Daisy+ access.
-- Supports time-limited codes, usage caps, and tracking.
-- =============================================================================

-- Promo code definitions
CREATE TABLE IF NOT EXISTS godaisy_promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  tier TEXT NOT NULL DEFAULT 'plus' CHECK (tier IN ('plus')),
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_redemptions INTEGER,         -- NULL = unlimited
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,          -- NULL = no expiry
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT                   -- Admin who created it
);

-- Index for code lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_godaisy_promo_code_upper
  ON godaisy_promo_codes(UPPER(code));

-- Promo code redemptions (audit trail)
CREATE TABLE IF NOT EXISTS godaisy_promo_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES godaisy_promo_codes(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  granted_until TIMESTAMPTZ NOT NULL,
  UNIQUE(promo_code_id, user_id)   -- One redemption per user per code
);

-- Index for user redemption lookups
CREATE INDEX IF NOT EXISTS idx_godaisy_promo_redemptions_user
  ON godaisy_promo_redemptions(user_id);

-- RLS policies
ALTER TABLE godaisy_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE godaisy_promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Promo codes: public read for validation (no secrets in this table)
CREATE POLICY "Anyone can read active promo codes"
  ON godaisy_promo_codes FOR SELECT
  USING (is_active = true);

-- Redemptions: users can see their own
CREATE POLICY "Users can view own redemptions"
  ON godaisy_promo_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================================================
-- RPC: Atomic promo code redemption
-- =============================================================================

CREATE OR REPLACE FUNCTION redeem_godaisy_promo_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo godaisy_promo_codes%ROWTYPE;
  v_existing godaisy_promo_redemptions%ROWTYPE;
  v_granted_until TIMESTAMPTZ;
BEGIN
  -- Find the promo code (case-insensitive)
  SELECT * INTO v_promo
  FROM godaisy_promo_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
  FOR UPDATE;  -- Lock the row

  IF v_promo IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired promo code');
  END IF;

  -- Check expiry
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This promo code has expired');
  END IF;

  -- Check max redemptions
  IF v_promo.max_redemptions IS NOT NULL AND v_promo.current_redemptions >= v_promo.max_redemptions THEN
    RETURN jsonb_build_object('success', false, 'error', 'This promo code has reached its limit');
  END IF;

  -- Check if user already redeemed this code
  SELECT * INTO v_existing
  FROM godaisy_promo_redemptions
  WHERE promo_code_id = v_promo.id AND user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already redeemed this code');
  END IF;

  -- Calculate granted_until
  v_granted_until := NOW() + (v_promo.duration_days || ' days')::INTERVAL;

  -- Create redemption record
  INSERT INTO godaisy_promo_redemptions (promo_code_id, user_id, granted_until)
  VALUES (v_promo.id, p_user_id, v_granted_until);

  -- Increment redemption count
  UPDATE godaisy_promo_codes
  SET current_redemptions = current_redemptions + 1
  WHERE id = v_promo.id;

  -- Update user's subscription
  UPDATE profiles
  SET godaisy_subscription_tier = 'plus',
      godaisy_subscription_type = 'promo',
      godaisy_subscription_start = NOW(),
      godaisy_subscription_end = v_granted_until
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'tier', 'plus',
    'granted_until', v_granted_until,
    'duration_days', v_promo.duration_days
  );
END;
$$;
