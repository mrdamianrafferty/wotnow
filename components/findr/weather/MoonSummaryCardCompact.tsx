import React, { useState, useEffect } from 'react';
import { Sunrise, Sunset } from 'lucide-react';
import Image from 'next/image';
import WeatherStatCard from './WeatherStatCard';
import { formatDisplayTime } from '../../../lib/findr/weatherFormatting';
import { TranslatedText } from '../../translation/TranslatedFishCard';

interface MoonSummaryCardCompactProps {
  lat?: number | null;
  lon?: number | null;
  className?: string;
}

interface MoonApiResponse {
  moon: {
    phase: number;
    phase_name: string;
    stage: string;
    illumination: string;
    emoji?: string;
    moonrise?: string;
    moonset?: string;
  };
  moon_phases: {
    new_moon: {
      next: {
        days_ahead?: number;
      };
    };
    full_moon: {
      next: {
        name: string;
        days_ahead?: number;
      };
    };
  };
}

// Helper: Get moon icon based on phase fraction
function getMoonIconUrl(phaseName: string): string {
  const phase = phaseName.toLowerCase().replace(/_/g, '-');
  
  if (phase.includes('new-moon')) return '/weather-icons/design/fill/final/moon-new.svg';
  if (phase.includes('waxing-crescent')) return '/weather-icons/design/fill/final/moon-waxing-crescent.svg';
  if (phase.includes('first-quarter')) return '/weather-icons/design/fill/final/moon-first-quarter.svg';
  if (phase.includes('waxing-gibbous')) return '/weather-icons/design/fill/final/moon-waxing-gibbous.svg';
  if (phase.includes('full-moon')) return '/weather-icons/design/fill/final/moon-full.svg';
  if (phase.includes('waning-gibbous')) return '/weather-icons/design/fill/final/moon-waning-gibbous.svg';
  if (phase.includes('last-quarter') || phase.includes('third-quarter')) return '/weather-icons/design/fill/final/moon-last-quarter.svg';
  if (phase.includes('waning-crescent')) return '/weather-icons/design/fill/final/moon-waning-crescent.svg';
  
  return '/weather-icons/design/fill/final/moon-full.svg';
}

// Helper: Format phase name for display
function formatPhaseName(phaseName: string): string {
  return phaseName
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Helper: Get moonlight description
function getMoonlightDescription(illumination: string, stage: string, phaseName: string): string {
  // Handle new moon specifically
  const phase = phaseName.toLowerCase();
  if (phase.includes('new')) {
    return 'New moon - dark water';
  }
  
  const illumNum = parseInt(illumination.replace('%', '').replace('-', ''));
  
  if (isNaN(illumNum) || illumination === '--%') {
    // Fallback based on phase name
    if (phase.includes('full')) return 'Full moon - very bright';
    if (phase.includes('crescent')) return stage === 'waxing' ? 'Thin crescent' : 'Fading crescent';
    if (phase.includes('quarter')) return 'Half moon';
    if (phase.includes('gibbous')) return stage === 'waxing' ? 'Nearly full' : 'Waning gibbous';
    return stage === 'waxing' ? 'Building light' : 'Dimming light';
  }
  
  if (illumNum < 25) return `Dark water (${illumNum}%)`;
  if (illumNum < 50) return `Moderate moonlight (${illumNum}%)`;
  if (illumNum < 75) return `Bright moonlight (${illumNum}%)`;
  return `Very bright (${illumNum}%)`;
}

// Helper: Get tide condition
function getTideCondition(phaseName: string): string {
  const phase = phaseName.toLowerCase();
  if (phase.includes('new') || phase.includes('full')) {
    return 'Spring tides building';
  }
  return 'Neap tides - stable';
}

export function MoonSummaryCardCompact({ lat, lon, className }: MoonSummaryCardCompactProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<MoonApiResponse | null>(null);

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
        
        const response = await fetch(`/api/moon?lat=${latValue}&lon=${lonValue}`, {
          signal: controller.signal,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load moon data: ${response.status}`);
        }
        
        const data = await response.json();
        setPhase(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load moon data');
      } finally {
        setLoading(false);
      }
    }

    void loadMoon();
    return () => controller.abort();
  }, [lat, lon]);

  const subtitle = phase ? `Next full moon in ${phase.moon_phases.full_moon.next.days_ahead || '?'} days` : 'Moon phase';
  const moonrise = phase?.moon.moonrise ? formatDisplayTime(phase.moon.moonrise) : '—';
  const moonset = phase?.moon.moonset ? formatDisplayTime(phase.moon.moonset) : '—';
  const phaseName = phase ? formatPhaseName(phase.moon.phase_name) : 'Loading...';
  const moonIconUrl = phase ? getMoonIconUrl(phase.moon.phase_name) : '/weather-icons/design/fill/final/moon-full.svg';
  const description = phase ? getMoonlightDescription(phase.moon.illumination, phase.moon.stage, phase.moon.phase_name) : undefined;
  const tideCondition = phase ? getTideCondition(phase.moon.phase_name) : undefined;
  const nextNewMoonDays = phase?.moon_phases.new_moon.next.days_ahead;

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
        <div className="p-3 rounded-lg bg-base-100 border border-base-200/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1 text-sm">
              <Sunrise className="size-3 text-warning" />
            </span>
          </div>
          <p className="text-base-content/80 text-sm">{moonrise}</p>
          {nextNewMoonDays != null && (
            <p className="text-base-content/60">
              <TranslatedText text={`New moon in ${nextNewMoonDays}d`} />
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-base-100 border border-base-200/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1 text-sm">
              <Sunset className="size-3 text-info" />
            </span>
          </div>
          <p className="text-base-content/80 text-sm">{moonset}</p>
          {tideCondition && (
            <p className="text-base-content/60">
              <TranslatedText text={tideCondition} />
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <WeatherStatCard
      title={<TranslatedText text={phaseName} />}
      subtitle={<TranslatedText text={subtitle} />}
      icon={<Image src={moonIconUrl} alt="Moon phase" width={20} height={20} className="w-5 h-5" />}
      value={description ? <TranslatedText text={description} /> : undefined}
      className={className}
    >
      {body}
    </WeatherStatCard>
  );
}

export default MoonSummaryCardCompact;
