'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import type { Suggestion as ActivitySuggestion } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import type { MarineHour, WeatherForecastDay } from '../types/weatherTypes';
import { getActivityEmoji } from '../data/emojiMap';
import { buildReasons, isOutdoor, isOutOfSeason } from '../utils/activityHelpers';
import { getActivityBg } from '../data/bgMap';
import { getOptimizedImageSrc, isImageOptimized } from '../data/bgMapOptimized';
import WindDirectionIcon from '../components/WindDirectionIcon';
import EnvironmentalIndicators from '../components/EnvironmentalIndicators';
import { getCompassDirection } from '../utils/weatherLabels';
import { getBeaufortNumber } from '../utils/beaufort';
import { mpsToKnots, mpsToKmh } from '../utils/weatherUtils';
import { resolveBeachOrientationAsync, computeSimulatedOrientation } from '../utils/orientation';
import { getActivityMessage } from '../data/activityMessages';
import ModernLocationSearch from '../components/ModernLocationSearch';
import type { SnowRecommendationLevel } from '../utils/snowRecommendations';

// -----------------------------------------------------------------------------
// DEMO PAGE (no sign-up) — persuasive preview that nudges onboarding
// -----------------------------------------------------------------------------

// Local types to tighten the demo data model
type Place = { name: string; lat: number; lon: number };

/** LocalStorage key used to pass the chosen demo place to onboarding */
const DEMO_PLACE_LS_KEY = 'godaisy.demo.place';
const DEMO_COAST_LS_KEY = 'godaisy.demo.coast';

// Also persist to user home/coast keys for onboarding context
const USER_HOME_LS_KEY = 'godaisy.pref.home';
const USER_COAST_LS_KEY = 'godaisy.pref.coast';

function saveHomePref(p: Place) {
  try {
    const payload = { name: p.name, lat: p.lat, lon: p.lon, type: 'home' as const };
    localStorage.setItem(DEMO_PLACE_LS_KEY, JSON.stringify(payload));
    localStorage.setItem(USER_HOME_LS_KEY, JSON.stringify(payload));
    // Optional nudge for contexts that listen for this
    window.dispatchEvent(new CustomEvent('godaisy:prefs:update', { detail: { scope: 'home', value: payload } }));
  } catch {}
}
function saveCoastPref(p: Place) {
  try {
    const payload = { name: p.name, lat: p.lat, lon: p.lon, type: 'coastal' as const };
    localStorage.setItem(DEMO_COAST_LS_KEY, JSON.stringify(payload));
    localStorage.setItem(USER_COAST_LS_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('godaisy:prefs:update', { detail: { scope: 'coastal', value: payload } }));
  } catch {}
}

function loadSavedPlace(candidateKeys: string[], fallbackName: string): Place | null {
  if (typeof window === 'undefined') return null;
  for (const key of candidateKeys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<Place> | null;
      if (!parsed) continue;
      const lat = Number(parsed.lat);
      const lon = Number(parsed.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const name = typeof parsed.name === 'string' && parsed.name.trim().length ? parsed.name : fallbackName;
      return { name, lat, lon };
    } catch {
      // ignore malformed entries and continue checking the remaining keys
    }
  }
  return null;
}

// Fast IP geolocation (client-side). Fails fast and silently; returns null on any error.
async function getIPLocation(timeoutMs = 1200): Promise<Place | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    // ipapi.co supports HTTPS and simple JSON without auth for low-volume use
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const lat = typeof data.latitude === 'number' ? data.latitude : Number(data.latitude);
    const lon = typeof data.longitude === 'number' ? data.longitude : Number(data.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const city = typeof data.city === 'string' && data.city ? data.city : 'Your area';
    const region = typeof data.region === 'string' && data.region ? data.region : '';
    const country = typeof data.country_name === 'string' && data.country_name ? data.country_name : '';
    const name = [city, region || country].filter(Boolean).join(', ');
    return { name, lat, lon };
  } catch {
    return null;
  }
}

type ForecastItem = {
  dt_txt: string;
  main: { temp: number; humidity: number; temp_min?: number; temp_max?: number };
  weather: Array<{ main: string; description: string; icon: string }>;
  rain?: { '3h'?: number };
  snow?: { '3h'?: number };
  wind: { speed: number; deg: number };
  clouds: { all: number };
  visibility?: number;
};

type DemoWeather = {
  list?: ForecastItem[];
  pollenByDate?: Record<string, WeatherForecastDay['pollen']>;
  airQualityByDate?: Record<string, WeatherForecastDay['airQuality']>;
};

// Presets for quick switching
const DEMO_PRESETS = [
  { label: 'Lastres', name: 'Lastres, Asturias', lat: 43.513, lon: -5.271 },
  { label: 'Madrid', name: 'Madrid, Spain', lat: 40.4168, lon: -3.7038 },
] as const;

// Fallback default (used if IP geolocation fails or times out)
const DEFAULT_FALLBACK_PLACE: Place = { name: 'Madrid, Spain', lat: 40.4168, lon: -3.7038 };

// Default coastal location: Elafonissi Beach, Crete
const DEFAULT_COASTAL_LOCATION = { lat: 35.272, lon: 23.539 } as const;
const DEFAULT_COASTAL_PLACE: Place = {
  name: 'Elafonissi Beach, Crete',
  lat: DEFAULT_COASTAL_LOCATION.lat,
  lon: DEFAULT_COASTAL_LOCATION.lon,
};

// Curated set used if the user hasn't onboarded yet
const DEMO_ACTIVITY_IDS = [
  'sea_fishing_shore',
  'stand_up_paddleboarding',
  'hiking',
  'road_cycling',
  'beach',
  'outdoor_gardening',
] as const;

function safeDemoActivities() {
  const ids = new Set<string>(DEMO_ACTIVITY_IDS as readonly string[]);
  const subset = activityTypes.filter(a => ids.has(a.id));
  return subset.length >= 3 ? subset : activityTypes.slice(0, 6);
}

// Very light category model just for these demo activities
// Replace legacy 'all' tab with curated tabs per requirements
type CategoryKey = 'outdoors' | 'water' | 'family' | 'sports';

// Curated ID sets per tab
const CURATED: Record<CategoryKey, readonly string[]> = {
  outdoors: ['hiking', 'outdoor_gardening', 'running', 'mountain_biking'],
  water: ['surfing', 'sea_kayaking', 'sup_sea', 'sea_swimming'],
  family: ['bbq', 'beach', 'outdoor_playground', 'picnicking'],
  sports: ['football_soccer', 'tennis', 'road_cycling', 'golf'],
};

async function getBrowserLocation(timeoutMs = 8000): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

function getDayLabel(dateSec: number, idx: number) {
  const date = new Date(dateSec * 1000);
  const today = new Date();
  const same =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  if (same) return 'Today';
  if (idx === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' });
}

// =============================================================================
// Shared card helpers (mirrored from /pages/activities.tsx)
// =============================================================================

// Marine activities that get special marine data display
const MARINE_ACTIVITY_IDS = [
  'surfing', 'kitesurfing', 'windsurfing', 'sea_kayaking', 'canoeing',
  'snorkeling', 'scuba_diving', 'jet_skiing', 'stand_up_paddleboarding', 'sup_sea', 'sea_swimming',
  'sea_fishing_shore', 'beach', 'beach_volleyball', 'sea_fishing_boat'
];

const humidityIcon = '/weather-icons/design/fill/final/humidity.svg';
const rainIcon = '/weather-icons/design/fill/final/raindrop-measure.svg';

function collectNoaaValues(hours: MarineHour[], key: keyof MarineHour): number[] {
  const values: number[] = [];
  for (const hour of hours) {
    const entry = hour[key] as { noaa?: number } | undefined;
    const value = typeof entry === 'object' && entry !== null ? entry.noaa : undefined;
    if (typeof value === 'number' && Number.isFinite(value)) values.push(value);
  }
  return values;
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const total = values.reduce((sum, v) => sum + v, 0);
  return total / values.length;
}

function circularMeanDegrees(values: number[]): number | undefined {
  if (!values.length) return undefined;
  let x = 0;
  let y = 0;
  for (const deg of values) {
    const rad = (deg * Math.PI) / 180;
    x += Math.cos(rad);
    y += Math.sin(rad);
  }
  if (x === 0 && y === 0) return values[0];
  const meanRad = Math.atan2(y, x);
  return ((meanRad * 180) / Math.PI + 360) % 360;
}

function summarizeMarineHours(hours: MarineHour[]) {
  if (!hours || hours.length === 0) return null;

  const waveHeight = average(collectNoaaValues(hours, 'waveHeight'));
  const waterTemperature = average(collectNoaaValues(hours, 'waterTemperature'));
  const swellHeight = average(collectNoaaValues(hours, 'swellHeight'));
  const swellPeriod = average(collectNoaaValues(hours, 'swellPeriod'));
  const windSpeed = average(collectNoaaValues(hours, 'windSpeed'));
  const windGust = average(collectNoaaValues(hours, 'windGust'));
  const windDirection = circularMeanDegrees(collectNoaaValues(hours, 'windDirection'));
  const visibility = average(collectNoaaValues(hours, 'visibility'));
  const precipitation = average(collectNoaaValues(hours, 'precipitation'));

  return {
    waveHeight,
    waterTemperature,
    swellHeight,
    swellPeriod,
    windSpeed,
    windGust,
    windDirection,
    visibility,
    precipitation,
  } as const;
}

function getWeatherIconUrl(iconCode: string) {
  const supported = [
    '01d','01n','02d','02n','03d','03n','04d','04n',
    '09d','09n','10d','10n','11d','11n','13d','13n','50d','50n'
  ];
  return supported.includes(iconCode)
    ? `/weather-icons/design/fill/final/${iconCode}.svg`
    : '/weather-icons/design/fill/final/na.svg';
}

function getWindIcon(windMs: number) {
  const beaufort = getBeaufortNumber(windMs);
  if (beaufort < 3) return '/weather-icons/design/fill/final/windsock.svg';
  if (beaufort <= 12) return `/weather-icons/design/fill/final/wind-beaufort-${beaufort}.svg`;
  return '/weather-icons/design/fill/final/wind.svg';
}

function getAssessmentCategory(score: number, activityId?: string): {
  status: 'poor' | 'fair' | 'good' | 'perfect' | 'offseason';
  color: string;
  emoji: string;
} {
  if (activityId && isOutOfSeason(activityId)) {
    return { status: 'offseason', color: '#8b5cf6', emoji: '🍂' };
  }
  if (score >= 90) return { status: 'perfect', color: '#10b981', emoji: '💯' };
  if (score >= 60) return { status: 'good', color: '#3b82f6', emoji: '👍' };
  if (score >= 30) return { status: 'fair', color: '#f59e0b', emoji: '🙆' };
  if (score >= 20) return { status: 'poor', color: '#ef4444', emoji: '⚠️' };
  return { status: 'poor', color: '#dc2626', emoji: '💩' };
}

interface ActivityCardProps {
  activityId: string;
  score: number;
  evaluation?: string;
  reasoning?: string;
  day: WeatherForecastDay;
  dayLabel?: string;
  coastalLocation?: { lat: number; lon: number } | null;
  homeLocation?: { lat: number; lon: number } | null;
  snow?: { level: SnowRecommendationLevel; message: string };
}

function ActivityCard({ activityId, score, day, coastalLocation, homeLocation, snow }: ActivityCardProps) {
  const activity = activityTypes.find(a => a.id === activityId);
  const assessment = getAssessmentCategory(score, activityId);
  const bgUrl = isImageOptimized(activityId)
    ? getOptimizedImageSrc(activityId, 'webpLarge')
    : getActivityBg(activityId);
  const isMarine = MARINE_ACTIVITY_IDS.includes(activityId);

  const winterActivities = ['skiing', 'snowboarding', 'cross_country_skiing', 'ice_skating', 'sledding'];
  const isWinterActivity = winterActivities.includes(activityId);
  const isIndoorActivity = !isOutdoor(activityId);
  const shouldShowPollenWarning = !isWinterActivity && !isIndoorActivity;
  const shouldShowAirQualityWarning = !isWinterActivity && !isIndoorActivity;

  const reasonsStrings = buildReasons(day, activityId);
  const reasonsObjects = reasonsStrings.map((reason, index) => ({ key: `reason_${index}`, value: true, label: reason }));
  const message = assessment.status === 'offseason'
    ? `${activity?.name || activityId.replace(/_/g, ' ')} is out of season right now.`
    : getActivityMessage(activityId, assessment.status, reasonsObjects);

  const [_resolvedOrientation, setResolvedOrientation] = useState<number | undefined>(undefined);
  const [_orientationVia, setOrientationVia] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!isMarine) { setResolvedOrientation(undefined); setOrientationVia(undefined); return; }
    const lat = coastalLocation?.lat ?? homeLocation?.lat;
    const lon = coastalLocation?.lon ?? homeLocation?.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number') { setResolvedOrientation(undefined); setOrientationVia(undefined); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await resolveBeachOrientationAsync({ lat, lon });
        if (cancelled) return;
        const via = res.source;
        const o = typeof res.orientation === 'number' ? res.orientation : computeSimulatedOrientation(lat, lon);
        setResolvedOrientation(o);
        setOrientationVia(via);
      } catch {
        setResolvedOrientation(computeSimulatedOrientation(lat, lon));
        setOrientationVia('simulated');
      }
    })();
    return () => { cancelled = true; };
  }, [isMarine, coastalLocation?.lat, coastalLocation?.lon, homeLocation?.lat, homeLocation?.lon]);

  const snowLevel = snow?.level || '';
  const snowIsDanger = /(snowfall_unsafe|dangerous|unsafe|impossible|unplayable|too_deep)/.test(snowLevel);
  const snowIsCaution = /(snowfall_caution|difficult|impractical|uncomfortable|caution|requires_winter_gear)/.test(snowLevel);
  const snowIsPositive = /(excellent|optimal|beneficial|safe|adequate|required|irrelevant)/.test(snowLevel);
  const snowIcon = snowLevel.startsWith('snowfall_') ? '/weather-icons/design/fill/final/overcast-snow.svg' : '/weather-icons/design/fill/final/snowman.svg';

  return (
    <article
      className="activity-card activity-card__bg-image"
      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${bgUrl})` }}
      tabIndex={0}
      role="button"
      aria-label={`${activity?.name || activityId} - ${assessment.status} conditions`}
    >
      <div className="activity-card__header">
        <div className="activity-card__title-section">
          <span className="activity-card__emoji">{getActivityEmoji(activityId)}</span>
          <h3 className="activity-card__title">{activity?.name || activityId.replace(/_/g, ' ')}</h3>
        </div>
        <div className="activity-card__badges">
          <div className={`activity-card__badge ${!isOutdoor(activityId) ? 'activity-card__badge--indoor' : assessment.status === 'offseason' ? 'activity-card__badge--offseason' : ''}`}
               style={{ background: !isOutdoor(activityId) ? undefined : assessment.color }}>
            {!isOutdoor(activityId) ? '🛋️ indoor' : assessment.status === 'offseason' ? '🍂 offseason' : `${assessment.emoji} ${assessment.status}`}
          </div>
          <button onClick={(e)=>{ e.stopPropagation(); }} className="activity-card__share-btn" aria-label={`Share ${activity?.name || activityId}`}>📤 Share</button>
        </div>
      </div>

      {isOutdoor(activityId) && assessment.status !== 'offseason' && (
        <div className="activity-card__message">
          {message || (score < 40 ? `Not ideal weather for ${activity?.name || activityId.replace(/_/g, ' ')}, but still an option.` : message)}
        </div>
      )}

      {snow && (
        <div className={`mt-2 rounded-md px-2 py-1 text-xs inline-flex items-center gap-2 ${snowIsDanger ? 'bg-red-600 text-white' : snowIsCaution ? 'bg-amber-500 text-black' : snowIsPositive ? 'bg-emerald-500 text-white' : 'bg-base-200 text-base-content'}`}>
          <Image src={snowIcon} alt="Snow advisory" width={18} height={18} />
          <span>{snow.message}</span>
        </div>
      )}

      <div className="activity-card__data-bar">
        <ul className="activity-card__data-list">
          {isMarine ? (
            <>
              {typeof day.temperature === 'number' && (
                <li className="activity-card__data-item">
                  <Image src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="Air temperature" className="activity-card__data-icon" width={24} height={24} />
                  <strong>{Math.round(day.temperature)}°</strong>
                </li>
              )}
              {typeof day.waterTemperature === 'number' && (
                <li className="activity-card__data-item">
                  <Image src="/weather-icons/design/fill/final/thermometer-water.svg" alt="Water temperature" className="activity-card__data-icon" width={24} height={24} />
                  <strong>{Math.round(day.waterTemperature)}°</strong>
                </li>
              )}
              {day.icon && (
                <li className="activity-card__data-item">
                  <Image src={getWeatherIconUrl(day.icon)} alt={day.description || 'weather'} className="activity-card__data-icon--lg" width={32} height={32} />
                  {day.description}
                  {typeof day.rain === 'number' && day.rain > 0 && (
                    <>
                      {' '}
                      <Image src={rainIcon} alt="Precipitation" className="activity-card__data-icon" width={24} height={24} style={{ marginLeft: '8px' }} />
                      <strong>{day.rain}mm</strong>
                    </>
                  )}
                </li>
              )}
              {typeof day.waveHeight === 'number' && (
                <li className="activity-card__data-item">🌊 <strong>{day.waveHeight.toFixed(1)}</strong>m</li>
              )}
                  {typeof day.wind_speed === 'number' && (
                    <li className="activity-card__data-item activity-card__data-item--wrap">
                      <Image src={getWindIcon(day.wind_speed)} alt="Wind" className="activity-card__data-icon" width={24} height={24} />
                      <strong>{mpsToKnots(day.wind_speed).toFixed(0)} kn</strong>
                      {day.wind_direction && (<>{' '}({getCompassDirection(day.wind_direction)})</>)}
                      {typeof day.gust_speed === 'number' && day.gust_speed > day.wind_speed && (
                        <span className="ml-2 text-xs text-base-content/70">gust {mpsToKnots(day.gust_speed).toFixed(0)} kn</span>
                      )}
                      <div className="wind-direction-wrapper">
                        <WindDirectionIcon deg={day.wind_direction || 0} size={16} className="wind-direction-icon" />
                      </div>
                    </li>
                  )}
              {typeof day.swellHeight === 'number' && (
                <li className="activity-card__data-item">
                  🏄🏿‍♀️ Swell: <strong>{day.swellHeight.toFixed(1)}</strong>m
                  {typeof day.swellPeriod === 'number' && (<span> ({day.swellPeriod.toFixed(1)}s)</span>)}
                </li>
              )}
                  {typeof day.visibility === 'number' && (
                    <li className="activity-card__data-item">
                      👀<strong>{day.visibility > 3000 ? Math.round(day.visibility / 1000) : (day.visibility / 1000).toFixed(1)}</strong>km
                    </li>
                  )}
                  {(shouldShowPollenWarning && day.pollen) || (shouldShowAirQualityWarning && day.airQuality) ? (
                    <li className="activity-card__data-item">
                      <EnvironmentalIndicators
                        pollen={shouldShowPollenWarning ? day.pollen : undefined}
                        airQuality={shouldShowAirQualityWarning ? day.airQuality : undefined}
                        mode="compact"
                        snowDepthCm={day.snowDepthCm}
                        snowfallRateMmH={day.snowfallRateMmH}
                      />
                    </li>
                  ) : null}
            </>
          ) : (
            <>
              {(typeof day.tempMax === 'number' || typeof day.tempMin === 'number') && (
                <>
                  {typeof day.tempMax === 'number' && (
                    <li className="activity-card__data-item">
                      <Image src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="High Temperature" className="activity-card__data-icon" width={24} height={24} />
                      <strong>High: {Math.round(day.tempMax)}°</strong>
                    </li>
                  )}
                  {typeof day.tempMin === 'number' && (
                    <li className="activity-card__data-item">
                      <Image src="/weather-icons/design/fill/final/thermometer-colder.svg" alt="Low Temperature" className="activity-card__data-icon" width={24} height={24} />
                      <strong>Low: {Math.round(day.tempMin)}°</strong>
                    </li>
                  )}
                </>
              )}
              {typeof day.temperature === 'number' && !day.tempMax && !day.tempMin && (
                <li className="activity-card__data-item">
                  <Image src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="Temperature" className="activity-card__data-icon" width={24} height={24} />
                  <strong>{Math.round(day.temperature)}°</strong>
                </li>
              )}
              {day.icon && (
                <li className="activity-card__data-item">
                  <Image src={getWeatherIconUrl(day.icon)} alt={day.description || 'weather'} className="activity-card__data-icon--lg" width={32} height={32} />
                  {day.description}
                  {typeof day.rain === 'number' && day.rain > 0 && (
                    <>
                      {' '}
                      <Image src={rainIcon} alt="Precipitation" className="activity-card__data-icon" width={24} height={24} style={{ marginLeft: '8px' }} />
                      <strong>{day.rain}mm</strong>
                    </>
                  )}
                </li>
              )}
              {typeof day.wind_speed === 'number' && (
                <li className="activity-card__data-item">
                  <Image src={getWindIcon(day.wind_speed)} alt="Wind" className="activity-card__data-icon" width={24} height={24} />
                  <strong>{getBeaufortNumber(day.wind_speed)} Bft</strong>
                  <span className="wind-speed-additional">({mpsToKnots(day.wind_speed).toFixed(0)} kn, {mpsToKmh(day.wind_speed).toFixed(0)} km/h)</span>
                  {day.wind_direction && (<>{' '}({getCompassDirection(day.wind_direction)})</>)}
                  <div className="wind-direction-wrapper">
                    <WindDirectionIcon deg={day.wind_direction || 0} size={16} className="wind-direction-icon" />
                  </div>
                </li>
              )}
              {typeof day.humidity === 'number' && (
                <li className="activity-card__data-item">
                  <Image src={humidityIcon} alt="Humidity" className="activity-card__data-icon" width={24} height={24} />
                  <strong>{day.humidity}%</strong>
                </li>
              )}
              {(shouldShowPollenWarning && day.pollen) || (shouldShowAirQualityWarning && day.airQuality) ? (
                <li className="activity-card__data-item">
                  <EnvironmentalIndicators pollen={shouldShowPollenWarning ? day.pollen : undefined} airQuality={shouldShowAirQualityWarning ? day.airQuality : undefined} mode="compact" snowDepthCm={day.snowDepthCm} snowfallRateMmH={day.snowfallRateMmH} />
                </li>
              ) : (
                (typeof day.snowDepthCm === 'number' && day.snowDepthCm > 0) || (typeof day.snowfallRateMmH === 'number' && day.snowfallRateMmH > 0) ? (
                  <li className="activity-card__data-item">
                    <EnvironmentalIndicators mode="compact" snowDepthCm={day.snowDepthCm} snowfallRateMmH={day.snowfallRateMmH} />
                  </li>
                ) : null
              )}
            </>
          )}
        </ul>
      </div>

      <div className="activity-card__score">Score: {score}%</div>
    </article>
  );
}

export default function DemoPage() {
  // --- state ---
  const [cat, setCat] = useState<CategoryKey>('outdoors');
  const [place, setPlace] = useState<Place>(() => {
    const saved = loadSavedPlace([USER_HOME_LS_KEY, DEMO_PLACE_LS_KEY], DEFAULT_FALLBACK_PLACE.name);
    return saved ?? { ...DEFAULT_FALLBACK_PLACE };
  });
  const [coastalPlace, setCoastalPlace] = useState<Place>(() => {
    const saved = loadSavedPlace([USER_COAST_LS_KEY, DEMO_COAST_LS_KEY], DEFAULT_COASTAL_PLACE.name);
    return saved ?? { ...DEFAULT_COASTAL_PLACE };
  });
  const [busy, setBusy] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  const [demoWeather, setDemoWeather] = useState<DemoWeather | null>(null);
  const [demoMarineHours, setDemoMarineHours] = useState<MarineHour[]>([]);
  const [demoForecastByDay, setDemoForecastByDay] = useState<WeatherForecastDay[]>([]);
  const [activeDay, setActiveDay] = useState(0);

  // Guard to ensure prefill effect only runs once even if deps change
  const prefillOnceRef = useRef(false);



  // Persist the selected place so onboarding can pick it up if the user goes there later
  useEffect(() => { saveHomePref(place); }, [place]);

  // Persist the selected coastal place so onboarding can pick it up
useEffect(() => { saveCoastPref(coastalPlace); }, [coastalPlace]);

  // Attempt to set initial locations from saved prefs (home/coast), otherwise from IP for home; run once.
  useEffect(() => {
    if (prefillOnceRef.current) return;
    prefillOnceRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        if (typeof window !== 'undefined') {
          // HOME: prefer user pref, then prior demo place
          const savedHome = localStorage.getItem(USER_HOME_LS_KEY) || localStorage.getItem(DEMO_PLACE_LS_KEY);
          if (savedHome) {
            const p = JSON.parse(savedHome) as { name?: string; lat?: unknown; lon?: unknown } | null;
            const lat = Number(p?.lat); const lon = Number(p?.lon); const name = (p?.name && String(p.name)) || 'Your area';
            if (Number.isFinite(lat) && Number.isFinite(lon)) setPlace({ name, lat, lon });
          }
          // COAST: prefer user pref, then prior demo coast
          const savedCoast = localStorage.getItem(USER_COAST_LS_KEY) || localStorage.getItem(DEMO_COAST_LS_KEY);
          if (savedCoast) {
            const c = JSON.parse(savedCoast) as { name?: string; lat?: unknown; lon?: unknown } | null;
            const clat = Number(c?.lat); const clon = Number(c?.lon); const cname = (c?.name && String(c.name)) || 'Your coast';
            if (Number.isFinite(clat) && Number.isFinite(clon)) setCoastalPlace({ name: cname, lat: clat, lon: clon });
          }
        }
      } catch { /* ignore parse errors */ }

      // If still at fallback for HOME, try quick IP geo
      const stillFallback = (curr: Place) => curr.lat === DEFAULT_FALLBACK_PLACE.lat && curr.lon === DEFAULT_FALLBACK_PLACE.lon;
      if (!cancelled && stillFallback(place)) {
        const ipPlace = await getIPLocation(1200);
        if (!cancelled && ipPlace) setPlace(ipPlace);
      }
    })();
    return () => { cancelled = true; };
  }, [place, coastalPlace]);

  // --- fetchers ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = await fetch(`/api/weather-with-pollen?lat=${place.lat}&lon=${place.lon}`, { cache: 'no-store' });
        if (!w.ok) throw new Error('Weather fetch failed');
        const jw = (await w.json()) as DemoWeather;
        if (cancelled) return;
        setDemoWeather(jw);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [place]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const now = new Date();
        const start = Math.floor(now.getTime() / 1000);
        const end = start + 3 * 24 * 60 * 60;
        const r = await fetch(`/api/marine?lat=${coastalPlace.lat}&lon=${coastalPlace.lon}&start=${start}&end=${end}`);
        if (!r.ok) throw new Error('Marine fetch failed');
        const jm = await r.json();
        if (cancelled) return;
        setDemoMarineHours((jm.hours || []) as MarineHour[]);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coastalPlace]);

  // --- build demo forecast (mirrors Activities grouping) ---
  const forecastByDayMemo: WeatherForecastDay[] = useMemo(() => {
    if (!demoWeather?.list) return [];
    const grouped: Record<string, ForecastItem[]> = {};
    const list: ForecastItem[] = demoWeather?.list ?? [];
    list.forEach((item) => {
      const date = item.dt_txt.split(' ')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });
    return Object.entries(grouped)
      .slice(0, 3)
      .map(([dateStr, dayEntries]) => {
        const entries = dayEntries as ForecastItem[];
        const noon = entries.find((e) => e.dt_txt.includes('12:00:00')) ?? entries[0];
        // Compute true min/max across the day's entries, preferring temp_min/temp_max when available
        const minCandidates = entries
          .map((e) => (typeof e.main.temp_min === 'number' ? e.main.temp_min : e.main.temp))
          .filter((n) => Number.isFinite(n));
        const maxCandidates = entries
          .map((e) => (typeof e.main.temp_max === 'number' ? e.main.temp_max : e.main.temp))
          .filter((n) => Number.isFinite(n));
        const minT = minCandidates.length ? Math.min(...minCandidates) : Math.min(...entries.map((e) => e.main.temp));
        const maxT = maxCandidates.length ? Math.max(...maxCandidates) : Math.max(...entries.map((e) => e.main.temp));
        const marineForDay = demoMarineHours.filter((h) => h.time && h.time.slice(0, 10) === dateStr);
        const marineSummary = summarizeMarineHours(marineForDay);
        const avgWaveHeight = marineSummary?.waveHeight;
        const avgWaterTemperature = marineSummary?.waterTemperature;
        const avgSwellHeight = marineSummary?.swellHeight;
        const avgSwellPeriod = marineSummary?.swellPeriod;
        const avgMarineWindSpeed = marineSummary?.windSpeed;
        const avgMarineWindDir = marineSummary?.windDirection;
        const avgMarineWindGust = marineSummary?.windGust;
        const avgMarineVisibility = marineSummary?.visibility;
        const avgMarinePrecip = marineSummary?.precipitation;
        const pollenForDate = demoWeather?.pollenByDate?.[dateStr];
        const airQualityForDate = demoWeather?.airQualityByDate?.[dateStr];
        const snowfallRateMmH = noon?.snow?.['3h'] ? Math.max(0, Math.round((noon.snow['3h'] / 3) * 10) / 10) : 0;
        return {
          date: Math.floor(new Date(noon.dt_txt).getTime() / 1000),
          temperature: Math.round(noon.main.temp),
          tempMax: Math.round(maxT),
          tempMin: Math.round(minT),
          condition: noon.weather[0].main,
          description: noon.weather[0].description,
          icon: noon.weather[0].icon,
          rain: typeof avgMarinePrecip === 'number' ? Math.max(0, Math.round(avgMarinePrecip * 10) / 10) : Math.round(noon.rain?.['3h'] || 0),
          wind_speed: typeof avgMarineWindSpeed === 'number' ? avgMarineWindSpeed : noon.wind.speed,
          gust_speed: avgMarineWindGust,
          wind_direction: typeof avgMarineWindDir === 'number' ? avgMarineWindDir : noon.wind.deg,
          clouds: noon.clouds.all,
          humidity: noon.main.humidity,
          visibility: typeof avgMarineVisibility === 'number' ? avgMarineVisibility : (noon.visibility ?? 10000),
          waveHeight: typeof avgWaveHeight === 'number' ? avgWaveHeight : undefined,
          waterTemperature: typeof avgWaterTemperature === 'number' ? avgWaterTemperature : undefined,
          swellHeight: typeof avgSwellHeight === 'number' ? avgSwellHeight : undefined,
          swellPeriod: typeof avgSwellPeriod === 'number' ? avgSwellPeriod : undefined,
          marine: marineForDay,
          pollen: pollenForDate,
          airQuality: airQualityForDate,
          // Optional snow fields for UI and scoring
          ...(snowfallRateMmH > 0 ? { snowfallRateMmH } : {}),
        } as WeatherForecastDay;
      });
  }, [demoWeather, demoMarineHours]);

  useEffect(() => setDemoForecastByDay(forecastByDayMemo), [forecastByDayMemo]);

  // --- build demo suggestions using your scoring pipeline ---
  const activitiesPool = useMemo(() => safeDemoActivities(), []);
  const categoryFiltered = useMemo(() => {
    // Filter activityTypes against curated list for the active tab
    const ids = new Set(CURATED[cat]);
    // If an id in curated does not exist in activityTypes, it will be skipped
    const curated = activityTypes.filter(a => ids.has(a.id));
    // Fallback: if none matched (shouldn't happen), use the original safe subset
    return curated.length ? curated : activitiesPool;
  }, [activitiesPool, cat]);

  const day = demoForecastByDay[activeDay];
  const assessments: ActivitySuggestion[] = useMemo(() => {
    if (!day || categoryFiltered.length === 0) return [];
    const res = getSuggestionsByDay({
      forecast: [
        {
          date: day.date,
          weather: {
            temperature: day.temperature,
            precipitation: day.rain,
            windspeed: day.wind_speed ? Math.round(day.wind_speed * 3.6) : 0,
            clouds: day.clouds,
            humidity: day.humidity,
            visibility: day.visibility,
            waterTemperature: day.waterTemperature,
            waveHeight: day.waveHeight,
            swellHeight: day.swellHeight,
            swellPeriod: day.swellPeriod,
            // Snow-aware fields (optional)
            snowDepthCm: day.snowDepthCm,
            snowfallRateMmH: day.snowfallRateMmH,
          },
        },
      ],
      interests: categoryFiltered.map((a) => a.id),
      activities: categoryFiltered,
      now: new Date(),
      includeAllActivities: true,
      isEveningToday: false,
    })[0];
    const list = (res?.suggestions || []) as ActivitySuggestion[];
    return list.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [day, categoryFiltered]);

  // --- UI ---
  return (
    <main className="min-h-screen bg-base-100">
      {/* COMPACT HERO + TWO-COLUMN DEMO LAYOUT */}
      <section className="px-4 md:px-6 pt-4 pb-2 border-b border-base-200 bg-base-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-bold leading-tight">
              Go Daisy helps you plan your next activity in seconds — matched to this week&apos;s weather.
            </h1>
            <p className="mt-1 text-base-content/80 hidden sm:block">
              See what’s best right now in your area — it&apos;s totally free and you don&apos;t even have to sign up.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/login" className="btn btn-ghost btn-sm md:btn-md" aria-label="Sign in">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm md:btn-md" aria-label="Create account">
              Create account
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* LEFT COLUMN: location + filters */}
        <aside className="md:col-span-4 lg:col-span-4">
          <div className="card bg-base-200 border border-base-300 rounded-2xl">
            <div className="card-body gap-3">
              <div>
                <label className="label"><span className="label-text">Your area</span></label>
                {/* Replace plain input with autocomplete search */}
                <ModernLocationSearch
                  placeholder="Type a place (e.g., Colunga, Asturias)"
                  onSelect={(loc) => {
                    const next = { name: loc.name, lat: loc.lat, lon: loc.lon };
                    setPlace(next);
                    saveHomePref(next);
                    setGeoErr(null);
                  }}
                />
                <div className="text-sm mt-2 text-base-content/70">
                  {cat === 'water' ? (
                    <>Showing marine demo for: <strong>{coastalPlace.name}</strong></>
                  ) : (
                    <>Showing demo for: <strong>{place.name}</strong></>
                  )}
                </div>
                {geoErr && <div className="text-sm mt-1 text-error">{geoErr}</div>}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className={`btn w-full md:w-auto ${busy ? 'loading' : ''}`}
                  onClick={async () => {
                    try {
                      setGeoErr(null);
                      setBusy(true);
                      const c = await getBrowserLocation();
                      setPlace({ name: 'Your current location', lat: c.lat, lon: c.lon });
                      saveHomePref({ name: 'Your current location', lat: c.lat, lon: c.lon });
                    } catch (_err) {
                      setGeoErr('Could not get your location. Try typing a place or use a preset.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? 'Locating…' : 'Use my location'}
                </button>
                {DEMO_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      const next = { name: p.name, lat: p.lat, lon: p.lon };
                      setPlace(next);
                      saveHomePref(next);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {cat === 'water' && (
                <div className="mt-3">
                  <label className="label"><span className="label-text">Your coast</span></label>
                  <ModernLocationSearch
                    placeholder="Type a coastal place (e.g., Fistral Beach, Cornwall)"
                    onSelect={(loc) => {
                      const next = { name: loc.name, lat: loc.lat, lon: loc.lon };
                      setCoastalPlace(next);
                      saveCoastPref(next);
                      setGeoErr(null);
                    }}
                  />
                  <div className="text-xs mt-1 text-base-content/60">Used for water activities (surf, SUP, sea swimming…).</div>
                </div>
              )}

              <div>
                <div className="label"><span className="label-text">Filters</span></div>
                <div className="flex flex-wrap gap-2">
                  {(([
                    ['outdoors', 'Outdoors'],
                    ['water', 'Water'],
                    ['family', 'Family'],
                    ['sports', 'Sports'],
                  ]) as [CategoryKey, string][]).map(([k, label]) => (
                    <button
                      key={k}
                      className={`btn btn-sm ${cat === k ? 'btn-active btn-primary' : ''}`}
                      onClick={() => setCat(k)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divider my-1" />
              <div className="text-xs text-base-content/60">No account needed. Changing location updates the live cards on the right.</div>
              <div className="alert mt-3 bg-base-100 border border-base-300 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-lg" aria-hidden>
                    👋
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">Already using Go Daisy?</div>
                    <div className="text-sm text-base-content/70">Sign in to see your personalised activities and saved places.</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href="/login" className="btn btn-ghost btn-xs" aria-label="Sign in">
                      Sign in
                    </Link>
                    <Link href="/signup" className="btn btn-accent btn-xs" aria-label="Create account">
                      Register
                    </Link>
                  </div>
                </div>
              </div>
              <div className="mt-3 bg-base-100 border border-base-300 rounded-xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">Make it yours</div>
                    <div className="text-sm text-base-content/70">
                      Start onboarding and we’ll carry over <strong>{place.name}</strong>.
                    </div>
                  </div>
                  <Link
                    href={`/onboarding?lat=${encodeURIComponent(String(place.lat))}&lon=${encodeURIComponent(String(place.lon))}&name=${encodeURIComponent(place.name)}&coastLat=${encodeURIComponent(String(coastalPlace.lat))}&coastLon=${encodeURIComponent(String(coastalPlace.lon))}&coastName=${encodeURIComponent(coastalPlace.name)}`}
                    aria-label="Start onboarding"
                  >
                    Start
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: day tabs + cards */}
        <div className="md:col-span-8 lg:col-span-8">
          {/* Day tabs */}
          <div className="flex gap-2 overflow-x-auto mb-3">
            {demoForecastByDay.map((d, idx) => (
              <button
                key={idx}
                className={`tab tab-bordered rounded-xl px-4 py-2 ${activeDay === idx ? 'tab-active' : 'text-base-content'}`}
                onClick={() => setActiveDay(idx)}
              >
                <div className="text-center">
                  <div className="text-sm font-medium">{getDayLabel(d.date, idx)}</div>
                  <div className="text-xs text-base-content/70">
                    {typeof d.tempMax === 'number' && typeof d.tempMin === 'number'
                      ? `${Math.round(d.tempMax)}° / ${Math.round(d.tempMin)}°`
                      : typeof d.temperature === 'number'
                        ? `${Math.round(d.temperature)}°`
                        : '—'}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assessments.length === 0 ? (
              <div className="col-span-full py-10">
                <div className="flex flex-col items-center justify-center gap-2 text-base-content/70">
                  <span className="loading loading-ball loading-xs" aria-label="Updating"></span>
                  <span className="loading loading-ball loading-sm" aria-label="Updating"></span>
                  <span className="loading loading-ball loading-md" aria-label="Updating"></span>
                  <span className="loading loading-ball loading-lg" aria-label="Updating"></span>
                  <span className="loading loading-ball loading-xl" aria-label="Updating"></span>
                  <span className="loading loading-ring loading-lg text-primary" aria-label="Updating" />
                  <span>Updating</span>
                </div>
              </div>
            ) : (
              assessments.map((a) => (
                <ActivityCard
                  key={a.activityId}
                  activityId={a.activityId}
                  score={a.score}
                  day={day}
                  coastalLocation={{ lat: coastalPlace.lat, lon: coastalPlace.lon }}
                  homeLocation={{ lat: place.lat, lon: place.lon }}
                  snow={a.snow}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// Disable static generation since this page uses client-side state
export async function getServerSideProps() {
  return { props: {} };
}
 