// pages/my-new-weather.tsx
// Responsive Apple-style weather layout (land + marine) using DaisyUI/Tailwind
// Looks great on iPad landscape/portrait and scales to phone. Placeholder data included.

import React, { useMemo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
const WeatherAnimationLayer = dynamic(() => import("../components/WeatherAnimationLayer").then(m => m.default), { ssr: false });
import Image from "next/image";
import Link from "next/link";
import PrettyTideWaveRolling from "../components/PrettyTideWaveRolling";
import CoastalLocationDialog from "../components/CoastalLocationDialog";
import { useUserPreferences } from "../context/UserPreferencesContext";
import useSWR from 'swr';
const MoonNugget = dynamic(() => import("../components/MoonNugget").then(m => m.default), { ssr: false });
import { assessAirQualityConditions, getAirQualityIndex, getAirQualityLevelDescription, AirQualityLevel } from "../utils/airQualityUtils";
import { assessPollenConditions, getPollenIndex, getPollenLevelDescription, PollenLevel } from "../utils/pollenUtils";
import { getSoilCondition } from "../utils/getSoilCondition";
import { getTideTips, type TidePhase } from "@/data/tideTips";
import { getWaveDescription, getWindMessage, getVisibilityDescription, visibilityPercentLand } from "../utils/weatherLabels";
import { AirQualityCardV3 } from "../components/weather-cards/AirQualityCardV3";
import { PollenCard } from "../components/weather-cards/PollenCard";
import { UVCard } from "../components/weather-cards/UVCard";
import { SoilCard } from "../components/weather-cards/SoilCard";
import { TestCard } from "../components/TestCard";

// Local type to avoid named-type import (prevents circular import edge cases)
interface UnifiedWeatherData {
  condition: string;
  temperatureC: number;
  windSpeedMS: number;
  windDirectionDeg: number;
  humidity: number;
  visibilityKM: number;
  precipitationMMph: number;
  isCoastal?: boolean;
  applyBeaufort?: boolean;
  localTimeISO?: string;
  cloudPct?: number;
  waveHeightM?: number;
}

// Lightweight location type for banner buttons
type LocationLite = { name: string; lat: number; lon: number; type?: "home" | "coastal" };

// -----------------------------
// Marine placeholders (moved up so hours can reference)
// -----------------------------
const marineNow = {
  wave: { height: 1.8, period: 10, dir: 280 }, // degrees true
  wind: { speed: 14, gust: 22, dir: 60 },
  seaTemp: 19.5,
};

const swells = [
  { id: "p", kind: "Primary", height: 1.8, period: 10, direction: 280 },
  { id: "s1", kind: "Secondary", height: 0.7, period: 13, direction: 305 },
  { id: "ww", kind: "Wind", height: 0.5, period: 5, direction: 60 },
];

// -----------------------------
// Data helpers (dynamic)
// -----------------------------
const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });

function fmtTimeHM(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getWeatherIconUrl(iconCode?: string) {
  const code = iconCode || 'na';
  const supported = new Set(['01d','01n','02d','02n','03d','03n','04d','04n','09d','09n','10d','10n','11d','11n','13d','13n','50d','50n']);
  return supported.has(code) ? `/weather-icons/design/fill/final/${code}.svg` : '/weather-icons/design/fill/final/na.svg';
}

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

// Extracted to avoid using hooks inside inline render blocks
const SoilConditionsPanel: React.FC<{
  soil: {
    temp0cm?: number;
    temp6cm?: number;
    temp18cm?: number;
    temp54cm?: number;
    moisture0to1?: number;
    moisture1to3?: number;
    moisture3to9?: number;
    moisture9to27?: number;
  };
  timeISO?: string;
}> = ({ soil, timeISO }) => {
  const depths = [0, 6, 18, 54] as const;
  const [depthIdx, setDepthIdx] = React.useState(0);
  const depth = depths[depthIdx] as (0|6|18|54);
  const tempMap: Record<typeof depth, number | undefined> = {
    0: soil.temp0cm,
    6: soil.temp6cm,
    18: soil.temp18cm,
    54: soil.temp54cm,
  } as any;
  // Open‑Meteo moisture layers are ranges (0–1, 1–3, 3–9, 9–27 cm), while
  // temperatures are at fixed depths (0, 6, 18, 54 cm). Map each temp depth
  // to the nearest moisture layer and surface the layer label when approximated.
  const moistureForDepth = (d: typeof depth): { value?: number; label?: string; approx: boolean } => {
    if (d === 0) return { value: soil.moisture0to1, label: '0–1 cm', approx: false };
    if (d === 6) return { value: soil.moisture3to9, label: '3–9 cm', approx: true };
    if (d === 18) return { value: soil.moisture9to27, label: '9–27 cm', approx: true };
    // No OM moisture layer around 54 cm; show deepest available as N/A.
    return { value: undefined, label: undefined, approx: false };
  };
  const t = tempMap[depth];
  const mInfo = moistureForDepth(depth);
  const m = mInfo.value;
  const advice = (() => {
    if (t == null) return [] as string[];
    const tips: string[] = [];
    const isSurface = depth <= 6;
    if (t <= 0) {
      tips.push('🌡️ Plant activity nearly stops; frozen soil halts growth and can damage roots.');
      return tips;
    }
    if (t <= 5) {
      if (isSurface) tips.push('🌡️ Slow root and shoot development begins in hardy plants (e.g., leeks).');
      else tips.push('🌡️ Deeper soil stays colder longer; roots develop very slowly or remain dormant.');
      return tips;
    }
    if (t <= 12) {
      if (isSurface) tips.push('🌡️ Cool-season seeds can germinate, but growth remains slow.');
      tips.push('🌡️ Microbes and roots start to wake up; nutrient availability improves.');
      return tips;
    }
    if (t <= 20) {
      if (isSurface) tips.push('🌡️ Ideal for many spring crops: fast germination and good root growth.');
      tips.push('🌡️ Stable warmth supports healthy root systems and nutrient uptake.');
      return tips;
    }
    // Warm: 21–27°C
    if (t <= 27) {
      tips.push('🌡️ All depths: Good for many summer crops; rapid growth and nutrient absorption.');
      tips.push('🌡️ Watch soil moisture as warming increases evaporation.');
      return tips;
    }
    // Very Warm: 28–35°C
    if (t <= 35) {
      if (isSurface) tips.push('🌡️ Surface: Risk of seed germination slowdown for some crops.');
      else tips.push('🌡️ Roots: Prolonged temps above 30°C can stress root systems; monitor drying soil.');
      return tips;
    }
    // Very hot > 35°C
    tips.push('🌡️ Very hot soil: growth is significantly reduced; roots and soil microbes are harmed.');
    tips.push('🌡️ Mitigate with mulch, shade, and careful watering to prevent crop failure.');
    return tips;
  })();

  const moistureAdvice = (() => {
    if (m == null) return [] as string[];
    const tips: string[] = [];
    const isSurface = depth <= 6;
    const v = m;
    if (v < 0.10) {
      tips.push(isSurface
        ? '💦 Extremely dry: soil feels very dry; wilting likely.'
        : '💦 Extremely dry: roots lack moisture; growth slows or stops.');
      return tips;
    }
    if (v < 0.20) {
      tips.push(isSurface
        ? '💦 Dry: soil is dry but retains some moisture; shallow-rooted plants may struggle.'
        : '💦 Dry: limited moisture; deeper-rooted plants may survive but show stress.');
      return tips;
    }
    if (v < 0.35) {
      tips.push('💦 Moderate: optimal for many temperate plants; good water availability.');
      tips.push('💦 Root-zone moisture supports nutrient uptake and cell function.');
      return tips;
    }
    if (v < 0.45) {
      tips.push(isSurface
        ? '💦 Wet: surface feels damp; risk of pooling after rain or watering.'
        : '💦 Wet: adequate moisture; watch drainage to avoid root rot.');
      return tips;
    }
    // v >= 0.45
    tips.push('💦 Very wet: soil saturated; roots risk oxygen deprivation and damage.');
    tips.push('💦 Prolonged saturation can promote fungal disease; improve drainage and reduce watering.');
    return tips;
  })();
  return (
    <div>
      <input
        type="range"
        min={0}
        max={3}
        value={depthIdx}
        onChange={(e) => setDepthIdx(Number(e.target.value))}
        className="range range-xs soil-brown-range"
      />
      <div className="flex justify-between text-xs opacity-70 mt-1">
        <span>0 cm</span><span>6 cm</span><span>18 cm</span><span>54 cm</span>
      </div>
      <div className="mt-2 flex items-center gap-4 text-sm">
        <span className="badge badge-outline">{depth === 0 ? 'Surface' : `${depth}cm`}</span>
        <span>Temp {t != null ? `${Math.round(t)}°C` : '—'}</span>
        <span>
          Moisture {m != null ? m.toFixed(2) : '—'} m³/m³
          {m != null && (
            <span className="opacity-70 ml-1">{mInfo.approx ? `(from ${mInfo.label})` : ''}</span>
          )}
          {m == null && depth === 54 && (
            <span className="opacity-70 ml-1">(no layer at 54 cm)</span>
          )}
        </span>
      </div>
      {timeISO && (
        <div className="text-xs opacity-60 mt-1">
          Snapshot as of <span suppressHydrationWarning>{new Date(timeISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}
      {advice.length > 0 && (
        <ul className="mt-2 text-sm opacity-80 pl-5">
          {advice.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
      {moistureAdvice.length > 0 && (
        <ul className="mt-2 text-sm opacity-80 pl-5">
          {moistureAdvice.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
      <style jsx>{`
        /* Brown gradient track from light (left) to near black (right) */
        .soil-brown-range { height: 0.5rem; }
        .soil-brown-range::-webkit-slider-runnable-track {
          height: 0.5rem;
          border-radius: 9999px;
          background: linear-gradient(to right,
            #ead7bb 0%, /* light sand */
            #c8a27a 25%,
            #8b5e34 50%,
            #4a2f1b 75%,
            #18120f 100% /* near black */
          );
        }
        .soil-brown-range::-moz-range-track {
          height: 0.5rem;
          border-radius: 9999px;
          background: linear-gradient(to right,
            #ead7bb 0%,
            #c8a27a 25%,
            #8b5e34 50%,
            #4a2f1b 75%,
            #18120f 100%
          );
        }
        /* Keep the thumb visible above the darker right side */
        .soil-brown-range::-webkit-slider-thumb {
          position: relative;
          z-index: 1;
          -webkit-appearance: none;
        }
        .soil-brown-range::-moz-range-thumb {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

function moonIlluminationPct(phase?: number): number {
  if (phase == null) return 0;
  // Approximate illuminated fraction from phase (0=new, 0.5=full)
  const frac = (1 - Math.cos(2 * Math.PI * phase)) / 2; // 0..1
  return Math.round(frac * 100);
}

function conditionToAnim(desc?: string, cloudsPct?: number, visibilityKm?: number) {
  const d = (desc || '').toLowerCase();
  let condition: string = 'clear';
  if (d.includes('snow') || d.includes('sleet')) condition = 'snow';
  else if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) condition = 'rain';
  else if (d.includes('fog') || d.includes('mist') || (visibilityKm != null && visibilityKm < 5)) condition = 'fog';
  else if (d.includes('cloud') || (cloudsPct != null && cloudsPct > 25)) condition = 'cloudy';
  return condition;
}

const tideSeq = [
  { kind: "Low", time: "06:12", height: 0.8 },
  { kind: "High", time: "12:34", height: 3.4 },
  { kind: "Low", time: "18:54", height: 0.9 },
  { kind: "High", time: "00:58", height: 3.3 },
];

// -----------------------------
// Utilities
// -----------------------------
function angleDiff(a: number, b: number) {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d; // 0..180
}

function alignmentLabel(swellDir: number, windDir: number) {
  const on = angleDiff(swellDir, windDir) <= 45;
  const off = angleDiff((swellDir + 180) % 360, windDir) <= 45; // offshore = wind blows against incoming swell
  return off ? { label: "Offshore", class: "badge-success" } : on ? { label: "Onshore", class: "badge-error" } : { label: "Cross-shore", class: "badge-warning" };
}

// Tiny compass SVG
const Compass: React.FC<{ swellDir: number; swellMag?: number; windDir: number; windMag?: number }>
= ({ swellDir, swellMag = 1.8, windDir, windMag = 14 }) => {
  const swellLen = Math.min(38, Math.max(8, swellMag * 14));
  const windLen = Math.min(36, Math.max(8, (windMag / 30) * 36));
  return (
    <svg viewBox="0 0 100 100" className="w-36 h-36 text-base-content">
      <circle cx="50" cy="50" r="48" className="fill-base-200 stroke-base-300" strokeWidth="2" />
      {/* N markers */}
      <text x="50" y="10" textAnchor="middle" fontSize="8">N</text>
      <text x="90" y="54" textAnchor="middle" fontSize="8">E</text>
      <text x="50" y="98" textAnchor="middle" fontSize="8">S</text>
      <text x="10" y="54" textAnchor="middle" fontSize="8">W</text>
      {/* Swell arrow (thick) coming-from bearing */}
      <g transform={`rotate(${swellDir} 50 50)`}>
        <line x1="50" y1="50" x2="50" y2={50 - swellLen} stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <polygon points="50,8 45,18 55,18" />
      </g>
      {/* Wind arrow (thin) blowing-from */}
      <g transform={`rotate(${windDir} 50 50)`} className="opacity-70">
        <line x1="50" y1="50" x2="50" y2={50 - windLen} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <polygon points="50,14 47,20 53,20" />
      </g>
    </svg>
  );
};

// Wave quality pill colour based on period
function periodClass(period: number) {
  if (period > 14) return "badge-success";
  if (period >= 10) return "badge-primary";
  if (period >= 7) return "badge-info";
  return "badge-ghost";
}

// Marine/compass/tide helpers
const COMPASS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"] as const;
function degToCompass(deg?: number) {
  if (deg == null || isNaN(deg)) return "-";
  const i = Math.round((deg % 360) / 22.5) % 16;
  return COMPASS[i];
}

function tideStrToMinutes(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return (hh % 24) * 60 + (mm || 0);
}

function nearestTideForMinutes(mins: number) {
  let best: { kind: string; time: string; mins: number } | null = null;
  let bestDiff = Infinity;
  for (const t of tideSeq) {
    const m = tideStrToMinutes(t.time);
    const diff = Math.abs(m - mins);
    if (diff < bestDiff) { bestDiff = diff; best = { kind: t.kind, time: t.time, mins: m }; }
  }
  if (best && bestDiff <= 60) return best; // within ±60 min
  return null;
}

// Build nearest tide helper from real events if available
function nearestTideFromEvents(mins: number, events?: Array<{ time: string; type: 'high'|'low' }>) {
  if (!events || !events.length) return null;
  let best: { kind: string; timeISO: string; mins: number } | null = null;
  let bestDiff = Infinity;
  for (const e of events) {
    const d = new Date(e.time);
    if (isNaN(d.getTime())) continue;
    const m = (d.getHours() % 24) * 60 + d.getMinutes();
    const diff = Math.abs(m - mins);
    const kind = e.type.toLowerCase().includes('high') ? 'High' : 'Low';
    if (diff < bestDiff) { bestDiff = diff; best = { kind, timeISO: d.toISOString(), mins: m }; }
  }
  if (best && bestDiff <= 60) return best;
  return null;
}

// Build a synthetic sea-level series between tide extrema using a cosine arc
function synthesizeTideSamplesFromExtrema(extremes: Array<{ time: string; type: 'high'|'low'; height: number }>): { ts: number; height: number }[] {
  if (!Array.isArray(extremes) || extremes.length < 2) return [];
  const ms = (t: string) => new Date(t).getTime();
  const sorted = extremes.slice().sort((a,b) => ms(a.time) - ms(b.time));
  const points: { ts: number; height: number }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i+1];
    const tsA = ms(a.time);
    const tsB = ms(b.time);
    if (!Number.isFinite(tsA) || !Number.isFinite(tsB) || tsB <= tsA) continue;
    const total = tsB - tsA;
    const stepMs = 15 * 60 * 1000; // 15 minutes
    const steps = Math.max(4, Math.ceil(total / stepMs));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps; // 0..1
      const height = a.height + (b.height - a.height) * (0.5 - 0.5 * Math.cos(Math.PI * t));
      const ts = Math.round(tsA + total * t);
      points.push({ ts, height });
    }
  }
  return points;
}

// -----------------------------
// Components
// -----------------------------
const WaveCard: React.FC<{
  waveHeightM?: number | null;
  wavePeriodS?: number | null;
  waveDir?: number | null;
  swellHeightM?: number | null;
  swellPeriodS?: number | null;
  swellDir?: number | null;
  windSpeedMS?: number | null;
  windDir?: number | null;
  seaTemp?: number | null;
}> = ({
  waveHeightM,
  wavePeriodS,
  waveDir,
  swellHeightM,
  swellPeriodS,
  swellDir,
  windSpeedMS,
  windDir,
  seaTemp,
}) => {
  const h = typeof waveHeightM === 'number' ? waveHeightM : marineNow.wave.height;
  const p = typeof wavePeriodS === 'number' ? wavePeriodS : marineNow.wave.period;
  const wdir = typeof waveDir === 'number' ? waveDir : marineNow.wave.dir;
  const ws = typeof windSpeedMS === 'number' ? windSpeedMS : (marineNow.wind.speed / 3.6);
  const wdeg = typeof windDir === 'number' ? windDir : marineNow.wind.dir;
  const a = alignmentLabel(wdir, wdeg);
  const explanationSentence = getWaveDescription(h);
  return (
    <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
      <div className="card-body p-4">
        <div className="card-title flex items-center justify-between mb-2">
          <span>Waves</span>
          <span className={`badge ${periodClass(p)}`}>
            {h.toFixed(1)} m @ {p}s
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="stat">
            <div className="stat-title">Primary</div>
            <div className="stat-value text-3xl">{h.toFixed(1)} m</div>
            <div className="stat-desc">{p}s period</div>
          </div>
          <div className="tooltip" data-tip={`Swell ${Math.round(wdir)}° · Wind ${wdeg}°`}>
            <div className={`badge ${a.class}`}>{a.label}</div>
          </div>
          <div className="text-sm opacity-70">Sea {(typeof seaTemp === 'number' ? seaTemp : marineNow.seaTemp).toFixed(1)}°C</div>
        </div>

        <details className="collapse collapse-arrow mt-2">
          <summary className="collapse-title text-sm opacity-80">Details</summary>
          <div className="collapse-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm mb-2">Directions</h4>
                <div className="rounded-box bg-black/25 backdrop-blur-sm grid place-items-center p-2">
                  <Compass swellDir={wdir} swellMag={h} windDir={wdeg} windMag={(ws || 0) * 3.6} />
                </div>
              </div>
              <div>
                <h4 className="text-sm mb-2">Swell Trains</h4>
                <div className="overflow-x-auto">
                  <table className="table table-xs">
                    <thead>
                      <tr><th>Type</th><th>Ht</th><th>Per</th><th>Dir</th></tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 'p', kind: 'Primary', height: h, period: p, direction: wdir },
                        (typeof swellHeightM === 'number' && typeof swellPeriodS === 'number' && typeof swellDir === 'number') ? { id: 's1', kind: 'Swell', height: swellHeightM, period: swellPeriodS, direction: swellDir } : null,
                      ].filter(Boolean).map((s: any) => (
                        <tr key={s.id}>
                          <td><span className="badge badge-outline">{s.kind}</span></td>
                          <td>{s.height.toFixed(1)} m</td>
                          <td><span className={`badge badge-sm ${periodClass(s.period)}`}>{s.period}s</span></td>
                          <td>{Math.round(s.direction)}°</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs opacity-80 mt-2">{explanationSentence}</p>
              </div>
            </div>

            <div className="mt-3">
              <h4 className="text-sm mb-1">Next 12h height</h4>
              <div className="rounded-box bg-black/25 backdrop-blur-sm p-3">
                {/* Placeholder sparkline using CSS bars */}
                <div className="flex items-end gap-1 h-16">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const h = 8 + Math.round(Math.abs(Math.sin(i / 2)) * 40);
                    return <div key={i} className="w-3 bg-base-content/40 rounded-t" style={{ height: `${h}%` }} />;
                  })}
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

// -----------------------------
// Page
// -----------------------------
const WeatherDemoPage: React.FC = () => {
  const { preferences, setPreferences } = useUserPreferences?.() || { 
    preferences: { locations: [] }, 
    setPreferences: () => {} 
  };
  const [showHomeDialog, setShowHomeDialog] = useState(false);
  const [showCoastDialog, setShowCoastDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const homeLocation = preferences?.locations?.find((loc: any) => loc.type === 'home');
  const coastalLocation = preferences?.locations?.find((loc: any) => loc.type === 'coastal');

  // Prevent hydration mismatch by only showing location-specific content after client mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const setHomeLocation = (loc: LocationLite) => {
    if (!setPreferences) return;
    setPreferences((prev: any) => {
      const currentPrefs = prev || { locations: [] };
      const newLocations = Array.isArray(currentPrefs.locations) ? currentPrefs.locations.slice() : [];
      const i = newLocations.findIndex((l: any) => l.type === 'home');
      if (i >= 0) newLocations[i] = { ...newLocations[i], ...loc };
      else newLocations.push({ ...loc, type: 'home' });
      return { ...currentPrefs, locations: newLocations };
    });
  };

  const setCoastalLocation = (loc: LocationLite) => {
    if (!setPreferences) return;
    setPreferences((prev: any) => {
      const currentPrefs = prev || { locations: [] };
      const newLocations = Array.isArray(currentPrefs.locations) ? currentPrefs.locations.slice() : [];
      const i = newLocations.findIndex((l: any) => l.type === 'coastal');
      if (i >= 0) newLocations[i] = { ...newLocations[i], ...loc };
      else newLocations.push({ ...loc, type: 'coastal' });
      return { ...currentPrefs, locations: newLocations };
    });
  };
  const unifiedWeather: UnifiedWeatherData = useMemo(() => ({
    condition: "marine_choppy",
    temperatureC: 23,
    windSpeedMS: 14 / 3.6,
    windDirectionDeg: 45,
    humidity: 68,
    visibilityKM: 10,
    precipitationMMph: 0.0,
    isCoastal: true,
    applyBeaufort: true,
    localTimeISO: new Date().toISOString(),
    cloudPct: 80,
    waveHeightM: 1.2,
  }), []);
  const [showAnim, setShowAnim] = useState(false);
  const [bgForced, setBgForced] = useState<null | boolean>(null); // null = auto, true = on, false = off

  const applyAutoGate = () => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const saveData = (navigator as any)?.connection?.saveData === true;
    const cores = (navigator as any)?.hardwareConcurrency || 8;
    const lowEnd = cores <= 4;
    setShowAnim(!(reduced || saveData || lowEnd));
  };

  const toggleBg = () => {
    // cycle: auto -> on -> off -> auto
    const next = bgForced === null ? true : bgForced === true ? false : null;
    setBgForced(next);
    if (next === null) {
      localStorage.removeItem('bgEnabled');
      applyAutoGate();
    } else {
      localStorage.setItem('bgEnabled', String(next));
      setShowAnim(next);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem('bgEnabled');
    if (stored === 'true') {
      setBgForced(true);
      setShowAnim(true);
      return;
    }
    if (stored === 'false') {
      setBgForced(false);
      setShowAnim(false);
      return;
    }
    setBgForced(null);
    applyAutoGate();
  }, []);

  // tide state (computed after weather is available)
  // (icon shown in card title: high icon when the next event is "high", else low icon)

  // -----------------------------
  // Live weather fetch (land mode) using selected location
  // -----------------------------
  const activeLoc = coastalLocation || homeLocation;
  const lat = typeof activeLoc?.lat === 'number' ? activeLoc.lat : undefined;
  const lon = typeof activeLoc?.lon === 'number' ? activeLoc.lon : undefined;
  // Avoid SSR/client hydration mismatch: only flip to 'marine' after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const mode = (mounted && activeLoc?.type === 'coastal') ? 'marine' : 'land';
  const { data: weather } = useSWR(lat != null && lon != null ? `/api/unified-weather?lat=${lat}&lon=${lon}&mode=${mode}` : null, fetcher, { revalidateOnFocus: false, refreshInterval: 10 * 60 * 1000 });
  // Prefer pollen from the activities pipeline when available (robust daily max aggregation)
  const { data: wwp } = useSWR(lat != null && lon != null ? `/api/weather-with-pollen?lat=${lat}&lon=${lon}` : null, fetcher, { revalidateOnFocus: false, refreshInterval: 10 * 60 * 1000 });

  const tideState = useMemo(() => {
    const now = new Date();
    const events = Array.isArray(weather?.tides) ? (weather!.tides as Array<{ time: string; type: 'high'|'low' }>) : [];
    let text = 'Tide';
    let icon: string | null = null;
    let nextTimeISO: string | null = null;
    if (events.length) {
      const sorted = events.slice().sort((a,b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      const next = sorted.find(e => new Date(e.time).getTime() > now.getTime()) || sorted[0];
      const isHigh = String(next.type).toLowerCase().includes('high');
      text = isHigh ? 'Rising Tide' : 'Falling Tide';
      icon = isHigh ? '/weather-icons/design/fill/final/tide-high.svg' : '/weather-icons/design/fill/final/tide-low.svg';
      nextTimeISO = new Date(next.time).toISOString();
    }
    return { text, icon, nextTimeISO };
  }, [weather?.tides]);

  // Countdown ticker for next tide event
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remMs = useMemo(() => {
    if (!tideState?.nextTimeISO) return null;
    const t = new Date(tideState.nextTimeISO).getTime() - nowTick;
    return t > 0 ? t : 0;
  }, [tideState?.nextTimeISO, nowTick]);
  const remH = remMs != null ? Math.floor(remMs / 3600000) : 0;
  const remM = remMs != null ? Math.floor((remMs % 3600000) / 60000) : 0;
  const remS = remMs != null ? Math.floor((remMs % 60000) / 1000) : 0;

  // Compute current tide phase: 'high'/'low' within ±30 min of event, else 'rising'/'falling'
  const tidePhase: TidePhase | null = useMemo(() => {
    const events = Array.isArray(weather?.tides) ? (weather!.tides as Array<{ time: string; type: 'high'|'low' }>) : [];
    if (!events.length) return null;
    const now = Date.now();
    const withTs = events
      .map(e => ({ ts: new Date(e.time).getTime(), type: (String(e.type).toLowerCase().includes('high') ? 'high' : 'low') as 'high'|'low' }))
      .filter(e => Number.isFinite(e.ts))
      .sort((a,b) => a.ts - b.ts);
    if (!withTs.length) return null;
    // nearest event check (±30 min)
    let nearest = withTs[0];
    let best = Math.abs(now - nearest.ts);
    for (let i = 1; i < withTs.length; i++) {
      const d = Math.abs(now - withTs[i].ts);
      if (d < best) { best = d; nearest = withTs[i]; }
    }
    if (best <= 30 * 60 * 1000) return nearest.type as TidePhase; // 'high' or 'low'
    // else rising/falling based on next extremum
    const next = withTs.find(e => e.ts > now) || withTs[0];
    return (next.type === 'high' ? 'rising' : 'falling');
  }, [weather?.tides, nowTick]);

  const today = weather?.daily?.[0];
  const todayStr = today?.dateISO;
  const pollenFromWWP = (todayStr && (wwp as any)?.pollenByDate?.[todayStr]) || undefined;
  const pollenToday = useMemo(() => pollenFromWWP ?? today?.pollen, [pollenFromWWP, today?.pollen]);
  const tempNow = weather?.temperatureC != null ? Math.round(weather.temperatureC) : null;
  const feelsNow = weather?.feelsLikeC != null ? Math.round(weather.feelsLikeC) : null;
  const hi = today?.maxC != null ? Math.round(today.maxC) : null;
  const lo = today?.minC != null ? Math.round(today.minC) : null;
  const uvNow = weather?.uvi != null ? Math.round(weather.uvi) : null;
  const uvPeak = today?.uvi != null ? Math.round(today.uvi) : null;
  const humidity = weather?.humidityPct != null ? weather.humidityPct : null;
  const visibilityKm = weather?.visibilityKm != null ? Math.round(weather.visibilityKm) : null;
  const pressure = weather?.pressureHpa != null ? weather.pressureHpa : null;
  const pressureTrend = useMemo(() => {
    const arr = (weather?.hourly || []).slice(0, 6).map((h: any) => h.pressureHpa).filter((n: any) => typeof n === 'number');
    if (arr.length < 2) return null;
    const diff = arr[arr.length - 1] - arr[0];
    if (diff > 1.5) return 'Rising ▲';
    if (diff < -1.5) return 'Falling ▼';
    return 'Steady ▬';
  }, [weather?.hourly]);

  const hoursDyn = useMemo(() => {
    const list = (weather?.hourly || []).slice(0, 18);
    return list.map((h: any, i: number) => {
      const d = new Date(h.timeISO);
      const label = d.toLocaleTimeString([], { hour: 'numeric' });
      const mins = d.getHours() * 60 + d.getMinutes();
      return {
        ts: i,
        timeISO: h.timeISO as string,
        tsMs: d.getTime(),
        label,
        temp: h.tempC != null ? Math.round(h.tempC) : '–',
        iconUrl: getWeatherIconUrl(h.icon),
        pop: Math.round((h.pop || 0) * 100),
        precipMM: h.precipMM || 0,
        wind: (h.windMS != null ? h.windMS * 3.6 : null) || 0,
        gust: undefined,
        waveHeightM: typeof h.waveHeightM === 'number' ? h.waveHeightM : 0,
        windDeg: h.windDeg,
        minutes: mins,
      };
    });
  }, [weather?.hourly]);

  // Build interleaved list of hour cards and event cards (tides, sunrise, sunset)
  const hourlyWithEvents = useMemo(() => {
    const hours = hoursDyn;
    if (!hours.length) return [] as Array<any>;
    const startMs = hours[0].tsMs;
    const endMs = hours[hours.length - 1].tsMs + 1; // inclusive

    type EventCard = { kind: 'tide' | 'sun'; sub: 'high'|'low'|'sunrise'|'sunset'; timeISO: string; height?: number };
    const events: EventCard[] = [];
    // Tide events
    if (Array.isArray(weather?.tides)) {
      for (const e of weather!.tides as Array<{ time: string; type: string }>) {
        const iso = String(e.time);
        const t = new Date(iso).getTime();
        if (!Number.isFinite(t)) continue;
        if (t >= startMs && t <= endMs) {
          const type = String(e.type).toLowerCase().includes('high') ? 'high' : 'low';
          const hVal = (typeof (e as any).height === 'number') ? (e as any).height : ((e as any).height != null ? Number((e as any).height) : undefined);
          events.push({ kind: 'tide', sub: type as 'high'|'low', timeISO: iso, height: Number.isFinite(hVal as number) ? (hVal as number) : undefined });
        }
      }
    }
    // Sunrise/Sunset events (for today only)
    const sr = weather?.sunriseISO ? new Date(weather.sunriseISO).getTime() : NaN;
    if (Number.isFinite(sr) && sr >= startMs && sr <= endMs) events.push({ kind: 'sun', sub: 'sunrise', timeISO: weather!.sunriseISO! });
    const ss = weather?.sunsetISO ? new Date(weather.sunsetISO).getTime() : NaN;
    if (Number.isFinite(ss) && ss >= startMs && ss <= endMs) events.push({ kind: 'sun', sub: 'sunset', timeISO: weather!.sunsetISO! });

    // Sort events by time
    events.sort((a,b) => new Date(a.timeISO).getTime() - new Date(b.timeISO).getTime());

    // Map each event to insertion index (first hour strictly after event time)
    const entries: Array<any> = [];
    let ei = 0;
    for (let i = 0; i < hours.length; i++) {
      const hour = hours[i];
      // Insert any events that occur before this hour
      while (ei < events.length && new Date(events[ei].timeISO).getTime() <= hour.tsMs) {
        const e = events[ei++];
        entries.push({ kind: e.kind, sub: e.sub, timeISO: e.timeISO, key: `${e.kind}-${e.sub}-${e.timeISO}` });
      }
      entries.push({ kind: 'hour', hour, key: `hour-${hour.ts}` });
    }
    // Append any trailing events
    while (ei < events.length) {
      const e = events[ei++];
      entries.push({ kind: e.kind, sub: e.sub, timeISO: e.timeISO, key: `${e.kind}-${e.sub}-${e.timeISO}` });
    }
    return entries;
  }, [hoursDyn, weather?.tides, weather?.sunriseISO, weather?.sunsetISO]);

  const aqiAssess = useMemo(() => {
    const aqi = weather?.airQuality?.aqi ?? undefined;
    if (aqi == null) return null;
    return assessAirQualityConditions({ overall: aqi });
  }, [weather?.airQuality]);

  const pollenAssess = useMemo(() => assessPollenConditions(pollenToday as any), [pollenToday]);
  const pollenAssessForCard = useMemo(() => ({
    description: `Overall pollen level: ${getPollenLevelDescription(pollenAssess.overall)}`,
    advice: pollenAssess.warnings?.[0] || "Consider limiting outdoor activities during peak pollen hours"
  }), [pollenAssess]);
  
  const pollenIdx = useMemo(() => {
    const p = pollenToday as any;
    if (!p) return 0;
    const vals = [p.grass, p.tree, p.weed, p.olive].filter((v: any): v is number => typeof v === 'number');
    if (!vals.length) return 0;
    const sum = vals.reduce((a: number, b: number) => a + getPollenIndex(b), 0);
    return Math.round(sum / vals.length);
  }, [pollenToday]);

  // Ring color helpers
  const aqiRingClass = useMemo(() => {
    if (!aqiAssess) return 'text-base-content';
    switch (aqiAssess.overall) {
      case AirQualityLevel.GOOD: return 'text-success';
      case AirQualityLevel.MODERATE: return 'text-warning';
      case AirQualityLevel.UNHEALTHY_SENSITIVE: return 'text-orange-500';
      case AirQualityLevel.UNHEALTHY: return 'text-error';
      case AirQualityLevel.VERY_UNHEALTHY: return 'text-fuchsia-600';
      case AirQualityLevel.HAZARDOUS: return 'text-purple-700';
      default: return 'text-base-content';
    }
  }, [aqiAssess]);

  const uvRingClass = useMemo(() => {
    const uv = weather?.uvi || 0;
    if (uv <= 2) return 'text-success';
    if (uv <= 5) return 'text-warning';
    if (uv <= 7) return 'text-orange-500';
    if (uv <= 10) return 'text-error';
    return 'text-purple-700';
  }, [weather?.uvi]);

  const pollenRingClass = useMemo(() => {
    switch (pollenAssess.overall) {
      case PollenLevel.NONE: return 'text-base-content/40';
      case PollenLevel.LOW: return 'text-success';
      case PollenLevel.MODERATE: return 'text-warning';
      case PollenLevel.HIGH: return 'text-orange-500';
      case PollenLevel.VERY_HIGH: return 'text-error';
      case PollenLevel.EXTREME: return 'text-purple-700';
      default: return 'text-base-content';
    }
  }, [pollenAssess.overall]);

  // Badge color to match pollen severity (green=low, yellow=moderate, red=high+)
  const pollenBadgeClass = useMemo(() => {
    switch (pollenAssess.overall) {
      case PollenLevel.NONE:
        return 'badge-ghost';
      case PollenLevel.LOW:
        return 'badge-success';
      case PollenLevel.MODERATE:
        return 'badge-warning';
      case PollenLevel.HIGH:
      case PollenLevel.VERY_HIGH:
      case PollenLevel.EXTREME:
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  }, [pollenAssess.overall]);

  const isActiveCoastal = mounted && (activeLoc?.type === 'coastal');
  const hasMarine = isActiveCoastal || Boolean(weather?.marine) || ((weather?.hourly || []).some((h: any) => typeof h.waveHeightM === 'number')) || Boolean(weather?.tides?.length);

  const liveAnimCondition = conditionToAnim(weather?.description, weather?.cloudsPct, weather?.visibilityKm);

  return (
    <div className="relative min-h-screen">
      {/* Background animation */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Gradient fallback */}
       <div className="absolute inset-0 bg-gradient-to-b from-sky-300/35 via-sky-100/20 to-sky-300/35" />
        {/* Background now follows live weather where available */}
        {showAnim && (
          <WeatherAnimationLayer
            weather={{
              condition: (liveAnimCondition as any) || unifiedWeather.condition,
              cloudPct: weather?.cloudsPct ?? unifiedWeather.cloudPct,
              waveHeightM: (weather?.marine?.waveHeight as number | undefined) ?? undefined,
              windSpeedMS: weather?.windSpeedMS ?? unifiedWeather.windSpeedMS,
              isCoastal: hasMarine || unifiedWeather.isCoastal,
              applyBeaufort: true,
            }}
            mode="auto"
          />
        )}
      </div>

      {/* Foreground UI */}
      <main className="marine-layout relative z-10 bg-transparent text-base-content">
        {/* Banner with location buttons */}
        <section className="px-4 pt-3">
          <header className="homepage-banner">
            <div className="homepage-banner__left">
              <Image
                src="/burger-menu-svgrepo-com.svg"
                alt="Open menu"
                className="burger-menu-icon activities-header__burger"
                onClick={() => setMenuOpen(true)}
                width={24}
                height={24}
              />
              <Image
                src="/wotnow-horizontal.png"
                alt="WotNow Logo"
                className="homepage-banner__logo activities-header__logo"
                width={120}
                height={40}
                priority
                style={{ height: 'auto' }}
              />
            </div>
            <div className="mt-3">
  <h1 className="text-2xl md:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent mb-2">
    {isClient && coastalLocation?.name ? `${coastalLocation.name.split(',')[0]}'s Weather` : 'Weather'}
  </h1>
</div>

            {/* Desktop location buttons - in top right */}
            <div className="homepage-banner__location-buttons desktop-location-buttons">
              <button
                className="location-banner__button"
                style={{ background: '#10b981' }}
                onClick={() => setShowHomeDialog(true)}
              >
                {isClient && homeLocation?.name
                  ? `🏡 ${homeLocation.name.split(',')[0]} ✓`
                  : 'Set home location'}
              </button>
              <button
                className="location-banner__button"
                style={{ background: '#3b82f6' }}
                onClick={() => setShowCoastDialog(true)}
              >
                {isClient && coastalLocation?.name
                  ? `🏖️ ${coastalLocation.name.split(',')[0]} ✓`
                  : 'Set beach location'}
              </button>
            </div>
          </header>

          {/* Mobile location buttons (below banner) */}
          <div className="homepage-banner__location-buttons mobile-location-buttons">
            <button
              className="location-banner__button"
              style={{ background: '#10b981', flex: 1 }}
              onClick={() => setShowHomeDialog(true)}
            >
              {isClient && homeLocation?.name
                ? `🏡 ${homeLocation.name.split(',')[0]} ✓`
                : 'Set home location'}
            </button>
            <button
              className="location-banner__button"
              style={{ background: '#3b82f6', flex: 1 }}
              onClick={() => setShowCoastDialog(true)}
            >
              {isClient && coastalLocation?.name
                ? `🏖️ ${coastalLocation.name.split(',')[0]} ✓`
                : 'Set beach location'}
            </button>
          </div>

          {/* Menu overlay */}
          {menuOpen && (
            <>
              <div
                className="menu-overlay"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, cursor: 'default', background: 'rgba(0,0,0,0.7)' }}
                onClick={() => setMenuOpen(false)}
              />
              <nav
                className="navigation-menu"
                style={{ position: 'fixed', zIndex: 1000, top: 0, left: 0, background: '#2b323c', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '12px 24px', minWidth: '220px', maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', margin: '12px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <Link href="/" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Home</Link>
                <Link href="/interests" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Manage my interests</Link>
                <Link href="/activities" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Scan my interests</Link>
                <Link href="/weather" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Local weather in detail</Link>
              </nav>
            </>
          )}
        </section>

        {/* Location pickers */}
        {showHomeDialog && (
          <CoastalLocationDialog
            open={showHomeDialog}
            onClose={() => setShowHomeDialog(false)}
            title="Pick your home location"
            homeLocation={homeLocation}
            coastalLocation={coastalLocation}
            setHomeLocation={setHomeLocation}
            setCoastalLocation={setCoastalLocation}
            onSave={(loc) => { setHomeLocation(loc as any); setShowHomeDialog(false); }}
          />
        )}

        {showCoastDialog && (
          <CoastalLocationDialog
            open={showCoastDialog}
            onClose={() => setShowCoastDialog(false)}
            coastalLocation={coastalLocation}
            setHomeLocation={setHomeLocation}
            setCoastalLocation={setCoastalLocation}
            onSave={(loc) => { setCoastalLocation(loc as any); setShowCoastDialog(false); }}
          />
        )}

        {/* ALERT (example) can be got from openweather i think
        <div className="alert alert-warning rounded-none">
          <span>Yellow warning for strong wind 12:00–21:00. Secure loose items.</span>
        </div> */}

        {/* HERO / NOW */}
        <section className="hero min-h-[18vh] md:min-h-[20vh] bg-transparent section-plate-none pb-2 md:pb-3 mb-0">
          <div className="hero-content w-full flex-col xl:flex-row justify-between gap-4 section-plate-none">
            <div>
              <div className="text-7xl md:text-8xl font-bold leading-none">{tempNow != null ? `${tempNow}°` : '—'}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="badge badge-lg">{weather?.description || '—'}</span>
                <span className="tooltip" data-tip="Feels-like factors: wind, humidity">
                  <span className="text-sm opacity-70">Feels like {feelsNow != null ? `${feelsNow}°` : '—'}</span>
                </span>
              </div>
              <div className="text-sm flex gap-3">
                <span className="text-warning">High {hi != null ? `${hi}°` : '—'}</span>
                <span className="text-info">Low {lo != null ? `${lo}°` : '—'}</span>
              </div>
            </div>
            <div className="stats bg-black/30 backdrop-blur-sm border border-white/10 shadow-sm">
              <div className="stat">
                <div className="stat-title">Wind</div>
                <div className="stat-value text-xl">{weather?.windSpeedMS != null ? `${Math.round(weather.windSpeedMS * 3.6)} km/h` : '—'}</div>
                <div className="stat-desc">{weather?.windDeg != null ? `${degToCompass(weather.windDeg)} ·` : ''} {weather?.windGustMS != null ? `gusts ${Math.round(weather.windGustMS * 3.6)}` : ''}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Humidity</div>
                <div className="stat-value text-xl">{humidity != null ? `${humidity}%` : '—'}</div>
                <div className="stat-desc">Dew point {weather?.dewPointC != null ? Math.round(weather.dewPointC) : '—'}°</div>
              </div>
              <div className="stat">
                <div className="stat-title">UV now</div>
                <div className="stat-value text-xl">{uvNow != null ? uvNow : '—'}</div>
                <div className="stat-desc">Peak {uvPeak != null ? uvPeak : '—'}</div>
              </div>
            </div>
          </div>
        </section>

        {/* STACK: uniform vertical rhythm for card rows */}
        <div className="px-4 marine-stack">
          {/* TOP: Conditionally render marine-first grid or inland-first grid */}
          <section className="bg-transparent section-plate-none">
            {hasMarine ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 auto-rows-fr">
              {/* LEFT — Hourly (full column height) */}
              <div className="flex flex-col h-full">
                <h2 className="text-sm opacity-70 mb-2">Hourly</h2>
                <div className="card bg-transparent shadow-none h-full">
                  <div className="card-body p-0 h-full">
                    <div className="carousel rounded-box space-x-2 bg-transparent h-full">
                      {hourlyWithEvents.map((it) => (
                        <div className="carousel-item" key={it.key}>
                          {it.kind === 'hour' ? (
                            <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm w-32 h-full">
                              <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                                <div>
                                  <div className="text-[11px] opacity-70">{it.hour.label}</div>
                                  <div className="text-3xl font-bold leading-none my-1">{it.hour.temp}°</div>
                                  <img src={it.hour.iconUrl} alt="" className="w-7 h-7 mx-auto mb-1" />
                                  {it.hour.pop > 0 && (
                                    <div className="mb-1">
                                      <div className="badge badge-info badge-sm mr-2">{it.hour.pop}%</div>
                                      <span className="text-[13px] font-semibold align-middle">{it.hour.precipMM.toFixed(1)}mm</span>
                                    </div>
                                  )}
                                  <div className="mt-2 text-[11px] leading-snug text-white/90 w-full space-y-1">
                                    <div>🌊 {it.hour.waveHeightM ? it.hour.waveHeightM.toFixed(1) : '—'} m</div>
                                    <div>
                                      💨 {Math.round(it.hour.wind)} km/h
                                      <div className="opacity-90">{degToCompass(it.hour.windDeg)} </div>
                                      <div className="opacity-90">{Math.round(it.hour.wind / 1.852)} knots </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : it.kind === 'tide' ? (
                            <div className="card bg-sky-800/35 backdrop-blur-sm text-base-content border border-sky-600/50 shadow-sm w-32 h-full">
                              <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                                <div>
                                  <div className="text-[11px] opacity-70">{fmtTimeHM(it.timeISO)}</div>
                                  <img src={it.sub === 'high' ? '/weather-icons/design/fill/final/tide-high.svg' : '/weather-icons/design/fill/final/tide-low.svg'} alt="" className="w-16 h-16 mx-auto my-2" />
                                  <div className="text-sm font-semibold capitalize">{it.sub} tide</div>
                                  {typeof it.height === 'number' && (
                                    <div className="text-xs opacity-90 mt-1">{it.height.toFixed(2)} m</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="card bg-amber-500/35 backdrop-blur-sm text-base-content border border-amber-400/60 shadow-sm w-32 h-full">
                              <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                                <div>
                                  <div className="text-[11px] opacity-70">{fmtTimeHM(it.timeISO)}</div>
                                  <img src={it.sub === 'sunrise' ? '/weather-icons/design/fill/final/sunrise.svg' : '/weather-icons/design/fill/final/sunset.svg'} alt="" className="w-16 h-16 mx-auto my-2" />
                                  <div className="text-sm font-semibold capitalize">{it.sub}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE — two stacked cards (Wind on top, Tides below) */}
              <div className="grid grid-rows-2 gap-4 h-full">
                {/* Wind */}
                <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                  <div className="card-body">
                    <h3 className="card-title">Wind</h3>
                    <div className="stats">
                      <div className="stat">
                        <div className="stat-title">Speed</div>
                        <div className="stat-value text-xl">{weather?.windSpeedMS != null ? `${Math.round(weather.windSpeedMS*3.6)} km/h` : '—'}</div>
                        <div className="stat-desc">{weather?.windGustMS != null ? `Gusts ${Math.round(weather.windGustMS*3.6)}` : ''}</div>
                      </div>
                      <div className="stat">
                        <div className="stat-title">Direction</div>
                        <div className="stat-value text-xl">{weather?.windDeg != null ? degToCompass(weather.windDeg) : '—'}</div>
                      </div>
                    </div>
                    <details className="collapse collapse-arrow mt-2">
                      <summary className="collapse-title text-sm opacity-80">Details</summary>
                      <div className="collapse-content text-sm opacity-80">
                        {getWindMessage({
                          windSpeed: weather?.windSpeedMS,
                          gustSpeed: weather?.windGustMS,
                          windDirection: weather?.windDeg,
                          context: 'land'
                        }) || '—'}
                      </div>
                    </details>
                  </div>
                </div>

                {/* Tides */}
                <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                  <div className="card-body">
                    <h3 className="card-title text-white flex items-center gap-3">
                      {tideState.text}
                      {tideState.icon && (<img src={tideState.icon} alt="" className="w-10 h-10 md:w-12 md:h-12" />)}
                      {remMs != null && (
                        <span className="ml-2 text-sm opacity-70 flex items-center gap-2">
                          <span>for</span>
                          <span className="countdown font-mono text-sm">
                            <span style={{ ['--value' as any]: remH }}></span>h:
                            <span style={{ ['--value' as any]: remM }}></span>m:
                            <span style={{ ['--value' as any]: remS }}></span>s
                          </span>
                        </span>
                      )}
                    </h3>
                    {Array.isArray(weather?.tides) && weather!.tides!.length >= 2 ? (
                      (() => {
                        const raw = (weather!.tides || [])
                          .filter((e: any) => e && e.time)
                          .map((e: any) => ({
                          time: String(e.time),
                          type: (String(e.type).toLowerCase().includes('high') ? 'high' : 'low') as 'high'|'low',
                          height: typeof e.height === 'number' ? e.height : (e.height != null ? Number(e.height) : 0)
                        }));
                        // Sort and window to next 24h
                        const nowTs = Date.now();
                        const endTs = nowTs + 24 * 60 * 60 * 1000;
                        const sorted = raw.slice().sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
                        // Always include the last event before now and the first event after end to ensure full segments
                        let beforeIdx = -1; let afterIdx = -1;
                        for (let i = 0; i < sorted.length; i++) {
                          const t = new Date(sorted[i].time).getTime();
                          if (t < nowTs) beforeIdx = i; else { afterIdx = i; break; }
                        }
                        const windowed = sorted.filter((e: any) => {
                          const t = new Date(e.time).getTime();
                          return t >= nowTs && t <= endTs;
                        });
                        const extras: typeof sorted = [];
                        if (beforeIdx >= 0) extras.push(sorted[beforeIdx]);
                        const firstAfterEndIdx = sorted.findIndex((e: any) => new Date(e.time).getTime() > endTs);
                        if (firstAfterEndIdx >= 0) extras.push(sorted[firstAfterEndIdx]);
                        const events = (windowed.length ? [...extras.slice(0,1), ...windowed, ...extras.slice(1,2)] : sorted);
                        const samples = synthesizeTideSamplesFromExtrema(events);
                        const extrema = events.map((e: any) => ({ ts: new Date(e.time).getTime(), height: e.height, type: e.type }));
                        return (
                          <PrettyTideWaveRolling
                            samples={samples}
                            extrema={extrema}
                            highIconSrc="/weather-icons/design/fill/final/tide-high.svg"
                            lowIconSrc="/weather-icons/design/fill/final/tide-low.svg"
                            className="bg-base-200/20"
                          />
                        );
                      })()
                    ) : (
                      (() => {
                        // Fallback: use demo sequence to render the same pretty tide card shape
                        const today = new Date();
                        const isoFor = (hhmm: string) => {
                          const [hh, mm] = hhmm.split(':').map(Number);
                          const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh % 24, mm || 0, 0, 0);
                          return d.toISOString();
                        };
                        const events = tideSeq.map(e => ({
                          time: isoFor(e.time),
                          type: (e.kind.toLowerCase().includes('high') ? 'high' : 'low') as 'high'|'low',
                          height: e.height
                        }));
                        const samples = synthesizeTideSamplesFromExtrema(events);
                        const extrema = events.map(e => ({ ts: new Date(e.time).getTime(), height: e.height, type: e.type }));
                        return (
                          <PrettyTideWaveRolling
                            samples={samples}
                            extrema={extrema}
                            highIconSrc="/weather-icons/design/fill/final/tide-high.svg"
                            lowIconSrc="/weather-icons/design/fill/final/tide-low.svg"
                            className="bg-base-200/20"
                          />
                        );
                      })()
                    )}

                    {/* Tide Tips (accordion like Moon lore) */}
                    {tidePhase && (
                      <details className="collapse collapse-arrow mt-3">
                        <summary className="collapse-title p-0">
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                tidePhase === 'high' ? '/weather-icons/design/fill/final/tide-high.svg'
                                : tidePhase === 'low' ? '/weather-icons/design/fill/final/tide-low.svg'
                                : tidePhase === 'rising' ? '/weather-icons/design/fill/final/tide-high.svg'
                                : '/weather-icons/design/fill/final/tide-low.svg'
                              }
                              alt=""
                              className="w-6 h-6"
                            />
                            <span className="font-medium">Tide tips</span>
                            <span className="badge badge-ghost badge-sm capitalize">{tidePhase}</span>
                          </div>
                        </summary>
                        <div className="collapse-content p-0 mt-2">
                          <ul className="space-y-2">
                            {getTideTips(tidePhase).map((tip, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <img
                                  src={
                                    tip.icon === 'tide-high' ? '/weather-icons/design/fill/final/tide-high.svg'
                                    : tip.icon === 'tide-low' ? '/weather-icons/design/fill/final/tide-low.svg'
                                    : tip.icon === 'tide-rising' ? '/weather-icons/design/fill/final/tide-high.svg'
                                    : '/weather-icons/design/fill/final/tide-low.svg'
                                  }
                                  alt=""
                                  className="w-5 h-5 mt-0.5 opacity-80"
                                />
                                <div>
                                  <div className="text-sm font-medium">{tip.title}</div>
                                  <div className="text-xs opacity-80">{tip.detail}</div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT — Waves (full column height) */}
              <div className="h-full">
                <WaveCard
                  waveHeightM={weather?.marine?.waveHeight as number | undefined}
                  wavePeriodS={weather?.marine?.wavePeriod as number | undefined}
                  waveDir={weather?.marine?.waveDirection as number | undefined}
                  swellHeightM={weather?.marine?.swellHeight as number | undefined}
                  swellPeriodS={weather?.marine?.swellPeriod as number | undefined}
                  swellDir={weather?.marine?.swellDirection as number | undefined}
                  windSpeedMS={weather?.windSpeedMS as number | undefined}
                  windDir={weather?.windDeg as number | undefined}
                  seaTemp={undefined}
                />
              </div>
            </div>
            ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 auto-rows-fr">
              {/* Row 1: Hourly | Feels Like | Daily summaries */}
              <div className="flex flex-col h-full">
                <h2 className="text-sm opacity-70 mb-2">Hourly</h2>
                <div className="card bg-transparent shadow-none h-full">
                  <div className="card-body p-0 h-full">
                    <div className="carousel rounded-box space-x-2 bg-transparent h-full">
                      {hourlyWithEvents.map((it) => (
                        <div className="carousel-item" key={it.key}>
                          {it.kind === 'hour' ? (
                            <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm w-32 h-full">
                              <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                                <div>
                                  <div className="text-[11px] opacity-70">{it.hour.label}</div>
                                  <div className="text-3xl font-bold leading-none my-1">{it.hour.temp}°</div>
                                  <img src={it.hour.iconUrl} alt="" className="w-7 h-7 mx-auto mb-1" />
                                  {it.hour.pop > 0 && (
                                    <div className="mb-1">
                                      <div className="badge badge-info badge-sm mr-2">{it.hour.pop}%</div>
                                      <span className="text-[13px] font-semibold align-middle">{it.hour.precipMM.toFixed(1)}mm</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : it.kind === 'tide' ? (
                            <div className="card bg-sky-800/35 backdrop-blur-sm text-base-content border border-sky-600/50 shadow-sm w-32 h-full">
                              <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                                <div>
                                  <div className="text-[11px] opacity-70">{fmtTimeHM(it.timeISO)}</div>
                                  <img src={it.sub === 'high' ? '/weather-icons/design/fill/final/tide-high.svg' : '/weather-icons/design/fill/final/tide-low.svg'} alt="" className="w-16 h-16 mx-auto my-2" />
                                  <div className="text-sm font-semibold capitalize">{it.sub} tide</div>
                                  {typeof it.height === 'number' && (
                                    <div className="text-xs opacity-90 mt-1">{it.height.toFixed(2)} m</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="card bg-amber-500/35 backdrop-blur-sm text-base-content border border-amber-400/60 shadow-sm w-32 h-full">
                              <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                                <div>
                                  <div className="text-[11px] opacity-70">{fmtTimeHM(it.timeISO)}</div>
                                  <img src={it.sub === 'sunrise' ? '/weather-icons/design/fill/final/sunrise.svg' : '/weather-icons/design/fill/final/sunset.svg'} alt="" className="w-16 h-16 mx-auto my-2" />
                                  <div className="text-sm font-semibold capitalize">{it.sub}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Feels Like */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
                <div className="card-body">
                  <h3 className="card-title">Feels Like</h3>
                  <div className="stats">
                    <div className="stat">
                      <div className="stat-title">Now</div>
                      <div className="stat-value text-2xl">{feelsNow != null ? `${feelsNow}°` : '—'}</div>
                      <div className="stat-desc">Actual {tempNow != null ? `${tempNow}°` : '—'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily summaries table */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
                <div className="card-body">
                  <h3 className="card-title">Next Few Days</h3>
                  <div className="overflow-x-auto rounded-box bg-transparent">
                    <table className="table table-compact bg-transparent">
                      <tbody>
                        {(weather?.daily || []).slice(0, 8).map((d: any, idx: number) => {
                          const date = new Date(d.dateISO);
                          const label = idx === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
                          const iconUrl = getWeatherIconUrl(d.icon);
                          return (
                            <tr key={d.dateISO} className="odd:bg-white/0 even:bg-white/5/30 hover:bg-white/10 transition-colors">
                              <td className="w-20 px-2 py-2 text-sm whitespace-nowrap">{label}</td>
                              <td className="w-8 px-2 py-2 text-center"><img src={iconUrl} alt="" className="w-6 h-6 inline-block" /></td>
                              <td className="px-2 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-info">Low {d.minC != null ? Math.round(d.minC) : '—'}°</span>
                                  <span className="text-warning">High {d.maxC != null ? Math.round(d.maxC) : '—'}°</span>
                                  <span className="badge badge-outline badge-xs">{d.pop != null ? Math.round((d.pop || 0) * 100) : 0}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            )}
        </section>

        {/* INLAND extra rows (only when no marine data) */}
        {!hasMarine && (
          <>
            {/* Row 2: Wind | Humidity | Sunrise and then Visibility | Moon */}
            <section className="bg-transparent section-plate-none px-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
                {/* Wind */}
                <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
                  <div className="card-body">
                    <h3 className="card-title">Wind</h3>
                    <div className="stats">
                      <div className="stat">
                        <div className="stat-title">Speed</div>
                        <div className="stat-value text-xl">{weather?.windSpeedMS != null ? `${Math.round(weather.windSpeedMS*3.6)} km/h` : '—'}</div>
                        <div className="stat-desc">{weather?.windGustMS != null ? `Gusts ${Math.round(weather.windGustMS*3.6)}` : ''}</div>
                      </div>
                      <div className="stat">
                        <div className="stat-title">Direction</div>
                        <div className="stat-value text-xl">{weather?.windDeg != null ? degToCompass(weather.windDeg) : '—'}</div>
                      </div>
                    </div>
                    <details className="collapse collapse-arrow mt-2">
                      <summary className="collapse-title text-sm opacity-80">Details</summary>
                      <div className="collapse-content text-sm opacity-80">
                        {getWindMessage({ windSpeed: weather?.windSpeedMS, gustSpeed: weather?.windGustMS, windDirection: weather?.windDeg, context: 'land' }) || '—'}
                      </div>
                    </details>
                  </div>
                </div>

                {/* Humidity */}
                <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <h3 className="card-title">Humidity</h3>
                      <span className="badge badge-info">{humidity != null ? `${humidity}%` : '—'}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="radial-progress" style={{ ["--value" as any]: humidity || 0 }} aria-label="Humidity">{humidity != null ? `${humidity}%` : '—'}</div>
                      <div className="text-sm opacity-80">Dew point {weather?.dewPointC != null ? Math.round(weather.dewPointC) : '—'}°</div>
                    </div>
                  </div>
                </div>

                {/* Sunrise */}
                <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
                  <div className="card-body">
                    <h3 className="card-title flex items-center gap-2">
                      <img src="/weather-icons/design/fill/final/sunrise.svg" alt="Sunrise" className="w-5 h-5" />
                      Sunrise &
                      <img src="/weather-icons/design/fill/final/sunset.svg" alt="Sunset" className="w-5 h-5" />
                      Sunset
                    </h3>
                    <div className="flex justify-between text-xs opacity-80"><span>↑ {fmtTimeHM(weather?.sunriseISO)}</span><span>↓ {fmtTimeHM(weather?.sunsetISO)}</span></div>
                  </div>
                </div>

                {/* Visibility */}
                <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <h3 className="card-title">Visibility</h3>
                      <span className="badge badge-outline">{visibilityKm != null ? `${visibilityKm} km` : '—'}</span>
                    </div>
                    {(() => {
                      const pct = visibilityPercentLand(visibilityKm || 0);
                      return (
                        <>
                          <div className="vis-bar">
                            <div className="vis-fill" style={{ width: `${pct}%` }} />
                            <div className="vis-overlay" />
                            <div className="vis-indicator" style={{ left: `calc(${pct}% - 1px)` }} aria-hidden="true" />
                          </div>
                          <div className="text-xs opacity-70 mt-1">0–10 km (log scale)</div>
                          <style jsx>{`
                            .vis-bar { position: relative; height: 10px; border-radius: 9999px; overflow: hidden; background: #cfe9ff; }
                            .vis-fill { position: relative; height: 100%; background: linear-gradient(to right, #79c6ff, #3aa0ff); z-index: 0; }
                            .vis-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(128,128,128,0.6), rgba(128,128,128,0)); pointer-events: none; z-index: 1; }
                            .vis-indicator { position: absolute; top: -2px; width: 2px; height: 14px; background: #ffffff; box-shadow: 0 0 0 1px rgba(0,0,0,0.25); border-radius: 1px; z-index: 2; }
                          `}</style>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Moon */}
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
                          <img src={moonIconForPhase(today?.moonPhase)} alt="Moon phase" className="w-6 h-6" />
                          <span>↓ {fmtTimeHM(today?.moonsetISO) || '—'}</span>
                        </div>
                      </summary>
                      <div className="collapse-content p-0 mt-2"><MoonNugget /></div>
                    </details>
                  </div>
                </div>
              </div>
            </section>

            {/* Row 3: AQI | UVI | Pollen */}
            <section className="bg-transparent section-plate-none px-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Test Card */}
                <TestCard />
                
                {/* AQI */}
                <AirQualityCardV3 />

                {/* UVI */}
                <UVCard 
                  weather={{
                    uvi: weather?.uvi,
                    sunriseISO: weather?.sunriseISO,
                    sunsetISO: weather?.sunsetISO
                  }}
                  today={{
                    uvi: today?.uvi
                  }}
                />

                {/* Pollen */}
                <PollenCard
                  pollenToday={pollenToday}
                  pollenAssess={pollenAssessForCard}
                  pollenIdx={pollenIdx}
                />
              </div>
            </section>

            {/* Row 4: Pressure | Soil Conditions */}
            <section className="bg-transparent section-plate-none px-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Pressure */}
                <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
                  <div className="card-body">
                    <h3 className="card-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/barometer.svg" alt="Pressure" className="w-5 h-5" /> Pressure</h3>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-outline">{pressureTrend || '—'}</span>
                      <span className="text-sm opacity-80">{pressure != null ? `${pressure} hPa` : '—'}</span>
                    </div>
                    <div className="mt-2 rounded-box bg-black/25 backdrop-blur-sm p-2">
                      <div className="flex items-end gap-1 h-16">
                        {(weather?.hourly || []).slice(0, 24).map((h: any, i: number) => {
                          const p = h.pressureHpa || 0;
                          const min = 980, max = 1040;
                          const pct = Math.max(0, Math.min(100, ((p - min) / (max - min)) * 100));
                          const height = 30 + Math.round((pct / 100) * 60);
                          return <div key={i} className="w-1 bg-base-content/40 rounded-t" style={{ height: `${height}%` }} />;
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Soil Conditions */}
                <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
                  <div className="card-body">
                    <h3 className="card-title flex items-center justify-between">
                      <span>Soil Conditions</span>
                      {typeof weather?.soil?.moisture0to1 === 'number' && (
                        <span className="text-sm opacity-70 font-normal">{getSoilCondition(weather.soil.moisture0to1)}</span>
                      )}
                    </h3>
                    {weather?.soil ? (
                      <SoilConditionsPanel soil={weather.soil} timeISO={weather.soilTimeISO} />
                    ) : (
                      <div className="text-sm opacity-80">No soil data</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* GRID OF CARDS (land + marine) */}
        {hasMarine && (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 bg-transparent section-plate-none">
            {/* 10-Day (card, now tighter and only 8 entries) */}
            <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
              <div className="card-body">
                <h3 className="card-title">Next Few Days</h3>
                <div className="overflow-x-auto rounded-box bg-transparent">
                  <table className="table table-compact bg-transparent">
                    <tbody>
                      {(weather?.daily || []).slice(0, 8).map((d: any, idx: number) => {
                        const date = new Date(d.dateISO);
                        const label = idx === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
                        const iconUrl = getWeatherIconUrl(d.icon);
                        return (
                          <tr key={d.dateISO} className="odd:bg-white/0 even:bg-white/5/30 hover:bg-white/10 transition-colors">
                            <td className="w-20 px-2 py-2 text-sm whitespace-nowrap">{label}</td>
                            <td className="w-8 px-2 py-2 text-center"><img src={iconUrl} alt="" className="w-6 h-6 inline-block" /></td>
                            <td className="px-2 py-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-info">Low {d.minC != null ? Math.round(d.minC) : '—'}°</span>
                                <span className="text-warning">High {d.maxC != null ? Math.round(d.maxC) : '—'}°</span>
                                <span className="badge badge-outline badge-xs">{d.pop != null ? Math.round((d.pop || 0) * 100) : 0}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Feels Like */}
            <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
              <div className="card-body">
                <h3 className="card-title">Feels Like</h3>
                <div className="stats">
                  <div className="stat">
                    <div className="stat-title">Now</div>
                    <div className="stat-value text-2xl">{feelsNow != null ? `${feelsNow}°` : '—'}</div>
                    <div className="stat-desc">Actual {tempNow != null ? `${tempNow}°` : '—'}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Drivers</div>
                    <div className="stat-value text-sm">Wind + Humidity</div>
                    <div className="stat-desc">NE 14 km/h · 68% RH</div>
                  </div>
                </div>
                <div className="divider my-2"></div>
                <ul className="text-sm opacity-80 space-y-1">
                  <li>• Wind chill ≈ −1° from breeze</li>
                  <li>• Humidity adds a slight muggy feel</li>
                  <li>• Shade vs sun can vary ±2°</li>
                </ul>
              </div>
            </div>

            {/* Stacked: Sea Temperature + Sunrise/Sunset (moved into this slot) */}
            <div className="grid grid-rows-2 gap-4 h-full">
              {/* Sea Temperature */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                <div className="card-body">
                  <h3 className="card-title">Sea Temperature</h3>
                  <div className="stats">
                    <div className="stat">
                      <div className="stat-title">Now</div>
                      <div className="stat-value text-xl">{marineNow.seaTemp.toFixed(1)}°C</div>
                      <div className="stat-desc"><span className="badge badge-success">Warm for season</span></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Sunrise/Sunset */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                <div className="card-body">
                  <h3 className="card-title flex items-center gap-2">
                    <img src="/weather-icons/design/fill/final/sunrise.svg" alt="Sunrise" className="w-5 h-5" />
                    Sunrise &
                    <img src="/weather-icons/design/fill/final/sunset.svg" alt="Sunset" className="w-5 h-5" />
                    Sunset
                  </h3>
                  <div className="flex justify-between text-xs opacity-70"><span>↑ {fmtTimeHM(weather?.sunriseISO)}</span><span>↓ {fmtTimeHM(weather?.sunsetISO)}</span></div>
                </div>
              </div>
            </div>



            {/* AQI */}
            <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Air Quality</h3>
                  {aqiAssess ? (
                    <span className="badge badge-warning">{getAirQualityLevelDescription(aqiAssess.overall)}</span>
                  ) : (
                    <span className="badge badge-ghost">No data</span>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <div className="radial-progress" style={{ ["--value" as any]: Math.min(100, getAirQualityIndex(weather?.airQuality?.aqi || 0)) }} aria-label="AQI">{getAirQualityIndex(weather?.airQuality?.aqi || 0)}</div>
                  <div className="text-sm opacity-80">{aqiAssess ? 'Keep an eye if sensitive' : '—'}</div>
                </div>
              </div>
            </div>

                {/* Pollen */}
                <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <h3 className="card-title">Pollen</h3>
                      <span className={`badge ${pollenBadgeClass}`}>{getPollenLevelDescription(pollenAssess.overall)}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className={`radial-progress ${pollenRingClass}`} style={{ ["--value" as any]: pollenIdx }} aria-label="Pollen Index">{pollenIdx}</div>
                      <div className="text-sm opacity-80 flex items-center gap-3">
                        <span className="flex items-center gap-1 tooltip tooltip-bottom z-50" data-tip="Trees shed their pollen in winter and spring"><img src="/weather-icons/design/fill/final/pollen-tree.svg" className="w-10 h-10" alt="tree pollen" />{(pollenToday as any)?.tree != null ? Math.round((pollenToday as any).tree) : 0}</span>
                        <span className="flex items-center gap-1 tooltip tooltip-bottom z-50" data-tip="Grass pollen late spring through summer"><img src="/weather-icons/design/fill/final/pollen-grass.svg" className="w-10 h-10" alt="grass" />{(pollenToday as any)?.grass != null ? Math.round((pollenToday as any).grass) : 0}</span>
                        <span className="flex items-center gap-1 tooltip tooltip-bottom z-50" data-tip="Weed pollen late spring to autumn"><img src="/weather-icons/design/fill/final/pollen-flower.svg" className="w-10 h-10" alt="weed pollen" />{(pollenToday as any)?.weed != null ? Math.round((pollenToday as any).weed) : 0}</span>
                        <span className="flex items-center gap-1 tooltip tooltip-bottom z-50" data-tip="Olive-May/June"><img src="/weather-icons/design/fill/final/pollen-olive.svg" className="w-10 h-10" alt="olive pollen" />{(pollenToday as any)?.olive != null ? Math.round((pollenToday as any).olive) : 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

            {/* Visibility */}
            <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Visibility</h3>
                  <span className="badge badge-outline">{visibilityKm != null ? `${visibilityKm} km` : '—'}</span>
                </div>
                {/* Enhanced description */}
                {visibilityKm != null && (
                  <div className="text-sm opacity-80 mb-2">
                    {getVisibilityDescription(visibilityKm) || 'Good visibility'}
                  </div>
                )}
                {/* Assume 20 km = excellent */}
                {(() => {
                  const pct = visibilityPercentLand(visibilityKm || 0);
                  return (
                    <>
                      <div className="vis-bar">
                        <div className="vis-fill" style={{ width: `${pct}%` }} />
                        <div className="vis-overlay" />
                        <div className="vis-indicator" style={{ left: `calc(${pct}% - 1px)` }} aria-hidden="true" />
                      </div>
                      <div className="text-xs opacity-70 mt-1">0–10 km (log scale)</div>
                      <style jsx>{`
                        .vis-bar { position: relative; height: 10px; border-radius: 9999px; overflow: hidden; background: #cfe9ff; }
                        .vis-fill { position: relative; height: 100%; background: linear-gradient(to right, #79c6ff, #3aa0ff); z-index: 0; }
                        .vis-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(128,128,128,0.6), rgba(128,128,128,0)); pointer-events: none; z-index: 1; }
                        .vis-indicator { position: absolute; top: -2px; width: 2px; height: 14px; background: #ffffff; box-shadow: 0 0 0 1px rgba(0,0,0,0.25); border-radius: 1px; z-index: 2; }
                      `}</style>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Humidity */}
            <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <h3 className="card-title">Humidity</h3>
                  <span className="badge badge-info">{humidity != null ? `${humidity}%` : '—'}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="radial-progress" style={{ ["--value" as any]: humidity || 0 }} aria-label="Humidity">{humidity != null ? `${humidity}%` : '—'}</div>
                  <div className="text-sm opacity-80">
                    Dew point 16°
                  </div>
                </div>
              </div>
            </div>

            {/* Pressure */}
            <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
              <div className="card-body">
                <h3 className="card-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/barometer.svg" alt="Pressure" className="w-5 h-5" /> Pressure</h3>
                <div className="flex items-center gap-2">
                  <span className="badge badge-outline">{pressureTrend || '—'}</span>
                  <span className="text-sm opacity-80">{pressure != null ? `${pressure} hPa` : '—'}</span>
                </div>
                <div className="mt-2 rounded-box bg-black/25 backdrop-blur-sm p-2">
                  <div className="flex items-end gap-1 h-16">
                    {(weather?.hourly || []).slice(0, 24).map((h: any, i: number) => {
                      const p = h.pressureHpa || 0;
                      const min = 980, max = 1040;
                      const pct = Math.max(0, Math.min(100, ((p - min) / (max - min)) * 100));
                      const height = 30 + Math.round((pct / 100) * 60);
                      return <div key={i} className="w-1 bg-base-content/40 rounded-t" style={{ height: `${height}%` }} />;
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Soil Conditions (with depth slider) */}
            <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
              <div className="card-body">
                <h3 className="card-title flex items-center justify-between">
                  <span>Soil Conditions</span>
                  {typeof weather?.soil?.moisture0to1 === 'number' && (
                    <span className="text-sm opacity-70 font-normal">{getSoilCondition(weather.soil.moisture0to1)}</span>
                  )}
                </h3>
                {weather?.soil ? (
                  <SoilConditionsPanel soil={weather.soil} timeISO={weather.soilTimeISO} />
                ) : (
                  <div className="text-sm opacity-80">No soil data</div>
                )}
              </div>
            </div>

            {/* Moon */}
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
                      <img src={moonIconForPhase(today?.moonPhase)} alt="Moon phase" className="w-6 h-6" />
                      <span>↓ {fmtTimeHM(today?.moonsetISO) || '—'}</span>
                    </div>
                  </summary>
                  <div className="collapse-content p-0 mt-2">
                    <MoonNugget />
                  </div>
                </details>
              </div>
            </div>
          </section>
          )}
        </div>

        {/* Footer spacing */}
        <div className="h-16" />
      </main>
    </div>
  );
};

export default WeatherDemoPage;
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
