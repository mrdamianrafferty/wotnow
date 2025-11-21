#!/usr/bin/env tsx
/**
 * Demo: Favorites-focused fishing advice
 *
 * Shows tactical and strategic advice for a user's favorite species
 */

import {
  generateFavoritesTacticalAdvice,
  generateFavoritesStrategicAdvice,
  type FavoriteSpecies,
} from '../lib/findr/generateFavouritesAdvice';
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
  gray: '\x1b[90m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '━'.repeat(80));
  log(title, colors.bright + colors.blue);
  console.log('━'.repeat(80) + '\n');
}

// User's favorite species (7 species they're interested in)
const myFavorites: FavoriteSpecies[] = [
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
  {
    species_code: 'COD',
    name_en: 'Cod',
    preferred_habitats: ['wreck_reef', 'deep_water', 'rocky_shore'],
    effective_techniques: ['BOT', 'JIG'],
    recommended_baits: ['🦀 Crab', '🐟 Fish baits', '🪱 Worms'],
    confidence_score: 70,
  },
  {
    species_code: 'POL',
    name_en: 'Pollack',
    preferred_habitats: ['wreck_reef', 'rocky_shore', 'deep_water'],
    effective_techniques: ['SPN', 'JIG', 'FLY'],
    recommended_baits: ['🐟 Fish strips', '💫 Soft plastics'],
    confidence_score: 68,
  },
  {
    species_code: 'MUL',
    name_en: 'Mullet',
    preferred_habitats: ['pier_harbor', 'estuary', 'shallow_water'],
    effective_techniques: ['FLF', 'BOT'],
    recommended_baits: ['🍞 Bread', '🪱 Ragworm'],
    confidence_score: 60,
  },
];

// Mock tide data
const mockTides: TideExtreme[] = [
  { time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), type: 'high', height: 4.3 },
  { time: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(), type: 'low', height: 1.1 },
];

// ============================================================================
// TACTICAL ADVICE - "What should I target TODAY?"
// ============================================================================

logSection('TACTICAL ADVICE - Today\'s Fishing Plan for Your Favorites');

log('📍 Location: Portland Bill (31F2)', colors.cyan);
log('⏰ Time: 6:00 AM (Dawn)', colors.cyan);
log('🌊 Conditions: Flooding tide, light swell, clear water\n', colors.cyan);

const currentConditions: ApproachConditions = {
  wind_speed_kts: 8,
  wave_height_m: 0.6,
  current_speed_ms: 0.4,
  kd490: 0.15,
  tide_stage: 'flooding',
  time_of_day: 'dawn',
  sea_temp_c: 16,
};

const tacticalAdvice = generateFavoritesTacticalAdvice(
  myFavorites,
  currentConditions,
  mockTides,
  { name: 'Portland Bill', rectangleCode: '31F2', lat: 50.5, lon: -2.5 }
);

log(`📊 ${tacticalAdvice.summary}\n`, colors.bright + colors.cyan);

// Current conditions
log('⚡ Current Conditions:', colors.yellow);
console.log(`  Tide: ${tacticalAdvice.currentConditions.tideStage}`);
console.log(`  Time: ${tacticalAdvice.currentConditions.timeOfDay}`);
console.log(`  Wind: ${tacticalAdvice.currentConditions.windSpeed} kts`);
console.log(`  Waves: ${tacticalAdvice.currentConditions.waveHeight} m`);
if (tacticalAdvice.currentConditions.nextTideChange) {
  console.log(`  Next: ${tacticalAdvice.currentConditions.nextTideChange}`);
}
console.log('');

// Active now
if (tacticalAdvice.activeNow.length > 0) {
  log('🟢 ACTIVE NOW - Go Fish!', colors.bright + colors.green);
  tacticalAdvice.activeNow.forEach((adv, i) => {
    console.log(`  ${i + 1}. ${adv.species.name} (${adv.approach?.score}/100)`);
    console.log(`     📍 ${adv.approach?.habitat}`);
    console.log(`     🎣 ${adv.approach?.technique}`);
    console.log(`     🪱 ${adv.baits.slice(0, 2).join(', ')}`);
    console.log(`     💡 ${adv.approach?.explanation}`);
    console.log('');
  });
}

// Upcoming soon
if (tacticalAdvice.upcomingSoon.length > 0) {
  log('🟡 UPCOMING SOON - Worth Waiting For', colors.yellow);
  tacticalAdvice.upcomingSoon.forEach((adv) => {
    console.log(`  • ${adv.species.name} (${adv.approach?.score}/100)`);
    console.log(`    ${adv.timing || 'Fair conditions'}`);
  });
  console.log('');
}

// Not recommended
if (tacticalAdvice.notRecommended.length > 0) {
  log('🔴 NOT RECOMMENDED TODAY', colors.gray);
  tacticalAdvice.notRecommended.forEach((adv) => {
    console.log(`  • ${adv.species.name} (${adv.approach?.score || 0}/100) - ${adv.timing}`);
  });
  console.log('');
}

// Priority advice
log('🎯 YOUR ACTION PLAN:', colors.bright + colors.green);
console.log(`  1️⃣  ${tacticalAdvice.priorityAdvice.topChoice}`);
if (tacticalAdvice.priorityAdvice.secondChoice) {
  console.log(`  2️⃣  ${tacticalAdvice.priorityAdvice.secondChoice}`);
}
console.log('');

log('🎒 WHAT TO BRING TODAY:', colors.cyan);
tacticalAdvice.priorityAdvice.whatToBring.forEach(item => {
  console.log(`  ✓ ${item}`);
});

// ============================================================================
// STRATEGIC ADVICE - "What's happening this week?"
// ============================================================================

logSection('STRATEGIC ADVICE - Week Ahead for Your Favorites');

log('📅 Planning your week around your 7 favorite species\n', colors.cyan);

// Generate mock weekly forecast (48 hours, every 3 hours = 16 data points)
const weeklyForecast = [];
for (let i = 0; i < 56; i += 3) {  // 7 days, every 3 hours
  const time = new Date(Date.now() + i * 60 * 60 * 1000);
  const hour = time.getHours();

  // Vary conditions throughout the week
  const dayOfWeek = time.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  weeklyForecast.push({
    time,
    conditions: {
      wind_speed_kts: 8 + Math.random() * 8,
      wave_height_m: 0.5 + Math.random() * 1.0,
      current_speed_ms: 0.3 + Math.random() * 0.4,
      kd490: 0.10 + Math.random() * 0.15,
      tide_stage: (i % 12 < 6) ? 'flooding' as const : 'ebbing' as const,
      time_of_day: (hour >= 5 && hour < 7) ? 'dawn' as const :
                   (hour >= 7 && hour < 18) ? 'day' as const :
                   (hour >= 18 && hour < 20) ? 'dusk' as const : 'night' as const,
      sea_temp_c: 15 + Math.random() * 3,
    },
  });
}

const strategicAdvice = generateFavoritesStrategicAdvice(
  myFavorites,
  weeklyForecast,
  { name: 'Portland Bill', rectangleCode: '31F2' }
);

log(`📊 ${strategicAdvice.summary}`, colors.bright + colors.cyan);
log(`🗓️  ${strategicAdvice.timeframe}\n`, colors.cyan);

// Best days overview
log('⭐ BEST DAYS THIS WEEK:', colors.yellow);
strategicAdvice.weekOverview.bestDays.slice(0, 3).forEach((day, i) => {
  console.log(`  ${i + 1}. ${day.dayOfWeek} ${day.date} (Score: ${day.score}/100)`);
  console.log(`     Species active: ${day.species.join(', ')}`);
});
console.log('');

// Individual species forecasts
log('🐟 SPECIES-BY-SPECIES BREAKDOWN:', colors.yellow);
strategicAdvice.weeklyForecasts.slice(0, 5).forEach((forecast) => {
  console.log('');
  log(`${forecast.species.name} - ${forecast.outlook}`, colors.cyan);
  console.log(`  Average Score: ${forecast.averageScore}/100`);
  console.log(`  Best Windows (${forecast.bestWindows.length}):`);

  forecast.bestWindows.slice(0, 3).forEach((window, i) => {
    console.log(`    ${i + 1}. ${window.dayOfWeek} ${window.date} at ${window.time}`);
    console.log(`       ${window.habitat} + ${window.technique} (${window.score}/100)`);
  });

  if (forecast.recommendedBaits.length > 0) {
    console.log(`  Baits: ${forecast.recommendedBaits.slice(0, 3).join(', ')}`);
  }
});

// Shopping list
console.log('');
log('🛒 SHOPPING LIST FOR THE WEEK:', colors.bright + colors.green);
log('Baits:', colors.yellow);
strategicAdvice.weekOverview.shoppingList.baits.forEach(bait => {
  console.log(`  ✓ ${bait}`);
});
console.log('');
log('Techniques you\'ll use:', colors.yellow);
strategicAdvice.weekOverview.shoppingList.techniques.forEach(tech => {
  console.log(`  • ${tech}`);
});
console.log('');
log('Locations you\'ll need access to:', colors.yellow);
strategicAdvice.weekOverview.shoppingList.habitats.forEach(hab => {
  console.log(`  📍 ${hab}`);
});

// Planning tips
console.log('');
log('💡 PLANNING TIPS:', colors.bright + colors.cyan);
strategicAdvice.planningTips.forEach(tip => {
  console.log(`  • ${tip}`);
});

// ============================================================================
// SUMMARY
// ============================================================================

logSection('SUMMARY - Favorites-Focused Advice');

console.log('✅ TACTICAL ADVICE (Today):');
console.log(`   • ${tacticalAdvice.activeNow.length} species active right now`);
console.log(`   • Top target: ${tacticalAdvice.activeNow[0]?.species.name || 'None'}`);
console.log(`   • Bring: ${tacticalAdvice.priorityAdvice.whatToBring.slice(0, 2).join(', ')}`);
console.log('');

console.log('✅ STRATEGIC ADVICE (This Week):');
console.log(`   • ${strategicAdvice.weeklyForecasts.filter(f => f.bestWindows.length > 0).length}/${myFavorites.length} species have good windows`);
console.log(`   • Best day: ${strategicAdvice.weekOverview.bestDays[0]?.dayOfWeek} ${strategicAdvice.weekOverview.bestDays[0]?.date}`);
console.log(`   • Shopping list: ${strategicAdvice.weekOverview.shoppingList.baits.length} baits, ${strategicAdvice.weekOverview.shoppingList.techniques.length} techniques`);
console.log('');

log('🎣 This is exactly what you need to plan your week!', colors.bright + colors.green);
console.log('\n');
