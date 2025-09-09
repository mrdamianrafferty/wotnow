import React, { useState, useEffect } from 'react';

interface WaveCardProps {
  waveHeightM?: number | null;
  wavePeriodS?: number | null;
  waveDir?: number | null;
  swellHeightM?: number | null;
  swellPeriodS?: number | null;
  swellDir?: number | null;
  windSpeedMS?: number | null;
  windDir?: number | null;
  seaTemp?: number | null;
  waveSeries?: Array<{height: number | null; time?: string}> | Array<number | null>;
  lat?: number;
  lon?: number;
}

// Temporary fallback data for standalone component
const marineNow = {
  wave: { height: 1.2, period: 8, dir: 180 },
  wind: { speed: 20, dir: 190 },
  seaTemp: 18
};

// Helper functions (temporarily inline)
const getWaveDescription = (height: number): string => {
  if (height < 0.5) return 'Calm seas';
  if (height < 1.0) return 'Light waves';
  if (height < 2.0) return 'Moderate waves';
  if (height < 4.0) return 'Rough seas';
  return 'Very rough seas';
};

const periodClass = (period: number): string => {
  if (period < 6) return 'badge-error';
  if (period < 10) return 'badge-warning'; 
  return 'badge-success';
};

const degToCompass = (deg: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(deg / 22.5) % 16];
};

// Enhanced compass component with directional arrows and clear labels
const Compass: React.FC<{
  swellDir: number;
  swellMag: number;
  windDir: number;
  windMag: number;
}> = ({ swellDir, swellMag, windDir, windMag }) => {
  // Arrow component for displaying direction vectors
  const ArrowFromDirection = ({
    degrees, 
    thickness = 2, 
    length = 25, 
    color = 'white',
    label = ''
  }: {
    degrees: number; 
    thickness?: number; 
    length?: number; 
    color?: string;
    label?: string;
  }) => {
    // Calculate the center and points for an arrow coming FROM the given direction
    // (Arrow pointing toward the center, indicating wind/waves coming from that direction)
    const radians = (degrees - 90) * (Math.PI / 180); // -90 to start from north
    
    // Center point is 40,40
    const center = { x: 40, y: 40 };
    
    // Arrow starts from outside (tail) and points toward center (head)
    const tail = {
      x: center.x + Math.cos(radians) * length,
      y: center.y + Math.sin(radians) * length
    };
    
    // Arrow shaft extends from tail toward center, but not all the way
    const shaftEnd = {
      x: center.x + Math.cos(radians) * (length * 0.3), // Stop short of center
      y: center.y + Math.sin(radians) * (length * 0.3)
    };
    
    return (
      <g>
        <title>{label} coming from {Math.round(degrees)}°</title>
        
        {/* Arrow shaft */}
        <line
          x1={tail.x}
          y1={tail.y}
          x2={shaftEnd.x}
          y2={shaftEnd.y}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        
        {/* Arrowhead at the center-facing end */}
        <polygon
          points={`
            ${shaftEnd.x},${shaftEnd.y} 
            ${shaftEnd.x + Math.cos(radians + Math.PI/2) * 4},${shaftEnd.y + Math.sin(radians + Math.PI/2) * 4}
            ${shaftEnd.x - Math.cos(radians) * 8},${shaftEnd.y - Math.sin(radians) * 8}
            ${shaftEnd.x + Math.cos(radians - Math.PI/2) * 4},${shaftEnd.y + Math.sin(radians - Math.PI/2) * 4}
          `}
          fill={color}
        />
      </g>
    );
  };

  // Simplified direction name (N, NE, E, etc)
  const swellDirName = degToCompass(swellDir);
  const windDirName = degToCompass(windDir);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="text-center mb-1 text-xs">
        <div className="font-medium">Wave & Wind Direction</div>
        <div className="opacity-80 font-semibold">Arrows point TO shore FROM sea/air</div>
      </div>
      <div className="relative w-28 h-28 mx-auto">
        <svg width="112" height="112" viewBox="0 0 80 80" className="absolute inset-0">
          {/* Compass circle */}
          <circle
            cx="40"
            cy="40"
            r="38"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.3"
          />
          
          {/* Cardinal directions - made bolder and more prominent */}
          <text x="40" y="10" textAnchor="middle" fontSize="12" fill="currentColor" opacity="1.0" fontWeight="bold">N</text>
          <text x="70" y="40" textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.9" fontWeight="bold">E</text>
          <text x="40" y="72" textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.9" fontWeight="bold">S</text>
          <text x="10" y="40" textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.9" fontWeight="bold">W</text>
          
          {/* Intercardinal directions - kept lighter */}
          <text x="59" y="21" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.6">NE</text>
          <text x="59" y="61" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.6">SE</text>
          <text x="21" y="61" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.6">SW</text>
          <text x="21" y="21" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.6">NW</text>
          
          {/* Wind arrow (thinner) */}
          <ArrowFromDirection 
            degrees={windDir} 
            thickness={2} 
            length={36} 
            color="rgba(255,255,255,0.8)" 
            label="Wind"
          />
          
          {/* Wave/swell arrow (thicker) */}
          <ArrowFromDirection 
            degrees={swellDir} 
            thickness={4} 
            length={36} 
            color="rgba(59,130,246,0.9)" 
            label="Swell"
          />
        </svg>
      </div>
      <div className="flex flex-col w-full text-xs mt-2">
        <div className="flex justify-center gap-4 mb-2">
          <div className="flex items-center gap-1 opacity-80 bg-black/20 px-3 py-1 rounded">
            <span style={{ display:'inline-block', width:12, height:2, background:'white', borderRadius:2 }} />
            <span>Wind: {windDirName} {Math.round(windDir)}° ({Math.round(windMag)} km/h)</span>
          </div>
          <div className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded">
            <span style={{ display:'inline-block', width:12, height:4, background:'rgb(59,130,246)', borderRadius:2 }} />
            <span>Swell: {swellDirName} {Math.round(swellDir)}° ({swellMag.toFixed(1)}m)</span>
          </div>
        </div>
        <div className="text-center opacity-70 text-[10px] bg-black/10 py-1 rounded">
          <span>Example: "NW" means waves/wind coming <strong>from</strong> northwest <strong>toward</strong> shore</span>
        </div>
      </div>
    </div>
  );
};

export const WaveCard: React.FC<WaveCardProps> = ({
  waveHeightM,
  wavePeriodS,
  waveDir,
  swellHeightM,
  swellPeriodS,
  swellDir,
  windSpeedMS,
  windDir,
  seaTemp,
  waveSeries,
  lat,
  lon,
}) => {
  // Check if we have any marine data loaded (to prevent flash from fallback to real data)
  const hasMarineData = typeof waveHeightM === 'number' || 
                       typeof swellHeightM === 'number' || 
                       typeof seaTemp === 'number';
  
  // Get wave height with fallback
  const h = hasMarineData && typeof waveHeightM === 'number' ? waveHeightM : marineNow.wave.height;
  const p = hasMarineData && typeof wavePeriodS === 'number' ? wavePeriodS : marineNow.wave.period;
  const wdir = hasMarineData && typeof waveDir === 'number' ? waveDir : marineNow.wave.dir;
  const ws = hasMarineData && typeof windSpeedMS === 'number' ? windSpeedMS : (marineNow.wind.speed / 3.6);
  const wdeg = hasMarineData && typeof windDir === 'number' ? windDir : marineNow.wind.dir;
  const explanationSentence = getWaveDescription(h);
  
  // Use parametric wave SVG with period and height values
  const parametricWaveIconSrc = '/wave-period-icons/parametric-wave.svg';
  
  // Water temperature badge colour from cold (blue) → hot (red)
  // Enhanced sea temperature validation with location and seasonal awareness
  const seaTempRaw = (typeof seaTemp === 'number' ? seaTemp : marineNow.seaTemp);
  
  // Location-aware sea temperature validation
  // Dynamic location detection for coastal areas
  const isNorthernSpainCoast = lat !== undefined && lon !== undefined && 
    lat >= 43.0 && lat <= 44.0 && lon >= -6.0 && lon <= -4.0; // Asturias, Cantabria region
  const isMediterraneanSpain = lat !== undefined && lon !== undefined && 
    lat >= 36.0 && lat <= 42.0 && lon >= -1.0 && lon <= 4.0; // Mediterranean coast
  const isSouthernSpainCoast = lat !== undefined && lon !== undefined && 
    lat >= 35.0 && lat <= 37.0 && lon >= -7.0 && lon <= -5.0; // Andalusia coast
  const currentMonth = new Date().getMonth(); // 0-11, September = 8
  
  // Expected sea temperature ranges by season and region
  const getExpectedSeaTempRange = (month: number, region: string) => {
    const ranges = {
      northernSpain: {
        summer: { min: 16, max: 22, typical: 18 }, // June-Sep
        spring: { min: 12, max: 18, typical: 15 }, // Mar-May
        autumn: { min: 14, max: 18, typical: 16 }, // Oct-Dec
        winter: { min: 10, max: 14, typical: 12 }, // Dec-Feb
      },
      mediterranean: {
        summer: { min: 22, max: 28, typical: 25 },
        spring: { min: 16, max: 22, typical: 18 },
        autumn: { min: 18, max: 24, typical: 20 },
        winter: { min: 12, max: 16, typical: 14 },
      },
      southernSpain: {
        summer: { min: 20, max: 26, typical: 23 },
        spring: { min: 16, max: 20, typical: 18 },
        autumn: { min: 18, max: 22, typical: 20 },
        winter: { min: 14, max: 18, typical: 16 },
      },
      generic: {
        summer: { min: 18, max: 30, typical: 22 },
        spring: { min: 12, max: 20, typical: 16 },
        autumn: { min: 14, max: 22, typical: 18 },
        winter: { min: 8, max: 16, typical: 12 },
      }
    };
    
    const regionRanges = ranges[region as keyof typeof ranges] || ranges.generic;
    
    if (month >= 5 && month <= 8) return regionRanges.summer; // June-Sep
    if (month >= 2 && month <= 4) return regionRanges.spring; // Mar-May
    if (month >= 9 && month <= 11) return regionRanges.autumn; // Oct-Dec
    return regionRanges.winter; // Dec-Feb
  };
  
  const region = isNorthernSpainCoast ? 'northernSpain' : 
                 isMediterraneanSpain ? 'mediterranean' : 
                 isSouthernSpainCoast ? 'southernSpain' : 'generic';
  const expectedRange = getExpectedSeaTempRange(currentMonth, region);
  const isSuspiciousTemp = seaTempRaw > expectedRange.max + 5 || seaTempRaw < expectedRange.min - 3;
  
  // Only use valid temperatures, don't fall back to hardcoded values for suspicious readings
  let sea: number | null;
  if (isSuspiciousTemp && typeof seaTemp === 'number') {
    // Log suspicious temperature but don't display it
    sea = null;
    console.warn(`Suspicious sea temperature ${seaTempRaw}°C for ${currentMonth === 8 ? 'September' : 'current season'} in ${region}. Expected: ${expectedRange.min}-${expectedRange.max}°C. Not displaying temperature.`);
  } else {
    sea = typeof seaTemp === 'number' ? Math.max(0, Math.min(35, seaTempRaw)) : null; // Clamp to realistic range
  }
  
  // Debug logging for sea temperature
  if (seaTemp !== null && sea !== seaTemp) {
    console.warn(`Sea temperature ${seaTempRaw}°C ${sea === null ? 'rejected (suspicious reading)' : `adjusted to ${sea}°C (clamped to valid range)`}`);
  }
  // Remove excessive console.log statements to prevent unnecessary re-renders
  // if (typeof seaTemp !== 'number') {
  //   console.info(`No sea temperature data available for this location`);
  // } else if (!isSuspiciousTemp) {
  //   console.info(`Using API sea temperature: ${seaTemp}°C (validated to ${sea}°C)`);
  // }
  
  // State to hold the displayed temperature, preventing flash from fallback to API data
  const [displayTemp, setDisplayTemp] = useState<number | null>(null);

  useEffect(() => {
    if (typeof seaTemp === 'number') {
      const region = isNorthernSpainCoast ? 'northernSpain' : 
                     isMediterraneanSpain ? 'mediterranean' : 
                     isSouthernSpainCoast ? 'southernSpain' : 'generic';
      const expectedRange = getExpectedSeaTempRange(new Date().getMonth(), region);
      const isSuspiciousTemp = seaTemp > expectedRange.max + 5 || seaTemp < expectedRange.min - 3;
      
      if (isSuspiciousTemp) {
        setDisplayTemp(null);
        console.warn(`Suspicious sea temperature ${seaTemp}°C detected. Not displaying temperature.`);
      } else {
        const validated = Math.max(0, Math.min(35, seaTemp));
        setDisplayTemp(validated);
        console.info(`Sea temperature set to: ${validated}°C (API validated)`);
      }
    } else {
      setDisplayTemp(null);
    }
  }, [seaTemp, isNorthernSpainCoast, isMediterraneanSpain, isSouthernSpainCoast]);
  
  // Water temperature badge colour based on precise temperature ranges
  const getSeaTempColor = (temp: number): string => {
    if (temp <= 5) return '#08306b';      // 0-5°C: Deep navy blue (Arctic cold)
    if (temp <= 10) return '#2171b5';     // 6-10°C: Medium blue (Very cold)
    if (temp <= 15) return '#41b6c4';     // 11-15°C: Teal-cyan (Chilly)
    if (temp <= 18) return '#a1dab4';     // 16-18°C: Light aqua (Cool, swimmable)
    if (temp <= 21) return '#ffffb2';     // 19-21°C: Warm yellow (Normal lower range)
    if (temp <= 24) return '#fecc5c';     // 22-24°C: Orange-gold (Normal upper range)
    if (temp <= 27) return '#fd8d3c';     // 25-27°C: Deep orange (Warm/hot)
    if (temp <= 30) return '#e31a1c';     // 28-30°C: Bright red (Very hot)
    return '#b10026';                     // 31°C+: Dark crimson (Extreme/tropical hot)
  };
  
  const tempBadgeStyle: React.CSSProperties = displayTemp !== null ? {
    backgroundColor: getSeaTempColor(displayTemp),
    color: displayTemp <= 21 ? '#000' : '#fff', // Dark text for lighter colors (up to yellow), white for darker colors
    border: 'none',
    fontWeight: 'bold'
  } : {};
  
  const series = Array.isArray(waveSeries) ? 
    waveSeries.map((item, i) => {
      if (typeof item === 'number' || item === null) {
        // Legacy format - generate approximate times
        const now = new Date();
        const time = new Date(now.getTime() + i * 60 * 60 * 1000); // Hourly intervals
        return { height: item, time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      }
      return item; // New format with time data
    }).filter(item => item.height !== null) as Array<{height: number; time: string}> : [];
  const maxH = series.length ? Math.max(...series.map(s => s.height)) : null;

  // Prepare wave data for table
  const waveData = [
    { id: 'p', kind: 'Wave', height: h, period: p, direction: wdir },
    (typeof swellHeightM === 'number' && typeof swellPeriodS === 'number' && typeof swellDir === 'number') ? 
      { id: 's1', kind: 'Swell', height: swellHeightM, period: swellPeriodS, direction: swellDir } : null,
  ].filter(Boolean) as Array<{ id: string; kind: string; height: number; period: number; direction: number }>;

  return (
    <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
      <div className="card-body p-4">
        <div className="card-title mb-2 flex flex-col items-start">
          <span>Waves</span>
          {explanationSentence && (
            <span className="text-sm font-normal opacity-80">{explanationSentence}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-end gap-3">
            {/* Parametric wave SVG with period and height values */}
            <div className="w-16 h-16 relative">
              <object 
                type="image/svg+xml"
                data={parametricWaveIconSrc}
                className="w-full h-full object-contain"
                style={{ '--period': `${p}s`, '--height-m': h.toFixed(1) } as React.CSSProperties}
                aria-label={`${p.toFixed(1)}s period, ${h.toFixed(1)}m height wave`}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold">{h.toFixed(1)} m</span>
              <span className="text-sm opacity-80">Waves every {Math.round(p)} seconds</span>
            </div>
          </div>
        </div>
        <div className="mt-1">
          {displayTemp !== null ? (
            <span className="badge" style={tempBadgeStyle}>Sea {displayTemp.toFixed(1)}°C</span>
          ) : (
            <span className="badge badge-ghost">Sea temp unavailable</span>
          )}
        </div>

        <details className="collapse collapse-arrow mt-2">
          <summary className="collapse-title text-sm opacity-80">Details</summary>
          <div className="collapse-content">
            <div className="flex flex-col gap-3">
              {/* Wave details row */}
              <div className="bg-black/10 p-3 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Wave Details</h4>
                <div className="flex flex-col gap-2">
                  {waveData.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="font-medium">{s.kind}:</span>
                      <span>{s.height.toFixed(1)}m</span>
                      <span className={`badge badge-sm ${periodClass(s.period)}`}>
                        {s.period.toFixed(1)}s
                      </span>
                      <span className="opacity-70">
                        {degToCompass(s.direction)} ({Math.round(s.direction)}°)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Direction compass row */}
              <div className="bg-black/10 p-2 rounded-lg flex justify-center">
                <Compass 
                  swellDir={wdir} 
                  swellMag={h} 
                  windDir={wdeg} 
                  windMag={(ws || 0) * 3.6} 
                />
              </div>
            </div>

            <div className="mt-3">
              <h4 className="text-sm mb-1">Next 12h wave height</h4>
              <div className="rounded-box bg-black/25 backdrop-blur-sm p-3">
                <div className="flex items-end gap-1 h-16">
                  {(series.length ? series.slice(0, 12) : Array.from({ length: 12 }, (_, i) => {
                    const now = new Date();
                    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
                    return { height: null, time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
                  })).map((item, i) => {
                    const pct = (maxH && item.height !== null) ? 
                      Math.max(6, Math.min(100, Math.round((item.height / maxH) * 100))) : 10;
                    return (
                      <div 
                        key={i} 
                        className="tooltip w-3 bg-base-content/40 rounded-t hover:bg-base-content/60 transition-colors" 
                        style={{ height: `${pct}%` }} 
                        data-tip={item.height !== null ? `${item.time}: ${item.height.toFixed(1)}m` : `${item.time}: No data`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="mt-1 text-xs opacity-70">
                Forecast updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
