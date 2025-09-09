// pages/new-weather.tsx
// A clean page to showcase our latest components

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AirQualityCard } from "../components/weather-cards/AirQualityCard";
import { PollenCard } from "../components/weather-cards/PollenCard";
import { UVCard } from "../components/weather-cards/UVCard";
import { SoilCard } from "../components/weather-cards/SoilCard";
import { TestCard } from "../components/TestCard";
import { 
  assessAirQualityConditions, 
  getAirQualityIndex, 
  getAirQualityLevelDescription, 
  AirQualityLevel,
  AirQualitySummary,
  AirQualityAssessment,
  convertCOtoPPM,
  formatPollutantValue
} from "../utils/airQualityUtils";
import { assessPollenConditions } from "../utils/pollenUtils";
import { useUserPreferences } from "../context/UserPreferencesContext";

// Helper to get AQI color based on index value
const getAqiColor = (aqi: number): string => {
  if (aqi <= 50) return '#00E400'; // Green - Good
  if (aqi <= 100) return '#FFFF00'; // Yellow - Moderate
  if (aqi <= 150) return '#FF7E00'; // Orange - Unhealthy for Sensitive Groups
  if (aqi <= 200) return '#FF0000'; // Red - Unhealthy
  if (aqi <= 300) return '#8F3F97'; // Purple - Very Unhealthy
  return '#7E0023'; // Maroon - Hazardous
};

// Helper to get AQI level text based on index value
const getAqiLevelText = (aqi: number): string => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

// Helper to get AQI advice based on index value
const getAqiAdvice = (aqi: number): string => {
  if (aqi <= 50) return "Air is sparkling clean – perfect for being outdoors.";
  if (aqi <= 100) return "Air is okay – sensitive folks keep an inhaler or tissues handy.";
  if (aqi <= 150) return "If you have asthma, allergies, or are older/very young, take it easy outside. Others are fine.";
  if (aqi <= 200) return "Air is unhealthy – everyone should cut back on outdoor exercise and avoid long exposure.";
  if (aqi <= 300) return "Air quality is very poor – stay indoors if you can. Outdoor activity is not safe for anyone.";
  return "Dangerously polluted air – avoid going outside. Keep windows closed and use clean indoor air if possible.";
};

// Helper to get position on scale from AQI value (0-500 scale)
const getAqiScalePosition = (aqi: number): number => {
  // Scale to 0-100%
  return Math.min(100, Math.max(0, (aqi / 500) * 100));
};

// Helper to get gradient background for AQI
const getAqiGradient = (): string => {
  return `linear-gradient(to right, 
    #00E400 0%, 
    #00E400 10%, 
    #83DE00 20%, 
    #FFFF00 30%, 
    #FFC000 40%, 
    #FF7E00 50%, 
    #FF5000 60%, 
    #FF0000 70%, 
    #AA4BA8 80%, 
    #8F3F97 90%, 
    #7E0023 100%
  )`;
};

// Helper component for rendering AQI scale bar
const AqiBar: React.FC<{
  aqi: number;
  size?: 'sm' | 'md';
}> = ({ aqi, size = 'sm' }) => {
  const height = size === 'sm' ? 'h-1.5' : 'h-2';
  const markerSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const markerTop = size === 'sm' ? '-4px' : '-8px';
  const markerBorder = size === 'sm' ? 'border' : 'border-2';
  
  // Calculate position (0-100%)
  const position = getAqiScalePosition(aqi);

  return (
    <div className="relative">
      <div className={`w-full ${height} rounded-full overflow-hidden`}>
        <div 
          className="h-full w-full"
          style={{ background: getAqiGradient() }}
        />
      </div>
      <div 
        className="absolute pointer-events-none"
        style={{
          top: markerTop,
          left: `calc(${position}% - 4px)`,
        }}
      >
        <div 
          className={`${markerSize} bg-white rounded-full ${markerBorder} shadow-sm`}
          style={{ borderColor: getAqiColor(aqi) }}
        />
      </div>
    </div>
  );
};

// Component for individual pollutant display
const PollutantCard: React.FC<{
  name: string;
  value?: number;
  emoji: string;
  unit: string;
  description: string;
  ranges: {min: number; max: number; level: string; description: string; cause: string}[];
}> = ({ name, value, emoji, unit, description, ranges }) => {
  // Find the appropriate range for the pollutant value
  const getCurrentRange = () => {
    if (value === undefined) return null;
    return ranges.find((range, index) => {
      // For the last range, check if it's above the min
      if (index === ranges.length - 1) return value >= range.min;
      // Otherwise check if it's between min and max
      return value >= range.min && value < range.max;
    });
  };

  const currentRange = getCurrentRange();
  const levelEmoji = currentRange?.level === '🟢 Good' ? '🟢' : 
                     currentRange?.level === '🟡 Moderate' ? '🟡' : 
                     currentRange?.level === '🟠 UFS' ? '🟠' : 
                     currentRange?.level === '🔴 Unhealthy' ? '🔴' :
                     currentRange?.level === '🟣 Very Unhealthy' ? '🟣' : '🟤';

  return (
    <div className="bg-black/10 rounded-lg p-3 mb-3">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium flex items-center gap-1">
          {emoji} {name} <span className="text-xs opacity-70">({unit})</span>
        </h4>
        {value !== undefined && currentRange && (
          <span className="text-sm">
            {formatPollutantValue(value)} - {levelEmoji}
          </span>
        )}
      </div>

      <div className="text-xs opacity-80 mb-2">{description}</div>
      
      {value !== undefined && currentRange ? (
        <div className="border-t border-white/10 pt-2 mt-1">
          <div className="text-sm mb-1 font-medium">{currentRange.level}</div>
          <div className="text-xs opacity-80 mb-1">{currentRange.description}</div>
          <div className="text-xs opacity-80"><strong>Likely cause:</strong> {currentRange.cause}</div>
        </div>
      ) : (
        <div className="text-xs opacity-70 italic">No data available</div>
      )}
    </div>
  );
};

// A simplified version of AirQualityCard for version 3
const AirQualityCardLatest: React.FC<{
  weather: {
    airQuality?: {
      aqi?: number;
      pm2_5?: number;
      pm10?: number;
      no2?: number;
      o3?: number;
      so2?: number;
      co?: number;
      components?: {
        pm2_5?: number;
        pm10?: number;
        no2?: number;
        o3?: number;
        so2?: number;
        co?: number;
        [key: string]: number | undefined;
      };
    };
  };
  aqiAssess: AirQualityAssessment | null;
}> = ({ weather, aqiAssess }) => {
  const aqi = weather?.airQuality?.aqi || 0;
  const aqiColor = getAqiColor(aqi);
  const aqiLevel = getAqiLevelText(aqi);
  const aqiAdvice = getAqiAdvice(aqi);
  
  // Define the pollutant data and ranges
  const pollutantData = [
    {
      name: 'NO₂ — Nitrogen Dioxide',
      value: weather?.airQuality?.no2 !== undefined
        ? weather.airQuality.no2
        : weather?.airQuality?.components?.no2,
      emoji: '🚗',
      unit: 'µg/m³',
      description: 'Gas from traffic exhaust (especially diesel cars, vans, buses, lorries) and boilers/heaters.',
      ranges: [
        { min: 0, max: 100, level: '🟢 Good', description: 'Safe levels.', cause: 'Clean air, low traffic.' },
        { min: 101, max: 188, level: '🟡 Moderate', description: 'Can irritate airways in sensitive people.', cause: 'Local traffic flow, diesel vehicles.' },
        { min: 189, max: 360, level: '🟠 UFS', description: 'Asthma and lung conditions more likely to flare.', cause: 'Busy roads, rush-hour diesel, heating boilers.' },
        { min: 361, max: 649, level: '🔴 Unhealthy', description: 'Breathing discomfort for many.', cause: 'Heavy traffic, congestion hotspots.' },
        { min: 650, max: 1249, level: '🟣 Very Unhealthy', description: 'Strong airway inflammation risk.', cause: 'Major road corridors, industrial combustion.' },
        { min: 1250, max: 10000, level: '🟤 Hazardous', description: 'Dangerous exposure levels.', cause: 'Very high diesel exhaust, industrial accident.' },
      ]
    },
    {
      name: 'PM2.5 — Fine particles',
      value: weather?.airQuality?.pm2_5 !== undefined
        ? weather.airQuality.pm2_5
        : weather?.airQuality?.components?.pm2_5,
      emoji: '🔥',
      unit: 'µg/m³',
      description: 'Tiny dust, smoke, and soot particles that reach deep into lungs and bloodstream.',
      ranges: [
        { min: 0, max: 12, level: '🟢 Good', description: 'Clean air.', cause: 'Clear weather, little burning.' },
        { min: 12.1, max: 35.4, level: '🟡 Moderate', description: "Irritates lungs if you are sensitive.", cause: 'Some local traffic, mild wood smoke.' },
        { min: 35.5, max: 55.4, level: '🟠 UFS', description: 'Worsens asthma, heart symptoms.', cause: 'More diesel traffic, home wood stoves.' },
        { min: 55.5, max: 150.4, level: '🔴 Unhealthy', description: 'Affects everyone – cough, breathlessness.', cause: 'Heavy traffic, solid-fuel heating, smog.' },
        { min: 150.5, max: 250.4, level: '🟣 Very Unhealthy', description: 'High risk to lungs/heart.', cause: 'Wildfire smoke, urban haze events.' },
        { min: 250.5, max: 10000, level: '🟤 Hazardous', description: 'Serious harm likely.', cause: 'Major fire smoke, dust storms.' },
      ]
    },
    {
      name: 'PM10 — Coarse particles',
      value: weather?.airQuality?.pm10 !== undefined
        ? weather.airQuality.pm10
        : weather?.airQuality?.components?.pm10,
      emoji: '💨',
      unit: 'µg/m³',
      description: 'Bigger dust and pollen-sized particles; irritate airways and eyes.',
      ranges: [
        { min: 0, max: 54, level: '🟢 Good', description: 'No concern.', cause: 'Normal clean air.' },
        { min: 55, max: 154, level: '🟡 Moderate', description: 'Throat/eye irritation.', cause: 'Dusty roads, farming, light construction.' },
        { min: 155, max: 254, level: '🟠 UFS', description: 'Asthma/bronchitis flare risk.', cause: 'Quarrying, ploughing, local works.' },
        { min: 255, max: 354, level: '🔴 Unhealthy', description: 'Breathing discomfort for many.', cause: 'Strong dust from traffic or building.' },
        { min: 355, max: 424, level: '🟣 Very Unhealthy', description: 'Marked respiratory stress.', cause: 'Construction, desert dust episodes.' },
        { min: 425, max: 10000, level: '🟤 Hazardous', description: 'Dangerous dust levels.', cause: 'Dust storm, industrial accident.' },
      ]
    },
    {
      name: 'O₃ — Ozone',
      value: weather?.airQuality?.o3 !== undefined
        ? weather.airQuality.o3
        : weather?.airQuality?.components?.o3,
      emoji: '🌆',
      unit: 'ppb',
      description: 'Formed when sunlight reacts with traffic fumes; classic "summer smog".',
      ranges: [
        { min: 0, max: 54, level: '🟢 Good', description: 'No concern.', cause: 'Clean, cool air.' },
        { min: 55, max: 70, level: '🟡 Moderate', description: 'Irritates lungs if exercising.', cause: 'Sunny weather + light traffic emissions.' },
        { min: 71, max: 85, level: '🟠 UFS', description: 'Chest tightness, cough in sensitive groups.', cause: 'Warm sunny days, rush-hour precursors.' },
        { min: 86, max: 105, level: '🔴 Unhealthy', description: 'Affects everyone, reduces lung function.', cause: 'Hot sunny smog episode.' },
        { min: 106, max: 200, level: '🟣 Very Unhealthy', description: 'Strong airway irritation.', cause: 'Severe urban photochemical smog.' },
        { min: 200, max: 10000, level: '🟤 Hazardous', description: 'Dangerous oxidant exposure.', cause: 'Extreme pollution + stagnant hot air.' },
      ]
    },
    {
      name: 'SO₂ — Sulphur Dioxide',
      value: weather?.airQuality?.so2 !== undefined
        ? weather.airQuality.so2
        : weather?.airQuality?.components?.so2,
      emoji: '🏭',
      unit: 'µg/m³',
      description: 'From burning sulphur fuels: coal, heavy oil, industry.',
      ranges: [
        { min: 0, max: 100, level: '🟢 Good', description: 'No concern.', cause: 'Clean air.' },
        { min: 101, max: 196, level: '🟡 Moderate', description: 'Nose/throat irritation in sensitive people.', cause: 'Local oil/coal burning.' },
        { min: 197, max: 304, level: '🟠 UFS', description: 'Quick asthma triggers possible.', cause: 'Industry, shipping, power plants.' },
        { min: 305, max: 604, level: '🔴 Unhealthy', description: 'Irritation for many.', cause: 'Strong industrial output, still weather.' },
        { min: 605, max: 804, level: '🟣 Very Unhealthy', description: 'Strong irritation.', cause: 'Industrial smog episodes.' },
        { min: 805, max: 10000, level: '🟤 Hazardous', description: 'Dangerous exposure.', cause: 'Industrial accident, coal smoke.' },
      ]
    },
    {
      name: 'CO — Carbon Monoxide',
      value: (() => {
        // Get CO value from either direct property or components
        const coValue = weather?.airQuality?.co !== undefined 
          ? weather.airQuality.co 
          : weather?.airQuality?.components?.co;
        
        // Convert from μg/m³ to ppm
        return convertCOtoPPM(coValue);
      })(),
      emoji: '🚘',
      unit: 'ppm',
      description: 'Colourless gas; binds to blood and prevents oxygen transport.',
      ranges: [
        { min: 0, max: 4.4, level: '🟢 Good', description: 'No concern.', cause: 'Normal background.' },
        { min: 4.5, max: 9.4, level: '🟡 Moderate', description: 'Mild headache/fatigue if sensitive.', cause: 'Busy traffic junctions.' },
        { min: 9.5, max: 12.4, level: '🟠 UFS', description: 'Reduces oxygen to tissues.', cause: 'Poorly vented heaters, traffic jams.' },
        { min: 12.5, max: 15.4, level: '🔴 Unhealthy', description: 'Dizziness, nausea possible.', cause: 'Enclosed car parks, stove exhausts.' },
        { min: 15.5, max: 30.4, level: '🟣 Very Unhealthy', description: 'Serious symptoms with exposure.', cause: 'Indoor stoves, faulty boilers.' },
        { min: 30.5, max: 10000, level: '🟤 Hazardous', description: 'CO poisoning risk.', cause: 'Fire smoke, enclosed exhaust build-up.' },
      ]
    },
  ];
  
  return (
    <div className="card bg-base-100 shadow-xl max-w-sm">
      <div className="card-body p-4">
        <div className="flex justify-between items-center">
          <h3 className="card-title flex items-center gap-2">
            <span>Air Quality</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">V3</span>
          </h3>
          <div 
            className="badge badge-lg" 
            style={{ backgroundColor: aqiColor, color: aqi <= 100 ? 'black' : 'white' }}
          >
            {aqi} - {aqiLevel}
          </div>
        </div>
        
        <div className="my-2">
          <p className="text-sm opacity-80">
            {aqiAdvice}
          </p>
        </div>
        
        {/* AQI Scale bar with marker */}
        <div className="mt-3 mb-1">
          <AqiBar aqi={aqi} size="md" />
          
          {/* Scale labels */}
          <div className="flex justify-between text-xs opacity-80 mt-1">
            <span>0</span>
            <span>100</span>
            <span>200</span>
            <span>300</span>
            <span>500</span>
          </div>
        </div>

        <div className="text-xs opacity-70 mt-3 mb-2">
          {aqiAssess?.warnings && aqiAssess.warnings.length > 0 && (
            <div className="mb-2">{aqiAssess.warnings[0]}</div>
          )}
        </div>
        
        {/* Detailed pollutant section (non-collapsible) */}
        <div className="bg-black/10 rounded-lg mt-3">
          <div className="p-2 text-sm font-medium border-b border-white/10">Air Pollutants</div>
          <div className="p-3">
            {pollutantData.map((pollutant, index) => (
              <PollutantCard 
                key={index}
                name={pollutant.name}
                value={pollutant.value}
                emoji={pollutant.emoji}
                unit={pollutant.unit}
                description={pollutant.description}
                ranges={pollutant.ranges}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main page component
export default function NewWeatherPage() {
  const [weather, setWeather] = useState<any>(null);
  const { preferences } = useUserPreferences();
  
  // Sample weather data for AirQualityCard
  const sampleWeatherData = {
    airQuality: {
      aqi: 35,
      pm2_5: 5.2,
      pm10: 12.5,
      no2: 25.3,
      o3: 30.1,
      so2: 2.1,
      co: 250
    },
    uvi: 5.8,
    sunriseISO: new Date(new Date().setHours(6, 30, 0, 0)).toISOString(),
    sunsetISO: new Date(new Date().setHours(19, 45, 0, 0)).toISOString(),
    soil: {
      temp0cm: 22.4,
      temp6cm: 20.7,
      temp18cm: 19.1,
      temp54cm: 16.8,
      moisture0to1: 0.28,
      moisture1to3: 0.31,
      moisture3to9: 0.33,
      moisture9to27: 0.36
    },
    soilTimeISO: new Date().toISOString()
  };

  // Fetch real weather data (if needed)
  const fetchWeatherData = async () => {
    try {
      // Use a default location if none in preferences
      const lat = preferences?.locations?.[0]?.lat || 43.5141935;
      const lon = preferences?.locations?.[0]?.lon || -5.2712551;
      
      const response = await fetch(`/api/unified-weather?lat=${lat}&lon=${lon}&mode=land`);
      if (response.ok) {
        const data = await response.json();
        setWeather(data);
      }
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, [preferences]);

  // Prepare AQI assessment
  const aqiAssess = useMemo(() => {
    return assessAirQualityConditions(weather?.airQuality || sampleWeatherData.airQuality);
  }, [weather, sampleWeatherData.airQuality]);

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">New Weather Components</h1>
        <p className="text-gray-600">
          This page contains the latest versions of our weather components.
        </p>
        <div className="mt-4">
          <Link href="/my-new-weather" className="text-blue-500 hover:underline mr-4">
            Return to Weather Page
          </Link>
          <Link href="/test-cards" className="text-blue-500 hover:underline">
            Test Cards Page
          </Link>
        </div>
      </header>

      <section className="bg-slate-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Fixed AirQualityCard Component (v3)</h2>
        <div className="flex flex-wrap gap-4">
          <AirQualityCardLatest 
            weather={weather || sampleWeatherData} 
            aqiAssess={aqiAssess}
          />
        </div>
      </section>

      <section className="bg-slate-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Original AirQualityCard Component</h2>
        <div className="flex flex-wrap gap-4">
          <AirQualityCard 
            weather={weather || sampleWeatherData} 
            aqiAssess={aqiAssess}
          />
        </div>
      </section>

      <section className="bg-slate-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Other Weather Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UVCard 
            weather={{
              uvi: weather?.uvi || sampleWeatherData.uvi,
              sunriseISO: weather?.sunriseISO || sampleWeatherData.sunriseISO,
              sunsetISO: weather?.sunsetISO || sampleWeatherData.sunsetISO
            }}
            today={{ uvi: weather?.uvi || sampleWeatherData.uvi }}
          />

          <PollenCard 
            pollenAssess={{
              description: "Overall pollen level: High",
              advice: "Consider limiting outdoor activities during peak pollen hours"
            }}
            pollenIdx={3}
            pollenToday={{
              grass_pollen: "2",
              tree_pollen: "1", 
              weed_pollen: "3"
            }}
          />
          
          <SoilCard 
            weather={weather || sampleWeatherData}
          />
          
          <TestCard />
        </div>
      </section>

      <section className="bg-slate-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Technical Details</h2>
        <div className="prose max-w-none">
          <p>This page demonstrates the latest version of our AirQualityCard component with:</p>
          <ul>
            <li>Standard styling (red background removed)</li>
            <li>Fixed hydration issues</li>
            <li>Complete pollutant data display</li>
            <li>Responsive design</li>
            <li>Proper data handling from API</li>
          </ul>
          <p className="text-gray-700 mt-4">
            <strong>Note:</strong> If components are not appearing correctly on the main weather page,
            this might be due to:
          </p>
          <ol>
            <li>React hydration errors (now fixed)</li>
            <li>Caching issues (try hard refresh)</li>
            <li>Component naming conflicts</li>
            <li>Build optimization issues (try full rebuild)</li>
          </ol>
        </div>
      </section>

      <footer className="text-center text-gray-500 text-sm mt-8">
        Component recovery page — <span suppressHydrationWarning>{new Date().toLocaleDateString()}</span>
      </footer>
    </div>
  );
}
