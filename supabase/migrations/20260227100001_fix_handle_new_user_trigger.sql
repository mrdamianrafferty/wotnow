-- ============================================================================
-- FIX: handle_new_user trigger references `full_name` but column is `name`
-- ============================================================================
-- The live profiles table has a `name` column (not `full_name`).
-- The trigger was created referencing `full_name`, causing ALL new user
-- signups to fail with "Database error creating new user".
--
-- Created: 2026-02-27
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
