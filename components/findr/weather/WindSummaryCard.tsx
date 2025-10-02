import React from 'react';
import { Wind, Navigation, FlagTriangleRight } from 'lucide-react';
import WeatherStatCard from './WeatherStatCard';
import { formatWindSpeed, formatCardinalDirection } from '../../../lib/findr/weatherFormatting';
import { formatRelativeTime } from '../../../lib/findr/weatherFormatting';
import { TranslatedText } from '../../translation/TranslatedFishCard';

interface WindSummaryCardProps {
  speedKts?: number | null;
  directionDeg?: number | null;
  updatedAt?: string | null;
}

export function WindSummaryCard({ speedKts, directionDeg, updatedAt }: WindSummaryCardProps) {
  const cardinal = formatCardinalDirection(directionDeg);
  const speed = formatWindSpeed(speedKts);
  const updatedLabel = formatRelativeTime(updatedAt ?? undefined);

  return (
    <WeatherStatCard
      title={<TranslatedText text="Wind" />}
      subtitle={<TranslatedText text="Surface conditions" />}
      icon={<Wind className="size-5" />}
      value={speed}
      badge={cardinal}
      footer={updatedLabel ? <TranslatedText text={`Updated ${updatedLabel}`} /> : undefined}
    >
      <div className="flex items-center justify-between text-xs text-base-content/70">
        <div className="flex items-center gap-2">
          <Navigation className="size-4" />
          <span>{cardinal}</span>
        </div>
        {directionDeg != null ? (
          <span className="flex items-center gap-1">
            <FlagTriangleRight className="size-3" style={{ transform: `rotate(${directionDeg}deg)` }} />
            {Math.round(directionDeg)}°
          </span>
        ) : null}
      </div>
    </WeatherStatCard>
  );
}

export default WindSummaryCard;
