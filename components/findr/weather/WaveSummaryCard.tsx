import React from 'react';
import { Waves, Activity } from 'lucide-react';
import WeatherStatCard from './WeatherStatCard';
import { formatWaveHeight } from '../../../lib/findr/weatherFormatting';
import { formatRelativeTime } from '../../../lib/findr/weatherFormatting';
import { TranslatedText } from '../../translation/TranslatedFishCard';

interface WaveSummaryCardProps {
  waveHeightM?: number | null;
  chlorophyllMgM3?: number | null;
  updatedAt?: string | null;
}

export function WaveSummaryCard({ waveHeightM, chlorophyllMgM3, updatedAt }: WaveSummaryCardProps) {
  const height = formatWaveHeight(waveHeightM);
  const bio = chlorophyllMgM3 != null ? `${chlorophyllMgM3.toFixed(2)} mg/m³ chl-a` : undefined;
  const updatedLabel = formatRelativeTime(updatedAt ?? undefined);

  return (
    <WeatherStatCard
      title={<TranslatedText text="Waves" />}
      subtitle={<TranslatedText text="Surface energy" />}
      icon={<Waves className="size-5" />}
      value={height}
      badge={bio}
      footer={updatedLabel ? <TranslatedText text={`Updated ${updatedLabel}`} /> : undefined}
    >
      <div className="flex items-center gap-2 text-xs text-base-content/70">
        <Activity className="size-4" />
        <span><TranslatedText text="Chlorophyll" /> {chlorophyllMgM3 != null ? chlorophyllMgM3.toFixed(2) : '—'} mg/m³</span>
      </div>
    </WeatherStatCard>
  );
}

export default WaveSummaryCard;
