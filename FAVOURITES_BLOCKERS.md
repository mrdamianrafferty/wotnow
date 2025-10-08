# Favourites System - Implementation Blockers & Decisions Needed

**Created:** $(date)  
**Status:** 🟡 Core functionality implemented, production features pending  
**Review Required:** Database schema, authentication, external integrations

---

## 🎉 What's Implemented

### ✅ Complete Components
- **TypeScript Types** (`types/favourites.ts`): Full type system for Species, TrackedSpecies, notifications, etc.
- **UI Components**: 
  - ConfidenceRing, LoadingSpinner, MiniCalendar (shared utilities)
  - SpeciesCard, SpeciesCarousel (core reusables)
  - StatusCards (ActiveSpeciesCard, GoodSpeciesCard, WaitingSpeciesCard)
  - SpeciesSelectionView (empty state with smart suggestions)
  - FavouritesDashboard (main tracking view)
  - NotificationSetupModal (preference configuration)
  
### ✅ API Routes (Stub Implementations)
- `/api/findr/favourites` - GET/POST/DELETE for user favourites
- `/api/findr/species/regional` - Species by ICES region (using catch history)
- `/api/findr/species/suggestions` - Smart suggestions (partial implementation)

---

## 🔴 Critical Blockers - Requires Decisions

### 1. Database Schema

#### user_favourites Table
**Status:** ⚠️ Assumed structure, needs verification/creation

```sql
CREATE TABLE IF NOT EXISTS user_favourites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id TEXT NOT NULL,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  alert_threshold INTEGER DEFAULT 75, -- 0-100
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, species_id)
);

-- Row Level Security
ALTER TABLE user_favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favourites"
  ON user_favourites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favourites"
  ON user_favourites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favourites"
  ON user_favourites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favourites"
  ON user_favourites FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_favourites_user_id ON user_favourites(user_id);
CREATE INDEX idx_user_favourites_created_at ON user_favourites(created_at DESC);
```

**Action Required:**
- [ ] Run this migration in Supabase
- [ ] Test RLS policies with real auth tokens
- [ ] Add updated_at trigger function

---

#### notification_preferences Table
**Status:** 🚫 Not yet created - do we want separate table or embed in user_favourites?

**Option A: Embed in user_favourites** (simpler)
```sql
-- Add columns to user_favourites:
ALTER TABLE user_favourites 
ADD COLUMN push_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN email_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN sms_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN quiet_hours_start TIME,
ADD COLUMN quiet_hours_end TIME,
ADD COLUMN max_alerts_per_day INTEGER DEFAULT 3;
```

**Option B: Separate table** (more flexible)
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  favourite_id UUID NOT NULL REFERENCES user_favourites(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  max_alerts_per_day INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(favourite_id)
);
```

**Action Required:**
- [ ] **Decision:** Embed or separate table?
- [ ] Implement chosen approach
- [ ] Update API routes to handle preferences

---

#### species_data Table
**Status:** 🚫 Doesn't exist - critical for proper functionality

Currently using catch history as fallback. Need comprehensive species database:

```sql
CREATE TABLE species_data (
  id TEXT PRIMARY KEY, -- e.g., "cod", "bass"
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  image_url TEXT,
  description TEXT,
  
  -- Habitat
  primary_habitat TEXT[], -- ["reef", "wreck", "open_water"]
  depth_min_m INTEGER,
  depth_max_m INTEGER,
  
  -- Seasonal
  seasonal_peaks INTEGER[], -- [5,6,7,8] for May-Aug
  seasonal_lows INTEGER[], -- [12,1,2] for Dec-Feb
  
  -- Environmental preferences
  temp_min_celsius DECIMAL,
  temp_max_celsius DECIMAL,
  temp_optimal_celsius DECIMAL,
  salinity_preference TEXT, -- "marine", "brackish", "freshwater"
  tide_preferences TEXT[], -- ["rising", "high_slack"]
  moon_preferences TEXT[], -- ["new", "full"]
  
  -- Fishing intel
  top_baits TEXT[],
  top_methods TEXT[], -- ["bottom_fishing", "jigging"]
  avg_weight_kg DECIMAL,
  avg_length_cm DECIMAL,
  
  -- ICES regions (many-to-many relationship alternative)
  common_in_regions TEXT[], -- ["31F2", "30F1", ...]
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_species_regions ON species_data USING GIN(common_in_regions);
CREATE INDEX idx_species_common_name ON species_data(common_name);
```

**Action Required:**
- [ ] **Decision:** Build species database manually or source from existing dataset?
- [ ] Potential sources:
  - FishBase API
  - ICES fish data
  - Manual curation from existing SPECIES_IMAGE_MAP
- [ ] Populate table with at least top 20 UK species
- [ ] Update `/api/findr/species/regional` to use species_data
- [ ] Add species_data joins to catch log queries

---

### 2. Authentication & Authorization

**Current Status:** 🚫 APIs trust userId parameter without verification

**Issues:**
- No JWT token validation
- No Supabase Auth integration
- Anyone can access/modify anyone's favourites by changing userId param

**Required Changes:**

```typescript
// pages/api/findr/favourites.ts (and other routes)
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create authenticated client
  const supabase = createServerSupabaseClient({ req, res });
  
  // Get authenticated user
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = session.user.id; // Use auth token, not request param
  
  // ... rest of handler
}
```

**Action Required:**
- [ ] Add `@supabase/auth-helpers-nextjs` package
- [ ] Update all API routes to use authenticated Supabase client
- [ ] Remove userId from request params (derive from session)
- [ ] Test with real user authentication flow
- [ ] Document auth setup for local development

---

### 3. Confidence Scoring Engine

**Status:** 🚫 Mock data only - core feature missing

The "confidence score" (0-100) is the heart of the favourites system, but it's currently just placeholder:

```typescript
// What exists now:
<ConfidenceRing score={species.confidenceScore} /> // Just displays a number

// What's needed:
function calculateConfidenceScore(species, currentConditions, forecast) {
  let score = 0;
  
  // Temperature (30 points)
  if (inRange(currentConditions.temp, species.tempOptimal)) score += 30;
  else if (inRange(currentConditions.temp, species.tempMin, species.tempMax)) score += 15;
  
  // Tide phase (25 points)
  if (species.tidePreferences.includes(currentConditions.tidePhase)) score += 25;
  
  // Moon phase (15 points)
  if (species.moonPreferences.includes(currentConditions.moonPhase)) score += 15;
  
  // Season (20 points)
  const month = new Date().getMonth() + 1;
  if (species.seasonalPeaks.includes(month)) score += 20;
  
  // Wind/Wave (10 points) - favorable conditions
  if (currentConditions.windSpeed < 15 && currentConditions.waveHeight < 1.5) score += 10;
  
  return Math.min(100, score);
}
```

**Action Required:**
- [ ] Create `/lib/findr/confidenceScoring.ts` module
- [ ] Integrate with `/api/findr/conditions` (already exists)
- [ ] Add species preference weights (configurable per species)
- [ ] Build real-time scoring API endpoint
- [ ] Calculate forecasts for 7-day outlook
- [ ] Cache scores (Redis?) to prevent API hammering

---

### 4. Notification Infrastructure

**Status:** 🚫 UI complete, backend missing

`NotificationSetupModal` exists and looks great, but:
- No push notification system
- No email sending
- No notification scheduling
- No rate limiting

**Architecture Needed:**

```
┌─────────────────────────────────────────────────┐
│ Supabase Edge Function (cron: every 30 min)   │
│ - Fetch all active favourites                  │
│ - Calculate current scores                     │
│ - Check threshold crossings                    │
│ - Queue notifications                          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ Notification Queue (Supabase Realtime/Redis)   │
└────────────────┬────────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
┌─────────────┐      ┌──────────────┐
│ Push (FCM)  │      │ Email (SES)  │
└─────────────┘      └──────────────┘
```

**Action Required:**
- [ ] **Decision:** Use Supabase Edge Functions or external service?
- [ ] Set up Firebase Cloud Messaging (or similar) for push
- [ ] Configure AWS SES (or similar) for email
- [ ] Build notification queue/scheduler
- [ ] Add rate limiting (max_per_day enforcement)
- [ ] Handle quiet hours
- [ ] Create notification_log table for tracking

---

### 5. Species Image Storage

**Status:** ⚠️ Currently using SPECIES_IMAGE_MAP hardcoded paths

`SPECIES_IMAGE_MAP` has ~50 species images at `/public/images/fish/`. Options:

**Option A:** Keep current approach
- ✅ Works now
- ❌ Doesn't scale
- ❌ Images not in species_data table

**Option B:** Migrate to Supabase Storage
- ✅ Scalable
- ✅ CDN distribution
- ✅ Easy admin uploads
- ❌ Migration work

**Option C:** External CDN (e.g., Cloudinary)
- ✅ Transformations (resize, optimize)
- ✅ Professional
- ❌ Cost
- ❌ Extra integration

**Action Required:**
- [ ] **Decision:** Image hosting strategy
- [ ] If Supabase Storage: migrate existing images
- [ ] Update species_data.image_url format
- [ ] Add fallback for missing images

---

## 🟡 Nice-to-Have Features (Can implement later)

### Social Features
- Share favourite species with friends
- Community "hotspots" - where others are catching your favourites
- Leaderboards per species

### Advanced Scoring
- Historical catch success rate (your personal stats)
- Machine learning: "you catch more bass on neap tides" insights
- Bait recommendations based on current conditions

### Integrations
- Weather radar overlay on map
- Tide app deep links
- Calendar integration ("Block 2 hours when cod is active")

### Analytics
- Track notification effectiveness (did you go? did you catch?)
- Alert open rates
- Best conditions vs. actual catches correlation

---

## 📋 Immediate Next Steps (Priority Order)

1. **Create user_favourites table** in Supabase
   - Run migration SQL
   - Test with sample data
   - Verify RLS policies

2. **Add authentication to API routes**
   - Install auth-helpers package
   - Update favourites.ts, regional.ts, suggestions.ts
   - Test with real auth tokens

3. **Decide notification preferences storage**
   - Embed in user_favourites OR separate table?
   - Update NotificationSetupModal API integration

4. **Create species_data table**
   - Design schema (use proposed structure above)
   - Populate with top 20 UK species (cod, bass, mackerel, etc.)
   - Source images (Supabase Storage or keep current)

5. **Build confidence scoring engine**
   - `/lib/findr/confidenceScoring.ts`
   - Integrate with conditions API
   - Wire into dashboard components

6. **Implement notification system** (if desired)
   - Edge Function scheduler
   - Push/email integration
   - Rate limiting + quiet hours

---

## 🔧 Development Tips

### Testing Without Full Backend

Use mock data in components:
```typescript
// components/favourites/__mocks__/mockFavourites.ts
export const mockTrackedSpecies: TrackedSpecies[] = [
  {
    species: {
      id: 'cod',
      commonName: 'Atlantic Cod',
      scientificName: 'Gadus morhua',
      imageUrl: '/images/fish/cod.jpg',
      primaryHabitat: ['reef', 'wreck'],
      seasonalPeaks: [10, 11, 12, 1, 2],
      topBaits: ['lugworm', 'ragworm']
    },
    isFavourite: true,
    confidenceScore: 87,
    notificationsEnabled: true,
    addedAt: new Date(),
    reasonCodes: ['seasonal_peak', 'optimal_tide'],
    currentConditions: {
      temperature: 12,
      windSpeed: 8,
      waveHeight: 0.8,
      tidePhase: 'rising',
      timeToNextTide: 120,
      moonPhase: 'waxing'
    }
  },
  // ... more species
];
```

### Local Development Setup
```bash
# 1. Ensure Supabase is running
npm run supabase:start

# 2. Run migrations
npm run supabase:migration:up

# 3. Seed test data (create this script)
npm run seed:favourites

# 4. Start dev server
npm run dev
```

---

## 📞 Questions for Morning Review

1. **Database:** Should we embed notification preferences in `user_favourites` or create separate table?

2. **Species Data:** Do we manually curate or source from external API? Budget for data service?

3. **Notifications:** Is this MVP or future feature? If MVP, what's the timeline for push/email setup?

4. **Auth:** Are we using existing Supabase auth setup, or do we need new user flow?

5. **Images:** Stick with current SPECIES_IMAGE_MAP or migrate to cloud storage?

6. **Scoring Engine:** What's the priority - get basic scoring working vs. perfect algorithm?

---

**Status Summary:**
- ✅ UI/UX: 100% complete
- ✅ API Stubs: 100% complete  
- 🟡 Database: 0% (schema defined, needs creation)
- 🟡 Authentication: 0% (needs auth-helpers integration)
- 🟡 Scoring Engine: 0% (mock data only)
- 🟡 Notifications: 0% (UI ready, backend missing)

**Estimated Work Remaining:** 2-3 days (with database + auth), 5-7 days (with full notifications)
