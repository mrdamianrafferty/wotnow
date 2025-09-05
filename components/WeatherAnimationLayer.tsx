// components/WeatherAnimationLayer.tsx
// British English. DaisyUI-friendly background layer that maps live weather → CSS layers.
// Uses utils/weatherBackground.ts (clouds/waves) and your windwave.css classes.
// This component is weather-aware but does NOT fetch; pass in unified fields from your data layer.

import React, { useMemo } from 'react';
import { pickBackgroundClasses, type Condition } from '../utils/weatherBackground';

// Local unified weather shape to support a single `weather` prop without circular imports
export interface UnifiedWeatherData {
  condition: Condition | 'clear' | 'cloudy' | 'overcast' | 'drizzle' | 'rain' | 'storm' | 'snow' | 'fog' | 'marine_calm' | 'marine_choppy' | 'marine_storm';
  temperatureC?: number;
  windSpeedMS?: number;
  windDirectionDeg?: number;
  humidity?: number;
  visibilityKM?: number;
  precipitationMMph?: number;
  isCoastal?: boolean;
  applyBeaufort?: boolean;
  localTimeISO?: string;
  cloudPct?: number;
  waveHeightM?: number;
}

// Props accepted by WeatherAnimationLayer
export interface WeatherBackplateProps {
  weather?: UnifiedWeatherData;
  condition?: Condition;
  cloudPct?: number;
  waveHeightM?: number;
  windSpeedMS?: number;
  isMarine?: boolean;
  applyBeaufortToInland?: boolean;
  showPrecipOverlay?: boolean;
  mode?: string; // accepted for backward-compat; unused
  className?: string;
  children?: React.ReactNode;
  ambient?: number; // 0..1 multiplier for animation brightness
  blurPx?: number;  // optional blur applied to background layers
  opacity?: number; // 0..1 master opacity for background layers
}

// SVG waves with simple horizontal looping animation
function WaveSVG({
  amplitude = 18,
  wavelength = 180,
  baseline = 220,
  colorTop = 'rgba(0,120,200,0.55)',
  colorMid = 'rgba(0,120,200,0.35)',
  colorBot = 'rgba(0,120,200,0.15)',
  speedSec = 14,
}: {
  amplitude?: number;
  wavelength?: number;
  baseline?: number;
  colorTop?: string;
  colorMid?: string;
  colorBot?: string;
  speedSec?: number;
}) {
  // Build a smooth wave path across 1200px using cubic curves
  const buildPath = (phase: number) => {
    const width = 1200;
    const steps = Math.ceil(width / wavelength);
    let d = `M ${-phase} ${baseline}`;
    for (let i = 0; i <= steps + 2; i++) {
      const x = i * wavelength - phase;
      const cp1x = x + wavelength * 0.25;
      const cp2x = x + wavelength * 0.75;
      const y1 = baseline - amplitude;
      const y2 = baseline + amplitude;
      d += ` C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x + wavelength} ${baseline}`;
    }
    // Close to bottom of viewBox to create a filled shape
    d += ` L ${width * 2} 300 L -${width} 300 Z`;
    return d;
  };

  const pathTop = buildPath(0);
  const pathMid = buildPath(wavelength / 2);
  const pathBot = buildPath(wavelength);
  const duration = `${Math.max(6, Math.min(40, speedSec))}s`;

  return (
    <svg className="absolute inset-0" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorTop} />
          <stop offset="60%" stopColor={colorMid} />
          <stop offset="100%" stopColor={colorBot} />
        </linearGradient>
      </defs>

      <g className="wa-wave-layer" style={{ animationDuration: duration }}>
        <path d={pathBot} fill="url(#waveGrad)" />
        <path d={pathMid} fill="url(#waveGrad)" />
        <path d={pathTop} fill="url(#waveGrad)" />
      </g>
      {/* duplicate group for seamless loop */}
      <g className="wa-wave-layer" style={{ animationDuration: duration, transform: 'translateX(1200px)' }}>
        <path d={pathBot} fill="url(#waveGrad)" />
        <path d={pathMid} fill="url(#waveGrad)" />
        <path d={pathTop} fill="url(#waveGrad)" />
      </g>
    </svg>
  );
}

export default function WeatherAnimationLayer(props: WeatherBackplateProps) {
  const {
    weather,
    condition: condProp,
    cloudPct: cloudProp,
    waveHeightM: waveProp,
    windSpeedMS: windProp,
    isMarine: marineProp,
    applyBeaufortToInland: inlandProp,
    showPrecipOverlay = true,
    className = '',
    children,
    ambient,
    blurPx,
    opacity,
  } = props;

  // Derive effective inputs from unified object or individual props
  const condition = (weather?.condition ?? condProp ?? 'clear') as Condition;
  const cloudPct = weather?.cloudPct ?? cloudProp ?? 0;
  const waveHeightM = weather?.waveHeightM ?? waveProp;
  const windSpeedMS = weather?.windSpeedMS ?? windProp;
  const isMarine = weather?.isCoastal ?? marineProp ?? false;
  const applyBeaufortToInland = weather?.applyBeaufort ?? inlandProp ?? false;

  // Decide which CSS classes to render (clouds/waves)
  const bg = useMemo(() => pickBackgroundClasses({
    condition,
    cloudPct,
    waveHeightM,
    windSpeedMS,
    isMarine,
    applyBeaufortToInland,
  }), [condition, cloudPct, waveHeightM, windSpeedMS, isMarine, applyBeaufortToInland]);

  // Optional gentle precip layer purely in CSS (no particles)
  const wantsCssPrecip =
    showPrecipOverlay && (condition === 'drizzle' || condition === 'rain' || condition === 'snow');

  // Inline CSS variables allow per-instance tuning while remaining theme-aware
  const cssVars: Partial<Record<'--wa-anim-ambient' | '--wa-anim-blur' | '--wa-anim-opacity', string>> = {};
  if (typeof ambient === 'number') cssVars['--wa-anim-ambient'] = String(ambient);
  if (typeof blurPx === 'number') cssVars['--wa-anim-blur'] = `${blurPx}px`;
  if (typeof opacity === 'number') cssVars['--wa-anim-opacity'] = String(opacity);
  const styleVars: React.CSSProperties = cssVars as React.CSSProperties;

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={styleVars}>
      {/* Background layers (order: clouds then waves). Each is absolutely positioned via .wa-bg */}
      {bg.showClouds && bg.cloudsClass && (
        <div className={`wa-bg ${bg.cloudsClass} wa-lit`} aria-hidden />
      )}

      {bg.showWaves && (
        <div className="wa-bg wa-waves-svg wa-lit" aria-hidden>
          <WaveSVG
            amplitude={Math.max(12, Math.min(36, (weather?.waveHeightM ?? waveHeightM ?? 0.8) * 18))}
            wavelength={160}
            baseline={230}
            speedSec={Math.max(8, 30 - Math.round((weather?.windSpeedMS ?? windSpeedMS ?? 4) * 2))}
          />
        </div>
      )}

      {/* Optional CSS-only precip hint */}
      {wantsCssPrecip && (
        <div
          className={`wa-bg ${condition === 'snow' ? 'wa-snow' : 'wa-rain'} wa-lit`}
          aria-hidden
        />
      )}

      {/* Contrast gradient behind text to safeguard readability in all themes */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-base-100/70 via-base-100/30 to-transparent" />

      {/* Foreground content */}
      <div className="relative z-[1]">
        {children}
      </div>
    </div>
  );
}

/* =========================
   Usage examples
   =========================

import WeatherAnimationLayer from '@/components/WeatherAnimationLayer';
import { setBeaufortResolver } from '@/utils/weatherBackground';
import { getBeaufortNumber } from '@/utils/beaufort';

// Wire your own Beaufort converter once (e.g. _app.tsx)
setBeaufortResolver(getBeaufortNumber);

// In a header/hero:
<WeatherAnimationLayer
  condition={weather.condition as any}          // 'cloudy' | 'overcast' | 'drizzle' | 'rain' | 'storm' | 'snow' | 'fog' | 'clear' | 'marine_*'
  cloudPct={weather.cloudPct}
  waveHeightM={weather.waveHeightM}
  windSpeedMS={weather.windSpeedMS}
  isMarine={isMarineLocation}
  applyBeaufortToInland={activity.applyBeaufortToInland === true}
  showPrecipOverlay
  className="h-64"
>
  <div className="p-4">
    <h1 className="text-3xl font-semibold">Today in {locationName}</h1>
    <p className="opacity-70">{Math.round(weather.temperatureC)}°, {(weather.condition as string).replace('_',' ')}</p>
  </div>
</WeatherAnimationLayer>

Notes:
- CSS classes (wa-clouds.*, wa-waves.*, wa-rain, wa-snow, wa-bg, wa-lit) come from your windwave.css.
- DaisyUI theme controls colours; this layer stays subtle via opacity + blur.
- Reduced-motion users are respected by your CSS @media rule (animations disabled).
*/

/* =========================
   Remaining Tasks (short)
   =========================
1) Ensure windwave.css is loaded globally (has .wa-bg, .wa-lit, .wa-clouds.*, .wa-waves.*, keyframes).
2) Map your unified weather data → props above (condition, cloudPct, waveHeightM, windSpeedMS, isMarine).
3) Call setBeaufortResolver(getBeaufortNumber) once during app boot (e.g. _app.tsx).
4) Optionally tune per-instance with props: ambient/blurPx/opacity/showPrecipOverlay.
5) Later: if you want WebGL fog/clouds or particle rain, we can extend this same component.
*/
