import React from 'react';
import PollenWarning from './PollenWarning';
import AirQualityWarning from './AirQualityWarning';
import { PollenSummary } from '../utils/pollenUtils';
import { AirQualitySummary } from '../utils/airQualityUtils';

interface EnvironmentalIndicatorsProps {
  pollen?: PollenSummary;
  airQuality?: AirQualitySummary;
  mode?: 'compact' | 'full';
  className?: string;
}

/**
 * Combined environmental indicators component that displays both pollen and air quality warnings
 * side by side with consistent spacing and design
 */
export default function EnvironmentalIndicators({ 
  pollen, 
  airQuality, 
  mode = 'compact', 
  className = ''
}: EnvironmentalIndicatorsProps) {
  const hasPollenData = pollen && Object.values(pollen).some(value => value !== undefined && value > 0);
  const hasAirQualityData = airQuality && Object.values(airQuality).some(value => value !== undefined && value > 0);
  
  // If no environmental data, don't render anything
  if (!hasPollenData && !hasAirQualityData) {
    return null;
  }

  return (
    <div 
      className={`environmental-indicators ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px', // Space between pollen and air quality indicators
        flexWrap: 'wrap' // Allow wrapping on smaller screens
      }}
    >
      {hasPollenData && (
        <PollenWarning 
          pollen={pollen} 
          mode={mode}
        />
      )}
      {hasAirQualityData && (
        <AirQualityWarning 
          airQuality={airQuality} 
          mode={mode}
        />
      )}
    </div>
  );
}
