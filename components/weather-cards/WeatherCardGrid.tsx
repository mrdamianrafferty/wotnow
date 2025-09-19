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
import { WeatherBundle } from '../../types/weather';
import { AirQualityAssessment } from '../../utils/airQualityUtils';

// Narrow shapes for dependent cards (avoid leaking full bundle where not needed)
interface TodaySubset {
  uvi?: number;
  moonPhase?: number;
  moonriseISO?: string;
  moonsetISO?: string;
}

interface PollenAssessmentLite { description?: string; advice?: string }

interface PollenTodayDetail {
  grass_pollen?: string; tree_pollen?: string; weed_pollen?: string; olive_pollen?: string;
  alder_pollen?: string; birch_pollen?: string; ragweed_pollen?: string; mugwort_pollen?: string;
}

interface WeatherCardGridProps {
  weather: Pick<WeatherBundle,
    'uvi' | 'sunriseISO' | 'sunsetISO' | 'airQuality' | 'pollen' | 'visibilityKm' | 'humidityPct' | 'pressureHpa' | 'pressureTrend' | 'soil' | 'dewPointC'
  > | null;
  today: TodaySubset;
  uvRingClass: string; // retained (may style UVCard)
  aqiAssess: AirQualityAssessment | null;
  pollenAssess: PollenAssessmentLite | null;
  pollenIdx: number;
  pollenBadgeClass: string; // still forwarded for styling if needed
  pollenToday: PollenTodayDetail;
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
      <UVCard weather={weather || {}} uvRingClass={uvRingClass} today={today} />
      <AirQualityCard weather={weather || {}} aqiAssess={aqiAssess} />
      <PollenCard 
        pollenAssess={pollenAssess || {}} 
        pollenIdx={pollenIdx} 
        pollenBadgeClass={pollenBadgeClass} 
        pollenToday={pollenToday || {}} 
      />
      <VisibilityCard visibilityKm={visibilityKm} />
      <HumidityCard weather={{ dewPointC: weather?.dewPointC }} humidity={humidity} />
      <PressureCard 
        weather={weather ? { pressureHpa: weather.pressureHpa, pressureTrend: weather.pressureTrend } : null} 
        pressureTrend={pressureTrend} 
        pressure={pressure} 
      />
      <SoilCard weather={weather ? { soil: {
        temp0cm: weather.soil?.vwc, // placeholder mapping if differing naming
        // leaving other depths undefined until available in WeatherBundle
      }} : {}} />
      <SunriseSunsetCard weather={{ sunriseISO: weather?.sunriseISO, sunsetISO: weather?.sunsetISO }} />
      <MoonCard today={today} />
    </div>
  );
};
