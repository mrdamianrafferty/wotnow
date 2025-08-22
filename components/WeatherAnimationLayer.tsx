// src/components/WeatherAnimationLayer.tsx
// WotNow Weather Animation Layer – with fog, clouds, hysteresis smoothing,
// Beaufort-scale marine effects (optional inland via applyBeaufort flag)

import React, { useEffect, useRef, useState } from 'react';

// ===== Types =====
export interface UnifiedWeatherData {
  condition: string; // 'clear', 'cloudy', 'rain', 'snow', 'fog', 'marine_calm', 'marine_choppy', 'marine_storm'
  temperatureC: number;
  windSpeedMS: number;
  windDirectionDeg: number;
  humidity: number;
  visibilityKM: number;
  precipitationMMph: number;
  isCoastal: boolean;
  applyBeaufort?: boolean; // NEW: opt-in for inland waters
  localTimeISO: string;
}

// ===== Hysteresis Helper =====
let lastCondition: string | null = null;
let lastChangeTime = 0;
const HYSTERESIS_MS = 5000; // require 5s stable before flipping

function smoothCondition(newCondition: string): string {
  const now = Date.now();
  if (!lastCondition) {
    lastCondition = newCondition;
    lastChangeTime = now;
    return newCondition;
  }
  if (newCondition !== lastCondition) {
    if (now - lastChangeTime < HYSTERESIS_MS) {
      return lastCondition;
    }
    lastCondition = newCondition;
    lastChangeTime = now;
  }
  return lastCondition;
}

// ===== Beaufort Helper =====
// Formula: B ≈ (v/0.836)^(2/3)
function beaufortForce(windMS: number): number {
  return Math.round(Math.pow(windMS / 0.836, 2 / 3));
}

// ===== Texture Selector Helper =====
function selectTexture(weather: UnifiedWeatherData): string {
  const condition = weather.condition;
  if (condition === 'cloudy') {
    if (weather.humidity > 80) {
      return "/skies/Cloudy Sky/Cloudy_Sky-Gray_Heavy.png";
    } else {
      return "/skies/Cloudy Sky/Cloudy_Sky-Light.png";
    }
  }
  if (condition === 'clear') {
    return "/skies/Simple Sky/Simple_Sky.png";
  }
  if (condition.startsWith('marine_') && (weather.isCoastal || weather.applyBeaufort)) {
    const beaufort = beaufortForce(weather.windSpeedMS);
    if (beaufort <= 2) return "/waves/waves1/00.png";
    if (beaufort <= 5) return "/waves/waves2/00.png";
    return "/waves/waves3/00.png";
  }
  return "";
}

// ===== Simple Background (CSS layers) =====
const SimpleBackground = ({ condition, weather }: { condition: string; weather: UnifiedWeatherData }) => {
  const c = smoothCondition(condition);

  if (c === 'clear') {
    const tex = selectTexture(weather);
    return <div className="wa-bg wa-clear wa-lit" aria-hidden style={{ backgroundImage: `url(${tex})`, backgroundSize: 'cover' }} />;
  }
  if (c === 'rain') return <div className="wa-bg wa-rain wa-lit" aria-hidden />;
  if (c === 'snow') return <div className="wa-bg wa-snow wa-lit" aria-hidden />;
  if (c === 'fog') return <div className="wa-bg wa-fog wa-lit" aria-hidden />;
  if (c === 'cloudy') {
    const tex = selectTexture(weather);
    return <div className="wa-bg wa-clouds wa-lit" aria-hidden style={{ backgroundImage: `url(${tex})`, backgroundSize: 'cover' }} />;
  }
  if (c.startsWith('marine_')) {
    const tex = selectTexture(weather);
    return (
      <>
        <div
          className="wa-bg wa-waves wa-lit"
          aria-hidden
          style={{ backgroundImage: `url(${tex})`, backgroundSize: 'cover' }}
        />
        {(weather.applyBeaufort || weather.isCoastal) && beaufortForce(weather.windSpeedMS) >= 5 && (
          <div className="wa-bg wa-spray wa-lit" aria-hidden />
        )}
      </>
    );
  }
  return null;
};

// ===== Advanced Canvas Animation (rain/fog/clouds) =====
const AdvancedCanvas = ({ condition, weather }: { condition: string; weather: UnifiedWeatherData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let raf = 0;
    const drops: { x: number; y: number; len: number; speed: number }[] = [];
    for (let i = 0; i < 200; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: 10 + Math.random() * 20,
        speed: 2 + Math.random() * 4,
      });
    }

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (condition === 'rain') {
        ctx.strokeStyle = 'rgba(174,194,224,0.5)';
        ctx.lineWidth = 1;
        for (const d of drops) {
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x, d.y + d.len);
          ctx.stroke();
          d.y += d.speed;
          if (d.y > canvas.height) d.y = -20;
        }
      }
      if (condition === 'fog') {
        ctx.fillStyle = 'rgba(200,200,200,0.05)';
        for (let i = 0; i < 50; i++) {
          ctx.beginPath();
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          ctx.arc(x, y, 60, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (condition === 'cloudy') {
        ctx.fillStyle = 'rgba(180,180,200,0.15)';
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          const x = (performance.now() / 1000 * 10 + i * 100) % canvas.width;
          const y = 50 + i * 10;
          ctx.arc(x, y, 40, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(render);
    }
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [condition]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

// ===== Main Weather Animation Layer =====
export default function WeatherAnimationLayer({
  weather,
  mode = 'auto',
}: {
  weather: UnifiedWeatherData | null;
  mode?: 'auto' | 'simple' | 'advanced';
}) {
  const [effective, setEffective] = useState<'simple' | 'advanced'>('simple');

  useEffect(() => {
    if (mode === 'auto') {
      if (typeof window !== 'undefined' && 'WebGLRenderingContext' in window) {
        setEffective('advanced');
      } else {
        setEffective('simple');
      }
    } else {
      setEffective(mode);
    }
  }, [mode]);

  if (!weather) return null;

  const c = smoothCondition(weather.condition);

  return (
    <>
      {effective === 'simple' && <SimpleBackground condition={c} weather={weather} />}
      {effective === 'advanced' && <AdvancedCanvas condition={c} weather={weather} />}
      {/* Marine Beaufort spray overlay in advanced mode */}
      {effective === 'advanced' && (weather.applyBeaufort || weather.isCoastal) && (() => {
        const b = beaufortForce(weather.windSpeedMS);
        return b >= 5 ? <div className="wa-bg wa-spray wa-lit" aria-hidden /> : null;
      })()}
    </>
  );
}

// ===== CSS (inject via globals.css or module) =====
/*
.wa-bg { position:absolute; inset:0; pointer-events:none; }
.wa-lit { mix-blend-mode:screen; opacity:.7; }
.wa-rain { background-image: linear-gradient(rgba(255,255,255,.3) 50%, transparent 50%); background-size:2px 20px; animation:wa-rainfall 0.5s linear infinite; }
.wa-snow { background-image: radial-gradient(white 1px, transparent 1px); background-size:6px 6px; animation:wa-snowfall 5s linear infinite; }
.wa-fog { background: rgba(200,200,200,0.15); backdrop-filter: blur(6px); }
.wa-clouds { background-image: url('/cloud-texture.png'); background-size: cover; opacity:0.4; animation:wa-cloudscroll 60s linear infinite; }
.wa-waves { background: linear-gradient(to top, rgba(0,40,80,0.6), transparent); }
.wa-spray { background-image: radial-gradient(rgba(255,255,255,.25) 0 1px, transparent 2px); background-size:6px 6px; animation:wa-sprayDrift 3s linear infinite; }

@keyframes wa-rainfall { from{background-position:0 -20px} to{background-position:0 0} }
@keyframes wa-snowfall { from{background-position:0 0} to{background-position:0 6px} }
@keyframes wa-cloudscroll { from{background-position:0 0} to{background-position:1000px 0} }
@keyframes wa-sprayDrift { from{background-position:0 0} to{background-position:-60px 120px} }
*/

// ===== Remaining Tasks =====
/*
1. Source visuals:
   - High-quality cloud texture (`/cloud-texture.png`) or procedural clouds - see /public/skies
   - Optional wave textures if not relying on gradients - see /public/waves and subfolders
2. Update CSS:
   - Fine-tune opacity, blend modes, and motion speeds for realism
   - Mobile performance: consider lower-density particle patterns
3. Update `activityTypes.ts`:
   - Add `applyBeaufort: true` flag for inland water activities (e.g. lake sailing)
4. Data integration:
   - Ensure OpenWeather OneCall 3.0 + Stormglass map cleanly into UnifiedWeatherData
   - Pass `applyBeaufort` where relevant
5. Pages integration:
   - Import `WeatherAnimationLayer` in main weather card/page layouts
   - Toggle `mode="auto"` unless user preferences override
6. Optimisation:
   - Consider offscreen canvas for performance
   - Expand fog and cloud systems with WebGL when ready
7. Future polish:
   - Add lightning flashes in thunderstorms
   - Night/day tinting via gradient overlay
   - More Beaufort states: tree movement, flags, etc.
*/