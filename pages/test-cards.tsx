import React from 'react';
import { AirQualityCardV2 } from '../components/weather-cards/AirQualityCard';
import { TestCard } from '../components/TestCard';
import Link from 'next/link';

export default function TestPage() {
  // Create some sample data for the AirQualityCard
  const mockWeather = {
    airQuality: {
      aqi: 35,
      pm2_5: 5.2,
      pm10: 12.5,
      no2: 25.3,
      o3: 30.1,
      so2: 2.1,
      co: 250
    }
  };

  // Using null for aqiAssess as it's allowed in the component interface
  const mockAssess = null;

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Test Page for Weather Cards</h1>
      <Link href="/my-new-weather" className="text-blue-500 hover:underline mb-4 block">
        Return to Weather Page
      </Link>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Card Component</h2>
        <TestCard />
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">AirQualityCard Component</h2>
        <AirQualityCardV2 
          weather={mockWeather} 
          aqiAssess={mockAssess}
        />
      </div>
    </div>
  );
}
