# FAO 3-Alpha Code Integration

**Date**: October 19, 2025  
**Status**: Ready to Deploy  
**Migration File**: `migrations/add-fao-codes.sql`

---

## 🎯 Overview

Adding official FAO (Food and Agriculture Organization) 3-alpha codes as a **separate column** alongside your existing `species_code` values.

### Why Both?

**Your Current Codes (species_code):**
- User-friendly and descriptive (`DUSK-GROUP`, `RED-PORGY`, `BLUEFISH`)
- Already integrated throughout codebase
- Great for UX and display

**FAO 3-Alpha Codes (fao_3alpha_code_unique):**
- Official international standard
- Essential for data exchange with external systems
- Required for FAO database integrations
- Future-proof for data ingestion

---

## 📊 Comparison Results

From comparison analysis:
- **Total species**: 77
- **Exact matches**: 26 (34%) - codes already match FAO
- **Differences**: 49 (64%) - your codes differ from FAO
- **No FAO code**: 2 (Saddled Seabream, Wrasse various)

### Example Differences:

| Your Code | FAO Code | Species Name |
|-----------|----------|--------------|
| DUSK-GROUP | GPD | Dusky Grouper |
| RED-PORGY | RPG | Red Porgy |
| BLUEFISH | BLU | Bluefish |
| CHUB-MACK | VMA | Atlantic Chub Mackerel |
| EURO-CUDA | YRS | European Barracuda |

---

## 🚀 Deployment Instructions

### Step 1: Run SQL in Supabase SQL Editor

1. **Open Supabase Dashboard** → Your Project → SQL Editor
2. **Copy the contents** of `migrations/add-fao-codes.sql`
3. **Paste and Run** the SQL

The SQL will:
- Add `fao_3alpha_code_unique` column to `species` table
- Populate all 75 species with official FAO codes
- Complete in ~1 second with no downtime

### Step 2: Verify Migration

Run this query in Supabase SQL Editor:

```sql
SELECT 
  species_code,
  fao_3alpha_code_unique as fao_code,
  name_en,
  CASE 
    WHEN species_code = fao_3alpha_code_unique THEN '✓ Match'
    ELSE '  Different'
  END as comparison
FROM species
WHERE fao_3alpha_code_unique IS NOT NULL
ORDER BY species_code
LIMIT 20;
```

Expected results:
- 75 species with FAO codes
- Mix of matching and different codes
- Both codes available for each species

---

## 💻 Using FAO Codes in Your Application

### Database Schema After Migration:

```typescript
interface Species {
  id: string;
  species_code: string;              // Your internal code (e.g., 'DUSK-GROUP')
  fao_3alpha_code_unique: string;    // Official FAO code (e.g., 'GPD')
  name_en: string;
  scientific_name: string;
  // ... other fields
}
```

### Usage Examples:

**1. Internal App Lookups (continue as-is):**
```typescript
// Images, advice, UI - use your species_code
const imageInfo = SPECIES_IMAGE_MAP[species.species_code];
const advice = speciesAdvice[species.species_code];
```

**2. External API Integrations (use FAO code):**
```typescript
// Data ingestion, FAO database queries
const faoData = await fetch(`https://fao-api.org/species/${species.fao_3alpha_code_unique}`);
```

**3. Both Available:**
```typescript
// Query species with both codes
const { data } = await supabase
  .from('species')
  .select('species_code, fao_3alpha_code_unique, name_en')
  .eq('species_code', 'DUSK-GROUP');

// Result: { species_code: 'DUSK-GROUP', fao_3alpha_code_unique: 'GPD', name_en: 'Dusky Grouper' }
```

---

## 🔍 Benefits

### Future Data Ingestion
✅ **FAO Fisheries Data**: Easy to match with FAO global fisheries statistics  
✅ **ICES Data**: Integration with International Council for the Exploration of the Sea  
✅ **Scientific Studies**: Standard codes used in marine research  
✅ **EU Regulations**: Official codes used in fishing regulations

### No Breaking Changes
✅ **All existing code continues to work**  
✅ **Your descriptive codes remain in use**  
✅ **Gradual adoption** - use FAO codes only where needed  
✅ **Backward compatible** - new column is optional

### Data Exchange
✅ **Import external datasets** using FAO codes  
✅ **Export your data** with official codes  
✅ **API integrations** with fisheries databases  
✅ **Research collaborations** with marine scientists

---

## 📝 Migration SQL Preview

```sql
-- Add column
ALTER TABLE public.species
  ADD COLUMN IF NOT EXISTS fao_3alpha_code_unique text;

-- Update species (sample)
WITH data(id, code) AS (
    VALUES
        ('a4d859a8-31f5-4079-8d7b-435090a64ebc'::uuid, 'BSS'),  -- Sea Bass
        ('70083afd-7e2c-4ebf-aa3e-9ce079647c83'::uuid, 'MAC'),  -- Mackerel
        ('39d25a22-dea4-41b1-8af0-c55e501b715c'::uuid, 'COD'),  -- Cod
        -- ... 72 more species
)
UPDATE public.species AS s
SET fao_3alpha_code_unique = d.code
FROM data AS d
WHERE s.id = d.id;
```

---

## ✅ Post-Migration Checklist

- [ ] SQL executed in Supabase SQL Editor
- [ ] Verify 75 species have FAO codes
- [ ] Check a few examples match expected FAO codes
- [ ] Update TypeScript types if needed
- [ ] Document FAO code usage in API endpoints (if applicable)
- [ ] No changes needed to existing species_code logic

---

## 🔗 Resources

- **FAO Species Codes**: http://www.fao.org/fishery/collection/asfis/en
- **ASFIS List**: FAO's Aquatic Sciences and Fisheries Information System
- **Migration File**: `migrations/add-fao-codes.sql`
- **Comparison Script**: `scripts/compare-fao-codes.ts`

---

**Ready to Deploy**: ✅  
**Breaking Changes**: ❌ None  
**Rollback**: Simple DROP COLUMN if needed  
**Benefits**: Future-proof data ingestion and exchange

Once deployed, you'll have both your user-friendly codes AND official FAO codes available for all species! 🐟
