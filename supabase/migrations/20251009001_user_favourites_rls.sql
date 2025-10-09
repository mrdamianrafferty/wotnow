-- Row Level Security (RLS) Policies for user_favourites table
-- Ensures users can only access their own favourites

-- Enable RLS on user_favourites table
ALTER TABLE user_favourites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own favourites
CREATE POLICY "Users can view own favourites" 
ON user_favourites
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own favourites
CREATE POLICY "Users can create own favourites" 
ON user_favourites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own favourites (for last_checked, notifications_enabled, etc.)
CREATE POLICY "Users can update own favourites" 
ON user_favourites
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favourites
CREATE POLICY "Users can delete own favourites" 
ON user_favourites
FOR DELETE
USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_favourites TO authenticated;

-- Create function to automatically update last_checked timestamp
CREATE OR REPLACE FUNCTION update_user_favourites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_checked = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'user_favourites';

-- Verify policies are created
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_favourites';
