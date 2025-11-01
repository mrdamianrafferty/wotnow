-- Add pinned column to findr_catch_entries table
-- This allows users to pin their favorite/trophy catches to the top of their gallery

ALTER TABLE findr_catch_entries
ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;

-- Create index for faster queries filtering by pinned status
CREATE INDEX IF NOT EXISTS idx_findr_catch_entries_pinned_user
ON findr_catch_entries(user_id, pinned DESC, caught_at DESC)
WHERE pinned = true;

-- Add comment explaining the column
COMMENT ON COLUMN findr_catch_entries.pinned IS 'Whether this catch is pinned as a trophy photo in the user''s gallery';
