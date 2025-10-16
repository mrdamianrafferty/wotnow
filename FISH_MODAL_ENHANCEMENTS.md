# Fish Modal Enhancements - Complete Implementation

## Overview
Enhanced fish species modals to display comprehensive fishing information from the database including techniques, bait recommendations, substrate preferences, and iNaturalist links.

## What Was Implemented

### 1. Database Schema Updates ✅
- **Migration**: `20251016001_add_inaturalist_url.sql`
  - Added `inaturalist_url` column to `species` table
  - Stores links to iNaturalist species pages for identification resources

- **Data Population**: `20251016002_populate_inaturalist_urls.sql`
  - Populated iNaturalist URLs for 50+ common species
  - Includes Atlantic, Mediterranean, and European species
  - Ready to be applied with: `npx supabase db push`

### 2. API Endpoint ✅
- **File**: `pages/api/findr/species-details.ts`
- **Purpose**: Fetches comprehensive species data in a single API call
- **Features**:
  - Accepts `species_id` or `species_code` as parameters
  - Joins with `species_technique`, `species_bait`, and `species_substrates` tables
  - Returns formatted data ready for UI display
  
**Example Response**:
```json
{
  "species_id": "uuid",
  "species_code": "bss",
  "name_en": "Sea Bass",
  "scientific_name": "Dicentrarchus labrax",
  "inaturalist_url": "https://www.inaturalist.org/taxa/47273",
  "techniques": [
    {
      "technique_id": 4,
      "technique_code": "spinning",
      "technique_name": "Spinning",
      "effectiveness": 0.95,
      "notes": "Cast metals to surface feeds",
      "beginner_tips": "Cast small metal jigs into feeding shoals..."
    }
  ],
  "bait": [
    {
      "bait_id": 9,
      "bait_name": "Mackerel strip",
      "effectiveness": 0.85,
      "notes": "Durable strip; scent trail"
    }
  ],
  "substrates": {
    "name_en": "Sea Bass",
    "has_sand": true,
    "has_rock": true,
    "has_mixed": true,
    "has_gravel": false,
    "has_mud": false
  }
}
```

### 3. React Hook ✅
- **File**: `hooks/useSpeciesDetails.ts`
- **Purpose**: Fetches species details when modal opens
- **Features**:
  - Accepts `speciesId` or `speciesCode`
  - Loading and error states
  - Automatic refetch on parameter change
  - Can be disabled with `enabled: false`

**Usage**:
```typescript
const { details, loading, error } = useSpeciesDetails({
  speciesId: card.speciesId,
  enabled: modalOpen,
});
```

### 4. Type Definitions ✅
- **File**: `lib/findr/mapPrediction.ts`
- **New Types**:
  ```typescript
  export interface TechniqueInfo {
    technique_id: number;
    technique_code: string;
    technique_name: string;
    effectiveness: number;
    notes: string | null;
    beginner_tips: string | null;
  }

  export interface BaitInfo {
    bait_id: number;
    bait_name: string;
    effectiveness: number;
    notes: string | null;
  }

  export interface SubstrateInfo {
    name_en: string;
    has_sand: boolean;
    has_gravel: boolean;
    has_rock: boolean;
    has_mud: boolean;
    has_mixed: boolean;
  }
  ```

- **Extended CardData** with:
  - `techniques?: TechniqueInfo[]`
  - `bait?: BaitInfo[]`
  - `substrates?: SubstrateInfo | null`
  - `inaturalist_url?: string | null`

### 5. Enhanced Modal UI ✅
- **File**: `components/findr/FishSpeciesModal.tsx`
- **New Sections**:

#### a) Fishing Techniques
- **Icon**: 🎯 Target
- **Title**: "Best fishing techniques"
- **Display**:
  - Shows top 3 techniques sorted by effectiveness
  - Each technique shows:
    - Name (e.g., "Spinning", "Bottom fishing")
    - Effectiveness badge (e.g., "90% effective")
    - Beginner tips (helpful guidance for new anglers)
    - Additional notes about when/where to use

#### b) Bait Recommendations
- **Icon**: ✨ Wand2
- **Title**: "Top bait recommendations"
- **Display**:
  - Shows top 5 bait options sorted by effectiveness
  - Each bait shows:
    - Name (e.g., "Mackerel strip", "Peeler crab")
    - Effectiveness percentage
    - Contextual notes (e.g., "Prime for drifts")

#### c) Substrate Preferences
- **Icon**: ⛰️ Mountain
- **Title**: "Preferred habitats"
- **Display**:
  - Badge grid showing habitat types:
    - 🏖️ Sand
    - ⚪ Gravel
    - 🪨 Rock
    - 🟤 Mud
    - 🌊 Mixed
  - Only shows habitats the species actually uses

#### d) iNaturalist Link
- **Icon**: 🔗 ExternalLink
- **Title**: "Learn more"
- **Display**:
  - Clickable link to iNaturalist species page
  - Opens in new tab with `rel="noopener noreferrer"`
  - Helper text: "Explore photos, observations, and identification guides from the community"

## Data Sources

### Existing Data (Already in Database)
Based on the CSV files provided:
- ✅ `technique` table - 22 fishing techniques
- ✅ `species_technique` - Maps 49 species to their best techniques
- ✅ `bait` table - Bait types with effectiveness scores
- ✅ `species_bait` - Maps 49 species to recommended bait
- ✅ `species_substrates` - Maps 69 species to preferred substrates

### New Data (Added)
- ✅ `species.inaturalist_url` - Links to iNaturalist pages for 50+ species

## How It Works

### Flow Diagram
```
1. User clicks on species card
   ↓
2. FishSpeciesModal opens with basic card data
   ↓
3. useSpeciesDetails hook triggers API call
   ↓
4. API fetches data from 4 tables via JOINs:
   - species (base info + iNaturalist URL)
   - species_technique → technique (fishing methods)
   - species_bait → bait (recommended bait)
   - species_substrates (habitat preferences)
   ↓
5. Modal displays 4 new sections with rich data
```

### Performance Considerations
- ✅ Data fetched only when modal opens (not on page load)
- ✅ Single API call instead of 4 separate queries
- ✅ Loading state shows while fetching (prevents janky UI)
- ✅ Error handling with graceful degradation
- ✅ Previously loaded data from static advice files still shown

## Testing Checklist

### Manual Testing Steps
1. ✅ Open findr predictions page
2. ✅ Click on any species card to open modal
3. ✅ Verify new sections appear below existing content:
   - [ ] "Best fishing techniques" with technique cards
   - [ ] "Top bait recommendations" with bait list
   - [ ] "Preferred habitats" with substrate badges
   - [ ] "Learn more" with iNaturalist link (if available)
4. ✅ Click iNaturalist link (if present)
   - [ ] Opens in new tab
   - [ ] Shows correct species page
5. ✅ Test with multiple species:
   - [ ] Common species (Sea Bass, Cod, Mackerel)
   - [ ] Mediterranean species (Dusky Grouper, Dentex)
   - [ ] Newly added species from your CSV data

### Database Verification
Run these queries to verify data completeness:

```sql
-- Check iNaturalist URLs populated
SELECT COUNT(*) as species_with_urls
FROM species 
WHERE inaturalist_url IS NOT NULL;
-- Expected: 50+

-- Check species with technique data
SELECT COUNT(DISTINCT species_id) as species_with_techniques
FROM species_technique;
-- Expected: 49+

-- Check species with bait data  
SELECT COUNT(DISTINCT species_id) as species_with_bait
FROM species_bait;
-- Expected: 49+

-- Check species with substrate data
SELECT COUNT(*) as species_with_substrates
FROM species_substrates;
-- Expected: 69+
```

## API Testing

### Test the API Endpoint
```bash
# Test with species_code
curl http://localhost:3002/api/findr/species-details?species_code=bss | jq

# Test with species_id
curl http://localhost:3002/api/findr/species-details?species_id=UUID_HERE | jq

# Expected response fields:
# - species_id, species_code, name_en
# - scientific_name, inaturalist_url
# - techniques[] (array with 0+ items)
# - bait[] (array with 0+ items)
# - substrates (object or null)
```

## Deployment Steps

### 1. Apply Database Migrations
```bash
cd /Users/damianrafferty/Projects/WotNow

# Apply schema change (inaturalist_url column)
npx supabase db push

# This will apply:
# - 20251016001_add_inaturalist_url.sql
# - 20251016002_populate_inaturalist_urls.sql
```

### 2. Verify API Endpoint
- Start dev server: `npm run dev`
- Test endpoint: `curl http://localhost:3002/api/findr/species-details?species_code=bss`
- Should return JSON with techniques, bait, substrates

### 3. Deploy to Production
```bash
# Commit all changes
git add .
git commit -m "Add enhanced fish species modal with techniques, bait, and iNaturalist links"
git push origin main

# Vercel will auto-deploy
# Migrations will need to be applied to production database
```

### 4. Post-Deployment Verification
- Open fishfindr.eu/findr
- Click several species cards
- Verify all 4 new sections display correctly
- Test iNaturalist links open properly

## Future Enhancements

### Priority 1: Complete iNaturalist URLs
- Add URLs for remaining species (currently 50+, can expand to all 70+)
- Script to auto-generate URLs from scientific names

### Priority 2: Technique Videos/Images
- Add visual guides to techniques
- Link to YouTube tutorials
- Show tackle setup diagrams

### Priority 3: Seasonal Availability
- Show calendar of best months
- Visual heat map of seasonality
- Link to bite score data

### Priority 4: User Contributions
- Allow users to rate technique effectiveness
- Share personal bait recommendations
- Upload catch photos linked to techniques

### Priority 5: Localization
- Translate technique names and tips
- Localize bait names for different regions
- Regional technique variations (e.g., UK vs Mediterranean methods)

## File Manifest

### New Files Created
1. ✅ `supabase/migrations/20251016001_add_inaturalist_url.sql`
2. ✅ `supabase/migrations/20251016002_populate_inaturalist_urls.sql`
3. ✅ `pages/api/findr/species-details.ts`
4. ✅ `hooks/useSpeciesDetails.ts`

### Modified Files
1. ✅ `lib/findr/mapPrediction.ts` - Added type definitions
2. ✅ `components/findr/FishSpeciesModal.tsx` - Enhanced with new sections

### Configuration Files
- No changes to Next.js, Supabase, or deployment configs

## Known Issues / Notes

### Issue 1: Supabase DB Push
- Migration push had some connection issues during development
- Migrations are ready and can be applied manually if needed
- Alternative: Use Supabase Dashboard SQL Editor to run migrations

### Note 1: Loading State
- Modal shows loading spinner while fetching enhanced data
- Prevents flash of incomplete content
- Degrades gracefully if API fails (shows existing data)

### Note 2: Data Completeness
- Not all species have technique/bait data yet
- Modal only shows sections with available data
- New species from CSV uploads will need technique/bait mappings added

### Note 3: iNaturalist Links
- Currently populated for 50+ common species
- Can be expanded by running additional UPDATE queries
- Format: `https://www.inaturalist.org/taxa/{taxon_id}-{species-name}`

## Support & Maintenance

### Updating iNaturalist URLs
To add URLs for new species:
```sql
UPDATE public.species 
SET inaturalist_url = 'https://www.inaturalist.org/taxa/TAXON_ID-Species-Name' 
WHERE species_code = 'CODE';
```

### Adding Technique Mappings
To add techniques for new species:
```sql
INSERT INTO species_technique (species_id, technique_id, effectiveness, notes, beginner_tips)
VALUES ('species_uuid', 4, 0.85, 'Works well in surf', 'Cast with the tide');
```

### Adding Bait Mappings
To add bait for new species:
```sql
INSERT INTO species_bait (species_id, bait_id, effectiveness, notes)
VALUES ('species_uuid', 9, 0.90, 'Top choice in autumn');
```

## Summary

This implementation provides anglers with **comprehensive, actionable fishing information** directly in the species modal. By integrating data from existing database tables (techniques, bait, substrates) and adding external resources (iNaturalist), we've created a **one-stop reference** for:

1. ✅ **How to catch it** - Proven fishing techniques with effectiveness ratings
2. ✅ **What to use** - Top bait recommendations backed by data
3. ✅ **Where to find it** - Habitat and substrate preferences
4. ✅ **Learn more** - External identification resources via iNaturalist

All species, including newly added ones, will benefit from this enhanced data display once their technique and bait mappings are populated in the database.
