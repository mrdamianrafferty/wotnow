# Current State of RPC Functions - 17 October 2025

## Overview
The Findr predictions API uses two RPC functions depending on whether the user provides GPS coordinates.

## Function 1: `get_environmental_predictions_basic`

**Usage:** Called when NO GPS coordinates are provided (most common case)

**Input Parameters:**
- `target_rectangle` (text) - ICES rectangle code
- `target_date` (date) - Date for predictions

**Output Fields:**
```sql
RETURNS TABLE (
  species_id uuid,
  species_code character varying(50),      -- ✅ NOW INCLUDED
  name_en character varying(100),          -- ✅ NOW INCLUDED  
  scientific_name character varying(200),  -- ✅ NOW INCLUDED
  playful_bio_en text,                     -- ✅ NOW INCLUDED
  ices_rectangle text,
  prediction_date date,
  confidence integer,
  bio_band_score integer,
  temp_score integer,
  substrate_score integer,
  freshness_score integer,
  completeness_score integer
)
```

**Migration:** `20251017001_add_bio_to_predictions.sql` (Applied ✅)

---

## Function 2: `get_environmental_predictions_enhanced`

**Usage:** Called when GPS coordinates ARE provided (for enhanced substrate/depth scoring)

**Input Parameters:**
- `target_rectangle` (text) - ICES rectangle code
- `target_date` (date) - Date for predictions
- `user_lat` (numeric) - User's latitude (optional)
- `user_lon` (numeric) - User's longitude (optional)
- `user_substrate` (text) - Substrate type from EMODnet (optional)
- `user_depth_m` (numeric) - Depth from EMODnet bathymetry (optional)

**Output Fields:**
```sql
RETURNS TABLE (
  species_id uuid,
  species_code varchar,         -- ✅ NOW INCLUDED
  name_en varchar,               -- ✅ NOW INCLUDED
  scientific_name varchar,       -- ✅ NOW INCLUDED
  playful_bio_en text,           -- ✅ NOW INCLUDED
  ices_rectangle text,
  prediction_date date,
  confidence integer,
  bio_band_score integer,
  temp_score integer,
  substrate_score integer,      -- Enhanced with GPS data
  depth_score integer,          -- Enhanced with GPS data
  freshness_score integer,
  completeness_score integer
)
```

**Migration:** `20251017002_add_bio_to_enhanced_predictions.sql` (Applied ✅)

---

## API Flow

### 1. Request Received
```typescript
POST /api/findr/predictions
{
  rectangleCode: "31F2",
  predictionDate: "2025-10-17",
  language: "en",
  latitude?: number,    // Optional
  longitude?: number    // Optional
}
```

### 2. Cache Check
- Checks `findr_prediction_sessions` table
- TTL: 3 hours
- Can be bypassed with `bypassCache: true`

### 3. RPC Selection
```typescript
const useEnhancedFunction = userLat !== null && userLon !== null;
const rpcFunctionName = useEnhancedFunction 
  ? 'get_environmental_predictions_enhanced' 
  : 'get_environmental_predictions_basic';
```

### 4. RPC Response Example
```json
{
  "species_id": "uuid-here",
  "species_code": "bss",
  "name_en": "Sea Bass",
  "scientific_name": "Dicentrarchus labrax",
  "playful_bio_en": "Just a local legend looking for steady flow...",
  "ices_rectangle": "31F2",
  "prediction_date": "2025-10-17",
  "confidence": 78,
  "bio_band_score": 22,
  "temp_score": 20,
  "substrate_score": 15,
  "freshness_score": 18,
  "completeness_score": 3
}
```

### 5. Augmentation Process
The API then augments each prediction:

```typescript
// Transform playful_bio_en → playful_bio for frontend
result.playful_bio = original.playful_bio_en.trim();

// Query species table for localized names (name_fr, name_es, etc.)
// Match by: species_code → scientific_name → name_en (in order)

// Populate missing fields:
if (!result.name_en && match.name_en) {
  result.name_en = match.name_en;  // Critical for avoiding "Unidentified species"
}
if (!result.species_code && match.species_code) {
  result.species_code = match.species_code;
}
if (!result.playful_bio && match.playful_bio_en) {
  result.playful_bio = match.playful_bio_en;  // Fallback if not from RPC
}
```

### 6. Final Response
```json
{
  "rectangleCode": "31F2",
  "predictionDate": "2025-10-17",
  "language": "en",
  "predictions": [
    {
      "species_id": "uuid",
      "species_code": "bss",
      "name_en": "Sea Bass",
      "scientific_name": "Dicentrarchus labrax",
      "playful_bio": "Just a local legend looking for...",  // Renamed from playful_bio_en
      "localized_names": {
        "fr": "Bar commun",
        "es": "Lubina",
        "it": "Spigola"
      },
      "confidence": 78
      // ... other fields
    }
  ],
  "metadata": {
    "cacheControl": "s-maxage=900, stale-while-revalidate=3600",
    "requestedAt": "2025-10-17T10:30:00Z",
    "source": "live",
    "region": "English Channel"
  }
}
```

---

## Recent Changes (17 Oct 2025)

### Change 1: Added Bio Support
**Problem:** Fish weren't showing their Findr bios in swipable cards  
**Solution:** Added `playful_bio_en`, `species_code`, `scientific_name`, `name_en` to both RPC functions  
**Files:** `20251017001_add_bio_to_predictions.sql`, `20251017002_add_bio_to_enhanced_predictions.sql`

### Change 2: Fixed Unidentified Species
**Problem:** Species showing as "Unidentified species"  
**Solution:** Enhanced augmentation to:
- Collect `name_en` from predictions
- Query species table by `name_en` as fallback
- Populate missing `name_en` in results
**File:** `pages/api/findr/predictions.ts`

---

## Database Tables Referenced

### `species`
Contains master species data with all localized names and bios

### `findr_conditions_snapshots`
Contains environmental data (temperature, salinity, oxygen, chlorophyll)

### `species_bio_bands`
Contains species preferences for environmental parameters

### `bio_bands_thresholds`
Defines thresholds for classifying environmental values

### `species_substrates`
Contains species substrate preferences

### `findr_prediction_sessions`
Cache table for predictions (3-hour TTL)

---

## Confidence Scoring Breakdown

### Basic Function (0-100 points)
- Bio-band matching: 0-30 points
- Temperature suitability: 0-25 points
- Substrate match: 0-20 points (default 12)
- Data freshness: 0-20 points
- Species completeness: 0-15 points

### Enhanced Function (0-100 points)
- Bio-band matching: 0-30 points
- Temperature suitability: 0-25 points
- Substrate match: 0-25 points (enhanced with GPS)
- Depth match: 0-20 points (enhanced with GPS)
- Data freshness: 0-15 points
- Species completeness: 0-10 points

---

## Current Status: ✅ FULLY OPERATIONAL

Both RPC functions are deployed and working with complete species data including:
- ✅ Common names (name_en)
- ✅ Scientific names
- ✅ Species codes
- ✅ Findr bios (75+ species)
- ✅ Localized names (FR, ES, DE, IT, PT)
- ✅ Environmental confidence scoring
- ✅ GPS-enhanced predictions (when coordinates provided)

Last deployed: 17 October 2025
