import React from 'react';
import { Waves, ArrowDown, Clock } from 'lucide-react';
import WeatherStatCard from './WeatherStatCard';
import { formatWaveHeight, formatCardinalDirection } from '../../../lib/findr/weatherFormatting';
import { formatRelativeTime } from '../../../lib/findr/weatherFormatting';
import { TranslatedText } from '../../translation/TranslatedFishCard';
import { getWaveDescription, getWaveDescriptionShort } from '../../../utils/weatherLabels';

interface WaveSummaryCardProps {
  waveHeightM?: number | null;
  wavePeriodS?: number | null;
  waveDirectionDeg?: number | null;
  chlorophyllMgM3?: number | null;
  updatedAt?: string | null;
}

export function WaveSummaryCard({ waveHeightM, wavePeriodS, waveDirectionDeg, updatedAt }: WaveSummaryCardProps) {
  const height = formatWaveHeight(waveHeightM);
  const updatedLabel = formatRelativeTime(updatedAt ?? undefined);
  
  // Get short descriptor for main display (bold text)
  const waveShortDesc = waveHeightM != null ? getWaveDescriptionShort(waveHeightM) : '—';
  
  // Get full descriptive wave condition message for subtitle
  const waveDescription = waveHeightM != null ? getWaveDescription(waveHeightM) : 'Wave conditions';
  
  // Format wave direction
  const waveDirectionCardinal = formatCardinalDirection(waveDirectionDeg);

  return (
    <WeatherStatCard
      title={<TranslatedText text="Waves" />}
      subtitle={<TranslatedText text={waveDescription} />}
      icon={<Waves className="size-5" />}
      value={waveShortDesc}
      badge={height}
      footer={updatedLabel ? <TranslatedText text={`Updated ${updatedLabel}`} /> : undefined}
    >
      <div className="flex items-center justify-between text-xs text-base-content/70">
        <div className="flex items-center gap-2">
          <Clock className="size-4" />
          <span><TranslatedText text="Period" /> {wavePeriodS != null ? `${Math.round(wavePeriodS)}s` : '—'}</span>
        </div>
        {waveDirectionDeg != null ? (
          <div className="flex items-center gap-1">
            <ArrowDown className="size-3" style={{ transform: `rotate(${waveDirectionDeg}deg)` }} />
            <span><TranslatedText text="towards" /> {waveDirectionCardinal}</span>
          </div>
        ) : null}
      </div>
    </WeatherStatCard>
  );
}

export default WaveSummaryCard;
