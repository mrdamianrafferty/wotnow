#!/usr/bin/env tsx
/**
 * Specific scenario demonstrations for fishing advice
 * Shows how advice adapts to different conditions
 */

import { generateTacticalAdvice, type SpeciesWithPreferences } from '../lib/findr/generateFishingAdvice';
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

// Mock species
const allSpecies: SpeciesWithPreferences[] = [
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
    species_code: 'SQC',
    name_en: 'Squid',
    preferred_habitats: ['pier_harbor', 'shallow_water'],
    effective_techniques: ['EGI', 'SAB'],
    recommended_baits: ['⥿ Egis'],
    confidence_score: 65,
  },
  {
    species_code: 'COD',
    name_en: 'Cod',
    preferred_habitats: ['wreck_reef', 'deep_water', 'rocky_shore'],
    effective_techniques: ['BOT', 'JIG'],
    recommended_baits: ['🦀 Crab', '🐟 Fish baits', '🪱 Worms'],
    confidence_score: 70,
  },
];

const mockTides: TideExtreme[] = [
  { time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), type: 'low', height: 0.9 },
  { time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), type: 'high', height: 4.3 },
  { time: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(), type: 'low', height: 1.1 },
];

// ============================================================================
// SCENARIO 1: NIGHT TIME - Harbour Squid Fishing
// ============================================================================

logSection('SCENARIO 1: NIGHT TIME - Harbour Squid Fishing');
log('📍 Location: Local pier', colors.cyan);
log('⏰ Time: 11:00 PM (Night)', colors.cyan);
log('🌊 Conditions: Calm night, slack tide, clear water\n', colors.cyan);

const nightConditions: ApproachConditions = {
  wind_speed_kts: 5,
  wave_height_m: 0.3,
  current_speed_ms: 0.1,
  kd490: 0.08,  // Very clear water
  tide_stage: 'high_slack',
  time_of_day: 'night',
  sea_temp_c: 15,
};

const nightAdvice = generateTacticalAdvice(
  allSpecies,
  nightConditions,
  mockTides,
  { name: 'Plymouth Pier', lat: 50.4, lon: -4.1 }
);

log(`Urgency: ${nightAdvice.urgency.toUpperCase().replace('_', ' ')}`,
  nightAdvice.urgency === 'go_now' ? colors.bright + colors.green : colors.yellow);
log(`Summary: ${nightAdvice.summary}\n`, colors.cyan);

log('Top Species:', colors.yellow);
nightAdvice.topSpecies.forEach((sp, i) => {
  console.log(`  ${i + 1}. ${sp.name} (Score: ${sp.approachScore}/100)`);
  console.log(`     ${sp.recommendation}`);
  if (i === 0) console.log(`     💡 ${sp.explanation}`);
});

console.log('');
log('🎣 What to do:', colors.bright + colors.green);
nightAdvice.actionableSteps.forEach((step, i) => {
  console.log(`  ${i + 1}. ${step}`);
});

// ============================================================================
// SCENARIO 2: STORM CONDITIONS - Heavy Seas
// ============================================================================

logSection('SCENARIO 2: STORM CONDITIONS - Heavy Seas');
log('📍 Location: Exposed beach', colors.cyan);
log('⏰ Time: 2:00 PM (Afternoon)', colors.cyan);
log('🌊 Conditions: Storm swell, strong winds, murky water\n', colors.cyan);

const stormConditions: ApproachConditions = {
  wind_speed_kts: 25,
  wave_height_m: 2.5,
  current_speed_ms: 0.8,
  kd490: 0.45,  // Very murky
  tide_stage: 'ebbing',
  time_of_day: 'day',
  sea_temp_c: 14,
};

const stormAdvice = generateTacticalAdvice(
  allSpecies,
  stormConditions,
  mockTides,
  { name: 'Exposed Beach', lat: 50.5, lon: -2.5 }
);

log(`Urgency: ${stormAdvice.urgency.toUpperCase().replace('_', ' ')}`,
  stormAdvice.urgency === 'wait' || stormAdvice.urgency === 'tough_conditions'
    ? colors.red : colors.yellow);
log(`Summary: ${stormAdvice.summary}\n`, colors.cyan);

log('Top Species:', colors.yellow);
stormAdvice.topSpecies.forEach((sp, i) => {
  console.log(`  ${i + 1}. ${sp.name} (Score: ${sp.approachScore}/100)`);
  console.log(`     ${sp.recommendation}`);
  if (i === 0) console.log(`     💡 ${sp.explanation}`);
});

console.log('');
log('⚠️  Recommendation:', colors.yellow);
stormAdvice.actionableSteps.forEach((step, i) => {
  console.log(`  ${i + 1}. ${step}`);
});

// ============================================================================
// SCENARIO 3: DAWN PATROL - Perfect Conditions
// ============================================================================

logSection('SCENARIO 3: DAWN PATROL - Perfect Predator Conditions');
log('📍 Location: Rocky shoreline', colors.cyan);
log('⏰ Time: 6:00 AM (Dawn)', colors.cyan);
log('🌊 Conditions: Flooding tide, light swell, clear water\n', colors.cyan);

const dawnConditions: ApproachConditions = {
  wind_speed_kts: 6,
  wave_height_m: 0.8,
  current_speed_ms: 0.5,
  kd490: 0.12,  // Clear water
  tide_stage: 'flooding',
  time_of_day: 'dawn',
  sea_temp_c: 16,
};

const dawnAdvice = generateTacticalAdvice(
  allSpecies,
  dawnConditions,
  mockTides,
  { name: 'Rocky Point', lat: 50.5, lon: -2.5 }
);

log(`Urgency: ${dawnAdvice.urgency.toUpperCase().replace('_', ' ')}`,
  dawnAdvice.urgency === 'go_now' ? colors.bright + colors.green : colors.yellow);
log(`Summary: ${dawnAdvice.summary}\n`, colors.cyan);

log('Top Species:', colors.yellow);
dawnAdvice.topSpecies.forEach((sp, i) => {
  console.log(`  ${i + 1}. ${sp.name} (Score: ${sp.approachScore}/100)`);
  console.log(`     ${sp.recommendation}`);
  if (i === 0) console.log(`     💡 ${sp.explanation}`);
});

console.log('');
log('🎣 ACTION PLAN:', colors.bright + colors.green);
dawnAdvice.actionableSteps.forEach((step, i) => {
  console.log(`  ${i + 1}. ${step}`);
});

// ============================================================================
// SCENARIO 4: MIDDAY SLACK - Waiting for Better Conditions
// ============================================================================

logSection('SCENARIO 4: MIDDAY SLACK TIDE - Waiting Game');
log('📍 Location: Sandy beach', colors.cyan);
log('⏰ Time: 1:00 PM (Midday)', colors.cyan);
log('🌊 Conditions: Slack tide, flat calm, bright sun\n', colors.cyan);

const slackConditions: ApproachConditions = {
  wind_speed_kts: 2,
  wave_height_m: 0.1,
  current_speed_ms: 0.05,
  kd490: 0.09,  // Very clear
  tide_stage: 'low_slack',
  time_of_day: 'day',
  sea_temp_c: 18,
};

const slackAdvice = generateTacticalAdvice(
  allSpecies,
  slackConditions,
  mockTides,
  { name: 'Sandy Beach', lat: 50.5, lon: -2.5 }
);

log(`Urgency: ${slackAdvice.urgency.toUpperCase().replace('_', ' ')}`,
  slackAdvice.urgency === 'wait' ? colors.yellow : colors.red);
log(`Summary: ${slackAdvice.summary}\n`, colors.cyan);

log('Current Situation:', colors.yellow);
console.log(`  Tide: ${slackAdvice.currentConditions.tideStage}`);
console.log(`  Time: ${slackAdvice.currentConditions.timeOfDay}`);
console.log(`  Wind: ${slackAdvice.currentConditions.windSpeed}kts`);
console.log(`  Waves: ${slackAdvice.currentConditions.waveHeight}m`);
if (slackAdvice.currentConditions.nextTideChange) {
  console.log(`  Next: ${slackAdvice.currentConditions.nextTideChange}`);
}

console.log('');
log('Top Species (Current Scores):', colors.yellow);
slackAdvice.topSpecies.forEach((sp, i) => {
  console.log(`  ${i + 1}. ${sp.name} (Score: ${sp.approachScore}/100)`);
});

console.log('');
log('💡 Recommendation:', colors.cyan);
slackAdvice.actionableSteps.forEach((step, i) => {
  console.log(`  ${i + 1}. ${step}`);
});

// ============================================================================
// SCENARIO 5: COLD WATER - Winter Cod Fishing
// ============================================================================

logSection('SCENARIO 5: COLD WATER - Winter Cod Session');
log('📍 Location: Deep water wreck', colors.cyan);
log('⏰ Time: 10:00 AM (Morning)', colors.cyan);
log('🌊 Conditions: Cold water, moderate swell, flooding tide\n', colors.cyan);

const coldWaterConditions: ApproachConditions = {
  wind_speed_kts: 12,
  wave_height_m: 1.2,
  current_speed_ms: 0.6,
  kd490: 0.18,
  tide_stage: 'flooding',
  time_of_day: 'day',
  sea_temp_c: 8,  // Cold water favors cod
};

const coldAdvice = generateTacticalAdvice(
  allSpecies,
  coldWaterConditions,
  mockTides,
  { name: 'Offshore Wreck', lat: 50.5, lon: -2.5 }
);

log(`Urgency: ${coldAdvice.urgency.toUpperCase().replace('_', ' ')}`,
  coldAdvice.urgency === 'go_now' || coldAdvice.urgency === 'good_window'
    ? colors.bright + colors.green : colors.yellow);
log(`Summary: ${coldAdvice.summary}\n`, colors.cyan);

log('Top Species:', colors.yellow);
coldAdvice.topSpecies.forEach((sp, i) => {
  console.log(`  ${i + 1}. ${sp.name} (Score: ${sp.approachScore}/100)`);
  console.log(`     ${sp.recommendation}`);
  if (i === 0) console.log(`     💡 ${sp.explanation}`);
});

console.log('');
log('🎣 What to do:', colors.bright + colors.green);
coldAdvice.actionableSteps.forEach((step, i) => {
  console.log(`  ${i + 1}. ${step}`);
});

// ============================================================================
// SUMMARY TABLE
// ============================================================================

logSection('SUMMARY - How Advice Adapts to Conditions');

console.log('┌────────────────────────┬────────────────┬──────────────┬─────────────────────┐');
console.log('│ Scenario               │ Urgency        │ Top Species  │ Key Factor          │');
console.log('├────────────────────────┼────────────────┼──────────────┼─────────────────────┤');
console.log(`│ Night Harbour Fishing  │ ${nightAdvice.urgency.toUpperCase().padEnd(14)} │ ${nightAdvice.topSpecies[0].name.padEnd(12)} │ Night time bonus    │`);
console.log(`│ Storm Conditions       │ ${stormAdvice.urgency.toUpperCase().padEnd(14)} │ ${stormAdvice.topSpecies[0].name.padEnd(12)} │ Heavy seas penalty  │`);
console.log(`│ Dawn Patrol            │ ${dawnAdvice.urgency.toUpperCase().padEnd(14)} │ ${dawnAdvice.topSpecies[0].name.padEnd(12)} │ Dawn + flooding     │`);
console.log(`│ Midday Slack Tide      │ ${slackAdvice.urgency.toUpperCase().padEnd(14)} │ ${slackAdvice.topSpecies[0].name.padEnd(12)} │ Slack tide penalty  │`);
console.log(`│ Cold Water Winter      │ ${coldAdvice.urgency.toUpperCase().padEnd(14)} │ ${coldAdvice.topSpecies[0].name.padEnd(12)} │ Cold temp bonus     │`);
console.log('└────────────────────────┴────────────────┴──────────────┴─────────────────────┘');

console.log('\n');
log('Key Insights:', colors.bright);
console.log('  1. Night time favors squid and harbour species');
console.log('  2. Storm conditions steer toward sheltered locations');
console.log('  3. Dawn flooding tide is optimal for predators like bass');
console.log('  4. Slack tides reduce activity across all species');
console.log('  5. Cold water favors species like cod over mackerel');
console.log('\n');
