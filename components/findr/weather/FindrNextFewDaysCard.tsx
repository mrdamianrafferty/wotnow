import React from "react";
import Image from "next/image";
import type { MarineHourlyPoint, TideEvent } from "../../../types/weather";
import WindDirectionIcon from "../../WindDirectionIcon";

// Helper function to get weather icon URL
function getWeatherIconUrl(iconCode?: string) {
  const code = iconCode || 'na';
  const supported = new Set(['01d','01n','02d','02n','03d','03n','04d','04n','09d','09n','10d','10n','11d','11n','13d','13n','50d','50n']);
  return supported.has(code) ? `/weather-icons/design/fill/final/${code}.svg` : '/weather-icons/design/fill/final/na.svg';
}

// Small helpers
const median = (arr: number[]): number | undefined => {
  if (!arr || arr.length === 0) return undefined;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const firstFinite = (...vals: Array<number | null | undefined>): number | undefined => {
  for (const v of vals) if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
};

type MarineHourExt = MarineHourlyPoint & { waveHeightM?: number | null };

function nearestMarineForDate(dateISO: string, series: MarineHourlyPoint[] = []): MarineHourlyPoint | undefined {
  if (!dateISO || !series.length) return undefined;
  try {
    const localNoon = new Date(`${dateISO}T12:00:00`);
    const target = localNoon.getTime();
    let best: MarineHourlyPoint | undefined;
    let bestDiff = Infinity;
    for (const h of series) {
      const t = new Date(h.timeISO).getTime();
      const diff = Math.abs(t - target);
      if (diff < bestDiff) { bestDiff = diff; best = h; }
    }
    return best;
  } catch {
    return undefined;
  }
}

function pickWaveHeight(h?: MarineHourlyPoint): number | undefined {
  if (!h) return undefined;
  return firstFinite(
    (h as MarineHourExt).waveHeightM ?? undefined,
    (h as MarineHourExt).swellHeightM ?? undefined,
    h.waveM ?? undefined,
  );
}

function nearestMarineWithWaves(targetMs: number, series: MarineHourlyPoint[] = []): MarineHourlyPoint | undefined {
  let best: { h: MarineHourlyPoint; diff: number } | undefined;
  for (const h of series) {
    const t = new Date(h.timeISO).getTime();
    const ht = pickWaveHeight(h);
    if (typeof ht === 'number') {
      const diff = Math.abs(t - targetMs);
      if (!best || diff < best.diff) best = { h, diff };
    }
  }
  return best?.h;
}

function nextUpcomingWithWaves(series: MarineHourlyPoint[] = []): MarineHourlyPoint | undefined {
  const now = Date.now();
  const future = series
    .map(h => ({ h, t: new Date(h.timeISO).getTime(), ht: pickWaveHeight(h) }))
    .filter(x => Number.isFinite(x.t) && typeof x.ht === 'number')
    .sort((a,b) => a.t - b.t)
    .find(x => x.t >= now);
  return future?.h || nearestMarineWithWaves(now, series);
}

interface DailyForecast {
  dateISO: string;
  icon?: string;
  minC?: number;
  maxC?: number;
  pop?: number;
  precipMM?: number;
  summary?: string;
  windMS?: number;
  windDeg?: number;
  uvi?: number;
}

interface FindrNextFewDaysCardProps {
  daily: DailyForecast[];
  maxDays?: number;
  className?: string;
  marineHourly?: MarineHourlyPoint[];
  tide?: TideEvent[];
}

export function FindrNextFewDaysCard({ 
  daily, 
  maxDays = 7,
  className = "",
  marineHourly = [],
  tide = [],
}: FindrNextFewDaysCardProps) {
  return (
    <div className={`card bg-base-200/40 border border-base-200/80 shadow-sm ${className}`}>
      <div className="card-body gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-base-100 p-2 rounded-lg text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Next Few Days</h3>
            <p className="text-xs text-base-content/60">7-day marine forecast</p>
          </div>
        </div>

        <div className="space-y-2">
          {(daily || []).slice(0, maxDays).map((d: DailyForecast, idx: number) => {
            const date = new Date(d.dateISO);
            const label = idx === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
            const iconUrl = getWeatherIconUrl(d.icon);
            const windKts = typeof d.windMS === 'number' ? Math.round(d.windMS * 1.94384) : undefined;
            const popPct = typeof d.pop === 'number' ? Math.round(d.pop * 100) : undefined;
            const hasPop = typeof popPct === 'number';
            const mm = typeof d.precipMM === 'number' ? d.precipMM : undefined;
            const mmRounded = typeof mm === 'number' ? Math.round(mm) : undefined;
            const showMM = typeof mmRounded === 'number';

            // Marine wave height selection
            const dayKey = String(d.dateISO).slice(0, 10);
            let chosen: MarineHourlyPoint | undefined;
            if (idx === 0) {
              chosen = nextUpcomingWithWaves(marineHourly);
            } else {
              const noonMs = new Date(`${dayKey}T12:00:00`).getTime();
              chosen = nearestMarineWithWaves(noonMs, marineHourly) || nearestMarineForDate(dayKey, marineHourly);
            }

            let medHeight = pickWaveHeight(chosen);

            // Per-day median fallback
            if (medHeight === undefined) {
              const dayStart = new Date(`${dayKey}T00:00:00`).getTime();
              const dayEnd = new Date(`${dayKey}T23:59:59.999`).getTime();
              const dayMarine = (marineHourly || []).filter(h => {
                const t = new Date(h.timeISO).getTime();
                return t >= dayStart && t <= dayEnd;
              });
              const heights = dayMarine.map(h => pickWaveHeight(h)).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
              if (heights.length > 0) medHeight = median(heights);
            }

            // Tide times - get both high and low tides
            const dayStartLocal = new Date(`${dayKey}T00:00:00`);
            const dayEndLocal = new Date(`${dayKey}T23:59:59.999`);
            const now = new Date();
            
            // For "Today", only show upcoming tides. For future days, show all tides.
            const dayTides = (tide || []).filter(t => {
              const raw = (t as unknown as { timeISO?: string; time?: string }).timeISO || (t as unknown as { time?: string }).time || '';
              const dt = new Date(raw);
              const isInDay = dt >= dayStartLocal && dt <= dayEndLocal;
              // For today (idx 0), filter out past tides
              if (idx === 0) {
                return isInDay && dt > now;
              }
              return isInDay;
            });
            const highs = dayTides.filter(t => String(t.type).toLowerCase() === 'high').map(t => new Date((t as unknown as { timeISO?: string; time?: string }).timeISO || (t as unknown as { time?: string }).time || ''));
            const lows = dayTides.filter(t => String(t.type).toLowerCase() === 'low').map(t => new Date((t as unknown as { timeISO?: string; time?: string }).timeISO || (t as unknown as { time?: string }).time || ''));
            highs.sort((a,b)=>a.getTime()-b.getTime());
            lows.sort((a,b)=>a.getTime()-b.getTime());
            const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const highStr = highs.length ? highs.slice(0, 2).map(fmt).join('/') : undefined;
            const lowStr = lows.length ? lows.slice(0, 2).map(fmt).join('/') : undefined;

            return (
              <div key={d.dateISO} className="bg-base-100 rounded-lg p-3 border border-base-200/50 hover:border-base-300 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  {/* Day + Icon */}
                  <div className="flex items-center gap-3 min-w-[100px]">
                    <span className="font-medium text-sm w-10">{label}</span>
                    <Image src={iconUrl} alt="Weather" width={28} height={28} className="opacity-90" />
                  </div>

                  {/* Temperature */}
                  <div className="text-sm font-semibold min-w-[70px]">
                    {d.minC != null ? Math.round(d.minC) : '—'}°–{d.maxC != null ? Math.round(d.maxC) : '—'}°
                  </div>

                  {/* Wind */}
                  <div className="flex items-center gap-2 min-w-[70px]">
                    {typeof d.windDeg === 'number' && (
                      <WindDirectionIcon deg={d.windDeg} size={16} className="opacity-70" />
                    )}
                    <span className="text-xs">{windKts != null ? `${windKts}kt` : '—'}</span>
                  </div>

                  {/* Waves */}
                  <div className="flex items-center gap-2 min-w-[60px]">
                    <Image src="/weather-icons/design/fill/final/wave-moving.svg" alt="Waves" width={48} height={48} className="opacity-60 w-12 h-12" />
                    <span className="text-xs">
                      {typeof medHeight === 'number' ? `${medHeight.toFixed(1)}m` : '—'}
                    </span>
                  </div>

                  {/* Rain */}
                  <div className="flex items-center gap-1 min-w-[60px]">
                    <Image src="/weather-icons/design/fill/final/raindrop.svg" alt="Rain" width={48} height={48} className="opacity-60 w-12 h-12" />
                    <span className="text-xs">{showMM ? `${mmRounded}mm` : hasPop ? `${popPct}%` : '—'}</span>
                  </div>

                  {/* Tide Toggle - High/Low */}
                  <div className="flex items-center gap-1 min-w-[70px]">
                    {highStr && lowStr ? (
                      <label className="swap swap-rotate cursor-pointer" title="Toggle High/Low tides">
                        <input type="checkbox" aria-label="Toggle tide view (High/Low)" />
                        <span className="swap-off inline-flex items-center gap-1">
                          <Image src="/weather-icons/design/fill/final/tide-high.svg" alt="High tide" width={48} height={48} className="opacity-60 w-12 h-12" />
                          <span className="text-xs">{highStr}</span>
                        </span>
                        <span className="swap-on inline-flex items-center gap-1">
                          <Image src="/weather-icons/design/fill/final/tide-low.svg" alt="Low tide" width={48} height={48} className="opacity-60 w-12 h-12" />
                          <span className="text-xs">{lowStr}</span>
                        </span>
                      </label>
                    ) : highStr ? (
                      <>
                        <Image src="/weather-icons/design/fill/final/tide-high.svg" alt="High tide" width={48} height={48} className="opacity-60 w-12 h-12" />
                        <span className="text-xs">{highStr}</span>
                      </>
                    ) : lowStr ? (
                      <>
                        <Image src="/weather-icons/design/fill/final/tide-low.svg" alt="Low tide" width={48} height={48} className="opacity-60 w-12 h-12" />
                        <span className="text-xs">{lowStr}</span>
                      </>
                    ) : (
                      <span className="text-xs opacity-50">—</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FindrNextFewDaysCard;
