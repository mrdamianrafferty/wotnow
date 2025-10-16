-- Check the unique constraint details
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'findr_conditions_snapshots'
  AND con.contype = 'u';  -- unique constraints

-- Check all constraints on the table
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'findr_conditions_snapshots'
  AND table_schema = 'public';
