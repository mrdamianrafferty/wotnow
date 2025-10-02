# Favourites System - SIMPLIFIED Integration Plan

## 🎉 Great News!

Your CSV reveals you **already have a `species` table** in Supabase with:
- Foreign key relationships to `species_frequency`
- Foreign key relationships to `user_catches`
- Foreign key relationships to `weather_predictions`
- Likely columns: `id`, `name`, `scientific_name`, etc.

This **dramatically simplifies** our implementation! No need to create a separate species_data table.

---

## 📋 Revised Implementation (2-3 hours instead of 4-5!)

### Phase 1: Create user_favourites Table (15 minutes)

**SQL Migration for Supabase:**

```sql
-- Create user_favourites linking to EXISTING species table
CREATE TABLE user_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id UUID NOT NULL REFERENCES species(id) ON DELETE CASCADE,  -- Links to YOUR existing species table!
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure user can't favourite same species twice
  UNIQUE(user_id, species_id)
);

-- Indexes for performance
CREATE INDEX idx_user_favourites_user_id ON user_favourites(user_id);
CREATE INDEX idx_user_favourites_species_id ON user_favourites(species_id);

-- Enable Row Level Security
ALTER TABLE user_favourites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own favourites"
  ON user_favourites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favourites"
  ON user_favourites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favourites"
  ON user_favourites FOR DELETE
  USING (auth.uid() = user_id);
```

**Test with sample data:**
```sql
-- 1. Get some species IDs from your existing table
SELECT id, name FROM species LIMIT 5;

-- 2. Insert test favourite (replace with YOUR user ID and species ID)
INSERT INTO user_favourites (user_id, species_id) 
VALUES (
  'your-user-id-here',  -- From auth.users
  'cod-species-id-here'  -- From species table
);

-- 3. Verify with JOIN to species table
SELECT 
  uf.id,
  uf.added_at,
  s.name as species_name,
  s.scientific_name
FROM user_favourites uf
INNER JOIN species s ON s.id = uf.species_id
WHERE uf.user_id = 'your-user-id-here';
```

---

### Phase 2: Update API Routes to Use Existing Species (30 minutes)

**Update `/pages/api/findr/favourites.ts`:**

The key difference: Instead of mocking species data, we JOIN with your **existing species table**!

```typescript
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create Supabase client with auth
  const supabase = createServerSupabaseClient({ req, res });
  
  // Get authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  switch (req.method) {
    case 'GET':
      try {
        // Join user_favourites with YOUR existing species table!
        const { data: favourites, error } = await supabase
          .from('user_favourites')
          .select(`
            id,
            added_at,
            last_checked,
            species:species_id (
              id,
              name,
              scientific_name,
              common_name
            )
          `)
          .eq('user_id', userId)
          .order('added_at', { ascending: false });

        if (error) throw error;

        // TODO: Add confidence scoring (Phase 3)
        const enrichedFavourites = favourites.map(fav => ({
          ...fav,
          confidence: 75, // Placeholder - will calculate in Phase 3
          conditions: {
            temperature: 12,
            windSpeed: 10,
            tideState: 'rising'
          }
        }));

        return res.status(200).json(enrichedFavourites);
      } catch (error) {
        console.error('Error fetching favourites:', error);
        return res.status(500).json({ error: 'Failed to fetch favourites' });
      }

    case 'POST':
      try {
        const { speciesId } = req.body;
        
        // Verify species exists in YOUR species table
        const { data: species, error: speciesError } = await supabase
          .from('species')
          .select('id, name')
          .eq('id', speciesId)
          .single();

        if (speciesError || !species) {
          return res.status(400).json({ error: 'Species not found' });
        }

        // Add to user's favourites
        const { data, error } = await supabase
          .from('user_favourites')
          .insert({ user_id: userId, species_id: speciesId })
          .select()
          .single();

        if (error) {
          // Handle duplicate (user already favourited this species)
          if (error.code === '23505') {
            return res.status(409).json({ error: 'Already favourited' });
          }
          throw error;
        }

        return res.status(201).json(data);
      } catch (error) {
        console.error('Error adding favourite:', error);
        return res.status(500).json({ error: 'Failed to add favourite' });
      }

    case 'DELETE':
      try {
        const { id } = req.query;
        
        const { error } = await supabase
          .from('user_favourites')
          .delete()
          .eq('id', id)
          .eq('user_id', userId); // Ensure user can only delete their own

        if (error) throw error;

        return res.status(204).end();
      } catch (error) {
        console.error('Error deleting favourite:', error);
        return res.status(500).json({ error: 'Failed to delete favourite' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
```

**Update `/pages/api/findr/species/regional.ts`:**

```typescript
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient({ req, res });
  
  try {
    const { region, icesRectangle } = req.query;

    // Use YOUR existing species_frequency table!
    const { data: regionalSpecies, error } = await supabase
      .from('species_frequency')
      .select(`
        frequency,
        abundance,
        species:species_id (
          id,
          name,
          scientific_name,
          common_name
        )
      `)
      .eq('rectangle_id', icesRectangle)
      .order('frequency', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Format for frontend
    const formatted = regionalSpecies.map(item => ({
      ...item.species,
      frequency: item.frequency,
      abundance: item.abundance
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching regional species:', error);
    return res.status(500).json({ error: 'Failed to fetch species' });
  }
}
```

---

### Phase 3: Confidence Scoring with Existing Data (1 hour)

**Create `/lib/findr/confidenceScoring.ts`:**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Calculate confidence score using YOUR existing data:
 * - species_frequency (how common is species in this area)
 * - weather_predictions (optimal conditions for species)
 * - Current conditions from your conditions API
 */
export async function calculateConfidenceScore(
  speciesId: string,
  location: { lat: number; lng: number; icesRectangle: string }
): Promise<number> {
  let score = 50; // Start at neutral

  // 1. Check species frequency in this ICES rectangle (30 points)
  const { data: frequency } = await supabase
    .from('species_frequency')
    .select('frequency, abundance')
    .eq('species_id', speciesId)
    .eq('rectangle_id', location.icesRectangle)
    .single();

  if (frequency) {
    // Higher frequency = higher score
    // Assuming frequency is 0-100 scale
    score += (frequency.frequency / 100) * 30;
  }

  // 2. Check weather predictions for this species (40 points)
  const { data: predictions } = await supabase
    .from('weather_predictions')
    .select('*')
    .eq('species_id', speciesId)
    .limit(1)
    .single();

  if (predictions) {
    // Fetch current conditions from your existing conditions API
    const conditionsRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/findr/conditions?lat=${location.lat}&lng=${location.lng}`
    );
    const conditions = await conditionsRes.json();

    // Compare current conditions to optimal (from weather_predictions table)
    const tempScore = calculateTemperatureScore(
      conditions.waterTemp ?? conditions.airTemp,
      predictions.optimal_temp_min,
      predictions.optimal_temp_max
    );
    const tideScore = calculateTideScore(
      conditions.tideState,
      predictions.preferred_tide
    );
    const moonScore = calculateMoonScore(
      conditions.moonPhase,
      predictions.moon_sensitivity
    );

    score += tempScore * 0.15; // 15 points
    score += tideScore * 0.15; // 15 points
    score += moonScore * 0.10; // 10 points
  }

  // 3. Seasonal factor (20 points)
  const currentMonth = new Date().getMonth() + 1;
  // You might have a seasonal_peak column or similar in species table
  // For now, use simple heuristic
  score += 10; // Placeholder

  // 4. Recent catch success (10 points)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count } = await supabase
    .from('user_catches')
    .select('*', { count: 'exact', head: true })
    .eq('species_id', speciesId)
    .gte('caught_at', thirtyDaysAgo.toISOString());

  if (count && count > 0) {
    score += Math.min(count * 2, 10); // Max 10 points
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateTemperatureScore(
  current: number,
  min: number,
  max: number
): number {
  if (current >= min && current <= max) return 100;
  const distance = Math.min(
    Math.abs(current - min),
    Math.abs(current - max)
  );
  return Math.max(0, 100 - distance * 10);
}

function calculateTideScore(
  current: string,
  preferred: string
): number {
  if (current === preferred) return 100;
  // Partial credit for related states
  if (
    (preferred === 'rising' && current === 'high') ||
    (preferred === 'falling' && current === 'low')
  ) {
    return 60;
  }
  return 30;
}

function calculateMoonScore(
  moonPhase: string,
  sensitivity: 'high' | 'medium' | 'low'
): number {
  const isFullMoon = moonPhase.includes('full') || moonPhase.includes('gibbous');
  
  if (sensitivity === 'high' && isFullMoon) return 100;
  if (sensitivity === 'medium' && isFullMoon) return 70;
  if (sensitivity === 'low') return 50; // Less affected by moon
  return 30;
}
```

**Note:** You'll need to check what columns actually exist in your `weather_predictions` and `species` tables. Adapt column names accordingly!

---

### Phase 4: Image Migration (1-2 hours)

This stays the same as the original plan - upload to Supabase Storage.

**Quick script:**
```typescript
// scripts/migrate-to-supabase-storage.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateImages() {
  const imagesDir = path.join(process.cwd(), 'public', 'images', 'fish');
  const files = fs.readdirSync(imagesDir);

  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    
    const { data, error } = await supabase.storage
      .from('species-images')
      .upload(file, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error(`❌ Failed: ${file}`, error);
    } else {
      console.log(`✅ Uploaded: ${file}`);
    }
  }
}

migrateImages();
```

---

## 🎯 What This Means For You

### ✅ **Advantages of Using Existing Species Table:**

1. **No data migration needed** - Your 30+ species already exist in Supabase
2. **Leverage existing data** - `species_frequency`, `weather_predictions`, `user_catches` all available
3. **Consistent data model** - Everything references the same `species.id`
4. **Faster implementation** - 2-3 hours instead of 4-5 hours
5. **Real confidence scores** - Can use actual frequency and prediction data immediately

### 📊 **Key Relationships:**

```
user_favourites
├── user_id → auth.users
└── species_id → species.id
                 ├── Used by: species_frequency
                 ├── Used by: weather_predictions  
                 └── Used by: user_catches
```

### 🚀 **Next Steps:**

1. **Check your species table columns**:
   ```sql
   -- Run in Supabase SQL editor
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'species';
   ```

2. **Check weather_predictions columns**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'weather_predictions';
   ```

3. **Run Phase 1 SQL** (create user_favourites table)

4. **Install auth helpers** and update API routes (Phase 2)

5. **Implement confidence scoring** with your actual data (Phase 3)

---

## ❓ Questions for You

1. **What columns exist in your `species` table?**
   - id, name, scientific_name, common_name, ...?

2. **What columns exist in `weather_predictions`?**
   - optimal_temp_min, optimal_temp_max, preferred_tide, ...?

3. **Do you already have images for your species?**
   - Are they in /public/images/ or elsewhere?

4. **What's your `species.id` format?**
   - UUID? Integer? Text (e.g., 'cod', 'bass')?

Share these answers and I'll customize the code examples to match your exact schema! 🎯
