// pages/recreated-weather.tsx
// Recreated version of my-new-weather page with proper card formatting and layout

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AirQualityCard } from "../components/weather-cards/AirQualityCard";
import { PollenCard } from "../components/weather-cards/PollenCard";
import { UVCard } from "../components/weather-cards/UVCard";
import { SoilCard } from "../components/weather-cards/SoilCard";
import { DailyForecastCard } from "../components/weather-cards/DailyForecastCard";
import { PressureCard } from "../components/weather-cards/PressureCard";
import { HumidityCard } from "../components/weather-cards/HumidityCard";
import { SunriseSunsetCard } from "../components/weather-cards/SunriseSunsetCard";
import { VisibilityCard } from "../components/weather-cards/VisibilityCard";
import { MoonCard } from "../components/weather-cards/MoonCard";
import { TidesCard } from "../components/weather-cards/TidesCard";
import { WaveCard } from "../components/weather-cards/WaveCard";
import { HourlyMarineCard } from "../components/weather-cards/HourlyMarineCard";
import { 
  assessAirQualityConditions
} from "../utils/airQualityUtils";
import { assessPollenConditions } from "../utils/pollenUtils";
import { useUserPreferences } from "../context/UserPreferencesContext";
import useSWR from 'swr';

// Conditionally import components that need client-side only rendering
const WeatherAnimationLayer = dynamic(() => import("../components/WeatherAnimationLayer").then(m => m.default), { ssr: false });

// Interface definitions
interface _Location {
  id: string;
  name: string;
  type?: string;
  lat: number;
  lon: number;
}

// Helper functions
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

const COMPASS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"] as const;
function degToCompass(deg?: number) {
  if (deg == null || isNaN(deg)) return "-";
  const i = Math.round((deg % 360) / 22.5) % 16;
  return COMPASS[i];
}

// Data fetcher for SWR
const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });

// Main page component
const RecreatedWeatherPage: React.FC = () => {
  const { preferences } = useUserPreferences?.() || { 
    preferences: { locations: [] }
  };
  const [isClient, setIsClient] = useState(false);
  const [showAnim, setShowAnim] = useState(false);
  const [bgForced, setBgForced] = useState<null | boolean>(null); // null = auto, true = on, false = off

  // Prevent hydration mismatch by only showing location-specific content after client mount
  useEffect(() => {
    setIsClient(true);
    applyAutoGate(); // Check for animation preferences
  }, []);

  // Check if animations should be shown based on device capabilities
  const applyAutoGate = () => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } })?.connection?.saveData === true;
    const cores = (navigator as Navigator & { hardwareConcurrency?: number })?.hardwareConcurrency || 8;
    const lowEnd = cores <= 4;
    setShowAnim(!(reduced || saveData || lowEnd));
  };

  // Toggle animation background
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

  // Check stored animation preferences on component mount
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

  // Get active location  
  const homeLocation = preferences?.locations?.find((loc) => loc.type === 'home');
  const coastalLocation = preferences?.locations?.find((loc) => loc.type === 'coastal');
  const activeLoc = coastalLocation || homeLocation;
  
  // Location coordinates for API calls
  const lat = typeof activeLoc?.lat === 'number' ? activeLoc.lat : 43.5141935; // Default location if none available
  const lon = typeof activeLoc?.lon === 'number' ? activeLoc.lon : -5.2712551;
  
  // Determine if in marine or land mode
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const mode = (mounted && activeLoc?.type === 'coastal') ? 'marine' : 'land';
  
  // Fetch weather data with SWR
  const { data: weather } = useSWR(
    lat != null && lon != null ? `/api/unified-weather?lat=${lat}&lon=${lon}&mode=${mode}` : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 10 * 60 * 1000 }
  );
  
  // Fetch marine data for marine-specific components (tides, waves)
  const { data: _marineData } = useSWR(
    lat != null && lon != null ? `/api/unified-weather?lat=${lat}&lon=${lon}&mode=marine` : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 10 * 60 * 1000 }
  );
  
  // Fetch pollen data with SWR - data fetcher is unused but kept for future use
  const { data: _wwp } = useSWR(
    lat != null && lon != null ? `/api/weather-with-pollen?lat=${lat}&lon=${lon}` : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 10 * 60 * 1000 }
  );

  // Sample data for fallback when API fails
  const sampleWeatherData = useMemo(() => ({
    airQuality: {
      aqi: 35,
      pm2_5: 5.2,
      pm10: 12.5,
      no2: 25.3,
      o3: 30.1,
      so2: 2.1,
      co: 250
    },
    uvi: 5.8,
    temperatureC: 23,
    feelsLikeC: 24,
    windSpeedMS: 4.2,
    windDirectionDeg: 45,
    humidity: 68,
    visibilityKM: 10,
    sunriseISO: new Date(new Date().setHours(6, 30, 0, 0)).toISOString(),
    sunsetISO: new Date(new Date().setHours(19, 45, 0, 0)).toISOString(),
    description: "Partly Cloudy",
    soil: {
      temp0cm: 22.4,
      temp6cm: 20.7,
      temp18cm: 19.1,
      temp54cm: 16.8,
      moisture0to1: 0.28,
      moisture1to3: 0.31,
      moisture3to9: 0.33,
      moisture9to27: 0.36
    },
    soilTimeISO: new Date().toISOString(),
    daily: [{
      maxC: 27,
      minC: 19,
      uvi: 6,
      dateISO: new Date().toISOString()
    }]
  }), []);

  // Get sample pollen data
  const _samplePollenData = useMemo(() => ({
    types: {
      grass: { level: 2, text: "Moderate" },
      tree: { level: 1, text: "Low" },
      weed: { level: 3, text: "High" }
    },
    overall: { level: 3, text: "High" }
  }), []);

  // For tracking time changes
  const [_nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setNowTick(prev => prev + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Extract essential weather data for components
  const today = weather?.daily?.[0];
  const todayStr = today?.dateISO;
  const pollenFromWWP = (todayStr && _wwp?.pollenByDate?.[todayStr]) || undefined;
  const pollenToday = useMemo(() => pollenFromWWP ?? today?.pollen, [pollenFromWWP, today?.pollen]);
  const tempNow = weather?.temperatureC != null ? Math.round(weather.temperatureC) : null;
  const feelsNow = weather?.feelsLikeC != null ? Math.round(weather.feelsLikeC) : null;
  const hi = today?.maxC != null ? Math.round(today.maxC) : null;
  const lo = today?.minC != null ? Math.round(today.minC) : null;
  const uvNow = weather?.uvi != null ? Math.round(weather.uvi) : null;
  const uvPeak = today?.uvi != null ? Math.round(today.uvi) : null;
  const humidity = weather?.humidity != null ? weather.humidity : null;
  const pressureTrend = null; // TODO: Implement pressure trend calculation

  // Process hourly weather data
  const hoursDyn = useMemo(() => {
    const list = (weather?.hourly || []).slice(0, 18);
    return list.map((h: Record<string, any>, i: number) => {
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

  // Type definitions for the hourly forecast
  type HourlyEvent = {
    kind: string;
    sub?: string;
    timeISO?: string;
    height?: number;
    key: string;
    hour?: {
      label: string;
      temp: number | string;
      iconUrl: string;
      pop: number;
      precipMM: number;
    };
  };

  // Build interleaved list of hour cards and event cards (tides, sunrise, sunset)
  const hourlyWithEvents = useMemo(() => {
    const hours = hoursDyn;
    if (!hours.length) return [] as HourlyEvent[];
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
          const eObj = e as Record<string, any>;
          const hVal = (typeof eObj.height === 'number') ? eObj.height : (eObj.height != null ? Number(eObj.height) : undefined);
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
    const entries: HourlyEvent[] = [];
    let ei = 0;
    for (let i = 0; i < hours.length; i++) {
      const hour = hours[i];
      // Insert any events that occur before this hour
      while (ei < events.length && new Date(events[ei].timeISO).getTime() <= hour.tsMs) {
        const e = events[ei++];
        entries.push({ kind: e.kind, sub: e.sub, timeISO: e.timeISO, height: e.height, key: `${e.kind}-${e.sub}-${e.timeISO}` });
      }
      entries.push({ kind: 'hour', hour, key: `hour-${hour.ts}` });
    }
    // Append any trailing events
    while (ei < events.length) {
      const e = events[ei++];
      entries.push({ kind: e.kind, sub: e.sub, timeISO: e.timeISO, height: e.height, key: `${e.kind}-${e.sub}-${e.timeISO}` });
    }
    return entries;
  }, [hoursDyn, weather]);

  // AQI and Pollen assessments
  const aqiAssess = useMemo(() => {
    const aqi = weather?.airQuality?.aqi ?? undefined;
    if (aqi == null) return null;
    return assessAirQualityConditions({ overall: aqi });
  }, [weather?.airQuality]);

  // Unused but kept for future reference
  const _pollenAssess = useMemo(() => assessPollenConditions(pollenToday as Record<string, any>), [pollenToday]);
  
  // AQI assessment

  return (
    <div className="min-h-screen bg-base-300 overflow-x-hidden">
      {/* Background animation layer */}
      {showAnim && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <WeatherAnimationLayer condition="cloudy" />
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 min-h-screen">
        {/* Page Header/Navigation */}
        <header className="bg-base-200/50 backdrop-blur-md shadow-lg">
          <div className="container mx-auto p-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">WotNow Weather</h1>
              <div className="badge badge-accent">Recreated</div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleBg} 
                className="btn btn-sm btn-ghost"
                aria-label="Toggle background animations"
              >
                {bgForced === true ? "BG: On" : bgForced === false ? "BG: Off" : "BG: Auto"}
              </button>
              <Link href="/new-weather" className="btn btn-sm btn-primary">
                View All Cards
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section / Current Weather */}
        <section className="hero min-h-[18vh] md:min-h-[20vh] bg-transparent section-plate-none pb-2 md:pb-3 mb-0">
          <div className="hero-content w-full flex-col xl:flex-row justify-between gap-4 section-plate-none">
            <div>
              <div className="text-7xl md:text-8xl font-bold leading-none">{tempNow != null ? `${tempNow}°` : '—'}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="badge badge-lg">{weather?.description || sampleWeatherData.description}</span>
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
                <div className="stat-value text-xl">{weather?.windSpeedMS != null ? `${Math.round(weather.windSpeedMS * 3.6)} km/h` : `${Math.round(sampleWeatherData.windSpeedMS * 3.6)} km/h`}</div>
                <div className="stat-desc">{weather?.windDeg != null ? `${degToCompass(weather.windDeg)} ·` : `${degToCompass(sampleWeatherData.windDirectionDeg)} ·`} {weather?.windGustMS != null ? `gusts ${Math.round(weather.windGustMS * 3.6)}` : ''}</div>
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

        {/* Card Grid Layout */}
        <div className="px-4 marine-stack">
          {/* Main grid - 3 columns on large screens */}
          <section className="bg-transparent section-plate-none">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 auto-rows-fr mb-4">
              {/* LEFT Column - Hourly */}
              <div className="card bg-transparent shadow-none h-full">
                <div className="card-body p-0 h-full">
                  <h2 className="text-sm opacity-70 mb-2 px-2">Hourly</h2>
                  <div className="overflow-x-auto w-full h-full">
                    <div className="flex space-x-2 h-full">
                      {hourlyWithEvents && hourlyWithEvents.map((it) => (
                        <div className="flex-shrink-0" key={it.key}>
                          {it.kind === 'hour' && it.hour ? (
                            <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm w-32 h-full">
                              <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                                <div>
                                  <div className="text-[11px] opacity-70">{it.hour.label}</div>
                                  <div className="text-3xl font-bold leading-none my-1">{it.hour.temp}°</div>
                                  <div className="relative w-7 h-7 mx-auto mb-1">
                                    <Image 
                                      src={it.hour.iconUrl} 
                                      alt="Weather icon" 
                                      fill 
                                      sizes="28px"
                                      style={{ objectFit: 'contain' }}
                                    />
                                  </div>
                                  {it.hour.pop > 0 && (
                                    <div className="mb-1">
                                      <div className="badge badge-info badge-sm mr-2">{it.hour.pop}%</div>
                                      <span className="text-[13px] font-semibold align-middle">{it.hour.precipMM.toFixed(1)}mm</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : it.kind === 'tide' && it.timeISO && it.sub ? (
                            <div className="card bg-sky-800/35 backdrop-blur-sm text-base-content border border-sky-600/50 shadow-sm w-32 h-full">
                              <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                                <div>
                                  <div className="text-[11px] opacity-70">{fmtTimeHM(it.timeISO)}</div>
                                  <div className="relative w-16 h-16 mx-auto my-2">
                                    <Image 
                                      src={it.sub === 'high' ? '/weather-icons/design/fill/final/tide-high.svg' : '/weather-icons/design/fill/final/tide-low.svg'} 
                                      alt={`${it.sub} tide icon`} 
                                      fill 
                                      sizes="64px"
                                      style={{ objectFit: 'contain' }}
                                    />
                                  </div>
                                  <div className="text-sm font-semibold capitalize">{it.sub} tide</div>
                                  {typeof it.height === 'number' && (
                                    <div className="text-xs opacity-90 mt-1">{it.height.toFixed(2)} m</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : it.kind === 'sun' && it.timeISO && it.sub ? (
                            <div className="card bg-amber-500/35 backdrop-blur-sm text-base-content border border-amber-400/60 shadow-sm w-32 h-full">
                              <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                                <div>
                                  <div className="text-[11px] opacity-70">{fmtTimeHM(it.timeISO)}</div>
                                  <div className="relative w-16 h-16 mx-auto my-2">
                                    <Image 
                                      src={it.sub === 'sunrise' ? '/weather-icons/design/fill/final/sunrise.svg' : '/weather-icons/design/fill/final/sunset.svg'} 
                                      alt={`${it.sub} icon`} 
                                      fill 
                                      sizes="64px"
                                      style={{ objectFit: 'contain' }}
                                    />
                                  </div>
                                  <div className="text-sm font-semibold capitalize">{it.sub}</div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column - Air Quality */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                <div className="card-body">
                  <h2 className="text-sm opacity-70 mb-2">Air Quality</h2>
                  <AirQualityCard 
                    weather={weather || sampleWeatherData} 
                    aqiAssess={aqiAssess}
                  />
                </div>
              </div>

              {/* Right Column - UV Index */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                <div className="card-body">
                  <h2 className="text-sm opacity-70 mb-2">UV Index</h2>
                  <UVCard 
                    weather={{
                      uvi: weather?.uvi || sampleWeatherData.uvi,
                      sunriseISO: weather?.sunriseISO || sampleWeatherData.sunriseISO,
                      sunsetISO: weather?.sunsetISO || sampleWeatherData.sunsetISO
                    }}
                    today={{ uvi: weather?.uvi || sampleWeatherData.uvi }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Second Row - 2 columns on large screens */}
          <section className="bg-transparent section-plate-none">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 auto-rows-fr mb-4">
              {/* Pollen Card */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                <div className="card-body">
                  <h2 className="text-sm opacity-70 mb-2">Pollen</h2>
                  <PollenCard 
                    pollenAssess={{
                      description: "Current pollen levels",
                      advice: _pollenAssess?.warnings?.[0] || "Consider limiting outdoor activities during peak pollen hours"
                    }}
                    pollenIdx={3}
                    pollenToday={pollenToday}
                    />
                  </div>
              </div>
              
              {/* Soil Conditions Card */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                <div className="card-body">
                  <h2 className="text-sm opacity-70 mb-2">Soil Conditions</h2>
                  <SoilCard 
                    weather={{
                      soil: weather?.soil || sampleWeatherData.soil,
                      soilTimeISO: weather?.soilTimeISO || sampleWeatherData.soilTimeISO
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Third Row - with column spanning */}
          <section className="bg-transparent section-plate-none">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 auto-rows-fr mb-4">
              {/* First card */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                <div className="card-body">
                  <h2 className="text-sm opacity-70 mb-2">Weather Details</h2>
                  <h3 className="font-semibold">Wind</h3>
                  <div>
                    <p>{weather?.windSpeedMS != null ? `${Math.round(weather.windSpeedMS * 3.6)} km/h ${degToCompass(weather.windDeg || 0)}` : 'No data'}</p>
                    <p className="text-xs opacity-70">{weather?.windGustMS != null ? `Gusts up to ${Math.round(weather.windGustMS * 3.6)} km/h` : ''}</p>
                  </div>
                </div>
              </div>

              {/* Second card */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                <div className="card-body">
                  <h2 className="text-sm opacity-70 mb-2">Sun & Moon</h2>
                  <h3 className="font-semibold">Sunrise & Sunset</h3>
                  <p>↑ {weather?.sunriseISO ? fmtTimeHM(weather.sunriseISO) : '6:30 AM'}</p>
                  <p>↓ {weather?.sunsetISO ? fmtTimeHM(weather.sunsetISO) : '7:45 PM'}</p>
                </div>
              </div>

              {/* Third card - Pressure */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                <div className="card-body">
                  <h2 className="text-sm opacity-70 mb-2">Pressure</h2>
                  <h3 className="font-semibold flex items-center gap-2">
                    <span>Atmospheric Pressure</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold">{weather?.pressureHpa != null ? `${weather.pressureHpa}` : '1013'} hPa</span>
                    <span className="badge badge-outline">
                      {(() => {
                        const pressure = weather?.pressureHpa || 1013;
                        if (pressure < 1000) return 'Low';
                        if (pressure > 1020) return 'High';
                        return 'Normal';
                      })()}
                    </span>
                  </div>
                  <p className="text-xs opacity-70 mt-2">
                    {(() => {
                      const pressure = weather?.pressureHpa || 1013;
                      if (pressure < 1000) return 'Low pressure often brings unsettled weather.';
                      if (pressure > 1020) return 'High pressure typically means clear, stable weather.';
                      return 'Normal pressure indicates typical weather patterns.';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Fourth Row - Each card has col-span-1 */}
          <section className="bg-transparent section-plate-none">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 auto-rows-fr mb-4">
              {/* Pressure Card */}
              <PressureCard 
                weather={weather}
                pressureTrend={pressureTrend}
                pressure={weather?.pressureHpa || null}
              />
              
              {/* Humidity Card */}
              <HumidityCard 
                weather={weather}
                humidity={humidity}
              />
              
              {/* Sunrise/Sunset Card */}
              <SunriseSunsetCard 
                weather={weather}
              />
            </div>
          </section>

          {/* Marine & Additional Weather Section */}
          <section className="bg-transparent section-plate-none">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 auto-rows-fr mb-4">
              {/* Visibility Card */}
              <VisibilityCard 
                visibilityKm={weather?.visibilityKm || null}
              />
              
              {/* Moon Card */}
              <MoonCard 
                today={weather}
              />
            </div>
          </section>

          {/* Marine Weather Section */}
          <section className="bg-transparent section-plate-none">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 auto-rows-fr mb-4">
              {/* Tides Card */}
              <TidesCard 
                weather={_marineData || weather}
                tideState={{
                  text: _marineData?.tides?.[0] ? `Next ${_marineData.tides[0].type} tide` : "Tide data",
                  icon: null,
                  nextTimeISO: _marineData?.tides?.[0]?.time || null
                }}
              />
              
              {/* Wave Card */}
              <WaveCard 
                waveHeightM={weather?.waveHeightM || null}
                wavePeriodS={weather?.wavePeriodS || null}
                waveDir={weather?.waveDir || null}
                swellHeightM={weather?.swellHeightM || null}
                swellPeriodS={weather?.swellPeriodS || null}
                swellDir={weather?.swellDir || null}
                windSpeedMS={weather?.windSpeedMS || null}
                windDir={weather?.windDeg || null}
                seaTemp={weather?.seaTemp || null}
                lat={weather?.lat}
                lon={weather?.lon}
              />
              
              {/* Hourly Marine Card */}
              <HourlyMarineCard 
                hourlyWithEvents={hourlyWithEvents}
                aqiAssess={aqiAssess}
                pollenAssess={_pollenAssess}
                pollenBadgeClass="badge-info"
                hasMarine={true}
              />
            </div>
          </section>

          {/* Fifth Row - Daily Forecast */}
          <section className="bg-transparent section-plate-none">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 auto-rows-fr mb-4">
              {/* Daily Forecast Card */}
              <div className="xl:col-span-2">
                <DailyForecastCard 
                  daily={weather?.daily || []}
                  maxDays={8}
                />
              </div>
              
              {/* Feels Like card */}
              <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
                <div className="card-body">
                  <h2 className="text-sm opacity-70 mb-2">Feels Like</h2>
                  <div className="stats">
                    <div className="stat">
                      <div className="stat-title">Now</div>
                      <div className="stat-value text-2xl">{feelsNow != null ? `${feelsNow}°` : '—'}</div>
                      <div className="stat-desc">Actual {tempNow != null ? `${tempNow}°` : '—'}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm opacity-80">
                    <p>Factors affecting perceived temperature:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Wind speed: {weather?.windSpeedMS != null ? `${Math.round(weather.windSpeedMS * 3.6)} km/h` : '—'}</li>
                      <li>Humidity: {humidity != null ? `${humidity}%` : '—'}</li>
                      <li>Sun exposure varies perception ±2°</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="footer footer-center p-4 bg-base-200/50 backdrop-blur-md text-base-content">
          <div>
            <p>Recreated Weather Page — {isClient ? new Date().toLocaleDateString() : ''}</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default RecreatedWeatherPage;
