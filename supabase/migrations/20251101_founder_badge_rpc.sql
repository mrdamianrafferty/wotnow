-- RPC function to check founder badge status
-- This function can access auth.users which is not directly queryable

CREATE OR REPLACE FUNCTION public.check_founder_status(p_user_id UUID)
RETURNS TABLE (
  is_founder BOOLEAN,
  user_rank INTEGER
)
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_rank INTEGER;
  v_is_founder BOOLEAN;
BEGIN
  -- Get user's rank by creation date
  SELECT
    (ROW_NUMBER() OVER (ORDER BY created_at ASC))::INTEGER
  INTO v_user_rank
  FROM auth.users
  WHERE id = p_user_id;

  -- If user not found, return nulls
  IF v_user_rank IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER;
    RETURN;
  END IF;

  -- Determine if user is in first 500
  v_is_founder := v_user_rank <= 500;

  RETURN QUERY SELECT v_is_founder, v_user_rank;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_founder_status(UUID) TO authenticated;
