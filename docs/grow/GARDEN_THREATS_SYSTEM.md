# Garden Threats System Documentation

## Overview

The Garden Threats system provides intelligent pest, disease, and environmental threat assessments based on:
1. **User's plants** - Threats are filtered by what the user is growing
2. **Garden features** - Greenhouse, raised beds, etc. affect threat relevance
3. **Seasonal timing** - Threats are scored by current month and conditions
4. **Weather signals** - (planned) Rain, humidity, temperature triggers

---

## Database Schema

### Table: `garden_threat`

Core threat definitions with rich content.

```sql
CREATE TABLE garden_threat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,            -- URL-safe identifier
  threat_type TEXT NOT NULL,            -- pest|fungal|bacterial|viral|oomycete|nematode|abiotic|nutrient
  common_name_en TEXT NOT NULL,         -- Display name (e.g., "Aphids")
  scientific_name TEXT,                 -- e.g., "Myzus persicae"
  description TEXT,                     -- Detailed description
  recognition TEXT,                     -- How to identify
  severity_default INTEGER DEFAULT 3,   -- Base severity 1-5
  contagious BOOLEAN DEFAULT FALSE,
  regions_applicable TEXT[],            -- Region codes where applicable
  notes TEXT,
  
  card_json JSONB NOT NULL DEFAULT '{}', -- Rich content (see below)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `card_json` Structure

```json
{
  "recognition_bullets": ["Yellow/green soft-bodied insects", "Clusters on new growth"],
  "prevention_bullets": ["Encourage beneficial insects", "Avoid over-fertilizing"],
  "treatment_pesticide_free": ["Spray with water", "Introduce ladybugs"],
  "where_on_plant": ["stems", "leaf_undersides", "new_growth"],
  "confirmation_tips": ["Look for honeydew residue", "Check for ants farming them"],
  "when_to_escalate_bullets": ["Heavy infestation affecting plant health"],
  
  "wikimedia_image": {
    "local_path": "/grow/threats/aphids.jpg",
    "wikimedia_file": "Aphids_on_broccoli.jpg",
    "wikimedia_url": "https://commons.wikimedia.org/wiki/File:Aphids_on_broccoli.jpg",
    "license": "CC BY-SA 3.0",
    "license_url": "https://creativecommons.org/licenses/by-sa/3.0/",
    "author": "Fir0002",
    "source": "Wikimedia Commons"
  }
}
```

---

### Table: `garden_threat_host`

Links threats to affected plants/features.

```sql
CREATE TABLE garden_threat_host (
  threat_id UUID REFERENCES garden_threat(id),
  host_kind TEXT NOT NULL,              -- species|genus|family|crop_tag|feature_tag
  host_key TEXT NOT NULL,               -- e.g., "tomato", "solanaceae", "greenhouse"
  host_strength INTEGER DEFAULT 1,      -- How strongly this host attracts the threat
  notes TEXT,
  
  PRIMARY KEY (threat_id, host_kind, host_key)
);
```

**host_kind values:**
- `species` - Specific plant species (e.g., "tomato")
- `genus` - Plant genus (e.g., "solanum")
- `family` - Plant family (e.g., "solanaceae")
- `crop_tag` - User plant name normalized (e.g., "cherry_tomato" → "tomato")
- `feature_tag` - Garden feature (e.g., "greenhouse", "raised_beds")

---

### Table: `garden_threat_risk_rule`

Conditional scoring rules.

```sql
CREATE TABLE garden_threat_risk_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_id UUID REFERENCES garden_threat(id),
  title TEXT NOT NULL,                  -- Rule display name
  enabled BOOLEAN DEFAULT TRUE,
  
  season_start_month INTEGER,           -- 1-12, null = year-round
  season_end_month INTEGER,             -- 1-12
  region_codes TEXT[],                  -- Applicable regions
  
  rule_json JSONB DEFAULT '{}',         -- Additional conditions
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**rule_json conditions (planned):**
```json
{
  "weather": {
    "rain_72h_mm_gte": 50,
    "rh_hours_24h_over_90_gte": 6,
    "temp_avg_24h_c_range": [15, 25]
  }
}
```

---

## API Endpoints

### GET `/api/grow/threats`

Returns threats relevant to the authenticated user.

**Request:**
```
GET /api/grow/threats
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "threats": [
    {
      "threatId": "uuid-123",
      "slug": "aphids",
      "commonName": "Aphids",
      "scientificName": "Various species",
      "threatType": "pest",
      "severityDefault": 3,
      "score": 4,
      "band": "high",
      "matchedHosts": [
        { "kind": "crop_tag", "key": "tomato", "strength": 2 }
      ],
      "matchedRules": [
        { "ruleId": "uuid-456", "title": "Spring/Summer peak", "score": 1 }
      ],
      "reasons": ["You're growing tomato", "Peak season (June)"],
      "cardJson": { ... }
    }
  ],
  "context": {
    "month": 6,
    "hostTags": {
      "cropTags": ["tomato", "pepper", "basil"],
      "featureTags": ["greenhouse"]
    }
  }
}
```

**File:** `pages/api/grow/threats/index.ts`

---

## Threat Assessment Algorithm

### File: `lib/grow/threats/evaluateThreats.ts`

```typescript
export function evaluateThreats(
  input: ThreatMatchInput,
  bundles: Array<{ threat: ThreatRow; hosts: ThreatHostRow[]; rules: ThreatRiskRuleRow[] }>,
  ctx: ThreatSignalContext
): ThreatAssessment[]
```

### Scoring Logic

1. **Base score** = `severity_default` (1-5)

2. **Host matching** adds score based on:
   - Direct plant match: +2
   - Family/genus match: +1
   - Feature match: +1

3. **Seasonal rules** add score if:
   - Current month within `season_start_month` to `season_end_month`
   - Adds +1 per active rule

4. **Band calculation:**
   ```typescript
   function scoreToBand(score: number): ThreatRiskBand {
     if (score <= 1) return 'none';
     if (score <= 2) return 'low';
     if (score <= 3) return 'moderate';
     if (score <= 4) return 'high';
     return 'severe';
   }
   ```

### Context Building

```typescript
const ctx: ThreatSignalContext = {
  now: new Date(),
  month: now.getMonth() + 1,  // 1-12
  weather: {                   // Future: from weather API
    rain_72h_mm: 25,
    rh_hours_24h_over_90: 4,
    temp_avg_24h_c: 18
  }
};
```

---

## Frontend Components

### ThreatCard Component: `components/grow/ThreatCard.tsx`

Rich threat display with images.

```tsx
<ThreatCard 
  threat={threatAssessment}
  compact={false}  // true for smaller display
/>
```

**Features:**
- Wikimedia Commons image with lightbox
- Proper CC license attribution
- Threat type icon
- Risk band badge
- Recognition bullets
- Matched hosts badges

### Image Lightbox

Click any threat image to view fullscreen:
- Escape key or click outside to close
- Full attribution bar at bottom
- Links to Wikimedia source

---

## Threat Images

### Location: `/public/grow/threats/`

30 curated images from Wikimedia Commons:
- Pests (12): aphids, slugs, spider-mites, whitefly, etc.
- Fungal diseases (12): powdery-mildew, late-blight, rust, etc.
- Abiotic (5): frost-damage, heat-stress, overwatering, etc.
- Nutrient (1): nitrogen-deficiency

### Attribution File: `/public/grow/threats/ATTRIBUTIONS.md`

Full license and author credits per Wikimedia requirements.

### Download Script: `scripts/download-threat-images.ts`

```bash
# Download all threat images from Wikimedia Commons
npx tsx scripts/download-threat-images.ts
```

Curated image sources with proper licensing:
```typescript
const THREAT_IMAGES = {
  'aphids': {
    wikiFile: 'Aphids_on_broccoli.jpg',
    license: 'CC BY-SA 3.0',
    attribution: 'Fir0002',
  },
  // ... 29 more
};
```

### Update Database Script: `scripts/update-threat-images.ts`

```bash
# Update card_json with wikimedia_image for all threats
npx tsx scripts/update-threat-images.ts

# Dry run (no changes)
npx tsx scripts/update-threat-images.ts --dry-run
```

---

## Types

### File: `lib/grow/threats/types.ts`

```typescript
export type ThreatType =
  | 'pest'
  | 'fungal'
  | 'oomycete'
  | 'bacterial'
  | 'viral'
  | 'nematode'
  | 'abiotic'
  | 'nutrient'
  | 'weed'
  | 'other';

export type ThreatRiskBand = 'none' | 'low' | 'moderate' | 'high' | 'severe';

export type ThreatAssessment = {
  threatId: string;
  slug: string;
  commonName: string;
  scientificName: string | null;
  threatType: ThreatType;
  severityDefault: number;
  score: number;
  band: ThreatRiskBand;
  matchedHosts: Array<{ kind: HostKind; key: string; strength: number }>;
  matchedRules: Array<{ ruleId: string; title: string; score: number }>;
  reasons: string[];
  cardJson: ThreatCardJson;
};
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Request                                   │
│                    GET /api/grow/threats                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Load User Context                                │
│  1. User's plants (grow_user_plants table)                              │
│  2. Garden features (profiles.preferences_json)                          │
│  3. Location/region (profiles)                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Normalize Host Tags                                 │
│  "Cherry Tomatoes" → "cherry_tomato" → "tomato"                         │
│  "Greenhouse" → "greenhouse"                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Query Matching Threats                                │
│  SELECT * FROM garden_threat_host                                        │
│  WHERE host_kind = 'crop_tag' AND host_key IN (user_crop_tags)          │
│     OR host_kind = 'feature_tag' AND host_key IN (user_feature_tags)    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Load Threat Details + Rules                           │
│  - garden_threat rows                                                    │
│  - garden_threat_risk_rule rows (enabled=true)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Evaluate & Score                                    │
│  evaluateThreats(input, bundles, context)                               │
│  → Calculate scores, bands, reasons                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Return ThreatAssessment[]                            │
│  Sorted by score (highest first)                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `pages/api/grow/threats/index.ts` | Threats API endpoint |
| `lib/grow/threats/types.ts` | Type definitions |
| `lib/grow/threats/evaluateThreats.ts` | Scoring algorithm |
| `components/grow/ThreatCard.tsx` | Threat display component |
| `scripts/download-threat-images.ts` | Wikimedia image downloader |
| `scripts/update-threat-images.ts` | Database image updater |
| `public/grow/threats/` | Local threat images |
| `public/grow/threats/ATTRIBUTIONS.md` | Image attribution file |

---

## Common Operations

### Add a new threat

1. **Insert threat record:**
```sql
INSERT INTO garden_threat (slug, threat_type, common_name_en, scientific_name, severity_default, card_json)
VALUES (
  'new-pest',
  'pest',
  'New Pest',
  'Pestus newus',
  3,
  '{
    "recognition_bullets": ["Symptom 1", "Symptom 2"],
    "prevention_bullets": ["Prevention 1"],
    "treatment_pesticide_free": ["Treatment 1"]
  }'
);
```

2. **Add host associations:**
```sql
INSERT INTO garden_threat_host (threat_id, host_kind, host_key, host_strength)
VALUES 
  ('uuid-of-threat', 'crop_tag', 'tomato', 2),
  ('uuid-of-threat', 'family', 'solanaceae', 1);
```

3. **Add seasonal rule (optional):**
```sql
INSERT INTO garden_threat_risk_rule (threat_id, title, season_start_month, season_end_month)
VALUES ('uuid-of-threat', 'Summer peak', 6, 8);
```

4. **Add image:**
   - Find suitable CC-licensed image on Wikimedia Commons
   - Add to `THREAT_IMAGES` in `download-threat-images.ts`
   - Run `npx tsx scripts/download-threat-images.ts`
   - Add to `IMAGE_METADATA` in `update-threat-images.ts`
   - Run `npx tsx scripts/update-threat-images.ts`

### Check threat data

```bash
npx tsx -e "
const { config } = require('dotenv');
config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data } = await supabase
    .from('garden_threat')
    .select('slug, common_name_en, threat_type, card_json->wikimedia_image')
    .limit(5);
  console.log(JSON.stringify(data, null, 2));
})();
"
```

### Debug threat matching

```bash
# See what threats match for user
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/grow/threats | jq '.threats[].commonName'
```

---

## Attribution Requirements

### Wikimedia Commons Images

Per Creative Commons license requirements:

**CC BY / CC BY-SA requires:**
1. Author/photographer name
2. Link to license
3. Link to original source
4. Indication if changes were made

The `WikimediaAttribution` component in `ThreatCard.tsx` handles this:

```tsx
<WikimediaAttribution image={wikimediaImage} />
// Renders: "© Author • CC BY-SA 3.0 • Wikimedia [link]"
```

---

## 30 Current Threats

### Pests (12)
| Slug | Name | Image |
|------|------|-------|
| aphids | Aphids | ✅ |
| slugs-snails | Slugs & Snails | ✅ |
| spider-mites | Spider Mites | ✅ |
| whitefly | Whitefly | ✅ |
| thrips | Thrips | ✅ |
| scale-insects | Scale Insects | ✅ |
| mealybugs | Mealybugs | ✅ |
| vine-weevil | Vine Weevil | ✅ |
| brassica-caterpillars | Brassica Caterpillars | ✅ |
| cutworms | Cutworms | ✅ |
| fungus-gnats | Fungus Gnats | ✅ |
| leaf-miners | Leaf Miners | ✅ |

### Fungal Diseases (12)
| Slug | Name | Image |
|------|------|-------|
| powdery-mildew | Powdery Mildew | ✅ |
| downy-mildew | Downy Mildew | ✅ |
| late-blight | Late Blight | ✅ |
| early-blight | Early Blight | ✅ |
| damping-off | Damping Off | ✅ |
| rust | Rust | ✅ |
| leaf-spot | Leaf Spot | ✅ |
| root-rot | Root Rot | ✅ |
| apple-scab | Apple Scab | ✅ |
| fire-blight | Fire Blight | ✅ |
| rose-black-spot | Rose Black Spot | ✅ |
| botrytis-grey-mould | Botrytis (Grey Mould) | ✅ |

### Abiotic (5)
| Slug | Name | Image |
|------|------|-------|
| blossom-end-rot | Blossom End Rot | ✅ |
| sunscald-leaf-scorch | Sunscald/Leaf Scorch | ✅ |
| frost-damage | Frost Damage | ✅ |
| heat-stress | Heat Stress | ✅ |
| overwatering-poor-drainage | Overwatering | ✅ |

### Nutrient (1)
| Slug | Name | Image |
|------|------|-------|
| nitrogen-deficiency | Nitrogen Deficiency | ✅ |

---

## Future Enhancements

- [ ] Weather-triggered threat scoring
- [ ] Regional threat variations
- [ ] User-reported sightings
- [ ] Treatment effectiveness tracking
- [ ] Beneficial insect recommendations
- [ ] Organic vs conventional treatment options
- [ ] Photo diagnosis integration (AI pest ID)
