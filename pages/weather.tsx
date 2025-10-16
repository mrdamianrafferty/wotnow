// pages/new-weather.tsx
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { HourlyMarineCard } from "../components/weather-cards/HourlyMarineCard";
import { HourlyCard } from "../components/weather-cards/HourlyCard";
import { SimplePressureCardDial } from "../components/weather-cards/PressureCardDial";
import FeelsLike from "../components/FeelsLike";
import Image from "next/image";
// WeatherAnimationLayer is a default export
import WeatherAnimationLayer from "../components/WeatherAnimationLayer";
import Footer from "../components/footer";
import BottomNav from "../components/BottomNav";
// Statically import critical Row 2 cards to avoid dynamic loading blanks
import { SunriseSunsetCard as ExternalSunriseSunsetCard } from "../components/weather-cards/SunriseSunsetCard";
import { HumidityCard as ExternalHumidityCard } from "../components/weather-cards/HumidityCard";
import { TidesCard as ExternalTidesCard } from "../components/weather-cards/TidesCard";
import { DayMarine } from '../utils/surfScoring';
import { WindCard as ExternalWindCard } from "../components/weather-cards/WindCard";
import { WaveCard as ExternalWaveCard } from "../components/weather-cards/WaveCard";
import { NextFewDaysCard as ExternalNextFewDaysCard } from "../components/weather-cards/NextFewDaysCard";
// Add static imports to ensure reliable rendering (no hydration blanks)
import { UVCard as ExternalUVCard } from "../components/weather-cards/UVCard";
import { AirQualityCard as ExternalAirQualityCard } from "../components/weather-cards/AirQualityCard";
import { PollenCard as ExternalPollenCard } from "../components/weather-cards/PollenCard";
import type { MoonCardProps } from "../components/weather-cards/MoonCard";
// AQI assessment utilities
import { assessAirQualityConditions } from "../utils/airQualityUtils";
// Render header client-side to avoid SSR hydration mismatches with localStorage prefs
const AppHeader = dynamic(() => import('../components/AppHeader'), { ssr: false });
// Render dialogs client-side only (uses Google Places APIs & window)
const CoastalLocationDialog = dynamic(() => import("../components/CoastalLocationDialog"), { ssr: false });
// Precip 24h shows time labels using local time; render client-only to avoid SSR/client time zone mismatches
const ExternalPrecipNext24hCard = dynamic(
  () => import("../components/weather-cards/PrecipNext24hCard").then(m => m.PrecipNext24hCard),
  { ssr: false, loading: () => (
    <div className="card bg-slate-800/35 backdrop-blur-sm text-white border border-white/10 shadow-sm">
      <div className="card-body p-4">
        <h3 className="card__header-title text-sm font-semibold mb-2">Precip next 24 hours</h3>
        <div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div>
      </div>
    </div>
  ) }
);
import {
  WeatherBundle,
  HourlyPoint,
  TideEvent,
  PollenInfo,
  mergeMarineWind,
  MarineHourlyPoint,
  UnifiedWeatherAPIResponse,
  WeatherAnimationCondition,
  HourlyWithEventsItem,
  AirQualityFull,
  SoilSnapshot,
} from "../types/weather";
// NEW: preferences + dialogs
import { useUserPreferences } from "../context/UserPreferencesContext";
// NEW: Visibility card
import { VisibilityCard as ExternalVisibilityCard } from "../components/weather-cards/VisibilityCard";
import SeaTempCard from "../components/weather-cards/SeaTempCard";

/* ---------------- Local prop interfaces for dynamically loaded cards ---------------- */
// These components do not export their prop types, so we define minimal versions here
interface _SunriseSunsetCardProps { weather: { sunriseISO?: string; sunsetISO?: string } }
interface _TidesCardProps { weather: { tides?: TideEvent[] }; tideState: { text: string; icon: string; nextTimeISO: string | null }; tidePhase?: string }
interface _HumidityCardProps { weather: { dewPointC?: number | null }; humidity?: number | null }
// Align SoilCardProps with actual SoilCard expectation
interface SoilCardProps { 
  weather: { 
    soil?: {
      temp0cm?: number;
      temp6cm?: number;
      temp18cm?: number;
      temp54cm?: number;
      moisture0to1?: number;
      moisture1to3?: number;
      moisture3to9?: number;
      moisture9to27?: number;
    };
    tempC?: number;
    humidity?: number;
    main?: { temp?: number; humidity?: number };
  } 
}
interface SurfDayGradeProps { data: DayMarine }

/* ---------------- Dynamic component imports (explicit) ---------------- */
// Removed generic loadComponent() to avoid dynamic import with variable path.
const ExternalMoonCard = dynamic<MoonCardProps>(
  () => import("../components/weather-cards/MoonCard").then(m => m.MoonCard),
  { ssr: true }
);

const ExternalSoilCard = dynamic<SoilCardProps>(
  () => import("../components/weather-cards/SoilCard").then(m => m.SoilCard as React.ComponentType<SoilCardProps>),
  { ssr: true }
);

// NextFewDaysCard is statically imported above; keep explicit dynamic for SurfDayGrade
const ExternalSurfDayGrade = dynamic<SurfDayGradeProps>(
  () => import('../components/weather-cards/SurfDayGrade').then(m => m.default as React.ComponentType<SurfDayGradeProps>),
  { ssr: true }
);

/* ---------------- Weather condition mapping for animations ---------------- */
function mapWeatherToCondition(data: WeatherBundle, isMarine: boolean): WeatherAnimationCondition {
  const description = (data.header?.condition || '').toLowerCase();
  if (description.includes('thunder')) return 'storm';
  if (description.includes('storm')) return 'storm';
  if (description.includes('rain') || description.includes('shower')) return 'rain';
  if (description.includes('drizzle')) return 'drizzle';
  if (description.includes('snow')) return 'snow';
  if (description.includes('fog') || description.includes('mist')) return 'fog';

  const cloudPct = data.cloudCoverPct || 0;
  if (cloudPct >= 85 || description.includes('overcast')) return 'overcast';
  if (cloudPct >= 40 || description.includes('cloudy') || description.includes('cloud')) return 'cloudy';

  // Marine context should not imply rain or clouds by itself.
  // Only escalate to storm when conditions are severe; otherwise respect sky state.
  if (isMarine) {
    const waveHeightM = data.hourly?.[0]?.waveM || data.marineHourly?.[0]?.waveM || 0;
    const windKts = data.hourly?.[0]?.windKts || 0;
    const windSpeedMS = windKts ? windKts / 1.94384 : 0;
    if (windSpeedMS > 15 || waveHeightM > 3) return 'storm';
  }
  return 'clear';
}

/* ---------------- Types reused in this file ---------------- */
type HeaderData = WeatherBundle['header'];
function degToCompass(deg?: number): string {
  if (typeof deg !== 'number') return '—';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const i = Math.round(((deg % 360) / 22.5)) % 16;
  return dirs[i];
}
function formatHM(dateISO?: string): string {
  if (!dateISO) return '—';
  const d = new Date(dateISO);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function seaStateLabel(heightM?: number | null): string {
  const h = typeof heightM === 'number' ? heightM : 0;
  if (h < 0.10) return 'Flat calm';
  if (h < 0.30) return 'Glassy';
  if (h < 0.60) return 'Rippled';
  if (h < 1.00) return 'Slight';
  if (h < 1.50) return 'Moderate';
  if (h < 2.00) return 'Choppy';
  if (h < 3.00) return 'Rough';
  if (h < 4.00) return 'Very rough';
  if (h < 6.00) return 'High seas';
  return 'Stormy seas';
}
function soilConditionLabel(soil?: { moisture0to1?: number; moisture1to3?: number; }): string {
  const m = typeof soil?.moisture0to1 === 'number' ? soil!.moisture0to1
        : (typeof soil?.moisture1to3 === 'number' ? soil!.moisture1to3! : undefined);
  if (typeof m !== 'number') return '—';
  if (m < 0.15) return 'Dry';
  if (m < 0.35) return 'Firm';
  return 'Muddy';
}
function tideSummary(tides?: TideEvent[]) {
  if (!tides?.length) return { trend: '—', until: '—', nextTimeISO: null as string | null, nextType: null as 'HIGH' | 'LOW' | null } as const;
  const now = Date.now();
  const sorted = [...tides].sort((a,b)=>+new Date(a.timeISO)-+new Date(b.timeISO));
  // Find the immediate previous and next extrema relative to now
  let prev: TideEvent | undefined;
  let next: TideEvent | undefined;
  for (const t of sorted) {
    const ts = +new Date(t.timeISO);
    if (ts <= now) prev = t; else { next = t; break; }
  }
  if (!prev) prev = sorted[0];
  if (!next) next = sorted[sorted.length-1];

  let trend: 'Rising'|'Falling' = 'Rising';
  const prevType = String(prev?.type || '').toUpperCase();
  const nextType = String(next?.type || '').toUpperCase();
  if (prevType === 'HIGH' && nextType === 'LOW') trend = 'Falling';
  if (prevType === 'LOW'  && nextType === 'HIGH') trend = 'Rising';

  const until = next?.timeISO ? formatHM(next.timeISO) : '—';
  return { trend, until, nextTimeISO: next?.timeISO ?? null, nextType: (nextType === 'HIGH' || nextType === 'LOW') ? (nextType as 'HIGH'|'LOW') : null } as const;
}

// --- Beaufort & icon helpers for header minis
function beaufortFromMS(ms?: number): number {
  const v = typeof ms === 'number' && isFinite(ms) ? ms : 0;
  // WMO Beaufort thresholds (m/s)
  if (v < 0.3) return 0;
  if (v < 1.6) return 1;
  if (v < 3.4) return 2;
  if (v < 5.5) return 3;
  if (v < 24.5) return 9;
  if (v < 28.5) return 10;
  if (v < 32.7) return 11;
  return 12;
}
function beaufortIconPath(ms?: number): string {
  const b = beaufortFromMS(ms);
  return `/weather-icons/design/fill/final/wind-beaufort-${b}.svg`;
}
function waveIconPath(): string { return `/weather-icons/design/fill/final/wave-moving.svg`; }
function tideIconPath(): string { return `/weather-icons/design/fill/final/tide-high.svg`; }

/* ------------------------------------------------------------ */
/*  Main Page Component */
/* ------------------------------------------------------------ */
export default function WeatherPage() {
  // Remove test toggles; animations auto-enable if device allows
  const [showAnim, setShowAnim] = useState(false);

  // NEW: wire in user preferences for locations
  const { preferences, setPreferences } = useUserPreferences();
  const homeLocation = preferences.locations.find(l => l.type === 'home') || preferences.locations[0] || null;
  const coastalLocation = preferences.locations.find(l => l.type === 'coastal') || null;

  // Dialog state (for picking locations)
  const [openHomeDialog, setOpenHomeDialog] = useState(false);
  const [openCoastDialog, setOpenCoastDialog] = useState(false);

  // Track which location is actively viewed (persist between pages)
  // IMPORTANT: Do not read localStorage during initial render to avoid SSR/client mismatch
  const [activeLocationType, setActiveLocationType] = useState<'home' | 'coastal'>(
    homeLocation ? 'home' : (coastalLocation ? 'coastal' : 'home')
  );
  
  // After mount, sync from localStorage if available (client-only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('activeLocationType');
      if (stored === 'home' || stored === 'coastal') {
        setActiveLocationType(prev => (prev === stored ? prev : stored));
      }
    }
    // run once on mount
  }, []);

  // Keep localStorage updated when the active type changes (client-only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeLocationType', activeLocationType);
    }
  }, [activeLocationType]);

  // Choose active coords based on active selection
  const activeLocation = (activeLocationType === 'coastal' && coastalLocation)
    ? coastalLocation
    : (homeLocation ?? coastalLocation ?? null);
  const activeLat = activeLocation?.lat ?? 51.5074;
  const activeLon = activeLocation?.lon ?? -0.1278;
  const activeIsCoastal = activeLocationType === 'coastal' && !!coastalLocation;

  // Request marine augmentation only for coastal active view
  const [apiError, setApiError] = useState<string | null>(null);
  const data = useWeatherData({ isMarine: activeIsCoastal, lat: activeLat, lon: activeLon, onError: setApiError });
  const effectiveMarine = activeIsCoastal && data.hasMarineData === true;

  // Precompute hourly event series (marine vs land)
  const marineHourlyEvents: HourlyWithEventsItem[] = (data.marineHourly ?? data.hourly).map((hour, i) => {
    const hp = hour as unknown as HourlyPoint;
    const mp = hour as unknown as MarineHourlyPoint;
    const windKts = typeof hp.windKts === 'number' ? hp.windKts : (typeof mp.windKts === 'number' ? mp.windKts : undefined);
    const windGustKts = typeof hp.windGustKts === 'number' ? hp.windGustKts : (typeof mp.windGustKts === 'number' ? mp.windGustKts : undefined);
    const pollenLevel = getHourlyPollenOverall({ bundle: data, timeISO: hour.timeISO });
    const aqiLevel = getHourlyAQIOverall({ bundle: data, timeISO: hour.timeISO });
    return {
      kind: 'hour',
      key: `hour-${i}`,
      hour: {
        label: new Date(hour.timeISO).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        temp: Math.round((hp.tempC ?? mp.tempC ?? 0) as number),
        icon: hp.icon ?? convertWeatherCodeToIcon(hp.weatherCode ?? mp.weatherCode),
        weatherCode: hp.weatherCode ?? mp.weatherCode ?? undefined,
        description: hp.weatherDescription ?? mp.weatherDescription,
        precipMM: hp.precipMm ?? 0,
        windMS: typeof windKts === 'number' ? windKts / 1.94384 : 0,
        wind: typeof windKts === 'number' ? windKts * 1.852 : 0,
        windDeg: hp.windDirection ?? mp.windDirection ?? 0,
        gust: typeof windGustKts === 'number' ? windGustKts * 1.852 : undefined,
        waveHeightM: hp.waveM ?? mp.waveM ?? null,
        wavePeriodS: hp.wavePeriodS ?? mp.wavePeriodS ?? null,
        uvi: hp.uvi ?? (typeof data.uvi === 'number' ? data.uvi : undefined),
        waterTempC: mp.waterTempC ?? null,
        pollenOverall: pollenLevel,
        aqiOverall: aqiLevel,
        // Add original time for downstream day/night decisions
        timeISO: hour.timeISO,
      }
    };
  });

  // Auto-detect animation capability on mount
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } })?.connection?.saveData === true;
    const cores = (navigator as Navigator & { hardwareConcurrency?: number })?.hardwareConcurrency || 8;
    const lowEnd = cores <= 4;
    setShowAnim(!(reduced || saveData || lowEnd));
  }, []);

  const shouldShowAnimations = showAnim;
  const weatherCondition: WeatherAnimationCondition = mapWeatherToCondition(data, effectiveMarine);

  const getAnimationWeather = () => {
    return {
      condition: weatherCondition,
      cloudPct: data.cloudCoverPct || 0,
      waveHeightM: data.hourly?.[0]?.waveM || data.marineHourly?.[0]?.waveM || 0,
      windSpeedMS: data.hourly?.[0]?.windKts ? data.hourly[0].windKts / 1.94384 : 0,
    };
  };

  const aqiValue = data.airQuality?.aqi ?? data.aqi?.aqi;

  // Build a sanitized air quality object for the card (ensures correct shape and non-null numbers)
  const airQFull = (data.airQuality as AirQualityFull | undefined);
  const airQualityForCard = airQFull ? {
    aqi: typeof airQFull.aqi === 'number' ? airQFull.aqi : undefined,
    pm2_5: typeof airQFull.pm2_5 === 'number' ? airQFull.pm2_5 : (typeof airQFull.components?.pm2_5 === 'number' ? airQFull.components.pm2_5 : undefined),
    pm10: typeof airQFull.pm10 === 'number' ? airQFull.pm10 : (typeof airQFull.components?.pm10 === 'number' ? airQFull.components.pm10 : undefined),
    no2: typeof airQFull.no2 === 'number' ? airQFull.no2 : (typeof airQFull.components?.no2 === 'number' ? airQFull.components.no2 : undefined),
    o3: typeof airQFull.o3 === 'number' ? airQFull.o3 : (typeof airQFull.components?.o3 === 'number' ? airQFull.components.o3 : undefined),
    so2: typeof airQFull.so2 === 'number' ? airQFull.so2 : (typeof airQFull.components?.so2 === 'number' ? airQFull.components.so2 : undefined),
    co: typeof airQFull.co === 'number' ? airQFull.co : (typeof airQFull.components?.co === 'number' ? airQFull.components.co : undefined),
    components: {
      pm2_5: typeof airQFull.components?.pm2_5 === 'number' ? airQFull.components.pm2_5 : (typeof airQFull.pm2_5 === 'number' ? airQFull.pm2_5 : undefined),
      pm10: typeof airQFull.components?.pm10 === 'number' ? airQFull.components.pm10 : (typeof airQFull.pm10 === 'number' ? airQFull.pm10 : undefined),
      no2: typeof airQFull.components?.no2 === 'number' ? airQFull.components.no2 : (typeof airQFull.no2 === 'number' ? airQFull.no2 : undefined),
      o3: typeof airQFull.components?.o3 === 'number' ? airQFull.components.o3 : (typeof airQFull.o3 === 'number' ? airQFull.o3 : undefined),
      so2: typeof airQFull.components?.so2 === 'number' ? airQFull.components.so2 : (typeof airQFull.so2 === 'number' ? airQFull.so2 : undefined),
      co: typeof airQFull.components?.co === 'number' ? airQFull.components.co : (typeof airQFull.co === 'number' ? airQFull.co : undefined),
    }
  } : undefined;

  // Compute AQI assessment including individual pollutants
  const aqiAssessment = assessAirQualityConditions({
    overall: typeof aqiValue === 'number' ? aqiValue : undefined,
    pm2_5: airQualityForCard?.pm2_5,
    pm10: airQualityForCard?.pm10,
    no2: airQualityForCard?.no2,
    o3: airQualityForCard?.o3,
    so2: airQualityForCard?.so2,
    co: airQualityForCard?.co,
  });

  // Sanitize soil into the exact shape expected by SoilCard
  const soilForCard = React.useMemo(() => {
    const s = (data.soil ?? {}) as Partial<SoilSnapshot>;
    const hasSnapshotKeys = [
      'temp0cm','temp6cm','temp18cm','temp54cm',
      'moisture0to1','moisture1to3','moisture3to9','moisture9to27'
    ].some(k => typeof (s as Record<string, unknown>)[k] === 'number');
    return {
      temp0cm: hasSnapshotKeys && typeof s.temp0cm === 'number' ? s.temp0cm : undefined,
      temp6cm: hasSnapshotKeys && typeof s.temp6cm === 'number' ? s.temp6cm : undefined,
      temp18cm: hasSnapshotKeys && typeof s.temp18cm === 'number' ? s.temp18cm : undefined,
      temp54cm: hasSnapshotKeys && typeof s.temp54cm === 'number' ? s.temp54cm : undefined,
      moisture0to1: hasSnapshotKeys && typeof s.moisture0to1 === 'number' ? s.moisture0to1 : undefined,
      moisture1to3: hasSnapshotKeys && typeof s.moisture1to3 === 'number' ? s.moisture1to3 : undefined,
      moisture3to9: hasSnapshotKeys && typeof s.moisture3to9 === 'number' ? s.moisture3to9 : undefined,
      moisture9to27: hasSnapshotKeys && typeof s.moisture9to27 === 'number' ? s.moisture9to27 : undefined,
    } as SoilCardProps['weather']['soil'];
  }, [data.soil]);

  // Helpers to map wind points to component expectation
  const mapHourlyToWindPoints = (pts: Array<HourlyPoint | MarineHourlyPoint> | undefined) =>
    (pts ?? []).map(p => ({
      timeISO: p.timeISO,
      windSpeedKts: (p as HourlyPoint).windKts ?? (p as MarineHourlyPoint).windKts,
      windSpeedMS: ((p as HourlyPoint).windKts ?? (p as MarineHourlyPoint).windKts) ? (((p as HourlyPoint).windKts ?? (p as MarineHourlyPoint).windKts) as number) / 1.94384 : (undefined as number | undefined),
      windDirection: (p as HourlyPoint).windDirection ?? (p as MarineHourlyPoint).windDirection,
      windGustKts: (p as HourlyPoint).windGustKts ?? (p as MarineHourlyPoint).windGustKts,
      windGustMS: ((p as HourlyPoint).windGustKts ?? (p as MarineHourlyPoint).windGustKts) ? (((p as HourlyPoint).windGustKts ?? (p as MarineHourlyPoint).windGustKts) as number) / 1.94384 : (undefined as number | undefined),
    }));

  // Derive a numeric pollenIdx for the PollenCard (0..5 scale)
  const pollenIdx = Math.max(
    convertPollenLevel(data.pollen?.tree),
    convertPollenLevel(data.pollen?.grass),
    convertPollenLevel(data.pollen?.weed),
    convertPollenLevel(data.pollen?.olive)
  );

  // Defer location-dependent text until after hydration to avoid SSR/client mismatch
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => { setHasHydrated(true); }, []);
  const safeLocationName = hasHydrated ? activeLocation?.name : undefined;

  // Choose a sensible activity variant for the SeaTemp card in marine mode
  const seaTempActivity = React.useMemo(() => {
    if (!effectiveMarine) return 'sea_swimming' as const;
    const hasSurfSignals = Boolean(
      data.surfScore ||
      (data.marineHourly || []).some(h =>
        (typeof h.swellHeightM === 'number' && h.swellHeightM > 0.6) ||
        (typeof h.waveM === 'number' && h.waveM > 0.6)
      )
    );
    return hasSurfSignals ? 'surfing' : 'sea_swimming';
  }, [effectiveMarine, data.surfScore, data.marineHourly]);

  const firstDaily = data.daily?.[0];
  const moonCardToday = {
    moonPhase: firstDaily?.moonPhase ?? data.moon?.phaseFraction,
    moonriseISO: data.moon?.moonriseISO ?? firstDaily?.moonriseISO,
    moonsetISO: data.moon?.moonsetISO ?? firstDaily?.moonsetISO,
    sunriseISO: data.moon?.sunriseISO ?? data.sunriseISO ?? firstDaily?.sunriseISO,
    sunsetISO: data.moon?.sunsetISO ?? data.sunsetISO ?? firstDaily?.sunsetISO,
    dayLengthMinutes: data.moon?.dayLengthMinutes ?? (typeof data.dayLengthMinutes === 'number'
      ? data.dayLengthMinutes
      : firstDaily?.dayLengthMinutes),
  } satisfies NonNullable<MoonCardProps['today']>;

  return (
    <div
      className="relative min-h-screen"
      data-testid="page-new-weather"
    >
      <div className="relative z-20">
        <AppHeader
          homeLocation={homeLocation || undefined}
          coastalLocation={coastalLocation || undefined}
          onOpenHomeDialog={() => setOpenHomeDialog(true)}
          onOpenCoastDialog={() => setOpenCoastDialog(true)}
          activeLocationType={activeLocationType}
          onToggleLocationType={(next) => setActiveLocationType(next)}
        />
      </div>
      {/* Location dialogs */}
      <CoastalLocationDialog
        open={openHomeDialog}
        title="Set your home location"
        onClose={() => setOpenHomeDialog(false)}
        onSave={(loc) => {
          setPreferences(prev => {
            const others = prev.locations.filter(l => l.type !== 'home');
            return { ...prev, locations: [{ name: loc.name, lat: loc.lat, lon: loc.lon, type: 'home' }, ...others] };
          });
          setActiveLocationType('home');
          setOpenHomeDialog(false);
        }}
        homeLocation={homeLocation || undefined}
      />
      <CoastalLocationDialog
        open={openCoastDialog}
        title="Set your beach location"
        onClose={() => setOpenCoastDialog(false)}
        onSave={(loc) => {
          setPreferences(prev => {
            const others = prev.locations.filter(l => l.type !== 'coastal');
            return { ...prev, locations: [...others, { name: loc.name, lat: loc.lat, lon: loc.lon, type: 'coastal' }] };
          });
          setActiveLocationType('coastal');
          setOpenCoastDialog(false);
        }}
        homeLocation={homeLocation || undefined}
      />

      {/* Background animation */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Gradient fallback (only when animations are disabled) */}
        {!shouldShowAnimations && (
          <div className="absolute inset-0 bg-gradient-to-b from-sky-300/35 via-sky-100/20 to-sky-300/35" aria-hidden />
        )}
        {/* Animation layer */}
        {shouldShowAnimations && (
          <WeatherAnimationLayer
            condition={weatherCondition}
            cloudPct={getAnimationWeather().cloudPct}
            waveHeightM={getAnimationWeather().waveHeightM}
            windSpeedMS={getAnimationWeather().windSpeedMS}
            weather={getAnimationWeather()}
            isMarine={effectiveMarine}
            sunriseISO={data.sunriseISO}
            sunsetISO={data.sunsetISO}
          />
        )}
      </div>

      {/* Foreground UI */}
      <main className="relative z-10 bg-transparent text-base-content min-h-screen overflow-x-hidden">
        <section className="mx-auto w-full max-w-6xl px-4 py-6">
          <HeaderHero
            data={data.header as Omit<HeaderData, 'minis'> & { minis: MiniItem[] }}
            sunriseISO={data.sunriseISO}
            sunsetISO={data.sunsetISO}
            locationName={safeLocationName}
            isLoading={!Array.isArray(data.hourly) || data.hourly.length === 0}
          />
          {apiError && (
            <div className="alert alert-error mt-3 text-sm">
              <div>
                <span className="font-semibold">Weather data error</span>
                <span className="ml-2 opacity-80">{apiError}</span>
              </div>
            </div>
          )}
        </section>

        {/* Rows */}
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 space-y-6">
          {/* Row 1 */}
          <Row>
            {effectiveMarine ? (
              <>
                {marineHourlyEvents.length === 0 ? (
                  <Card title="Hourly">
                    <div className="flex items-center py-2">
                      <span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span>
                      <span className="ml-2 opacity-70">Updating</span>
                    </div>
                  </Card>
                ) : (
                  <div data-testid="card-hourly">
                    <HourlyMarineCard
                      hourlyWithEvents={marineHourlyEvents}
                      aqiAssess={{ overall: data.aqi?.aqi || 1 }}
                      pollenAssess={{ overall: Math.max(convertPollenLevel(data.pollen?.tree), convertPollenLevel(data.pollen?.grass), convertPollenLevel(data.pollen?.weed)) }}
                      pollenBadgeClass="badge-warning"
                      hasMarine={true}
                    />
                  </div>
                )}
                <Safe fallback={<Card title="Wind"><div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div></Card>}>
                  <div data-testid="card-wind">
                    <ExternalWindCard
                      isMarine={true}
                      weather={{ hourly: data.hourly, windSpeedMS: data.marineHourly?.[0]?.windKts ? (data.marineHourly[0].windKts as number) / 1.94384 : (data.hourly?.[0]?.windKts ? data.hourly[0].windKts / 1.94384 : undefined), windDirection: data.marineHourly?.[0]?.windDirection ?? data.hourly?.[0]?.windDirection }}
                      points={mapHourlyToWindPoints(data.marineHourly ?? data.hourly)}
                    />
                  </div>
                </Safe>
                <Safe fallback={<Card title="Waves"><div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div></Card>}>
                  <div data-testid="card-wave">
                    <ExternalWaveCard
                      waveHeightM={data.marineHourly?.[0]?.waveM}
                      wavePeriodS={data.marineHourly?.[0]?.wavePeriodS}
                      waveDir={data.marineHourly?.[0]?.waveDirectionDeg}
                      swellHeightM={data.marineHourly?.[0]?.swellHeightM}
                      swellPeriodS={data.marineHourly?.[0]?.swellPeriodS}
                      swellDir={data.marineHourly?.[0]?.swellDirectionDeg}
                      windSpeedMS={data.marineHourly?.[0]?.windKts ? (data.marineHourly?.[0]?.windKts as number) / 1.94384 : undefined}
                      windDir={data.marineHourly?.[0]?.windDirection}
                      seaTemp={data.seaTemp}
                      currentSpeedMS={data.marineHourly?.[0]?.currentSpeedMS ?? undefined}
                      currentDirectionDeg={data.marineHourly?.[0]?.currentDirectionDeg ?? undefined}
                      waveSeries={(data.marineHourly ?? []).slice(0, 24).map(h => ({ height: typeof h.waveM === 'number' ? h.waveM : null, time: new Date(h.timeISO).toISOString() }))}
                    />
                  </div>
                </Safe>
              </>
            ) : (
              <>
                {data.hourly.length === 0 ? (
                  <Card title="Hourly">
                    <div className="flex items-center py-2">
                      <span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span>
                      <span className="ml-2 opacity-70">Updating</span>
                    </div>
                  </Card>
                ) : (
                  <div data-testid="card-hourly">
                    <HourlyCard
                      hourlyWithEvents={data.hourly.map((hour: HourlyPoint, i: number) => ({
                        kind: 'hour',
                        key: `hour-${i}`,
                        hour: {
                          label: new Date(hour.timeISO).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                          temp: Math.round(hour.tempC || 0),
                          icon: hour.icon ?? convertWeatherCodeToIcon(hour.weatherCode),
                          weatherCode: hour.weatherCode,
                          description: hour.weatherDescription,
                          precipMM: hour.precipMm || 0,
                          windMS: hour.windKts ? hour.windKts / 1.94384 : 0,
                          wind: hour.windKts ? hour.windKts * 1.852 : 0,
                          windDeg: hour.windDirection || 0,
                          gust: hour.windGustKts ? hour.windGustKts * 1.852 : undefined,
                          uvi: typeof hour.uvi === 'number' ? hour.uvi : (typeof data.uvi === 'number' ? data.uvi : undefined),
                          pollenOverall: getHourlyPollenOverall({ bundle: data, timeISO: hour.timeISO }),
                          aqiOverall: getHourlyAQIOverall({ bundle: data, timeISO: hour.timeISO }),
                          timeISO: hour.timeISO,
                        }
                      }))}
                      aqiAssess={{ overall: data.aqi?.aqi || 1 }}
                      pollenAssess={{ overall: Math.max(convertPollenLevel(data.pollen?.tree), convertPollenLevel(data.pollen?.grass), convertPollenLevel(data.pollen?.weed)) }}
                      pollenBadgeClass="badge-warning"
                    />
                  </div>
                )}
                <Safe fallback={<Card title="Wind"><div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div></Card>}>
                  <div data-testid="card-wind"><ExternalWindCard isMarine={false} weather={{ hourly: data.hourly, windSpeedMS: data.hourly?.[0]?.windKts ? data.hourly[0].windKts / 1.94384 : undefined, windDirection: data.hourly?.[0]?.windDirection }} points={mapHourlyToWindPoints(data.hourly)} /></div>
                </Safe>
                <Safe fallback={<Card title="Feels Like"><div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div></Card>}>
                  <div data-testid="card-feels"><FeelsLike tempC={data.header.tempC ?? 0} humidityPct={data.humidityPct ?? 0} wind={typeof data.hourly?.[0]?.windKts === 'number' ? data.hourly[0].windKts / 1.94384 : 0} /></div>
                </Safe>
              </>
            )}
          </Row>

          {/* Row: Precipitation next 24h and Visibility */}
          {(Array.isArray(data.hourly) && data.hourly.length > 0) && (
            <Row>
              <div data-testid="card-precip24">
                <ExternalPrecipNext24hCard
                  title="Precip next 24 hours"
                  hours={(data.hourly || []).map((h) => ({
                    timeISO: h.timeISO,
                    pop: typeof h.pop === 'number' ? h.pop : undefined,
                    precipMm: typeof h.precipMm === 'number' ? h.precipMm : undefined,
                    icon: h.icon ?? convertWeatherCodeToIcon(h.weatherCode),
                    weatherCode: h.weatherCode,
                    weatherDescription: h.weatherDescription,
                  }))}
                />
              </div>
              <div data-testid="card-visibility">
                <ExternalVisibilityCard visibilityKm={typeof data.visibilityKm === 'number' ? data.visibilityKm : null} />
              </div>
            </Row>
          )}

          {/* Row 2 - Next few days + stacked cards */}
          <Row>
            <Safe fallback={<Card title="Next Few Days"><div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div></Card>}>
              <div className="lg:col-span-2" data-testid="card-nextdays">
                <ExternalNextFewDaysCard daily={data.daily} isMarine={!!effectiveMarine} marineHourly={data.marineHourly} tide={data.tide} />
              </div>
            </Safe>
            {effectiveMarine ? (
              <Safe fallback={<Card title="Tides"><div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div></Card>}>
                <div data-testid="card-tides">
                  <ExternalTidesCard weather={{ tides: data.tide }} tideState={{ text: "Tides", icon: "/weather-icons/design/fill/final/tide-high.svg", nextTimeISO: data.tide?.[0]?.timeISO || null }} tidePhase="rising" />
                </div>
              </Safe>
            ) : (
              <>
                <Safe fallback={<Card title="Sunrise & Sunset"><div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div></Card>}>
                  <div data-testid="card-sunrise">
                    <ExternalSunriseSunsetCard weather={{ sunriseISO: data.sunriseISO, sunsetISO: data.sunsetISO }} />
                  </div>
                </Safe>
                <Safe fallback={<Card title="Humidity"><div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div></Card>}>
                  <div data-testid="card-humidity"><ExternalHumidityCard weather={{ dewPointC: data.dewPointC ?? undefined }} humidity={data.humidityPct ?? null} /></div>
                </Safe>
              </>
            )}
          </Row>

          {/* Row 3 */}
          <Row>
            {effectiveMarine ? (
              <>
                <Safe fallback={<Card title="Feels Like"><div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div></Card>}>
                  <div data-testid="card-feelslike">
                    <FeelsLike
                      tempC={data.header.tempC}
                      humidityPct={data.humidityPct ?? 0}
                      wind={
                        typeof data.marineHourly?.[0]?.windKts === 'number' ? (data.marineHourly![0]!.windKts as number) / 1.94384
                        : (typeof data.hourly?.[0]?.windKts === 'number' ? (data.hourly![0]!.windKts as number) / 1.94384 : 0)
                      }
                    />
                  </div>
                </Safe>
                <div data-testid="card-humidity">
                  <ExternalHumidityCard weather={{ dewPointC: data.dewPointC ?? undefined }} humidity={data.humidityPct ?? null} />
                </div>
                <div data-testid="card-sunrise">
                  <ExternalSunriseSunsetCard weather={{ sunriseISO: data.sunriseISO, sunsetISO: data.sunsetISO }} />
                </div>
              </>
            ) : (
              <>
                <div data-testid="card-uv"><ExternalUVCard weather={{ uvi: data.uvi, sunriseISO: data.sunriseISO, sunsetISO: data.sunsetISO }} today={{ uvi: data.uvi }} /></div>
                <div data-testid="card-aqi"><ExternalAirQualityCard weather={{ airQuality: airQualityForCard }} aqiAssess={aqiAssessment} /></div>
                <div data-testid="card-pollen"><ExternalPollenCard 
                  pollenAssess={{ description: getPollenDescription(data.pollen), advice: getPollenAdvice(data.pollen) }}
                  pollenIdx={pollenIdx}
                  pollenToday={{
                    tree_pollen: data.pollen?.tree !== undefined && data.pollen?.tree !== null ? String(data.pollen.tree) : undefined,
                    grass_pollen: data.pollen?.grass !== undefined && data.pollen?.grass !== null ? String(data.pollen.grass) : undefined,
                    weed_pollen: data.pollen?.weed !== undefined && data.pollen?.weed !== null ? String(data.pollen.weed) : undefined,
                    olive_pollen: data.pollen?.olive !== undefined && data.pollen?.olive !== null ? String(data.pollen.olive) : undefined,
                    alder_pollen: data.pollen?.alder_pollen !== undefined && data.pollen?.alder_pollen !== null ? String(data.pollen.alder_pollen) : undefined,
                    birch_pollen: data.pollen?.birch_pollen !== undefined && data.pollen?.birch_pollen !== null ? String(data.pollen.birch_pollen) : undefined,
                    ragweed_pollen: data.pollen?.ragweed_pollen !== undefined && data.pollen?.ragweed_pollen !== null ? String(data.pollen.ragweed_pollen) : undefined,
                    mugwort_pollen: data.pollen?.mugwort_pollen !== undefined && data.pollen?.mugwort_pollen !== null ? String(data.pollen.mugwort_pollen) : undefined,
                  }}
                /></div>
              </>
            )}
          </Row>

          {/* Row 4 - Marine also shows UV | AQI | Pollen */}
          {effectiveMarine && (
            <Row>
              <div data-testid="card-uv"><ExternalUVCard weather={{ uvi: data.uvi, sunriseISO: data.sunriseISO, sunsetISO: data.sunsetISO }} today={{ uvi: data.uvi }} /></div>
              <div data-testid="card-aqi"><ExternalAirQualityCard weather={{ airQuality: airQualityForCard }} aqiAssess={aqiAssessment} /></div>
              <div data-testid="card-pollen"><ExternalPollenCard 
                pollenAssess={{ description: getPollenDescription(data.pollen), advice: getPollenAdvice(data.pollen) }}
                pollenIdx={pollenIdx}
                pollenToday={{
                  tree_pollen: data.pollen?.tree !== undefined && data.pollen?.tree !== null ? String(data.pollen.tree) : undefined,
                  grass_pollen: data.pollen?.grass !== undefined && data.pollen?.grass !== null ? String(data.pollen.grass) : undefined,
                  weed_pollen: data.pollen?.weed !== undefined && data.pollen?.weed !== null ? String(data.pollen.weed) : undefined,
                  olive_pollen: data.pollen?.olive !== undefined && data.pollen?.olive !== null ? String(data.pollen.olive) : undefined,
                  alder_pollen: data.pollen?.alder_pollen !== undefined && data.pollen?.alder_pollen !== null ? String(data.pollen.alder_pollen) : undefined,
                  birch_pollen: data.pollen?.birch_pollen !== undefined && data.pollen?.birch_pollen !== null ? String(data.pollen.birch_pollen) : undefined,
                  ragweed_pollen: data.pollen?.ragweed_pollen !== undefined && data.pollen?.ragweed_pollen !== null ? String(data.pollen.ragweed_pollen) : undefined,
                  mugwort_pollen: data.pollen?.mugwort_pollen !== undefined && data.pollen?.mugwort_pollen !== null ? String(data.pollen.mugwort_pollen) : undefined,
                }}
              /></div>
            </Row>
          )}

          {/* Row 5 */}
          <Row>
            <div data-testid="card-moon">
              <ExternalMoonCard moon={data.moon} today={moonCardToday} />
            </div>
            {effectiveMarine ? (
              <Safe fallback={<Card title="Surf Outlook"><div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div></Card>}>
                {buildSurfDayData(data) ? (
                  <div data-testid="card-surf"><ExternalSurfDayGrade data={buildSurfDayData(data)!} /></div>
                ) : (
                  <Card title="Surf Outlook" subtitle="Insufficient data"><div className="text-sm opacity-70">No marine/tide data</div></Card>
                )}
              </Safe>
            ) : (
              <div data-testid="card-soil"><ExternalSoilCard weather={{ soil: soilForCard, tempC: data.header.tempC, humidity: data.humidityPct ?? undefined }} /></div>
            )}

            {effectiveMarine && (
              <div data-testid="card-sea-temp">
                <SeaTempCard
                  lat={activeLat}
                  lon={activeLon}
                  seaTempProp={typeof data.seaTemp === 'number' ? data.seaTemp : null}
                  locationName={safeLocationName}
                  activity={seaTempActivity}
                  className="weather-card-bg text-base-content"
                />
              </div>
            )}
          </Row>

          {/* Pressure */}
          <Row>
            <Safe fallback={<Card title="Pressure"><div className="flex items-center py-2"><span className="loading loading-ring loading-sm text-secondary" aria-hidden="true"></span><span className="ml-2 opacity-70">Updating</span></div></Card>}>
              <div data-testid="card-pressure"><SimplePressureCardDial weather={data} lat={activeLat} title="Pressure" minHpa={960} maxHpa={1040} showTicks={true} showReferenceHand={true} referenceWindowHours={6} className="" /></div>
            </Safe>
          </Row>
        </div>
      </main>
      {/* Footer */}
      <div className="relative z-10">
        <BottomNav />
        <Footer />
      </div>
    </div>
  );
}

// ---------------- Layout helpers ----------------
function Row({ children }: { children: React.ReactNode }) { return (<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</section>); }
function Card({ title, children, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode; children?: React.ReactNode; }) {
  return (
    <div className="card bg-slate-800/35 backdrop-blur-sm text-white border border-white/10 shadow-sm">
      <div className="card-body">
        <div className="flex items-start justify-between"><h3 className="card-title">{title}</h3>{right}</div>
        {subtitle && <p className="opacity-70">{subtitle}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

// ---------------- Header / Hero ----------------
type MiniItem = { label?: string; value?: string | number; icon?: React.ReactNode; sub?: string };
function HeaderHero({
  data,
  sunriseISO,
  sunsetISO,
  locationName,
  isLoading,
}: {
  data: Omit<HeaderData, 'minis'> & { minis: MiniItem[] };
  sunriseISO?: string;
  sunsetISO?: string;
  locationName?: string;
  isLoading?: boolean;
}) {
  const { condition, tempC, feelsLikeC, highC, lowC, minis } = data;
  // If loading, show prominent DaisyUI loader
  if (isLoading) {
    return (
      <div className="hero rounded-2xl bg-slate-800/25 backdrop-blur-sm text-white border border-white/10 shadow-sm">
        <div className="hero-content w-full flex-col items-stretch py-10 md:py-14">
          <div className="flex items-center gap-3 text-lg">
            <span className="loading loading-spinner text-primary"></span>
<span className="loading loading-spinner text-secondary"></span>
<span className="loading loading-spinner text-accent"></span>
            <span className="opacity-80">Weather gods, what have you got for us mortals?</span>
          </div>
        </div>
      </div>
    );
  }
  const isNightNow = (sr?: string, ss?: string) => {
    const now = Date.now();
    const srT = sr ? new Date(sr).getTime() : NaN;
    const ssT = ss ? new Date(ss).getTime() : NaN;
    if (Number.isFinite(srT) && Number.isFinite(ssT)) {
      // Night before sunrise or after sunset
      return now < srT || now >= ssT;
    }
    return false;
  };
  const inferIconFromCondition = () => {
    const c = (condition || '').toLowerCase();
    const suffix = isNightNow(sunriseISO, sunsetISO) ? 'n' : 'd';
    if (c.includes('thunder')) return `11${suffix}`;
    if (c.includes('snow')) return `13${suffix}`;
    if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return `10${suffix}`;
    if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return `50${suffix}`;
    if (c.includes('scattered') || c.includes('partly')) return `03${suffix}`;
    if (c.includes('broken') || c.includes('overcast')) return `04${suffix}`;
    if (c.includes('cloud')) return `02${suffix}`;
    return `01${suffix}`;
  };
  const iconCode = inferIconFromCondition();
  const iconPath = `/weather-icons/design/fill/final/${iconCode}.svg`;
  return (
    <div className="hero rounded-2xl bg-slate-800/25 backdrop-blur-sm text-white border border-white/10 shadow-sm">
      <div className="hero-content w-full flex-col items-stretch py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="hidden sm:block w-24 h-24 md:w-28 md:h-28 relative">
              <Image src={iconPath} alt={condition} fill className="object-contain drop-shadow" priority />
            </div>
            <div>
              <div className="text-6xl md:text-7xl font-extrabold leading-none flex items-center gap-3"><span>{Math.round(tempC)}°</span></div>
              <div className="text-xl md:text-2xl capitalize">{condition}</div>
              <div className="text-sm opacity-70">Feels like {Math.round(feelsLikeC)}° {highC !== undefined && lowC !== undefined && (<> · High {Math.round(highC)}° · Low {Math.round(lowC)}°</>)}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {locationName && (
              <div className="text-xl md:text-2xl font-medium capitalize text-right mb-2">
                {locationName}
              </div>
            )}
            <div className="flex flex-wrap gap-3 justify-end">
              {minis.map((m, i) => (
                <div
                  key={i}
                  className="rounded-md bg-slate-900/80 text-white border border-white/15 px-3 py-2 min-w-[9.5rem] min-h-[3.0rem] shadow-sm"
                >
                  <div className="grid grid-cols-[40px,1fr] grid-rows-2 gap-x-2 items-center">
                    {m.icon && (
                      <span aria-hidden="true" className="row-span-2 col-start-1 flex items-center justify-center w-12 h-12">
                        {m.icon}
                      </span>
                    )}
                    <span className="col-start-2 text-base font-semibold leading-tight truncate">{m.value ?? '—'}</span>
                    <span className="col-start-2 text-[11px] opacity-80 leading-none truncate">{m.sub ?? ' '}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {isLoading && (
          <div className="mt-4">
            <span className="loading loading-spinner text-primary" aria-hidden="true"></span>
            <span className="ml-2 opacity-70">Communing with the weather gods...</span>
          <span className="loading loading-spinner text-secondary"></span>
<span className="loading loading-spinner text-accent"></span>
          </div>
        )}
      </div>
    </div>
  );
}

// Error boundary wrapper
class ErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { if (process.env.NODE_ENV !== "production") { console.error("[ErrorBoundary Error]", err); } }
  render() { if (this.state.hasError) return <>{this.props.fallback}</>; return <>{this.props.children}</>; }
}
function Safe({ fallback, children }: { fallback: React.ReactNode; children: React.ReactNode }) { return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>; }

// Hook to fetch/transform weather data
function useWeatherData({ isMarine, lat, lon, onError }: { isMarine: boolean; lat: number; lon: number; onError?: (msg: string | null) => void }): WeatherBundle {
   const [weather, setWeather] = useState<unknown>(null);
   const [loading, setLoading] = useState(true);
   useEffect(() => {
     let cancelled = false;
     async function fetchWeather() {
       try {
         setLoading(true);
         const mode = isMarine ? 'marine' : 'basic';
         const response = await fetch(`/api/unified-weather?lat=${lat}&lon=${lon}&mode=${mode}`);
         // Capture diagnostic headers (available even on errors)
         const diag = {
           mode: response.headers.get('X-Mode'),
           source: response.headers.get('X-Weather-Source'),
           hasOwKey: response.headers.get('X-Has-OW-Key'),
           hasSgKey: response.headers.get('X-Has-SG-Key'),
           reason: response.headers.get('X-Error-Reason'),
         } as const;
         if (typeof window !== 'undefined') {
           // Helpful for production debugging via browser DevTools
           console.debug('[UnifiedWeather diagnostics]', diag);
         }
         if (!response.ok) {
           let msg = `HTTP ${response.status} ${response.statusText}`;
           let text: string | null = null;
           try { text = await response.text(); } catch { text = null; }
           if (text) {
             try {
               const j = JSON.parse(text);
               const err = (j && typeof j === 'object' && 'error' in j) ? (j as { error?: unknown }).error : undefined;
               msg = typeof err === 'string' ? `${msg}: ${err}` : `${msg}: ${text.slice(0, 500)}`;
             } catch {
               msg = `${msg}: ${text.slice(0, 500)}`;
             }
           }
           // Append server diagnostics to error message
           const parts: string[] = [];
           if (diag.reason) parts.push(`reason=${diag.reason}`);
           if (diag.mode) parts.push(`mode=${diag.mode}`);
           if (diag.source) parts.push(`source=${diag.source}`);
           if (diag.hasOwKey) parts.push(`owKey=${diag.hasOwKey}`);
           if (diag.hasSgKey) parts.push(`sgKey=${diag.hasSgKey}`);
           if (parts.length) msg += `[${parts.join(', ')}]`;
           throw new Error(msg);
         }
         const data = await response.json();
         if (!cancelled) {
           setWeather(data);
           onError?.(null);
         }
       } catch (error) {
         console.error('Weather fetch failed:', error);
         const msg = error instanceof Error ? error.message : String(error);
         if (!cancelled) {
           onError?.(msg);
           setWeather(null);
         }
       } finally {
         if (!cancelled) setLoading(false);
       }
     }
     fetchWeather();
     const interval = setInterval(fetchWeather, 10 * 60 * 1000);
     return () => {
       cancelled = true;
       clearInterval(interval);
     };
   }, [lat, lon, isMarine, onError]);

   if (loading || !weather) {
     return { header: { condition: "Loading...", tempC: 0, feelsLikeC: 0, minis: [] }, hourly: [], daily: [] } as unknown as WeatherBundle;
   }

   const w = weather as UnifiedWeatherAPIResponse;
   // Normalize tides for header mini helpers
   const tidesForMini: TideEvent[] | undefined = w.tides ? w.tides.map((t) => ({ timeISO: t.time, type: String(t.type).toUpperCase() === 'LOW' ? 'LOW' : 'HIGH', heightM: t.height })) : undefined;

   const bundle: WeatherBundle = {
   header: {
      condition: w.description || "Clear",
      tempC: w.temperatureC || 0,
      feelsLikeC: w.feelsLikeC || 0,
      highC: w.daily?.[0]?.maxC,
      lowC: w.daily?.[0]?.minC,
      minis: (((isMarine && w.hasMarineData) ? [
        {
          // Wind: Beaufort icon + kts + compass
          label: undefined as unknown as string,
          icon: (
            <Image src={beaufortIconPath(w.windSpeedMS)} alt="Wind (Beaufort)" width={60} height={60} className="opacity-90" />
          ),
          value: (typeof w.windSpeedMS === 'number') ? `${Math.round(w.windSpeedMS * 1.94384)} kt` : '–',
          sub: degToCompass(w.daily?.[0]?.windDeg ?? w.hourly?.[0]?.windDeg),
        },
        {
          // Waves: wave icon + height/period (no sea temperature here)
          label: undefined as unknown as string,
          icon: (
            <Image src={waveIconPath()} alt="Waves" width={30} height={30} className="opacity-90" />
          ),
          value: (() => {
            const h = w.marineHourly?.[0]?.waveHeightM ?? w.marineHourly?.[0]?.swellHeightM ?? undefined;
            const p = w.marineHourly?.[0]?.wavePeriodS ?? w.marineHourly?.[0]?.swellPeriodS ?? undefined;
            if (typeof h === 'number') {
              return `${h.toFixed(1)} m${typeof p === 'number' ? ` (${Math.round(p)}s)` : ''}`;
            }
            return '–';
          })(),
          sub: seaStateLabel(w.marineHourly?.[0]?.waveHeightM ?? w.marineHourly?.[0]?.swellHeightM ?? null),
        },
        {
          // Tide: inline icon + trend / next change time
          label: undefined as unknown as string,
          icon: (
            <Image src={tideIconPath()} alt="Tide" width={60} height={60} className="opacity-90" />
          ),
          value: (() => { const t = tideSummary(tidesForMini); return t.trend; })(),
          sub: (() => { const t = tideSummary(tidesForMini); return t.nextTimeISO ? `until ${formatHM(t.nextTimeISO)}` : 'until —'; })(),
        },
      ] : [
        {
          // Wind from DAILY (OpenWeather-backed) with compass
          label: 'Wind',
          icon: (
            <Image src={beaufortIconPath(w.windSpeedMS ?? w.daily?.[0]?.windMS)} alt="Wind (Beaufort)" width={60} height={60} className="opacity-90" />
          ),
          value: (() => {
            const ms = w.daily?.[0]?.windMS ?? w.windSpeedMS;
            return typeof ms === 'number' ? `${Math.round(ms * 3.6)} km/h` : '–';
          })(),
          sub: (() => {
            const deg = w.daily?.[0]?.windDeg ?? w.hourly?.[0]?.windDeg;
            return degToCompass(deg);
          })(),
        },
        {
          // Rain: prefer DAILY precip (mm); fallback to DAILY POP %, then HOURLY POP %
          label: 'Rain',
          icon: (
            <Image src="/weather-icons/design/fill/final/raindrop.svg" alt="Rain" width={60} height={60} className="opacity-90" />
          ),
          value: (() => {
            const mm = w.daily?.[0]?.precipMM;
            if (typeof mm === 'number') return `${Math.round(mm)} mm`;
            const popDaily = w.daily?.[0]?.pop;
            if (typeof popDaily === 'number') return `${Math.round(popDaily * 100)}%`;
            const popHr = w.hourly?.[0]?.pop;
            return typeof popHr === 'number' ? `${Math.round(popHr * 100)}%` : '–';
          })(),
          sub: (() => {
            const pop = w.daily?.[0]?.pop ?? w.hourly?.[0]?.pop;
            return typeof pop === 'number' ? `${Math.round(pop * 100)}%` : undefined;
          })(),
        },
        {
          // Ground: condition from Open‑Meteo surface soil moisture; sub shows % moisture
          label: 'Ground',
          icon: (
            <span role="img" aria-label="Ground" className="text-[20px] leading-none">🥾</span>
          ),
          value: (() => {
            const base = soilConditionLabel(w.soil);
            return base !== '—' ? `${base} ground` : base;
          })(),
          sub: (() => {
            const m = w.soil?.moisture0to1;
            return typeof m === 'number' ? `${Math.round(m * 100)}%` : undefined;
          })(),
        },
      ])) as MiniItem[],

    },
    hourly: (w.hourly || []).map((hour): HourlyPoint => ({
      timeISO: hour.timeISO,
      tempC: hour.tempC,
      precipMm: hour.precipMM,
      pop: hour.pop,
      windKts: hour.windMS ? hour.windMS * 1.94384 : undefined,
      windDirection: hour.windDeg,
      waveM: hour.waveHeightM,
      wavePeriodS: hour.wavePeriodS,
      weatherCode: hour.weatherCode,
      weatherDescription: hour.weatherDescription,
      icon: hour.icon,
      uvi: typeof hour.uvi === 'number' ? hour.uvi : undefined,
     })) || [],
    daily: (w.daily || []).map((day) => ({
      dateISO: day.dateISO,
      minC: day.minC,
      maxC: day.maxC,
      pop: day.pop,
      icon: day.icon,
      precipMM: typeof day.precipMM === 'number' ? day.precipMM : undefined,
      summary: day.summary,
      windMS: day.windMS,
      windDeg: day.windDeg,
      uvi: day.uvi,
      moonPhase: day.moonPhase,
      moonriseISO: day.moonriseISO,
      moonsetISO: day.moonsetISO,
    })) || [],
    visibilityKm: w.visibilityKm,
    pressureHpa: w.pressureHpa,
    pressureTrend: w.pressureTrend || "steady",
    humidityPct: w.humidityPct || w.humidity,
    sunriseISO: w.sunriseISO,
    sunsetISO: w.sunsetISO,
    uvi: w.uvi,
    aqi: w.airQuality ? { aqi: w.airQuality.aqi ?? undefined, pm25: w.airQuality.components?.pm2_5 ?? undefined, pm10: w.airQuality.components?.pm10 ?? undefined, source: "OpenWeather" } : undefined,
    airQuality: w.airQuality,
    pollen: w.pollen ? { tree: w.pollen.tree, grass: w.pollen.grass, weed: w.pollen.weed, olive: w.pollen.olive, alder_pollen: w.pollen.alder_pollen, birch_pollen: w.pollen.birch_pollen, ragweed_pollen: w.pollen.ragweed_pollen, mugwort_pollen: w.pollen.mugwort_pollen, source: "Open-Meteo" } : undefined,
    // expose hourly pollen series for per-hour icon rendering
    pollenHourly: w.pollenHourly,
    // expose hourly AQI series for per-hour icon rendering
    aqiHourly: w.aqiHourly,
    cloudCoverPct: w.cloudCoverPct,
    cloudBaseM: w.cloudBaseM,
    moon: w.moon,
    soil: w.soil,
    marineHourly: isMarine ? mergeMarineWind(
      (w.hourly || []).map((hour): HourlyPoint => ({
        timeISO: hour.timeISO,
        tempC: hour.tempC,
        pop: hour.pop,
        windKts: hour.windMS ? hour.windMS * 1.94384 : undefined,
        windDirection: hour.windDeg,
        windGustKts: (hour as { windGustMS?: number }).windGustMS ? (hour as { windGustMS?: number }).windGustMS! * 1.94384 : undefined,
        waveM: hour.waveHeightM,
        wavePeriodS: hour.wavePeriodS,
        weatherCode: hour.weatherCode,
        weatherDescription: hour.weatherDescription,
        icon: hour.icon,
      })),
      (w.marineHourly || []).map((h): MarineHourlyPoint => ({
        timeISO: h.timeISO,
        waveM: h.waveHeightM ?? null,
        wavePeriodS: h.wavePeriodS ?? null,
        waveDirectionDeg: h.waveDirectionDeg ?? null,
        waterTempC: h.waterTempC ?? null,
        swellHeightM: h.swellHeightM ?? null,
        swellPeriodS: h.swellPeriodS ?? null,
        swellDirectionDeg: h.swellDirectionDeg ?? null,
        currentSpeedMS: h.currentSpeedMS ?? null,
        currentDirectionDeg: h.currentDirectionDeg ?? null,
        tempC: undefined,
        weatherCode: undefined,
        weatherDescription: undefined,
      }))
    ) : undefined,
    tide: w.tides ? w.tides.map((t) => ({ timeISO: t.time, type: String(t.type).toUpperCase() === 'LOW' ? 'LOW' : 'HIGH', heightM: t.height })) : undefined,
    surfScore: w.surfScore,
    seaTemp: w.seaTemp ?? (w.marineHourly?.find((m) => typeof m?.waterTempC === 'number')?.waterTempC ?? null),
    dewPointC: w.dewPointC,
    hasMarineData: w.hasMarineData === true
  } as WeatherBundle;
  return bundle;
}

// ---------------- Helper functions (AQI/Pollen etc.) ----------------
function _getAQIDescription(aqi?: number): string { if (!aqi) return "Unknown"; if (aqi <= 50) return "Good air quality"; if (aqi <= 100) return "Moderate air quality"; if (aqi <= 150) return "Unhealthy for sensitive groups"; if (aqi <= 200) return "Unhealthy"; if (aqi <= 300) return "Very unhealthy"; return "Hazardous"; }
function _getAQIAdvice(aqi?: number): string { if (!aqi) return "Unable to determine air quality"; if (aqi <= 50) return "Enjoy outdoor activities"; if (aqi <= 100) return "Consider reducing prolonged outdoor activities"; if (aqi <= 150) return "Limit outdoor activities, especially for sensitive groups"; if (aqi <= 200) return "Avoid outdoor activities"; if (aqi <= 300) return "Stay indoors"; return "Emergency conditions - stay indoors"; }
function getPollenDescription(pollen?: PollenInfo): string {
  if (!pollen) return "No pollen data available";
  const levels = [ { name: 'tree', value: pollen.tree }, { name: 'grass', value: pollen.grass }, { name: 'weed', value: pollen.weed } ].filter(item => item.value !== undefined && item.value !== null);
  if (levels.length === 0) return "No pollen data";
  const maxLevel = Math.max(...levels.map(l => convertPollenLevel(l.value)));
  if (maxLevel <= 1) return `Very low pollen levels - minimal allergy risk`;
  if (maxLevel === 2) return `Low pollen levels - slight risk for sensitive individuals`;
  if (maxLevel === 3) return `Moderate pollen levels - noticeable for allergy sufferers`;
  if (maxLevel === 4) return `High pollen levels - significant allergy risk`;
  return `Very high pollen levels - severe allergy risk`;
}
function getPollenAdvice(pollen?: PollenInfo): string {
  if (!pollen) return "Monitor local pollen reports";
  const maxLevel = Math.max(convertPollenLevel(pollen.tree), convertPollenLevel(pollen.grass), convertPollenLevel(pollen.weed));
  if (maxLevel <= 1) return "Perfect conditions for outdoor activities. Minimal allergy symptoms expected.";
  if (maxLevel === 2) return "Generally safe outdoors. Sensitive individuals may experience mild symptoms.";
  if (maxLevel === 3) return "Moderate risk - consider antihistamines if you're allergy-prone.";
  if (maxLevel === 4) return "High pollen alert - limit outdoor time, keep windows closed.";
  return "Extreme pollen levels - stay indoors if possible, take allergy medication.";
}
function convertPollenLevel(level?: string | number): number {
  if (!level && level !== 0) return 0;
  if (typeof level === 'number') { if (level <= 0.5) return 1; if (level <= 1.0) return 2; if (level <= 2.0) return 3; if (level <= 4.0) return 4; return 5; }
  const lower = String(level).toLowerCase(); if (lower.includes('low')) return 1; if (lower.includes('moderate')) return 2; if (lower.includes('high')) return 4; if (lower.includes('very high')) return 5; return 0;
}
function convertWeatherCodeToIcon(weatherCode?: number): string {
  if (!weatherCode) return '01d';
  if (weatherCode >= 200 && weatherCode < 300) return '11d';
  if (weatherCode >= 300 && weatherCode < 400) return '09d';
  if (weatherCode >= 500 && weatherCode < 600) return '10d';
  if (weatherCode >= 600 && weatherCode < 700) return '13d';
  if (weatherCode >= 700 && weatherCode < 800) return '50d';
  if (weatherCode === 800) return '01d';
  if (weatherCode === 801) return '02d';
  if (weatherCode === 802) return '03d';
  if (weatherCode >= 803) return '04d';
  return '01d';
}
function buildSurfDayData(bundle: WeatherBundle) {
  if (!bundle.marineHourly || !bundle.marineHourly.length) return null;

  const tideEvents = bundle.tide || [];
  const tideHeights = tideEvents.filter(t => typeof t.heightM === 'number').map(t => t.heightM as number);
  const minTide = tideHeights.length ? Math.min(...tideHeights) : 0;
  const maxTide = tideHeights.length ? Math.max(...tideHeights) : 4;
  const tideRange = (maxTide - minTide) || 4;

  const tideProfile = {
    minM: minTide + tideRange * 0.15,
    maxM: maxTide - tideRange * 0.15,
    nearTurnBonusMin: 45,
    nearTurnBonusWeight: 0.15,
    springRangeM: 5,
    name: 'Local Spot'
  };

  const sortedEvents = tideEvents.slice().sort((a, b) => new Date(a.timeISO).getTime() - new Date(b.timeISO).getTime());

  function tideContext(tsISO: string) {
    if (!sortedEvents.length) {
      const fallbackHeight = (minTide + maxTide) / 2;
      return { tideHeightM: fallbackHeight, tideRangeM: tideRange };
    }
    const ts = new Date(tsISO).getTime();
    let prev: TideEvent | undefined;
    let next: TideEvent | undefined;
    for (const ev of sortedEvents) {
      const t = new Date(ev.timeISO).getTime();
      if (t <= ts) prev = ev; else { next = ev; break; }
    }

    const heightPrev = typeof prev?.heightM === 'number' ? (prev!.heightM as number) : undefined;
    const heightNext = typeof next?.heightM === 'number' ? (next!.heightM as number) : undefined;

    let tideHeightM: number;
    if (heightPrev !== undefined && heightNext !== undefined && prev && next) {
      const t0 = new Date(prev.timeISO).getTime();
      const t1 = new Date(next.timeISO).getTime();
      const r = t1 > t0 ? (ts - t0) / (t1 - t0) : 0;
      tideHeightM = heightPrev + r * (heightNext - heightPrev);
    } else if (heightPrev !== undefined) {
      tideHeightM = heightPrev;
    } else if (heightNext !== undefined) {
      tideHeightM = heightNext;
    } else {
      tideHeightM = (minTide + maxTide) / 2;
    }



    let stage: 'flood' | 'ebb' | 'slack' | undefined;
    if (prev && next) {
      if (prev.type === 'LOW' && next.type === 'HIGH') stage = 'flood';
      else if (prev.type === 'HIGH' && next.type === 'LOW') stage = 'ebb';
    }

    const nextMin = next ? Math.round((new Date(next.timeISO).getTime() - ts) / 60000) : undefined;
    const prevMin = prev ? Math.round((ts - new Date(prev.timeISO).getTime()) / 60000) : undefined;
    // Consider slack within ±20 minutes of a turning point
    const nearTurn = Math.min(
      typeof nextMin === 'number' ? Math.abs(nextMin) : Infinity,
      typeof prevMin === 'number' ? Math.abs(prevMin) : Infinity
    );
    if (nearTurn <= 20) stage = 'slack';

    return { tideHeightM, tideRangeM: tideRange, stage, minutesToTurn: nextMin };
  }

  const hours = bundle.marineHourly.map((m) => {
    // Find nearest terrestrial hourly for any missing wind data

    let nearest: HourlyPoint | undefined;
    let bestDiff = Infinity;
    for (const h of bundle.hourly || []) {
      const d = Math.abs(new Date(h.timeISO).getTime() - new Date(m.timeISO).getTime());
      if (d < bestDiff) { bestDiff = d; nearest = h; }
    }

    const windKt = typeof m.windKts === 'number' ? m.windKts
      : typeof nearest?.windKts === 'number' ? nearest!.windKts!
      : 0;
    const windDir = typeof m.windDirection === 'number' ? m.windDirection
      : typeof nearest?.windDirection === 'number' ? nearest!.windDirection!
      : 0;

    const primaryHeight = (typeof m.swellHeightM === 'number' ? m.swellHeightM
      : typeof m.waveM === 'number' ? m.waveM : 0) as number;
    const primaryPeriod = (typeof m.swellPeriodS === 'number' ? m.swellPeriodS
      : typeof m.wavePeriodS === 'number' ? m.wavePeriodS : 8) as number;
    const primaryDir = (typeof m.swellDirectionDeg === 'number' ? m.swellDirectionDeg
      : typeof m.waveDirectionDeg === 'number' ? m.waveDirectionDeg : 0) as number;

    return {
      ts: m.timeISO,
      wind: { speedKt: Math.max(0, Math.round(windKt * 10) / 10), directionDeg: windDir },
      primary: { heightM: Math.max(0, primaryHeight), periodS: primaryPeriod, directionDeg: primaryDir },
      tide: tideContext(m.timeISO),
    };
  });

  return { beachFacingDeg: null, skill: 'intermediate' as const, tideProfile, hours };
}

// Compute per-hour pollen overall level (1..4/5) using bundle.pollenHourly at the closest time to timeISO
function getHourlyPollenOverall({ bundle, timeISO }: { bundle: WeatherBundle; timeISO: string }): number | undefined {
  const H = bundle.pollenHourly;
  if (!H || !Array.isArray(H.time) || H.time.length === 0) return undefined;
  // Find closest index within 90 minutes
  const target = new Date(timeISO).getTime();
  let bestIdx = -1; let bestDiff = Infinity;
  for (let i = 0; i < H.time.length; i++) {
    const t = new Date(H.time[i]!).getTime();
    const d = Math.abs(t - target);
    if (d < bestDiff) { bestDiff = d; bestIdx = i; }
  }
  if (bestIdx < 0 || bestDiff > 90 * 60 * 1000) return undefined;
  const pick = (arr?: number[]) => (Array.isArray(arr) && typeof arr[bestIdx] === 'number') ? arr[bestIdx]! : undefined;
  const grass = pick(H.grass_pollen);
   const alder = pick(H.alder_pollen);
  const birch = pick(H.birch_pollen);
  const ragweed = pick(H.ragweed_pollen);
  const mugwort = pick(H.mugwort_pollen);
  const olive = pick(H.olive_pollen);
  // Derive categories similar to daily aggregation
  const treeVal = Math.max(
    typeof alder === 'number' ? alder : -Infinity,
    typeof birch === 'number' ? birch : -Infinity,
  );
  const weedVal = Math.max(
    typeof ragweed === 'number' ? ragweed : -Infinity,
    typeof mugwort === 'number' ? mugwort : -Infinity,
  );
  const levels: number[] = [];
  if (typeof grass === 'number') levels.push(convertPollenLevel(grass));
  if (Number.isFinite(treeVal)) levels.push(convertPollenLevel(treeVal));
  if (Number.isFinite(weedVal)) levels.push(convertPollenLevel(weedVal));
  if (typeof olive === 'number') levels.push(convertPollenLevel(olive));
  if (!levels.length) return undefined;
  const max = Math.max(...levels);
  // Cap at 4 for icon set (1..4), keep >=1
  return Math.max(1, Math.min(4, max));
}

// Compute per-hour AQI overall level (1..6) using bundle.aqiHourly at the closest time to timeISO
function getHourlyAQIOverall({ bundle, timeISO }: { bundle: WeatherBundle; timeISO: string }): number | undefined {
  const H = bundle.aqiHourly;
  if (!H || !Array.isArray(H.time) || H.time.length === 0) return undefined;
  const target = new Date(timeISO).getTime();
  let bestIdx = -1; let bestDiff = Infinity;
  for (let i = 0; i < H.time.length; i++) {
    const t = new Date(H.time[i]!).getTime();
    const d = Math.abs(t - target);
    if (d < bestDiff) { bestDiff = d; bestIdx = i; }
  }
  if (bestIdx < 0 || bestDiff > 90 * 60 * 1000) return undefined;
  const pick = (arr?: number[]) => (Array.isArray(arr) && typeof arr[bestIdx] === 'number') ? arr[bestIdx]! : undefined;
  // Prefer categorical AQI if provided
  let cat = pick(H.us_aqi);
  if (typeof cat !== 'number') cat = pick(H.european_aqi);
  if (typeof cat === 'number') {
    const v = Math.round(cat);
    if (v >= 1 && v <= 6) return v;
    // If value looks like absolute AQI (0..500), map to 1..6 buckets
    if (v >= 0) {
      if (v <= 50) return 1;
      if (v <= 100) return 2;
      if (v <= 150) return 3;
      if (v <= 200) return 4;
      if (v <= 300) return 5;
      return 6;
    }
  }
  // Try deriving from pollutants if categories missing
  const pm25 = pick(H.pm2_5);
  const pm10 = pick(H.pm10);
  const no2 = pick(H.nitrogen_dioxide);
  const o3 = pick(H.ozone);
  const so2 = pick(H.sulphur_dioxide);
  const co = pick(H.carbon_monoxide);
  const levels: number[] = [];
  const mapUS = (x?: number) => {
    if (typeof x !== 'number') return undefined;
    if (x <= 12) return 1; // PM2.5 ug/m3 ~ AQI 50
    if (x <= 35.4) return 2;
    if (x <= 55.4) return 3;
    if (x <= 150.4) return 4;
    if (x <= 250.4) return 5;
    return 6;
  };
  const push = (v?: number) => { if (typeof v === 'number') levels.push(v); };
  push(mapUS(pm25));
  push(mapUS(pm10));
  // Fallback simple thresholds for gases (heuristic)
  const gasMap = (x?: number) => {
    if (typeof x !== 'number') return undefined;
    if (x <= 50) return 1;
    if (x <= 100) return 2;
    if (x <= 150) return 3;
    if (x <= 200) return 4;
    if (x <= 300) return 5;
    return 6;
  };
  const pushG = (v?: number) => { if (typeof v === 'number') levels.push(v); };
  pushG(gasMap(no2));
  pushG(gasMap(o3));
  pushG(gasMap(so2));
  pushG(gasMap(co));
  if (!levels.length) return undefined;
  return Math.max(1, Math.min(6, Math.max(...levels)));
}
