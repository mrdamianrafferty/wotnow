-- Table to track tasks that users have marked as done or skipped
CREATE TABLE IF NOT EXISTS grow_task_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,  -- Unique identifier for the task (e.g., "plant-slug:task-code" or event ID)
  dismissal_type TEXT NOT NULL CHECK (dismissal_type IN ('done', 'skipped')),
  dismissed_for_year INTEGER NOT NULL,  -- The year this dismissal applies to
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Each user can only have one dismissal per task per year
  UNIQUE(user_id, task_key, dismissed_for_year)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_task_dismissals_user_year 
ON grow_task_dismissals(user_id, dismissed_for_year);

-- RLS policies
ALTER TABLE grow_task_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dismissals"
ON grow_task_dismissals FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dismissals"
ON grow_task_dismissals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dismissals"
ON grow_task_dismissals FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dismissals"
ON grow_task_dismissals FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER set_task_dismissals_updated_at
  BEFORE UPDATE ON grow_task_dismissals
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
