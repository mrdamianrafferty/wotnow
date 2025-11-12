# RPC Type Casting Guide

**Date:** November 12, 2025
**Purpose:** Practical guide to preventing type mismatches in Supabase RPC functions

---

## Table of Contents

1. [The Problem](#the-problem)
2. [PostgreSQL Type Strictness](#postgresql-type-strictness)
3. [Common Type Mismatches](#common-type-mismatches)
4. [The Fix Pattern](#the-fix-pattern)
5. [Real-World Example](#real-world-example)
6. [Testing Strategy](#testing-strategy)
7. [Prevention Checklist](#prevention-checklist)

---

## The Problem

PostgreSQL RPC functions use `RETURNS TABLE` to define output schema. **Every column type must match exactly** between:
1. The `RETURNS TABLE` definition
2. The actual `SELECT` statement results

If types don't match, you get error **42804**: `structure of query does not match function result type`

### Example Error

```
Error: structure of query does not match function result type
Code: 42804
Details: Returned type character varying(10) does not match expected type text in column 1
```

This tells you:
- **Column 1** has a type mismatch
- Database column is `VARCHAR(10)`
- Function expects `TEXT`

---

## PostgreSQL Type Strictness

PostgreSQL considers these as **different types**:

| Database Type | RPC Type | Match? |
|---------------|----------|--------|
| `VARCHAR(10)` | `TEXT` | ❌ NO |
| `VARCHAR(100)` | `TEXT` | ❌ NO |
| `VARCHAR` | `TEXT` | ❌ NO |
| `TEXT` | `TEXT` | ✅ YES |
| `ENUM foo` | `TEXT` | ❌ NO |
| `INTEGER` | `NUMERIC` | ❌ NO |
| `NUMERIC` | `NUMERIC` | ✅ YES |
| `UUID` | `TEXT` | ❌ NO (without cast) |

**Key Insight:** You must **explicitly cast** to match the `RETURNS TABLE` type.

---

## Common Type Mismatches

### 1. VARCHAR → TEXT

**Scenario:** Database has `VARCHAR(n)`, RPC returns `TEXT`

```sql
-- ❌ WRONG
CREATE FUNCTION get_species()
RETURNS TABLE (species_code TEXT)
AS $$
BEGIN
  RETURN QUERY
  SELECT s.species_code  -- species_code is VARCHAR(10)
  FROM species s;
END;
$$ LANGUAGE plpgsql;
```

**Error:** `Returned type character varying(10) does not match expected type text`

```sql
-- ✅ CORRECT
CREATE FUNCTION get_species()
RETURNS TABLE (species_code TEXT)
AS $$
BEGIN
  RETURN QUERY
  SELECT s.species_code::TEXT  -- Explicit cast
  FROM species s;
END;
$$ LANGUAGE plpgsql;
```

### 2. ENUM → TEXT

**Scenario:** Database has custom ENUM type, RPC returns `TEXT`

```sql
-- Database schema
CREATE TYPE fish_guild AS ENUM ('pelagic', 'reef_kelp', 'benthic', 'surf_estuary', 'cephalopod');

-- ❌ WRONG
RETURNS TABLE (guild TEXT)
...
SELECT s.guild  -- guild is ENUM fish_guild
FROM species s;
```

**Error:** `Returned type fish_guild does not match expected type text`

```sql
-- ✅ CORRECT
RETURNS TABLE (guild TEXT)
...
SELECT s.guild::TEXT  -- Explicit cast
FROM species s;
```

### 3. INTEGER → NUMERIC in CASE Statements

**Scenario:** CASE statement returns integer literals, but RPC expects NUMERIC

```sql
-- ❌ WRONG
RETURNS TABLE (habitat_bonus NUMERIC)
...
SELECT
  CASE
    WHEN substrate IS NOT NULL THEN 5  -- Returns INTEGER
    ELSE 0  -- Returns INTEGER
  END AS habitat_bonus
FROM base_enriched;
```

**Error:** `Returned type integer does not match expected type numeric in column N`

```sql
-- ✅ CORRECT Option 1: Use decimal literals
RETURNS TABLE (habitat_bonus NUMERIC)
...
SELECT
  CASE
    WHEN substrate IS NOT NULL THEN 5.0  -- Returns NUMERIC
    ELSE 0.0  -- Returns NUMERIC
  END AS habitat_bonus
FROM base_enriched;

-- ✅ CORRECT Option 2: Explicit cast
RETURNS TABLE (habitat_bonus NUMERIC)
...
SELECT
  (CASE
    WHEN substrate IS NOT NULL THEN 5
    ELSE 0
  END)::NUMERIC AS habitat_bonus  -- Force NUMERIC
FROM base_enriched;
```

### 4. UUID → TEXT

**Scenario:** UUID needs to be returned as TEXT

```sql
-- ❌ WRONG
RETURNS TABLE (species_id TEXT)
...
SELECT s.id  -- id is UUID
FROM species s;
```

**Error:** `Returned type uuid does not match expected type text`

```sql
-- ✅ CORRECT
RETURNS TABLE (species_id TEXT)
...
SELECT s.id::TEXT  -- Explicit cast
FROM species s;
```

---

## The Fix Pattern

### Step 1: Identify the Column

Error message tells you which column failed:
```
Details: Returned type X does not match expected type Y in column N
```

Count from 1 in your `RETURNS TABLE` definition to find column N.

### Step 2: Check the Database Type

Query the actual table to see the real type:

```sql
SELECT column_name, data_type, udt_name, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'your_table'
  AND column_name = 'your_column';
```

Or check [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md)

### Step 3: Add Explicit Cast

In your SELECT statement, cast the column:

```sql
SELECT
  column_name::desired_type,  -- Add this cast
  ...
FROM your_table;
```

### Step 4: Test

```typescript
const { data, error } = await supabase.rpc('your_function');
if (error) {
  console.error('Column:', error.details); // Check which column
}
```

### Step 5: Repeat

If another column fails, repeat steps 1-4 for that column.

---

## Real-World Example

### The Journey of `get_environmental_predictions_enhanced`

**November 12, 2025** - Multiple type mismatches fixed iteratively:

#### Iteration 1: species_code

```
Error: Returned type character varying(10) does not match expected type text in column 1
```

**Fix:**
```sql
-- Before
SELECT s.species_code FROM species s;

-- After
SELECT s.species_code::TEXT FROM species s;
```

#### Iteration 2: name_en

```
Error: Returned type character varying(100) does not match expected type text in column 3
```

**Fix:**
```sql
-- Before
SELECT s.name_en FROM species s;

-- After
SELECT s.name_en::TEXT FROM species s;
```

#### Iteration 3: guild (ENUM)

```
Error: Returned type fish_guild does not match expected type text in column 6
```

**Fix:**
```sql
-- Before
SELECT s.guild FROM species s;

-- After
SELECT s.guild::TEXT FROM species s;
```

#### Iteration 4: habitat_bonus (INTEGER → NUMERIC)

```
Error: Returned type integer does not match expected type numeric in column 21
```

**Fix:**
```sql
-- Before
CASE
  WHEN be.actual_substrate IS NOT NULL THEN 5
  ELSE 0
END AS habitat_bonus

-- After
(CASE
  WHEN be.actual_substrate IS NOT NULL THEN 5.0
  ELSE 0.0
END)::NUMERIC AS habitat_bonus
```

### Final Working Version

See migration: `supabase/migrations/20251112200000_fix_all_type_casting.sql`

All casts applied:
```sql
SELECT
  s.species_code::TEXT,          -- VARCHAR(10) → TEXT
  s.id::TEXT AS species_id,      -- UUID → TEXT
  s.name_en::TEXT,                -- VARCHAR(100) → TEXT
  s.scientific_name::TEXT,        -- VARCHAR(200) → TEXT
  s.guild::TEXT,                  -- ENUM fish_guild → TEXT
  s.diurnal_sensitivity::TEXT,    -- TEXT (with CHECK) → TEXT
  s.flow_preference::TEXT,        -- TEXT (with CHECK) → TEXT
  ...
  (CASE
    WHEN be.actual_substrate IS NOT NULL THEN 5.0
    ELSE 0.0
  END)::NUMERIC AS habitat_bonus  -- NUMERIC
FROM species s;
```

---

## Testing Strategy

### 1. Local Test Script

Create a TypeScript test to call your RPC:

```typescript
// tmp/test-rpc.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testRPC() {
  const { data, error } = await supabase.rpc('your_function_name', {
    param1: 'test_value',
  });

  if (error) {
    console.error('❌ FAILED');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Details:', error.details);  // <-- KEY: Shows column number
    console.error('Hint:', error.hint);
    return;
  }

  console.log('✅ PASSED');
  console.log('Returned', data.length, 'rows');

  // Check types
  if (data && data.length > 0) {
    const sample = data[0];
    for (const [key, value] of Object.entries(sample)) {
      console.log(`${key}: ${typeof value} (${JSON.stringify(value).substring(0, 50)})`);
    }
  }
}

testRPC();
```

Run with:
```bash
SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." npx tsx tmp/test-rpc.ts
```

### 2. Error Details Parsing

The `error.details` field tells you **which column** failed:

```
"Returned type X does not match expected type Y in column N"
```

Count columns in your `RETURNS TABLE` (starting from 1) to identify the problem column.

### 3. Incremental Fixes

Fix one column at a time:
1. Apply migration with fix
2. Run test script
3. Check error (if any)
4. Fix next column
5. Repeat until all pass

### 4. Type Inspection

In your test script, check returned types:

```typescript
if (data && data.length > 0) {
  const sample = data[0];
  console.log('species_code type:', typeof sample.species_code);  // should be "string"
  console.log('confidence_percent type:', typeof sample.confidence_percent);  // should be "number"
  console.log('guild type:', typeof sample.guild);  // should be "string"
}
```

---

## Biogeographic Region Mapping

**Added: November 12, 2025**

### The Problem

Rectangle.region values (human-readable names like "English Channel", "Celtic Sea") don't match species.biogeographic_regions (broad regions like "NE_Atlantic", "Mediterranean").

**Result:** Using rectangle.region directly causes WHERE clauses to filter out almost all species, returning only 2-5 species instead of 50+.

### The Solution

Map rectangle **codes** (not names) to biogeographic regions using a CASE statement:

```sql
DECLARE
  rectangle_region TEXT;
BEGIN
  -- Map rectangle codes to broad biogeographic regions
  rectangle_region := CASE
    -- Mediterranean (07xx, 08xx)
    WHEN target_rectangle LIKE '07%' OR target_rectangle LIKE '08%' THEN 'Mediterranean'

    -- Northeast Atlantic - All European waters (20xx-65xx)
    WHEN target_rectangle LIKE '20%' OR target_rectangle LIKE '21%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '30%' OR target_rectangle LIKE '31%' THEN 'NE_Atlantic'
    -- ... (see full mapping in migration 20251112210000)

    -- Northwest Atlantic - US East Coast (70xx-76xx)
    WHEN target_rectangle LIKE '70%' THEN 'NW_Atlantic'

    -- Gulf of Mexico (90xx-94xx)
    WHEN target_rectangle LIKE '90%' THEN 'Gulf_of_Mexico'

    -- Caribbean (95xx-97xx)
    WHEN target_rectangle LIKE '95%' THEN 'Caribbean'

    -- Northeast Pacific - US/Canada West Coast (77xx-85xx)
    WHEN target_rectangle LIKE '77%' THEN 'NE_Pacific'

    -- Default to NE_Atlantic for European waters
    ELSE 'NE_Atlantic'
  END;

  -- Now use in WHERE clause
  WHERE rectangle_region = ANY(s.biogeographic_regions);
```

### Test Results (November 12, 2025)

**Before mapping:** 2 species returned
**After mapping:** 56-63 species returned

| Rectangle | Region Name | Biogeographic Region | Species Count |
|-----------|-------------|---------------------|---------------|
| 31F1 | English Channel | NE_Atlantic | 56 ✅ |
| 31F2 | English Channel | NE_Atlantic | 56 ✅ |
| 28E5 | Celtic Sea | NE_Atlantic | 56 ✅ |
| 39F3 | North Sea | NE_Atlantic | 56 ✅ |
| 07E7 | Mediterranean | Mediterranean | 63 ✅ |

**See:** `DATABASE_SCHEMA_REFERENCE.md` for complete biogeographic region list.

---

## Prevention Checklist

### When Writing New RPC Functions

Use this checklist **before** creating the function:

#### ✅ Design Phase

- [ ] List all columns you'll return
- [ ] Check [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) for each column's type
- [ ] Note which columns need casting (VARCHAR, ENUM, UUID)
- [ ] Decide if you'll use CTEs (WITH clauses) - helps organize casts

#### ✅ Implementation Phase

- [ ] Define `RETURNS TABLE` with desired types (usually TEXT for strings, NUMERIC for decimals, INT for counts)
- [ ] Cast all VARCHAR columns to TEXT: `column::TEXT`
- [ ] Cast all ENUM columns to TEXT: `column::TEXT`
- [ ] Cast all UUID columns to TEXT if returning as TEXT: `column::TEXT`
- [ ] Use decimal literals in CASE statements: `5.0` not `5`
- [ ] Add explicit `::NUMERIC` cast to CASE statements returning NUMERIC
- [ ] Use `COALESCE()` for nullable columns that might be NULL
- [ ] Use `ORDER BY ... LIMIT 1` for queries that might return duplicates

#### ✅ Testing Phase

- [ ] Create test script (see above)
- [ ] Test with actual data (not empty tables)
- [ ] Check error.details if it fails
- [ ] Verify returned types in JavaScript
- [ ] Test with different parameters (NULL values, edge cases)

#### ✅ Documentation Phase

- [ ] Add comment to function: `COMMENT ON FUNCTION ... IS 'Type casts applied: ...'`
- [ ] Document in migration file what was fixed
- [ ] Update [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) if schema changed

---

## Quick Reference

### Cast by Database Type

| Database Type | Cast To TEXT | Cast To NUMERIC | Cast To INT |
|---------------|--------------|-----------------|-------------|
| `VARCHAR(n)` | `::TEXT` | N/A | N/A |
| `TEXT` | (none) | `::NUMERIC` | `::INT` |
| `ENUM foo` | `::TEXT` | N/A | N/A |
| `UUID` | `::TEXT` | N/A | N/A |
| `INTEGER` | `::TEXT` | `::NUMERIC` | (none) |
| `NUMERIC` | `::TEXT` | (none) | `::INT` |
| `BOOLEAN` | `::TEXT` | N/A | `::INT` |
| `TIMESTAMPTZ` | `::TEXT` | N/A | N/A |

### Numeric Literals

| Type Needed | Use | Not |
|-------------|-----|-----|
| NUMERIC | `5.0`, `0.0` | `5`, `0` |
| INTEGER | `5`, `0` | `5.0`, `0.0` |

### Common Casts

```sql
-- String types
column_name::TEXT
column_name::VARCHAR(n)

-- Numeric types
(CASE ... END)::NUMERIC
(CASE ... END)::INT
column_name::NUMERIC
column_name::INT

-- UUID
id::TEXT  -- UUID to text
id::UUID  -- Text to UUID

-- Arrays (no cast usually needed)
array_column  -- TEXT[], NUMERIC[], etc.

-- JSONB (no cast usually needed)
jsonb_column  -- JSONB type
```

---

## See Also

- [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) - Complete table and column reference
- [RPC_FIX_SUMMARY.md](./RPC_FIX_SUMMARY.md) - Summary of October 2025 RPC fixes
- [GETTING_STARTED.md](./GETTING_STARTED.md) - How the prediction system works

---

**Last Updated:** November 12, 2025
**Maintained By:** Development team
**Next Review:** After any schema changes
