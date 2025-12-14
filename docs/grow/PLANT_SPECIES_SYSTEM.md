# Plant Species System Documentation

## Overview

The Plant Species system provides comprehensive plant data for the WotNow Grow feature. It combines:
1. **Local curated data** - 455+ species with growing advice, timings, and metadata
2. **Perenual API enrichment** - Scientific names, families, and images from perenual.com
3. **Local plant images** - 450+ WebP illustrations in multiple sizes

---

## Database Schema

### Table: `plant_species`

```sql
CREATE TABLE plant_species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- URL-safe identifier (e.g., "tomato", "fruit-apple")
  name TEXT NOT NULL,                   -- Display name (e.g., "Tomato", "Apple")
  scientific_name TEXT,                 -- e.g., "Solanum lycopersicum"
  category TEXT,                        -- e.g., "vegetable", "fruit", "herb", "flower"
  description TEXT,                     -- Brief description
  advice TEXT,                          -- Growing tips
  
  -- Growing requirements
  sun_requirements TEXT,                -- e.g., "Full sun", "Partial shade"
  soil_type TEXT,                       -- e.g., "Well-draining", "Rich loam"
  plant_size TEXT,                      -- e.g., "Medium", "Large"
  
  -- Climate zones
  usda_zone_min INTEGER,                -- Minimum USDA hardiness zone
  usda_zone_max INTEGER,                -- Maximum USDA hardiness zone
  
  -- Search & aliases
  search_terms TEXT[],                  -- Alternative names for search
  aliases TEXT[],                       -- Common synonyms
  image_key TEXT,                       -- Key for local image lookup
  
  -- Perenual API enrichment
  perenual_id INTEGER,                  -- Perenual plant ID
  perenual_scientific_name TEXT,        -- Scientific name from Perenual
  perenual_family TEXT,                 -- Plant family from Perenual
  perenual_default_image JSONB,         -- Default image URLs from Perenual
  perenual_last_synced_at TIMESTAMPTZ,  -- Last sync timestamp
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

### GET `/api/grow/species/[slug]`

Fetches a single species by slug.

**Request:**
```
GET /api/grow/species/tomato
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "slug": "tomato",
  "name": "Tomato",
  "scientificName": "Solanum lycopersicum",
  "category": "vegetable",
  "description": "A warm-season crop...",
  "advice": "Start seeds indoors 6-8 weeks before last frost...",
  "sunRequirements": "Full sun",
  "soilType": "Rich, well-draining",
  "plantSize": "Medium to Large",
  "usdaZoneMin": 3,
  "usdaZoneMax": 11,
  "searchTerms": ["tomato", "cherry tomato", "beefsteak"],
  "aliases": ["love apple"],
  "imageKey": "tomato-solanum-lycopersicum"
}
```

**File:** `pages/api/grow/species/[slug].ts`

---

### POST `/api/grow/species/batch`

Fetches multiple species by name (case-insensitive).

**Request:**
```json
POST /api/grow/species/batch
{
  "names": ["tomato", "basil", "pepper"]
}
```

**Response:**
```json
{
  "species": {
    "tomato": { "slug": "tomato", "name": "Tomato", ... },
    "basil": { "slug": "basil", "name": "Basil", ... },
    "pepper": { "slug": "pepper", "name": "Pepper", ... }
  }
}
```

**File:** `pages/api/grow/species/batch.ts`

---

### GET `/api/grow/species/[slug]` (by name)

The same endpoint can resolve by name if slug not found:
```
GET /api/grow/species/Tomato  → redirects to tomato data
```

**File:** `pages/api/grow/species/[slug].ts`

---

## Frontend Components

### Species Page: `pages/grow/species/[slug].tsx`

Full species detail page with tabs:
- **Overview** - Care basics, description, advice
- **Your timing** - Personalized planting calendar windows
- **Threats** - Relevant pest/disease threats with images

**Features:**
- Hero image from local WebP files or Perenual API
- Lightbox for full-size image viewing
- Location-based timing notice
- ThreatCard components with Wikimedia images

---

### PlantSpeciesInfo Component: `components/grow/PlantSpeciesInfo.tsx`

Compact species info card for embedding in other views.

```tsx
<PlantSpeciesInfo 
  species={speciesData}
  isLoading={isLoadingSpecies}
/>
```

---

## Local Plant Images

### Location: `/public/grow/plants/`

Images are stored in multiple size variants:
- `emoji/` - Tiny icons (32px)
- `medium/` - Thumbnails (192px)
- `lg/` - Card images (384px)
- `xl/` - Hero/detail images (768px)

### Image Map: `lib/grow/plantImages.ts`

```typescript
export const PLANT_IMAGE_MAP: Record<string, PlantImageEntry> = {
  "tomato-solanum-lycopersicum": {
    emoji: "/grow/plants/emoji/tomato-solanum-lycopersicum.webp",
    medium: "/grow/plants/medium/tomato-solanum-lycopersicum.webp",
    lg: "/grow/plants/lg/tomato-solanum-lycopersicum.webp",
    xl: "/grow/plants/xl/tomato-solanum-lycopersicum.webp",
    source: "123_Tomato_Solanum_lycopersicum.png"
  },
  // ... 450+ entries
};

export function getPlantImage(key: string, size: 'emoji' | 'medium' | 'lg' | 'xl'): string | null;
```

### Image Key Resolution

The system uses fuzzy matching to find images:
1. Exact slug match
2. Slug prefix match (e.g., `tomato-` matches `tomato-solanum-lycopersicum`)
3. Name-based slugification

**File:** `components/grow/GardenPage.tsx` - `findBestPlantImageKey()`

---

## Perenual API Integration

### API Details

- **Provider:** perenual.com
- **Rate Limit:** 300 requests/day (free tier)
- **Endpoint:** `https://perenual.com/api/species/details/{id}`
- **API Key:** `PERENUAL_API_KEY` in `.env.local`

### Sync Script: `scripts/sync-perenual-data.ts`

Enriches `plant_species` table with Perenual data:

```bash
# Run sync (respects rate limits)
npx tsx scripts/sync-perenual-data.ts

# Check progress
npx tsx -e "..." # See terminal history for query
```

**What it syncs:**
- `perenual_id` - Matched plant ID
- `perenual_scientific_name` - Verified scientific name
- `perenual_family` - Plant family (e.g., "Solanaceae")
- `perenual_default_image` - Image URLs (thumbnail, small, medium, regular, original)
- `perenual_last_synced_at` - Timestamp

### Perenual API Module: `lib/grow/perenualApi.ts`

```typescript
// Search for plants
const results = await searchPerenualPlants("tomato");

// Get plant details
const details = await getPerenualPlantDetails(perenualId);

// Sync species data
await syncSpeciesWithPerenual(speciesSlug);
```

### Attribution Requirements

Per Perenual's terms of service, display attribution when using their images:

```tsx
import { PerenualAttribution } from '@/components/grow/PerenualAttribution';

// In component
<PerenualAttribution />  // Shows "Data from Perenual" with link
```

---

## Species Cache (Frontend)

### Location: `lib/grow/api.ts`

```typescript
// Batch fetch with caching
const speciesMap = await api.getPlantSpeciesBatch(["tomato", "basil"]);

// Single fetch
const species = await api.getPlantSpeciesByName("tomato");
```

### GardenPage Species Cache

```typescript
const [speciesCache, setSpeciesCache] = useState<Map<string, PlantSpecies>>(new Map());

// Automatically fetches species info for all plants in garden
useEffect(() => {
  const fetchSpeciesInfo = async () => {
    const uncachedNames = plants.map(p => p.name.toLowerCase())
      .filter(name => !speciesCache.has(name));
    
    if (uncachedNames.length > 0) {
      const newSpecies = await api.getPlantSpeciesBatch(uncachedNames);
      setSpeciesCache(prev => new Map([...prev, ...newSpecies]));
    }
  };
  fetchSpeciesInfo();
}, [plants]);
```

---

## Data Flow Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Next.js API    │     │    Supabase     │
│   (React)       │────▶│   Routes         │────▶│   PostgreSQL    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Local Images   │     │   Perenual API   │     │  plant_species  │
│  /public/grow/  │     │   (enrichment)   │     │     table       │
│  plants/        │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `pages/grow/species/[slug].tsx` | Species detail page |
| `pages/api/grow/species/[slug].ts` | Single species API |
| `pages/api/grow/species/batch.ts` | Batch species API |
| `lib/grow/species.ts` | PlantSpecies type definitions |
| `lib/grow/plantImages.ts` | Local image map & helpers |
| `lib/grow/perenualApi.ts` | Perenual API client |
| `scripts/sync-perenual-data.ts` | Perenual sync script |
| `components/grow/PlantSpeciesInfo.tsx` | Compact species card |
| `components/grow/PerenualAttribution.tsx` | Attribution component |

---

## Common Operations

### Add a new species

1. Insert into `plant_species` table via Supabase dashboard
2. Add image to `/public/grow/plants/` (all 4 sizes)
3. Add entry to `PLANT_IMAGE_MAP` in `lib/grow/plantImages.ts`
4. Run Perenual sync to enrich data

### Check sync status

```bash
npx tsx -e "
const { config } = require('dotenv');
config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { count: synced } = await supabase.from('plant_species').select('*', { count: 'exact', head: true }).not('perenual_id', 'is', null);
  const { count: total } = await supabase.from('plant_species').select('*', { count: 'exact', head: true });
  console.log('Synced:', synced, '/', total);
})();
"
```

### Debug species lookup

```bash
# Check what's in the database for a species
npx tsx -e "
const { config } = require('dotenv');
config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data } = await supabase.from('plant_species').select('*').ilike('name', '%tomato%');
  console.log(JSON.stringify(data, null, 2));
})();
"
```

---

## Future Enhancements

- [ ] Add Perenual care guides integration
- [ ] Support user-submitted species
- [ ] Add companion planting relationships
- [ ] Integrate with plant identification API results
- [ ] Add seasonal growing guides per climate zone
