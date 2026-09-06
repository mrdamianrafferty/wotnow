-- The rest of the call, server side — phase 4b.
--
-- `20260905000001_godaisy_call_hour.sql` added `call_hour` and said why: the
-- sender, when built, should read from the store that already exists rather
-- than inventing a second one. This is the sender being built, and an hour on
-- its own is not enough to make a call with.
--
-- WHAT WAS MISSING, AND WHY IT MATTERS. `lib/godaisy/call/setup.ts` keeps the
-- whole setup — sports, place, hour — in a COOKIE, deliberately, so that `/call`
-- renders correctly on the first byte for a signed-out stranger. That decision
-- is right for the page and fatal for a cron: a job running on a server has no
-- cookie, so it cannot know who to call, where they are, or what they do. The
-- cookie stays the system of record for the page; these columns are the copy
-- the sender reads, written only for people who are signed in.
--
-- These sit on `godaisy_notification_preferences` for the reason the earlier
-- migration gave — one store, not two — and beside its existing `timezone`,
-- which the sender needs anyway to know when someone's chosen hour has arrived.

ALTER TABLE godaisy_notification_preferences
  -- The call itself. Nullable throughout: a row can exist for the category
  -- alerts without anyone having been through onboarding.
  ADD COLUMN IF NOT EXISTS call_enabled     BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS call_place_name  TEXT,
  ADD COLUMN IF NOT EXISTS call_place_lat   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS call_place_lon   DOUBLE PRECISION,
  -- Where they go for water sports, when that is somewhere else. Mirrors
  -- CallSetup.coastal, which locationFromSetup already knows how to use.
  ADD COLUMN IF NOT EXISTS call_coastal_name TEXT,
  ADD COLUMN IF NOT EXISTS call_coastal_lat  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS call_coastal_lon  DOUBLE PRECISION,
  -- Activity ids, in the order chosen. Validated against the real library by
  -- the API route, not here — the library lives in TypeScript.
  ADD COLUMN IF NOT EXISTS call_sports      TEXT[],
  /*
   * The dedupe key, and it is a DATE IN THE PERSON'S OWN TIMEZONE, not a
   * timestamp.
   *
   * The sender runs hourly and matches on local hour, so any retry, redeploy or
   * overlapping invocation inside the same hour would otherwise send twice. A
   * timestamp comparison would have to reconstruct "the same day for them" on
   * every read; storing the local date makes the check a single equality and
   * makes a double-send impossible rather than unlikely.
   */
  ADD COLUMN IF NOT EXISTS call_last_sent_on DATE;

COMMENT ON COLUMN godaisy_notification_preferences.call_enabled IS
  'Whether the daily call is sent at all. Independent of the category alerts above.';
COMMENT ON COLUMN godaisy_notification_preferences.call_sports IS
  'Activity ids from data/activities, in the order chosen during onboarding.';
COMMENT ON COLUMN godaisy_notification_preferences.call_last_sent_on IS
  'Local calendar date (in this row''s timezone) the call last went out. The hourly sender''s idempotency key.';

/*
 * The sender's only query: rows that want a call and have somewhere to be
 * called about. It scans the whole table each hour, so it is worth an index —
 * and a partial one, because a row with no place can never be selected.
 */
CREATE INDEX IF NOT EXISTS idx_godaisy_prefs_call_due
  ON godaisy_notification_preferences (call_hour)
  WHERE call_enabled AND call_hour IS NOT NULL AND call_place_lat IS NOT NULL;
