import React from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const MoonNugget = dynamic(() => import('../MoonNugget').then(m => m.default), { ssr: false });

interface MoonCardProps {
  today: any;
}

// Helper functions for moon calculations
function moonIconForPhase(phase?: number): string {
  if (phase == null) return '/weather-icons/design/fill/final/moon-full.svg';
  if (phase < 0.06 || phase > 0.94) return '/weather-icons/design/fill/final/moon-new.svg';
  if (phase < 0.19) return '/weather-icons/design/fill/final/moon-waxing-crescent.svg';
  if (phase < 0.31) return '/weather-icons/design/fill/final/moon-first-quarter.svg';
  if (phase < 0.44) return '/weather-icons/design/fill/final/moon-waxing-gibbous.svg';
  if (phase < 0.56) return '/weather-icons/design/fill/final/moon-full.svg';
  if (phase < 0.69) return '/weather-icons/design/fill/final/moon-waning-gibbous.svg';
  if (phase < 0.81) return '/weather-icons/design/fill/final/moon-last-quarter.svg';
  return '/weather-icons/design/fill/final/moon-waning-crescent.svg';
}

function moonIlluminationPct(phase?: number): number {
  if (phase == null) return 0;
  // Approximate illuminated fraction from phase (0=new, 0.5=full)
  const frac = (1 - Math.cos(2 * Math.PI * phase)) / 2; // 0..1
  return Math.round(frac * 100);
}

function fmtTimeHM(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const MoonCard: React.FC<MoonCardProps> = ({
  today
}) => {
  return (
    <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
      <div className="card-body">
        <h3 className="card-title">Moon</h3>
        <details className="collapse collapse-arrow">
          <summary className="collapse-title p-0">
            <div className="flex items-center gap-6">
              <div className="radial-progress" style={{ ["--value" as any]: moonIlluminationPct(today?.moonPhase) }}>{moonIlluminationPct(today?.moonPhase)}%</div>
              <span className="badge">
                {(() => {
                  const p = today?.moonPhase;
                  if (p == null) return '—';
                  if (p < 0.06 || p > 0.94) return 'New';
                  if (p < 0.19) return 'Waxing crescent';
                  if (p < 0.31) return 'First quarter';
                  if (p < 0.44) return 'Waxing gibbous';
                  if (p < 0.56) return 'Full';
                  if (p < 0.69) return 'Waning gibbous';
                  if (p < 0.81) return 'Last quarter';
                  return 'Waning crescent';
                })()}
              </span>
            </div>
            <div className="mt-2 text-xs opacity-80 flex justify-between">
              <span>↑ {fmtTimeHM(today?.moonriseISO) || '—'}</span>
              <Image 
                src={moonIconForPhase(today?.moonPhase)} 
                alt="Moon phase" 
                width={24} 
                height={24} 
                className="w-6 h-6" 
              />
              <span>↓ {fmtTimeHM(today?.moonsetISO) || '—'}</span>
            </div>
          </summary>
          <div className="collapse-content p-0 mt-2">
            <MoonNugget />
          </div>
        </details>
      </div>
    </div>
  );
};
