-- Create planned_activities table for storing user-planned activities
-- Supports both authenticated users (synced) and anonymous users (via anonymous_id)
--
-- Used by:
-- - PlanItSheet component for scheduling activities
-- - Reminder system for sending notifications
-- - Cross-device sync for authenticated users

CREATE TABLE IF NOT EXISTS planned_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification (one of these should be set)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT, -- For localStorage users before sign-in

  -- App and activity info
  app TEXT NOT NULL CHECK (app IN ('godaisy', 'findr', 'growdaisy')),
  activity_type TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,

  -- Scheduling
  planned_for TIMESTAMPTZ NOT NULL,
  planned_time TEXT, -- HH:MM format, optional

  -- Reminder settings
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_at TIMESTAMPTZ, -- When to send the reminder
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_notification_id INTEGER, -- Local notification ID for cancellation

  -- Status
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure at least one user identifier is provided
  CONSTRAINT user_or_anonymous CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE planned_activities ENABLE ROW LEVEL SECURITY;

-- Users can manage their own plans
CREATE POLICY "Users can manage own plans"
  ON planned_activities
  FOR ALL
  USING (auth.uid() = user_id);

-- Service role can access all (for cron jobs)
CREATE POLICY "Service role full access"
  ON planned_activities
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for efficient queries
CREATE INDEX idx_planned_activities_user_id ON planned_activities(user_id);
CREATE INDEX idx_planned_activities_anonymous_id ON planned_activities(anonymous_id) WHERE anonymous_id IS NOT NULL;
CREATE INDEX idx_planned_activities_app ON planned_activities(app);
CREATE INDEX idx_planned_activities_planned_for ON planned_activities(planned_for);

-- Index for reminder cron job
CREATE INDEX idx_planned_activities_pending_reminders
  ON planned_activities(reminder_at)
  WHERE reminder_enabled = TRUE AND reminder_sent = FALSE;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_planned_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER planned_activities_updated_at
  BEFORE UPDATE ON planned_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_planned_activities_updated_at();

-- Comments
COMMENT ON TABLE planned_activities IS 'User-planned activities with optional reminders. Syncs with localStorage for anonymous users.';
COMMENT ON COLUMN planned_activities.anonymous_id IS 'UUID stored in localStorage for anonymous users, allows claiming plans after sign-up';
COMMENT ON COLUMN planned_activities.reminder_at IS 'Calculated reminder time (e.g., 1 hour before planned_for)';
COMMENT ON COLUMN planned_activities.reminder_notification_id IS 'Local notification ID for cancelling scheduled reminders';
