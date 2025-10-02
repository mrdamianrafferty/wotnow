import React, { useState, useEffect } from 'react';
import { Moon, Sunrise, Sunset, Sparkles } from 'lucide-react';
import WeatherStatCard from './WeatherStatCard';
import { TranslatedText } from '../../translation/TranslatedFishCard';
import { formatDisplayTime } from '../../../lib/findr/weatherFormatting';

interface MoonSummaryCardProps {
  lat?: number | null;
  lon?: number | null;
  className?: string;
}

interface MoonApiResponse {
  moon: {
    phase_name: string;
    illumination: string;
    emoji?: string;
    moonrise?: string;
    moonset?: string;
  };
}

export function MoonSummaryCard({ lat, lon, className }: MoonSummaryCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<MoonApiResponse['moon'] | null>(null);

  useEffect(() => {
    if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) {
      setPhase(null);
      setError('Location unavailable');
      return;
    }

  const latValue = lat as number;
  const lonValue = lon as number;

  const controller = new AbortController();

    async function loadMoon() {
      try {
        setLoading(true);
        setError(null);
  const params = new URLSearchParams({ lat: latValue.toString(), lon: lonValue.toString() });
        const res = await fetch(`/api/moon?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Moon API ${res.status}`);
        }
        const payload = (await res.json()) as MoonApiResponse;
        if (!controller.signal.aborted) {
          setPhase(payload.moon);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError((err as Error).message || 'Moon data unavailable');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadMoon();
    return () => controller.abort();
  }, [lat, lon]);

  const subtitle = phase?.phase_name ?? 'Moon illumination';
  const illumination = phase?.illumination ? `${phase.illumination} lit` : undefined;
  const moonrise = phase?.moonrise ? formatDisplayTime(phase.moonrise) : '—';
  const moonset = phase?.moonset ? formatDisplayTime(phase.moonset) : '—';

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="animate-pulse space-y-2">
        <div className="h-3 rounded bg-base-300/60" />
        <div className="h-3 rounded bg-base-300/40" />
        <div className="h-3 rounded bg-base-300/30" />
      </div>
    );
  } else if (error && !phase) {
    body = <p className="text-xs text-error"><TranslatedText text={error} /></p>;
  } else {
    body = (
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-base-100 border border-base-200/60">
          <span className="flex items-center gap-2 font-semibold text-sm">
            <Sunrise className="size-4" /> Moonrise
          </span>
          <p className="mt-1 text-base-content/70">{moonrise}</p>
        </div>
        <div className="p-3 rounded-lg bg-base-100 border border-base-200/60">
          <span className="flex items-center gap-2 font-semibold text-sm">
            <Sunset className="size-4" /> Moonset
          </span>
          <p className="mt-1 text-base-content/70">{moonset}</p>
        </div>
      </div>
    );
  }

  return (
    <WeatherStatCard
      className={className}
      title={<TranslatedText text="Moon" />}
      subtitle={subtitle}
      icon={phase?.emoji ? <span className="text-2xl">{phase.emoji}</span> : <Moon className="size-5" />}
      value={illumination}
      badge={phase?.phase_name}
      footer={error && phase ? error : undefined}
    >
      {body}
      {!error ? (
        <div className="flex items-center gap-2 text-xs text-base-content/70 mt-3">
          <Sparkles className="size-4" />
          <span>Prime windows align with moonrise/set ± 90 minutes.</span>
        </div>
      ) : null}
    </WeatherStatCard>
  );
}

export default MoonSummaryCard;
