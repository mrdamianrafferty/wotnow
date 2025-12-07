import { config } from 'dotenv';
import { fetchStormglassMarine } from './lib/services/weatherService';

config({ path: '.env.local' });
config({ path: '.env' });

// Test with API key
const lat = 50.5;  // English Channel
const lon = -1.5;
const start = new Date().toISOString();
const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const apiKey = process.env.STORMGLASS_SECRET_KEY;

if (!apiKey) {
  console.error('STORMGLASS_SECRET_KEY not found in environment');
  process.exit(1);
}

console.log('Testing Stormglass marine data with API key...');
fetchStormglassMarine(lat, lon, start, end, undefined, apiKey)
  .then(result => {
    if (result && typeof result === 'object' && 'hours' in result) {
      const hours = (result as { hours: Record<string, unknown>[] }).hours;
      if (Array.isArray(hours) && hours.length > 0) {
        console.log('SUCCESS - Stormglass data available:');
        console.log('Hours returned:', hours.length);
        const firstHour = hours[0];
        console.log('First hour data keys:', Object.keys(firstHour));
        console.log('Wind speed data:', (firstHour as { windSpeed?: unknown }).windSpeed);
        console.log('Wave height data:', (firstHour as { waveHeight?: unknown }).waveHeight);
        console.log('Water temperature data:', (firstHour as { waterTemperature?: unknown }).waterTemperature);
      } else {
        console.log('Stormglass responded but no hourly data');
        console.log('Response structure:', Object.keys(result));
      }
    } else {
      console.log('NO DATA - Stormglass returned null/empty');
      console.log('Result type:', typeof result);
    }
  })
  .catch(err => console.error('ERROR:', err));