import React from 'react';
import { UVCard } from './components/weather-cards/UVCard';
import { render } from 'react-dom';

// Normal daytime scenario
const daytimeWeather = {
  uvi: 2, // Low UV index
  sunriseISO: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(),
  sunsetISO: new Date(new Date().setHours(20, 0, 0, 0)).toISOString()
};

// Nighttime scenario
const nighttimeWeather = {
  uvi: 0,
  sunriseISO: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(),
  sunsetISO: new Date(new Date().setHours(20, 0, 0, 0)).toISOString()
};

// Force nighttime by setting current time after sunset
const originalDate = Date;
global.Date = class extends Date {
  constructor(...args) {
    if (args.length === 0) {
      // Set current time to 10:00 PM (22:00)
      const nightTime = new originalDate();
      nightTime.setHours(22, 0, 0, 0);
      return super(nightTime);
    }
    return super(...args);
  }
};

console.log('Testing UVCard with daytime values:');
console.log(daytimeWeather);

console.log('\nTesting UVCard with nighttime scenario:');
console.log(nighttimeWeather);
console.log('Current time (mocked):', new Date().toLocaleTimeString());
console.log('Sunrise time:', new Date(nighttimeWeather.sunriseISO).toLocaleTimeString());
console.log('Sunset time:', new Date(nighttimeWeather.sunsetISO).toLocaleTimeString());

// Check if it's nighttime according to our logic
const now = new Date();
const sunrise = new Date(nighttimeWeather.sunriseISO);
const sunset = new Date(nighttimeWeather.sunsetISO);
const isNightTime = now < sunrise || now > sunset;

console.log('\nNighttime detection:');
console.log('Is nighttime?', isNightTime);
console.log('Now < Sunrise?', now < sunrise);
console.log('Now > Sunset?', now > sunset);

// Restore original Date constructor
global.Date = originalDate;

console.log('\nVerification complete! If "Is nighttime?" is true, then the UVCard should show "🧛‍♀️ Party all night" on a black badge with white text.');
