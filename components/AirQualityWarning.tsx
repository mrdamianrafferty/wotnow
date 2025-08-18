import React from 'react';
import { AirQualityLevel, AirQualityAssessment, getAirQualityLevelDescription, assessAirQualityConditions, AirQualitySummary, getAirQualityIndex } from '../utils/airQualityUtils';

interface AirQualityWarningProps {
  airQuality?: AirQualitySummary;
  assessment?: AirQualityAssessment;
  mode?: 'compact' | 'full';
  className?: string;
}

/**
 * Get color for air quality level - EPA AQI color scheme
 */
function getAirQualityLevelColor(level: AirQualityLevel): string {
  switch (level) {
    case AirQualityLevel.NONE: return '#6b7280'; // Gray for no data/none
    case AirQualityLevel.GOOD: return '#00E400'; // Green - Air quality satisfactory
    case AirQualityLevel.MODERATE: return '#FFFF00'; // Yellow - Acceptable, mild risk for sensitive people
    case AirQualityLevel.UNHEALTHY_SENSITIVE: return '#FF7E00'; // Orange - Asthma, elderly, children affected
    case AirQualityLevel.UNHEALTHY: return '#FF0000'; // Red - Everyone may feel effects
    case AirQualityLevel.VERY_UNHEALTHY: return '#99004C'; // Purple - Health alert, emergency conditions
    case AirQualityLevel.HAZARDOUS: return '#7E0023'; // Maroon - Serious health effects for entire population
    default: return '#6b7280'; // Gray fallback
  }
}

/**
 * Get background color with opacity for better visual hierarchy
 */
function getAirQualityBackgroundColor(level: AirQualityLevel): string {
  switch (level) {
    case AirQualityLevel.NONE: return 'rgba(107, 114, 128, 0.1)'; // Light gray
    case AirQualityLevel.GOOD: return 'rgba(0, 228, 0, 0.1)'; // Light green
    case AirQualityLevel.MODERATE: return 'rgba(255, 255, 0, 0.15)'; // Light yellow
    case AirQualityLevel.UNHEALTHY_SENSITIVE: return 'rgba(255, 126, 0, 0.15)'; // Light orange
    case AirQualityLevel.UNHEALTHY: return 'rgba(255, 0, 0, 0.15)'; // Light red
    case AirQualityLevel.VERY_UNHEALTHY: return 'rgba(153, 0, 76, 0.15)'; // Light purple
    case AirQualityLevel.HAZARDOUS: return 'rgba(126, 0, 35, 0.15)'; // Light maroon
    default: return 'rgba(107, 114, 128, 0.1)'; // Light gray
  }
}

/**
 * Get appropriate air quality icon - using extreme-smoke.svg for all air quality indicators
 */
function getAirQualityIcon(): string {
  return '/weather-icons/design/fill/final/extreme-smoke.svg';
}

/**
 * Overall air quality level indicator for compact mode - icon-only version
 */
function OverallAirQualityIndicator({ 
  level, 
  assessment,
  aqi
}: { 
  level: AirQualityLevel; 
  assessment: AirQualityAssessment;
  aqi?: number;
}) {
  // Temporarily removed the level check to debug visibility
  // if (level <= AirQualityLevel.GOOD) return null;

  const color = getAirQualityLevelColor(level);
  const bgColor = getAirQualityBackgroundColor(level);
  const levelText = getAirQualityLevelDescription(level);
  
  // Create comprehensive tooltip text
  const tooltipText = `Air quality: ${levelText}${aqi ? ` (AQI ${getAirQualityIndex(aqi)})` : ''}`;

  return (
    <div 
      className="air-quality-overall-indicator"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '18px', // Slightly larger than pollen to match visual presence
        height: '18px', // Slightly larger than pollen to match visual presence
        borderRadius: '50%', // Perfect circle
        backgroundColor: bgColor,
        border: `2px solid ${color}`, // Match pollen indicator border thickness
        cursor: 'help',
        flexShrink: 0 // Prevent shrinking in flex containers
      }}
      role="status"
      aria-label={tooltipText}
      title={tooltipText}
    >
      <img 
        src={getAirQualityIcon()}
        alt=""
        style={{ 
          width: '14px', // Proportional to 18px container
          height: '14px', // Proportional to 18px container
          objectFit: 'contain' // Ensure proper scaling
        }}
        aria-hidden="true"
      />
    </div>
  );
}

export default function AirQualityWarning({ 
  airQuality, 
  assessment, 
  mode = 'full', 
  className = '' 
}: AirQualityWarningProps) {
  // Use provided assessment or calculate from air quality data
  const airQualityAssessment = assessment || (airQuality ? assessAirQualityConditions(airQuality) : null);
  
  if (!airQualityAssessment) {
    return null;
  }

  // Only show if air quality is moderate or worse
  if (airQualityAssessment.overall < AirQualityLevel.MODERATE) {
    return null;
  }

  if (mode === 'compact') {
    return (
      <div className={`air-quality-warning-compact ${className}`}>
        <OverallAirQualityIndicator 
          level={airQualityAssessment.overall} 
          assessment={airQualityAssessment}
          aqi={airQuality?.overall}
        />
      </div>
    );
  }

  return (
    <div 
      className={`air-quality-warning-full ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb'
      }}
      role="region"
      aria-label="Air quality level information"
    >
      {/* Header with overall level */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px'
      }}>
        <div style={{ 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: getAirQualityBackgroundColor(airQualityAssessment.overall),
          border: `2px solid ${getAirQualityLevelColor(airQualityAssessment.overall)}`,
          flexShrink: 0
        }}>
          <img 
            src={getAirQualityIcon()}
            alt=""
            style={{ 
              width: '14px', 
              height: '14px',
              objectFit: 'contain'
            }}
            aria-hidden="true"
          />
        </div>
        <span style={{ 
          fontSize: '13px', 
          fontWeight: '600', 
          color: '#374151' 
        }}>
          Air Quality
        </span>
        {airQuality?.overall && (
          <span style={{ 
            fontSize: '11px', 
            fontWeight: '500', 
            color: '#6b7280',
            marginLeft: 'auto'
          }}>
            AQI {getAirQualityIndex(airQuality.overall)}
          </span>
        )}
      </div>

      {/* Warning messages if any */}
      {airQualityAssessment.warnings.length > 0 && (
        <div style={{
          marginTop: '4px',
          padding: '6px',
          borderRadius: '6px',
          backgroundColor: getAirQualityBackgroundColor(airQualityAssessment.overall),
          border: `1px solid ${getAirQualityLevelColor(airQualityAssessment.overall)}`,
          fontSize: '11px',
          lineHeight: '1.3'
        }}>
          {airQualityAssessment.warnings.map((warning, index) => (
            <div key={index} style={{ color: '#374151' }}>
              • {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
