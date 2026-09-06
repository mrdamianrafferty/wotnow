# Grow Daisy API Endpoints

**Version**: 1.0
**Base Path**: `/api/grow`
**Authentication**: Supabase JWT (when user-specific)

---

## Overview

This document defines all API endpoints for Grow Daisy, following patterns established in Go Daisy and Findr.

**Design Principles**:
- RESTful where possible
- Consistent error handling
- Caching headers for optimization
- TypeScript types for all requests/responses

---

## Authentication Endpoints

### Reuse Go Daisy/Findr Auth System

All auth endpoints already exist:
- `/api/auth/*` (Supabase auth callbacks)
- `/pages/findr/auth.tsx` pattern

**No new endpoints needed** - just route users through existing auth flow.

---

## Task Recommendation Endpoints

### GET `/api/grow/tasks`

Get personalized task recommendations for a specific date and location.

**Query Parameters**:
```typescript
interface TasksQueryParams {
  zone: string;           // e.g., "7b"
  date: string;           // ISO date, e.g., "2025-05-15"
  lat?: number;           // Latitude for weather
  lon?: number;           // Longitude for weather
  userId?: string;        // Optional: for personalized tasks based on user's plants
  bypassCache?: boolean;  // Dev/testing only
}
```

**Response**:
```typescript
interface TasksResponse {
  tasks: TaskRecommendation[];
  metadata: {
    zone: string;
    date: string;
    location: {
      lat: number;
      lon: number;
      name: string;
    };
    weather: WeatherSummary;
    cached: boolean;
    cachedAt?: string;
    expiresAt?: string;
  };
}

interface TaskRecommendation {
  id: string;
  taskCode: string;
  name: string;
  category: string;
  score: number; // 0-100
  urgency: 'critical' | 'optimal' | 'good' | 'neutral';
  reasoning: string[];
  weatherFactors: {
    temperatureScore: number;
    moistureScore: number;
    windScore: number;
    timingScore: number;
  };
  applicablePlants?: {
    plantId: string;
    commonName: string;
    needLevel: 'urgent' | 'due' | 'soon';
  }[];
  instructions: string;
  tips: string[];
  estimatedMinutes: number;
  weatherWindow: {
    start: string; // ISO timestamp
    end: string;
    conditions: string;
  };
}

interface WeatherSummary {
  temperature: number;
  conditions: string;
  precipitation: number;
  windSpeed: number;
  soilTemp: number;
  soilMoisture: 'dry' | 'moderate' | 'moist' | 'saturated';
  frostRisk: boolean;
}
```

**Example Request**:
```bash
GET /api/grow/tasks?zone=7b&date=2025-05-15&lat=37.5407&lon=-77.4360&userId=abc-123
```

**Example Response**:
```json
{
  "tasks": [
    {
      "id": "task_001",
      "taskCode": "WATER_DEEP",
      "name": "Deep water tomatoes",
      "category": "watering",
      "score": 95,
      "urgency": "optimal",
      "reasoning": [
        "Soil moisture at 30% (dry)",
        "No rain forecast for 5 days",
        "Tomatoes in fruiting stage need consistent moisture",
        "Optimal morning temperature (68°F)"
      ],
      "weatherFactors": {
        "temperatureScore": 95,
        "moistureScore": 85,
        "windScore": 90,
        "timingScore": 100
      },
      "applicablePlants": [
        {
          "plantId": "plant_abc",
          "commonName": "Tomato 'Brandywine'",
          "needLevel": "urgent"
        },
        {
          "plantId": "plant_def",
          "commonName": "Pepper 'Jalapeño'",
          "needLevel": "due"
        }
      ],
      "instructions": "Water deeply at base of plants, avoid wetting foliage. Apply 1-2 inches of water.",
      "tips": [
        "Water in early morning (6-10 AM) to reduce evaporation",
        "Check soil moisture 4-6 inches deep before watering",
        "Mulch around plants to retain moisture"
      ],
      "estimatedMinutes": 20,
      "weatherWindow": {
        "start": "2025-05-15T06:00:00Z",
        "end": "2025-05-15T10:00:00Z",
        "conditions": "Clear, 68°F, light breeze"
      }
    },
    {
      "id": "task_002",
      "taskCode": "PRUNE_ROSES",
      "name": "Prune roses",
      "category": "pruning",
      "score": 88,
      "urgency": "good",
      "reasoning": [
        "Dry conditions ideal for pruning (prevents disease)",
        "Early bloom cycle - good timing",
        "Low wind (3 mph) - safe for working with plants"
      ],
      "weatherFactors": {
        "temperatureScore": 85,
        "moistureScore": 95,
        "windScore": 92,
        "timingScore": 75
      },
      "instructions": "Remove spent blooms and any dead or crossing branches. Cut at 45° angle above outward-facing bud.",
      "tips": [
        "Use clean, sharp pruners",
        "Disinfect between plants to prevent disease spread",
        "Collect and dispose of cuttings (don't compost diseased material)"
      ],
      "estimatedMinutes": 30,
      "weatherWindow": {
        "start": "2025-05-15T08:00:00Z",
        "end": "2025-05-15T18:00:00Z",
        "conditions": "Dry, 72°F"
      }
    }
  ],
  "metadata": {
    "zone": "7b",
    "date": "2025-05-15",
    "location": {
      "lat": 37.5407,
      "lon": -77.4360,
      "name": "Richmond, VA"
    },
    "weather": {
      "temperature": 68,
      "conditions": "Clear",
      "precipitation": 0,
      "windSpeed": 3,
      "soilTemp": 65,
      "soilMoisture": "dry",
      "frostRisk": false
    },
    "cached": false,
    "expiresAt": "2025-05-15T12:00:00Z"
  }
}
```

**Caching Strategy**:
- Cache for 6 hours (longer than Findr's 3h due to less volatile gardening tasks)
- Cache key: `grow_tasks_{zone}_{date}_{userId}`
- Invalidate on weather changes > 10°F or new rain

**Error Responses**:
```typescript
// 400 Bad Request
{
  "error": "Invalid zone format",
  "message": "Zone must be in format '7b' or '10a'"
}

// 404 Not Found
{
  "error": "Zone not found",
  "message": "Hardiness zone '15z' does not exist"
}

// 500 Internal Server Error
{
  "error": "Weather service unavailable",
  "message": "Could not fetch weather data. Please try again."
}
```

---

### GET `/api/grow/tasks/:taskId`

Get detailed information about a specific task.

**Response**:
```typescript
interface TaskDetail extends TaskRecommendation {
  relatedTasks: {
    taskId: string;
    name: string;
    relationship: 'prerequisite' | 'follows' | 'alternative';
  }[];
  commonMistakes: string[];
  videoUrl?: string;
  articleLinks?: {
    title: string;
    url: string;
    source: string;
  }[];
}
```

---

## Weather & Conditions Endpoints

### GET `/api/grow/conditions`

Get gardening-specific weather conditions for a location.

**Query Parameters**:
```typescript
interface ConditionsQueryParams {
  lat: number;
  lon: number;
  zone: string;
  date?: string; // Default: today
}
```

**Response**:
```typescript
interface ConditionsResponse {
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    conditions: string;
    uvIndex: number;
  };
  soil: {
    temperature: number;    // Estimated 4" depth
    moisture: number;       // 0-100 scale
    moistureLevel: 'dry' | 'moderate' | 'moist' | 'saturated';
    lastRainDays: number;
    lastIrrigationDays?: number; // From user logs
  };
  growing: {
    gdd: {
      today: number;
      season: number;       // Accumulated since spring
      crops: {
        crop: string;
        accumulated: number;
        required: number;
        daysToMaturity: number;
      }[];
    };
    photoperiod: {
      sunrise: string;      // HH:mm
      sunset: string;
      daylightHours: number;
      twilightMinutes: number;
    };
    season: {
      name: 'spring' | 'summer' | 'fall' | 'winter';
      weekNumber: number;   // Week of growing season
      frostFreeDays: number;
      daysSinceLastFrost: number;
      daysUntilFirstFrost: number;
    };
  };
  forecast: {
    hourly: HourlyConditions[]; // Next 24 hours
    daily: DailyConditions[];   // Next 7 days
    alerts: WeatherAlert[];
  };
}

interface HourlyConditions {
  timestamp: string;
  temperature: number;
  precipitation: number;
  windSpeed: number;
  soilTemp: number;
  taskSuitability: {
    watering: number;    // 0-100 score
    planting: number;
    pruning: number;
    harvesting: number;
  };
}

interface DailyConditions {
  date: string;
  tempHigh: number;
  tempLow: number;
  precipitationChance: number;
  precipitationAmount: number;
  windSpeed: number;
  soilTempHigh: number;
  soilTempLow: number;
  frostRisk: number;    // 0-100 probability
  conditions: string;
}

interface WeatherAlert {
  type: 'frost' | 'heat' | 'storm' | 'drought';
  severity: 'watch' | 'warning' | 'advisory';
  title: string;
  description: string;
  start: string;
  end: string;
  gardeningImpact: string;
  recommendedActions: string[];
}
```

**Example Request**:
```bash
GET /api/grow/conditions?lat=37.5407&lon=-77.4360&zone=7b
```

**Example Response**:
```json
{
  "current": {
    "temperature": 68,
    "feelsLike": 68,
    "humidity": 55,
    "windSpeed": 3,
    "windDirection": 180,
    "precipitation": 0,
    "conditions": "Clear",
    "uvIndex": 7
  },
  "soil": {
    "temperature": 65,
    "moisture": 35,
    "moistureLevel": "moderate",
    "lastRainDays": 4
  },
  "growing": {
    "gdd": {
      "today": 18,
      "season": 456,
      "crops": [
        {
          "crop": "Tomato",
          "accumulated": 456,
          "required": 2500,
          "daysToMaturity": 58
        }
      ]
    },
    "photoperiod": {
      "sunrise": "06:23",
      "sunset": "20:14",
      "daylightHours": 13.85,
      "twilightMinutes": 35
    },
    "season": {
      "name": "spring",
      "weekNumber": 8,
      "frostFreeDays": 180,
      "daysSinceLastFrost": 35,
      "daysUntilFirstFrost": 145
    }
  },
  "forecast": {
    "hourly": [...],
    "daily": [...],
    "alerts": [
      {
        "type": "frost",
        "severity": "warning",
        "title": "Frost Warning Tonight",
        "description": "Temperatures will drop to 30°F overnight",
        "start": "2025-05-15T22:00:00Z",
        "end": "2025-05-16T08:00:00Z",
        "gardeningImpact": "Tender plants may be damaged or killed",
        "recommendedActions": [
          "Cover tender plants with frost cloth",
          "Move potted plants indoors",
          "Water soil before sunset to release heat overnight"
        ]
      }
    ]
  }
}
```

---

### GET `/api/grow/gdd`

Calculate Growing Degree Days for specific crops.

**Query Parameters**:
```typescript
interface GDDQueryParams {
  lat: number;
  lon: number;
  startDate: string;   // ISO date
  endDate?: string;    // Default: today
  baseTemp?: number;   // Default: 50°F
  crop?: string;       // Optional: get crop-specific base temp
}
```

**Response**:
```typescript
interface GDDResponse {
  accumulated: number;
  daily: {
    date: string;
    gdd: number;
    tempHigh: number;
    tempLow: number;
  }[];
  baseTemp: number;
  method: 'modified' | 'simple';
}
```

---

## Plant Data Endpoints

### GET `/api/grow/plants`

Get plant species database (public, no auth required).

**Query Parameters**:
```typescript
interface PlantsQueryParams {
  search?: string;       // Search by name
  category?: string;     // Filter by category
  zone?: string;         // Filter by hardiness zone
  limit?: number;        // Default: 50
  offset?: number;       // Pagination
}
```

**Response**:
```typescript
interface PlantsResponse {
  plants: PlantSpecies[];
  total: number;
  limit: number;
  offset: number;
}

// PlantSpecies type defined in implementation guide
```

---

### GET `/api/grow/plants/:speciesId`

Get detailed information about a specific plant species.

**Response**: Full `PlantSpecies` object with companion planting suggestions.

---

### GET `/api/grow/planting-calendar`

Get planting calendar for a specific zone and crop.

**Query Parameters**:
```typescript
interface PlantingCalendarParams {
  zone: string;
  speciesId?: string;    // Optional: specific plant
  year?: number;         // Default: current year
}
```

**Response**:
```typescript
interface PlantingCalendarResponse {
  zone: string;
  year: number;
  lastFrostDate: string;
  firstFrostDate: string;
  frostFreeDays: number;

  crops: {
    speciesId: string;
    commonName: string;

    // Key dates
    sowIndoorsStart: string;
    sowIndoorsEnd: string;
    transplantStart: string;
    transplantEnd: string;
    directSowStart: string;
    directSowEnd: string;
    harvestStart: string;
    harvestEnd: string;

    // Succession planting
    successionPlantingDays?: number;
    numberOfSuccessions?: number;
  }[];
}
```

---

## User Plant Endpoints

**Auth Required**: All endpoints require valid Supabase JWT.

### GET `/api/grow/user/plants`

Get user's plant inventory.

**Query Parameters**:
```typescript
interface UserPlantsQueryParams {
  archived?: boolean;    // Default: false (exclude archived)
  location?: string;     // Filter by location
  sortBy?: 'plantedDate' | 'commonName' | 'healthStatus';
  order?: 'asc' | 'desc';
}
```

**Response**:
```typescript
interface UserPlantsResponse {
  plants: UserPlant[];
  total: number;
  summary: {
    total: number;
    byCategory: Record<string, number>;
    byLocation: Record<string, number>;
    byHealthStatus: Record<string, number>;
  };
}

// UserPlant type defined in implementation guide
```

---

### POST `/api/grow/user/plants`

Add a new plant to user's garden.

**Request Body**:
```typescript
interface CreatePlantRequest {
  speciesId: string;
  variety?: string;
  nickname?: string;
  plantedDate: string;   // ISO date
  location: 'indoor' | 'outdoor' | 'greenhouse';
  bedName?: string;
  quantity: number;
  notes?: string;
  photos?: string[];     // Array of image URLs (upload images separately)
}
```

**Response**:
```typescript
interface CreatePlantResponse {
  plant: UserPlant;
  recommendations: {
    wateringSchedule: string;
    fertilizingSchedule: string;
    expectedHarvest: string;
    companions: string[];
  };
}
```

---

### PATCH `/api/grow/user/plants/:plantId`

Update a user plant.

**Request Body**: Partial `UserPlant` object (only fields to update).

---

### DELETE `/api/grow/user/plants/:plantId`

Delete or archive a user plant.

**Query Parameters**:
```typescript
interface DeletePlantParams {
  archive?: boolean;     // Default: true (soft delete)
}
```

---

### POST `/api/grow/user/plants/:plantId/tasks`

Log a task completed on a specific plant.

**Request Body**:
```typescript
interface LogTaskRequest {
  taskCode: string;      // e.g., "WATER", "FERTILIZE"
  completedAt?: string;  // Default: now
  notes?: string;
  photos?: string[];
}
```

**Response**:
```typescript
interface LogTaskResponse {
  taskLog: UserTaskLog;
  plantUpdated: UserPlant;  // With updated last_watered, etc.
  nextTasks: {
    taskCode: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}
```

---

### POST `/api/grow/user/plants/:plantId/harvest`

Log a harvest from a specific plant.

**Request Body**:
```typescript
interface LogHarvestRequest {
  quantity: number;
  units: 'lbs' | 'oz' | 'kg' | 'g' | 'count';
  harvestedAt?: string;  // Default: now
  notes?: string;
  photos?: string[];
}
```

**Response**:
```typescript
interface LogHarvestResponse {
  harvest: {
    date: string;
    quantity: number;
    units: string;
    notes: string;
  };
  plantUpdated: UserPlant;
  seasonTotal: {
    quantity: number;
    units: string;
    harvestCount: number;
  };
}
```

---

## Zone & Location Endpoints

### GET `/api/grow/zones`

Get hardiness zone database.

**Query Parameters**:
```typescript
interface ZonesQueryParams {
  lat?: number;
  lon?: number;
  zipCode?: string;
  search?: string;       // Search by region name
}
```

**Response**:
```typescript
interface ZonesResponse {
  zones: HardinessZone[];
  currentZone?: HardinessZone;  // If lat/lon or zipCode provided
}

// HardinessZone type defined in implementation guide
```

---

### GET `/api/grow/zones/:zone`

Get detailed information about a specific hardiness zone.

**Response**: Full `HardinessZone` object with frost dates and growing season info.

---

## Image Upload Endpoints

### POST `/api/grow/upload`

Upload plant photos (reuse Findr's image upload pattern).

**Request**: `multipart/form-data` with image file

**Response**:
```typescript
interface UploadResponse {
  url: string;
  thumbnail?: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}
```

---

## Cache Management Endpoints

### POST `/api/grow/cache/clear`

Clear task cache for user (admin/debug only).

**Request Body**:
```typescript
interface ClearCacheRequest {
  userId?: string;       // Admin only
  date?: string;         // Clear specific date
}
```

---

## Analytics Endpoints (Future)

### POST `/api/grow/analytics/task-completed`

Track task completion for analytics.

### POST `/api/grow/analytics/page-view`

Track page views.

---

## Error Handling

All endpoints follow consistent error format:

```typescript
interface ErrorResponse {
  error: string;         // Machine-readable error code
  message: string;       // Human-readable error message
  details?: unknown;     // Optional additional context
  timestamp: string;     // ISO timestamp
  requestId: string;     // For debugging
}
```

**Common Error Codes**:
- `INVALID_PARAMS` - Bad query parameters
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Missing or invalid auth
- `FORBIDDEN` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVICE_UNAVAILABLE` - External API error (weather, etc.)
- `INTERNAL_ERROR` - Unexpected server error

---

## Rate Limiting

Following Findr's pattern:

- **Anonymous**: 100 requests/hour per IP
- **Authenticated**: 1000 requests/hour per user
- **Task recommendations**: 60 requests/hour (cached, so rarely hit)
- **Image uploads**: 20 requests/hour

---

## Webhook Endpoints (Future)

### POST `/api/grow/webhooks/weather-alert`

Receive weather alerts from NOAA/external services.

### POST `/api/grow/webhooks/frost-alert`

Trigger frost warnings to users.

---

## Implementation Notes

### Reuse Patterns from Findr

1. **Caching**: Adapt `findr_prediction_sessions` pattern → `grow_task_cache`
2. **Error handling**: Reuse Findr's error middleware
3. **Auth**: Use existing Supabase auth helpers
4. **Response types**: Follow Findr's TypeScript patterns

### New Patterns Needed

1. **Weather calculations**: Soil temp, moisture, GDD
2. **Task scoring**: Algorithm implementation
3. **Calendar generation**: Zone-specific planting dates

### Performance Considerations

- Cache aggressively (6-hour task cache, 1-hour weather)
- Parallelize weather + plant data fetches
- Use Supabase indexes for fast queries
- Compress large responses (calendar, plant database)

---

## Testing Strategy

### Unit Tests
- Task scoring algorithm
- GDD calculations
- Soil moisture estimates

### Integration Tests
- Weather API failures
- Database transactions
- Cache behavior

### E2E Tests (Playwright)
- Task recommendations flow
- Plant CRUD operations
- Calendar generation

---

## API Versioning

**Current**: v1 (implicit, no version in URL)

**Future**: If breaking changes needed, use `/api/v2/grow/*`

---

**Document Status**: Complete - Ready for implementation
**Next Steps**: Implement `/api/grow/tasks` endpoint (highest priority)
