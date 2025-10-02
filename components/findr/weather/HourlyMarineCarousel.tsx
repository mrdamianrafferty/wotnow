import React from 'react';
import { WiDayWindy, WiHot, WiBarometer } from 'react-icons/wi';
import { Waves } from 'lucide-react';
import WeatherCarousel from './WeatherCarousel';
import { formatDisplayTime, formatWaveHeight, formatWindSpeed, formatTemperature, formatTideHeight } from '../../../lib/findr/weatherFormatting';
import type { FallbackConditionPayload } from '../../../lib/findr/fallbackConditions';

interface HourlyMarineCarouselProps {
  entries: FallbackConditionPayload['snapshot']['hourly'];
}

export function HourlyMarineCarousel({ entries }: HourlyMarineCarouselProps) {
  const cards = entries.map((entry) => (
    <div className="card bg-base-100 border border-base-200/80 shadow-sm h-full" key={`${entry.time}-${entry.waveHeightM}`}>
      <div className="card-body gap-3">
        <div>
          <p className="text-sm font-semibold">{formatDisplayTime(entry.time)}</p>
          <p className="text-xs text-base-content/60">Hourly outlook</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Waves className="size-4 text-primary" /> Wave
            </span>
            <span className="font-semibold">{formatWaveHeight(entry.waveHeightM)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <WiDayWindy className="size-5 text-info" /> Wind
            </span>
            <span className="font-semibold">{formatWindSpeed(entry.windSpeedKts)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <WiHot className="size-5 text-warning" /> Water
            </span>
            <span className="font-semibold">{formatTemperature(entry.seaTemperatureC)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <WiBarometer className="size-5 text-secondary" /> Tide
            </span>
            <span className="font-semibold">{formatTideHeight(entry.tideMeters)}</span>
          </div>
        </div>
      </div>
    </div>
  ));

  return (
    <WeatherCarousel
      title="Hourly marine carousel"
      items={cards}
      controlsAriaLabel="Hourly marine outlook"
    />
  );
}

export default HourlyMarineCarousel;
