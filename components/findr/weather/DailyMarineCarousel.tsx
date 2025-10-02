import React from 'react';
import { WiDaySunny, WiFlood, WiDayWindy } from 'react-icons/wi';
import { Trophy } from 'lucide-react';
import { formatWaveHeight, formatWindSpeed, formatTemperature } from '../../../lib/findr/weatherFormatting';
import type { FallbackConditionPayload } from '../../../lib/findr/fallbackConditions';
import { TranslatedText } from '../../translation/TranslatedFishCard';

interface DailyMarineCarouselProps {
  entries: FallbackConditionPayload['snapshot']['daily'];
}

export function DailyMarineCarousel({ entries }: DailyMarineCarouselProps) {
  return (
    <div className="card bg-base-200/40 border border-base-200/80 shadow-sm">
      <div className="card-body gap-4">
        <div>
          <h2 className="text-base font-semibold"><TranslatedText text="7-day marine outlook" /></h2>
          <p className="text-xs text-base-content/60">Plan ahead with rolling wave, water and wind summaries.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
          {entries.map((entry) => (
            <div className="card bg-base-100 border border-base-200/80 shadow-sm h-full" key={`${entry.dateLabel}-${entry.label}`}>
              <div className="card-body gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{entry.label}</p>
                    <p className="text-xs text-base-content/60">{entry.dateLabel}</p>
                  </div>
                  {entry.fishingScore != null ? (
                    <span className="badge badge-primary gap-1">
                      <Trophy className="size-3.5" /> {Math.round(entry.fishingScore)}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base-content/70">
                      <WiFlood className="size-5 text-primary" /> Waves
                    </span>
                    <span className="font-semibold">{formatWaveHeight(entry.waveHeightM)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base-content/70">
                      <WiDaySunny className="size-5 text-warning" /> Water
                    </span>
                    <span className="font-semibold">{formatTemperature(entry.seaTemperatureC)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-base-content/70">
                      <WiDayWindy className="size-5 text-info" /> Wind
                    </span>
                    <span className="font-semibold">{formatWindSpeed(entry.windSpeedKts)}</span>
                  </div>
                </div>

                <p className="text-xs text-base-content/70 leading-relaxed">{entry.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DailyMarineCarousel;
