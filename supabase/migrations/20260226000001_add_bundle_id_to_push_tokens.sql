-- Add bundle_id column to user_push_tokens
-- Enables per-app push notification routing (Findr, Go Daisy, Grow Daisy)
--
-- Previously: UNIQUE(user_id, platform) meant a user could only have ONE iOS token
-- across all 3 apps, causing DeviceTokenNotForTopic failures.
--
-- Now: UNIQUE(user_id, platform, bundle_id) allows one token per app per platform.

-- 1. Add bundle_id column (nullable for backwards compatibility with existing tokens)
ALTER TABLE user_push_tokens ADD COLUMN IF NOT EXISTS bundle_id TEXT;

-- 2. Drop old unique constraint and add new one
ALTER TABLE user_push_tokens DROP CONSTRAINT IF EXISTS user_push_tokens_user_id_platform_key;
ALTER TABLE user_push_tokens ADD CONSTRAINT user_push_tokens_user_id_platform_bundle_id_key
  UNIQUE (user_id, platform, bundle_id);

-- 3. Add index on bundle_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_bundle_id ON user_push_tokens(bundle_id);

-- 4. Update table comment
COMMENT ON TABLE user_push_tokens IS 'Stores device push notification tokens for iOS (APNS) and Android (FCM). bundle_id identifies which app (eu.fishfindr.app, io.godaisy.app, io.growdaisy.app) registered the token.';
