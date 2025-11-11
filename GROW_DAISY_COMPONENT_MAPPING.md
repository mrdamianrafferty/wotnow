# Grow Daisy Component Mapping

**Purpose**: Map existing Go Daisy and Findr components to new Grow Daisy components.

**Strategy**: Maximize code reuse, minimize duplication, adapt patterns proven in production.

---

## Component Reuse Matrix

| Go Daisy/Findr Component | Grow Daisy Adaptation | Reuse % | Notes |
|---|---|---|---|
| **Navigation & Layout** |
| `components/findr/FindrNavigationMobile.tsx` | `components/grow/GrowNavigation.tsx` | 90% | Change nav links, keep responsive logic |
| `components/findr/FindrUserMenu.tsx` | `components/grow/GrowUserMenu.tsx` | 95% | Reuse as-is, update branding |
| `components/findr/LocationDisplay.tsx` | `components/grow/ZoneDisplay.tsx` | 70% | Adapt for hardiness zones instead of ICES rectangles |
| `components/FindrFooter.tsx` | `components/GrowFooter.tsx` | 95% | Update links, keep structure |
| `components/AppHeader.tsx` | `components/GrowHeader.tsx` | 80% | Adapt location picker for zones |
| `components/BottomNav.tsx` | Integrate into GrowNavigation | 50% | Merge patterns |
| **Cards & Display** |
| Go Daisy activity cards (`pages/index.tsx:792-1073`) | `components/grow/TaskCard.tsx` | 75% | Adapt hero card pattern for tasks |
| Findr swipeable deck (`pages/findr/index.tsx:473-621`) | `components/grow/PlantDeck.tsx` | 80% | Swipe through plants instead of fish |
| Findr species card (`pages/findr/index.tsx:1152-1291`) | `components/grow/PlantCard.tsx` | 85% | Replace fish with plant data |
| `components/findr/FishSpeciesModal.tsx` | `components/grow/PlantModal.tsx` | 90% | Swap species data structure |
| `components/AstronomyCard.tsx` | N/A | 0% | Not needed for gardening |
| **Forms & Input** |
| `components/CoastalLocationDialog.tsx` | `components/grow/ZonePicker.tsx` | 60% | Adapt for zone selection |
| Findr catch logging (`pages/findr/log.tsx`) | `components/grow/TaskLogger.tsx` | 75% | Log tasks instead of catches |
| Findr catch gallery (`pages/findr/my-catches.tsx`) | `components/grow/HarvestGallery.tsx` | 70% | Log harvests instead of catches |
| **Data Display** |
| `components/findr/EnvironmentalInfo.tsx` | `components/grow/SoilConditionsCard.tsx` | 70% | Adapt for soil/weather data |
| `components/findr/ConfidenceBreakdownCard.tsx` | `components/grow/TaskScoreBreakdown.tsx` | 80% | Show task scoring factors |
| `components/findr/GuildBadge.tsx` | `components/grow/PlantCategoryBadge.tsx` | 90% | Badge for plant categories |
| `components/findr/DataFreshnessIndicator.tsx` | Reuse as-is | 100% | Data freshness same concept |
| `components/findr/NetworkStatusIndicator.tsx` | Reuse as-is | 100% | Network status same concept |
| **Translation** |
| `components/translation/TranslatedFishCard.tsx` | `components/translation/TranslatedPlantCard.tsx` | 85% | Adapt for plant names |
| `components/translation/TranslatedText.tsx` | Reuse as-is | 100% | Generic translation component |
| `components/LanguageSelector.tsx` | Reuse as-is | 100% | No changes needed |
| **Utilities** |
| `components/Popup.tsx` | `components/grow/TaskModal.tsx` | 70% | Adapt for task details |
| `components/findr/Modal.tsx` | Reuse as-is | 100% | Generic modal wrapper |
| `components/findr/SkeletonCard.tsx` | Reuse as-is | 100% | Loading states |
| `components/SEO.tsx` | Reuse as-is | 100% | SEO meta tags |
| `components/GradientFish.tsx` | `components/GradientPlant.tsx` | 90% | Animated placeholder |

---

## Detailed Component Adaptations

### 1. Navigation Components

#### `components/grow/GrowNavigation.tsx`

**Base**: `components/findr/FindrNavigationMobile.tsx`

**Changes**:
```typescript
// BEFORE (Findr)
const LINKS: NavLink[] = [
  { href: '/findr', label: 'findr', translationKey: 'findr', Icon: Fish },
  { href: '/findr/favourites', label: 'faves', translationKey: 'favourites', Icon: Heart },
  { href: '/findr/log', label: 'catches', translationKey: 'catches', Icon: ClipboardList },
  { href: '/findr/my-catches', label: 'gallery', translationKey: 'gallery', Icon: Camera },
  { href: '/findr/conditions', label: 'conditions', translationKey: 'conditions', Icon: CloudSun },
  { href: '/findr/info', label: 'info', translationKey: 'info', Icon: Info },
];

// AFTER (Grow Daisy)
import { Leaf, Calendar, Flower2, CloudSun, Info } from 'lucide-react';

const LINKS: NavLink[] = [
  { href: '/grow', label: 'today', translationKey: 'today', Icon: Leaf },
  { href: '/grow/calendar', label: 'plan', translationKey: 'planning', Icon: Calendar },
  { href: '/grow/garden', label: 'garden', translationKey: 'my-garden', Icon: Flower2 },
  { href: '/grow/conditions', label: 'conditions', translationKey: 'conditions', Icon: CloudSun },
  { href: '/grow/info', label: 'info', translationKey: 'info', Icon: Info },
];
```

**Reuse**: 90% - Only links change

---

#### `components/grow/ZoneDisplay.tsx`

**Base**: `components/findr/LocationDisplay.tsx`

**Changes**:
```typescript
// BEFORE (Findr) - Shows ICES rectangle
<div className="flex items-center gap-2">
  <MapPin size={16} />
  <span>{rectangleCode} - {regionName}</span>
</div>

// AFTER (Grow Daisy) - Shows hardiness zone
import { Thermometer } from 'lucide-react';

<div className="flex items-center gap-2">
  <Thermometer size={16} />
  <span>Zone {zone} - {locationName}</span>
</div>
```

**New props**:
```typescript
interface ZoneDisplayProps {
  zone: string;          // "7b"
  locationName: string;  // "Richmond, VA"
  onChangeZone: () => void;
}
```

**Reuse**: 70% - Structure same, data different

---

### 2. Card Components

#### `components/grow/TaskCard.tsx`

**Base**: Go Daisy activity card pattern (`pages/index.tsx:836-904`)

**Structure**:
```tsx
<div className="task-card-enhanced" style={{ backgroundImage: taskBackgroundImage }}>
  <div className="task-card-overlay" />
  <div className="task-card-content">
    {/* Weather icon top-right */}
    <div className="weather-icon-topright">
      <WeatherIcon />
    </div>

    {/* Task header */}
    <div className="task-header">
      <h3>{dayLabel}</h3>
      <div className="temperature-info">
        {temperature}° {conditions}
      </div>
    </div>

    {/* Hero task */}
    <div className="card__hero-task">
      <div className="card__hero-icon">
        <TaskIcon />
      </div>
      <div className="card__hero-title">
        <div className="card__hero-name">{taskName}</div>
        <div className="card__hero-message">{taskMessage}</div>
      </div>
      <div className="card__score-badge" style={{ background: scoreColor }}>
        {scoreEmoji}
      </div>
    </div>

    {/* Other tasks */}
    <div className="task-suggestions">
      <h4>Also Perfect Today</h4>
      <ul>
        {otherTasks.map(task => (
          <li key={task.id}>{task.name} ({task.score}%)</li>
        ))}
      </ul>
    </div>

    {/* Weather alerts */}
    {alerts.map(alert => (
      <div className="alert alert-warning" key={alert.id}>
        {alert.message}
      </div>
    ))}

    {/* Actions */}
    <div className="task-card-actions">
      <Link href="/grow/calendar">View calendar</Link>
      <Link href="/grow/garden">My garden</Link>
    </div>
  </div>
</div>
```

**Reuse**: 75% - Same card structure, different data

---

#### `components/grow/PlantCard.tsx`

**Base**: Findr species card (`pages/findr/index.tsx:1152-1291`)

**Changes**:
```typescript
// Replace fish fields with plant fields
interface PlantCardProps {
  plant: UserPlant;
  species: PlantSpecies;
  onEdit: (plant: UserPlant) => void;
  onToggleFavorite: (plant: UserPlant) => void;
  onShowDetails: (plant: UserPlant) => void;
}

// Replace:
// - commonName (fish) → commonName (plant)
// - scientificName (fish) → scientificName (plant)
// - confidence (bite score) → healthScore (plant health)
// - rationale (why biting) → nextTasks (what to do)
// - baitSuggestions → careInstructions
```

**Example**:
```tsx
<div className="card bg-base-100 shadow-md">
  <div className="card-body">
    {/* Thumbnail */}
    <div className="flex items-start gap-3">
      <Image src={plant.photos[0]} alt={plant.commonName} width={56} height={56} />
      <div>
        <h3>{plant.commonName} {plant.variety && `'${plant.variety}'`}</h3>
        {plant.nickname && <p className="text-sm italic">{plant.nickname}</p>}
        <p className="text-xs text-base-content/60">{species.scientificName}</p>
      </div>
      <button onClick={() => onToggleFavorite(plant)}>
        <Heart fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>

    {/* Health status */}
    <div className="flex items-center gap-2">
      <HealthGauge status={plant.healthStatus} />
      <span className="badge">{plant.currentStage}</span>
    </div>

    {/* Last tasks */}
    <div className="text-sm">
      <p>Last watered: {formatDate(plant.lastWatered)}</p>
      <p>Planted: {formatDate(plant.plantedDate)} (Day {daysSincePlanting})</p>
    </div>

    {/* Next actions */}
    <div>
      <h4 className="font-semibold">Next Actions:</h4>
      <ul>
        {plant.nextTasks.map(task => (
          <li key={task.taskCode}>{task.name} (due {task.dueIn})</li>
        ))}
      </ul>
    </div>

    {/* Expected harvest */}
    {plant.currentStage === 'fruiting' && (
      <div className="alert alert-success">
        <Sparkles size={14} />
        <span>Expected harvest: {formatDate(plant.expectedHarvest)}</span>
      </div>
    )}

    {/* Actions */}
    <div className="card-actions">
      <button className="btn btn-sm" onClick={() => onShowDetails(plant)}>View Details</button>
      <button className="btn btn-sm" onClick={() => onEdit(plant)}>Edit</button>
    </div>
  </div>
</div>
```

**Reuse**: 85% - Same card structure, plant-specific data

---

### 3. Modal Components

#### `components/grow/PlantModal.tsx`

**Base**: `components/findr/FishSpeciesModal.tsx`

**Changes**:
```typescript
// BEFORE (Findr)
interface FishSpeciesModalProps {
  open: boolean;
  card: CardData | null;
  onClose: () => void;
}

// Inside modal:
// - Fish image
// - Bite score
// - Rationale (why biting)
// - Bait suggestions
// - Tide tips
// - Status notes

// AFTER (Grow Daisy)
interface PlantModalProps {
  open: boolean;
  plant: UserPlant | null;
  species: PlantSpecies | null;
  onClose: () => void;
}

// Inside modal:
// - Plant photos (carousel)
// - Health status
// - Care requirements (watering, feeding, pruning)
// - Growth timeline (seedling → harvest)
// - Task history
// - Harvest log
// - Notes
```

**Reuse**: 90% - Modal shell identical, content different

---

#### `components/grow/TaskModal.tsx`

**Base**: `components/Popup.tsx` (Go Daisy)

**Changes**:
```typescript
// Add task-specific fields
interface TaskModalProps {
  open: boolean;
  task: TaskRecommendation;
  onClose: () => void;
  onMarkComplete: (taskId: string, notes?: string) => void;
  onSnooze: (taskId: string, hours: number) => void;
}

// Content:
// - Task name & category
// - Score breakdown (weather, need, seasonal, forecast)
// - Detailed instructions
// - Tips
// - Applicable plants
// - Weather window
// - Related tasks
// - Video tutorial (optional)
// - Mark complete button
```

**Reuse**: 70% - Popup structure same, task-specific content

---

### 4. Form Components

#### `components/grow/TaskLogger.tsx`

**Base**: Findr catch logging (`pages/findr/log.tsx`)

**Changes**:
```typescript
// BEFORE (Findr) - Log a catch
interface CatchLogFormProps {
  rectangleCode: string;
  onSubmit: (catch: CatchEntry) => void;
}

// Fields:
// - Species (dropdown)
// - Quantity
// - Weight
// - Bait used
// - Habitat
// - Notes
// - Photos

// AFTER (Grow Daisy) - Log a task
interface TaskLogFormProps {
  plantId?: string; // Optional: log for specific plant
  onSubmit: (taskLog: UserTaskLog) => void;
}

// Fields:
// - Task type (dropdown: water, fertilize, prune, etc.)
// - Plant (dropdown, if not pre-selected)
// - Completed at (datetime)
// - Notes
// - Photos
// - Weather conditions (auto-populated)
```

**Example**:
```tsx
<form onSubmit={handleSubmit}>
  <label>Task Type</label>
  <select name="taskCode" required>
    <option value="WATER">Watering</option>
    <option value="FERTILIZE">Fertilizing</option>
    <option value="PRUNE">Pruning</option>
    <option value="HARVEST">Harvesting</option>
    <option value="PEST_CHECK">Pest Check</option>
  </select>

  {!plantId && (
    <>
      <label>Plant</label>
      <select name="plantId">
        {userPlants.map(p => (
          <option key={p.id} value={p.id}>{p.commonName}</option>
        ))}
      </select>
    </>
  )}

  <label>Notes</label>
  <textarea name="notes" placeholder="Any observations?" />

  <label>Photos (optional)</label>
  <input type="file" accept="image/*" multiple />

  <div className="alert alert-info">
    <Info size={16} />
    <span>Conditions: {weather.temperature}°F, {weather.conditions}</span>
  </div>

  <button type="submit" className="btn btn-primary">Log Task</button>
</form>
```

**Reuse**: 75% - Form structure same, fields different

---

#### `components/grow/HarvestLogger.tsx`

**Base**: Findr catch logging (adapted)

**Specific to harvesting**:
```tsx
<form onSubmit={handleSubmit}>
  <label>Plant</label>
  <select name="plantId" required>
    {fruitingPlants.map(p => (
      <option key={p.id} value={p.id}>{p.commonName}</option>
    ))}
  </select>

  <label>Quantity</label>
  <input type="number" name="quantity" step="0.1" required />

  <label>Units</label>
  <select name="units">
    <option value="lbs">Pounds</option>
    <option value="oz">Ounces</option>
    <option value="kg">Kilograms</option>
    <option value="g">Grams</option>
    <option value="count">Count</option>
  </select>

  <label>Harvested At</label>
  <input type="datetime-local" name="harvestedAt" defaultValue={now()} />

  <label>Notes</label>
  <textarea name="notes" placeholder="Size, quality, taste notes..." />

  <label>Photos</label>
  <input type="file" accept="image/*" multiple />

  <button type="submit" className="btn btn-success">
    <Camera size={16} /> Log Harvest
  </button>
</form>
```

**Reuse**: 70% - Form pattern same, harvest-specific fields

---

### 5. Data Display Components

#### `components/grow/SoilConditionsCard.tsx`

**Base**: `components/findr/EnvironmentalInfo.tsx`

**Changes**:
```typescript
// BEFORE (Findr) - Marine environmental factors
interface EnvironmentalInfoProps {
  factors: {
    waterTemperature?: number;
    salinity?: number;
    waveHeight?: number;
    currentSpeed?: number;
    waterClarity?: number;
  };
}

// AFTER (Grow Daisy) - Soil and weather factors
interface SoilConditionsProps {
  conditions: {
    soilTemperature: number;
    soilMoisture: number;
    soilPH?: number;
    airTemperature: number;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    gdd: number;
    photoperiod: number;
  };
}
```

**Example**:
```tsx
<div className="grid grid-cols-2 gap-3">
  <div className="stat">
    <div className="stat-title">Soil Temp</div>
    <div className="stat-value text-2xl">{soilTemp}°F</div>
    <div className="stat-desc">↗ +3° today</div>
  </div>

  <div className="stat">
    <div className="stat-title">Soil Moisture</div>
    <div className="stat-value text-2xl">
      <MoistureMeter value={soilMoisture} />
    </div>
    <div className="stat-desc">{moistureLevel}</div>
  </div>

  <div className="stat">
    <div className="stat-title">GDD</div>
    <div className="stat-value text-2xl">{gddToday}</div>
    <div className="stat-desc">{gddSeason} season total</div>
  </div>

  <div className="stat">
    <div className="stat-title">Daylight</div>
    <div className="stat-value text-2xl">{photoperiod}h</div>
    <div className="stat-desc">{sunrise} - {sunset}</div>
  </div>
</div>
```

**Reuse**: 70% - Structure same, different metrics

---

#### `components/grow/TaskScoreBreakdown.tsx`

**Base**: `components/findr/ConfidenceBreakdownCard.tsx`

**Changes**:
```typescript
// BEFORE (Findr) - Bite score breakdown
interface ConfidenceBreakdownProps {
  confidence: number;
  biteScore: number;
  biteScoreFactors: {
    tempScore?: number;
    tideScore?: number;
    lightScore?: number;
    lunarScore?: number;
    weatherScore?: number;
    bioBandScore?: number;
    habitatBonus?: number;
  };
}

// AFTER (Grow Daisy) - Task score breakdown
interface TaskScoreBreakdownProps {
  score: number;
  urgency: 'critical' | 'optimal' | 'good' | 'neutral';
  breakdown: {
    weatherWindow: number;    // 40%
    plantNeed: number;        // 30%
    seasonalTiming: number;   // 20%
    forecastOptimization: number; // 10%
  };
  reasoning: string[];
}
```

**Example**:
```tsx
<div className="card bg-base-100">
  <div className="card-body">
    <h3 className="card-title">Task Score: {score}/100</h3>
    <div className="badge badge-lg">{urgency}</div>

    <div className="space-y-2">
      <div>
        <div className="flex justify-between">
          <span>Weather Window</span>
          <span className="font-bold">{breakdown.weatherWindow}/100</span>
        </div>
        <progress className="progress progress-primary" value={breakdown.weatherWindow} max="100" />
        <span className="text-xs text-base-content/60">40% weight</span>
      </div>

      <div>
        <div className="flex justify-between">
          <span>Plant Need</span>
          <span className="font-bold">{breakdown.plantNeed}/100</span>
        </div>
        <progress className="progress progress-secondary" value={breakdown.plantNeed} max="100" />
        <span className="text-xs text-base-content/60">30% weight</span>
      </div>

      <div>
        <div className="flex justify-between">
          <span>Seasonal Timing</span>
          <span className="font-bold">{breakdown.seasonalTiming}/100</span>
        </div>
        <progress className="progress progress-accent" value={breakdown.seasonalTiming} max="100" />
        <span className="text-xs text-base-content/60">20% weight</span>
      </div>

      <div>
        <div className="flex justify-between">
          <span>Forecast</span>
          <span className="font-bold">{breakdown.forecastOptimization}/100</span>
        </div>
        <progress className="progress progress-info" value={breakdown.forecastOptimization} max="100" />
        <span className="text-xs text-base-content/60">10% weight</span>
      </div>
    </div>

    <div className="divider">Reasoning</div>
    <ul className="list-disc pl-5 space-y-1 text-sm">
      {reasoning.map((reason, idx) => (
        <li key={idx}>{reason}</li>
      ))}
    </ul>
  </div>
</div>
```

**Reuse**: 80% - Same breakdown pattern, different factors

---

### 6. Utility Components

#### `components/grow/GrowthTimeline.tsx`

**New component** (no direct equivalent in Go Daisy/Findr)

**Purpose**: Visual timeline of plant growth stages

```tsx
interface GrowthTimelineProps {
  plant: UserPlant;
  species: PlantSpecies;
}

export function GrowthTimeline({ plant, species }: GrowthTimelineProps) {
  const stages = [
    { name: 'Seed', icon: '🌱', date: plant.plantedDate, completed: true },
    { name: 'Seedling', icon: '🌿', date: addDays(plant.plantedDate, 14), completed: daysSince(plant.plantedDate) > 14 },
    { name: 'Vegetative', icon: '🌾', date: addDays(plant.plantedDate, 30), completed: daysSince(plant.plantedDate) > 30 },
    { name: 'Flowering', icon: '🌸', date: addDays(plant.plantedDate, 60), completed: daysSince(plant.plantedDate) > 60 },
    { name: 'Fruiting', icon: '🍅', date: addDays(plant.plantedDate, 75), completed: plant.currentStage === 'fruiting' },
    { name: 'Harvest', icon: '🧺', date: addDays(plant.plantedDate, species.daysToMaturity), completed: plant.harvests.length > 0 },
  ];

  return (
    <div className="relative">
      <div className="flex justify-between items-center">
        {stages.map((stage, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
              ${stage.completed ? 'bg-success text-success-content' : 'bg-base-200'}`}>
              {stage.icon}
            </div>
            <span className="text-xs mt-2">{stage.name}</span>
            <span className="text-xs text-base-content/60">{formatDate(stage.date)}</span>
          </div>
        ))}
      </div>
      <div className="absolute top-6 left-0 right-0 h-1 bg-base-300 -z-10">
        <div
          className="h-full bg-success transition-all"
          style={{ width: `${(daysSince(plant.plantedDate) / species.daysToMaturity) * 100}%` }}
        />
      </div>
    </div>
  );
}
```

---

#### `components/grow/PlantHealthGauge.tsx`

**New component**

**Purpose**: Visual indicator of plant health

```tsx
interface HealthGaugeProps {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'dead';
  size?: 'sm' | 'md' | 'lg';
}

export function PlantHealthGauge({ status, size = 'md' }: HealthGaugeProps) {
  const statusConfig = {
    excellent: { color: 'success', fill: 100, emoji: '😊', label: 'Excellent' },
    good: { color: 'info', fill: 75, emoji: '🙂', label: 'Good' },
    fair: { color: 'warning', fill: 50, emoji: '😐', label: 'Fair' },
    poor: { color: 'error', fill: 25, emoji: '😟', label: 'Poor' },
    dead: { color: 'base-300', fill: 0, emoji: '☠️', label: 'Dead' },
  };

  const config = statusConfig[status];
  const sizeClass = size === 'sm' ? 'w-16 h-16' : size === 'lg' ? 'w-32 h-32' : 'w-24 h-24';

  return (
    <div className="flex items-center gap-3">
      <div className={`radial-progress text-${config.color} ${sizeClass}`}
           style={{ '--value': config.fill, '--size': '6rem' } as React.CSSProperties}>
        <span className="text-2xl">{config.emoji}</span>
      </div>
      <div>
        <p className="font-semibold">{config.label}</p>
        <p className="text-sm text-base-content/60">Plant health</p>
      </div>
    </div>
  );
}
```

---

### 7. Calendar Components

#### `components/grow/CalendarView.tsx`

**New component** (no direct equivalent)

**Purpose**: Monthly planting calendar

```tsx
interface CalendarViewProps {
  zone: string;
  year: number;
  month: number; // 1-12
  plantingWindows: PlantingWindow[];
  userPlants: UserPlant[];
  onDateClick: (date: Date) => void;
}

export function CalendarView({ zone, year, month, plantingWindows, userPlants, onDateClick }: CalendarViewProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);

  // Build calendar grid
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  // Fill leading empty days
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }

  // Fill month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    currentWeek.push(date);

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill trailing empty days
  while (currentWeek.length < 7 && currentWeek.length > 0) {
    currentWeek.push(null);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button onClick={prevMonth}>←</button>
        <h2>{getMonthName(month)} {year}</h2>
        <button onClick={nextMonth}>→</button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}

        {weeks.map((week, weekIdx) => (
          week.map((date, dayIdx) => (
            <div
              key={`${weekIdx}-${dayIdx}`}
              className={`calendar-day ${!date ? 'empty' : ''} ${isToday(date) ? 'today' : ''}`}
              onClick={() => date && onDateClick(date)}
            >
              {date && (
                <>
                  <span className="day-number">{date.getDate()}</span>
                  <div className="day-events">
                    {getEventsForDate(date, plantingWindows, userPlants).map(event => (
                      <div key={event.id} className="event-indicator" title={event.title}>
                        {event.icon}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))
        ))}
      </div>

      <div className="calendar-legend">
        <div><span className="legend-icon">🌱</span> Planting window</div>
        <div><span className="legend-icon">🍅</span> Harvest expected</div>
        <div><span className="legend-icon">❄️</span> Frost risk</div>
        <div><span className="legend-icon">💧</span> Watering reminder</div>
      </div>
    </div>
  );
}
```

---

## Hooks Mapping

| Go Daisy/Findr Hook | Grow Daisy Hook | Changes |
|---|---|---|
| `useFishingPredictions` | `useGardenTasks` | Fetch tasks instead of fish predictions |
| `useFavourites` | `useGardenPlants` | User's plant inventory instead of favorite fish |
| `useFindrRectangleOptions` | `useHardinessZones` | Zone dropdown instead of rectangles |
| `usePersistentFindrSettings` | `usePersistentGrowSettings` | Save zone, date, language |
| `useUnifiedLocation` | Reuse with zone mapping | Add zone lookup from coordinates |
| `useUserPreferences` | Reuse as-is | Same settings structure |

---

## Styling Reuse

### CSS Classes to Adapt

**From Go Daisy** (`globals.css`):
- `.activity-card-enhanced` → `.task-card-enhanced`
- `.activity-card-overlay` → `.task-card-overlay`
- `.activity-card-content` → `.task-card-content`
- `.card__hero-activity` → `.card__hero-task`
- `.activity-suggestions` → `.task-suggestions`
- `.also-good-title` → Keep as-is
- `.also-good-list` → Keep as-is

**From Findr**:
- `.findr-nav` → `.grow-nav`
- `.species-card` → `.plant-card`
- DaisyUI classes (reuse all: `badge`, `card`, `btn`, etc.)

---

## File Structure

### New Directory Structure

```
pages/
  grow/
    index.tsx              # Today page (hero task + multi-day)
    calendar.tsx           # Planning calendar
    garden.tsx             # My plants (gallery + add)
    conditions.tsx         # Gardeners' weather
    info.tsx               # Info pages (about, how-it-works, etc.)

components/
  grow/
    GrowNavigation.tsx
    GrowHeader.tsx
    GrowFooter.tsx
    GrowUserMenu.tsx
    ZoneDisplay.tsx
    ZonePicker.tsx
    TaskCard.tsx
    TaskModal.tsx
    TaskLogger.tsx
    TaskScoreBreakdown.tsx
    PlantCard.tsx
    PlantModal.tsx
    PlantHealthGauge.tsx
    GrowthTimeline.tsx
    HarvestLogger.tsx
    SoilConditionsCard.tsx
    GDDTracker.tsx
    FrostRiskIndicator.tsx
    PhotoperiodChart.tsx
    CalendarView.tsx
    PlantingWindowCard.tsx
    ShoppingList.tsx

hooks/
  useGardenTasks.ts
  useGardenPlants.ts
  useHardinessZones.ts
  usePersistentGrowSettings.ts
  useSoilConditions.ts
  useGDD.ts

lib/
  grow/
    taskScoring.ts         # Task scoring algorithm
    soilModel.ts           # Soil temp/moisture calculations
    gddCalculator.ts       # Growing degree days
    photoperiod.ts         # Sunrise/sunset calculations
    plantingCalendar.ts    # Zone-specific planting dates

types/
  grow.ts                  # Grow Daisy types

data/
  plantSpecies.json        # Initial plant database
  hardinessZones.json      # Zone data
```

---

## Migration Checklist

### Phase 1: Foundation
- [ ] Copy `FindrNavigationMobile.tsx` → `GrowNavigation.tsx`, update links
- [ ] Copy `FindrUserMenu.tsx` → `GrowUserMenu.tsx`
- [ ] Copy `LocationDisplay.tsx` → `ZoneDisplay.tsx`, adapt for zones
- [ ] Copy `FindrFooter.tsx` → `GrowFooter.tsx`, update links
- [ ] Create `/pages/grow/index.tsx` basic structure

### Phase 2: Core Components
- [ ] Adapt Go Daisy activity card → `TaskCard.tsx`
- [ ] Adapt Findr species card → `PlantCard.tsx`
- [ ] Adapt `FishSpeciesModal.tsx` → `PlantModal.tsx`
- [ ] Create `TaskModal.tsx` from `Popup.tsx`
- [ ] Adapt `ConfidenceBreakdownCard.tsx` → `TaskScoreBreakdown.tsx`

### Phase 3: Forms
- [ ] Adapt Findr catch log → `TaskLogger.tsx`
- [ ] Create `HarvestLogger.tsx` from catch log pattern
- [ ] Create `ZonePicker.tsx` from `CoastalLocationDialog.tsx`

### Phase 4: Data Components
- [ ] Adapt `EnvironmentalInfo.tsx` → `SoilConditionsCard.tsx`
- [ ] Create new `GrowthTimeline.tsx`
- [ ] Create new `PlantHealthGauge.tsx`
- [ ] Create new `CalendarView.tsx`

### Phase 5: Hooks
- [ ] Adapt `useFishingPredictions` → `useGardenTasks`
- [ ] Adapt `useFavourites` → `useGardenPlants`
- [ ] Adapt `useFindrRectangleOptions` → `useHardinessZones`
- [ ] Create new hooks for GDD, soil conditions, photoperiod

---

## Testing Strategy

### Component Tests
```typescript
// Test component adaptations
describe('TaskCard', () => {
  it('should display task score correctly', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('95/100')).toBeInTheDocument();
  });
});

describe('PlantCard', () => {
  it('should show plant health status', () => {
    render(<PlantCard plant={mockPlant} />);
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });
});
```

### Visual Regression Tests
- Compare Findr species card vs. Grow Daisy plant card
- Ensure consistent styling across app family

---

## Performance Considerations

1. **Code splitting**: Lazy load modals and heavy components
2. **Image optimization**: WebP format for plant photos
3. **Bundle size**: Share common components between Go Daisy, Findr, Grow Daisy
4. **Caching**: Reuse Findr's caching patterns

---

**Document Status**: Complete
**Next Steps**: Begin Phase 1 component migration
