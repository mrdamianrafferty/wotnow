import React from 'react';
import { UVCard } from './UVCard';
import { AirQualityCard } from './AirQualityCard';
import { PollenCard } from './PollenCard';
import { VisibilityCard } from './VisibilityCard';
import { HumidityCard } from './HumidityCard';
import { PressureCard } from './PressureCard';
import { SoilCard } from './SoilCard';
import { SunriseSunsetCard } from './SunriseSunsetCard';
import { MoonCard } from './MoonCard';

interface WeatherCardGridProps {
  weather: any;
  today: any;
  uvRingClass: string;
  aqiAssess: any;
  pollenAssess: any;
  pollenIdx: number;
  pollenBadgeClass: string;
  pollenToday: any;
  visibilityKm: number | null;
  humidity: number | null;
  pressureTrend: string | null;
  pressure: number | null;
  className?: string;
}

export const WeatherCardGrid: React.FC<WeatherCardGridProps> = ({
  weather,
  today,
  uvRingClass,
  aqiAssess,
  pollenAssess,
  pollenIdx,
  pollenBadgeClass,
  pollenToday,
  visibilityKm,
  humidity,
  pressureTrend,
  pressure,
  className = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 xl:gap-8 mt-4 lg:mt-6 xl:mt-8"
}) => {
  return (
    <div className={className}>
      <UVCard weather={weather} uvRingClass={uvRingClass} today={today} />
      <AirQualityCard weather={weather} aqiAssess={aqiAssess} />
      <PollenCard 
        pollenAssess={pollenAssess} 
        pollenIdx={pollenIdx} 
        pollenBadgeClass={pollenBadgeClass} 
        pollenToday={pollenToday} 
      />
      <VisibilityCard visibilityKm={visibilityKm} />
      <HumidityCard weather={weather} humidity={humidity} />
      <PressureCard 
        weather={weather} 
        pressureTrend={pressureTrend} 
        pressure={pressure} 
      />
      <SoilCard weather={weather} />
      <SunriseSunsetCard weather={weather} />
      <MoonCard today={today} />
    </div>
  );
};
