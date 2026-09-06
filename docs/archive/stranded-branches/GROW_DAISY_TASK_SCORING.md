# Grow Daisy Task Scoring Algorithm

**Purpose**: Calculate priority scores (0-100) for gardening tasks based on weather conditions, plant needs, seasonal timing, and forecast optimization.

**Inspiration**: Adapted from Findr's bite score algorithm (`lib/findr/mapPrediction.ts`)

---

## Scoring Overview

### Formula

```
Task Score = (Weather Window × 0.40)
           + (Plant Need × 0.30)
           + (Seasonal Timing × 0.20)
           + (Forecast Optimization × 0.10)
```

**Score Ranges**:
- **90-100**: 💯 Perfect - Do this now!
- **70-89**: ✅ Optimal - Great conditions
- **50-69**: 👍 Good - Suitable window
- **30-49**: 🤔 Fair - Okay but not ideal
- **0-29**: ⏸️ Wait - Poor conditions

**Urgency Levels** (for UI display):
- **Critical**: Score ≥ 90 + time-sensitive (e.g., frost tonight)
- **Optimal**: Score 80-89
- **Good**: Score 60-79
- **Neutral**: Score < 60

---

## Scoring Components

### 1. Weather Window Score (40% weight)

**Purpose**: Is today's weather ideal for this task?

#### 1.1 Watering Tasks

```typescript
function scoreWateringWindow(weather: WeatherData): number {
  let score = 100;

  // Temperature factor (optimal: 60-80°F)
  if (weather.temperature < 50) score -= 30; // Too cold
  if (weather.temperature > 90) score -= 20; // Too hot (high evaporation)
  if (weather.temperature >= 60 && weather.temperature <= 80) score += 0; // Perfect

  // Precipitation factor
  if (weather.precipitationToday > 0) score -= 50; // Don't water if raining
  if (weather.precipitationNext24h > 0.25) score -= 30; // Rain expected
  if (weather.precipitationNext48h > 0.5) score -= 20; // Heavy rain coming

  // Wind factor (optimal: < 10 mph)
  if (weather.windSpeed > 15) score -= 15; // High evaporation

  // Time of day bonus (if current hour available)
  const hour = new Date().getHours();
  if (hour >= 6 && hour <= 10) score += 10; // Morning optimal
  if (hour >= 17 && hour <= 20) score += 5; // Evening acceptable
  if (hour >= 11 && hour <= 16) score -= 15; // Midday bad (evaporation)

  // Soil moisture (from model)
  if (weather.soilMoisture === 'saturated') score -= 80;
  if (weather.soilMoisture === 'moist') score -= 40;
  if (weather.soilMoisture === 'moderate') score += 0;
  if (weather.soilMoisture === 'dry') score += 20;

  return Math.max(0, Math.min(100, score));
}
```

**Example**:
```javascript
// Scenario: 68°F, clear, no rain forecast, 8 AM, dry soil, 5 mph wind
score = 100 + 0 (temp) + 0 (rain) + 0 (wind) + 10 (morning) + 20 (dry) = 130 → capped at 100

// Scenario: 75°F, currently raining, moderate soil
score = 100 + 0 (temp) - 50 (raining) + 0 (wind) + 0 (soil) = 50
```

#### 1.2 Pruning Tasks

```typescript
function scorePruningWindow(weather: WeatherData): number {
  let score = 100;

  // Dry conditions critical (prevents disease)
  if (weather.precipitationToday > 0) score -= 60; // Wet foliage spreads disease
  if (weather.precipitationNext24h > 0) score -= 30; // Rain after pruning bad
  if (weather.humidity > 80) score -= 20; // High humidity = disease risk

  // Temperature (optimal: 50-75°F)
  if (weather.temperature < 40) score -= 20; // Too cold for plant recovery
  if (weather.temperature > 85) score -= 15; // Heat stress + wounds = bad

  // Wind (optimal: < 15 mph)
  if (weather.windSpeed > 20) score -= 25; // Safety issue + plant stress

  // Time of year boost (if seasonal data available)
  if (isDormantSeason(weather.date)) score += 10; // Dormant pruning ideal

  return Math.max(0, Math.min(100, score));
}
```

#### 1.3 Planting/Transplanting Tasks

```typescript
function scorePlantingWindow(weather: WeatherData): number {
  let score = 100;

  // Soil temperature (critical for germination)
  const soilTemp = weather.soilTemperature;
  if (soilTemp < 50) score -= 50; // Too cold for most crops
  if (soilTemp < 60) score -= 20; // Marginal
  if (soilTemp >= 60 && soilTemp <= 75) score += 10; // Optimal
  if (soilTemp > 80) score -= 15; // Too hot

  // Soil moisture (optimal: moderate to moist)
  if (weather.soilMoisture === 'dry') score -= 30; // Hard to plant
  if (weather.soilMoisture === 'moderate') score += 10;
  if (weather.soilMoisture === 'moist') score += 15;
  if (weather.soilMoisture === 'saturated') score -= 40; // Muddy, compaction risk

  // Air temperature (optimal: 60-80°F)
  if (weather.temperature < 50) score -= 25; // Transplant shock
  if (weather.temperature > 85) score -= 30; // Heat stress

  // Overcast is better (less transplant shock)
  if (weather.conditions === 'Clouds') score += 10;
  if (weather.conditions === 'Clear') score -= 5; // Full sun stressful

  // Recent rain is good (settled soil)
  if (weather.daysSinceRain === 1) score += 15;
  if (weather.daysSinceRain > 5) score -= 10;

  // Upcoming weather
  if (weather.precipitationNext24h > 0.5) score -= 20; // Heavy rain = washout risk
  if (weather.precipitationNext48h > 0.1 && weather.precipitationNext48h < 0.3) {
    score += 10; // Light rain after planting = good establishment
  }

  // Wind (optimal: < 10 mph for transplants)
  if (weather.windSpeed > 15) score -= 20; // Drying + physical stress

  return Math.max(0, Math.min(100, score));
}
```

#### 1.4 Harvesting Tasks

```typescript
function scoreHarvestingWindow(weather: WeatherData): number {
  let score = 100;

  // Dry conditions preferred (storage, cleanliness)
  if (weather.precipitationToday > 0) score -= 40; // Wet produce = rot risk
  if (weather.precipitationNext24h > 0) score -= 20; // Want to dry/store

  // Temperature (optimal: 60-80°F for working comfort)
  if (weather.temperature < 50) score -= 15;
  if (weather.temperature > 90) score -= 25;

  // Time of day (morning after dew dries)
  const hour = new Date().getHours();
  if (hour >= 8 && hour <= 12) score += 15; // Morning optimal
  if (hour >= 5 && hour <= 7) score -= 10; // Too early (dewy)

  return Math.max(0, Math.min(100, score));
}
```

#### 1.5 Pest Control Tasks

```typescript
function scorePestControlWindow(weather: WeatherData): number {
  let score = 100;

  // Calm, dry conditions (for spray application)
  if (weather.windSpeed > 10) score -= 40; // Drift risk
  if (weather.precipitationToday > 0) score -= 50; // Washes off treatment
  if (weather.precipitationNext24h > 0.2) score -= 30; // Need time to dry

  // Temperature (optimal for pest activity + treatment efficacy)
  if (weather.temperature < 55) score -= 20; // Pests less active
  if (weather.temperature > 85) score -= 15; // Some treatments degrade
  if (weather.temperature >= 65 && weather.temperature <= 80) score += 10;

  // Time of day (evening best - less beneficial insect activity)
  const hour = new Date().getHours();
  if (hour >= 17 && hour <= 20) score += 15;
  if (hour >= 8 && hour <= 16) score -= 10; // Pollinators active

  return Math.max(0, Math.min(100, score));
}
```

---

### 2. Plant Need Score (30% weight)

**Purpose**: How urgently does the plant need this task?

#### 2.1 Watering Need

```typescript
function scorePlantWateringNeed(plant: UserPlant, species: PlantSpecies): number {
  let score = 0;

  // Days since last watering
  const daysSinceWatering = plant.lastWatered
    ? daysBetween(plant.lastWatered, today())
    : 999;

  // Species watering frequency
  const frequencyMap = {
    'daily': 1,
    'twice-weekly': 3,
    'weekly': 7,
    'biweekly': 14
  };
  const expectedInterval = frequencyMap[species.wateringFrequency];

  // Calculate need
  if (daysSinceWatering >= expectedInterval * 1.5) score = 100; // Overdue
  else if (daysSinceWatering >= expectedInterval) score = 80;   // Due
  else if (daysSinceWatering >= expectedInterval * 0.8) score = 60; // Soon
  else score = 20; // Not needed yet

  // Growth stage multiplier
  if (plant.currentStage === 'flowering' || plant.currentStage === 'fruiting') {
    score *= 1.2; // Critical stages need consistent moisture
  }
  if (plant.currentStage === 'dormant') {
    score *= 0.5; // Less water needed
  }

  // Species moisture preference
  if (species.moisturePreference === 'wet') score *= 1.3;
  if (species.moisturePreference === 'dry') score *= 0.7;

  return Math.min(100, score);
}
```

**Example**:
```javascript
// Tomato (twice-weekly watering), fruiting stage, last watered 4 days ago
expectedInterval = 3.5 days
daysSince = 4 days
baseScore = 80 (overdue)
stageMultiplier = 1.2 (fruiting)
finalScore = 80 * 1.2 = 96
```

#### 2.2 Pruning/Maintenance Need

```typescript
function scorePlantPruningNeed(plant: UserPlant, species: PlantSpecies): number {
  if (!species.pruningRequired) return 0;

  let score = 0;

  // Days since last pruning
  const daysSincePruning = plant.lastPruned
    ? daysBetween(plant.lastPruned, today())
    : 999;

  // Growth stage factor
  if (plant.currentStage === 'vegetative') score = 70; // Shaping critical
  if (plant.currentStage === 'flowering') score = 40;  // Light deadheading
  if (plant.currentStage === 'fruiting') score = 60;   // Sucker removal
  if (plant.currentStage === 'dormant') score = 90;    // Major pruning time

  // Time since last pruning
  if (daysSincePruning < 14) score *= 0.3;  // Too soon
  if (daysSincePruning >= 30) score *= 1.2; // Overdue

  // Health status (diseased plants need pruning)
  if (plant.healthStatus === 'poor') score += 20;

  return Math.min(100, score);
}
```

#### 2.3 Fertilizing Need

```typescript
function scorePlantFertilizingNeed(plant: UserPlant, species: PlantSpecies): number {
  let score = 0;

  // Days since last fertilizing
  const daysSinceFertilizing = plant.lastFertilized
    ? daysBetween(plant.lastFertilized, today())
    : 60; // Assume 60 days if never tracked

  // Species frequency
  const frequencyMap = {
    'weekly': 7,
    'biweekly': 14,
    'monthly': 30
  };
  const expectedInterval = frequencyMap[species.fertilizingFrequency];

  if (daysSinceFertilizing >= expectedInterval * 1.3) score = 90;
  else if (daysSinceFertilizing >= expectedInterval) score = 70;
  else if (daysSinceFertilizing >= expectedInterval * 0.8) score = 50;
  else score = 10;

  // Growth stage boost
  if (plant.currentStage === 'vegetative') score *= 1.3; // Heavy feeder
  if (plant.currentStage === 'flowering') score *= 1.2;  // Blooming boost
  if (plant.currentStage === 'fruiting') score *= 1.2;   // Fruit development
  if (plant.currentStage === 'dormant') score *= 0.2;    // Minimal feeding

  return Math.min(100, score);
}
```

#### 2.4 Harvesting Need

```typescript
function scorePlantHarvestingNeed(plant: UserPlant, species: PlantSpecies): number {
  if (plant.currentStage !== 'fruiting') return 0;

  let score = 0;

  // Days since planting + days to maturity
  const daysSincePlanting = daysBetween(plant.plantedDate, today());
  const daysToMaturity = species.daysToMaturity;

  if (daysSincePlanting >= daysToMaturity * 1.1) score = 100; // Overripe risk
  else if (daysSincePlanting >= daysToMaturity) score = 90;   // Ready now
  else if (daysSincePlanting >= daysToMaturity * 0.95) score = 70; // Almost ready
  else score = 20; // Not ready

  // Days since last harvest (for continuous harvest crops)
  const daysSinceHarvest = plant.lastHarvested
    ? daysBetween(plant.lastHarvested, today())
    : 999;

  if (daysSinceHarvest >= 7) score += 20; // Likely ripe produce

  return Math.min(100, score);
}
```

---

### 3. Seasonal Timing Score (20% weight)

**Purpose**: Is this the right time of year for this task?

```typescript
function scoreSeasonalTiming(
  taskCode: string,
  date: Date,
  zone: HardinessZone,
  species?: PlantSpecies
): number {
  const currentMonth = date.getMonth() + 1; // 1-12
  const daysSinceLastFrost = daysBetween(zone.lastFrostDate, date);
  const daysUntilFirstFrost = daysBetween(date, zone.firstFrostDate);

  let score = 50; // Neutral baseline

  // Task-specific seasonal scoring
  switch (taskCode) {
    case 'PLANT_SEEDS':
    case 'TRANSPLANT':
      // Check if within planting window for species
      if (species) {
        const plantingStart = addWeeks(zone.lastFrostDate, species.transplantWeeksAfter);
        const plantingEnd = addWeeks(zone.firstFrostDate, -species.daysToMaturity / 7);

        if (isDateInRange(date, plantingStart, plantingEnd)) {
          score = 100; // Perfect window
        } else if (isDateInRange(date, addWeeks(plantingStart, -2), addWeeks(plantingEnd, 2))) {
          score = 60; // Close to window
        } else {
          score = 10; // Wrong season
        }
      }
      break;

    case 'PRUNE_DORMANT':
      // Dormant pruning (late winter/early spring)
      if (currentMonth >= 2 && currentMonth <= 3 && daysSinceLastFrost < 0) {
        score = 100; // Perfect: before bud break
      } else if (currentMonth === 1 || currentMonth === 4) {
        score = 70; // Acceptable
      } else {
        score = 20; // Wrong season
      }
      break;

    case 'PRUNE_SUMMER':
      // Summer pruning (mid-summer)
      if (currentMonth >= 6 && currentMonth <= 8) {
        score = 100;
      } else {
        score = 30;
      }
      break;

    case 'WATER':
    case 'FERTILIZE':
      // Growing season tasks (after last frost, before first frost)
      if (daysSinceLastFrost >= 0 && daysUntilFirstFrost >= 30) {
        score = 100; // Active growing season
      } else if (daysUntilFirstFrost < 30 && daysUntilFirstFrost >= 0) {
        score = 60; // End of season
      } else {
        score = 20; // Dormant season
      }
      break;

    case 'HARVEST':
      // Check if within harvest window
      if (species) {
        const harvestStart = addDays(zone.lastFrostDate, species.daysToMaturity);
        const harvestEnd = zone.firstFrostDate;

        if (isDateInRange(date, harvestStart, harvestEnd)) {
          score = 100;
        } else {
          score = 10;
        }
      }
      break;

    case 'MULCH':
      // Spring or fall mulching
      if (currentMonth === 4 || currentMonth === 5) score = 100; // Spring
      if (currentMonth === 10 || currentMonth === 11) score = 90; // Fall
      break;

    case 'COMPOST_SPREAD':
      // Best in fall or early spring
      if (currentMonth === 3 || currentMonth === 4) score = 100; // Spring
      if (currentMonth === 10 || currentMonth === 11) score = 95; // Fall
      break;
  }

  return Math.max(0, Math.min(100, score));
}
```

---

### 4. Forecast Optimization Score (10% weight)

**Purpose**: Will conditions get worse soon? Should we act now?

```typescript
function scoreForecastOptimization(
  taskCode: string,
  currentWeather: WeatherData,
  forecast: DailyWeather[]
): number {
  let score = 50; // Neutral baseline

  const next3Days = forecast.slice(0, 3);
  const next7Days = forecast.slice(0, 7);

  switch (taskCode) {
    case 'WATER':
      // Check for incoming rain
      const rainNext3Days = next3Days.some(day => day.precipitation > 0.25);
      if (rainNext3Days) {
        score = 20; // Can wait, rain coming
      } else {
        const dryStreak = next7Days.filter(day => day.precipitation < 0.1).length;
        if (dryStreak >= 5) score = 90; // Dry spell = water now
      }
      break;

    case 'PRUNE':
    case 'SPRAY_PESTICIDE':
      // Need dry conditions
      const dryDaysAhead = next3Days.filter(
        day => day.precipitation === 0 && day.humidity < 70
      ).length;
      if (dryDaysAhead >= 2) score = 80; // Good window
      if (dryDaysAhead === 0) score = 30; // Wet forecast
      break;

    case 'PLANT_SEEDS':
    case 'TRANSPLANT':
      // Check for frost risk
      const frostRisk = next7Days.some(day => day.tempLow < 35);
      if (frostRisk) score = 10; // Frost coming, don't plant

      // Check for heat wave
      const heatWave = next3Days.filter(day => day.tempHigh > 90).length >= 2;
      if (heatWave) score = 20; // Wait for cooler weather

      // Ideal: stable moderate temps + light rain in 2-3 days
      const stableWeather = next3Days.every(
        day => day.tempHigh >= 60 && day.tempHigh <= 80
      );
      const lightRainDay3 = forecast[2]?.precipitation > 0.1 && forecast[2]?.precipitation < 0.3;
      if (stableWeather && lightRainDay3) score = 100; // Perfect setup
      break;

    case 'HARVEST':
      // Rain forecast = harvest now
      const rainSoon = next3Days.some(day => day.precipitation > 0.5);
      if (rainSoon) score = 95; // Get it before rain
      break;

    case 'PROTECT_FROM_FROST':
      // Frost alert!
      const frostTonight = forecast[0]?.tempLow < 32;
      if (frostTonight) score = 100; // URGENT
      break;
  }

  return Math.max(0, Math.min(100, score));
}
```

---

## Complete Task Scoring Function

```typescript
interface TaskScore {
  taskId: string;
  taskCode: string;
  score: number; // Final 0-100 score
  urgency: 'critical' | 'optimal' | 'good' | 'neutral';
  reasoning: string[];
  weatherFactors: {
    temperatureScore: number;
    moistureScore: number;
    windScore: number;
    timingScore: number;
  };
  breakdown: {
    weatherWindow: number;
    plantNeed: number;
    seasonalTiming: number;
    forecastOptimization: number;
  };
}

function calculateTaskScore(
  task: TaskDefinition,
  plant: UserPlant | null,
  species: PlantSpecies | null,
  weather: WeatherData,
  forecast: DailyWeather[],
  zone: HardinessZone,
  date: Date
): TaskScore {
  // 1. Weather Window Score (40%)
  let weatherScore = 0;
  switch (task.category) {
    case 'watering':
      weatherScore = scoreWateringWindow(weather);
      break;
    case 'pruning':
      weatherScore = scorePruningWindow(weather);
      break;
    case 'planting':
      weatherScore = scorePlantingWindow(weather);
      break;
    case 'harvesting':
      weatherScore = scoreHarvestingWindow(weather);
      break;
    case 'pest-control':
      weatherScore = scorePestControlWindow(weather);
      break;
    default:
      weatherScore = 70; // Neutral for other tasks
  }

  // 2. Plant Need Score (30%)
  let needScore = 50; // Default if no plant specified
  if (plant && species) {
    switch (task.category) {
      case 'watering':
        needScore = scorePlantWateringNeed(plant, species);
        break;
      case 'pruning':
        needScore = scorePlantPruningNeed(plant, species);
        break;
      case 'feeding':
        needScore = scorePlantFertilizingNeed(plant, species);
        break;
      case 'harvesting':
        needScore = scorePlantHarvestingNeed(plant, species);
        break;
    }
  }

  // 3. Seasonal Timing Score (20%)
  const seasonalScore = scoreSeasonalTiming(task.code, date, zone, species);

  // 4. Forecast Optimization Score (10%)
  const forecastScore = scoreForecastOptimization(task.code, weather, forecast);

  // Calculate final weighted score
  const finalScore = Math.round(
    (weatherScore * 0.40) +
    (needScore * 0.30) +
    (seasonalScore * 0.20) +
    (forecastScore * 0.10)
  );

  // Determine urgency level
  let urgency: 'critical' | 'optimal' | 'good' | 'neutral';
  if (finalScore >= 90 && isCriticalTask(task.code)) urgency = 'critical';
  else if (finalScore >= 80) urgency = 'optimal';
  else if (finalScore >= 60) urgency = 'good';
  else urgency = 'neutral';

  // Build reasoning array
  const reasoning = buildTaskReasoning(
    task,
    weatherScore,
    needScore,
    seasonalScore,
    forecastScore,
    weather,
    plant,
    zone
  );

  return {
    taskId: generateTaskId(),
    taskCode: task.code,
    score: finalScore,
    urgency,
    reasoning,
    weatherFactors: extractWeatherFactors(weather, weatherScore),
    breakdown: {
      weatherWindow: weatherScore,
      plantNeed: needScore,
      seasonalTiming: seasonalScore,
      forecastOptimization: forecastScore
    }
  };
}

function buildTaskReasoning(
  task: TaskDefinition,
  weatherScore: number,
  needScore: number,
  seasonalScore: number,
  forecastScore: number,
  weather: WeatherData,
  plant: UserPlant | null,
  zone: HardinessZone
): string[] {
  const reasons: string[] = [];

  // Weather reasons
  if (weatherScore >= 80) {
    reasons.push(`Perfect weather conditions (${weather.conditions}, ${weather.temperature}°F)`);
  } else if (weatherScore < 40) {
    reasons.push(`Poor weather for this task (${weather.conditions})`);
  }

  // Plant need reasons
  if (needScore >= 80 && plant) {
    const daysSince = plant.lastWatered ? daysBetween(plant.lastWatered, today()) : 0;
    reasons.push(`${plant.commonName} needs attention (${daysSince} days since last ${task.category})`);
  }

  // Seasonal reasons
  if (seasonalScore >= 90) {
    reasons.push(`Optimal time of year for this task`);
  } else if (seasonalScore < 40) {
    reasons.push(`Not the ideal season for this task`);
  }

  // Forecast reasons
  if (forecastScore >= 80) {
    reasons.push(`Conditions will worsen soon - act now`);
  } else if (forecastScore < 40) {
    reasons.push(`Better conditions expected soon - can wait`);
  }

  // Add specific context
  if (task.code === 'WATER' && weather.soilMoisture === 'dry') {
    reasons.push(`Soil is dry - plants need moisture`);
  }

  if (task.code === 'PROTECT_FROM_FROST' && weather.tempMin < 35) {
    reasons.push(`⚠️ FROST WARNING: Protect tender plants tonight!`);
  }

  return reasons;
}
```

---

## Example Calculations

### Example 1: Watering Tomatoes

**Input**:
- Date: May 15, 2025, 8:00 AM
- Location: Richmond, VA (Zone 7b)
- Weather: 68°F, Clear, No rain, 5 mph wind, Soil: Dry
- Plant: Tomato 'Brandywine', fruiting stage, last watered 4 days ago (due at 3.5 days)
- Forecast: Dry for next 5 days

**Calculation**:
```
1. Weather Window Score:
   Base: 100
   Temperature (68°F, optimal): +0
   Precipitation (none): +0
   Wind (5 mph): +0
   Time of day (8 AM): +10
   Soil moisture (dry): +20
   = 130 → capped at 100

2. Plant Need Score:
   Days since watering: 4 (overdue at 3.5)
   Base score: 80
   Growth stage multiplier (fruiting): ×1.2
   = 96

3. Seasonal Timing Score:
   Date: May 15 (growing season)
   Days since last frost: 35
   Days until first frost: 145
   = 100 (active growing season)

4. Forecast Optimization Score:
   Dry for next 5 days
   = 90 (water now, dry spell ahead)

Final Score:
(100 × 0.40) + (96 × 0.30) + (100 × 0.20) + (90 × 0.10)
= 40 + 28.8 + 20 + 9
= 97.8 → 98

Urgency: Optimal
```

**Result**: **98/100** - Perfect time to water!

---

### Example 2: Pruning Roses

**Input**:
- Date: June 10, 2025, 2:00 PM
- Weather: 75°F, Clear, Humidity 45%, 3 mph wind
- Plant: Rose, flowering stage, last pruned 18 days ago
- Forecast: Dry for 2 days, then light rain

**Calculation**:
```
1. Weather Window Score:
   Base: 100
   Precipitation (none): +0
   Rain forecast (+24h none): +0
   Humidity (45%): +0
   Temperature (75°F): +0
   Wind (3 mph): +0
   = 100

2. Plant Need Score:
   Flowering stage: Base 40
   Days since pruning: 18
   Time multiplier: ×0.7 (not urgent yet)
   = 28

3. Seasonal Timing Score:
   June (summer pruning acceptable)
   = 70

4. Forecast Optimization Score:
   Dry for 2 days (good for wound healing)
   = 80

Final Score:
(100 × 0.40) + (28 × 0.30) + (70 × 0.20) + (80 × 0.10)
= 40 + 8.4 + 14 + 8
= 70.4 → 70

Urgency: Good
```

**Result**: **70/100** - Good conditions for pruning.

---

### Example 3: Transplanting Seedlings

**Input**:
- Date: April 20, 2025
- Weather: 55°F, Overcast, Light rain yesterday, Soil temp 58°F, Soil moist
- Species: Tomato seedlings, 6 weeks old (ready to transplant)
- Zone 7b: Last frost = May 1 (11 days away)
- Forecast: Stable 60-70°F next 7 days, light rain in 3 days

**Calculation**:
```
1. Weather Window Score:
   Base: 100
   Soil temperature (58°F): -20 (marginal)
   Soil moisture (moist): +15
   Air temperature (55°F): -10 (bit cold)
   Overcast: +10 (reduces transplant shock)
   Days since rain (1): +15
   Forecast (light rain day 3): +10
   = 120 → capped at 100

2. Plant Need Score:
   Seedlings ready: 80
   (Not plant-specific, based on seedling age)

3. Seasonal Timing Score:
   Date: April 20
   Last frost: May 1 (11 days away)
   Within planting window? Marginal (frost risk)
   = 60

4. Forecast Optimization Score:
   No frost in forecast: +30
   Stable temps: +20
   Light rain day 3: +20
   = 70

Final Score:
(100 × 0.40) + (80 × 0.30) + (60 × 0.20) + (70 × 0.10)
= 40 + 24 + 12 + 7
= 83

Urgency: Optimal
```

**Result**: **83/100** - Good time to transplant, but watch for late frost!

---

## Edge Cases & Special Handling

### 1. Critical Tasks (Override Normal Scoring)

Certain tasks are time-sensitive and override normal scoring:

```typescript
function isCriticalTask(taskCode: string, weather: WeatherData): boolean {
  // Frost protection
  if (taskCode === 'PROTECT_FROM_FROST' && weather.tempMin < 35) return true;

  // Harvest before storm
  if (taskCode === 'HARVEST' && weather.precipitationNext24h > 1.0) return true;

  // Emergency watering
  if (taskCode === 'WATER' && weather.temperature > 95 && weather.soilMoisture === 'dry') return true;

  return false;
}
```

### 2. User Overrides

Allow users to:
- Snooze tasks (lower score temporarily)
- Mark as completed (remove from recommendations)
- Manually prioritize (boost score)

### 3. Multi-Plant Tasks

When task applies to multiple plants, use highest need score:

```typescript
function scoreMultiPlantTask(plants: UserPlant[]): number {
  return Math.max(...plants.map(p => scorePlantWateringNeed(p, p.species)));
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Task Scoring', () => {
  it('should score watering high in dry conditions', () => {
    const score = scoreWateringWindow({
      temperature: 70,
      soilMoisture: 'dry',
      precipitation: 0,
      windSpeed: 5
    });
    expect(score).toBeGreaterThan(90);
  });

  it('should score watering low when raining', () => {
    const score = scoreWateringWindow({
      temperature: 70,
      soilMoisture: 'saturated',
      precipitation: 0.5,
      windSpeed: 5
    });
    expect(score).toBeLessThan(40);
  });
});
```

### Integration Tests

```typescript
describe('Full Task Calculation', () => {
  it('should recommend watering overdue tomatoes', async () => {
    const tasks = await calculateTasks({
      zone: '7b',
      date: '2025-05-15',
      userId: 'test-user',
      lat: 37.5407,
      lon: -77.4360
    });

    const wateringTask = tasks.find(t => t.taskCode === 'WATER');
    expect(wateringTask.score).toBeGreaterThan(85);
    expect(wateringTask.urgency).toBe('optimal');
  });
});
```

---

## Performance Optimization

1. **Cache weather data** (1 hour TTL)
2. **Cache task calculations** (6 hour TTL per user)
3. **Batch database queries** (fetch all user plants once)
4. **Parallelize** weather + plant data fetching
5. **Limit task list** (top 20 tasks per day)

---

## Future Enhancements

1. **Machine Learning**: Learn from user behavior (which tasks they complete)
2. **Pest Prediction**: Integrate pest pressure models
3. **Yield Optimization**: Score tasks based on expected harvest improvement
4. **Social Learning**: Recommend tasks based on successful local gardeners
5. **IoT Integration**: Use real soil moisture sensors (no estimation)

---

**Document Status**: Complete
**Next Steps**: Implement scoring functions in `/lib/grow/taskScoring.ts`
