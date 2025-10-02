# Favourites System - MVP Implementation Plan

## 🎯 Your Decisions (Locked In)

✅ **Notifications:** Post-MVP (focus on login + iOS first)  
✅ **Species:** Use existing 30+ species, add user-request feature later  
✅ **Page Replacement:** After Supabase integration is complete  
✅ **Images:** Migrate to Supabase Storage for scalability  

---

## 📋 Implementation Roadmap (4-5 hours)

### Phase 1: Database Setup (30 minutes)

**Task:** Create `user_favourites` table in Supabase

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Run this migration:

```sql
-- Create user_favourites table
CREATE TABLE user_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, species_id)
);

-- Create index for fast lookups
CREATE INDEX idx_user_favourites_user_id ON user_favourites(user_id);

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

3. Test with sample data:
```sql
-- Insert test favourite (replace with your user ID)
INSERT INTO user_favourites (user_id, species_id) 
VALUES ('your-user-id-here', 'cod');

-- Query to verify
SELECT * FROM user_favourites WHERE user_id = 'your-user-id-here';
```

**Validation:** Should see your test favourite row returned

---

### Phase 2: Authentication Integration (1 hour)

**Task:** Secure API routes with Supabase auth

**Step 1: Install dependencies**
```bash
npm install @supabase/auth-helpers-nextjs @supabase/supabase-js
```

**Step 2: Update `/pages/api/findr/favourites.ts`**

Find this section (lines ~15-20):
```typescript
// TODO: Get from auth session
const userId = req.query.userId as string;
if (!userId) {
  return res.status(400).json({ error: 'userId required' });
}
```

Replace with:
```typescript
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

// Inside handler function, before switch statement:
const supabase = createServerSupabaseClient({ req, res });
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  return res.status(401).json({ error: 'Unauthorized' });
}

const userId = session.user.id;
```

**Step 3: Update queries** (already use `userId`, just verify RLS is enforced)

**Step 4: Update frontend API calls in `pages/findr/favourites-modern.tsx`**

Find these lines (~50-80):
```typescript
// TODO: Replace with real API calls
const response = await fetch(`/api/findr/favourites?userId=${userId}`);
```

Replace with:
```typescript
// No need to pass userId - comes from session
const response = await fetch('/api/findr/favourites');
```

Do the same for POST and DELETE calls.

**Validation:** Test authenticated requests in browser dev tools

---

### Phase 3: Confidence Scoring Engine (1-2 hours)

**Task:** Calculate real-time species confidence scores

**Step 1: Create `/lib/findr/confidenceScoring.ts`**

```typescript
import type { WeatherConditions } from '@/types/favourites';

interface SpeciesPreferences {
  optimalTempRange: [number, number]; // [min, max] in °C
  preferredTideState: 'high' | 'low' | 'rising' | 'falling' | 'any';
  moonSensitivity: 'high' | 'medium' | 'low';
  seasonalPeak: number[]; // Months (1-12)
  weatherTolerance: 'high' | 'medium' | 'low';
}

// Species preference database (can move to Supabase later)
const SPECIES_PREFERENCES: Record<string, SpeciesPreferences> = {
  cod: {
    optimalTempRange: [8, 15],
    preferredTideState: 'rising',
    moonSensitivity: 'medium',
    seasonalPeak: [11, 12, 1, 2, 3], // Nov-Mar
    weatherTolerance: 'high'
  },
  bass: {
    optimalTempRange: [12, 18],
    preferredTideState: 'high',
    moonSensitivity: 'high',
    seasonalPeak: [6, 7, 8, 9], // Jun-Sep
    weatherTolerance: 'medium'
  },
  // Add your other 30+ species here
};

/**
 * Calculate confidence score for a species given current conditions
 * Returns score 0-100
 */
export function calculateConfidenceScore(
  speciesId: string,
  conditions: WeatherConditions
): number {
  const prefs = SPECIES_PREFERENCES[speciesId];
  if (!prefs) {
    console.warn(`No preferences for species: ${speciesId}`);
    return 50; // Default neutral score
  }

  let score = 0;

  // 1. Temperature (30 points)
  const temp = conditions.waterTemp ?? conditions.airTemp;
  if (temp >= prefs.optimalTempRange[0] && temp <= prefs.optimalTempRange[1]) {
    score += 30;
  } else {
    // Partial credit for being close
    const distance = Math.min(
      Math.abs(temp - prefs.optimalTempRange[0]),
      Math.abs(temp - prefs.optimalTempRange[1])
    );
    score += Math.max(0, 30 - distance * 3);
  }

  // 2. Tide (25 points)
  if (prefs.preferredTideState === 'any' || conditions.tideState === prefs.preferredTideState) {
    score += 25;
  } else if (
    (prefs.preferredTideState === 'rising' && conditions.tideState === 'high') ||
    (prefs.preferredTideState === 'falling' && conditions.tideState === 'low')
  ) {
    score += 15; // Close enough
  }

  // 3. Season (20 points)
  const currentMonth = new Date().getMonth() + 1;
  if (prefs.seasonalPeak.includes(currentMonth)) {
    score += 20;
  } else {
    // Partial credit for adjacent months
    const adjacentMonths = prefs.seasonalPeak.map(m => [m - 1, m + 1]).flat();
    if (adjacentMonths.includes(currentMonth)) {
      score += 10;
    }
  }

  // 4. Moon (15 points)
  const moonScore = calculateMoonScore(conditions.moonPhase, prefs.moonSensitivity);
  score += moonScore;

  // 5. Weather (10 points)
  const weatherScore = calculateWeatherScore(conditions, prefs.weatherTolerance);
  score += weatherScore;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateMoonScore(moonPhase: string, sensitivity: string): number {
  const fullMoonPhases = ['full', 'waxing_gibbous', 'waning_gibbous'];
  const isFullMoon = fullMoonPhases.some(phase => moonPhase.includes(phase));

  if (sensitivity === 'high' && isFullMoon) return 15;
  if (sensitivity === 'medium' && isFullMoon) return 10;
  if (sensitivity === 'low') return 7; // Less affected
  return 5;
}

function calculateWeatherScore(conditions: WeatherConditions, tolerance: string): number {
  const isBadWeather = conditions.windSpeed > 15 || conditions.waveHeight > 1.5;

  if (!isBadWeather) return 10;
  if (tolerance === 'high') return 8;
  if (tolerance === 'medium') return 5;
  return 2; // Low tolerance
}

/**
 * Calculate 7-day forecast scores
 */
export async function calculate7DayForecast(
  speciesId: string,
  location: string
): Promise<number[]> {
  // TODO: Fetch 7-day weather forecast from your weather API
  // For now, return mock data with slight variation
  const currentScore = 75; // Would come from calculateConfidenceScore
  return Array.from({ length: 7 }, (_, i) => 
    Math.max(0, Math.min(100, currentScore + (Math.random() - 0.5) * 20))
  );
}
```

**Step 2: Integrate with API route**

Update `/pages/api/findr/favourites.ts` GET handler:

```typescript
import { calculateConfidenceScore } from '@/lib/findr/confidenceScoring';

// In GET handler, after fetching favourites:
const favouritesWithScores = await Promise.all(
  favourites.map(async (fav) => {
    // Fetch current conditions for user's location
    const conditionsRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/findr/conditions?location=${userLocation}`
    );
    const conditions = await conditionsRes.json();

    // Calculate confidence score
    const confidence = calculateConfidenceScore(fav.species_id, conditions);

    return {
      ...fav,
      confidence,
      conditions
    };
  })
);
```

**Validation:** Check API response includes real confidence scores

---

### Phase 4: Supabase Storage Setup (30 minutes)

**Task:** Create storage bucket for species images

**Step 1: Create bucket in Supabase**
1. Open Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `species-images`
4. Public: ✅ Yes
5. Click "Create bucket"

**Step 2: Set up storage policy**
```sql
-- In Supabase SQL Editor
-- Allow public read access to species images
CREATE POLICY "Public read access to species images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'species-images');

-- Allow authenticated users to upload (for admin)
CREATE POLICY "Authenticated users can upload species images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'species-images' 
    AND auth.role() = 'authenticated'
  );
```

**Step 3: Get bucket URL**
Your images will be at:
```
https://[your-project].supabase.co/storage/v1/object/public/species-images/[filename]
```

**Validation:** Upload a test image via Supabase dashboard, verify public access

---

### Phase 5: Image Migration (2-3 hours)

**Task:** Move species images from /public to Supabase Storage

**Step 1: Create upload script**

Create `/scripts/migrate-species-images.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin upload
);

async function uploadImage(filePath: string, speciesId: string) {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = `${speciesId}.jpg`; // Normalize naming

  const { data, error } = await supabase.storage
    .from('species-images')
    .upload(fileName, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.error(`Failed to upload ${speciesId}:`, error);
    return null;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('species-images')
    .getPublicUrl(fileName);

  console.log(`✅ Uploaded ${speciesId}: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

async function migrateAllImages() {
  const imagesDir = path.join(process.cwd(), 'public', 'images', 'species');
  const files = fs.readdirSync(imagesDir);

  const urlMap: Record<string, string> = {};

  for (const file of files) {
    const speciesId = path.basename(file, path.extname(file));
    const filePath = path.join(imagesDir, file);
    const url = await uploadImage(filePath, speciesId);
    if (url) {
      urlMap[speciesId] = url;
    }
  }

  // Write updated map to file
  const outputPath = path.join(process.cwd(), 'data', 'SPECIES_IMAGE_MAP_SUPABASE.json');
  fs.writeFileSync(outputPath, JSON.stringify(urlMap, null, 2));
  console.log(`\n✅ Wrote updated image map to ${outputPath}`);
}

migrateAllImages().catch(console.error);
```

**Step 2: Add service role key to .env.local**
```bash
# Get from Supabase Dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Step 3: Run migration**
```bash
npx ts-node scripts/migrate-species-images.ts
```

**Step 4: Update SPECIES_IMAGE_MAP**

Update `data/speciesImageMap.ts` to use Supabase URLs:
```typescript
export const SPECIES_IMAGE_MAP: Record<string, string> = {
  cod: 'https://[your-project].supabase.co/storage/v1/object/public/species-images/cod.jpg',
  bass: 'https://[your-project].supabase.co/storage/v1/object/public/species-images/bass.jpg',
  // ... rest of your 30+ species
};
```

Or load from JSON:
```typescript
import imageMapJson from './SPECIES_IMAGE_MAP_SUPABASE.json';
export const SPECIES_IMAGE_MAP = imageMapJson;
```

**Validation:** Check species images load from Supabase in browser

---

### Phase 6: Testing (30 minutes)

**Test Checklist:**

- [ ] Create authenticated user account
- [ ] Add favourite species via UI
- [ ] Verify species saved to database
- [ ] Check confidence score is calculated (not mock)
- [ ] Verify images load from Supabase Storage
- [ ] Test removing favourite
- [ ] Check RLS policies (try accessing another user's favourites)
- [ ] Test on mobile viewport
- [ ] Verify dashboard grouping (Active/Good/Waiting)
- [ ] Test 7-day forecast display

**Common Issues:**

1. **401 Unauthorized:** Check auth session is valid
2. **Images 404:** Verify bucket is public and URLs are correct
3. **Confidence score = 50:** Species not in SPECIES_PREFERENCES map
4. **RLS error:** User ID mismatch between session and query

---

### Phase 7: Page Replacement (15 minutes)

**Task:** Activate new favourites page

**Step 1: Backup old page**
```bash
mv pages/findr/favourites.tsx pages/findr/favourites-legacy.tsx
```

**Step 2: Activate new page**
```bash
mv pages/findr/favourites-modern.tsx pages/findr/favourites.tsx
```

**Step 3: Update navigation links** (if any reference `/findr/favourites-modern`)

**Step 4: Test in production**
```bash
npm run build
npm run start
```

Visit: `http://localhost:3000/findr/favourites`

**Validation:** New page loads at main favourites URL

---

## 🎯 Post-MVP Features (Future)

### 1. User-Requested Species (Post-Login)
- Add "Request a Species" button in UI
- Create `species_requests` table
- Admin approval workflow
- Community voting system

### 2. Notifications (Post-iOS)
- Supabase Edge Function (cron job)
- FCM for push notifications
- Email via SendGrid/SES
- SMS via Twilio (optional)

### 3. Social Features
- Share favourite species with friends
- Community "Hot Species" feed
- Species catch leaderboards

---

## 📚 Reference Files

- **This Plan:** `FAVOURITES_MVP_PLAN.md` (you are here)
- **Code Complete:** All components in `components/favourites/`
- **API Routes:** `pages/api/findr/favourites.ts` + `species/*.ts`
- **Types:** `types/favourites.ts`
- **Decisions:** `MORNING_CHECKLIST.md` (updated with your choices)

---

## 🚀 Next Steps

**Start with Phase 1 (Database Setup) above** ⬆️

Estimated timeline:
- Today: Phases 1-3 (Database + Auth + Scoring) = 2.5 hours
- Tomorrow: Phases 4-5 (Storage + Migration) = 2.5 hours
- Day 3: Phases 6-7 (Testing + Deployment) = 1 hour

**Total: 4-5 hours spread over 2-3 days**

Good luck! Let me know when you're ready to start Phase 1, or if you hit any blockers! 🎯
