import { analyzeWeatherForTasks, WeatherForecast, SoilConditions, UserPlant } from '@/lib/grow/weatherTaskEngine';

// Test locations with simulated weather data for January
const testLocations = [
  { name: 'Helsinki, Finland', lat: 60.17, tempMin: -8, tempMax: -2, humidity: 90, windGust: 25, soilTemp: -2 },
  { name: 'Warsaw, Poland', lat: 52.23, tempMin: -14, tempMax: -8, humidity: 85, windGust: 20, soilTemp: -5 },
  { name: 'Minneapolis, USA', lat: 44.98, tempMin: -15, tempMax: -8, humidity: 60, windGust: 30, soilTemp: -8 },
  { name: 'Rome, Italy', lat: 41.90, tempMin: 4, tempMax: 12, humidity: 65, windGust: 15, soilTemp: 8 },
  { name: 'Lisbon, Portugal', lat: 38.72, tempMin: 8, tempMax: 15, humidity: 75, windGust: 20, soilTemp: 12 },
  { name: 'Miami, USA', lat: 25.76, tempMin: 16, tempMax: 24, humidity: 70, windGust: 15, soilTemp: 20 },
  { name: 'Phoenix, USA', lat: 33.45, tempMin: 8, tempMax: 22, humidity: 20, windGust: 10, soilTemp: 14 },
  { name: 'Seattle, USA', lat: 47.61, tempMin: 4, tempMax: 10, humidity: 80, windGust: 25, soilTemp: 6 },
];

for (const loc of testLocations) {
  console.log(`\n=== ${loc.name} ===`);

  const forecast: WeatherForecast[] = [{
    date: new Date().toISOString().split('T')[0],
    tempMin: loc.tempMin,
    tempMax: loc.tempMax,
    humidity: loc.humidity,
    precipitation: loc.humidity > 70 ? 5 : 0,
    precipProbability: loc.humidity > 70 ? 60 : 10,
    windSpeed: loc.windGust * 0.6,
    windGust: loc.windGust,
    uvIndex: 3,
    description: 'test',
  }];

  const soil: SoilConditions = {
    temp0cm: loc.soilTemp + 1,
    temp6cm: loc.soilTemp,
    temp18cm: loc.soilTemp - 1,
    temp54cm: loc.soilTemp - 2,
    moisture0to1cm: 30,
    moisture1to3cm: 30,
    moisture3to9cm: 35,
    moisture9to27cm: 40,
  };

  // Test with common garden plants
  const plants: UserPlant[] = [
    { id: '1', plantName: 'Tomato', plantSlug: 'tomato', frostTolerance: 'tender', waterNeeds: 'moderate', temperatureMin: 10, temperatureMax: 30 },
    { id: '2', plantName: 'Lettuce', plantSlug: 'lettuce', frostTolerance: 'hardy', waterNeeds: 'high', temperatureMin: 4, temperatureMax: 20 },
    { id: '3', plantName: 'Potato', plantSlug: 'potato', frostTolerance: 'half-hardy', waterNeeds: 'moderate', temperatureMin: 7, temperatureMax: 25 },
  ];

  const result = analyzeWeatherForTasks(forecast, soil, plants);

  console.log(`Soil temp (6cm): ${loc.soilTemp}°C | Air temp: ${loc.tempMin}°C to ${loc.tempMax}°C`);
  console.log(`Alerts (${result.alerts.length}):`);
  for (const a of result.alerts) {
    const sev = a.severity.toUpperCase();
    console.log(`  - [${sev}] ${a.title}`);
  }

  console.log(`Watering: ${result.wateringRecommendation.shouldWater ? 'YES' : 'NO'} - ${result.wateringRecommendation.reason}`);

  console.log(`Planting windows:`);
  for (const w of result.plantingWindows) {
    const status = w.canPlantNow ? 'CAN PLANT' : 'WAIT';
    console.log(`  - ${w.plantSlug}: ${status} (needs ${w.soilTempRequired}°C, have ${w.currentSoilTemp}°C)`);
  }
}
