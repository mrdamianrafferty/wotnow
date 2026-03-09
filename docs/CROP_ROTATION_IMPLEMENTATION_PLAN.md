# Crop Rotation Implementation Plan for Grow Daisy

**Document Version:** 1.0
**Date:** March 2026
**Audience:** Developers implementing crop rotation in Veg Patch
**Related:** `CROP_ROTATION_EXPERT_GUIDE.md` (horticultural reference)

---

## Overview

This document provides the technical blueprint for adding crop rotation support to Grow Daisy's Veg Patch feature. It builds on the existing `grow_garden_beds` and `grow_bed_plantings` schema and introduces minimal new tables/fields.

---

## Phase 1: Data Model Extensions (MVP)

### 1.1 Extend Existing Schema

#### Add `plant_family` Field to `grow_user_plants`

Since `grow_user_plants` already links to `species_slug`, create a species reference table or add the family directly.

**Option A (Recommended): Create minimal `grow_plant_species` table**

```sql
-- New reference table for plant species (light version)
-- Contains only what rotation logic needs
create table if not exists public.grow_plant_species (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    common_name text not null,
    botanical_name text,
    plant_family text not null check (plant_family in (
        'Brassicaceae',
        'Solanaceae',
        'Fabaceae',
        'Alliaceae',
        'Apiaceae',
        'Cucurbitaceae',
        'Amaranthaceae',
        'Asteraceae',
        'other'
    )),
    crop_category text check (crop_category in (
        'heavy_feeder',
        'light_feeder',
        'nitrogen_fixer',
        'neutral'
    )),
    root_depth_cm integer,
    is_cover_crop boolean default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists grow_plant_species_family_idx
    on public.grow_plant_species (plant_family);

alter table public.grow_plant_species enable row level security;

create policy "Anyone can view species"
    on public.grow_plant_species
    for select
    using (true);

grant select on public.grow_plant_species to authenticated, anon;
```

**Option B (If species data already exists elsewhere):** Just add foreign key to existing species table.

#### Extend `grow_bed_plantings` with Rotation Data

```sql
-- Add columns to track rotation metadata
alter table public.grow_bed_plantings
add column if not exists plant_family text;  -- Denormalized from species for fast queries

alter table public.grow_bed_plantings
add column if not exists pest_disease_log jsonb;  -- Track observed issues
-- Example: {"diseases": ["clubroot"], "pests": ["flea_beetle"], "severity": "moderate", "notes": "..."}

alter table public.grow_bed_plantings
add column if not exists is_cover_crop boolean default false;

alter table public.grow_bed_plantings
add column if not exists cover_crop_terminated_at date;

alter table public.grow_bed_plantings
add column if not exists estimated_nitrogen_fixed_kg numeric;  -- For legumes only

-- Indexes for rotation queries
create index if not exists grow_bed_plantings_bed_family_idx
    on public.grow_bed_plantings (bed_id, plant_family, removed_at);

create index if not exists grow_bed_plantings_family_removed_idx
    on public.grow_bed_plantings (plant_family, removed_at)
    where removed_at is not null;
```

#### Populate `plant_family` in `grow_bed_plantings` When Planting

When a user plants a crop, trigger population of plant_family:

```sql
-- Migration to backfill existing plantings (if species_slug exists in grow_user_plants)
update public.grow_bed_plantings gbp
set plant_family = gps.plant_family
from public.grow_user_plants gup
join public.grow_plant_species gps on gup.species_slug = gps.slug
where gbp.plant_id = gup.id
and gbp.plant_family is null;
```

---

### 1.2 Create Rotation Plan Table (Phase 2, but include schema now)

```sql
-- User's rotation scheme and planned future plantings
create table if not exists public.grow_rotation_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    bed_id uuid not null references public.grow_garden_beds(id) on delete cascade,
    -- Rotation scheme: '3_year', '4_year', '2_bed_simple', 'custom'
    rotation_scheme text not null check (rotation_scheme in (
        '3_year',
        '4_year',
        '2_bed_simple',
        'custom',
        'no_rotation'
    )),
    -- For multi-bed gardens, track cycle order
    -- e.g., beds = ['bed_a', 'bed_b', 'bed_c'] means rotate A→B→C→A
    bed_cycle_order text[] default array[]::text[],
    -- Current year in the rotation cycle
    current_cycle_year integer default 1,
    -- Created when user sets up rotation
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint valid_cycle_year check (current_cycle_year >= 1 and current_cycle_year <= 10)
);

create index if not exists grow_rotation_plans_user_bed_idx
    on public.grow_rotation_plans (user_id, bed_id);

alter table public.grow_rotation_plans enable row level security;

drop policy if exists "Users can manage own rotation plans" on public.grow_rotation_plans;
create policy "Users can manage own rotation plans"
    on public.grow_rotation_plans
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

grant select, insert, update, delete on public.grow_rotation_plans to authenticated;
```

---

## Phase 1: Backend API Endpoints

### 2.1 Main Rotation Suggestion Endpoint

**Endpoint:** `GET /api/grow/beds/[bedId]/rotation-suggestions`

**Purpose:** Recommend what to plant next in a bed based on rotation history

**Implementation:**

```typescript
// pages/api/grow/beds/[bedId]/rotation-suggestions.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Rotation rules engine
const ROTATION_RULES = {
  Solanaceae: {
    avoid_years: 5,  // Atlantic climate; 4 in drier regions
    warning: 'High risk of blight in wet climates'
  },
  Brassicaceae: {
    avoid_years: 3,
    warning: 'Clubroot risk if acidic/wet soil'
  },
  Alliaceae: {
    avoid_years: 2,
    warning: 'White rot disease persistence'
  },
  Fabaceae: {
    avoid_years: 1,  // Can repeat sooner
    nitrogen_fixer: true
  },
  Apiaceae: {
    avoid_years: 2,
    warning: 'Some shared pests'
  },
  Cucurbitaceae: {
    avoid_years: 2,
    warning: 'Mildew and pest carry-over'
  },
  Asteraceae: {
    avoid_years: 1,
    warning: 'Can repeat sooner'
  },
  Amaranthaceae: {
    avoid_years: 1,
    warning: 'Light feeder; minimal risk'
  }
};

interface RotationSuggestion {
  current_family: string;
  last_planted_date: string;
  years_since_last: number;
  suggested_families: Array<{
    family: string;
    compatibility_score: 0-10;
    reason: string;
    is_nitrogen_fixer: boolean;
    warning?: string;
  }>;
  forbidden_families: string[];
  cover_crop_suggestion?: {
    name: string;
    family: string;
    reason: string;
    plant_date: string;
    terminate_date: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RotationSuggestion | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { bedId } = req.query as { bedId: string };
  const userId = req.user?.id;

  if (!userId || !bedId) {
    return res.status(400).json({ error: 'Missing bedId or auth' });
  }

  try {
    const supabase = getSupabaseServerClient(req, res);

    // Verify bed ownership
    const { data: bed, error: bedError } = await supabase
      .from('grow_garden_beds')
      .select('id')
      .eq('id', bedId)
      .eq('user_id', userId)
      .single();

    if (bedError || !bed) {
      return res.status(404).json({ error: 'Bed not found' });
    }

    // Get last 5 plantings for this bed
    const { data: plantings, error: plantError } = await supabase
      .from('grow_bed_plantings')
      .select(`
        id,
        plant_family,
        removed_at,
        pest_disease_log
      `)
      .eq('bed_id', bedId)
      .order('removed_at', { ascending: false })
      .limit(5);

    if (plantError) {
      throw plantError;
    }

    if (!plantings || plantings.length === 0) {
      // No history; suggest all families
      return res.status(200).json({
        current_family: 'none',
        last_planted_date: '',
        years_since_last: 99,
        suggested_families: getAllFamiliesSuggestions(),
        forbidden_families: []
      });
    }

    // Analyze planting history
    const lastPlanting = plantings[0];
    const currentFamily = lastPlanting.plant_family || 'unknown';
    const lastPlantedDate = lastPlanting.removed_at || new Date().toISOString();
    const yearsSinceLast = Math.floor(
      (Date.now() - new Date(lastPlantedDate).getTime()) / (365 * 24 * 60 * 60 * 1000)
    );

    // Determine forbidden families (based on rules and history)
    const forbiddenFamilies = determineForbiddenFamilies(
      currentFamily,
      plantings,
      ROTATION_RULES
    );

    // Get suggested families (all families not in forbidden list)
    const suggestedFamilies = getSuggestedFamilies(
      currentFamily,
      forbiddenFamilies,
      ROTATION_RULES,
      lastPlanting.pest_disease_log as any
    );

    // Suggest cover crop if appropriate (6+ weeks gap)
    const coverCropSuggestion = getCoverCropSuggestion(
      currentFamily,
      lastPlanting.removed_at
    );

    return res.status(200).json({
      current_family: currentFamily,
      last_planted_date: lastPlantedDate,
      years_since_last: yearsSinceLast,
      suggested_families: suggestedFamilies,
      forbidden_families: forbiddenFamilies,
      cover_crop_suggestion: coverCropSuggestion
    });
  } catch (error) {
    console.error('Rotation suggestion error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper functions
function determineForbiddenFamilies(
  currentFamily: string,
  plantings: any[],
  rules: typeof ROTATION_RULES
): string[] {
  const forbidden: Set<string> = new Set();

  // Rule 1: Can't repeat family within avoid_years
  if (currentFamily in rules && plantings.length > 0) {
    const lastRemoved = new Date(plantings[0].removed_at);
    const yearsSince = (Date.now() - lastRemoved.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const avoidYears = rules[currentFamily as keyof typeof rules]?.avoid_years || 1;

    if (yearsSince < avoidYears) {
      forbidden.add(currentFamily);
    }
  }

  // Rule 2: Solanaceae specific (tomato → potato, etc.)
  if (currentFamily === 'Solanaceae') {
    // ANY Solanaceae in last 5 years is risky
    forbidden.add('Solanaceae');
  }

  // Rule 3: Brassica specific
  if (currentFamily === 'Brassicaceae') {
    // Check disease history
    const hasDiseaseHistory = plantings.some(
      p => p.pest_disease_log?.diseases?.includes('clubroot')
    );
    if (hasDiseaseHistory) {
      forbidden.add('Brassicaceae'); // Strict: don't repeat if clubroot present
    } else if (plantings.length > 0 && plantings[0].removed_at) {
      const yearsSince = (Date.now() - new Date(plantings[0].removed_at).getTime()) / (365 * 24 * 60 * 60 * 1000);
      if (yearsSince < 3) {
        forbidden.add('Brassicaceae');
      }
    }
  }

  return Array.from(forbidden);
}

function getSuggestedFamilies(
  currentFamily: string,
  forbiddenFamilies: string[],
  rules: typeof ROTATION_RULES,
  diseaseLog?: any
): RotationSuggestion['suggested_families'] {
  const allFamilies = Object.keys(rules);
  const suggested: RotationSuggestion['suggested_families'] = [];

  // Priority ranking:
  // 1. Legumes after heavy feeders (nitrogen benefit)
  // 2. Anything not forbidden
  // 3. Light feeders if history unclear

  const heavyFeeders = ['Brassicaceae', 'Solanaceae', 'Cucurbitaceae'];
  const nitrogenFixers = ['Fabaceae'];
  const lightFeeders = ['Alliaceae', 'Apiaceae', 'Asteraceae', 'Amaranthaceae'];

  // If last was heavy feeder, boost legume score
  if (heavyFeeders.includes(currentFamily) && !forbiddenFamilies.includes('Fabaceae')) {
    suggested.push({
      family: 'Fabaceae',
      compatibility_score: 10,
      reason: 'Legumes restore nitrogen after heavy feeders. Plant peas (spring) or beans (summer).',
      is_nitrogen_fixer: true
    });
  }

  // Add other allowed families
  for (const family of allFamilies) {
    if (forbiddenFamilies.includes(family) || family === currentFamily) continue;
    if (suggested.some(s => s.family === family)) continue; // Already suggested

    const rule = rules[family as keyof typeof rules];
    const score = lightFeeders.includes(family) ? 7 : 8;

    suggested.push({
      family,
      compatibility_score: score,
      reason: `Good rotation choice. Plant ${family.toLowerCase()} varieties.`,
      is_nitrogen_fixer: rule?.nitrogen_fixer || false,
      warning: rule?.warning
    });
  }

  return suggested.slice(0, 5); // Return top 5
}

function getAllFamiliesSuggestions(): RotationSuggestion['suggested_families'] {
  return [
    { family: 'Fabaceae', compatibility_score: 10, reason: 'Start with legumes to build soil nitrogen.', is_nitrogen_fixer: true },
    { family: 'Brassicaceae', compatibility_score: 9, reason: 'Cabbage family—classic spring/autumn crop.', is_nitrogen_fixer: false },
    { family: 'Solanaceae', compatibility_score: 8, reason: 'Tomatoes, peppers—summer favorites.', is_nitrogen_fixer: false },
    { family: 'Apiaceae', compatibility_score: 8, reason: 'Carrots, parsnips—deep-rooting, soil-building.', is_nitrogen_fixer: false },
    { family: 'Cucurbitaceae', compatibility_score: 8, reason: 'Courgettes, squash—summer sprawlers.', is_nitrogen_fixer: false }
  ];
}

function getCoverCropSuggestion(
  lastFamily: string,
  lastRemovedDate: string | null
): RotationSuggestion['cover_crop_suggestion'] | undefined {
  if (!lastRemovedDate) return undefined;

  const removed = new Date(lastRemovedDate);
  const daysGap = (Date.now() - removed.getTime()) / (24 * 60 * 60 * 1000);

  // Only suggest if 6+ weeks gap available
  if (daysGap < 42) return undefined;

  // Determine season and suggest appropriate crop
  const month = removed.getMonth();
  if (month >= 3 && month <= 8) {
    // Summer gap—suggest buckwheat (fast, warm-season)
    return {
      name: 'Buckwheat',
      family: 'Polygonaceae',
      reason: 'Fast-growing (8 weeks), attracts pollinators, mobilizes phosphorus.',
      plant_date: new Date(removed.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terminate_date: new Date(removed.getTime() + (14 + 56) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  } else {
    // Winter gap—suggest hairy vetch (nitrogen-fixing, hardy)
    return {
      name: 'Hairy Vetch',
      family: 'Fabaceae',
      reason: 'Winter-hardy, nitrogen-fixing (100+ kg/ha), breaks soil compaction.',
      plant_date: new Date(removed.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      terminate_date: new Date(removed.getTime() + (14 + 180) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  }
}
```

---

### 2.2 Bed Planting History Endpoint

**Endpoint:** `GET /api/grow/beds/[bedId]/planting-history`

**Purpose:** Return timeline of plantings for bed display

**Implementation (brief):**

```typescript
// pages/api/grow/beds/[bedId]/planting-history.ts

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { bedId } = req.query as { bedId: string };
  const userId = req.user?.id;

  const supabase = getSupabaseServerClient(req, res);

  const { data: plantings, error } = await supabase
    .from('grow_bed_plantings')
    .select(`
      id,
      plant_family,
      planted_at,
      removed_at,
      is_cover_crop,
      pest_disease_log,
      grow_user_plants(name, species_slug)
    `)
    .eq('bed_id', bedId)
    .order('planted_at', { ascending: false })
    .limit(10);

  return res.status(200).json({
    plantings: plantings?.map(p => ({
      id: p.id,
      family: p.plant_family,
      crop_name: p.grow_user_plants?.name,
      is_cover_crop: p.is_cover_crop,
      planted_at: p.planted_at,
      removed_at: p.removed_at,
      disease_history: p.pest_disease_log?.diseases || [],
      pest_history: p.pest_disease_log?.pests || []
    }))
  });
}
```

---

## Phase 1: Frontend Components

### 3.1 Bed Planting History Card

**Component:** `components/grow/BedRotationHistory.tsx`

```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface BedRotationHistoryProps {
  bedId: string;
}

export function BedRotationHistory({ bedId }: BedRotationHistoryProps) {
  const { data: history } = useQuery({
    queryKey: ['bed-history', bedId],
    queryFn: async () => {
      const res = await fetch(`/api/grow/beds/${bedId}/planting-history`);
      return res.json();
    }
  });

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h3 className="card-title text-sm">Planting History</h3>

        <div className="space-y-2 text-xs">
          {history?.plantings?.map((planting: any) => (
            <div key={planting.id} className="flex justify-between items-start border-l-2 border-primary pl-2">
              <div>
                <p className="font-semibold">{planting.crop_name}</p>
                <p className="text-gray-600">{planting.family}</p>
                {planting.disease_history?.length > 0 && (
                  <p className="text-warning">⚠️ {planting.disease_history.join(', ')}</p>
                )}
              </div>
              <p className="text-gray-500">
                {planting.planted_at ? new Date(planting.planted_at).getFullYear() : '?'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 3.2 Rotation Suggestion Widget

**Component:** `components/grow/RotationSuggestion.tsx`

```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface RotationSuggestionProps {
  bedId: string;
  onSelectFamily?: (family: string) => void;
}

export function RotationSuggestion({ bedId, onSelectFamily }: RotationSuggestionProps) {
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['rotation-suggestion', bedId],
    queryFn: async () => {
      const res = await fetch(`/api/grow/beds/${bedId}/rotation-suggestions`);
      return res.json();
    }
  });

  if (isLoading) return <div className="skeleton h-32 w-full" />;

  return (
    <div className="card bg-gradient-to-br from-success to-success-dark text-success-content shadow-lg">
      <div className="card-body">
        <h3 className="card-title text-sm">
          {suggestions?.forbidden_families?.length > 0
            ? '⚠️ What NOT to Plant'
            : '✓ Rotation Suggestions'}
        </h3>

        {/* Show forbidden families warning */}
        {suggestions?.forbidden_families?.length > 0 && (
          <div className="alert alert-warning text-sm mb-4">
            <span>Avoid: {suggestions.forbidden_families.join(', ')}</span>
            <p className="text-xs mt-1">
              {suggestions.current_family} was last planted {suggestions.years_since_last} year(s) ago.
            </p>
          </div>
        )}

        {/* Show recommended families */}
        <div className="space-y-2">
          {suggestions?.suggested_families?.map((fam: any) => (
            <button
              key={fam.family}
              onClick={() => onSelectFamily?.(fam.family)}
              className="btn btn-sm btn-outline w-full justify-start text-left"
            >
              <div className="flex-1">
                <p className="font-semibold">{fam.family}</p>
                <p className="text-xs opacity-75">{fam.reason}</p>
                {fam.is_nitrogen_fixer && (
                  <p className="text-xs text-success">✓ Nitrogen fixer</p>
                )}
              </div>
              <span className="badge badge-lg">{fam.compatibility_score}/10</span>
            </button>
          ))}
        </div>

        {/* Cover crop suggestion */}
        {suggestions?.cover_crop_suggestion && (
          <div className="alert alert-info text-sm mt-4">
            <span>💡 Consider {suggestions.cover_crop_suggestion.name} as a cover crop</span>
            <p className="text-xs">{suggestions.cover_crop_suggestion.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 1: Database Seed/Migration

### 4.1 Seed Plant Species with Families

Create migration to populate `grow_plant_species`:

```sql
-- 20260310_seed_plant_families.sql
insert into public.grow_plant_species (slug, common_name, botanical_name, plant_family, crop_category, root_depth_cm) values
-- Brassicaceae (Heavy feeders)
('tomato', 'Tomato', 'Solanum lycopersicum', 'Solanaceae', 'heavy_feeder', 45),
('pepper', 'Pepper', 'Capsicum annuum', 'Solanaceae', 'heavy_feeder', 40),
('potato', 'Potato', 'Solanum tuberosum', 'Solanaceae', 'heavy_feeder', 30),

-- Brassicaceae (Heavy feeders)
('cabbage', 'Cabbage', 'Brassica oleracea', 'Brassicaceae', 'heavy_feeder', 35),
('broccoli', 'Broccoli', 'Brassica oleracea italica', 'Brassicaceae', 'heavy_feeder', 40),
('kale', 'Kale', 'Brassica oleracea kale', 'Brassicaceae', 'heavy_feeder', 35),
('cauliflower', 'Cauliflower', 'Brassica oleracea botrytis', 'Brassicaceae', 'heavy_feeder', 40),
('brussels_sprouts', 'Brussels Sprouts', 'Brassica oleracea gemmifera', 'Brassicaceae', 'heavy_feeder', 50),
('radish', 'Radish', 'Raphanus sativus', 'Brassicaceae', 'light_feeder', 25),

-- Fabaceae (Nitrogen fixers, light feeders)
('pea', 'Pea', 'Pisum sativum', 'Fabaceae', 'nitrogen_fixer', 50),
('broad_bean', 'Broad Bean', 'Vicia faba', 'Fabaceae', 'nitrogen_fixer', 60),
('french_bean', 'French Bean', 'Phaseolus vulgaris', 'Fabaceae', 'nitrogen_fixer', 40),
('runner_bean', 'Runner Bean', 'Phaseolus coccineus', 'Fabaceae', 'nitrogen_fixer', 80),

-- Alliaceae (Light feeders)
('onion', 'Onion', 'Allium cepa', 'Alliaceae', 'light_feeder', 30),
('garlic', 'Garlic', 'Allium sativum', 'Alliaceae', 'light_feeder', 25),
('leek', 'Leek', 'Allium porrum', 'Alliaceae', 'light_feeder', 40),

-- Apiaceae (Light feeders, deep root)
('carrot', 'Carrot', 'Daucus carota subsp. sativus', 'Apiaceae', 'light_feeder', 60),
('parsnip', 'Parsnip', 'Pastinaca sativa', 'Apiaceae', 'light_feeder', 90),
('parsley', 'Parsley', 'Petroselinum crispum', 'Apiaceae', 'light_feeder', 25),

-- Cucurbitaceae (Heavy feeders)
('courgette', 'Courgette', 'Cucurbita pepo', 'Cucurbitaceae', 'heavy_feeder', 70),
('pumpkin', 'Pumpkin', 'Cucurbita moschata', 'Cucurbitaceae', 'heavy_feeder', 80),
('cucumber', 'Cucumber', 'Cucumis sativus', 'Cucurbitaceae', 'heavy_feeder', 60),

-- Amaranthaceae (Light feeders)
('spinach', 'Spinach', 'Spinacia oleracea', 'Amaranthaceae', 'light_feeder', 25),
('chard', 'Chard', 'Beta vulgaris subsp. cicla', 'Amaranthaceae', 'light_feeder', 40),
('beetroot', 'Beetroot', 'Beta vulgaris', 'Amaranthaceae', 'light_feeder', 45),

-- Asteraceae (Light feeders, quick crops)
('lettuce', 'Lettuce', 'Lactuca sativa', 'Asteraceae', 'light_feeder', 20),
('endive', 'Endive', 'Cichorium endivia', 'Asteraceae', 'light_feeder', 25),

-- Cover crops
('hairy_vetch', 'Hairy Vetch', 'Vicia villosa', 'Fabaceae', 'nitrogen_fixer', 80),
('clover', 'Clover', 'Trifolium repens', 'Fabaceae', 'nitrogen_fixer', 40),
('buckwheat', 'Buckwheat', 'Fagopyrum esculentum', 'Polygonaceae', 'neutral', 30)
on conflict (slug) do nothing;
```

---

## Phase 1: Testing

### 5.1 Test Plan

**Unit Tests:**

1. `rotation-rules.test.ts` - Test rule engine logic
   - Solanaceae → Solanaceae should be forbidden
   - Brassica with clubroot history should be forbidden longer
   - Legume → Brassica should boost compatibility score

2. `bed-planting-history.test.ts` - Test history query
   - Return plantings in correct order
   - Include disease log and family data

**API Tests:**

1. `GET /api/grow/beds/[bedId]/rotation-suggestions`
   - Empty bed history returns all families
   - After Solanaceae, Solanaceae forbidden
   - Legume suggestion after heavy feeder is top-scored
   - Cover crop suggestion returns correct season timing

2. `GET /api/grow/beds/[bedId]/planting-history`
   - Returns plantings in reverse chronological order
   - Includes family, pest, disease data

**Integration Tests:**

1. User plants tomato (Solanaceae) in bed
2. Remove tomato, get rotation suggestions
3. Verify Solanaceae is forbidden
4. Verify Fabaceae (legume) is top suggestion
5. Verify cover crop suggestion is appropriate

---

## Phase 2: Rotation Plans (Future)

### 6.1 Rotation Plan Workflow

**User sets up rotation scheme:**

1. User selects scheme: 3-year, 4-year, 2-bed simple, no rotation
2. If multi-bed: Assign beds to positions in rotation
3. System generates 3-year plan showing which family goes in which bed each year
4. Display as visual timeline or table

**Implementation (Phase 2):**

- `GET /api/grow/rotation-plans/[userId]` - Fetch user's rotation scheme
- `POST /api/grow/rotation-plans` - Create rotation plan
- `PUT /api/grow/rotation-plans/[planId]` - Update plan
- UI: Visual rotation timeline (3×3 grid for 3-year + 3-bed garden)

---

## Phase 3: Disease Tracking (Future)

### 7.1 Update `pest_disease_log`

When user harvests a crop, allow optional disease/pest logging:

```typescript
// UI modal for end-of-season harvest logging
interface HarvestLog {
  harvest_date: date;
  yield_kg?: number;
  disease_observed?: string[]; // ['clubroot', 'late_blight']
  pests_observed?: string[];   // ['cabbage_white', 'slug']
  severity?: 'none' | 'minor' | 'moderate' | 'severe';
  notes?: string;
}

// Save to grow_bed_plantings.pest_disease_log JSONB
```

**Impact on recommendations:**

- If clubroot ever observed in Brassica bed: forbid Brassica for 8+ years (not just 3)
- If late blight observed: increase Solanaceae avoidance to 6+ years
- Track most problematic combinations per user

---

## Phase 1: Deployment Checklist

- [ ] Create `grow_plant_species` table with seed data
- [ ] Add fields to `grow_bed_plantings` (plant_family, pest_disease_log, is_cover_crop, etc.)
- [ ] Implement `/api/grow/beds/[bedId]/rotation-suggestions` endpoint
- [ ] Implement `/api/grow/beds/[bedId]/planting-history` endpoint
- [ ] Create `BedRotationHistory` component
- [ ] Create `RotationSuggestion` component
- [ ] Integrate components into bed detail view
- [ ] Test all endpoints and components
- [ ] Update Grow Daisy documentation with rotation guidance link
- [ ] Deploy to Vercel

---

## Configuration & Environment

**No new environment variables required** for Phase 1.

---

## Rollback Plan

If rotation features cause issues:

1. Hide rotation components (via feature flag)
2. Queries will still work (rotation data is optional)
3. No schema breaking changes
4. Can revert to previous commit

---

## Notes for Developers

1. **Species data:** If `grow_plant_species` already exists elsewhere, reuse it. Don't duplicate.

2. **Atlantic climate hardcoding:** The rules (especially 5-year Solanaceae avoidance) are hardcoded. In Phase 4, make these configurable by user region.

3. **Denormalization:** Plant family is denormalized into `grow_bed_plantings` for query speed. Update it when planting via trigger or manual update.

4. **RLS policies:** All tables inherit user-based RLS. Species table is public (read-only).

5. **Cover crop timing:** Assumes 6+ weeks gap between plantings. May be too aggressive in short seasons; adjust in Phase 3.

---

## References

- `CROP_ROTATION_EXPERT_GUIDE.md` - Horticultural rationale and rules
- `grow_garden_beds` table schema - Existing bed structure
- `grow_bed_plantings` table schema - Existing planting history
- `grow_user_plants` table - Plant instances owned by users

