#!/usr/bin/env tsx
/**
 * Test script: verify season gating and growing-season filtering
 * for weather disease alerts.
 *
 * Spoofs Date to different months, then runs the detection functions
 * against typical Irish weather that WOULD trigger alerts if season
 * checks weren't in place.
 *
 * Usage: npx tsx scripts/test-season-alerts.ts
 */

import {
  detectLateBlight,
  detectPowderyMildew,
  detectBotrytis,
  detectPestDiseaseRisks,
  WeatherForecast,
  UserPlant,
} from '../lib/grow/weatherTaskEngine';

// ─── Helpers ─────────────────────────────────────────────────────────

const OriginalDate = globalThis.Date;

function spoofMonth(month: number): void {
  // month is 1-12, Date.getMonth() returns 0-11
  const fakeNow = new OriginalDate(2026, month - 1, 15, 12, 0, 0);
  globalThis.Date = class extends OriginalDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(fakeNow.getTime());
      } else {
        // @ts-expect-error - spread into Date constructor
        super(...args);
      }
    }
    static now() { return fakeNow.getTime(); }
  } as DateConstructor;
}

function restoreDate(): void {
  globalThis.Date = OriginalDate;
}

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ─── Test data ───────────────────────────────────────────────────────

// Typical Irish user's plant list (added in winter, but not all growing yet)
const USER_PLANTS: UserPlant[] = [
  { id: '1', plantName: 'Tomato', plantSlug: 'tomato', frostTolerance: 'tender', waterNeeds: 'high' },
  { id: '2', plantName: 'Potato', plantSlug: 'potato', frostTolerance: 'half_hardy', waterNeeds: 'medium' },
  { id: '3', plantName: 'Courgette', plantSlug: 'courgette', frostTolerance: 'tender', waterNeeds: 'high' },
  { id: '4', plantName: 'Rose', plantSlug: 'rose', frostTolerance: 'hardy', waterNeeds: 'medium' },
  { id: '5', plantName: 'Strawberry', plantSlug: 'strawberry', frostTolerance: 'half_hardy', waterNeeds: 'medium' },
  { id: '6', plantName: 'Lettuce', plantSlug: 'lettuce', frostTolerance: 'half_hardy', waterNeeds: 'high' },
];

// Weather that triggers late blight: wet, humid, 15-20°C (classic Irish summer AND winter)
function makeBlightWeather(dateStr: string): WeatherForecast[] {
  return [
    { date: dateStr, tempMin: 13, tempMax: 18, humidity: 92, precipitation: 12, precipProbability: 85, windSpeed: 10, windGust: 18, uvIndex: 3, description: 'light rain' },
    { date: dateStr, tempMin: 12, tempMax: 17, humidity: 88, precipitation: 10, precipProbability: 80, windSpeed: 8, windGust: 15, uvIndex: 2, description: 'overcast' },
    { date: dateStr, tempMin: 14, tempMax: 19, humidity: 85, precipitation: 8, precipProbability: 70, windSpeed: 12, windGust: 20, uvIndex: 3, description: 'drizzle' },
  ];
}

// Weather that triggers powdery mildew: dry, warm, humid nights
function makeMildewWeather(dateStr: string): WeatherForecast[] {
  return [
    { date: dateStr, tempMin: 16, tempMax: 25, humidity: 78, precipitation: 0, precipProbability: 5, windSpeed: 5, windGust: 10, uvIndex: 6, description: 'clear' },
    { date: dateStr, tempMin: 15, tempMax: 24, humidity: 75, precipitation: 0, precipProbability: 10, windSpeed: 6, windGust: 12, uvIndex: 5, description: 'clear' },
    { date: dateStr, tempMin: 17, tempMax: 26, humidity: 72, precipitation: 0, precipProbability: 5, windSpeed: 4, windGust: 8, uvIndex: 7, description: 'clear' },
    { date: dateStr, tempMin: 16, tempMax: 24, humidity: 74, precipitation: 0, precipProbability: 10, windSpeed: 5, windGust: 10, uvIndex: 5, description: 'clear' },
    { date: dateStr, tempMin: 18, tempMax: 27, humidity: 76, precipitation: 0, precipProbability: 5, windSpeed: 3, windGust: 7, uvIndex: 6, description: 'clear' },
  ];
}

// Weather that triggers botrytis: humid, moderate temp, recent rain
function makeBotrytisWeather(dateStr: string): WeatherForecast[] {
  return [
    { date: dateStr, tempMin: 14, tempMax: 20, humidity: 93, precipitation: 5, precipProbability: 75, windSpeed: 5, windGust: 10, uvIndex: 2, description: 'light rain' },
    { date: dateStr, tempMin: 13, tempMax: 19, humidity: 90, precipitation: 3, precipProbability: 60, windSpeed: 6, windGust: 12, uvIndex: 3, description: 'overcast' },
    { date: dateStr, tempMin: 15, tempMax: 21, humidity: 88, precipitation: 2, precipProbability: 50, windSpeed: 7, windGust: 14, uvIndex: 3, description: 'cloudy' },
  ];
}

// ─── Run tests ───────────────────────────────────────────────────────

const MONTHS_TO_TEST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║  SEASON GATING & GROWING SEASON TEST                           ║');
console.log('║  Testing disease alerts across all 12 months                   ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// ── Late Blight ──
console.log('━━━ LATE BLIGHT (season gate: Apr-Oct, plants: tomato/potato) ━━━');
console.log('Month  | Alerts? | Affected Plants');
console.log('-------|---------|------------------------------------------');

for (const month of MONTHS_TO_TEST) {
  spoofMonth(month);
  const alerts = detectLateBlight(makeBlightWeather('2026-06-15'), USER_PLANTS);
  const affected = alerts.length > 0
    ? alerts[0].affectedPlantIds.map(id => USER_PLANTS.find(p => p.id === id)?.plantName).join(', ')
    : '—';
  const status = alerts.length > 0 ? `YES (${alerts[0].severity})` : 'NO';
  console.log(`${MONTH_NAMES[month].padEnd(7)}| ${status.padEnd(8)}| ${affected}`);
  restoreDate();
}

console.log('');

// ── Powdery Mildew ──
console.log('━━━ POWDERY MILDEW (season gate: May-Oct, plants: courgette/rose/pea) ━━━');
console.log('Month  | Alerts? | Affected Plants');
console.log('-------|---------|------------------------------------------');

for (const month of MONTHS_TO_TEST) {
  spoofMonth(month);
  const alerts = detectPowderyMildew(makeMildewWeather('2026-06-15'), USER_PLANTS);
  const affected = alerts.length > 0
    ? alerts[0].affectedPlantIds.map(id => USER_PLANTS.find(p => p.id === id)?.plantName).join(', ')
    : '—';
  const status = alerts.length > 0 ? `YES (${alerts[0].severity})` : 'NO';
  console.log(`${MONTH_NAMES[month].padEnd(7)}| ${status.padEnd(8)}| ${affected}`);
  restoreDate();
}

console.log('');

// ── Botrytis ──
console.log('━━━ BOTRYTIS (no season gate, but plant growing season applies) ━━━');
console.log('Month  | Alerts? | Affected Plants');
console.log('-------|---------|------------------------------------------');

for (const month of MONTHS_TO_TEST) {
  spoofMonth(month);
  const alerts = detectBotrytis(makeBotrytisWeather('2026-06-15'), USER_PLANTS);
  const affected = alerts.length > 0
    ? alerts[0].affectedPlantIds.map(id => USER_PLANTS.find(p => p.id === id)?.plantName).join(', ')
    : '—';
  const status = alerts.length > 0 ? `YES (${alerts[0].severity})` : 'NO';
  console.log(`${MONTH_NAMES[month].padEnd(7)}| ${status.padEnd(8)}| ${affected}`);
  restoreDate();
}

console.log('');

// ── Full pest/disease pass ──
console.log('━━━ ALL PEST/DISEASE ALERTS (combined, using blight-triggering weather) ━━━');
console.log('Month  | # Alerts | Types');
console.log('-------|----------|------------------------------------------');

for (const month of MONTHS_TO_TEST) {
  spoofMonth(month);
  const alerts = detectPestDiseaseRisks(makeBlightWeather('2026-06-15'), USER_PLANTS);
  const types = alerts.length > 0
    ? alerts.map(a => `${a.type}(${a.severity})`).join(', ')
    : '—';
  console.log(`${MONTH_NAMES[month].padEnd(7)}| ${String(alerts.length).padEnd(9)}| ${types}`);
  restoreDate();
}

console.log('');

// ── Edge case: user with ONLY tomatoes ──
console.log('━━━ EDGE CASE: User with ONLY tomatoes (not in ground until May) ━━━');
const tomatoOnly: UserPlant[] = [
  { id: '1', plantName: 'Tomato', plantSlug: 'tomato', frostTolerance: 'tender', waterNeeds: 'high' },
];
console.log('Month  | Late Blight? | Botrytis?');
console.log('-------|-------------|----------');

for (const month of MONTHS_TO_TEST) {
  spoofMonth(month);
  const blight = detectLateBlight(makeBlightWeather('2026-06-15'), tomatoOnly);
  const botrytis = detectBotrytis(makeBotrytisWeather('2026-06-15'), tomatoOnly);
  console.log(`${MONTH_NAMES[month].padEnd(7)}| ${(blight.length > 0 ? 'YES' : 'NO').padEnd(12)}| ${botrytis.length > 0 ? 'YES' : 'NO'}`);
  restoreDate();
}

console.log('');

// ── Edge case: user with NO plants ──
console.log('━━━ EDGE CASE: User with NO plants ━━━');
spoofMonth(7); // July — peak season
const noPlantAlerts = detectPestDiseaseRisks(makeBlightWeather('2026-07-15'), []);
console.log(`July, no plants: ${noPlantAlerts.length} alerts (expected: 0 for disease, may have wind/desiccation)`);
const diseaseOnly = noPlantAlerts.filter(a => ['late_blight', 'powdery_mildew', 'botrytis'].includes(a.type));
console.log(`Disease alerts specifically: ${diseaseOnly.length} (expected: 0)`);
restoreDate();

console.log('');
console.log('✅ Test complete');
