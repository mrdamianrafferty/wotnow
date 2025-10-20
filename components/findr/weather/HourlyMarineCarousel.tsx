import React, { useState } from 'react';
import { WiDayWindy, WiHot, WiBarometer } from 'react-icons/wi';
import { Waves, ArrowUp } from 'lucide-react';
import Image from 'next/image';
import WeatherCarousel from './WeatherCarousel';
import { formatDisplayTime, formatWaveHeight, formatWindSpeed, formatTemperature } from '../../../lib/findr/weatherFormatting';
import type { FallbackConditionPayload } from '../../../lib/findr/fallbackConditions';
import type { TideEvent } from '../../../types/weather';
import { TranslatedText } from '../../translation/TranslatedFishCard';

interface HourlyMarineCarouselProps {
  entries: FallbackConditionPayload['snapshot']['hourly'];
  tideEvents?: TideEvent[];
}

/**
 * Calculate tide state for a given time based on tide events
 * Returns: 'High', 'Low', 'Rising', or 'Falling'
 */
function getTideState(timeISO: string, tideEvents: TideEvent[]): string {
  if (!tideEvents || tideEvents.length === 0) return '—';
  
  const targetTime = new Date(timeISO).getTime();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  
  // Check if within 30 minutes of high or low tide
  for (const event of tideEvents) {
    const eventTime = new Date(event.timeISO).getTime();
    const diff = Math.abs(targetTime - eventTime);
    
    if (diff <= THIRTY_MINUTES) {
      return event.type === 'HIGH' ? 'High' : 'Low';
    }
  }
  
  // Find surrounding tide events to determine rising or falling
  const sorted = [...tideEvents]
    .map(e => ({ ...e, time: new Date(e.timeISO).getTime() }))
    .sort((a, b) => a.time - b.time);
  
  // Find the tide events before and after target time
  let before: typeof sorted[0] | null = null;
  let after: typeof sorted[0] | null = null;
  
  for (const event of sorted) {
    if (event.time < targetTime) {
      before = event;
    } else if (event.time > targetTime && !after) {
      after = event;
      break;
    }
  }
  
  // Determine if rising or falling
  if (before && after) {
    // If previous was LOW and next is HIGH, we're rising
    if (before.type === 'LOW' && after.type === 'HIGH') {
      return 'Rising';
    }
    // If previous was HIGH and next is LOW, we're falling
    if (before.type === 'HIGH' && after.type === 'LOW') {
      return 'Falling';
    }
  }
  
  return '—';
}

function getWeatherIconUrl(code?: string | null): string {
  if (!code) return '/weather-icons/design/fill/final/na.svg';
  // Support standard weather icon codes (01d, 02d, etc.)
  const supported = new Set(['01d','01n','02d','02n','03d','03n','04d','04n','09d','09n','10d','10n','11d','11n','13d','13n','50d','50n','na']);
  const iconCode = supported.has(code) ? code : 'na';
  return `/weather-icons/design/fill/final/${iconCode}.svg`;
}

interface HourlyCardProps {
  entry: FallbackConditionPayload['snapshot']['hourly'][0];
  tideState: string;
}

function HourlyCard({ entry, tideState }: HourlyCardProps) {
  const [showPrecipAmount, setShowPrecipAmount] = useState(false);
  
  const iconUrl = getWeatherIconUrl(entry.weatherIcon);
  const precipMM = entry.precipMM != null ? Math.round(entry.precipMM) : null;
  const precipPct = entry.precipProbability != null ? Math.round(entry.precipProbability * 100) : null;
  const hasPrecipData = precipMM != null || precipPct != null;
  
  // Debug: log the temperature for this entry
  console.log('[HourlyCard]', {
    time: entry.time,
    airTempC: entry.airTempC,
    seaTemperatureC: entry.seaTemperatureC,
    weatherIcon: entry.weatherIcon,
  });
  
  return (
    <div className="card bg-base-100 border border-base-200/80 shadow-sm h-full">
      <div className="card-body gap-3">
        <div>
          <p className="text-sm font-semibold">{formatDisplayTime(entry.time)}</p>
          <p className="text-xs text-base-content/60"><TranslatedText text="Hourly outlook" /></p>
        </div>
        
        {/* Weather icon with air temperature */}
        <div className="flex items-center gap-2 pb-2 border-b border-base-200/60">
          <Image 
            src={iconUrl} 
            alt="Weather" 
            width={40} 
            height={40} 
            className="opacity-90" 
          />
          <span className="text-2xl font-semibold">
            {entry.airTempC != null ? `${Math.round(entry.airTempC)}°` : '—'}
          </span>
          {/* Debug: show raw value */}
          {entry.airTempC != null && (
            <span className="text-xs text-base-content/50">
              ({entry.airTempC.toFixed(1)}°)
            </span>
          )}
        </div>
        
        {/* Precipitation toggle */}
        {hasPrecipData && (
          <label 
            className="swap swap-rotate cursor-pointer text-sky-400 text-sm"
            title="Toggle rain amount / probability"
          >
            <input 
              type="checkbox" 
              checked={showPrecipAmount}
              onChange={(e) => setShowPrecipAmount(e.target.checked)}
              aria-label="Toggle precipitation view"
            />
            <span className="swap-off flex items-center gap-1.5">
              <Image 
                src="/weather-icons/design/fill/final/raindrop.svg" 
                alt="Rain" 
                width={20} 
                height={20} 
                className="opacity-80" 
              />
              <span>{precipPct != null ? `${precipPct}%` : '—'}</span>
            </span>
            <span className="swap-on flex items-center gap-1.5">
              <Image 
                src="/weather-icons/design/fill/final/raindrop.svg" 
                alt="Rain amount" 
                width={20} 
                height={20} 
                className="opacity-80" 
              />
              <span>{precipMM != null ? `${precipMM}mm` : '—'}</span>
            </span>
          </label>
        )}
        
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Waves className="size-4 text-primary" /> <TranslatedText text="Wave" />
            </span>
            <span className="font-semibold">{formatWaveHeight(entry.waveHeightM)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <WiDayWindy className="size-5 text-info" /> <TranslatedText text="Wind" />
            </span>
            <span className="font-semibold flex items-center gap-1">
              {entry.windDirectionDeg != null && (
                <ArrowUp 
                  className="size-4" 
                  style={{ transform: `rotate(${(entry.windDirectionDeg + 180) % 360}deg)` }} 
                />
              )}
              {formatWindSpeed(entry.windSpeedKts)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <WiHot className="size-5 text-warning" /> <TranslatedText text="Water" />
            </span>
            <span className="font-semibold">{formatTemperature(entry.seaTemperatureC)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <WiBarometer className="size-5 text-secondary" /> <TranslatedText text="Tide" />
            </span>
            <span className="font-semibold"><TranslatedText text={tideState} /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HourlyMarineCarousel({ entries, tideEvents = [] }: HourlyMarineCarouselProps) {
  const cards = entries.map((entry) => {
    const tideState = getTideState(entry.time, tideEvents);
    return (
      <HourlyCard key={`${entry.time}-${entry.waveHeightM}`} entry={entry} tideState={tideState} />
    );
  });

  return (
    <WeatherCarousel
      title="Hourly marine carousel"
      items={cards}
      controlsAriaLabel="Hourly marine outlook"
      translateTitle
    />
  );
}

export default HourlyMarineCarousel;
