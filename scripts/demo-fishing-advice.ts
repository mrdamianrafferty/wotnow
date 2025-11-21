#!/usr/bin/env tsx
/**
 * Demo script showing tactical vs strategic fishing advice
 *
 * Run: npx tsx scripts/demo-fishing-advice.ts
 */

import { generateTacticalAdvice, generateStrategicAdvice, type SpeciesWithPreferences } from '../lib/findr/generateFishingAdvice';
import type { ApproachConditions } from '../lib/findr/scoreSpeciesApproach';
import type { TideExtreme } from '../lib/findr/conditionHelpers';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '━'.repeat(80));
  log(title, colors.bright + colors.blue);
  console.log('━'.repeat(80) + '\n');
}

// Mock species predictions
const speciesPredictions: SpeciesWithPreferences[] = [
  {
    species_code: 'BSS',
    name_en: 'Sea Bass',
    preferred_habitats: ['rocky_shore', 'sandy_beach', 'pier_harbor', 'estuary'],
    effective_techniques: ['SPN', 'BOT', 'SURF', 'FLY'],
    recommended_baits: ['🦀 Crab', '🐟 Fish baits', '🪱 Worms'],
    confidence_score: 85,
  },
  {
    species_code: 'MAC',
    name_en: 'Mackerel',
    preferred_habitats: ['pier_harbor', 'open_sea', 'rocky_shore'],
    effective_techniques: ['SPN', 'SAB', 'FLF'],
    recommended_baits: ['🪶 Feather rigs', '💫 Spinners'],
    confidence_score: 78,
  },
  {
    species_code: 'FLE',
    name_en: 'Flounder',
    preferred_habitats: ['sandy_beach', 'estuary', 'shallow_water'],
    effective_techniques: ['BOT', 'SURF'],
    recommended_baits: ['🪱 Worms', '🦐 Prawns'],
    confidence_score: 72,
  },
  {
    species_code: 'SQC',
    name_en: 'Squid',
    preferred_habitats: ['pier_harbor', 'shallow_water'],
    effective_techniques: ['EGI', 'SAB'],
    recommended_baits: ['⥿ Egis'],
    confidence_score: 65,
  },
];

// Mock tide data
const mockTideData: TideExtreme[] = [
  { time: '2025-11-20T06:15:00Z', type: 'low', height: 0.9 },
  { time: '2025-11-20T12:30:00Z', type: 'high', height: 4.3 },
  { time: '2025-11-20T18:45:00Z', type: 'low', height: 1.1 },
  { time: '2025-11-21T00:50:00Z', type: 'high', height: 4.5 },
];

// ============================================================================
// SCENARIO 1: EXCELLENT CONDITIONS (Dawn, flooding tide, good weather)
// ============================================================================

logSection('SCENARIO 1: RIGHT NOW - Excellent Conditions');

const excellentConditions: ApproachConditions = {
  wind_speed_kts: 8,
  wave_height_m: 0.6,
  current_speed_ms: 0.4,
  kd490: 0.15,
  tide_stage: 'flooding',
  time_of_day: 'dawn',
  sea_temp_c: 16,
};

const tacticalExcellent = generateTacticalAdvice(
  speciesPredictions,
  excellentConditions,
  mockTideData,
  { name: 'Portland Bill', lat: 50.5, lon: -2.5 }
);

log('🎯 TACTICAL ADVICE (Go Now)', colors.bright + colors.green);
console.log('');
log(`Urgency: ${tacticalExcellent.urgency.toUpperCase().replace('_', ' ')}`,
    tacticalExcellent.urgency === 'go_now' ? colors.bright + colors.green : colors.yellow);
log(`Summary: ${tacticalExcellent.summary}`, colors.cyan);
console.log('');

log('Current Conditions:', colors.yellow);
console.log(`  Tide: ${tacticalExcellent.currentConditions.tideStage}`);
console.log(`  Time: ${tacticalExcellent.currentConditions.timeOfDay}`);
console.log(`  Wind: ${tacticalExcellent.currentConditions.windSpeed}kts`);
console.log(`  Waves: ${tacticalExcellent.currentConditions.waveHeight}m`);
if (tacticalExcellent.currentConditions.nextTideChange) {
  console.log(`  Next: ${tacticalExcellent.currentConditions.nextTideChange}`);
}
console.log('');

log('Top Species Right Now:', colors.yellow);
for (let i = 0; i < tacticalExcellent.topSpecies.length; i++) {
  const sp = tacticalExcellent.topSpecies[i];
  console.log(`  ${i + 1}. ${sp.name} (Approach: ${sp.approachScore}/100)`);
  console.log(`     ${sp.recommendation}`);
  console.log(`     ${sp.explanation}`);
  console.log('');
}

log('🎣 ACTION PLAN:', colors.bright + colors.green);
tacticalExcellent.actionableSteps.forEach((step, i) => {
  console.log(`  ${i + 1}. ${step}`);
});

// ============================================================================
// SCENARIO 2: TOUGH CONDITIONS (Slack tide, midday, calm)
// ============================================================================

logSection('SCENARIO 2: RIGHT NOW - Tough Conditions');

const toughConditions: ApproachConditions = {
  wind_speed_kts: 3,
  wave_height_m: 0.2,
  current_speed_ms: 0.05,
  kd490: 0.10,
  tide_stage: 'high_slack',
  time_of_day: 'day',
  sea_temp_c: 17,
};

const tacticalTough = generateTacticalAdvice(
  speciesPredictions,
  toughConditions,
  mockTideData,
  { name: 'Portland Bill', lat: 50.5, lon: -2.5 }
);

log('🎯 TACTICAL ADVICE (Go Now)', colors.bright + colors.yellow);
console.log('');
log(`Urgency: ${tacticalTough.urgency.toUpperCase().replace('_', ' ')}`,
    tacticalTough.urgency === 'wait' ? colors.yellow : colors.red);
log(`Summary: ${tacticalTough.summary}`, colors.cyan);
console.log('');

log('Current Conditions:', colors.yellow);
console.log(`  Tide: ${tacticalTough.currentConditions.tideStage}`);
console.log(`  Time: ${tacticalTough.currentConditions.timeOfDay}`);
console.log(`  Wind: ${tacticalTough.currentConditions.windSpeed}kts`);
console.log(`  Waves: ${tacticalTough.currentConditions.waveHeight}m`);
if (tacticalTough.currentConditions.nextTideChange) {
  console.log(`  Next: ${tacticalTough.currentConditions.nextTideChange}`);
}
console.log('');

log('🎣 RECOMMENDATION:', colors.yellow);
tacticalTough.actionableSteps.forEach((step, i) => {
  console.log(`  ${i + 1}. ${step}`);
});

// ============================================================================
// SCENARIO 3: STRATEGIC ADVICE - Planning for Sunday
// ============================================================================

logSection('SCENARIO 3: STRATEGIC ADVICE - Planning Sunday Sea Bass Session');

// Generate hourly conditions for Sunday
const sundayConditions = [
  // Dawn
  { time: new Date('2025-11-24T06:00:00Z'), conditions: { ...excellentConditions, time_of_day: 'dawn' as const, tide_stage: 'flooding' as const } },
  { time: new Date('2025-11-24T07:00:00Z'), conditions: { ...excellentConditions, time_of_day: 'day' as const, tide_stage: 'flooding' as const } },

  // Morning
  { time: new Date('2025-11-24T09:00:00Z'), conditions: { wind_speed_kts: 10, wave_height_m: 0.8, current_speed_ms: 0.5, kd490: 0.18, tide_stage: 'high_slack' as const, time_of_day: 'day' as const, sea_temp_c: 16 } },
  { time: new Date('2025-11-24T11:00:00Z'), conditions: { wind_speed_kts: 12, wave_height_m: 1.0, current_speed_ms: 0.4, kd490: 0.20, tide_stage: 'ebbing' as const, time_of_day: 'day' as const, sea_temp_c: 17 } },

  // Afternoon
  { time: new Date('2025-11-24T14:00:00Z'), conditions: { wind_speed_kts: 15, wave_height_m: 1.2, current_speed_ms: 0.3, kd490: 0.25, tide_stage: 'low_slack' as const, time_of_day: 'day' as const, sea_temp_c: 17 } },
  { time: new Date('2025-11-24T16:00:00Z'), conditions: { wind_speed_kts: 12, wave_height_m: 1.0, current_speed_ms: 0.5, kd490: 0.22, tide_stage: 'flooding' as const, time_of_day: 'day' as const, sea_temp_c: 16 } },

  // Evening/Dusk
  { time: new Date('2025-11-24T18:00:00Z'), conditions: { wind_speed_kts: 10, wave_height_m: 0.8, current_speed_ms: 0.6, kd490: 0.18, tide_stage: 'flooding' as const, time_of_day: 'dusk' as const, sea_temp_c: 16 } },
  { time: new Date('2025-11-24T19:00:00Z'), conditions: { wind_speed_kts: 8, wave_height_m: 0.6, current_speed_ms: 0.5, kd490: 0.15, tide_stage: 'high_slack' as const, time_of_day: 'dusk' as const, sea_temp_c: 15 } },
];

const strategicSeaBass = generateStrategicAdvice(
  speciesPredictions[0], // Sea Bass
  sundayConditions,
  'Sunday, Nov 24'
);

log('📅 STRATEGIC ADVICE (Planning Ahead)', colors.bright + colors.cyan);
console.log('');
log(`Target Species: ${strategicSeaBass.targetSpecies}`, colors.yellow);
log(`Timeframe: ${strategicSeaBass.timeframe}`, colors.yellow);
log(`Summary: ${strategicSeaBass.summary}`, colors.cyan);
console.log('');

log('⏰ Best Fishing Windows:', colors.yellow);
for (const window of strategicSeaBass.bestWindows) {
  console.log(`  • ${window.date} at ${window.time}`);
  console.log(`    Score: ${window.score}/100`);
  console.log(`    Why: ${window.reason}`);
  console.log('');
}

log('🎯 Recommended Approaches:', colors.yellow);
for (const approach of strategicSeaBass.recommendedApproaches) {
  console.log(`  • ${approach.technique} from ${approach.habitat} (${approach.score}/100)`);
  console.log(`    ${approach.whenBest}`);
}
console.log('');

log('🪱 Recommended Baits:', colors.yellow);
for (const bait of strategicSeaBass.recommendedBaits) {
  console.log(`  • ${bait.bait} - ${bait.reason}`);
}
console.log('');

log('🎒 What to Bring:', colors.yellow);
for (const item of strategicSeaBass.whatToBring) {
  console.log(`  • ${item}`);
}
console.log('');

log('💡 Tips:', colors.yellow);
for (const tip of strategicSeaBass.tips) {
  console.log(`  • ${tip}`);
}

// ============================================================================
// COMPARISON: Same Species, Different Timescales
// ============================================================================

logSection('COMPARISON: Tactical vs Strategic Advice');

console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│ TACTICAL ADVICE (Right Now)           │ STRATEGIC ADVICE (Planning)        │');
console.log('├─────────────────────────────────────────────────────────────────────────────┤');
console.log('│                                        │                                    │');
console.log('│ ⏰ Time-sensitive                      │ 📅 Planning ahead                  │');
console.log('│ • "Go NOW" or "Wait"                   │ • "Best windows this week"         │');
console.log('│ • Current conditions                   │ • Forecast analysis                │');
console.log('│ • Immediate action steps               │ • Preparation checklist            │');
console.log('│                                        │                                    │');
console.log('│ 🎯 Output:                             │ 🎯 Output:                         │');
console.log('│ • Urgency level                        │ • Best time windows                │');
console.log('│ • Top 3 species right now              │ • Species-specific guide           │');
console.log('│ • Current tide/time/weather            │ • Approach recommendations         │');
console.log('│ • What to do next                      │ • What to bring                    │');
console.log('│                                        │ • Tips for success                 │');
console.log('│                                        │                                    │');
console.log('│ 💡 Use case:                           │ 💡 Use case:                       │');
console.log('│ "I\'m at the beach right now"          │ "Planning Sunday fishing trip"     │');
console.log('│ "Should I go fishing today?"           │ "Targeting sea bass this weekend"  │');
console.log('│                                        │                                    │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘');

logSection('INTEGRATION EXAMPLES');

log('Example 1: Mobile App - "Fishing Now" Screen', colors.cyan);
console.log(`
const tacticalAdvice = generateTacticalAdvice(
  predictions,
  currentConditions,
  tideData
);

// Show urgency badge
<Badge color={tacticalAdvice.urgency === 'go_now' ? 'green' : 'yellow'}>
  {tacticalAdvice.urgency.replace('_', ' ').toUpperCase()}
</Badge>

// Show action steps
{tacticalAdvice.actionableSteps.map(step => (
  <ActionStep key={step}>{step}</ActionStep>
))}
`);

log('Example 2: Web App - "Plan Your Trip" Screen', colors.cyan);
console.log(`
const strategicAdvice = generateStrategicAdvice(
  selectedSpecies,
  forecastData,
  'This Weekend'
);

// Show best windows
{strategicAdvice.bestWindows.map(window => (
  <TimeWindow
    date={window.date}
    time={window.time}
    score={window.score}
    reason={window.reason}
  />
))}

// Show what to bring checklist
{strategicAdvice.whatToBring.map(item => (
  <ChecklistItem>{item}</ChecklistItem>
))}
`);

log('Example 3: API Response - Different Endpoints', colors.cyan);
console.log(`
GET /api/findr/advice/tactical?rectangleCode=31F2
→ Returns tactical advice for RIGHT NOW

GET /api/findr/advice/strategic?rectangleCode=31F2&species=BSS&date=2025-11-24
→ Returns strategic planning advice for target species/date
`);

logSection('TEST COMPLETE');

log('✅ Both advice types generated successfully', colors.green);
console.log('');
log('Key Takeaways:', colors.bright);
console.log('  1. Tactical advice is time-sensitive and actionable');
console.log('  2. Strategic advice helps plan and prepare');
console.log('  3. Both use the same underlying approach scoring');
console.log('  4. Different UX patterns for different use cases');
console.log('  5. Ready to integrate into API and UI');

console.log('\n');
