#!/bin/bash

# Apply the numeric casting fix directly to Supabase using their API

SUPABASE_URL="https://swmviqpxetwziqxhzldh.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bXZpcXB4ZXR3emlxeGh6bGRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA5NTUyOSwiZXhwIjoyMDczNjcxNTI5fQ.1e5TTZy9lvV3TkW3RWgvQt6dBaTBitmCDlWEa34SZb8"

# Read the SQL file
SQL=$(cat supabase/migrations/20251112000008_fix_rpc_numeric_casting_v2.sql)

# Use curl to execute the SQL via PostgREST
# Note: This won't work directly, but we can try the Supabase Management API

echo "Attempting to execute SQL..."

# Since direct SQL execution isn't available via the REST API,
# let's try using the database connection URL
echo "Please run this SQL manually in the Supabase SQL Editor:"
echo "https://supabase.com/dashboard/project/swmviqpxetwziqxhzldh/sql/new"
echo ""
echo "Or use psql with connection string from Supabase dashboard"

# Print the important part of the fix
cat <<'EOF'

The key fix needed:

In the habitat_bonuses CTE (around line 248):
Change:
  CASE
    WHEN be.actual_substrate IS NOT NULL THEN 5
    ELSE 0
  END AS habitat_bonus

To:
  (CASE
    WHEN be.actual_substrate IS NOT NULL THEN 5.0
    ELSE 0.0
  END)::NUMERIC AS habitat_bonus

EOF
