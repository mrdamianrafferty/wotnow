import React from 'react';
import { Waves, ArrowUp, Clock } from 'lucide-react';
import WeatherStatCard from './WeatherStatCard';
import { formatWaveHeight, formatCardinalDirection, formatCurrentDescription } from '../../../lib/findr/weatherFormatting';
import { formatRelativeTime } from '../../../lib/findr/weatherFormatting';
import { TranslatedText } from '../../translation/TranslatedFishCard';
import { getWaveDescriptionFindr, getWaveDescriptionFindrShort } from '../../../utils/weatherLabels';

interface WaveSummaryCardProps {
  waveHeightM?: number | null;
  wavePeriodS?: number | null;
  waveDirectionDeg?: number | null;
  chlorophyllMgM3?: number | null;
  updatedAt?: string | null;
  currentSpeedMS?: number | null;
  currentDirectionDeg?: number | null;
}

export function WaveSummaryCard({ waveHeightM, wavePeriodS, waveDirectionDeg, updatedAt, currentSpeedMS, currentDirectionDeg }: WaveSummaryCardProps) {
  const height = formatWaveHeight(waveHeightM);
  const updatedLabel = formatRelativeTime(updatedAt ?? undefined);
  
  // Get current description for footer
  const currentDescription = formatCurrentDescription(currentSpeedMS, currentDirectionDeg);
  
  // Get short descriptor for main display (bold text) - using Findr-specific descriptions
  const waveShortDesc = waveHeightM != null ? getWaveDescriptionFindrShort(waveHeightM) : '—';
  
  // Get full descriptive wave condition message for subtitle - using Findr-specific descriptions
  const waveDescription = waveHeightM != null ? getWaveDescriptionFindr(waveHeightM) : 'Wave conditions';
  
  // Format wave direction
  const waveDirectionCardinal = formatCardinalDirection(waveDirectionDeg);

  return (
    <WeatherStatCard
      title={<TranslatedText text="Waves" />}
      subtitle={<TranslatedText text={waveDescription} />}
      icon={<Waves className="size-5" />}
      value={<TranslatedText text={waveShortDesc} />}
      badge={height}
      footer={currentDescription ? <TranslatedText text={currentDescription} /> : (updatedLabel ? <TranslatedText text={`Updated ${updatedLabel}`} /> : undefined)}
    >
      <div className="flex items-center justify-between text-xs text-base-content/70">
        <div className="flex items-center gap-2">
          <Clock className="size-4" />
          <span><TranslatedText text="Period" />: {wavePeriodS != null ? <><TranslatedText text={`${Math.round(wavePeriodS)} seconds`} /></> : '—'}</span>
        </div>
        {waveDirectionDeg != null ? (
          <div className="flex items-center gap-1">
            <ArrowUp className="size-4" style={{ transform: `rotate(${waveDirectionDeg}deg)` }} />
            <span><TranslatedText text="towards" /> {waveDirectionCardinal}</span>
          </div>
        ) : null}
      </div>
    </WeatherStatCard>
  );
}

export default WaveSummaryCard;
