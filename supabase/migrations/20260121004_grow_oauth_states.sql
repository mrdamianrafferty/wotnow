-- =============================================================================
-- GROW OAUTH STATES TABLE
-- Temporary storage for OAuth state tokens during authorization flow
-- =============================================================================

-- OAuth states table for secure state management during OAuth flows
CREATE TABLE IF NOT EXISTS grow_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Index for quick lookups
  CONSTRAINT grow_oauth_states_valid_provider CHECK (provider IN ('netatmo'))
);

-- Index for efficient state lookups
CREATE INDEX IF NOT EXISTS idx_grow_oauth_states_state ON grow_oauth_states(state);

-- Index for cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_grow_oauth_states_expires_at ON grow_oauth_states(expires_at);

-- RLS policies
ALTER TABLE grow_oauth_states ENABLE ROW LEVEL SECURITY;

-- Only service role can access OAuth states (security-sensitive)
CREATE POLICY "Service role has full access to oauth states"
  ON grow_oauth_states
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to clean up expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM grow_oauth_states
  WHERE expires_at < now();
END;
$$;

-- Comment on table
COMMENT ON TABLE grow_oauth_states IS 'Temporary OAuth state tokens for authorization flow security';
