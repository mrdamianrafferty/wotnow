#!/usr/bin/env tsx
/**
 * Manual Bio-Bands Classification Test (Pre-Migration)
 * 
 * Tests threshold logic WITHOUT requiring the database function.
 * Use this to validate threshold boundaries before running the migration.
 */

// Threshold data (from bio_bands_thresholds.sql)
const thresholds = [
  // Surface Temperature (°C)
  { parameter: 'surfaceTemperature', level: 'very_low', threshold: 0, interpretation: 'Freezing, marine activity minimal' },
  { parameter: 'surfaceTemperature', level: 'low', threshold: 8, interpretation: 'Cold, only hardy species feed' },
  { parameter: 'surfaceTemperature', level: 'normal', threshold: 14, interpretation: 'Comfortable for most temperate fish' },
  { parameter: 'surfaceTemperature', level: 'high', threshold: 20, interpretation: 'Warm, high fish activity' },
  { parameter: 'surfaceTemperature', level: 'very_high', threshold: 26, interpretation: 'Hot, some fish stressed or go deep' },

  // Salinity (ppt)
  { parameter: 'salinity', level: 'very_low', threshold: 20, interpretation: 'Brackish, only euryhaline species' },
  { parameter: 'salinity', level: 'low', threshold: 28, interpretation: 'Reduced salinity, near estuaries' },
  { parameter: 'salinity', level: 'normal', threshold: 32, interpretation: 'Typical coastal seawater' },
  { parameter: 'salinity', level: 'high', threshold: 36, interpretation: 'Full oceanic salinity' },
  { parameter: 'salinity', level: 'very_high', threshold: 40, interpretation: 'Hypersaline, e.g. Mediterranean evaporation' },

  // Dissolved Oxygen (mg/L)
  { parameter: 'oxygen', level: 'very_low', threshold: 0, interpretation: 'Anoxic, fish kills likely' },
  { parameter: 'oxygen', level: 'low', threshold: 2, interpretation: 'Hypoxic, stressful for most fish' },
  { parameter: 'oxygen', level: 'normal', threshold: 4, interpretation: 'Adequate for survival' },
  { parameter: 'oxygen', level: 'high', threshold: 7, interpretation: 'Good, healthy conditions' },
  { parameter: 'oxygen', level: 'very_high', threshold: 10, interpretation: 'Excellent, peak fish activity' },

  // Chlorophyll (mg/m³)
  { parameter: 'chlorophyll', level: 'very_low', threshold: 0, interpretation: 'Clear, low productivity' },
  { parameter: 'chlorophyll', level: 'low', threshold: 0.5, interpretation: 'Oligotrophic' },
  { parameter: 'chlorophyll', level: 'normal', threshold: 1.5, interpretation: 'Mesotrophic, balanced food web' },
  { parameter: 'chlorophyll', level: 'high', threshold: 3, interpretation: 'Eutrophic, high plankton' },
  { parameter: 'chlorophyll', level: 'very_high', threshold: 5, interpretation: 'Bloom conditions, can stress fish' },

  // Nitrate (μmol/L)
  { parameter: 'nitrate', level: 'very_low', threshold: 0, interpretation: 'Nutrient-depleted' },
  { parameter: 'nitrate', level: 'low', threshold: 1, interpretation: 'Oligotrophic' },
  { parameter: 'nitrate', level: 'normal', threshold: 3, interpretation: 'Typical coastal levels' },
  { parameter: 'nitrate', level: 'high', threshold: 6, interpretation: 'Enriched, near-shore runoff' },
  { parameter: 'nitrate', level: 'very_high', threshold: 10, interpretation: 'Eutrophic, pollution concern' },

  // Phosphate (μmol/L)
  { parameter: 'phosphate', level: 'very_low', threshold: 0, interpretation: 'Nutrient-depleted' },
  { parameter: 'phosphate', level: 'low', threshold: 0.1, interpretation: 'Oligotrophic' },
  { parameter: 'phosphate', level: 'normal', threshold: 0.3, interpretation: 'Mesotrophic' },
  { parameter: 'phosphate', level: 'high', threshold: 0.6, interpretation: 'Enriched' },
  { parameter: 'phosphate', level: 'very_high', threshold: 1, interpretation: 'Eutrophic, potential algal blooms' },

  // Phytoplankton (cells/L)
  { parameter: 'phytoplankton', level: 'very_low', threshold: 0, interpretation: 'Sparse, low productivity' },
  { parameter: 'phytoplankton', level: 'low', threshold: 1000, interpretation: 'Typical winter levels' },
  { parameter: 'phytoplankton', level: 'normal', threshold: 5000, interpretation: 'Healthy coastal productivity' },
  { parameter: 'phytoplankton', level: 'high', threshold: 20000, interpretation: 'Spring/summer bloom' },
  { parameter: 'phytoplankton', level: 'very_high', threshold: 50000, interpretation: 'Dense bloom, may reduce water clarity' }
];

type BioLevel = 'very_low' | 'low' | 'normal' | 'high' | 'very_high';

// Classification function (mimics SQL version)
function classifyParameter(parameter: string, value: number): BioLevel | null {
  // Get all thresholds for this parameter, sorted descending
  const paramThresholds = thresholds
    .filter(t => t.parameter === parameter)
    .sort((a, b) => b.threshold - a.threshold);

  // Find highest threshold that value exceeds
  for (const threshold of paramThresholds) {
    if (value >= threshold.threshold) {
      return threshold.level as BioLevel;
    }
  }

  return null; // Below all thresholds
}

// Get interpretation for a classification
function getInterpretation(parameter: string, level: BioLevel | null): string {
  if (!level) return 'Below minimum threshold';
  
  const threshold = thresholds.find(
    t => t.parameter === parameter && t.level === level
  );
  
  return threshold?.interpretation || 'Unknown';
}

// Format output with colors
function formatBioLevel(level: BioLevel | null): string {
  const colors: Record<string, string> = {
    'very_low': '🔵',
    'low': '🟢',
    'normal': '🟡',
    'high': '🟠',
    'very_high': '🔴'
  };
  
  if (!level) return '⚫ NULL';
  return `${colors[level]} ${level}`;
}

// Test scenarios
const scenarios = [
  {
    name: '☀️ Summer Cornwall',
    location: 'Falmouth Bay, July',
    conditions: {
      surfaceTemperature: 16.5,
      salinity: 34.2,
      oxygen: 7.5,
      chlorophyll: 2.1
    }
  },
  {
    name: '❄️ Winter Irish Sea',
    location: 'Morecambe Bay, February',
    conditions: {
      surfaceTemperature: 6.5,
      salinity: 35.0,
      oxygen: 9.2,
      chlorophyll: 0.8
    }
  },
  {
    name: '🌊 Baltic Brackish',
    location: 'Bornholm Basin',
    conditions: {
      surfaceTemperature: 8.5,
      salinity: 12.0, // Very low!
      oxygen: 5.5,
      chlorophyll: 3.2
    }
  },
  {
    name: '🌞 Mediterranean Summer',
    location: 'Costa Brava, August',
    conditions: {
      surfaceTemperature: 25.5,
      salinity: 38.2,
      oxygen: 6.2,
      chlorophyll: 0.4
    }
  },
  {
    name: '☠️ Dead Zone',
    location: 'Hypoxic estuary',
    conditions: {
      surfaceTemperature: 22.5,
      salinity: 28.5,
      oxygen: 1.5, // DANGER!
      chlorophyll: 4.8
    }
  }
];

// Run tests
console.log('🧪 Manual Bio-Bands Classification Test\n');
console.log('Testing threshold logic before database migration...\n');
console.log('═'.repeat(80));

for (const scenario of scenarios) {
  console.log(`\n${scenario.name}`);
  console.log(`📍 ${scenario.location}`);
  console.log('─'.repeat(80));

  for (const [param, value] of Object.entries(scenario.conditions)) {
    const level = classifyParameter(param, value);
    const interpretation = getInterpretation(param, level);

    console.log(
      `${param.padEnd(20)} ${String(value).padEnd(8)} → ` +
      `${formatBioLevel(level).padEnd(20)} | ${interpretation}`
    );
  }
}

console.log('\n═'.repeat(80));
console.log('\n✅ Manual classification test complete!\n');

// Edge cases
console.log('🔬 Edge Case Tests\n');
console.log('─'.repeat(80));

const edgeCases: Array<{ name: string; param: string; value: number; expected: BioLevel | null }> = [
  { name: 'Exact threshold (14°C)', param: 'surfaceTemperature', value: 14.0, expected: 'normal' },
  { name: 'Just below (13.99°C)', param: 'surfaceTemperature', value: 13.99, expected: 'low' },
  { name: 'Freshwater (0 ppt)', param: 'salinity', value: 0, expected: null },
  { name: 'Brackish (19.9 ppt)', param: 'salinity', value: 19.9, expected: null },
  { name: 'Barely brackish (20 ppt)', param: 'salinity', value: 20.0, expected: 'very_low' },
  { name: 'Anoxic (0 mg/L O2)', param: 'oxygen', value: 0, expected: 'very_low' },
  { name: 'Critical (1.9 mg/L O2)', param: 'oxygen', value: 1.9, expected: 'very_low' },
];

let passed = 0;
let failed = 0;

for (const test of edgeCases) {
  const result = classifyParameter(test.param, test.value);
  const testPassed = result === test.expected;
  
  if (testPassed) {
    passed++;
  } else {
    failed++;
  }
  
  const status = testPassed ? '✅' : '❌';
  const expectedDisplay = test.expected ? formatBioLevel(test.expected) : '⚫ NULL';
  console.log(
    `${status} ${test.name.padEnd(30)} → ${formatBioLevel(result).padEnd(20)} ` +
    `(expected: ${expectedDisplay})`
  );
}

console.log('─'.repeat(80));
console.log(`Edge cases: ${passed}/${edgeCases.length} passed\n`);

// Threshold boundary check
console.log('📏 Threshold Boundary Verification\n');
console.log('─'.repeat(80));

const boundaryTests = [
  { param: 'surfaceTemperature', values: [7.9, 8.0, 8.1, 13.9, 14.0, 14.1] },
  { param: 'salinity', values: [19.9, 20.0, 20.1, 31.9, 32.0, 32.1] },
  { param: 'oxygen', values: [1.9, 2.0, 2.1, 3.9, 4.0, 4.1] }
];

for (const test of boundaryTests) {
  console.log(`\n${test.param}:`);
  for (const value of test.values) {
    const level = classifyParameter(test.param, value);
    console.log(`  ${String(value).padEnd(6)} → ${formatBioLevel(level)}`);
  }
}

console.log('\n═'.repeat(80));

// Show all thresholds
console.log('\n📋 Complete Threshold Reference\n');
console.log('═'.repeat(80));

const paramGroups = Array.from(new Set(thresholds.map(t => t.parameter)));

for (const param of paramGroups) {
  console.log(`\n${param}:`);
  const paramThresholds = thresholds.filter(t => t.parameter === param);
  
  for (const t of paramThresholds) {
    console.log(
      `  ${formatBioLevel(t.level as BioLevel).padEnd(20)} ≥ ${String(t.threshold).padEnd(8)} | ${t.interpretation}`
    );
  }
}

console.log('\n═'.repeat(80));
console.log('\n✨ All manual tests complete!\n');

if (failed === 0) {
  console.log('✅ All edge cases passed! Threshold logic is correct.\n');
  console.log('Ready to run migration: migrations/create_bio_bands_thresholds.sql\n');
} else {
  console.log(`⚠️  ${failed} edge case(s) failed. Review threshold boundaries.\n`);
  process.exit(1);
}
