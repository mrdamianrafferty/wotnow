'use client';

import React, { useEffect, useState } from 'react';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getActivityEmoji } from '../data/emojiMap';
import { getAssessmentEmoji } from '../data/emojiMap';
import { getActivityBg } from '../data/bgMap';
import { useHasMounted } from '../utils/useHasMounted';
import CoastalLocationDialog from '../components/CoastalLocationDialog';
import SwellArrow from '../components/SwellArrow';
import { marineConditionsSummary } from '../utils/marineConditionsSummary';
import { activityMessages } from '../data/activityMessages';
import { buildPopupActivityPayload } from '../utils/buildPopupActivityPayload';
import PopupTemplate from '../components/PopupTemplate';
import { findHeroActivity } from '../utils/activityHelpers';
import { useForecastData } from '../lib/useForecastData';
import { MARINE_ACTIVITY_IDS } from '../utils/activityHelpers';
import { selectHeroActivity } from '../utils/heroSelector';
import 'weather-icons/css/weather-icons.css';

import '../styles/Card.css';
import '../styles/Popup.css';
import {
  getBeaufortDescription,
  getRainfallDescription,
  getTemperatureDescription,
  getHumidityDescription,
  getWaveDescription,
  getWaterTemperatureDescription,
  getWindMessage,
} from '../utils/weatherLabels';
import Popup from '../components/Popup';
import { buildReasons } from '../utils/activityHelpers'; // Adjust the path based on your project structure
import { isOutdoor } from '../utils/activityHelpers';
import { getActivityMessage } from '../data/activityMessages';



// Improved data fetching hook
const useFetchForecastData = (homeLocation: any, coastalLocation: any, interests: string[]) => {
  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeInfo, setTimeInfo] = useState<any>(null);
  const [marineHours, setMarineHours] = useState<any[]>([]);

  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!homeLocation?.lat || !homeLocation?.lon) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch main weather data
        const weatherResponse = await fetch(`/api/weather?lat=${homeLocation.lat}&lon=${homeLocation.lon}`, {
          cache: 'no-store'
        });

        if (!weatherResponse.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const weatherData = await weatherResponse.json();

        // Fetch marine data if user has marine interests and coastal location
        let marineData = null;
        if (hasMarineInterest(interests) && coastalLocation?.lat && coastalLocation?.lon) {
          const marineResponse = await fetch(
            `/api/marine?lat=${coastalLocation.lat}&lon=${coastalLocation.lon}`,
            { cache: 'no-store' }
          );

          if (marineResponse.ok) {
            marineData = await marineResponse.json();
          }
        }

        // Process and combine the data
        const processedForecast = processWeatherData(weatherData, marineData);
        
        setForecastByDay(processedForecast.forecast);
        setTimeInfo(processedForecast.timeInfo);
        setMarineHours(processedForecast.marineHours || []);

      } catch (err) {
        console.error('Error fetching forecast ', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [homeLocation?.lat, homeLocation?.lon, coastalLocation?.lat, coastalLocation?.lon, interests]);

  return { forecastByDay, loading, error, timeInfo, marineHours };
};

const processWeatherData = (weatherData: any, marineData?: any) => {
  const forecast: WeatherForecastDay[] = weatherData.daily.map((day: any, index: number) => ({
    date: day.dt,
    temperature: Math.round(day.temp.day),
    rain: day.rain?.['1h'] || 0,
    wind_speed: day.wind_speed,
    clouds: day.clouds,
    humidity: day.humidity,
    visibility: day.visibility || 10000,
    waterTemperature: marineData?.daily?.[index]?.water_temp || null,
    waveHeight: marineData?.daily?.[index]?.wave_height || null,
    swellHeight: marineData?.daily?.[index]?.swell_height || null,
    swellPeriod: marineData?.daily?.[index]?.swell_period || null,
  }));

  return {
    forecast,
    timeInfo: {
      serverTime: new Date(weatherData.current.dt * 1000),
      sunrise: new Date(weatherData.current.sunrise * 1000),
      sunset: new Date(weatherData.current.sunset * 1000),
    },
    marineHours: marineData?.hourly || [],
  };
};

const handleClose = () => {
  setPopupActivity(null);
};


const hasMarineInterest = (interests: string[]) =>
  interests.some((id) => MARINE_ACTIVITY_IDS.includes(id));

const getDayLabel = (dateNum: number, idx: number, serverTime?: Date) => {
  const date = new Date(dateNum * 1000);
  const today = serverTime || new Date();
  const isSameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  return isSameDay ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'long' });
};

const getScoreCategory = (score: number) => {
  if (score >= 90) return { emoji: '💯', label: 'Perfect', color: '#10b981' };
  if (score >= 60) return { emoji: '👍', label: 'Good', color: '#3b82f6' };
  if (score >= 40) return { emoji: '🙆', label: 'Fair', color: '#fbbf24' };
  if (score >= 30) return { emoji: '⚠️', label: 'Poor', color: '#f59e0b' };
  return { emoji: '🏠', label: 'Indoor', color: '#8b5cf6' };
};

const isOutdoor = (activityId: string) => {
  return !!activityMessages[activityId];
};

function getWeatherIconClass(iconCode: string) {
  const map: Record<string, string> = {
    '01d': 'wi-day-sunny',
    '01n': 'wi-night-clear',
    '02d': 'wi-day-cloudy',
    '02n': 'wi-night-alt-cloudy',
    '03d': 'wi-cloud',
    '03n': 'wi-cloud',
    '04d': 'wi-cloudy',
    '04n': 'wi-cloudy',
    '09d': 'wi-showers',
    '09n': 'wi-showers',
    '10d': 'wi-day-rain',
    '10n': 'wi-night-alt-rain',
    '11d': 'wi-thunderstorm',
    '11n': 'wi-thunderstorm',
    '13d': 'wi-snow',
    '13n': 'wi-snow',
    '50d': 'wi-fog',
    '50n': 'wi-fog',
  };
  return map[iconCode] || 'wi-na';
}

export default function Home() {
  const { preferences } = useUserPreferences();
  const interests = preferences.interests ?? [];

  useEffect(() => {
    console.log('Preferences in Home:', preferences);
    console.log('Interests in Home:', interests);
  }, [preferences]);

  const hasMounted = useHasMounted();
  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCoastDialog, setShowCoastDialog] = useState(false);
  const [popupActivity, setPopupActivity] = useState<any>(null);
  const [timeInfo, setTimeInfo] = useState<any>(null);
  const [marineHours, setMarineHours] = useState<any[]>([]);

  const homeLocation = preferences.locations?.find((loc) => loc.type === 'home');
  const coastalLocation = preferences.locations?.find((loc) => loc.type === 'coastal');
  const isFirstTimeUser = interests.length === 0;
  const needsLocation = !homeLocation?.lat || !homeLocation?.lon;
      const usedHeroActivities = new Set<string>();

const heroDataByDay = forecastByDay.map((day, idx) => {
  const filteredActivities = activityTypes.filter(a => interests.includes(a.id));

  // ✅ CORRECT: Use the original getSuggestionsByDay structure
  const suggestionsData = getSuggestionsByDay({
    forecast: [{
      date: day.date,
      weather: {
        temperature: day.temperature,
        precipitation: day.rain,
        windspeed: day.wind_speed,
        clouds: day.clouds,
        humidity: day.humidity,
        visibility: day.visibility,
        waterTemperature: day.waterTemperature,
        waveHeight: day.waveHeight,
        swellHeight: day.swellHeight,
        swellPeriod: day.swellPeriod
      }
    }],
    interests,
    activities: filteredActivities,
    now: timeInfo?.serverTime || new Date()
  })[0]; // Get first day's data

  // ✅ CORRECT: Access suggestions directly (no double nesting)
  const suggestions = suggestionsData?.suggestions ?? [];
  const perfectList = suggestions.filter(s => s.score >= 80).sort((a, b) => b.score - a.score);
  const goodList = suggestions.filter(s => s.score >= 60 && s.score < 80).sort((a, b) => b.score - a.score);
  const indoorList = suggestionsData?.stayInside ?? [];

  // Select a unique hero activity for the day
  const heroActivity = selectHeroActivity(suggestions);

  // ✅ Add the hero to used activities AFTER finding it
  if (heroActivity) {
    usedHeroActivities.add(heroActivity.activityId);
  }

  return {
    day,
    suggestions,
    heroActivity,
    alsoGoodPerfect: perfectList.filter(a => a.activityId !== heroActivity?.activityId),
    suggestionsData,
    indoorList,
    dayLabel: getDayLabel(day.date, idx, timeInfo?.serverTime) // Add this for the render
  };
});


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
      'relaxation', 'family', 'cultural', 'leisure', 'home', 'social'
    ];

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
              date: Math.floor(new Date(noon.dt_txt).getTime() / 1000), // <-- Unix timestamp
              temperature: Math.round(noon.main.temp),
              tempMax: Math.round(noon.main.temp_max),
              tempMin: Math.round(noon.main.temp_min),
              condition: noon.weather[0].main,
              description: noon.weather[0].description,
              icon: noon.weather[0].icon,
              rain: Math.round(noon.rain?.['3h'] || 0),
              wind_speed: Math.round(noon.wind.speed * 3.6),
              windSpeed: Math.round(noon.wind.speed * 3.6),
              clouds: noon.clouds.all,
              humidity: noon.main.humidity,
              visibility: noon.visibility ?? 10000,
              waveHeight: undefined,
              waterTemperature: undefined,
            };
          });

  forecast.forEach(day => {
    const match = marineHours.find((h: any) => h.time.startsWith(day.date));
    if (match) {
      day.waveHeight = match.waveHeight?.noaa;
      day.waterTemperature = match.waterTemperature?.noaa; // <-- FIX: use waterTemperature
      day.swellHeight = match.swellHeight?.noaa;
      day.swellPeriod = match.swellPeriod?.noaa;
      day.windSpeed = match.windSpeed?.noaa;
    }
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

  useEffect(() => {
    async function fetchMarineData() {
      try {
        const startISO = new Date().toISOString();
        const endISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const lat = coastalLocation?.lat ?? homeLocation?.lat;
        const lon = coastalLocation?.lon ?? homeLocation?.lon;
        const res = await fetch(`/api/marine?lat=${lat}&lon=${lon}&start=${startISO}&end=${endISO}`);
        if (!res.ok) throw new Error(`Failed to fetch marine data: ${res.statusText}`);
        const data = await res.json();
        setMarineHours(data.hours || []);
      } catch (err) {
        console.error('Error fetching marine data:', err);
      }
    }

    if ((coastalLocation?.lat && coastalLocation?.lon) || (homeLocation?.lat && homeLocation?.lon)) {
      fetchMarineData();
    }
  }, [coastalLocation, homeLocation]);

  useEffect(() => {
    console.log('Forecast by day:', forecastByDay);
  }, [forecastByDay]);

  if (!hasMounted) {
    return <div>Loading...</div>;
  }

  if (needsLocation) {
    return <div>Please set your home location to see suggestions.</div>;
  }

  if (loading) {
    return <div>Loading your smart recommendations...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // MAIN RETURN - Enhanced version preserving all your functionality
return (
<>
  <section>
    {/* Banner - UNCHANGED */}
    <header
      className="homepage-banner"
      style={{
        position: 'relative',
        minHeight: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '8px 0',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
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
          display: 'block',
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
          height: 'auto',
        }}
      />
      <div style={{ flex: 1 }} />
      <div className="homepage-banner__text" style={{ textAlign: 'right', paddingRight: '12px' }}>
        <h1 className="homepage-banner__title" style={{ fontSize: '1.5rem', margin: 0, color: '#1f2937' }}>
          Wots good,&nbsp;when?
        </h1>
        <p className="homepage-banner__subtitle" style={{ fontSize: '0.9rem', margin: 0, color: '#6b7280' }}>
          Your personalised activity suggestions
        </p>
      </div>
    </header>

    {/* Burger Menu - UNCHANGED */}
    {menuOpen && (
      <>
        <div
          className="menu-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
            cursor: 'default',
            background: 'rgba(0,0,0,0.7)',
          }}
          onClick={() => setMenuOpen(false)}
        />
        <nav
          className="navigation-menu"
          style={{
            position: 'fixed',
            zIndex: 1000,
            top: 0,
            left: 0,
            background: '#2b323c',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '12px 24px',
            minWidth: '220px',
            maxWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            margin: '12px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <a href="/" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>
            Home
          </a>
          <a href="/interests" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>
            Manage my interests
          </a>
          <a href="/activities" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>
            Scan my interests
          </a>
          <a
            href="/weather"
            onClick={() => setMenuOpen(false)}
            style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}
          >
            Local weather in detail
          </a>
        </nav>
      </>
    )}

    {/* Coastal Location Dialog - UNCHANGED */}
    {showCoastDialog && (
      <CoastalLocationDialog
        open={showCoastDialog}
        onClose={() => setShowCoastDialog(false)}
        homeLocation={homeLocation}
        coastalLocation={coastalLocation}
        setHomeLocation={(loc) => {
          setMenuOpen(false);
          setShowCoastDialog(false);
          preferences.locations = preferences.locations?.map((l) =>
            l.type === 'home' ? { ...l, ...loc } : l
          );
          setHomeLocation(loc);
        }}
        setCoastalLocation={(loc) => {
          setMenuOpen(false);
          setShowCoastDialog(false);
          preferences.locations = preferences.locations?.map((l) =>
            l.type === 'coastal' ? { ...l, ...loc } : l
          );
          setCoastalLocation(loc);
        }}
      />
    )}

    {/* Main Content - ENHANCED */}
<div className="main-grid">
  {heroDataByDay.map(({ day, heroActivity, alsoGoodPerfect, suggestions, suggestionsData, dayLabel }, idx) => {
    const date = new Date(day.date * 1000);
    const isToday = idx === 0;

    return (
      <div
        key={day.date}
        className="activity-card-enhanced"
        style={{
          backgroundImage: `url(${getActivityBg(heroActivity?.activityId)})`,
        }}
      >
        <div className="activity-card-overlay" />
        <div className="activity-card-content">
            <div className="weather-icon-topright">
    <i className={`wi ${getWeatherIconClass(day.icon)}`}></i>
  </div>

          {/* Weather summary */}
          <div className="forecast-header">
            <div className="date-info">
              <h3 className="date-label">{dayLabel}</h3>

            </div>
            <div className="temperature-info">
              <span className="temperature-value">
                {Math.round(day.temperature)}°
              </span>
                            <span className="temperature-label">
  
  &nbsp;{day.description || 'partly cloudy'}
</span>

            </div>
          </div>

          {/* HERO ACTIVITY */}
          {heroActivity && (() => {
            const { activityId, score } = heroActivity;
            const activity = activityTypes.find((a) => a.id === activityId);
            const emoji = getActivityEmoji(activityId) || '❓';
            const scoreInfo = getScoreCategory(score || 0);
            const isOutdoorActivity = isOutdoor(activityId);
            const activityMessage = getActivityMessage(activityId, scoreInfo.label.toLowerCase(), []);

            const popupPayload = buildPopupActivityPayload({
              activityId,
              day,
              score,
              reasons: buildReasons(day, activityId),
            });

            const handlePopupOpen = () => {
              if (isOutdoorActivity) {
                setPopupActivity(popupPayload);
              }
            };

            return (
              <div
                className="card__hero-activity"
                role="button"
                tabIndex={0}
                onClick={handlePopupOpen}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && isOutdoorActivity) {
                    e.preventDefault();
                    handlePopupOpen();
                  }
                }}
              >
                <div className="card__hero-icon">{emoji}</div>
                <div className="card__hero-title">
                  <div className={`card__hero-name ${isOutdoorActivity ? 'outdoor' : ''}`}>
                    {activity?.name || activityId.replace(/_/g, ' ')}
                  </div>
                  <div className="card__hero-message">
                    {activityMessage}
                  </div>
                </div>
                <div
                  className="card__score-badge"
                  title={scoreInfo.label}
                  style={{ background: scoreInfo.color }}
                >
                  {scoreInfo.emoji}
                </div>
              </div>
            );
          })()}

          {/* Activity Lists */}
          <div className="activity-suggestions">
            {/* Perfect Activities */}
            {alsoGoodPerfect.length > 0 && (
              <div className="activity-section">
                <h4 className="also-good-title">💯 Also Perfect Today</h4>
                <ul className="also-good-list">
                  {alsoGoodPerfect.map(suggestion => {
                    const activity = activityTypes.find(a => a.id === suggestion.activityId);
                    const isOutdoorActivity = isOutdoor(suggestion.activityId);

                    return (
                      <li
                        key={suggestion.activityId}
                        role="button"
                        tabIndex={0}
                        className="also-good-item"
                        onClick={() => {
                          if (isOutdoorActivity) {
                            const popupPayload = buildPopupActivityPayload({
                              activityId: suggestion.activityId,
                              day,
                              score: suggestion.score,
                              reasons: buildReasons(day, suggestion.activityId)
                            });
                            setPopupActivity(popupPayload);
                          }
                        }}
                        style={{
                          cursor: isOutdoorActivity ? 'pointer' : 'default',
                        }}
                      >
                        <span>
                          {getActivityEmoji(suggestion.activityId)} {activity?.name || suggestion.activityId.replace(/_/g, ' ')}
                        </span>
                        <span className="also-good-score">
                          {Math.round(suggestion.score)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Good Activities */}
            {(() => {
              const goodActivities = suggestions
                .filter(s => s.score >= 60 && s.score < 80 && s.activityId !== heroActivity?.activityId)
                .sort((a, b) => b.score - a.score)
                .slice(0, 4);

              if (goodActivities.length === 0) return null;

              return (
                <div className="activity-section">
                  <h4 className="also-good-title">👍 Good Options Today</h4>
                  <ul className="activity-list-good">
                    {goodActivities.map(suggestion => {
                      const activity = activityTypes.find(a => a.id === suggestion.activityId);
                      const isOutdoorActivity = isOutdoor(suggestion.activityId);

                      return (
                        <li
                          key={suggestion.activityId}
                          role="button"
                          tabIndex={0}
                          className="activity-item-good"
                          onClick={() => {
                            if (isOutdoorActivity) {
                              const popupPayload = buildPopupActivityPayload({
                                activityId: suggestion.activityId,
                                day,
                                score: suggestion.score,
                                reasons: buildReasons(day, suggestion.activityId)
                              });
                              setPopupActivity(popupPayload);
                            }
                          }}
                          style={{
                            cursor: isOutdoorActivity ? 'pointer' : 'default',
                          }}
                        >
                          <span>
                            {getActivityEmoji(suggestion.activityId)} {activity?.name || suggestion.activityId.replace(/_/g, ' ')}
                          </span>
                          <span className="also-good-score">
                            {Math.round(suggestion.score)}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}

            {/* Indoor Section */}
            {(() => {
              const isEvening = timeInfo?.isEvening && isToday;
              if (!isEvening) {
                const indoorList = suggestionsData?.stayInside ?? [];
                if (!indoorList.length) return null;

                return (
                  <div className="indoor-section">
                    <h4 className="indoor-title">🏠 Indoor Alternatives</h4>
                    <ul className="indoor-list">
                      {indoorList.map((s) => {
                        const activity = activityTypes.find((a) => a.id === s.activityId);
                        const isOutdoorActivity = isOutdoor(s.activityId);

                        return (
                          <li
                            key={s.activityId}
                            className="indoor-item"
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (!isOutdoorActivity) return;
                              const popupPayload = buildPopupActivityPayload({
                                activityId: s.activityId,
                                day,
                                score: s.score ?? 0,
                                reasons: buildReasons(day, s.activityId),
                              });
                              setPopupActivity(popupPayload);
                            }}
                            style={{
                              cursor: 'default',
                            }}
                          >
                            <span>
                              {getActivityEmoji(s.activityId)} {activity?.name || s.activityId.replace(/_/g, ' ')}
                            </span>
                            <span style={{ color: '#8b5cf6', fontWeight: '600' }}>
                              {Math.round(s.score ?? 0)}%
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
          </div>
        </div>
      </div>
    );
  })}
</div>

    {/* Popup - UNCHANGED */}
    {popupActivity && (
      <Popup
        activityId={popupActivity.activityId}
        title={
          activityTypes.find(a => a.id === popupActivity.activityId)?.name ||
          popupActivity.activityId
        }
        category={popupActivity.category}
        message={popupActivity.message}
        marineData={popupActivity.marineData}
        weatherData={popupActivity.weatherData}
        score={popupActivity.score}
        onClose={() => setPopupActivity(null)}
      />
    )}
  </section>
</>
);
};

