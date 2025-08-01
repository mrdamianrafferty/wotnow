'use client';

import React, { useState, useEffect } from 'react';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getActivityEmoji } from '../data/emojiMap';
import { getActivityBg } from '../data/bgMap';
import { useHasMounted } from '../utils/useHasMounted';
import { getActivityMessage } from '../data/activityMessages';
import {
  getBeaufortDescription,
  getRainfallDescription,
  getTemperatureDescription,
  getHumidityDescription,
  getWaveDescription,
  getWaterTemperatureDescription,
} from '../utils/weatherLabels';

// Marine activities for conditional data display
const MARINE_ACTIVITY_IDS = [
  'surfing', 'kitesurfing', 'windsurfing', 'kayaking', 'canoeing',
  'snorkeling', 'scuba_diving', 'jet_skiing', 'stand_up_paddleboarding',
  'swimming', 'sea_fishing_shore', 'beach', 'sea_fishing_boat'
];

// Check if activity is outdoor
// Replace your current isOutdoor function with this corrected version:

function isOutdoor(activityId: string): boolean {
  const indoorActivities = [
    // Social & Entertainment
    'going_to_pub',              // ✅ Fixed! (was 'going_to_the_pub')
    'playing_cards', 'watch_a_movie', 'cinema', 'cafe', 'museum', 'shopping',
    
    // Fitness & Sports (Indoor)
    'gym_workout', 'yoga', 'pilates', 'indoor_climbing', 'squash', 
    'badminton', 'table_tennis', 'indoor_swimming', 'tennis_indoor',
    'volleyball_indoor', 'ice_hockey_indoor', 'curling',
    
    // Arts & Crafts
    'painting', 'crafts', 'knitting', 'cooking', 'diy', 'make_music',
    'playing_records', 'dance',
    
    // Wellness & Mindfulness
    'meditation', 'tai_chi', 'martial_arts', 'reading'
  ];
  
  return !indoorActivities.includes(activityId);
}

// Activity assessment categories
function getAssessmentCategory(score: number): { 
  status: 'poor' | 'fair' | 'good' | 'perfect'; 
  color: string; 
  emoji: string; 
  bgColor: string;
} {
  if (score >= 80) return { 
    status: 'perfect', 
    color: '#10b981', 
    emoji: '💯', 
    bgColor: 'rgba(16, 185, 129, 0.1)' 
  };
  if (score >= 60) return { 
    status: 'good', 
    color: '#3b82f6', 
    emoji: '👍', 
    bgColor: 'rgba(59, 130, 246, 0.1)' 
  };
  if (score >= 40) return { 
    status: 'fair', 
    color: '#f59e0b', 
    emoji: '🙆', 
    bgColor: 'rgba(245, 158, 11, 0.1)' 
  };
  return { 
    status: 'poor', 
    color: '#ef4444', 
    emoji: '⚠️', 
    bgColor: 'rgba(239, 68, 68, 0.1)' 
  };
}

// Day label helper
function getDayLabel(dateStr: string, idx: number, serverTime?: Date): string {
  const date = new Date(dateStr);
  const today = serverTime || new Date();
  
  const isSameDay = date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  
  if (isSameDay) return 'Today';
  if (idx === 1) return 'Tomorrow';
  
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric' });
}

// Build comprehensive reasons
function buildReasons(day: WeatherForecastDay, activityId: string) {
  const reasons = [
    { key: 'wind', value: day.wind_speed, label: getBeaufortDescription(day.wind_speed) },
    { key: 'rain', value: day.rain, label: getRainfallDescription(day.rain) },
    { key: 'temperature', value: day.temperature, label: getTemperatureDescription(day.temperature) },
    { key: 'humidity', value: day.humidity, label: getHumidityDescription(day.humidity) },
  ];

  if (MARINE_ACTIVITY_IDS.includes(activityId)) {
    if (typeof day.waveHeight === 'number') {
      reasons.push({ key: 'wave', value: day.waveHeight, label: getWaveDescription(day.waveHeight) });
    }
    if (typeof day.waterTemperature === 'number') {
      reasons.push({ key: 'water', value: day.waterTemperature, label: getWaterTemperatureDescription(day.waterTemperature) });
    }
  }

  return reasons.filter(r => r.label && r.label !== 'Unknown temperature' && r.label !== 'Unknown humidity');
}

// Activity Card Component
interface ActivityCardProps {
  activityId: string;
  score: number;
  evaluation: string;
  reasoning?: string;
  day: WeatherForecastDay;
  onClick: () => void;
}

function ActivityCard({ activityId, score, evaluation, reasoning, day, onClick }: ActivityCardProps) {
  const activity = activityTypes.find(a => a.id === activityId);
  const assessment = getAssessmentCategory(score);
  const bgUrl = getActivityBg(activityId);
  const isMarine = MARINE_ACTIVITY_IDS.includes(activityId);
  const reasons = buildReasons(day, activityId);
  const message = getActivityMessage(activityId, assessment.status, reasons);

  return (
    <article
      className="activity-card"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '12px',
        padding: '16px',
        minHeight: '200px',
        color: '#fff',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`${activity?.name || activityId} - ${assessment.status} conditions`}
    >
      {/* Activity Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.5rem' }}>
            {getActivityEmoji(activityId)}
          </span>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.1rem', 
            fontWeight: 600,
            color: '#fff',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            {activity?.name || activityId.replace(/_/g, ' ')}
          </h3>
        </div>
        
        {/* Assessment Badge */}
        <div style={{
          background: assessment.color,
          color: 'white',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {assessment.emoji}
          {assessment.status}
        </div>
      </div>

      {/* Assessment Message */}
      <div style={{ 
        fontSize: '0.9rem', 
        lineHeight: 1.4, 
        marginBottom: '12px',
        flex: 1,
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.7)'
      }}>
        {message}
      </div>

      {/* Marine Conditions */}
      {isMarine && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.2)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '6px',
          padding: '8px',
          marginBottom: '8px'
        }}>
          <div style={{ 
            fontSize: '0.8rem', 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px',
            alignItems: 'center'
          }}>
            {typeof day.waveHeight === 'number' && (
              <span style={{ 
                background: 'rgba(255,255,255,0.2)', 
                padding: '2px 6px', 
                borderRadius: '4px',
                color: '#fff'
              }}>
                🌊 {day.waveHeight}m
              </span>
            )}
            {typeof day.wind_speed === 'number' && (
              <span style={{ 
                background: 'rgba(255,255,255,0.2)', 
                padding: '2px 6px', 
                borderRadius: '4px',
                color: '#fff'
              }}>
                💨 {day.wind_speed}km/h
              </span>
            )}
            {typeof day.waterTemperature === 'number' && (
              <span style={{ 
                background: 'rgba(255,255,255,0.2)', 
                padding: '2px 6px', 
                borderRadius: '4px',
                color: '#fff'
              }}>
                🏊‍♂️ {day.waterTemperature.toFixed(1)}°
              </span>
            )}
          </div>
        </div>
      )}

      {/* Score Display */}
      <div style={{ 
        fontSize: '0.8rem', 
        opacity: 0.9,
        textAlign: 'right' as const,
        color: '#fff'
      }}>
        Score: {score}%
      </div>
    </article>
  );
}

// Day Tabs Component
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
      style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        overflowX: 'auto',
        padding: '4px'
      }}
      aria-label="Forecast days"
    >
      {days.map((day, idx) => (
        <button
          key={day.date}
          role="tab"
          aria-selected={activeDay === idx}
          aria-controls={`day-panel-${idx}`}
          id={`day-tab-${idx}`}
          style={{
            padding: '12px 16px',
            border: 'none',
            borderRadius: '8px',
            background: activeDay === idx ? '#3b82f6' : '#f3f4f6',
            color: activeDay === idx ? '#fff' : '#374151',
            fontWeight: activeDay === idx ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minWidth: 'fit-content',
            whiteSpace: 'nowrap'
          }}
          onClick={() => onDayChange(idx)}
          onMouseEnter={(e) => {
            if (activeDay !== idx) {
              e.currentTarget.style.background = '#e5e7eb';
            }
          }}
          onMouseLeave={(e) => {
            if (activeDay !== idx) {
              e.currentTarget.style.background = '#f3f4f6';
            }
          }}
        >
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {getDayLabel(day.date, idx, serverTime)}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
              {day.temperature}°
            </div>
          </div>
        </button>
      ))}
    </nav>
  );
}

// Main Activities Page Component
export default function ActivitiesPage() {
  const hasMounted = useHasMounted();
  const { preferences } = useUserPreferences();
  const homeLocation = preferences.locations?.find((loc) => loc.type === 'home');
  const coastalLocation = preferences.locations?.find((loc) => loc.type === 'coastal');
  const interests = preferences.interests ?? [];

  const [activeDay, setActiveDay] = useState(0);
  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeInfo, setTimeInfo] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<{
    activityId: string;
    category: 'perfect' | 'good' | 'poor';
    reasons: { key: string; value: any; label: string }[];
    marineData?: any;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false); // ✅ Add this for hamburger menu

  const needsLocation = !homeLocation?.lat || !homeLocation?.lon;
  const needsInterests = interests.length === 0;

  // Time context setup
  useEffect(() => {
    if (!hasMounted) return;
    
    const now = new Date();
    setTimeInfo({
      serverTime: now,
      isEvening: now.getHours() >= 18
    });
  }, [hasMounted]);

  // Weather data fetching
  useEffect(() => {
    if (!hasMounted || !homeLocation?.lat || !homeLocation?.lon) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchForecasts() {
      try {
        setLoading(true);
        setError(null);

        const openWeatherKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
        const [lat, lon] = [homeLocation.lat, homeLocation.lon];

        const owRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${openWeatherKey}`
        );
        const owData = await owRes.json();
        
        if (!owData?.list) {
          throw new Error('Invalid weather data');
        }

        const grouped: Record<string, any[]> = {};
        owData.list.forEach((item: any) => {
          const date = item.dt_txt.split(' ')[0];
          if (!grouped[date]) grouped[date] = [];
          grouped[date].push(item);
        });

        const forecast = Object.entries(grouped).slice(0, 5).map(([date, entries]: [string, any[]]) => {
          const noon = entries.find(e => e.dt_txt.includes('12:00:00')) ?? entries[0];
          
          return {
            date,
            temperature: Math.round(noon.main.temp),
            tempMax: Math.round(noon.main.temp_max),
            tempMin: Math.round(noon.main.temp_min),
            condition: noon.weather[0].main,
            description: noon.weather[0].description,
            icon: noon.weather[0].icon,
            rain: Math.round(noon.rain?.['3h'] || 0),
            wind_speed: Math.round(noon.wind.speed * 3.6),
            clouds: noon.clouds.all,
            humidity: noon.main.humidity,
            visibility: noon.visibility ?? 10000,
            waveHeight: undefined,
            waterTemperature: undefined,
            swellHeight: undefined,
            swellPeriod: undefined,
          };
        });

        const marineLat = coastalLocation?.lat ?? lat;
        const marineLon = coastalLocation?.lon ?? lon;
        const now = Math.floor(Date.now() / 1000);
        const end = now + (5 * 86400);

        try {
          const sgRes = await fetch(
            `/api/marine?lat=${marineLat}&lon=${marineLon}&start=${now}&end=${end}`
          );
          const sgData = await sgRes.json();
          
          if (Array.isArray(sgData.hours)) {
            forecast.forEach(day => {
              const match = sgData.hours.find((h: any) => h.time.startsWith(day.date));
              if (match) {
                day.waveHeight = match.waveHeight?.sg;
                day.waterTemperature = match.waterTemperature?.sg;
                day.swellHeight = match.swellHeight?.sg;
                day.swellPeriod = match.swellPeriod?.sg;
              }
            });
          }
        } catch (marineErr) {
          console.warn('Marine data not available');
        }

        if (isMounted) {
          setForecastByDay(forecast);
        }

      } catch (err: any) {
        console.error('Weather fetch error:', err);
        if (isMounted) {
          setForecastByDay([]);
          setError(err.message || 'Failed to load forecast data.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchForecasts();
    return () => {
      isMounted = false;
    };
  }, [homeLocation, coastalLocation, hasMounted]);

  // Generate activity assessments for the selected day
  const currentDayData = forecastByDay[activeDay];
  
  const dayAssessments = currentDayData ? getSuggestionsByDay({
    forecast: [{
      date: currentDayData.date,
      weather: {
        temperature: currentDayData.temperature,
        precipitation: currentDayData.rain,
        windSpeed: currentDayData.wind_speed,
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
    activities: activityTypes.filter(a => interests.includes(a.id) && isOutdoor(a.id)),
    now: timeInfo?.serverTime || new Date()
  })[0] : null;

  const activities = dayAssessments?.suggestions || [];

  // Pre-hydration loading state
  if (!hasMounted) {
    return (
      <>
        {/* ✅ ADD HEADER BANNER TO LOADING STATE */}
        <header
          className="homepage-banner"
          style={{
            position: 'relative',
            minHeight: 60,
            display: 'flex',
            alignItems: 'center',
            padding: '8px 0 8px 0',
            background: '#fff',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <img
            src="/burger-menu-svgrepo-com.svg"
            alt="Open menu"
            className="burger-menu-icon"
            style={{
              width: 36,
              height: 36,
              cursor: 'pointer',
              marginLeft: 12,
              marginRight: 12,
              zIndex: 10,
              display: 'block'
            }}
            onClick={() => setMenuOpen(true)}
          />
          <img
            src="/wotnow-horizontal.png"
            alt="WotNow Logo"
            className="homepage-banner__logo"
            style={{
              display: 'block',
              maxWidth: 180,
              height: 'auto'
            }}
          />
          <div style={{ flex: 1 }} />
          <div className="homepage-banner__text" style={{ textAlign: 'right', paddingRight: '12px' }}>
            <h2 className="homepage-banner__title" style={{ fontSize: '1.5rem', margin: 0, color: '#1f2937' }}>
              All Activities
            </h2>
            <p className="homepage-banner__subtitle" style={{ fontSize: '0.9rem', margin: 0, color: '#6b7280' }}>
              Your outdoor forecast
            </p>
          </div>
        </header>

        <section style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>⏳</div>
            <div>Loading your activities...</div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {/* ✅ ADD HEADER BANNER */}
      <header
        className="homepage-banner"
        style={{
          position: 'relative',
          minHeight: 60,
          display: 'flex',
          alignItems: 'center',
          padding: '8px 0 8px 0',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {/* Hamburger icon: left */}
        <img
          src="/burger-menu-svgrepo-com.svg"
          alt="Open menu"
          className="burger-menu-icon"
          style={{
            width: 36,
            height: 36,
            cursor: 'pointer',
            marginLeft: 12,
            marginRight: 12,
            zIndex: 10,
            display: 'block',
          }}
          onClick={() => setMenuOpen(true)}
        />

        {/* Logo: left-aligned, next to hamburger */}
        <a href="/" style={{ display: 'block' }}>
          <img
            src="/wotnow-horizontal.png"
            alt="WotNow Logo"
            className="homepage-banner__logo"
            style={{
              display: 'block',
              maxWidth: 180,
              height: 'auto',
            }}
          />
        </a>

        {/* Spacer to push content to right */}
        <div style={{ flex: 1 }} />

        {/* Page-specific text */}
        <div className="homepage-banner__text" style={{ textAlign: 'right', paddingRight: '12px' }}>
          <h2 className="homepage-banner__title" style={{ fontSize: '1.5rem', margin: 0, color: '#1f2937' }}>
            All Activities
          </h2>
          <p className="homepage-banner__subtitle" style={{ fontSize: '0.9rem', margin: 0, color: '#6b7280' }}>
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
            className="menu-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
              cursor: 'default'
            }}
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
          <p>View personalized assessments...</p>
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
              Choose your outdoor interests to see personalized activity assessments.
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
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '16px',
                    marginBottom: '2rem'
                  }}
                >
                  {activities.length === 0 ? (
                    <div style={{ 
                      gridColumn: '1 / -1',
                      textAlign: 'center' as const, 
                      padding: '3rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤔</div>
                      <div style={{ color: '#6b7280' }}>
                        No activity data available for {getDayLabel(currentDayData?.date || '', activeDay, timeInfo?.serverTime)}
                      </div>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <ActivityCard
                        key={activity.activityId}
                        activityId={activity.activityId}
                        score={activity.score}
                        evaluation={activity.evaluation}
                        reasoning={activity.reasoning}
                        day={currentDayData}
                        onClick={() => {
                          const assessment = getAssessmentCategory(activity.score);
                          setSelectedActivity({
                            activityId: activity.activityId,
                            category: assessment.status,
                            reasons: buildReasons(currentDayData, activity.activityId),
                            marineData: {
                              waveHeight: currentDayData.waveHeight,
                              windSpeed: currentDayData.wind_speed,
                              waterTemp: currentDayData.waterTemperature,
                              swellHeight: currentDayData.swellHeight,
                              swellPeriod: currentDayData.swellPeriod
                            }
                          });
                        }}
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

        {/* Activity Detail Modal */}
        {selectedActivity && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
            onClick={() => setSelectedActivity(null)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: '#1f2937' }}>
                  {activityTypes.find(a => a.id === selectedActivity.activityId)?.name || selectedActivity.activityId}
                </h2>
                <button
                  onClick={() => setSelectedActivity(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                  aria-label="Close details"
                >
                  ×
                </button>
              </div>

              <div style={{ color: '#374151', lineHeight: 1.6 }}>
                {getActivityMessage(
                  selectedActivity.activityId,
                  selectedActivity.category,
                  selectedActivity.reasons
                )}
              </div>

              {/* Marine data display */}
              {MARINE_ACTIVITY_IDS.includes(selectedActivity.activityId) && selectedActivity.marineData && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6' }}>Marine Conditions</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {typeof selectedActivity.marineData.waveHeight === 'number' && (
                      <span style={{ 
                        background: '#3b82f6', 
                        color: 'white',
                        padding: '4px 8px', 
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                      }}>
                        🌊 {selectedActivity.marineData.waveHeight}m
                      </span>
                    )}
                    {typeof selectedActivity.marineData.windSpeed === 'number' && (
                      <span style={{ 
                        background: '#3b82f6', 
                        color: 'white',
                        padding: '4px 8px', 
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                      }}>
                        💨 {selectedActivity.marineData.windSpeed}km/h
                      </span>
                    )}
                    {typeof selectedActivity.marineData.waterTemp === 'number' && (
                      <span style={{ 
                        background: '#3b82f6', 
                        color: 'white',
                        padding: '4px 8px', 
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                      }}>
                        🏊‍♂️ {selectedActivity.marineData.waterTemp.toFixed(1)}°
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

