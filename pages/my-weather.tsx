// pages/my-weather.tsx
// Land-focused Apple-style weather layout using live unified data + smart phrasing
// Marine-specific cards are omitted. Layout can be refined later.

import * as React from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import Image from 'next/image';
import Link from 'next/link';
import { useUserPreferences } from '../context/UserPreferencesContext';
import CoastalLocationDialog from '../components/CoastalLocationDialog';

import { getWindMessage, getRainfallDescription, getTemperatureDescription, getHumidityDescription, getVisibilityDescription, visibilityPercentLand } from '../utils/weatherLabels';
import { assessAirQualityConditions, getAirQualityIndex, getAirQualityLevelDescription, AirQualityLevel } from '../utils/airQualityUtils';
import { assessPollenConditions, getPollenIndex, getPollenLevelDescription, type PollenSummary, PollenLevel } from '../utils/pollenUtils';

const WeatherAnimationLayer = dynamic(() => import('../components/WeatherAnimationLayer').then(m => m.default), { ssr: false });

// Types aligned with pages/api/unified-weather.ts
type Hour = {
  timeISO: string
  tempC?: number
  pop?: number // 0..1
  windMS?: number
  windDeg?: number
  precipMM?: number
  icon?: string
  pressureHpa?: number
  waveHeightM?: number | null
}

type Day = {
  dateISO: string
  minC?: number
  maxC?: number
  pop?: number
  summary?: string
  icon?: string
  windMS?: number
  windDeg?: number
  pressureHpa?: number
  uvi?: number
  moonriseISO?: string
  moonsetISO?: string
  moonPhase?: number
  pollen?: PollenSummary
}

type UnifiedWeather = {
  name?: string
  lat: number
  lon: number
  isMarine?: boolean
  temperatureC?: number
  feelsLikeC?: number
  dewPointC?: number
  humidityPct?: number
  pressureHpa?: number
  windSpeedMS?: number
  windGustMS?: number
  windDeg?: number
  visibilityKm?: number
  uvi?: number
  cloudsPct?: number
  description?: string
  icon?: string
  sunriseISO?: string
  sunsetISO?: string
  hourly?: Hour[]
  daily?: Day[]
  airQuality?: { aqi?: number | null; components?: Record<string, number | null> }
  tides?: { time: string; type: 'high' | 'low'; height: number | null }[]
}

// Helpers
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
  // OpenWeather: 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
  if (phase == null) return '/weather-icons/design/fill/final/moon-full.svg'; // Use full moon as fallback
  if (phase < 0.06 || phase > 0.94) return '/weather-icons/design/fill/final/moon-new.svg';
  if (phase < 0.19) return '/weather-icons/design/fill/final/moon-waxing-crescent.svg';
  if (phase < 0.31) return '/weather-icons/design/fill/final/moon-first-quarter.svg';
  if (phase < 0.44) return '/weather-icons/design/fill/final/moon-waxing-gibbous.svg';
  if (phase < 0.56) return '/weather-icons/design/fill/final/moon-full.svg';
  if (phase < 0.69) return '/weather-icons/design/fill/final/moon-waning-gibbous.svg';
  if (phase < 0.81) return '/weather-icons/design/fill/final/moon-last-quarter.svg';
  return '/weather-icons/design/fill/final/moon-waning-crescent.svg';
}

function conditionToAnim(weather?: UnifiedWeather): { condition: string; cloudPct?: number; windMS?: number } {
  const desc = (weather?.description || '').toLowerCase();
  let condition: string = 'clear';
  if (desc.includes('snow') || desc.includes('sleet')) condition = 'snow';
  else if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower')) condition = 'rain';
  else if (desc.includes('fog') || desc.includes('mist') || (weather?.visibilityKm && weather.visibilityKm < 5)) condition = 'fog';
  else if (desc.includes('cloud') || (weather?.cloudsPct && weather.cloudsPct > 25)) condition = 'cloudy';
  return { condition, cloudPct: weather?.cloudsPct, windMS: weather?.windSpeedMS };
}

function useUnifiedWeather(lat = 51.5074, lon = -0.1278) { // Default London; user can change later
  const { data, error, isLoading } = useSWR<UnifiedWeather>(`/api/unified-weather?lat=${lat}&lon=${lon}&mode=land`, fetcher, { revalidateOnFocus: false, refreshInterval: 10 * 60 * 1000 });
  return { weather: data, loading: isLoading, error };
}

export default function MyWeather() {
  // Pull home/coastal location from user preferences; fall back to defaults
  const { preferences, setPreferences } = useUserPreferences?.() || { preferences: { locations: [] as any[] }, setPreferences: (_: any) => {} } as any;
  const home = (preferences as any)?.locations?.find((l: any) => l.type === 'home') || (preferences as any)?.locations?.[0];
  const coastal = (preferences as any)?.locations?.find((l: any) => l.type === 'coastal');
  const defaultType: 'home' | 'coastal' = home ? 'home' : (coastal ? 'coastal' : 'home');
  const [activeType, setActiveType] = React.useState<'home' | 'coastal'>(defaultType);
  const activeLoc = activeType === 'coastal' && coastal ? coastal : home;
  const lat = typeof activeLoc?.lat === 'number' ? activeLoc.lat : undefined;
  const lon = typeof activeLoc?.lon === 'number' ? activeLoc.lon : undefined;
  const { weather, loading, error } = useUnifiedWeather(lat, lon);

  // Hydration-safety: render stable labels on server, switch to dynamic after mount
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Banner/dialog/menu state
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [showHomeDialog, setShowHomeDialog] = React.useState(false);
  const [showCoastDialog, setShowCoastDialog] = React.useState(false);

  // Helpers to update saved locations
  const setHomeLocation = (loc: { name: string; lat: number; lon: number }) => {
    if (!setPreferences) return;
    setPreferences((prev: any) => {
      const list = Array.isArray(prev.locations) ? prev.locations.slice() : [];
      const i = list.findIndex((l: any) => l.type === 'home');
      if (i >= 0) list[i] = { ...list[i], ...loc, type: 'home' };
      else list.push({ ...loc, type: 'home' });
      return { ...prev, locations: list };
    });
  };

  const setCoastalLocation = (loc: { name: string; lat: number; lon: number }) => {
    if (!setPreferences) return;
    setPreferences((prev: any) => {
      const list = Array.isArray(prev.locations) ? prev.locations.slice() : [];
      const i = list.findIndex((l: any) => l.type === 'coastal');
      if (i >= 0) list[i] = { ...list[i], ...loc, type: 'coastal' };
      else list.push({ ...loc, type: 'coastal' });
      return { ...prev, locations: list };
    });
  };

  const anim = React.useMemo(() => conditionToAnim(weather), [weather]);

  // Derived bits
  const temp = Math.round(weather?.temperatureC ?? 0);
  const feels = Math.round(weather?.feelsLikeC ?? weather?.temperatureC ?? 0);
  const today = weather?.daily?.[0];
  const hi = today?.maxC != null ? Math.round(today.maxC) : undefined;
  const lo = today?.minC != null ? Math.round(today.minC) : undefined;

  const windMessage = getWindMessage({
    windSpeed: weather?.windSpeedMS,
    gustSpeed: weather?.windGustMS,
    windDirection: weather?.windDeg,
    context: 'land'
  }) || '';

  const humidityText = weather?.humidityPct != null ? getHumidityDescription(weather.humidityPct, weather?.temperatureC) : undefined;

  // Pressure trend from last ~6 hours
  const pressureTrend = React.useMemo(() => {
    const arr = (weather?.hourly || []).slice(0, 6).map(h => h.pressureHpa).filter((n): n is number => typeof n === 'number');
    if (arr.length < 2) return '—';
    const diff = arr[arr.length - 1]! - arr[0]!;
    if (diff > 1.5) return 'Rising';
    if (diff < -1.5) return 'Falling';
    return 'Steady';
  }, [weather?.hourly]);

  // Air quality assessment if available
  const aqAssess = React.useMemo(() => {
    const aqi = weather?.airQuality?.aqi ?? undefined;
    if (aqi == null) return null;
    return assessAirQualityConditions({ overall: aqi });
  }, [weather?.airQuality]);

  // Rain description from near-term hours (next 3h sum)
  const rainDesc = React.useMemo(() => {
    const mm = (weather?.hourly || []).slice(0, 3).reduce((sum, h) => sum + (h.precipMM || 0), 0);
    return getRainfallDescription(mm, Math.max(1, Math.min(3, (weather?.hourly || []).slice(0, 3).length)));
  }, [weather?.hourly]);

  // Pollen assessment: prefer activities pipeline daily maxima when available
  const todayStr = today?.dateISO;
  const { data: wwp } = useSWR(lat != null && lon != null ? `/api/weather-with-pollen?lat=${lat}&lon=${lon}` : null, fetcher, { revalidateOnFocus: false, refreshInterval: 10 * 60 * 1000 });
  const pollenFromWWP = (todayStr && (wwp as any)?.pollenByDate?.[todayStr]) || undefined;
  const pollenToday = React.useMemo(() => pollenFromWWP ?? today?.pollen, [pollenFromWWP, today?.pollen]);
  const pollenAssess = React.useMemo(() => assessPollenConditions(pollenToday as any), [pollenToday]);
  const pollenIdx = React.useMemo(() => {
    const p = pollenToday as any;
    if (!p) return 0;
    const vals = [p.grass, p.tree, p.weed, (p as any).olive].filter((v): v is number => typeof v === 'number');
    if (!vals.length) return 0;
    const sum = vals.reduce((a, b) => a + getPollenIndex(b), 0);
    return Math.round(sum / vals.length);
  }, [pollenToday]);

  // Badge color to match pollen severity (green=low, yellow=moderate, red=high+)
  const pollenBadgeClass = React.useMemo(() => {
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

  // Ring color helpers for DaisyUI radial-progress (uses text-* color)
  const aqiRingClass = React.useMemo(() => {
    if (!aqAssess) return 'text-base-content';
    switch (aqAssess.overall) {
      case AirQualityLevel.GOOD: return 'text-success';
      case AirQualityLevel.MODERATE: return 'text-warning';
      case AirQualityLevel.UNHEALTHY_SENSITIVE: return 'text-orange-500';
      case AirQualityLevel.UNHEALTHY: return 'text-error';
      case AirQualityLevel.VERY_UNHEALTHY: return 'text-fuchsia-600';
      case AirQualityLevel.HAZARDOUS: return 'text-purple-700';
      default: return 'text-base-content';
    }
  }, [aqAssess]);

  const uvRingClass = React.useMemo(() => {
    const uv = weather?.uvi || 0;
    if (uv <= 2) return 'text-success';
    if (uv <= 5) return 'text-warning';
    if (uv <= 7) return 'text-orange-500';
    if (uv <= 10) return 'text-error';
    return 'text-purple-700';
  }, [weather?.uvi]);

  const pollenRingClass = React.useMemo(() => {
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

  // Animation gating for reduced motion / save-data
  const [showAnim, setShowAnim] = React.useState(false);
  const [bgForced] = React.useState<null | boolean>(null); // reserved for future toggle
  React.useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const saveData = (navigator as any)?.connection?.saveData === true;
    const cores = (navigator as any)?.hardwareConcurrency || 8;
    const lowEnd = cores <= 4;
    setShowAnim(!(reduced || saveData || lowEnd));
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Background animation */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-300/35 via-sky-100/20 to-sky-300/35" />
        {showAnim && (
          <WeatherAnimationLayer
            condition={anim.condition as any}
            cloudPct={anim.cloudPct}
            windSpeedMS={anim.windMS}
            isMarine={false}
            showPrecipOverlay
            className="w-full h-full"
          />
        )}
      </div>

      {/* Foreground UI */}
      <main className="relative z-10 bg-transparent text-base-content">
        {/* Banner with location buttons (parity with my-new-weather) */}
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
                style={{ width: 'auto', height: 'auto' }}
              />
            </div>
            <div className="mt-3">
              <h1 className="text-3xl md:text-4xl xl:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
                {mounted ? (((activeLoc?.name || weather?.name || 'Your').split(',')[0]) + ' Weather') : 'Weather'}
              </h1>
              <div className="mt-1 flex gap-2">
                <button className={`badge ${activeType==='home' ? 'badge-success' : 'badge-ghost'}`} onClick={() => setActiveType('home')}>Home</button>
                <button className={`badge ${activeType==='coastal' ? 'badge-info' : 'badge-ghost'}`} onClick={() => setActiveType('coastal')}>Beach</button>
              </div>
            </div>

            {/* Desktop location buttons */}
            <div className="homepage-banner__location-buttons desktop-location-buttons">
              <button
                className="location-banner__button"
                style={{ background: '#10b981' }}
                onClick={() => setShowHomeDialog(true)}
              >
                {mounted && home?.name ? `🏡 ${String(home.name).split(',')[0]} ✓` : 'Set home location'}
              </button>
              <button
                className="location-banner__button"
                style={{ background: '#3b82f6' }}
                onClick={() => setShowCoastDialog(true)}
              >
                {mounted && coastal?.name ? `🏖️ ${String(coastal.name).split(',')[0]} ✓` : 'Set beach location'}
              </button>
            </div>
          </header>

          {/* Mobile location buttons */}
          <div className="homepage-banner__location-buttons mobile-location-buttons">
            <button
              className="location-banner__button"
              style={{ background: '#10b981', flex: 1 }}
              onClick={() => setShowHomeDialog(true)}
            >
              {mounted && home?.name ? `🏡 ${String(home.name).split(',')[0]} ✓` : 'Set home location'}
            </button>
            <button
              className="location-banner__button"
              style={{ background: '#3b82f6', flex: 1 }}
              onClick={() => setShowCoastDialog(true)}
            >
              {mounted && coastal?.name ? `🏖️ ${String(coastal.name).split(',')[0]} ✓` : 'Set beach location'}
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
            homeLocation={home}
            coastalLocation={coastal}
            setHomeLocation={setHomeLocation}
            setCoastalLocation={setCoastalLocation}
            onSave={(loc) => { setHomeLocation(loc as any); setShowHomeDialog(false); }}
          />
        )}

        {showCoastDialog && (
          <CoastalLocationDialog
            open={showCoastDialog}
            onClose={() => setShowCoastDialog(false)}
            coastalLocation={coastal}
            setHomeLocation={setHomeLocation}
            setCoastalLocation={setCoastalLocation}
            onSave={(loc) => { setCoastalLocation(loc as any); setShowCoastDialog(false); }}
          />
        )}
        {/* HERO / NOW */}
        <section className="hero min-h-[28vh] bg-transparent section-plate-none">
          <div className="hero-content w-full flex-col xl:flex-row justify-between gap-6 section-plate-none">
            <div>
              <div className="text-7xl md:text-8xl font-bold leading-none">{loading ? '—' : `${temp}°`}</div>
              {weather?.name && (
                <div className="text-sm opacity-80 mt-1">{weather.name}</div>
              )}
              <div className="mt-1 flex items-center gap-2">
                <span className="badge badge-lg">{weather?.description || '—'}</span>
                {weather && (
                  <span className="tooltip" data-tip={`Comfort: ${getTemperatureDescription(weather.temperatureC || 0, weather.feelsLikeC)}`}>
                    <span className="text-sm opacity-70">Feels like {feels}°</span>
                  </span>
                )}
              </div>
              <div className="text-sm flex gap-3">
                {hi != null && <span className="text-warning">High {hi}°</span>}
                {lo != null && <span className="text-info">Low {lo}°</span>}
              </div>
            </div>
            <div className="stats bg-black/30 backdrop-blur-sm border border-white/10 shadow-sm">
              <div className="stat">
                <div className="stat-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/wind.svg" alt="Wind" className="w-4 h-4" /> Wind</div>
                <div className="stat-value text-xs md:text-sm max-w-[16rem] leading-snug">{windMessage || '—'}</div>
                <div className="stat-desc">{weather?.windDeg != null ? `Dir ${Math.round(weather.windDeg)}°` : ''}</div>
              </div>
              <div className="stat">
                <div className="stat-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/humidity.svg" alt="Humidity" className="w-4 h-4" /> Humidity</div>
                <div className="stat-value text-xl">{weather?.humidityPct != null ? `${weather.humidityPct}%` : '—'}</div>
                <div className="stat-desc">{humidityText || ''}</div>
              </div>
              <div className="stat">
                <div className="stat-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/uv-index.svg" alt="UV" className="w-4 h-4" /> UV now</div>
                <div className="stat-value text-xl">{weather?.uvi != null ? Math.round(weather.uvi) : '—'}</div>
                <div className="stat-desc">{today?.uvi != null ? `Peak ${Math.round(today.uvi)}` : ''}</div>
              </div>
            </div>
          </div>
        </section>

        {/* HOURLY (align with my-new-weather carousel) */}
        <section className="px-4 mt-4 bg-transparent section-plate-none">
          <div className="flex flex-col h-full">
            <h2 className="text-sm opacity-70 mb-2">Hourly</h2>
            <div className="card bg-transparent shadow-none h-full">
              <div className="card-body p-0 h-full">
                <div className="carousel rounded-box space-x-2 bg-transparent h-full">
                  {(weather?.hourly || []).slice(0, 12).map((h, i) => {
                    const isNow = i === 0;
                    const pop = Math.round((h.pop || 0) * 100);
                    const iconUrl = getWeatherIconUrl(h.icon);
                    const mm = h.precipMM || 0;
                    return (
                      <div className="carousel-item" key={h.timeISO}>
                        <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm w-32 h-full">
                          <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                            <div>
                              <div className="text-[11px] opacity-70">{isNow ? 'Now' : fmtTimeHM(h.timeISO)}</div>
                              <div className="text-3xl font-bold leading-none my-1">{h.tempC != null ? Math.round(h.tempC) : '—'}°</div>
                              <img src={iconUrl} alt="" className="w-7 h-7 mx-auto mb-1" />
                              {pop > 0 && (
                                <div className="mb-1">
                                  <div className="badge badge-info badge-sm mr-2">{pop}%</div>
                                  <span className="text-[13px] font-semibold align-middle">{mm.toFixed(1)}mm</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GRID CARDS (land only) */}
        <section className="px-4 mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 bg-transparent section-plate-none">
          {/* 7-Day */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm xl:col-span-2">
            <div className="card-body">
              <h3 className="card-title">7-Day</h3>
              <div className="overflow-x-auto rounded-box bg-transparent">
                <table className="table table-sm bg-transparent">
                  <tbody>
                    {(weather?.daily || []).slice(0, 7).map((d, idx) => {
                      const date = new Date(d.dateISO);
                      const label = idx === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
                      const iconUrl = getWeatherIconUrl(d.icon);
                      return (
                        <tr key={d.dateISO} className="hover:bg-white/5">
                          <td className="w-24">{label}</td>
                          <td className="w-10"><img src={iconUrl} alt="" className="w-6 h-6" /></td>
                          <td className="w-64">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-info">Low {d.minC != null ? Math.round(d.minC) : '—'}°</span>
                              <span className="text-xs text-warning">High {d.maxC != null ? Math.round(d.maxC) : '—'}°</span>
                            </div>
                          </td>
                          <td>
                            <div className="badge badge-info badge-outline">{d.pop != null ? Math.round((d.pop || 0) * 100) : 0}% rain</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Rainfall */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h3 className="card-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/raindrops.svg" alt="Rain" className="w-5 h-5" /> Rainfall</h3>
                <span className="badge badge-outline">{rainDesc}</span>
              </div>
              <details className="collapse collapse-arrow">
                <summary className="collapse-title text-sm">Next 12h intensity</summary>
                <div className="collapse-content">
                  <div className="flex items-end gap-1 h-16">
                    {(weather?.hourly || []).slice(0, 12).map((h, i) => {
                      const mm = h.precipMM || 0;
                      const height = Math.min(100, Math.round(mm * 8));
                      return <div key={i} className="w-3 bg-info/60 rounded-t" style={{ height: `${height}%` }} />;
                    })}
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* Air Quality */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h3 className="card-title">Air Quality</h3>
                {aqAssess ? (
                  <span className="badge badge-warning">{getAirQualityLevelDescription(aqAssess.overall)}</span>
                ) : (
                  <span className="badge badge-ghost">No data</span>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className={`radial-progress ${aqiRingClass}`} style={{ ["--value" as any]: Math.min(100, getAirQualityIndex(weather?.airQuality?.aqi || 0)) }} aria-label="AQI">
                  {getAirQualityIndex(weather?.airQuality?.aqi || 0)}
                </div>
                <div className="text-sm opacity-80">
                  {aqAssess ? 'Keep an eye if sensitive' : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h3 className="card-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/dust-wind.svg" alt="Visibility" className="w-5 h-5" /> Visibility</h3>
                <span className="badge badge-outline">{weather?.visibilityKm != null ? `${Math.round(weather.visibilityKm)} km` : '—'}</span>
              </div>
              {/* Enhanced description */}
              {weather?.visibilityKm != null && (
                <div className="text-sm opacity-80 mb-2">
                  {getVisibilityDescription(weather.visibilityKm) || 'Good visibility'}
                </div>
              )}
              {/* Logarithmic scale for inland (OpenWeather capped at 10 km) */}
              {(() => {
                const pct = visibilityPercentLand(weather?.visibilityKm || 0);
                return (
                  <>
                    <progress className="progress w-full" value={pct} max={100}></progress>
                    <div className="text-xs opacity-70 mt-1">0–10 km (log scale)</div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* UV Index */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/uv-index.svg" alt="UV" className="w-5 h-5" /> UV Index</h3>
              <div className="flex items-center gap-6">
                <div className={`radial-progress ${uvRingClass}`} style={{ ["--value" as any]: Math.min(100, ((weather?.uvi || 0) / 11) * 100) }}>{weather?.uvi != null ? Math.round(weather.uvi) : '—'}</div>
                <div className="text-sm opacity-80">Peak today {today?.uvi != null ? Math.round(today.uvi) : '—'}</div>
              </div>
            </div>
          </div>

          {/* Moon */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/starry-night.svg" alt="Moon" className="w-5 h-5" /> Moon</h3>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <img src={moonIconForPhase(today?.moonPhase)} alt="Moon phase" className="w-8 h-8" />
                  {today?.moonPhase != null && (
                    <div className="text-xs opacity-70 mt-1">
                      {Math.round(today.moonPhase * 100)}%
                    </div>
                  )}
                </div>
                <div className="text-sm opacity-80 flex-1">
                  <div className="flex justify-between"><span className="flex items-center gap-1"><img src="/weather-icons/design/fill/final/moonrise.svg" className="w-4 h-4" alt="moonrise"/> Rise</span><span>{fmtTimeHM(today?.moonriseISO) || '—'}</span></div>
                  <div className="flex justify-between"><span className="flex items-center gap-1"><img src="/weather-icons/design/fill/final/moonset.svg" className="w-4 h-4" alt="moonset"/> Set</span><span>{fmtTimeHM(today?.moonsetISO) || '—'}</span></div>
                  {today?.moonPhase != null && (
                    <div className="text-xs opacity-60 mt-1">
                      {(() => {
                        const phase = today.moonPhase;
                        if (phase < 0.06 || phase > 0.94) return 'New Moon';
                        if (phase < 0.19) return 'Waxing Crescent';
                        if (phase < 0.31) return 'First Quarter';
                        if (phase < 0.44) return 'Waxing Gibbous';
                        if (phase < 0.56) return 'Full Moon';
                        if (phase < 0.69) return 'Waning Gibbous';
                        if (phase < 0.81) return 'Last Quarter';
                        return 'Waning Crescent';
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tides (if available) */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/tide-high.svg" alt="Tides" className="w-5 h-5" /> Tides</h3>
              {Array.isArray(weather?.tides) && weather!.tides!.length > 0 ? (
                (() => {
                  const now = Date.now();
                  const sorted = (weather!.tides || []).slice().sort((a,b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                  const next = sorted.find(t => new Date(t.time).getTime() > now) || sorted[0];
                  const icon = next.type === 'high' ? '/weather-icons/design/fill/final/tide-high.svg' : '/weather-icons/design/fill/final/tide-low.svg';
                  return (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={icon} className="w-6 h-6" alt="next tide" />
                        <span className="badge badge-outline capitalize">{next.type}</span>
                      </div>
                      <div className="text-sm opacity-80">
                        {fmtTimeHM(next.time)}{typeof next.height === 'number' ? ` · ${next.height.toFixed(1)} m` : ''}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-sm opacity-70">—</div>
              )}
            </div>
          </div>

          {/* Pollen */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h3 className="card-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/pollen.svg" alt="Pollen" className="w-5 h-5" /> Pollen</h3>
                <span className={`badge ${pollenBadgeClass}`}>
                  {getPollenLevelDescription(pollenAssess.overall)}
                </span>
              </div>
              <div className="flex items-center gap-3 opacity-80 text-sm">
                <div className="flex items-center gap-1 tooltip tooltip-bottom z-50" data-tip="Tree pollen: Trees shed their pollen in winter and spring — one of the main triggers for seasonal allergies."><img src="/weather-icons/design/fill/final/pollen-tree.svg" className="w-5 h-5" alt="tree" /><span>{(pollenToday as any)?.tree != null ? Math.round((pollenToday as any).tree) : 0}</span></div>
                <div className="flex items-center gap-1 tooltip tooltip-bottom z-50" data-tip="Grass pollen: Peaks late spring through summer — a major hay fever trigger."><img src="/weather-icons/design/fill/final/pollen-grass.svg" className="w-5 h-5" alt="grass" /><span>{(pollenToday as any)?.grass != null ? Math.round((pollenToday as any).grass) : 0}</span></div>
                <div className="flex items-center gap-1 tooltip tooltip-bottom z-50" data-tip="Weed pollen: Weeds kick up pollen from late spring through autumn, often making allergy season linger."><img src="/weather-icons/design/fill/final/pollen-flower.svg" className="w-5 h-5" alt="weed" /><span>{(pollenToday as any)?.weed != null ? Math.round((pollenToday as any).weed) : 0}</span></div>
                <div className="flex items-center gap-1 tooltip tooltip-bottom z-50" data-tip="Olive pollen: Olive trees spread their pollen from early May to late June, especially around Mediterranean regions."><img src="/weather-icons/design/fill/final/pollen-olive.svg" className="w-5 h-5" alt="olive" /><span>{(pollenToday as any)?.olive != null ? Math.round((pollenToday as any).olive) : 0}</span></div>
                <div className="ml-auto">
                  <div className={`radial-progress ${pollenRingClass}`} style={{ ["--value" as any]: pollenIdx }} aria-label="Pollen Index">{pollenIdx}</div>
                </div>
              </div>
            </div>
          </div>
          {/* Sunrise/Sunset */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/sunrise.svg" alt="Sunrise" className="w-5 h-5" /> Sunrise & <img src="/weather-icons/design/fill/final/sunset.svg" alt="Sunset" className="w-5 h-5" /> Sunset</h3>
              <div className="flex justify-between text-xs opacity-70"><span>↑ {fmtTimeHM(weather?.sunriseISO)}</span><span>↓ {fmtTimeHM(weather?.sunsetISO)}</span></div>
            </div>
          </div>

          {/* Pressure */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2"><img src="/weather-icons/design/fill/final/barometer.svg" alt="Pressure" className="w-5 h-5" /> Pressure</h3>
              <div className="flex items-center gap-2">
                <span className="badge badge-outline">{pressureTrend}</span>
                <span className="text-sm opacity-80">{weather?.pressureHpa != null ? `${weather.pressureHpa} hPa` : '—'}</span>
              </div>
              <div className="mt-2 rounded-box bg-black/25 backdrop-blur-sm p-2">
                <div className="flex items-end gap-1 h-16">
                  {(weather?.hourly || []).slice(0, 24).map((h, i) => {
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
        </section>

        {/* Footer spacing */}
        <div className="h-16" />
      </main>

      {/* Error/Loading overlays */}
      {error && (
        <div className="absolute bottom-4 right-4 alert alert-error shadow-lg">
          <span>Failed to load weather</span>
        </div>
      )}
    </div>
  );
}
