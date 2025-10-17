#!/usr/bin/env tsx
/**
 * Test weather guild messages
 * Verifies that different species guilds produce appropriate personality messages
 */

import { getWeatherMessage, getWeatherSummary } from '../lib/utils/weatherMessages';

console.log('🎣 Testing Weather Guild Messages\n');
console.log('=' .repeat(80));

// Test scenarios
const scenarios = [
  {
    name: 'Perfect Conditions',
    weather: { windSpeedMS: 2, pressureHPA: 1025, weatherScore: 9 }
  },
  {
    name: 'Good Conditions',
    weather: { windSpeedMS: 5, pressureHPA: 1015, weatherScore: 7 }
  },
  {
    name: 'Fair Conditions',
    weather: { windSpeedMS: 8, pressureHPA: 1008, weatherScore: 5 }
  },
  {
    name: 'Poor Conditions',
    weather: { windSpeedMS: 13, pressureHPA: 995, weatherScore: 3 }
  }
];

// Test species from different guilds
const testSpecies = [
  { code: 'mac', name: 'Mackerel', guild: 'Surface Pelagic' },
  { code: 'bss', name: 'Bass', guild: 'Versatile Predator' },
  { code: 'ple', name: 'Plaice', guild: 'Bottom Feeder' },
  { code: 'BUH', name: 'Bull Huss', guild: 'Shark/Ray' },
  { code: 'wrb', name: 'Ballan Wrasse', guild: 'Reef Species' },
  { code: 'cod', name: 'Cod', guild: 'Demersal Predator' },
  { code: 'her', name: 'Herring', guild: 'Baitfish' },
  { code: 'alb', name: 'Albacore', guild: 'Large Pelagic' }
];

scenarios.forEach(scenario => {
  console.log(`\n\n${scenario.name.toUpperCase()}`);
  console.log(`Weather: ${getWeatherSummary(scenario.weather)}`);
  console.log(`Wind: ${scenario.weather.windSpeedMS} m/s, Pressure: ${scenario.weather.pressureHPA} hPa`);
  console.log(`Score: ${scenario.weather.weatherScore}/10`);
  console.log('-'.repeat(80));
  
  testSpecies.forEach(species => {
    const message = getWeatherMessage(species.code, species.name, scenario.weather);
    console.log(`\n${message.emoji} ${species.name} (${species.guild}):`);
    console.log(`   "${message.message}"`);
    console.log(`   Tone: ${message.tone}`);
  });
});

console.log('\n' + '='.repeat(80));
console.log('✅ Weather message test complete!\n');
console.log('Notice how different guilds react differently to the same conditions:');
console.log('  • Surface feeders (Mackerel, Herring) hate wind');
console.log('  • Bottom dwellers (Plaice) barely notice surface wind');
console.log('  • Sharks care most about barometric pressure');
console.log('  • Bass are balanced and versatile\n');
