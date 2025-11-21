#!/usr/bin/env tsx
/**
 * Test script for approach scoring system
 *
 * Run: npx tsx scripts/test-approach-scoring.ts
 */

import { getSpeciesApproach, formatApproachForDisplay } from '../lib/findr/scoreSpeciesApproach';
import { scoreHabitatsByConditions } from '../lib/findr/scoreHabitatsByConditions';
import { scoreTechniquesByConditions } from '../lib/findr/scoreTechniquesByConditions';
import type { ApproachConditions } from '../lib/findr/scoreSpeciesApproach';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.bright + colors.blue);
  console.log('='.repeat(80) + '\n');
}

// Test scenarios
const scenarios = [
  {
    name: 'Perfect Spinning Conditions (Rocky Shore)',
    conditions: {
      wind_speed_kts: 12,
      wave_height_m: 0.8,
      current_speed_ms: 0.4,
      kd490: 0.18,
      tide_stage: 'flooding' as const,
      time_of_day: 'day' as const,
      sea_temp_c: 16,
    },
    habitats: ['rocky_shore', 'pier_harbor'],
    techniques: ['SPN', 'BOT'],
  },
  {
    name: 'Classic Beach Day (Surfcasting)',
    conditions: {
      wind_speed_kts: 10,
      wave_height_m: 1.0,
      current_speed_ms: 0.3,
      kd490: 0.25,
      tide_stage: 'flooding' as const,
      time_of_day: 'day' as const,
      sea_temp_c: 15,
    },
    habitats: ['sandy_beach', 'shallow_water'],
    techniques: ['SURF', 'BOT'],
  },
  {
    name: 'Rough Weather (Deep Water Refuge)',
    conditions: {
      wind_speed_kts: 25,
      wave_height_m: 2.2,
      current_speed_ms: 0.6,
      kd490: 0.35,
      tide_stage: 'ebbing' as const,
      time_of_day: 'day' as const,
      sea_temp_c: 11,
    },
    habitats: ['deep_water', 'wreck_reef', 'rocky_shore'],
    techniques: ['BOT', 'JIG', 'SPN'],
  },
  {
    name: 'Flat Calm (Tough Conditions)',
    conditions: {
      wind_speed_kts: 3,
      wave_height_m: 0.2,
      current_speed_ms: 0.05,
      kd490: 0.12,
      tide_stage: 'high_slack' as const,
      time_of_day: 'day' as const,
      sea_temp_c: 18,
    },
    habitats: ['sandy_beach', 'rocky_shore', 'shallow_water'],
    techniques: ['SURF', 'SPN', 'BOT'],
  },
  {
    name: 'Night Harbour Session (EGI + Lights)',
    conditions: {
      wind_speed_kts: 8,
      wave_height_m: 0.4,
      current_speed_ms: 0.3,
      kd490: 0.15,
      tide_stage: 'ebbing' as const,
      time_of_day: 'night' as const,
      sea_temp_c: 17,
    },
    habitats: ['pier_harbor', 'estuary'],
    techniques: ['EGI', 'SAB', 'FLF'],
  },
  {
    name: 'Perfect Fly Fishing (Estuary Dawn)',
    conditions: {
      wind_speed_kts: 6,
      wave_height_m: 0.3,
      current_speed_ms: 0.4,
      kd490: 0.12,
      tide_stage: 'flooding' as const,
      time_of_day: 'dawn' as const,
      sea_temp_c: 14,
    },
    habitats: ['estuary', 'shallow_water'],
    techniques: ['FLY', 'SPN'],
  },
];

// Run tests
logSection('APPROACH SCORING SYSTEM TEST SUITE');

for (const scenario of scenarios) {
  logSection(`Scenario: ${scenario.name}`);

  // Display conditions
  log('Conditions:', colors.cyan);
  console.log(`  Wind: ${scenario.conditions.wind_speed_kts} kts`);
  console.log(`  Waves: ${scenario.conditions.wave_height_m} m`);
  console.log(`  Current: ${scenario.conditions.current_speed_ms} m/s`);
  console.log(`  Clarity (kd490): ${scenario.conditions.kd490}`);
  console.log(`  Tide: ${scenario.conditions.tide_stage}`);
  console.log(`  Time: ${scenario.conditions.time_of_day}`);
  console.log(`  Temperature: ${scenario.conditions.sea_temp_c}°C`);

  console.log('\n');

  // Test habitat scoring
  log('Habitat Scores:', colors.yellow);
  const habitatScores = scoreHabitatsByConditions(
    scenario.habitats,
    scenario.conditions
  );
  for (const habitat of habitatScores) {
    const scoreColor =
      habitat.score >= 70 ? colors.green :
      habitat.score >= 50 ? colors.yellow :
      colors.red;
    log(
      `  ${habitat.emoji} ${habitat.habitat.padEnd(15)} ${habitat.score.toString().padStart(3)}/100  ${habitat.reason}`,
      scoreColor
    );
  }

  console.log('\n');

  // Test technique scoring
  log('Technique Scores:', colors.yellow);
  const techniqueScores = scoreTechniquesByConditions(
    scenario.techniques,
    scenario.conditions
  );
  for (const technique of techniqueScores) {
    const scoreColor =
      technique.score >= 70 ? colors.green :
      technique.score >= 50 ? colors.yellow :
      colors.red;
    log(
      `  ${technique.emoji} ${technique.name.padEnd(25)} ${technique.score.toString().padStart(3)}/100  ${technique.reason}`,
      scoreColor
    );
  }

  console.log('\n');

  // Test combined approach
  log('Best Approach:', colors.bright + colors.green);
  const approach = getSpeciesApproach(
    scenario.habitats,
    scenario.techniques,
    scenario.conditions
  );

  if (approach) {
    const display = formatApproachForDisplay(approach);

    console.log(`  ${display.headline}`);
    console.log(`  Score: ${display.score}`);
    console.log(`  Explanation: ${display.explanation}`);

    if (display.alternatives.length > 0) {
      console.log('\n');
      log('  Alternative Approaches:', colors.yellow);
      for (const alt of display.alternatives) {
        console.log(`    • ${alt}`);
      }
    }

    if (display.toughConditionsWarning) {
      console.log('\n');
      log(`  ⚠️  ${display.toughConditionsWarning}`, colors.red);
    }
  } else {
    log('  No valid approaches found', colors.red);
  }

  console.log('\n');
}

// Summary stats
logSection('SUMMARY STATISTICS');

log('Total Scenarios Tested:', colors.cyan);
console.log(`  ${scenarios.length} scenarios`);

log('\nUnique Habitats:', colors.cyan);
const allHabitats = new Set(scenarios.flatMap(s => s.habitats));
console.log(`  ${allHabitats.size} habitats: ${Array.from(allHabitats).join(', ')}`);

log('\nUnique Techniques:', colors.cyan);
const allTechniques = new Set(scenarios.flatMap(s => s.techniques));
console.log(`  ${allTechniques.size} techniques: ${Array.from(allTechniques).join(', ')}`);

log('\nCondition Ranges:', colors.cyan);
const windRange = {
  min: Math.min(...scenarios.map(s => s.conditions.wind_speed_kts)),
  max: Math.max(...scenarios.map(s => s.conditions.wind_speed_kts)),
};
const waveRange = {
  min: Math.min(...scenarios.map(s => s.conditions.wave_height_m)),
  max: Math.max(...scenarios.map(s => s.conditions.wave_height_m)),
};
console.log(`  Wind: ${windRange.min}-${windRange.max} kts`);
console.log(`  Waves: ${waveRange.min}-${waveRange.max} m`);

logSection('TEST COMPLETE');

log('✅ All scenarios processed successfully', colors.green);
log('\nNext steps:', colors.bright);
console.log('  1. Review the scores and explanations above');
console.log('  2. Verify the weighting (60% habitat, 40% technique) produces sensible results');
console.log('  3. Test with real Findr conditions data');
console.log('  4. Integrate into mapPrediction.ts');
console.log('  5. Add UI components to display approaches');

console.log('\n');
