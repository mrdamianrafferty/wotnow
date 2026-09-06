# Grow Daisy Navigation & Features Update

**Date**: 2025-01-11
**Status**: User Approved ✅

---

## Confirmed Navigation Structure

### Mobile Bottom Nav (5 tabs)
```
🏡 My Home | 📅 Plan | 🌱 Garden | 🌤️ Conditions | ℹ️ Info
```

### Route Mapping
```typescript
const LINKS: NavLink[] = [
  {
    href: '/grow',
    label: 'My Home',
    translationKey: 'my-home',
    Icon: Home  // Lucide Home icon
  },
  {
    href: '/grow/plan',
    label: 'Plan',
    translationKey: 'plan',
    Icon: Calendar
  },
  {
    href: '/grow/garden',
    label: 'Garden',
    translationKey: 'garden',
    Icon: Flower2
  },
  {
    href: '/grow/conditions',
    label: 'Conditions',
    translationKey: 'conditions',
    Icon: CloudSun
  },
  {
    href: '/grow/info',
    label: 'Info',
    translationKey: 'info',
    Icon: Info
  },
];
```

---

## Section Details

### 1. 🏡 My Home (`/grow`)

**Purpose**: Today's tasks at a glance - what to do right now.

**Features** (unchanged from implementation guide):
- Hero task card with weather context
- Multi-day swipeable view (today + next 7 days)
- Weather alerts (frost warnings, heat advisories)
- Plant-specific tasks from user's garden
- "Also Perfect Today" secondary tasks

---

### 2. 📅 Plan (`/grow/plan`)

**Purpose**: Timeline-based planning for the growing season.

**UI Pattern**: DaisyUI vertical timeline with colorful lines
- Reference: https://daisyui.com/components/timeline/#vertical-timeline-with-colorful-lines

#### Timeline Structure

```tsx
<ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical">
  {/* Current Week */}
  <li>
    <div className="timeline-middle">
      <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="timeline-start md:text-end mb-10">
      <time className="font-mono italic">This Week</time>
      <div className="text-lg font-black">Plant tomatoes</div>
      <div className="text-sm">Last frost passed, soil temp 65°F - perfect timing!</div>
      <div className="mt-2">
        <div className="badge badge-primary badge-sm">🍅 Tomato</div>
        <div className="badge badge-success badge-sm ml-2">Optimal</div>
      </div>
    </div>
    <hr className="bg-primary" />
  </li>

  {/* Next Week */}
  <li>
    <hr className="bg-primary" />
    <div className="timeline-middle">
      <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16z" />
      </svg>
    </div>
    <div className="timeline-end mb-10">
      <time className="font-mono italic">May 20-26</time>
      <div className="text-lg font-black">Direct sow beans</div>
      <div className="text-sm">Soil warm enough for germination. Rain forecast day 3.</div>
      <div className="mt-2">
        <div className="badge badge-secondary badge-sm">🫘 Bean</div>
        <div className="badge badge-info badge-sm ml-2">Coming up</div>
      </div>
    </div>
    <hr className="bg-secondary" />
  </li>

  {/* Future Event */}
  <li>
    <hr className="bg-secondary" />
    <div className="timeline-middle">
      <svg className="h-5 w-5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16z" />
      </svg>
    </div>
    <div className="timeline-start md:text-end mb-10">
      <time className="font-mono italic">June 1-7</time>
      <div className="text-lg font-black">Prune roses</div>
      <div className="text-sm">After first bloom cycle. Best in dry conditions.</div>
      <div className="mt-2">
        <div className="badge badge-accent badge-sm">🌹 Rose</div>
      </div>
    </div>
    <hr className="bg-accent" />
  </li>

  {/* Frost Warning */}
  <li>
    <hr className="bg-accent" />
    <div className="timeline-middle">
      <svg className="h-5 w-5 text-error" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="timeline-end mb-10">
      <time className="font-mono italic">October 15</time>
      <div className="text-lg font-black text-error">⚠️ First frost expected</div>
      <div className="text-sm">Harvest tender crops. Protect perennials. Bring pots indoors.</div>
      <div className="mt-2">
        <div className="badge badge-error badge-sm">Critical</div>
      </div>
    </div>
    <hr className="bg-error" />
  </li>

  {/* Harvest */}
  <li>
    <hr className="bg-error" />
    <div className="timeline-middle">
      <svg className="h-5 w-5 text-success" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16z" />
      </svg>
    </div>
    <div className="timeline-start md:text-end mb-10">
      <time className="font-mono italic">July 15-31</time>
      <div className="text-lg font-black">🧺 Tomato harvest window</div>
      <div className="text-sm">Expected yield: 75 days from transplant. Pick when fully colored.</div>
      <div className="mt-2">
        <div className="badge badge-success badge-sm">Harvest</div>
      </div>
    </div>
    <hr />
  </li>
</ul>
```

#### Timeline Features

**Event Types** (each with distinct colors):
1. **Planting Windows** (Primary blue)
   - Sow indoors
   - Transplant
   - Direct sow
   - Calculated from zone + species

2. **Maintenance Tasks** (Secondary purple)
   - Fertilizing schedule
   - Pruning windows
   - Mulching
   - Bed preparation

3. **Harvest Windows** (Success green)
   - Calculated from planting date + days to maturity
   - Succession planting intervals
   - Storage tips

4. **Weather Events** (Warning/Error)
   - Last frost date (Warning yellow)
   - First frost date (Error red)
   - Heat wave warnings
   - Optimal planting weather windows

5. **User Tasks** (Info cyan)
   - Custom reminders
   - Seed ordering deadlines
   - Garden tasks (build trellis, install drip irrigation)

#### Timeline Data Model

```typescript
interface TimelineEvent {
  id: string;
  type: 'planting' | 'maintenance' | 'harvest' | 'weather' | 'custom';
  priority: 'critical' | 'high' | 'normal' | 'low';

  // Dates
  startDate: string;      // ISO date
  endDate?: string;       // For date ranges
  dateLabel: string;      // "This week", "May 20-26", "July"

  // Display
  title: string;
  description: string;
  icon: string;           // Emoji or SVG icon
  color: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  status: 'upcoming' | 'current' | 'completed' | 'missed';

  // Context
  plants?: {
    plantId: string;
    commonName: string;
    emoji: string;
  }[];
  weather?: {
    temperature: number;
    soilTemp: number;
    conditions: string;
  };

  // Actions
  actionable: boolean;    // Can user complete this now?
  actions?: {
    label: string;
    type: 'mark-complete' | 'add-to-calendar' | 'view-details' | 'set-reminder';
    handler: () => void;
  }[];

  // Related events
  relatedEvents?: string[]; // Event IDs
  successorEvent?: string;  // Next event in sequence
}
```

#### Timeline View Modes

**1. Season View** (Default)
- Show all events for growing season
- Grouped by month
- Scroll through timeline
- Color-coded by type

**2. Crop View**
- Filter timeline by specific plant
- Show full lifecycle: sow → transplant → harvest
- Related maintenance tasks

**3. This Month View**
- Compact view of current month only
- Quick action buttons
- Weather forecast integration

**4. Calendar View** (Alternative layout)
- Monthly calendar grid
- Timeline events as dots/badges on dates
- Click date to see details

#### Components to Build

```
components/grow/
  PlanTimeline.tsx           # Main timeline component
  TimelineEvent.tsx          # Individual event card
  TimelineFilters.tsx        # Filter by type, plant, date range
  TimelineViewToggle.tsx     # Switch between views
  AddTimelineEvent.tsx       # User-created events
  TimelineEventModal.tsx     # Event details + actions
```

---

### 3. 🌱 Garden (`/grow/garden`)

**Purpose**: Multi-function garden management - identify, track, photograph.

**Updated Scope**: Mix of plant ID, pest ID, and garden gallery.

#### Three-Tab Interface

```tsx
<div className="tabs tabs-boxed mb-4">
  <a className={`tab ${activeTab === 'my-plants' ? 'tab-active' : ''}`}>
    My Plants
  </a>
  <a className={`tab ${activeTab === 'identify' ? 'tab-active' : ''}`}>
    Identify
  </a>
  <a className={`tab ${activeTab === 'gallery' ? 'tab-active' : ''}`}>
    Gallery
  </a>
</div>
```

#### Tab 1: My Plants

**Content**: User's plant inventory (as specified in original implementation guide)
- Grid/list of plants with photos
- Health status indicators
- Last watered, fertilized, pruned
- Next actions (due tasks)
- Quick actions (water, fertilize, harvest)

**Same as original plan** - no changes.

---

#### Tab 2: Identify (NEW: Expanded Scope)

**Purpose**: AI-powered identification for plants AND pests.

##### Two-Mode Toggle

```tsx
<div className="flex gap-2 mb-4">
  <button
    className={`btn ${identifyMode === 'plant' ? 'btn-primary' : 'btn-outline'}`}
    onClick={() => setIdentifyMode('plant')}
  >
    🌿 Identify Plant
  </button>
  <button
    className={`btn ${identifyMode === 'pest' ? 'btn-primary' : 'btn-outline'}`}
    onClick={() => setIdentifyMode('pest')}
  >
    🐛 Identify Pest/Problem
  </button>
</div>
```

##### Plant Identification

**Features**:
- Camera integration (take photo or upload)
- AI recognition (Google Cloud Vision, PlantNet API, or custom model)
- Results: Common name, scientific name, care requirements
- Action: "Add to My Garden" button
- History: Past identifications saved

**UI Flow**:
```
┌─────────────────────────────────────────┐
│ 📷 Take Photo  or  📁 Upload Image      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ [Processing... Analyzing image]         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ ✅ Identified: Tomato 'Brandywine'      │
│ Solanum lycopersicum                    │
│                                         │
│ [Photo preview]                         │
│                                         │
│ Care Summary:                           │
│ • Full sun (6-8 hours)                  │
│ • Water: 1-2 inches/week                │
│ • Days to maturity: 80                  │
│                                         │
│ [Add to My Garden] [View Details]      │
└─────────────────────────────────────────┘
```

##### Pest/Problem Identification (NEW)

**Purpose**: Diagnose plant problems from photos.

**Features**:
- Camera integration for problem areas
- AI recognition for:
  - Common pests (aphids, caterpillars, beetles, etc.)
  - Diseases (powdery mildew, blight, rust)
  - Nutrient deficiencies (yellowing, spots, curling)
  - Environmental stress (sunburn, frost damage)
- Results: Problem name, severity, treatment options
- Action: Link to pest control products, organic solutions

**UI Flow**:
```
┌─────────────────────────────────────────┐
│ 📷 Photo of Problem                      │
│ (yellow spots on tomato leaves)         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ ✅ Identified: Early Blight              │
│ Alternaria solani (fungal disease)      │
│                                         │
│ Severity: Moderate 🟡                   │
│                                         │
│ Symptoms:                               │
│ • Dark spots with concentric rings      │
│ • Starts on lower leaves                │
│ • Can spread to fruit                   │
│                                         │
│ Treatment Options:                      │
│ 1. Remove affected leaves               │
│ 2. Apply copper fungicide               │
│ 3. Improve air circulation              │
│ 4. Avoid overhead watering              │
│                                         │
│ Organic Solutions:                      │
│ • Baking soda spray                     │
│ • Neem oil                              │
│ • Copper soap                           │
│                                         │
│ [Log Treatment] [View IPM Guide]        │
└─────────────────────────────────────────┘
```

**Pest Database** (to build):
- Common garden pests (50-100 species)
- Images for AI training
- Identification characteristics
- Life cycle info
- Treatment methods (organic + conventional)
- Beneficial insects (don't kill these!)

**IPM (Integrated Pest Management) Guides**:
- Prevention strategies
- Monitoring thresholds
- Treatment escalation (cultural → mechanical → biological → chemical)
- Companion planting for pest prevention
- Beneficial predator info

---

#### Tab 3: Gallery (NEW)

**Purpose**: Photo journal of your entire garden (not just individual plants).

##### Gallery Features

**1. Photo Grid**
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {photos.map(photo => (
    <div key={photo.id} className="card bg-base-100 shadow-md">
      <figure className="aspect-square">
        <Image
          src={photo.url}
          alt={photo.caption}
          fill
          className="object-cover"
        />
      </figure>
      <div className="card-body p-3">
        <p className="text-xs">{formatDate(photo.takenAt)}</p>
        {photo.caption && <p className="text-sm">{photo.caption}</p>}
        {photo.tags && (
          <div className="flex flex-wrap gap-1 mt-1">
            {photo.tags.map(tag => (
              <span key={tag} className="badge badge-xs">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  ))}
</div>
```

**2. Photo Upload**
```tsx
<button className="btn btn-primary btn-lg fixed bottom-20 right-4 btn-circle">
  📷
</button>
```

**3. Photo Metadata**
```typescript
interface GardenPhoto {
  id: string;
  userId: string;
  url: string;
  thumbnailUrl: string;
  caption: string;
  takenAt: string;       // ISO timestamp

  // Tags
  tags: string[];        // ["tomato", "bed-1", "harvest", "july"]
  location?: string;     // "North Garden", "Raised Bed 2"

  // Associated entities
  plantIds?: string[];   // Link to specific plants

  // Metadata
  weather?: {            // Weather at time of photo
    temperature: number;
    conditions: string;
  };
  gpsCoordinates?: {
    lat: number;
    lon: number;
  };

  // Social (future)
  shared: boolean;
  likes?: number;
  comments?: Comment[];
}
```

**4. Gallery Views**

**Timeline View** (Default)
- Photos in reverse chronological order
- Grouped by date ("Today", "This Week", "May 2025")
- Infinite scroll

**Grid View**
- Photo grid with filters
- Sort by: Date, Plant, Location, Tag

**Slideshow View**
- Full-screen photo viewer
- Swipe through photos
- Show captions + metadata overlay

**Before/After View**
- Compare photos of same location over time
- "Garden Progress" feature
- Show growth over weeks/months

**5. Smart Albums** (Auto-generated)

- **This Season** - All photos from current growing season
- **My Harvests** - Photos tagged with "harvest"
- **Problem Solving** - Photos from pest ID feature
- **Bed 1, Bed 2, etc.** - Auto-organize by location tag
- **By Plant** - All photos of specific plant (tomatoes, roses, etc.)

**6. Filters & Search**

```tsx
<div className="flex flex-wrap gap-2 mb-4">
  <select className="select select-bordered select-sm">
    <option>All Photos</option>
    <option>This Year</option>
    <option>Last 30 Days</option>
    <option>Custom Date Range</option>
  </select>

  <select className="select select-bordered select-sm">
    <option>All Locations</option>
    <option>North Garden</option>
    <option>Raised Bed 1</option>
    <option>Greenhouse</option>
  </select>

  <select className="select select-bordered select-sm">
    <option>All Plants</option>
    {userPlants.map(p => (
      <option key={p.id}>{p.commonName}</option>
    ))}
  </select>

  <input
    type="search"
    placeholder="Search tags..."
    className="input input-bordered input-sm"
  />
</div>
```

**7. Actions**

- **Add Caption**: Edit photo captions
- **Tag Plants**: Link photo to plants in inventory
- **Set Location**: Add/edit location tag
- **Delete**: Remove photo
- **Share**: Export to social media (future)
- **Download**: Save high-res version
- **Add to Album**: Organize into custom collections

---

#### Garden Tab Data Models

##### Plant Identification Result

```typescript
interface PlantIdentificationResult {
  id: string;
  userId: string;
  photoUrl: string;
  timestamp: string;

  // Identification
  commonName: string;
  scientificName: string;
  confidence: number;     // 0-100
  alternativeMatches?: {
    commonName: string;
    scientificName: string;
    confidence: number;
  }[];

  // Care info (fetched from plant_species table)
  careRequirements?: {
    sunlight: string;
    water: string;
    daysToMaturity: number;
    hardinessZones: number[];
  };

  // User action
  addedToGarden: boolean;
  plantId?: string;       // If added to garden
}
```

##### Pest Identification Result

```typescript
interface PestIdentificationResult {
  id: string;
  userId: string;
  photoUrl: string;
  timestamp: string;

  // Identification
  problemType: 'pest' | 'disease' | 'deficiency' | 'environmental';
  name: string;
  scientificName?: string;
  confidence: number;
  severity: 'low' | 'moderate' | 'high' | 'critical';

  // Details
  description: string;
  symptoms: string[];
  causes: string[];

  // Treatment
  organicTreatments: {
    method: string;
    instructions: string;
    effectiveness: number;
  }[];
  conventionalTreatments?: {
    product: string;
    instructions: string;
    cautions: string[];
  }[];
  preventionTips: string[];

  // Affected plant
  plantId?: string;
  plantSpecies?: string;

  // Treatment tracking
  treatmentLogged: boolean;
  treatmentDate?: string;
  treatmentMethod?: string;
  resolved: boolean;
}
```

---

#### Components to Build

**Garden Tab**:
```
components/grow/
  GardenTabs.tsx                    # Tab switcher

  # My Plants tab (mostly existing from original plan)
  PlantCard.tsx                     # Plant inventory card
  PlantModal.tsx                    # Plant details
  PlantHealthGauge.tsx              # Health indicator
  GrowthTimeline.tsx                # Plant lifecycle

  # Identify tab (NEW)
  PlantIdentifier.tsx               # Camera + AI for plants
  PestIdentifier.tsx                # Camera + AI for pests
  IdentificationResult.tsx          # Display results
  PestTreatmentGuide.tsx            # Treatment recommendations
  IPMGuide.tsx                      # Integrated pest management info
  AddToGardenButton.tsx             # Quick add after ID

  # Gallery tab (NEW)
  GardenGallery.tsx                 # Photo grid
  GalleryFilters.tsx                # Search/filter photos
  PhotoUpload.tsx                   # Camera/upload interface
  PhotoViewer.tsx                   # Full-screen viewer
  PhotoMetadataEditor.tsx           # Edit caption, tags, location
  SmartAlbums.tsx                   # Auto-generated albums
  BeforeAfterSlider.tsx             # Compare photos over time
```

---

### Database Schema Updates

#### New Tables for Gallery

```sql
-- Garden photos
CREATE TABLE garden_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Photo
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  taken_at TIMESTAMPTZ NOT NULL,

  -- Tags
  tags TEXT[],
  location TEXT,        -- "North Garden", "Bed 1"
  plant_ids UUID[],     -- Link to user_plants

  -- Metadata
  weather JSONB,        -- {temperature, conditions}
  gps_coordinates JSONB, -- {lat, lon}

  -- Visibility (future)
  shared BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_garden_photos_user_id ON garden_photos(user_id);
CREATE INDEX idx_garden_photos_taken_at ON garden_photos(taken_at DESC);
CREATE INDEX idx_garden_photos_tags ON garden_photos USING GIN(tags);

-- RLS
ALTER TABLE garden_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own photos"
  ON garden_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload photos"
  ON garden_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own photos"
  ON garden_photos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
  ON garden_photos FOR DELETE
  USING (auth.uid() = user_id);
```

```sql
-- Plant identification history
CREATE TABLE plant_identifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  photo_url TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Result
  common_name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  alternative_matches JSONB,

  -- Action taken
  added_to_garden BOOLEAN DEFAULT FALSE,
  plant_id UUID REFERENCES user_plants(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plant_identifications_user_id ON plant_identifications(user_id);
CREATE INDEX idx_plant_identifications_timestamp ON plant_identifications(timestamp DESC);

-- RLS
ALTER TABLE plant_identifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own identifications"
  ON plant_identifications FOR SELECT
  USING (auth.uid() = user_id);
```

```sql
-- Pest/problem identification history
CREATE TABLE pest_identifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  photo_url TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Result
  problem_type TEXT NOT NULL CHECK (problem_type IN ('pest', 'disease', 'deficiency', 'environmental')),
  name TEXT NOT NULL,
  scientific_name TEXT,
  confidence NUMERIC NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'moderate', 'high', 'critical')),

  -- Details
  description TEXT,
  symptoms TEXT[],
  treatment_options JSONB,

  -- Context
  plant_id UUID REFERENCES user_plants(id),
  plant_species TEXT,

  -- Treatment tracking
  treatment_logged BOOLEAN DEFAULT FALSE,
  treatment_date TIMESTAMPTZ,
  treatment_method TEXT,
  resolved BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pest_identifications_user_id ON pest_identifications(user_id);
CREATE INDEX idx_pest_identifications_timestamp ON pest_identifications(timestamp DESC);

-- RLS
ALTER TABLE pest_identifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pest IDs"
  ON pest_identifications FOR SELECT
  USING (auth.uid() = user_id);
```

---

## API Endpoints - New/Updated

### Gallery Endpoints

```typescript
// Get user's garden photos
GET /api/grow/gallery?
  limit=50&
  offset=0&
  tags=tomato,harvest&
  location=bed-1&
  startDate=2025-01-01&
  endDate=2025-12-31

// Upload garden photo
POST /api/grow/gallery
Body: FormData with image + metadata

// Update photo metadata
PATCH /api/grow/gallery/:photoId
Body: { caption?, tags?, location?, plantIds? }

// Delete photo
DELETE /api/grow/gallery/:photoId

// Get smart albums
GET /api/grow/gallery/albums
Response: {
  thisSeason: { count, photos },
  harvests: { count, photos },
  byLocation: { ... },
  byPlant: { ... }
}
```

### Identification Endpoints

```typescript
// Identify plant from photo
POST /api/grow/identify/plant
Body: FormData with image
Response: {
  commonName: string,
  scientificName: string,
  confidence: number,
  alternatives: [...],
  careInfo: { ... }
}

// Identify pest/problem from photo
POST /api/grow/identify/pest
Body: FormData with image + optional plantId
Response: {
  problemType: 'pest' | 'disease' | 'deficiency' | 'environmental',
  name: string,
  confidence: number,
  severity: 'low' | 'moderate' | 'high' | 'critical',
  symptoms: [...],
  treatments: {
    organic: [...],
    conventional: [...]
  },
  prevention: [...]
}

// Get identification history
GET /api/grow/identify/history?type=plant|pest

// Log pest treatment
POST /api/grow/identify/pest/:identificationId/treatment
Body: {
  method: string,
  date: string,
  notes?: string
}
```

---

## Summary of Changes

### Navigation
✅ Changed "Today" → **"My Home"** (clearer, warmer language)

### Plan Page
✅ Confirmed **DaisyUI timeline component** with colorful lines
✅ Event types: Planting, Maintenance, Harvest, Weather alerts, Custom
✅ View modes: Season, Crop, This Month, Calendar grid
✅ Timeline filters and search

### Garden Page
✅ **Three tabs** instead of two:
  1. **My Plants** - Inventory (unchanged)
  2. **Identify** - Expanded to include **both plants AND pests**
  3. **Gallery** - NEW photo journal feature

✅ **Pest/Problem ID** added:
  - AI-powered pest identification
  - Disease, deficiency, environmental stress detection
  - Treatment recommendations (organic + conventional)
  - IPM guides
  - Treatment tracking

✅ **Garden Gallery** added:
  - Photo journal (not just plant-specific photos)
  - Timeline/grid/slideshow views
  - Tags, captions, location metadata
  - Smart albums (auto-organized)
  - Before/after comparisons
  - Search and filters

---

## Implementation Priority

### Phase 1 (Foundation)
1. Navigation with new labels ✅
2. My Home page (task cards) ✅
3. Basic Plan timeline (DaisyUI component) ✅

### Phase 2 (Core Features)
4. My Plants tab (inventory) ✅
5. Conditions page ✅
6. Info pages ✅

### Phase 3 (Advanced Features)
7. Gallery tab (photo journal) 🆕
8. Plant identifier 🆕
9. Pest identifier 🆕
10. Timeline filters + view modes 🆕

### Phase 4 (Polish)
11. Smart albums 🆕
12. IPM guides 🆕
13. Treatment tracking 🆕
14. Before/after photo comparisons 🆕

---

**Status**: User-approved design ✅
**Next Step**: Begin Phase 1 implementation
