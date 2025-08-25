import React from 'react';
import PollenWarning from './PollenWarning';
import AirQualityWarning from './AirQualityWarning';
import { PollenSummary, assessPollenConditions } from '../utils/pollenUtils';
import { AirQualitySummary, assessAirQualityConditions } from '../utils/airQualityUtils';

interface EnvironmentalIndicatorsProps {
  pollen?: PollenSummary;
  airQuality?: AirQualitySummary;
  mode?: 'compact' | 'full';
  className?: string;
  showPollenFor?: string; // activity type for exclusion logic
  showAirQualityFor?: string; // activity type for exclusion logic
  isStaleData?: boolean; // indicates if environmental data is stale/historical
  lastUpdated?: Date; // timestamp when the environmental data was last updated
}

/**
 * Combined environmental indicators component that displays both pollen and air quality warnings
 * side by side with consistent spacing and design
 */
export default function EnvironmentalIndicators({ 
  pollen, 
  airQuality, 
  mode = 'compact', 
  className = '',
  showPollenFor,
  showAirQualityFor,
  isStaleData = false, // default to false if not provided
  lastUpdated
}: EnvironmentalIndicatorsProps) {
  const pollenAssessment = pollen ? assessPollenConditions(pollen) : null;
  const airQualityAssessment = airQuality ? assessAirQualityConditions(airQuality) : null;
  
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
      {isStaleData && (
        <div className="stale-data-indicator" style={{ 
          fontSize: '11px', 
          color: '#FF6B00', 
          fontWeight: 'bold',
          backgroundColor: 'rgba(255, 251, 230, 0.9)',
          padding: '2px 4px',
          borderRadius: '3px',
          border: '1px solid #FF6B00',
          marginLeft: '4px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative'
        }}>
          <span style={{ marginRight: '4px' }}>👴🏼</span>
          {lastUpdated ? (
            <span>
              Updated {new Date(lastUpdated).toLocaleDateString()}
              <span 
                className="tooltip-trigger"
                style={{ 
                  marginLeft: '4px', 
                  cursor: 'help',
                  borderBottom: '1px dotted #FF6B00' 
                }}
                title={`Environmental data is updated every 12-24 hours. This data was last updated on ${new Date(lastUpdated).toLocaleString()}.`}
              >
                ⓘ
              </span>
            </span>
          ) : (
            <span>
              Historical Data
              <span 
                className="tooltip-trigger"
                style={{ 
                  marginLeft: '4px', 
                  cursor: 'help',
                  borderBottom: '1px dotted #FF6B00' 
                }}
                title="AQI data updates every 12-24 hours, while pollen data updates every few hours. This data may not reflect current conditions."
              >
                ⓘ
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
