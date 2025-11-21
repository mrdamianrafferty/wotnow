#!/usr/bin/env tsx
/**
 * Shows exact API response structure for both advice types
 */

import { generateTacticalAdvice, generateStrategicAdvice, type SpeciesWithPreferences } from '../lib/findr/generateFishingAdvice';
import type { ApproachConditions } from '../lib/findr/scoreSpeciesApproach';
import type { TideExtreme } from '../lib/findr/conditionHelpers';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
};

// Mock data
const species: SpeciesWithPreferences[] = [
  {
    species_code: 'BSS',
    name_en: 'Sea Bass',
    preferred_habitats: ['rocky_shore', 'sandy_beach', 'estuary'],
    effective_techniques: ['SPN', 'BOT', 'SURF'],
    recommended_baits: ['🦀 Crab', '🐟 Fish baits', '🪱 Worms'],
    confidence_score: 85,
  },
  {
    species_code: 'MAC',
    name_en: 'Mackerel',
    preferred_habitats: ['pier_harbor', 'open_sea'],
    effective_techniques: ['SPN', 'SAB'],
    recommended_baits: ['🪶 Feather rigs', '💫 Spinners'],
    confidence_score: 78,
  },
];

const currentConditions: ApproachConditions = {
  wind_speed_kts: 8,
  wave_height_m: 0.6,
  current_speed_ms: 0.4,
  kd490: 0.15,
  tide_stage: 'flooding',
  time_of_day: 'dawn',
  sea_temp_c: 16,
};

const tides: TideExtreme[] = [
  { time: new Date(Date.now() + 45 * 60 * 1000).toISOString(), type: 'high', height: 4.3 },
];

console.log(`${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log('TACTICAL ADVICE API RESPONSE');
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

const tacticalAdvice = generateTacticalAdvice(
  species,
  currentConditions,
  tides,
  { name: 'Portland Bill', lat: 50.5, lon: -2.5 }
);

console.log(`${colors.green}GET /api/findr/advice/tactical?rectangleCode=31F2${colors.reset}\n`);
console.log(JSON.stringify({ success: true, advice: tacticalAdvice }, null, 2));

console.log(`\n${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log('STRATEGIC ADVICE API RESPONSE');
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

// Generate forecast data (hourly for next 8 hours)
const forecast = [];
for (let i = 0; i < 8; i++) {
  const time = new Date(Date.now() + i * 60 * 60 * 1000);
  const hour = time.getHours();

  forecast.push({
    time,
    conditions: {
      ...currentConditions,
      wind_speed_kts: 8 + i * 0.5,
      wave_height_m: 0.6 + i * 0.1,
      time_of_day: (hour >= 5 && hour < 7) ? 'dawn' as const :
                   (hour >= 7 && hour < 18) ? 'day' as const :
                   (hour >= 18 && hour < 20) ? 'dusk' as const : 'night' as const
    }
  });
}

const strategicAdvice = generateStrategicAdvice(
  species[0],  // Sea Bass
  forecast,
  'Today'
);

console.log(`${colors.green}GET /api/findr/advice/strategic?rectangleCode=31F2&species=BSS&date=2025-11-20${colors.reset}\n`);
console.log(JSON.stringify({ success: true, advice: strategicAdvice }, null, 2));

console.log(`\n${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log('USAGE EXAMPLE');
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

console.log(`${colors.green}// Frontend code${colors.reset}`);
console.log(`
const { data } = await fetch('/api/findr/advice/tactical?rectangleCode=31F2')
  .then(r => r.json());

// Use urgency level for UI
if (data.advice.urgency === 'go_now') {
  showGreenBadge('GO NOW!');
} else if (data.advice.urgency === 'wait') {
  showYellowBadge('Wait for better conditions');
}

// Show action steps
data.advice.actionableSteps.forEach(step => {
  addToActionList(step);
});

// Display top species
data.advice.topSpecies.forEach(species => {
  renderSpeciesCard({
    name: species.name,
    score: species.approachScore,
    approach: species.recommendation,
    explanation: species.explanation
  });
});
`);

console.log(`${colors.cyan}Output:${colors.reset}`);
console.log(`  Urgency badge: "${tacticalAdvice.urgency}"`);
console.log(`  Action steps: ${tacticalAdvice.actionableSteps.length} items`);
console.log(`  Top species: ${tacticalAdvice.topSpecies.map(s => s.name).join(', ')}`);
console.log('');
