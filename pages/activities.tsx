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
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getActivityEmoji } from '../data/emojiMap';
import { getActivityBg } from '../data/bgMap';
import { useHasMounted } from '../utils/useHasMounted';
import { getActivityMessage } from '../data/activityMessages';
import { buildReasons, isOutdoor, isOutOfSeason } from '../utils/activityHelpers';
import {
  getCompassDirection,
} from '../utils/weatherLabels';
import { getBeaufortNumber } from '../utils/beaufort';
import { mpsToKnots, mpsToKmh } from '../utils/weatherUtils';
import WindDirectionIcon from '../components/WindDirectionIcon';
import PollenWarning from '../components/PollenWarning';
import AirQualityWarning from '../components/AirQualityWarning';
import EnvironmentalIndicators from '../components/EnvironmentalIndicators';
import { resolveBeachOrientationAsync, computeSimulatedOrientation, classifyWindRelative } from '../utils/orientation';
import { assessPollenConditions, PollenSummary } from '../utils/pollenUtils';
import { assessAirQualityConditions, AirQualitySummary } from '../utils/airQualityUtils';
// TODO: Uncomment when the sharing feature is merged
// import { ShareModal } from '../components/sharing/NewShareModal';



// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

// Marine activities that get special marine data display (waves, water temp, etc.)
const MARINE_ACTIVITY_IDS = [
  'surfing', 'kitesurfing', 'windsurfing', 'sea_kayaking', 'canoeing', 
  'snorkeling', 'scuba_diving', 'jet_skiing', 'stand_up_paddleboarding', 'sea_swimming',
  'sea_fishing_shore', 'beach', 'beach_volleyball', 'sea_fishing_boat'
];

// Icon paths for consistent weather data display
const thermometerIcon = '/weather-icons/design/fill/final/thermometer-celsius.svg';
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
 * Check if wind icon needs glow effect (only numbered Beaufort icons have dark text)
 */
function windIconNeedsGlow(windMs: number) {
  const beaufort = getBeaufortNumber(windMs);
  return beaufort >= 3 && beaufort <= 12;
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

/**
 * Share activity with native share API or WhatsApp fallback
 */
function shareActivity(activityId: string, score: number, dayLabel: string) {
  const activity = activityTypes.find(a => a.id === activityId);
  const activityName = activity?.name || (activityId ? activityId.replace(/_/g, ' ') : 'Activity');
  const assessment = getAssessmentCategory(score, activityId);
  
  const text = `🌤️ ${activityName} looks ${assessment.status} for ${dayLabel}! Score: ${score}% - Check out WotNow for more activity suggestions.`;
  const url = window.location.origin;
  
  if (navigator.share) {
    navigator.share({
      title: `WotNow - ${activityName} ${dayLabel}`,
      text: text,
      url: url,
    }).catch(err => {
      // Silent fail - sharing is optional
    });
  } else {
    // Fallback to WhatsApp
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    window.open(whatsappUrl, '_blank');
  }
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
  evaluation: string;
  reasoning?: string;
  day: WeatherForecastDay;
  dayLabel: string;
  coastalLocation?: { lat: number; lon: number } | null;
  homeLocation?: { lat: number; lon: number } | null;
}

function ActivityCard({ activityId, score, evaluation, reasoning, day, dayLabel, coastalLocation, homeLocation }: ActivityCardProps) {
  console.log('🎯 ActivityCard for:', activityId, 'with day data:', { 
    pollen: day.pollen, 
    airQuality: day.airQuality,
    hasPollenData: !!day.pollen,
    hasAirQualityData: !!day.airQuality 
  });

  // Get activity data and styling
  const activity = activityTypes.find(a => a.id === activityId);
  const assessment = getAssessmentCategory(score, activityId);
  const bgUrl = getActivityBg(activityId);
  const isMarine = activityId ? MARINE_ACTIVITY_IDS.includes(activityId) : false;
  // TODO: Uncomment when the sharing feature is merged
  // const [shareModalData, setShareModalData] = useState<{activityId: string, activityName: string} | null>(null);
  
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

  // TODO: Uncomment when the sharing feature is merged
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // setShareModalData({
    //   activityId,
    //   activityName: activity?.name || (activityId ? activityId.replace(/_/g, ' ') : 'Activity')
    // });
    // For now, just prevent the default action
    console.log('Sharing feature not yet available');
  };

  // --- Beach orientation (OSM/cache with simulated fallback) ---
  const [resolvedOrientation, setResolvedOrientation] = useState<number | undefined>(undefined);
  const [orientationVia, setOrientationVia] = useState<string | undefined>(undefined);

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
        // @ts-ignore via is included by our util patch
        const via = (res as any).via || res.source;
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

      {/* Weather/Marine Data Bar - matching popup structure */}
      <div className="activity-card__data-bar">
        <ul className="activity-card__data-list">
          {isMarine ? (
            // Marine activities data - match popup order and structure
            <>
              {typeof day.temperature === 'number' && (
                <li className="activity-card__data-item">
                  <img src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="Air temperature"
                       className="activity-card__data-icon" />
                  <strong>{day.temperature.toFixed(1)}°</strong>
                </li>
              )}
              {typeof day.waterTemperature === 'number' && (
                <li className="activity-card__data-item">
                  <img src="/weather-icons/design/fill/final/thermometer-water.svg" alt="Water temperature"
                       className="activity-card__data-icon" />
                  <strong>{day.waterTemperature.toFixed(1)}°</strong>
                </li>
              )}
              {day.icon && (
                <li className="activity-card__data-item">
                  <img src={getWeatherIconUrl(day.icon)}
                       alt={day.description || 'weather'}
                       className="activity-card__data-icon--lg" />
                  {day.description}
                  {typeof day.rain === 'number' && day.rain > 0 && (
                    <>
                      {' '}
                      <img src={rainIcon} alt="Precipitation"
                           className="activity-card__data-icon" 
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
                  <img src={getWindIcon(day.wind_speed)}
                       alt="Wind" 
                       className={`activity-card__data-icon--lg ${windIconNeedsGlow(day.wind_speed) ? 'activity-card__wind-icon--glow' : ''}`} />
                  <strong>{Math.round(mpsToKnots(day.wind_speed))}</strong>knots
                  {typeof day.gust_speed === 'number' && day.gust_speed !== day.wind_speed && (
                    <span> (gust {mpsToKnots(day.gust_speed).toFixed(1)} knots)</span>
                  )}
                  {typeof day.wind_direction === 'number' && (
                    <>
                      <WindDirectionIcon deg={day.wind_direction} />
                      <span className="font-weight-600">
                        {getCompassDirection(day.wind_direction)}
                      </span>
                    </>
                  )}
                  {typeof day.wind_direction === 'number' && typeof resolvedOrientation === 'number' && (
                    <>
                      {' '}
                      <span>({classifyWindRelative(resolvedOrientation, day.wind_direction)})</span>
                      {orientationVia && orientationVia !== 'computed' && (
                        <em style={{ marginLeft: 6, opacity: 0.75 }}>
                          ({orientationVia === 'simulated' ? 'sim' : orientationVia})
                        </em>
                      )}
                    </>
                  )}
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
            // Non-marine activities data - match popup order and structure
            <>
              {typeof day.tempMax === 'number' && (
                <li className="activity-card__data-item">
                  <img src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="High Temperature"
                       className="activity-card__data-icon" />
                  <strong>H: {day.tempMax}°</strong>
                </li>
              )}
              {typeof day.tempMin === 'number' && (
                <li className="activity-card__data-item">
                  <img src="/weather-icons/design/fill/final/thermometer-colder.svg" alt="Low Temperature"
                       className="activity-card__data-icon" />
                  <strong>L: {day.tempMin}°</strong>
                </li>
              )}
              {typeof day.temperature === 'number' &&
               typeof day.tempMin === 'undefined' &&
               typeof day.tempMax === 'undefined' && (
                <li className="activity-card__data-item">
                  <img src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="Temperature"
                       className="activity-card__data-icon" />
                  <strong>{day.temperature}°</strong>
                </li>
              )}
              {day.icon && (
                <li className="activity-card__data-item">
                  <img src={getWeatherIconUrl(day.icon)}
                       alt={day.description || 'weather'}
                       className="activity-card__data-icon--lg" />
                  {day.description}
                  {typeof day.rain === 'number' && day.rain > 0 && (
                    <>
                      {' '}
                      <img src={rainIcon} alt="Precipitation"
                           className="activity-card__data-icon" 
                           style={{ marginLeft: '8px' }} />
                      <strong>{day.rain}mm</strong>
                    </>
                  )}
                </li>
              )}
              {typeof day.wind_speed === 'number' && (
                <li className="activity-card__data-item activity-card__data-item--wrap">
                  <img src={getWindIcon(day.wind_speed)} alt="Wind"
                       className={`activity-card__data-icon--lg ${windIconNeedsGlow(day.wind_speed) ? 'activity-card__wind-icon--glow' : ''}`} />
                  <strong>{Math.round(mpsToKmh(day.wind_speed))}km/h</strong>
                  {typeof day.wind_direction === 'number' && (
                    <>
                      <WindDirectionIcon deg={day.wind_direction} />
                      <span className="font-weight-600">
                        {getCompassDirection(day.wind_direction)}
                      </span>
                    </>
                  )}
                </li>
              )}
              {typeof day.humidity === 'number' && (
                <li className="activity-card__data-item">
                  <img src={humidityIcon} alt="Humidity"
                       className="activity-card__data-icon" />
                  <strong>{day.humidity}%</strong>
                </li>
              )}
              {(shouldShowPollenWarning && day.pollen) || (shouldShowAirQualityWarning && day.airQuality) ? (
                <li className="activity-card__data-item">
                  <EnvironmentalIndicators 
                    pollen={shouldShowPollenWarning ? day.pollen : undefined}
                    airQuality={shouldShowAirQualityWarning ? day.airQuality : undefined}
                    mode="compact"
                  />
                </li>
              ) : null}
            </>
          )}
        </ul>
      </div>

      {/* Score Display */}
      <div className="activity-card__score">
        Score: {score}%
      </div>        {/* Share Modal */}
        {/* TODO: Uncomment when the sharing feature is merged
        {shareModalData && (
          <ShareModal
            activityId={shareModalData.activityId}
            activityName={shareModalData.activityName}
            onClose={() => setShareModalData(null)}
          />
        )}
        */}
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

  // UI state
  const [activeDay, setActiveDay] = useState(0);
  const [timeInfo, setTimeInfo] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Weather & marine data (same as homepage pipeline)
  const [weatherData, setWeatherData] = useState<any>(null);
  const [marineHours, setMarineHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const needsLocation = !homeLocation?.lat || !homeLocation?.lon;
  const needsInterests = interests.length === 0;

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
    const grouped: Record<string, any[]> = {};
    weatherData.list.forEach((item: any) => {
      const date = item.dt_txt.split(' ')[0]; // YYYY-MM-DD
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });

    // Build forecast for up to 5 days
    return Object.entries(grouped)
      .slice(0, 5)
      .map(([dateStr, dayEntries]: [string, any[]], dayIndex) => {
        // Use noon entry as representative for the day, or first if noon not available
        const noonEntry = dayEntries.find((e) => e.dt_txt.includes('12:00:00')) ?? dayEntries[0];
        
        // Calculate min/max temps across all hours of the day
        const allTemps = dayEntries.map(entry => entry.main.temp);
        const minTemp = Math.min(...allTemps);
        const maxTemp = Math.max(...allTemps);
        
        // Get marine data for this day
        const marineForDay = marineHours.filter(
          (h: any) => h.time && h.time.slice(0, 10) === dateStr
        );
        
        // Get pollen data for this date
        const pollenForDate = weatherData.pollenByDate?.[dateStr];
        
        // Get air quality data for this date
        const airQualityForDate = weatherData.airQualityByDate?.[dateStr];
        
        console.log(`📊 Day ${dayIndex} (${dateStr}):`, { 
          pollenForDate, 
          airQualityForDate,
          hasPollenData: !!pollenForDate && Object.values(pollenForDate).some((v: any) => v > 0),
          hasAirQualityData: !!airQualityForDate && Object.values(airQualityForDate).some((v: any) => v > 0)
        });
        
        return {
          date: Math.floor(new Date(noonEntry.dt_txt).getTime() / 1000),
          temperature: Math.round(noonEntry.main.temp),
          tempMax: Math.round(maxTemp),
          tempMin: Math.round(minTemp),
          condition: noonEntry.weather[0].main,
          description: noonEntry.weather[0].description,
          icon: noonEntry.weather[0].icon,
          rain: Math.round(noonEntry.rain?.['3h'] || 0),
          wind_speed: noonEntry.wind.speed,        
          gust_speed: noonEntry.wind.gust || noonEntry.wind.speed,
          wind_direction: noonEntry.wind.deg,
          wind_directions_today: [noonEntry.wind.deg],
          clouds: noonEntry.clouds.all,
          humidity: noonEntry.main.humidity,
          visibility: noonEntry.visibility ?? 10000,
          pressure: noonEntry.main.pressure,
          waveHeight: marineForDay.length > 0 ? marineForDay[0].waveHeight?.noaa : undefined,
          waterTemperature: marineForDay.length > 0 ? marineForDay[0].waterTemperature?.noaa : undefined,
          swellHeight: marineForDay.length > 0 ? marineForDay[0].swellHeight?.noaa : undefined,
          swellPeriod: marineForDay.length > 0 ? marineForDay[0].swellPeriod?.noaa : undefined,
          marine: marineForDay,
          pollen: pollenForDate, // Include pollen data from API response
          airQuality: airQualityForDate, // Include air quality data from API response
        };
      });
  }, [weatherData, marineHours]);

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
    interests: interests,
    outOfSeasonActivities: interests.filter(id => isOutOfSeason(id))
  });
  
  // Debug logging for scoring issues
  if (currentDayData && interests.includes('basketball_outdoor')) {
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
        swellPeriod: currentDayData.swellPeriod
      }
    }],
    interests,
    activities: activityTypes.filter(a => interests.includes(a.id)).map(a => a.id),
    now: timeInfo?.serverTime || new Date(),
    includeAllActivities: true,
    isEveningToday: isEveningToday
  })[0] : null;

  const activities = dayAssessments?.suggestions || [];

  // Make sure ALL selected interests appear in the activities list
  if (interests.length > 0 && currentDayData) {
    const existingActivityIds = activities.map((a: any) => a.activityId);
    const missingInterests = interests.filter((id: string) => !existingActivityIds.includes(id));
    
    if (missingInterests.length > 0) {
      const missingActivities = missingInterests.map(id => {
        const activity = activityTypes.find(a => a.id === id);
        if (!activity) return null;
        
        return {
          activityId: id,
          score: 50,
          evaluation: 'Available option' as any,
          reasoning: 'Conditions vary, but available based on your interests',
          outOfSeason: false
        };
      }).filter((a): a is Exclude<typeof a, null> => a !== null);
      
      activities.push(...missingActivities);
    }
  }

  // Filter out any activities with undefined activityId first to prevent errors
  const validActivities = activities.filter((a: any) => a && a.activityId);

  // Sort activities by priority: perfect, good, fair, poor, indoor, offseason
  const sortedActivities = validActivities.sort((a: any, b: any) => {
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
        {/* ✅ ADD HEADER BANNER TO LOADING STATE */}
        <header className="homepage-banner activities-header">
          <img
            src="/burger-menu-svgrepo-com.svg"
            alt="Open menu"
            className="burger-menu-icon activities-header__burger"
            onClick={() => setMenuOpen(true)}
          />
          <img
            src="/wotnow-horizontal.png"
            alt="WotNow Logo"
            className="homepage-banner__logo activities-header__logo"
          />
          <div className="flex-spacer" />
          <div className="homepage-banner__text text-right padding-right-12">
            <h2 className="homepage-banner__title font-size-15 margin-0 color-gray-800">
              All Activities
            </h2>
            <p className="homepage-banner__subtitle font-size-09 margin-0 color-gray-500">
              Your outdoor forecast
            </p>
          </div>
        </header>

        <section className="activities-loading">
          <div className="activities-loading__content">
            <div className="activities-loading__emoji">⏳</div>
            <div>Loading your activities...</div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {/* ✅ ADD HEADER BANNER */}
      <header className="homepage-banner activities-header">
        {/* Hamburger icon: left */}
        <img
          src="/burger-menu-svgrepo-com.svg"
          alt="Open menu"
          className="burger-menu-icon activities-header__burger"
          onClick={() => setMenuOpen(true)}
        />

        {/* Logo: left-aligned, next to hamburger */}
        <a href="/" className="display-block">
          <img
            src="/wotnow-horizontal.png"
            alt="WotNow Logo"
            className="homepage-banner__logo activities-header__logo"
          />
        </a>

        {/* Spacer to push content to right */}
        <div className="flex-spacer" />

        {/* Page-specific text */}
        <div className="homepage-banner__text text-right padding-right-12">
          <h2 className="homepage-banner__title font-size-15 margin-0 color-gray-800">
            All Activities
          </h2>
          <p className="homepage-banner__subtitle font-size-09 margin-0 color-gray-500">
            Your outdoor forecast
          </p>
        </div>

        <style>{`
          @media (max-width: 800px) {
            .homepage-banner__text {
              display: none !important;
            }
          }
        `}</style>
      </header>

      {/* ✅ ADD MOBILE NAVIGATION MENU */}
      {menuOpen && (
        <>
          {/* Invisible overlay to detect clicks outside the menu */}
          <div 
            className="menu-overlay activities-menu-overlay"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu container */}
          <nav
            className="navigation-menu"
            style={{
              position: 'fixed',
              zIndex: 1000,
              top: 0,
              left: 0
            }}
          >
            {/* Menu content with properly rounded corners */}
            <div 
              className="menu-content"
              style={{
                background: '#2b323c',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '12px 24px',
                minWidth: '220px',
                maxWidth: '280px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                margin: '12px'
              }}
              onClick={(e) => e.stopPropagation()} // Prevent clicks from closing menu
            >
              <a href="/" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Home</a>
        <a href="/interests" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Manage my interests</a>
        <a href="/activities" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Scan my interests</a>
        <a href="/weather" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Local weather in detail</a>
        <button
                onClick={() => setMenuOpen(false)}
                style={{
                  marginTop: 24,
                  background: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#000'
                }}
              >
                Close
              </button>
            </div>

            <style jsx>{`
              @media (min-width: 800px) {
                .navigation-menu {
                  top: 60px; /* Position below header on desktop */
                }
                
                .menu-content {
                  margin: 0 0 0 12px;
                  border-radius: 0 0 12px 12px !important; /* Only round bottom corners on desktop */
                }
                
                .menu-content a:hover {
                  text-decoration: underline;
                }
                
                .menu-content button {
                  display: none; /* Hide close button on desktop */
                }
              }
              
              @media (max-width: 799px) {
                .menu-overlay {
                  background: rgba(0,0,0,0.7);
                }
              }
            `}</style>
          </nav>
        </>
      )}

      {/* EXISTING ACTIVITIES CONTENT */}
      <section style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* ✅ REMOVE the old page header since it's now in the banner */}
        {/* <header style={{ marginBottom: '2rem', textAlign: 'center' as const }}>
          <h1>All My Outdoor Activities</h1>
          <p>View personalised assessments...</p>
        </header> */}

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
            <a 
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
            </a>
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
            <a 
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
            </a>
          </div>
        )}

        {/* Main Content */}
        {!needsLocation && !needsInterests && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center' as const, padding: '3rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <div>Loading weather data...</div>
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
                  id={`day-panel-${activeDay}`}
                  aria-labelledby={`day-tab-${activeDay}`}
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
                      .filter((activity: any) => activity && activity.activityId) // Filter out any activities with undefined activityId
                      .map((activity: any) => (
                      <ActivityCard
                        key={activity.activityId}
                        activityId={activity.activityId}
                        score={activity.score}
                        evaluation={activity.evaluation}
                        reasoning={activity.reasoning}
                        day={currentDayData}
                        dayLabel={getDayLabel(currentDayData?.date || 0, activeDay, timeInfo?.serverTime)}
                        coastalLocation={coastalLocation as any}
                        homeLocation={homeLocation as any}
                      />
                    ))
                  )}
                </main>

                {/* Back to Homepage Link */}
                <div style={{ textAlign: 'center' as const, marginTop: '2rem' }}>
                  <a
                    href="/"
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      background: '#3b82f6',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#3b82f6';
                    }}
                  >
                    ← Back to Homepage
                  </a>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}