// AirQualityCard Debug Script
// Tests the AirQualityCard component with different AQI values
import React from 'react';
import { render } from 'react-dom';
import { AirQualityCard } from './components/weather-cards/AirQualityCard';
import { assessAirQualityConditions } from './utils/airQualityUtils';

// Sample data for different AQI scenarios
const testScenarios = [
  {
    name: "Good Air Quality",
    weather: {
      airQuality: {
        aqi: 35,
        pm2_5: 8,
        pm10: 25,
        no2: 50,
        o3: 30,
        so2: 5,
        co: 2
      }
    }
  },
  {
    name: "Moderate Air Quality",
    weather: {
      airQuality: {
        aqi: 75,
        pm2_5: 20,
        pm10: 80,
        no2: 120,
        o3: 60,
        so2: 150,
        co: 6
      }
    }
  },
  {
    name: "Unhealthy for Sensitive Groups",
    weather: {
      airQuality: {
        aqi: 130,
        pm2_5: 40,
        pm10: 200,
        no2: 250,
        o3: 80,
        so2: 250,
        co: 10
      }
    }
  },
  {
    name: "Unhealthy",
    weather: {
      airQuality: {
        aqi: 175,
        pm2_5: 80,
        pm10: 280,
        no2: 400,
        o3: 95,
        so2: 500,
        co: 14
      }
    }
  },
  {
    name: "Very Unhealthy",
    weather: {
      airQuality: {
        aqi: 250,
        pm2_5: 200,
        pm10: 380,
        no2: 700,
        o3: 150,
        so2: 700,
        co: 25
      }
    }
  },
  {
    name: "Hazardous",
    weather: {
      airQuality: {
        aqi: 350,
        pm2_5: 300,
        pm10: 500,
        no2: 1500,
        o3: 250,
        so2: 1000,
        co: 40
      }
    }
  }
];

// Create container for the test
const container = document.createElement('div');
container.className = 'p-4 bg-base-100 min-h-screen';
document.body.appendChild(container);

// Render title
const title = document.createElement('h1');
title.className = 'text-2xl font-bold mb-6';
title.textContent = 'AirQualityCard Debug Preview';
container.appendChild(title);

// Create grid for the cards
const grid = document.createElement('div');
grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
container.appendChild(grid);

// Render each test scenario
testScenarios.forEach(scenario => {
  const scenarioContainer = document.createElement('div');
  scenarioContainer.className = 'flex flex-col';
  
  const scenarioTitle = document.createElement('h2');
  scenarioTitle.className = 'text-lg font-semibold mb-2';
  scenarioTitle.textContent = scenario.name;
  scenarioContainer.appendChild(scenarioTitle);
  
  const cardContainer = document.createElement('div');
  scenarioContainer.appendChild(cardContainer);
  
  grid.appendChild(scenarioContainer);
  
  // Assess air quality
  const aqiAssess = assessAirQualityConditions(scenario.weather.airQuality || {});
  
  // Render the card
  render(
    <AirQualityCard 
      weather={scenario.weather} 
      aqiAssess={aqiAssess} 
    />, 
    cardContainer
  );
});

console.log('AirQualityCard debug preview rendered');
