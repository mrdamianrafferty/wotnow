import React from 'react';
import { Wind, ArrowUp } from 'lucide-react';
import WeatherStatCard from './WeatherStatCard';
import { formatCardinalDirection } from '../../../lib/findr/weatherFormatting';
import { formatRelativeTime } from '../../../lib/findr/weatherFormatting';
import { TranslatedText } from '../../translation/TranslatedFishCard';
import { getWindMessage, getBeaufortDescription } from '../../../utils/weatherLabels';

interface WindSummaryCardProps {
  speedKts?: number | null;
  directionDeg?: number | null;
  updatedAt?: string | null;
}

export function WindSummaryCard({ speedKts, directionDeg, updatedAt }: WindSummaryCardProps) {
  const cardinal = formatCardinalDirection(directionDeg);
  const updatedLabel = formatRelativeTime(updatedAt ?? undefined);
  
  // Convert knots to m/s for Beaufort and wind message
  const windSpeedMS = speedKts != null ? speedKts / 1.94384 : undefined;
  const windSpeedKmH = windSpeedMS != null ? windSpeedMS * 3.6 : undefined;
  
  // Get Beaufort scale description for main display
  const beaufortDesc = windSpeedMS != null ? getBeaufortDescription(windSpeedMS) : '—';
  
  // Format multi-unit wind speed display
  const multiUnitSpeed = speedKts != null && windSpeedKmH != null && windSpeedMS != null
    ? `${Math.round(speedKts)} kts / ${Math.round(windSpeedKmH)} km/h / ${windSpeedMS.toFixed(1)} m/s`
    : null;
  
  const windMessage = getWindMessage({
    windSpeed: windSpeedMS,
    windDirection: directionDeg ?? undefined,
    context: 'land',
  });

  // Create badge with arrow and direction
  const badgeContent = directionDeg != null ? (
    <span className="flex items-center gap-1">
      <ArrowUp className="size-3" style={{ transform: `rotate(${(directionDeg + 180) % 360}deg)` }} />
      {cardinal}
    </span>
  ) : cardinal;

  return (
    <WeatherStatCard
      title={<TranslatedText text="Wind" />}
      subtitle={windMessage ? <TranslatedText text={windMessage} /> : <TranslatedText text="Current conditions" />}
      icon={<Wind className="size-5" />}
      value={<TranslatedText text={beaufortDesc} />}
      badge={badgeContent}
      footer={updatedLabel ? <TranslatedText text={`Updated ${updatedLabel}`} /> : undefined}
    >
      {multiUnitSpeed && (
        <div className="text-xs text-base-content/60">
          {multiUnitSpeed}
        </div>
      )}
    </WeatherStatCard>
  );
}

export default WindSummaryCard;
