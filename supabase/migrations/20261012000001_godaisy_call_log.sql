-- =============================================================================
-- Go Daisy: a record of every daily call the cron DECIDED, sent or not.
--
-- godaisy_notification_log only ever held the messages that went out. A day the
-- cron suppressed (nothing good enough, or only an indoor answer) left no trace,
-- so it was impossible to tell a deliberate silence from a failure — three days
-- in five weeks had no message and no way to say why — and impossible to see
-- what was considered and rejected. A review of the first five weeks found
-- surfing, kayaking and fishing never once recommended, with nothing to show
-- whether the sea had simply been poor.
--
-- One row per person per decision. `considered` holds the day-level score of
-- every sport the person picked, so "why not the surf?" is a query.
-- =============================================================================

CREATE TABLE IF NOT EXISTS godaisy_call_log (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The local calendar day the call is ABOUT (tomorrow, for an evening call).
  call_date    DATE NOT NULL,
  -- sent | suppressed | no_device | no_forecast | error
  outcome      TEXT NOT NULL,
  -- Why: the band that failed the bar, 'indoor: cafe', the error text, ...
  detail       TEXT,
  -- The activity that led, and its band. NULL when the day produced no call.
  activity_id  TEXT,
  band         TEXT,
  weekend      BOOLEAN,
  -- [{activityId, score, band?}] for every sport the person picked, best first.
  considered   JSONB,
  -- The ids that made the good list, in the order the call screen shows them.
  alternates   TEXT[],
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE godaisy_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own call log"
  ON godaisy_call_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on godaisy_call_log"
  ON godaisy_call_log
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_godaisy_call_log_user_date
  ON godaisy_call_log (user_id, call_date DESC);
