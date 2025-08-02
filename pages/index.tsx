'use client';

import React, { useEffect, useState } from 'react';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getActivityEmoji } from '../data/emojiMap';
import { getActivityBg } from '../data/bgMap';
import { useHasMounted } from '../utils/useHasMounted';
import CoastalLocationDialog from '../components/CoastalLocationDialog';
import SwellArrow from '../components/SwellArrow';
import { marineConditionsSummary } from '../utils/marineConditionsSummary';
import { activityMessages } from '../data/activityMessages';
import {
  getBeaufortDescription,
  getRainfallDescription,
  getTemperatureDescription,
  getHumidityDescription,
  getWaveDescription,
  getWaterTemperatureDescription,
} from '../utils/weatherLabels';
import Popup from '../components/Popup';

const MARINE_ACTIVITY_IDS = [
  'surfing', 'kitesurfing', 'windsurfing', 'kayaking', 'canoeing',
  'snorkeling', 'scuba_diving', 'jet_skiing', 'stand_up_paddleboarding',
  'swimming', 'sea_fishing_shore', 'beach', 'sea_fishing_boat',
];

const hasMarineInterest = (interests: string[]) =>
  interests.some((id) => MARINE_ACTIVITY_IDS.includes(id));

const getDayLabel = (dateStr: string, idx: number, serverTime?: Date) => {
  const date = new Date(dateStr);
  const today = serverTime || new Date();
  const isSameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  return isSameDay ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'long' });
};

const getScoreCategory = (score: number) => {
  if (score >= 80) return { emoji: '💯', label: 'Perfect', color: '#10b981' };
  if (score >= 60) return { emoji: '👍', label: 'Good', color: '#3b82f6' };
  if (score >= 40) return { emoji: '🙆', label: 'Fair', color: '#fbbf24' };
  if (score >= 30) return { emoji: '⚠️', label: 'Okay', color: '#f59e0b' };
  return { emoji: '🏠', label: 'Indoor', color: '#8b5cf6' };
};

const isOutdoor = (activityId: string) => {
  return !!activityMessages[activityId];
};

export default function Home() {
  const hasMounted = useHasMounted();
  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCoastDialog, setShowCoastDialog] = useState(false);
  const [popupActivity, setPopupActivity] = useState<any>(null);
  const [timeInfo, setTimeInfo] = useState<any>(null);

  const { preferences, setPreferences } = useUserPreferences();
  const homeLocation = preferences.locations?.find((loc) => loc.type === 'home');
  const coastalLocation = preferences.locations?.find((loc) => loc.type === 'coastal');
  const interests = preferences.interests ?? [];
  const isFirstTimeUser = interests.length === 0;
  const needsLocation = !homeLocation?.lat || !homeLocation?.lon;

  useEffect(() => {
    if (!hasMounted || !homeLocation?.lat || !homeLocation?.lon) return;

    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    const hour = now.getHours();
    const isEvening = hour >= 18;

    const contextTags = [
      currentDay,
      isEvening ? 'evening' : hour >= 12 ? 'afternoon' : 'morning',
      'relaxation',
      'family',
      'cultural',
      'leisure',
    ];

    // More smart tags could be added here if needed
    setTimeInfo({
      currentDay,
      hour,
      isEvening,
      contextTags,
      serverTime: now,
    });
  }, [hasMounted, homeLocation]);

  useEffect(() => {
    if (!hasMounted || !homeLocation?.lat || !homeLocation?.lon) return;

    async function fetchForecasts() {
      setLoading(true);
      setError(null);
      try {
        const openWeatherKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
        const [lat, lon] = [homeLocation.lat, homeLocation.lon];

        const owRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${openWeatherKey}`
        );
        const owData = await owRes.json();

        if (!owData?.list) throw new Error('Invalid weather data');

        const grouped: Record<string, any[]> = {};
        owData.list.forEach((item: any) => {
          const date = item.dt_txt.split(' ')[0];
          if (!grouped[date]) grouped[date] = [];
          grouped[date].push(item);
        });

        const forecast: WeatherForecastDay[] = Object.entries(grouped)
          .slice(0, 5)
          .map(([date, entries]: [string, any[]]) => {
            const noon = entries.find((e) => e.dt_txt.includes('12:00:00')) ?? entries[0];
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
              totalRain: Math.round(
                entries.reduce((sum, e) => sum + (e.rain?.['3h'] || 0), 0)
              ),
              rainDetails: entries
                .filter((e) => e.rain?.['3h'])
                .map((e) => `${new Date(e.dt_txt).getHours()}:00 ${Math.round(e.rain['3h'])}mm`),
              // Marine fields to be enriched below
              waveHeight: undefined,
              waterTemperature: undefined,
              swellHeight: undefined,
              swellPeriod: undefined,
            };
          });

        setForecastByDay(forecast);
      } catch (err: any) {
        setError(err.message || 'Failed to load forecast data.');
      } finally {
        setLoading(false);
      }
    }

    fetchForecasts();
  }, [homeLocation, hasMounted]);
  // Helper for reasons 
  function buildReasons(day: WeatherForecastDay, activityId: string) {
    const reasons = [
      { key: 'wind', value: day.wind_speed, label: getBeaufortDescription(day.wind_speed) },
      { key: 'rain', value: day.rain, label: getRainfallDescription(day.rain) },
      { key: 'temperature', value: day.temperature, label: getTemperatureDescription(day.temperature) },
      { key: 'humidity', value: day.humidity, label: getHumidityDescription(day.humidity) },
    ];
    if (MARINE_ACTIVITY_IDS.includes(activityId)) {
      if (typeof day.waveHeight === 'number')
        reasons.push({ key: 'wave', value: day.waveHeight, label: getWaveDescription(day.waveHeight) });
      if (typeof day.waterTemperature === 'number')
        reasons.push({ key: 'water', value: day.waterTemperature, label: getWaterTemperatureDescription(day.waterTemperature) });
    }
    return reasons.filter(r => r.label && r.label !== 'Unknown temperature' && r.label !== 'Unknown humidity');
  }

  // Hydration check
  if (!hasMounted) {
    return (
      <section>
        <header className="homepage-banner">
          <img src="/wotnow-horizontal.png" alt="WotNow Logo" className="homepage-banner__logo" />
          <div className="homepage-banner__text">
            <h1 className="homepage-banner__title">Wots good, when?</h1>
            <p className="homepage-banner__subtitle">Live your best life, every day</p>
          </div>
        </header>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div>⏳ Loading your personalized suggestions...</div>
        </div>
      </section>
    );
  }

  // Compute heroDataByDay from forecastByDay and user preferences
  const heroDataByDay = forecastByDay.map((day, idx) => {
    // Get suggestions for this day
    const suggestionsData = getSuggestionsByDay(day, interests, timeInfo?.contextTags || []);
    const suggestions = suggestionsData.suggestions || [];
    // Find the top-scoring suggestion as hero
    const heroActivity = suggestions.length > 0 ? suggestions[0] : null;
    // Find other perfect activities (score >= 80, not the hero)
    const alsoGoodPerfect = suggestions.filter(
      (s) => s.score >= 80 && (!heroActivity || s.activityId !== heroActivity.activityId)
    );
    return {
      day,
      suggestions,
      heroActivity,
      alsoGoodPerfect,
      suggestionsData,
    };
  });

  // MAIN RETURN
  return (
    <section>
      <header className="homepage-banner">
        <img
          src="/burger-menu-svgrepo-com.svg"
          alt="Open menu"
          className="burger-menu-icon"
          onClick={() => setMenuOpen(true)}
        />
        <img
          src="/wotnow-horizontal.png"
          alt="WotNow Logo"
          className="homepage-banner__logo"
        />
        <div className="homepage-banner__spacer" />
        <div className="homepage-banner__text">
          <h1 className="homepage-banner__title">Wots good,&nbsp;when?</h1>
          <p className="homepage-banner__subtitle">Live your best life, every day</p>
        </div>
      </header>
      <div>
        {needsLocation ? (
          <div className="location-message">
            <div className="location-icon">📍</div>
            <div>Please enter a location above to view your personalized, weather-aware activity suggestions.</div>
          </div>
        ) : loading ? (
          <div className="loading-message">
            <div className="loading-icon">⏳</div>
            <div>Loading your smart recommendations...</div>
          </div>
        ) : error ? (
          <div className="error-message">
            <div className="error-icon">⚠️</div>
            <div>{error}</div>
          </div>
        ) : (
          <div className="main-grid" role="list">
            {heroDataByDay.map(({ day, suggestions, heroActivity, alsoGoodPerfect, suggestionsData }, idx) => {
              const marineSummary = marineConditionsSummary(day.waveHeight, day.wind_speed);
              return (
                <article
                  key={day.date}
                  className="activity-card-enhanced"
                  role="listitem"
                  tabIndex={0}
                  aria-label={`Suggestions for ${getDayLabel(day.date, idx, timeInfo?.serverTime)}`}
                >
                  <div className="activity-card-overlay" />
                  <div className="activity-card-content">

                    {/* HEADER */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', lineHeight: 1.1 }}>
                        {getDayLabel(day.date, idx, timeInfo?.serverTime)}
                      </div>
                      <img src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`} alt={day.description} className="weather-icon"
                        style={{ width: 72, height: 72, marginLeft: 12, objectFit: 'contain', display: 'block' }} />
                    </div>

                    {/* HERO ACTIVITY */}
                    {heroActivity && (() => {
                      const activity = activityTypes.find(a => a.id === heroActivity.activityId);
                      const scoreInfo = getScoreCategory(heroActivity.score || 0);
                      return (
                        <div className="hero-activity">
                          <div className="hero-activity-header">
                            <span className="hero-activity-emoji">
                              {getActivityEmoji(heroActivity.activityId)}
                            </span>
                            <div className="hero-activity-details">
                              <div className="hero-activity-title">
                                <strong
                                  className={`hero-activity-name ${isOutdoor(heroActivity.activityId) ? 'outdoor' : ''}`}
                                  onClick={() => {
                                    if (isOutdoor(heroActivity.activityId)) {
                                      setPopupActivity({
                                        activityId: heroActivity.activityId,
                                        category: heroActivity.score >= 80 ? 'perfect' : 'good',
                                        reasons: buildReasons(day, heroActivity.activityId),
                                        marineData: {
                                          waveHeight: day.waveHeight,
                                          windSpeed: day.wind_speed,
                                          windDirection: day.windDirection,
                                          waterTemp: day.waterTemperature,
                                          swellHeight: day.swellHeight,
                                          swellPeriod: day.swellPeriod,
                                        },
                                      });
                                    }
                                  }}
                                >
                                  {activity?.name || heroActivity.activityId}
                                </strong>
                                <span className="hero-activity-score" style={{ background: scoreInfo.color }}>
                                  {scoreInfo.emoji}
                                </span>
                              </div>
                              {heroActivity.reasoning && <div className="hero-activity-reasoning">{heroActivity.reasoning}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ALSO PERFECT TODAY */}
                    {alsoGoodPerfect.length > 0 && (
                      <div className="also-good-section" style={{ marginBottom: '14px' }}>
                        <strong style={{ fontSize: '0.95rem', marginBottom: '6px', display: 'block' }}>
                          Also perfect today
                        </strong>
                        <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0, fontSize: '0.85rem' }}>
  {alsoGoodPerfect.map((suggestion) => {
    const activity = activityTypes.find((x) => x.id === suggestion.activityId);
    const isClickable = isOutdoor(suggestion.activityId);

    const handleClick = () => {
      if (!isClickable) return;
      setPopupActivity({
        activityId: suggestion.activityId,
        category: suggestion.score >= 80 ? 'perfect' : 'good',
        reasons: buildReasons(day, suggestion.activityId),
        marineData: {
          waveHeight: day.waveHeight,
          windSpeed: day.wind_speed,
          waterTemp: day.waterTemperature,
          swellHeight: day.swellHeight,
          swellPeriod: day.swellPeriod,
        },
      });
    };

    return (
      <li
        key={suggestion.activityId}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            cursor: isClickable ? 'pointer' : 'default',
            color: isClickable ? '#fff' : undefined,
            fontWeight: isClickable ? 700 : undefined,
            textDecoration: isClickable ? 'underline' : undefined,
          }}
          onClick={handleClick}
        >
          {getActivityEmoji(suggestion.activityId)} {activity?.name || suggestion.activityId}
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            opacity: 0.8,
            background: 'rgba(255,255,255,0.2)',
            padding: '1px 4px',
            borderRadius: '3px',
          }}
        >
          {suggestion.score}%
        </span>
      </li>
    );
  })}
</ul>

                      </div>
                    )}

                    {/* LAND AND MARINE DATA */}
                    {hasMarineInterest(interests) &&
                      [day.waveHeight, day.waterTemperature, day.swellHeight, day.swellPeriod, day.wind_speed].some(v => typeof v === 'number') && (
                        <>
                          <div
                            className="marine-block"
                            style={{
                              marginBottom: '16px',
                              padding: '10px',
                              background: 'rgba(59, 130, 246, 0.2)',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                            }}
                          >
                            <div style={{ fontSize: '0.85rem', marginBottom: 6 }}>
                              📍 {day.temperature}° and {day.description} in{' '}
                              <button
                                type="button"
                                onClick={() => {
                                  document.getElementById(
                                    window.innerWidth < 800 ? 'location-input-mobile' : 'location-input-desktop'
                                  )?.focus();
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#fff',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: 'inherit',
                                  padding: 0,
                                }}
                              >
                                {homeLocation ? homeLocation.name.split(',')[0] : 'your location'}
                              </button>
                              <span style={{ fontSize: '0.75em', opacity: 0.7, marginLeft: 8 }}>
                                (OpenWeather)
                              </span>
                            </div>
                            <p style={{ fontSize: '0.85rem', margin: '0 0 6px 0', opacity: 0.92 }}>
                              🌊 {marineSummary} in{' '}
                              <button
                                type="button"
                                onClick={() => setShowCoastDialog(true)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#fff',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: 'inherit',
                                  padding: 0,
                                }}
                              >
                                {coastalLocation ? coastalLocation.name.split(',')[0] : 'your coastal location'}
                              </button>
                              <span style={{ fontSize: '0.75em', opacity: 0.7, marginLeft: 8 }}>
                                (Stormglass)
                              </span>
                            </p>
                          </div>
                          <ul className="marine-values"
                            style={{
                              listStyle: 'none',
                              padding: 0,
                              margin: 0,
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '8px'
                            }}>
                            {typeof day.waveHeight === 'number' && (
                              <li style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                                🌊 {day.waveHeight}m <span style={{ fontSize: '0.7em', opacity: 0.7 }}>(Stormglass)</span>
                              </li>
                            )}
                            {typeof day.wind_speed === 'number' && (
                              <li style={{
                                background: 'rgba(255,255,255,0.2)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                💨 {day.wind_speed}km/h <span style={{ fontSize: '0.7em', opacity: 0.7 }}>(OpenWeather)</span>
                                {typeof day.windDirection === 'number' && (
                                  <>
                                    <SwellArrow deg={day.windDirection} />
                                    <span style={{ fontSize: '0.7em', opacity: 0.7 }}>(Stormglass)</span>
                                  </>
                                )}
                              </li>
                            )}
                            {typeof day.waterTemperature === 'number' && (
                              <li style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                                🏊‍♂️ {day.waterTemperature.toFixed(1)}° <span style={{ fontSize: '0.7em', opacity: 0.7 }}>(Stormglass)</span>
                              </li>
                            )}
                          </ul>
                        </>
                      )}

                    {/* ALSO GOOD TODAY */}
                    {suggestions.filter(s => s.score >= 60 && s.score < 80).length > 0 && (
                      <div className="also-good-section">
                        <strong className="also-good-title">Also good today</strong>
                        <ul
                          className="also-good-list"
                          style={{ listStyle: 'none', paddingLeft: 0, margin: 0, fontSize: '0.85rem' }}>
                          {suggestions
                            .filter(
                              s =>
                                s.score >= 60 &&
                                s.score < 80 &&
                                s.activityId !== heroActivity?.activityId
                            )
                            .sort((a, b) => b.score - a.score)
                            .slice(0, 4)
                            .map((suggestion) => {
                              const activity = activityTypes.find((x) => x.id === suggestion.activityId);
                              const isClickable = isOutdoor(suggestion.activityId);
                              const handleClick = () => {
                                if (!isClickable) return;
                                setPopupActivity({
                                  activityId: suggestion.activityId,
                                  category: suggestion.score >= 80 ? 'perfect' : 'good',
                                  reasons: buildReasons(day, suggestion.activityId),
                                  marineData: {
                                    waveHeight: day.waveHeight,
                                    windSpeed: day.wind_speed,
                                    waterTemp: day.waterTemperature,
                                    swellHeight: day.swellHeight,
                                    swellPeriod: day.swellPeriod
                                  }
                                });
                              };
                              return (
                                <li
                                  key={suggestion.activityId}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '4px'
                                  }}>
                                  <span
                                    style={{
                                      cursor: isClickable ? 'pointer' : 'default',
                                      color: isClickable ? '#fff' : undefined,
                                      fontWeight: isClickable ? 700 : undefined,
                                      textDecoration: isClickable ? 'underline' : undefined
                                    }}
                                    onClick={handleClick}
                                  >
                                    {getActivityEmoji(suggestion.activityId)} {activity?.name || suggestion.activityId}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      opacity: 0.8,
                                      background: 'rgba(255,255,255,0.2)',
                                      padding: '1px 4px',
                                      borderRadius: '3px'
                                    }}
                                  >
                                    {suggestion.score}%
                                  </span>
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    )}

                    {/* ENHANCED INDOOR SUGGESTIONS */}
                    {(() => {
                      const isToday = idx === 0;
                      const isEvening = timeInfo?.isEvening && isToday;
                      if (!isEvening) {
                        const indoorList = suggestionsData?.stayInside ?? [];
                        if (!indoorList.length) return null;
                        return (
                          <div className="indoor-section">
                            <strong className="indoor-title">👹 Staying inside?</strong>
                            <ul className="indoor-list">
                              {indoorList.map((s) => {
                                const activity = activityTypes.find((a) => a.id === s.activityId);
                                return (
                                  <li key={s.activityId} className="indoor-item">
                                    <span>
                                      {getActivityEmoji(s.activityId)} {activity?.name}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* ADD INTERESTS LINK */}
                    <div className="add-interests-container">
                      <a
                        href="/interests"
                        className="add-interests-link"
                        onMouseEnter={(e) => e.currentTarget.classList.add('hover')}
                        onMouseLeave={(e) => e.currentTarget.classList.remove('hover')}
                      >
                        ➕ Add More Interests
                      </a>
                    </div>

                  </div>
                </article>
              );
            })}
          </div>
        )}
        {/* COASTAL DIALOG */}
        {showCoastDialog && (
          <CoastalLocationDialog
            open={showCoastDialog}
            onClose={() => setShowCoastDialog(false)}
            onSave={(loc) => {
              setPreferences((prev) => ({
                ...prev,
                locations: [
                  ...(prev.locations?.filter((l) => l.type !== 'coastal') || []),
                  { ...loc, type: 'coastal' },
                ],
              }));
              setShowCoastDialog(false);
            }}
          />
        )}

        {/* MOBILE MENU */}
        {menuOpen && (
          <>
            <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
            <nav className="navigation-menu">
              <div className="menu-content" onClick={(e) => e.stopPropagation()}>
                <a href="/" onClick={() => setMenuOpen(false)} className="menu-link">Home</a>
                <a href="/interests" onClick={() => setMenuOpen(false)} className="menu-link">Manage my interests</a>
                <a href="/activities" onClick={() => setMenuOpen(false)} className="menu-link">Scan my interests</a>
                <a href="/weather" onClick={() => setMenuOpen(false)} className="menu-link">Local weather in detail</a>
                <button onClick={() => setMenuOpen(false)} className="menu-close-button">Close</button>
              </div>
            </nav>
          </>
        )}
        {/* POPUP */}
        {popupActivity && (
          <Popup
            title={popupActivity.activityId.replace(/_/g, ' ')}
            description={
              popupActivity.reasons.map((r: any) => r.label).join(', ') ||
              'No description available'
            }
            category={popupActivity.category}
            reasons={popupActivity.reasons}
            marineData={popupActivity.marineData}
            onClose={() => setPopupActivity(null)}
          />
        )}
      </div>
    </section>
  );
}
