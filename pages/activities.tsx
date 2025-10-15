/*
 * Activities Summary Page
 * 
 * This page displays all user-selected activities in a landscape card format,
 * showing weather/marine conditions, assessments, and sharing functionality.
 * Uses the same data pipeline and scoring logic as the homepage for consistency.
 * 
 * Key Features:
 * - Uses getSuggestionsByDay for unified weather/marine data and scoring
 * - Landscape card layout with background images and activity information
 * - Marine vs non-marine activity data display (aligned with popup structure)
 * - Indoor/out-of-season activity tagging
 * - Native sharing API with WhatsApp fallback
 * - Mobile-responsive design with navigation menu
 * - Consistent styling via CSS classes (minimal inline styles for dynamic values)
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import { WeatherForecastDay, MarineHour } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getActivityEmoji } from '../data/emojiMap';
import { getActivityBg } from '../data/bgMap';
import { getOptimizedImageSrc, isImageOptimized } from '../data/bgMapOptimized';
import AppHeader, { LocationLite } from '../components/AppHeader';
import { useHasMounted } from '../utils/useHasMounted';
import { getActivityMessage } from '../data/activityMessages';
import { buildReasons, isOutdoor, isOutOfSeason } from '../utils/activityHelpers';
import {
  getCompassDirection,
} from '../utils/weatherLabels';
import { getBeaufortNumber } from '../utils/beaufort';
import { mpsToKnots, mpsToKmh } from '../utils/weatherUtils';
import WindDirectionIcon from '../components/WindDirectionIcon';
import EnvironmentalIndicators from '../components/EnvironmentalIndicators';
import { resolveBeachOrientationAsync, computeSimulatedOrientation } from '../utils/orientation';
import Footer from '../components/footer'; // <-- add this import
import type { SnowRecommendationLevel } from '../utils/snowRecommendations';
import { useRouter } from 'next/router';


import SimplifiedShareModal from '../components/sharing/SimplifiedShareModal';



// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

// Marine activities that get special marine data display (waves, water temp, etc.)
const MARINE_ACTIVITY_IDS = [
  'surfing', 'kitesurfing', 'windsurfing', 'sea_kayaking', 'canoeing', 
  'snorkeling', 'scuba_diving', 'jet_skiing', 'stand_up_paddleboarding', 'sup_sea', 'sea_swimming',
  'sea_fishing_shore', 'beach', 'beach_volleyball', 'sea_fishing_boat'
];

// Icon paths for consistent weather data display
const humidityIcon = '/weather-icons/design/fill/final/humidity.svg';
const rainIcon = '/weather-icons/design/fill/final/raindrop-measure.svg';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get weather icon URL from OpenWeather icon code
 */
function getWeatherIconUrl(iconCode: string) {
  const supportedIcons = [
    '01d','01n','02d','02n','03d','03n','04d','04n',
    '09d','09n','10d','10n','11d','11n','13d','13n','50d','50n'
  ];
  if (supportedIcons.includes(iconCode)) {
    return `/weather-icons/design/fill/final/${iconCode}.svg`;
  }
  return '/weather-icons/design/fill/final/na.svg';
}

/**
 * Get wind icon based on Beaufort number, using m/s as input
 */
function getWindIcon(windMs: number) {
  const beaufort = getBeaufortNumber(windMs); // Pass m/s directly, function handles conversion
  if (beaufort < 3) return '/weather-icons/design/fill/final/windsock.svg';
  if (beaufort <= 12) return `/weather-icons/design/fill/final/wind-beaufort-${beaufort}.svg`;
  return '/weather-icons/design/fill/final/wind.svg';
}

/**
 * Categorize activity assessment by score
 */
function getAssessmentCategory(score: number, activityId?: string): { 
  status: 'poor' | 'fair' | 'good' | 'perfect' | 'offseason'; 
  color: string; 
  emoji: string; 
} {
  // Check if activity is out of season first
  if (activityId && isOutOfSeason(activityId)) {
    return {
      status: 'offseason',
      color: '#8b5cf6',
      emoji: '🍂'
    };
  }

  if (score >= 90) return { 
    status: 'perfect', 
    color: '#10b981', 
    emoji: '💯'
  };
  if (score >= 60) return { 
    status: 'good', 
    color: '#3b82f6', 
    emoji: '👍'
  };
  if (score >= 30) return { 
    status: 'fair', 
    color: '#f59e0b', 
    emoji: '🙆'
  };
  if (score >= 20) return { 
    status: 'poor', 
    color: '#ef4444', 
    emoji: '⚠️'
  };
  return { 
    status: 'poor', 
    color: '#dc2626', 
    emoji: '💩'
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format day labels for display (Today, Tomorrow, Day Name)
 */
function getDayLabel(dateStr: string | number, idx: number, serverTime?: Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : new Date(dateStr * 1000);
  const today = serverTime || new Date();
  
  const isSameDay = date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  
  if (isSameDay) return 'Today';
  if (idx === 1) return 'Tomorrow';
  
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' });
}

// =============================================================================
// COMPONENTS
// =============================================================================

/**
 * Activity Card Component
 * 
 * Displays individual activity in landscape format with:
 * - Activity title, emoji, and assessment badge
 * - Weather/marine data bars (matching popup structure)
 * - Share functionality with native API fallback
 * - Dynamic background image and assessment colors
 */
interface ActivityCardProps {
  activityId: string;
  score: number;
  evaluation?: string;
  reasoning?: string;
  day: WeatherForecastDay;
  dayLabel: string;
  coastalLocation?: { lat: number; lon: number } | null;
  homeLocation?: { lat: number; lon: number } | null;
  snow?: { level: SnowRecommendationLevel; message: string };
}

function ActivityCard({ activityId, score, evaluation: _evaluation, reasoning: _reasoning, day, dayLabel: _dayLabel, coastalLocation, homeLocation, snow }: ActivityCardProps) {
  console.log('🎯 ActivityCard for:', activityId, 'with day data:', { 
    pollen: day.pollen, 
    airQuality: day.airQuality,
    hasPollenData: !!day.pollen,
    hasAirQualityData: !!day.airQuality 
  });

  // Get activity data and styling
  const activity = activityTypes.find(a => a.id === activityId);
  const assessment = getAssessmentCategory(score, activityId);
  const bgUrl = isImageOptimized(activityId)
    ? getOptimizedImageSrc(activityId, 'webpMobile')
    : getActivityBg(activityId);
  const isMarine = activityId ? MARINE_ACTIVITY_IDS.includes(activityId) : false;
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Determine if this activity should show pollen warnings
  // Exclude marine, winter, and indoor activities as specified
  const winterActivities = ['skiing', 'snowboarding', 'cross_country_skiing', 'ice_skating', 'sledding'];
  const isWinterActivity = winterActivities.includes(activityId);
  const isIndoorActivity = activityId ? !isOutdoor(activityId) : false;
  const shouldShowPollenWarning = !isMarine && !isWinterActivity && !isIndoorActivity;
  
  // Determine if this activity should show air quality warnings
  // Use same exclusion logic as pollen
  const shouldShowAirQualityWarning = !isMarine && !isWinterActivity && !isIndoorActivity;
  
  // Build assessment message using same logic as homepage
  const reasonsStrings = activityId ? buildReasons(day, activityId) : [];
  
  // Convert strings to the expected format for getActivityMessage
  const reasonsObjects = reasonsStrings.map((reason, index) => ({
    key: `reason_${index}`,
    value: true,
    label: reason
  }));
  
  const message = assessment.status === 'offseason' 
    ? `${activity?.name || (activityId ? activityId.replace(/_/g, ' ') : 'Activity')} is out of season right now.`
    : activityId ? getActivityMessage(activityId, assessment.status, reasonsObjects) : "Weather conditions vary - check the details below.";

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  // --- Beach orientation (OSM/cache with simulated fallback) ---
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

  // Helper: show severe snow warnings for all non‑marine; and amber warnings for lifestyle/team
  const SNOW_DANGER_LEVELS = new Set([
    'dangerous', 'unsafe', 'impossible', 'unplayable', 'too_deep', 'snowfall_unsafe'
  ] as const);
  // Amber-levels to optionally show for lifestyle (Outdoor Leisure) and team sports
  // const SNOW_AMBER_LEVELS = new Set([
  //   'caution', 'difficult', 'uncomfortable', 'impractical', 'requires_winter_gear', 'snowfall_caution'
  // ] as const);
  type SnowDangerLevel = typeof SNOW_DANGER_LEVELS extends Set<infer T> ? T : never;
  // type SnowAmberLevel = typeof SNOW_AMBER_LEVELS extends Set<infer T> ? T : never;
  const shouldShowSnowWarning = (aid: string, level?: string) => {
    if (MARINE_ACTIVITY_IDS.includes(aid)) return false; // drop for watersports
    if (!level) return false;
    // Only show banners for severe/dangerous levels
    if (SNOW_DANGER_LEVELS.has(level as SnowDangerLevel)) return true;
    // Previously showed amber levels for lifestyle/team; this is now suppressed to reduce noise
    return false;
  };

  return (
    <article
      className="activity-card activity-card__bg-image"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${bgUrl})`,
      }}
      tabIndex={0}
      role="button"
      aria-label={`${activity?.name || (activityId ? activityId : 'Activity')} - ${assessment.status} conditions`}
    >
      {/* Activity Header */}
      <div className="activity-card__header">
        <div className="activity-card__title-section">
          <span className="activity-card__emoji">
            {activityId ? getActivityEmoji(activityId) : '🏃'}
          </span>
          <h3 className="activity-card__title">
            {activity?.name || (activityId ? activityId.replace(/_/g, ' ') : 'Activity')}
          </h3>
        </div>
        
        {/* Assessment Badge and Share Button */}
        <div className="activity-card__badges">
          <div className={`activity-card__badge ${
            activityId && !isOutdoor(activityId) ? 'activity-card__badge--indoor' : 
            assessment.status === 'offseason' ? 'activity-card__badge--offseason' : ''
          }`} style={{
            background: activityId && !isOutdoor(activityId) ? undefined : assessment.color,
          }}>
            {activityId && !isOutdoor(activityId) ? (
              <>🛋️ indoor</>
            ) : assessment.status === 'offseason' ? (
              <>🍂 offseason</>
            ) : (
              <>{assessment.emoji} {assessment.status}</>
            )}
          </div>
          
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="activity-card__share-btn"
            aria-label={`Share ${activity?.name || activityId}`}
          >
            📤 Share
          </button>
        </div>
      </div>

      {/* Assessment Message - only show for outdoor, in-season activities */}
      {activityId && isOutdoor(activityId) && assessment.status !== 'offseason' && (
        <div className="activity-card__message">
          {message || (score < 40 ? 
            `Not ideal weather for ${activity?.name || (activityId ? activityId.replace(/_/g, ' ') : 'Activity')}, but still an option if you're interested.` : 
            message
          )}
        </div>
      )}

      {/* Inline snow advisory pill */}
      {snow && shouldShowSnowWarning(activityId, snow.level as unknown as string) && (
        <div className={`mt-2 rounded-md px-2 py-1 text-xs inline-flex items-center gap-2 ${
          (/^(snowfall_)?(unsafe|dangerous|impossible|unplayable|too_deep)/.test(String(snow.level)) ? 'bg-red-600 text-white'
           : 'bg-emerald-500 text-white')
        }`}>
          <Image src={String(snow.level).startsWith('snowfall_') ? '/weather-icons/design/fill/final/overcast-snow.svg' : '/weather-icons/design/fill/final/snowman.svg'} alt="Snow advisory" width={18} height={18} />
          <span>{snow.message}</span>
        </div>
      )}

      {/* Weather/Marine Data Bar - matching popup structure */}
      <div className="activity-card__data-bar">
        <ul className="activity-card__data-list">
          {isMarine ? (
            // Marine activities data - match popup order and structure
            <>
              {typeof day.temperature === 'number' && (
                <li className="activity-card__data-item">
                  <Image src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="Air temperature"
                       className="activity-card__data-icon" width={24} height={24} />
                  <strong>{day.temperature.toFixed(1)}°</strong>
                </li>
              )}
              {typeof day.waterTemperature === 'number' && (
                <li className="activity-card__data-item">
                  <Image src="/weather-icons/design/fill/final/thermometer-water.svg" alt="Water temperature"
                       className="activity-card__data-icon" width={24} height={24} />
                  <strong>{day.waterTemperature.toFixed(1)}°</strong>
                </li>
              )}
              {day.icon && (
                <li className="activity-card__data-item">
                  <Image src={getWeatherIconUrl(day.icon)}
                       alt={day.description || 'weather'}
                       className="activity-card__data-icon--lg" width={32} height={32} />
                  {day.description}
                  {typeof day.rain === 'number' && day.rain > 0 && (
                    <>
                      {' '}
                      <Image src={rainIcon} alt="Precipitation"
                           className="activity-card__data-icon" width={24} height={24}
                           style={{ marginLeft: '8px' }} />
                      <strong>{day.rain}mm</strong>
                    </>
                  )}
                </li>
              )}
              {typeof day.waveHeight === 'number' && (
                <li className="activity-card__data-item">
                  🌊 <strong>{day.waveHeight.toFixed(1)}</strong>m
                </li>
              )}
              {typeof day.wind_speed === 'number' && (
                <li className="activity-card__data-item activity-card__data-item--wrap">
                      <Image src={getWindIcon(day.wind_speed)}
                       alt="Wind" className="activity-card__data-icon" width={24} height={24} />
                      <strong>{mpsToKnots(day.wind_speed).toFixed(0)} kn</strong>
                  {day.wind_direction && (
                    <>
                      {' '}({getCompassDirection(day.wind_direction)})
                    </>
                  )}
                  <div className="wind-direction-wrapper">
                    <WindDirectionIcon 
                      deg={day.wind_direction || 0} 
                      size={16} 
                      className="wind-direction-icon" 
                    />
                  </div>
                </li>
              )}
              {typeof day.swellHeight === 'number' && (
                <li className="activity-card__data-item">
                  🏄🏿‍♀️ Swell: <strong>{day.swellHeight.toFixed(1)}</strong>m
                  {typeof day.swellPeriod === 'number' && (
                    <span> ({day.swellPeriod.toFixed(1)}s)</span>
                  )}
                </li>
              )}
              {typeof day.visibility === 'number' && (
                <li className="activity-card__data-item">
                  👀<strong>
                    {day.visibility > 3000
                      ? Math.round(day.visibility / 1000)
                      : (day.visibility / 1000).toFixed(1)}
                  </strong>km
                </li>
              )}
            </>
          ) : (
            // Non-marine activities data
            <>
              {/* High and low temps for non-marine */}
              {(typeof day.tempMax === 'number' || typeof day.tempMin === 'number') && (
                <>
                  {typeof day.tempMax === 'number' && (
                    <li className="activity-card__data-item">
                      <Image src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="High Temperature"
                           className="activity-card__data-icon" width={24} height={24} />
                      <strong>High: {Math.round(day.tempMax)}°</strong>
                    </li>
                  )}
                  {typeof day.tempMin === 'number' && (
                    <li className="activity-card__data-item">
                      <Image src="/weather-icons/design/fill/final/thermometer-colder.svg" alt="Low Temperature"
                           className="activity-card__data-icon" width={24} height={24} />
                      <strong>Low: {Math.round(day.tempMin)}°</strong>
                    </li>
                  )}
                </>
              )}
              {/* Average temp for non-marine if no high/low */}
              {typeof day.temperature === 'number' && !day.tempMax && !day.tempMin && (
                <li className="activity-card__data-item">
                  <Image src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="Temperature"
                       className="activity-card__data-icon" width={24} height={24} />
                  <strong>{Math.round(day.temperature)}°</strong>
                </li>
              )}
              {day.icon && (
                <li className="activity-card__data-item">
                  <Image src={getWeatherIconUrl(day.icon)}
                       alt={day.description || 'weather'}
                       className="activity-card__data-icon--lg" width={32} height={32} />
                  {day.description}
                  {typeof day.rain === 'number' && day.rain > 0 && (
                    <>
                      {' '}
                      <Image src={rainIcon} alt="Precipitation"
                           className="activity-card__data-icon" width={24} height={24}
                           style={{ marginLeft: '8px' }} />
                      <strong>{day.rain}mm</strong>
                    </>
                  )}
                </li>
              )}
              {typeof day.wind_speed === 'number' && (
                <li className="activity-card__data-item">
                  <Image src={getWindIcon(day.wind_speed)} alt="Wind"
                       className="activity-card__data-icon" width={24} height={24} />
                  <strong>{getBeaufortNumber(day.wind_speed)} Bft</strong>
                  <span className="wind-speed-additional">
                    ({mpsToKnots(day.wind_speed).toFixed(0)} kn, {mpsToKmh(day.wind_speed).toFixed(0)} km/h)
                  </span>
                  {day.wind_direction && (
                    <>
                      {' '}({getCompassDirection(day.wind_direction)})
                    </>
                  )}
                  <div className="wind-direction-wrapper">
                    <WindDirectionIcon 
                      deg={day.wind_direction || 0} 
                      size={16} 
                      className="wind-direction-icon"
                    />
                  </div>
                </li>
              )}
              {typeof day.humidity === 'number' && (
                <li className="activity-card__data-item">
                  <Image src={humidityIcon} alt="Humidity"
                       className="activity-card__data-icon" width={24} height={24} />
                  <strong>{day.humidity}%</strong>
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
              ) : (
                ((typeof day.snowDepthCm === 'number' && day.snowDepthCm > 0) || (typeof day.snowfallRateMmH === 'number' && day.snowfallRateMmH > 0)) ? (
                  <li className="activity-card__data-item">
                    <EnvironmentalIndicators 
                      mode="compact"
                      snowDepthCm={day.snowDepthCm}
                      snowfallRateMmH={day.snowfallRateMmH}
                    />
                  </li>
                ) : null
              )}
            </>
          )}
        </ul>
      </div>

      {/* Score Display */}
      <div className="activity-card__score">
        Score: {score}%
      </div>

      {/* Share Modal */}
      <SimplifiedShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        activityName={activity?.name || (activityId ? activityId.replace(/_/g, ' ') : 'Activity')}
        activityMessage={message}
        activityDescription={assessment.status !== 'offseason' ? reasonsObjects.map(r => r.title).join(', ') : undefined}
        activityEmoji={activityId ? getActivityEmoji(activityId) : '🎉'}
      />
      </article>
    );
}

/**
 * Day Tabs Component
 * 
 * Navigation tabs for switching between forecast days.
 * Shows day label and temperature for each day.
 */
interface DayTabsProps {
  days: WeatherForecastDay[];
  activeDay: number;
  onDayChange: (dayIndex: number) => void;
  serverTime?: Date;
}

function DayTabs({ days, activeDay, onDayChange, serverTime }: DayTabsProps) {
  return (
    <nav
      role="tablist"
      className="day-tabs"
      aria-label="Forecast days"
    >
      {days.map((day, idx) => (
        <button
          key={day.date}
          role="tab"
          aria-selected={activeDay === idx}
          aria-controls={`day-panel-${idx}`}
          id={`day-tab-${idx}`}
          className={`day-tab ${activeDay === idx ? 'active' : ''}`}
          onClick={() => onDayChange(idx)}
        >
          <div className="text-center">
            <div className="day-tab__label">
              {getDayLabel(day.date, idx, serverTime)}
            </div>
            <div className="day-tab__date">
              {day.temperature}°
            </div>
          </div>
        </button>
      ))}
    </nav>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Activities Summary Page Component
 * 
 * Main page component that:
 * - Fetches weather and marine data using same pipeline as homepage
 * - Generates activity assessments using getSuggestionsByDay
 * - Displays activities in landscape cards with detailed weather/marine data
 * - Provides day-by-day navigation and sharing functionality
 * - Ensures all selected interests appear even if conditions are poor
 */
export default function ActivitiesPage() {
  // =============================================================================
  // STATE & CONTEXT
  // =============================================================================
  
  const hasMounted = useHasMounted();
  const { preferences } = useUserPreferences();
  const homeLocation = preferences.locations?.find((loc) => loc.type === 'home');
  const coastalLocation = preferences.locations?.find((loc) => loc.type === 'coastal');
  const interests = preferences.interests ?? [];

  // Router/query-based preview overrides
  const router = useRouter();
  const previewSnowCmRaw = typeof router.query.previewSnowCm === 'string'
    ? router.query.previewSnowCm
    : (typeof router.query.snowDepthCm === 'string' ? router.query.snowDepthCm : undefined);
  const previewSnowCm = previewSnowCmRaw !== undefined ? Number(previewSnowCmRaw) : undefined;
  const previewSnowfallRaw = typeof router.query.previewSnowfallMmH === 'string'
    ? router.query.previewSnowfallMmH
    : (typeof router.query.previewSnowfall === 'string' ? router.query.previewSnowfall
       : (typeof router.query.snowfallRateMmH === 'string' ? router.query.snowfallRateMmH : undefined));
  const previewSnowfallMmH = previewSnowfallRaw !== undefined ? Number(previewSnowfallRaw) : undefined;
  const useAllActivities = router.query.allActivities === '1' || router.query.all === '1';
  const selectedInterests = useAllActivities ? activityTypes.map(a => a.id) : interests;

  // UI state
  const [activeDay, setActiveDay] = useState(0);
  type TimeInfo = { serverTime: Date; isEvening: boolean } | null;
  const [timeInfo, setTimeInfo] = useState<TimeInfo>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Weather & marine data (same as homepage pipeline)
  type WeatherWithPollen = {
    list: Array<{
      dt_txt: string;
      main: { temp: number; humidity: number; pressure: number; temp_min?: number; temp_max?: number };
      weather: Array<{ main: string; description: string; icon: string }>;
      rain?: { '3h'?: number };
      snow?: { '3h'?: number };
      wind: { speed: number; deg: number; gust?: number };
      clouds: { all: number };
      visibility?: number;
    }>;
    pollenByDate?: Record<string, Record<string, number>>;
    airQualityByDate?: Record<string, Record<string, number>>;
  } | null;
  const [weatherData, setWeatherData] = useState<WeatherWithPollen>(null);
  const [marineHours, setMarineHours] = useState<MarineHour[]>([]);
  const [loading, setLoading] = useState(true);

  const needsLocation = !homeLocation?.lat || !homeLocation?.lon;
  const needsInterests = selectedInterests.length === 0;

  // =============================================================================
  // DATA FETCHING (Same pipeline as homepage)
  // =============================================================================

  // Initialize time context
  useEffect(() => {
    if (!hasMounted) return;
    
    const now = new Date();
    setTimeInfo({
      serverTime: now,
      isEvening: now.getHours() >= 18
    });
  }, [hasMounted]);

  // Fetch weather data with pollen information (enhanced from OpenWeather + Open-Meteo)
  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!homeLocation?.lat || !homeLocation?.lon) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch merged weather data including pollen
        const weatherResponse = await fetch(`/api/weather-with-pollen?lat=${homeLocation.lat}&lon=${homeLocation.lon}`, {
          cache: 'no-store'
        });

        if (!weatherResponse.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const weatherData = await weatherResponse.json();
        setWeatherData(weatherData);

      } catch (err) {
        console.error('Error fetching forecast ', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [homeLocation?.lat, homeLocation?.lon]);

  // Fetch Stormglass marine data (for marine activities)
  useEffect(() => {
    const fetchMarineData = async () => {
      try {
        // Get coastal or home location
        const lat = coastalLocation?.lat ?? homeLocation?.lat;
        const lon = coastalLocation?.lon ?? homeLocation?.lon;
        
        if (!lat || !lon) return;
        
        // Use Unix timestamps (seconds)
        const now = new Date();
        const startTime = Math.floor(now.getTime() / 1000);
        const endTime = startTime + (5 * 24 * 60 * 60); // 5 days later
        
        const res = await fetch(`/api/marine?lat=${lat}&lon=${lon}&start=${startTime}&end=${endTime}`);
        if (!res.ok) throw new Error(`Failed to fetch marine data: ${res.statusText}`);
        
        const data = await res.json();
        setMarineHours(data.hours || []);
      } catch (err) {
        console.error("Marine data error:", err);
      }
    };

    if ((coastalLocation?.lat && coastalLocation?.lon) || (homeLocation?.lat && homeLocation?.lon)) {
      fetchMarineData();
    }
  }, [coastalLocation, homeLocation]);

  // =============================================================================
  // DATA PROCESSING (Same logic as homepage)
  // =============================================================================

  // Build forecast data from merged weather data (includes pollen)
  const forecastByDay: WeatherForecastDay[] = React.useMemo(() => {
    if (!weatherData || !weatherData.list) return [];

    // Group OpenWeather forecast data by date (same logic as homepage)
    type ForecastEntry = NonNullable<WeatherWithPollen>['list'][number];
    const grouped: Record<string, ForecastEntry[]> = {};
    weatherData.list.forEach((item: ForecastEntry) => {
      const date = item.dt_txt.split(' ')[0]; // YYYY-MM-DD
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });

    // Build forecast for up to 5 days
    return Object.entries(grouped)
      .slice(0, 5)
      .map(([dateStr, dayEntries], dayIndex) => {
        // Use noon entry as representative for the day, or first if noon not available
        const noonEntry: ForecastEntry = dayEntries.find((e: ForecastEntry) => e.dt_txt.includes('12:00:00')) ?? dayEntries[0];
        
        // Calculate min/max temps across the day
        // Prefer main.temp_min/max (present when list is derived from One Call daily)
        const minCandidates = dayEntries
          .map((entry: ForecastEntry) => (typeof entry.main.temp_min === 'number' ? entry.main.temp_min : entry.main.temp))
          .filter((n) => Number.isFinite(n));
        const maxCandidates = dayEntries
          .map((entry: ForecastEntry) => (typeof entry.main.temp_max === 'number' ? entry.main.temp_max : entry.main.temp))
          .filter((n) => Number.isFinite(n));
        const minTemp = minCandidates.length ? Math.min(...minCandidates) : Math.min(...dayEntries.map((e: ForecastEntry) => e.main.temp));
        const maxTemp = maxCandidates.length ? Math.max(...maxCandidates) : Math.max(...dayEntries.map((e: ForecastEntry) => e.main.temp));
        
        // Get marine data for this day
        const marineForDay = marineHours.filter((h) => h.time && h.time.slice(0, 10) === dateStr);
        
        // Get pollen data for this date
        const pollenForDate = weatherData.pollenByDate?.[dateStr];
        
        // Get air quality data for this date
        const airQualityForDate = weatherData.airQualityByDate?.[dateStr];
        
        console.log(`📊 Day ${dayIndex} (${dateStr}):`, { 
          pollenForDate, 
          airQualityForDate,
          hasPollenData: !!pollenForDate && Object.values(pollenForDate).some((v) => Number(v) > 0),
          hasAirQualityData: !!airQualityForDate && Object.values(airQualityForDate).some((v) => Number(v) > 0)
        });
        
        const snowfallRateMmH = noonEntry?.snow?.['3h'] ? Math.max(0, Math.round(((noonEntry.snow['3h'] as number) / 3) * 10) / 10) : 0;
        
        return {
          date: Math.floor(new Date(noonEntry.dt_txt).getTime() / 1000),
          temperature: Math.round(noonEntry.main.temp),
          tempMax: Math.round(maxTemp),
          tempMin: Math.round(minTemp),
          condition: noonEntry.weather[0].main,
          description: noonEntry.weather[0].description,
          icon: noonEntry.weather[0].icon,
          rain: Math.round(noonEntry.rain?.['3h'] || 0),
          wind_speed: noonEntry.wind.speed, // OpenWeather provides m/s - keep in m/s for consistency
          wind_direction: noonEntry.wind.deg,
          clouds: noonEntry.clouds.all,
          humidity: noonEntry.main.humidity,
          visibility: noonEntry.visibility ?? 10000,
          waveHeight: undefined,
          waterTemperature: undefined,
          marine: marineForDay,
          pollen: pollenForDate,
          airQuality: airQualityForDate,
          ...(snowfallRateMmH > 0 ? { snowfallRateMmH } : {}),
          ...(Number.isFinite(previewSnowfallMmH) && (previewSnowfallMmH as number) > 0 ? { snowfallRateMmH: previewSnowfallMmH as number } : {}),
          ...(Number.isFinite(previewSnowCm) && (previewSnowCm as number) > 0 ? { snowDepthCm: previewSnowCm as number } : {}),
        } as WeatherForecastDay;
      });
  }, [weatherData, marineHours, previewSnowCm, previewSnowfallMmH]);

  // =============================================================================
  // ACTIVITY ASSESSMENT (Same scoring logic as homepage)
  // =============================================================================
  
  // Calculate evening context
  const now = timeInfo?.serverTime || new Date();
  const isEveningToday = now.getHours() >= 18 && activeDay === 0;

  // Generate activity assessments for the selected day
  const currentDayData = forecastByDay[activeDay];
  
  // Debug logging for out-of-season detection (current date is August 17, 2025)
  console.log('🗓️ Out-of-season check:', {
    currentDate: new Date(),
    currentMonth: new Date().getMonth() + 1,
    interests: selectedInterests,
    outOfSeasonActivities: selectedInterests.filter(id => isOutOfSeason(id))
  });
  
  // Debug logging for scoring issues
  if (currentDayData && selectedInterests.includes('basketball_outdoor')) {
    console.log('🏀 Basketball scoring debug:', {
      temperature: currentDayData.temperature,
      rain: currentDayData.rain,
      wind_speed_ms: currentDayData.wind_speed,
      wind_speed_kmh: currentDayData.wind_speed ? Math.round(currentDayData.wind_speed * 3.6) : 0,
      clouds: currentDayData.clouds,
      humidity: currentDayData.humidity,
      visibility: currentDayData.visibility
    });
  }
  
  const dayAssessments = currentDayData ? getSuggestionsByDay({
    forecast: [{
      date: currentDayData.date,
      weather: {
        temperature: currentDayData.temperature,
        precipitation: currentDayData.rain,
        windspeed: currentDayData.wind_speed ? Math.round(currentDayData.wind_speed * 3.6) : 0, // Convert m/s to km/h
        clouds: currentDayData.clouds,
        humidity: currentDayData.humidity,
        visibility: currentDayData.visibility,
        waterTemperature: currentDayData.waterTemperature,
        waveHeight: currentDayData.waveHeight,
        swellHeight: currentDayData.swellHeight,
        swellPeriod: currentDayData.swellPeriod,
        // Snow-aware fields (optional)
        snowDepthCm: currentDayData.snowDepthCm,
        snowfallRateMmH: currentDayData.snowfallRateMmH,
      }
    }],
    interests: selectedInterests,
    activities: activityTypes.filter(a => selectedInterests.includes(a.id)),
    now: timeInfo?.serverTime || new Date(),
    includeAllActivities: true,
    isEveningToday: isEveningToday
  })[0] : null;

  type ActivitySuggestion = { activityId: string; score: number; evaluation?: string; reasoning?: string; outOfSeason?: boolean; snow?: { level: SnowRecommendationLevel; message: string } };
  const activities: ActivitySuggestion[] = (dayAssessments?.suggestions as ActivitySuggestion[]) || [];

  // Make sure ALL selected interests appear in the activities list
  if (selectedInterests.length > 0 && currentDayData) {
    const existingActivityIds = activities.map((a) => a.activityId);
    const missingInterests = selectedInterests.filter((id: string) => !existingActivityIds.includes(id));
    
    if (missingInterests.length > 0) {
      const missingActivities = missingInterests.map(id => {
        const activity = activityTypes.find(a => a.id === id);
        if (!activity) return null;
        
        return {
          activityId: id,
          score: 50,
          evaluation: 'Available option',
          reasoning: 'Conditions vary, but available based on your interests',
          outOfSeason: false
        };
      }).filter((a): a is Exclude<typeof a, null> => a !== null);
      
      activities.push(...missingActivities);
    }
  }

  // Filter out any activities with undefined activityId first to prevent errors
  const validActivities = activities.filter((a): a is ActivitySuggestion => !!a && !!a.activityId);

  // Sort activities by priority: perfect, good, fair, poor, indoor, offseason
  const sortedActivities = validActivities.sort((a, b) => {
    const getActivityPriority = (activityId: string, score: number) => {
      if (!activityId) return 4; // fallback to poor priority if no activityId
      if (!isOutdoor(activityId)) return 5; // indoor
      if (isOutOfSeason(activityId)) return 6; // offseason
      
      // Weather-based priorities
      if (score >= 90) return 1; // perfect
      if (score >= 60) return 2; // good
      if (score >= 30) return 3; // fair
      return 4; // poor
    };

    const priorityA = getActivityPriority(a.activityId, a.score);
    const priorityB = getActivityPriority(b.activityId, b.score);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Within same category, sort by score (highest first)
    return b.score - a.score;
  });

  // Pre-hydration loading state
  if (!hasMounted) {
    return (
      <>
        <AppHeader
          homeLocation={homeLocation as LocationLite | undefined}
          coastalLocation={coastalLocation as LocationLite | undefined}
          onOpenHomeDialog={() => { /* optional: open home dialog from activities if you have one */ }}
          onOpenCoastDialog={() => { /* optional: open coast dialog from activities if you have one */ }}
        />
        <section className="flex items-center justify-center py-16">
          <div className="flex items-center">
            <span className="loading loading-dots loading-lg text-secondary" aria-hidden="true"></span>
            <span className="ml-3 text-base-content/80">Planning perfect days</span>
          </div>
        </section>
        <Footer /> {/* <-- add footer in loading state */}
      </>
    );
  }

  return (
    <>
      {/* ✅ ADD HEADER BANNER */}
      <AppHeader
        homeLocation={homeLocation as LocationLite | undefined}
        coastalLocation={coastalLocation as LocationLite | undefined}
        onOpenHomeDialog={() => { /* optional: open home dialog from activities if you have one */ }}
        onOpenCoastDialog={() => { /* optional: open coast dialog from activities if you have one */ }}
      />

      {/* EXISTING ACTIVITIES CONTENT */}
      <section style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Error States */}
        {needsLocation && (
          <div style={{ 
            textAlign: 'center' as const, 
            padding: '3rem', 
            background: '#fef2f2', 
            borderRadius: '8px',
            border: '1px solid #fecaca' 
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📍</div>
            <h2 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Location Required</h2>
            <p style={{ color: '#7f1d1d' }}>
              Please set your location on the homepage to view activity assessments.
            </p>
            <Link 
              href="/" 
              style={{ 
                display: 'inline-block',
                marginTop: '1rem',
                padding: '8px 16px',
                background: '#dc2626',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 600
              }}
            >
              Go to Homepage
            </Link>
          </div>
        )}

        {needsInterests && !needsLocation && (
          <div style={{ 
            textAlign: 'center' as const, 
            padding: '3rem', 
            background: '#fefbf2', 
            borderRadius: '8px',
            border: '1px solid #fed7aa' 
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
            <h2 style={{ color: '#d97706', marginBottom: '0.5rem' }}>No Activities Selected</h2>
            <p style={{ color: '#92400e' }}>
              Choose your outdoor interests to see personalised activity assessments.
            </p>
            <Link 
              href="/interests" 
              style={{ 
                display: 'inline-block',
                marginTop: '1rem',
                padding: '8px 16px',
                background: '#d97706',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 600
              }}
            >
              Choose Activities
            </Link>
          </div>
        )}

        {/* Main Content */}
        {!needsLocation && !needsInterests && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <span className="loading loading-dots loading-lg text-secondary" aria-hidden="true"></span>
                <span className="ml-3 text-base-content/80">Planning perfect days</span>
              </div>
            ) : error ? (
              <div style={{ 
                textAlign: 'center' as const, 
                padding: '3rem', 
                background: '#fef2f2', 
                borderRadius: '8px',
                border: '1px solid #fecaca' 
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
                <div style={{ color: '#dc2626' }}>{error}</div>
              </div>
            ) : (
              <>
                {/* Day Navigation Tabs */}
                <DayTabs
                  days={forecastByDay}
                  activeDay={activeDay}
                  onDayChange={setActiveDay}
                  serverTime={timeInfo?.serverTime}
                />

                {/* Activity Cards Grid */}
                <main
                  role="tabpanel"
                  id={`${'day-panel-'}${String(activeDay)}`}
                  aria-labelledby={`${'day-tab-'}${String(activeDay)}`}
                  className="activities-grid"
                >
                  {sortedActivities.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state__icon">🤔</div>
                      <div className="empty-state__text">
                        No activity data available for {getDayLabel(currentDayData?.date || 0, activeDay, timeInfo?.serverTime)}
                      </div>
                    </div>
                  ) : (
                    sortedActivities
                      .filter((activity) => activity && activity.activityId) // Filter out any activities with undefined activityId
                      .map((activity) => (
                       <ActivityCard
                         key={activity.activityId}
                         activityId={activity.activityId}
                         score={activity.score}
                         evaluation={activity.evaluation}
                         reasoning={activity.reasoning}
                         day={currentDayData}
                         dayLabel={getDayLabel(currentDayData?.date || 0, activeDay, timeInfo?.serverTime)}
                         coastalLocation={coastalLocation}
                         homeLocation={homeLocation}
                         snow={activity.snow}
                       />
                     ))
                   )}
                 </main>

               
              </>
            )}
          </>
        )}
      </section>

      <Footer /> {/* <-- add footer in main state */}
    </>
  );
}
