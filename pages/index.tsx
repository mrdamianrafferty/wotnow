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

import '../styles/Card.css';
import '../styles/Popup.css';
import {
  getBeaufortDescription,
  getRainfallDescription,
  getTemperatureDescription,
  getHumidityDescription,
  getWaveDescription,
  getWaterTemperatureDescription,
} from '../utils/weatherLabels';
import Popup from '../components/Popup';
import { buildReasons } from '../utils/activityHelpers'; // Adjust the path based on your project structure
import { isOutdoor } from '../utils/activityHelpers';

const handleClose = () => {
  setPopupActivity(null);
};



const MARINE_ACTIVITY_IDS = [
  'surfing', 'kitesurfing', 'windsurfing', 'kayaking', 'canoeing',
  'snorkeling', 'scuba_diving', 'jet_skiing', 'stand_up_paddleboarding',
  'sea_swimming', 'sea_fishing_shore', 'beach', 'sea_fishing_boat',
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
      const usedHeroActivities = new Set<string>(); // declared before map()

  const heroDataByDay = forecastByDay.map((day, idx) => {
    const filteredActivities = activityTypes.filter(a => interests.includes(a.id));


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
    })[0];

    const suggestions = suggestionsData?.suggestions ?? [];
    const perfectList = suggestions.filter(s => s.score >= 80).sort((a, b) => b.score - a.score);
    const goodList = suggestions.filter(s => s.score >= 60 && s.score < 80).sort((a, b) => b.score - a.score);

    // Select a unique hero activity for the day
    const heroActivity = findHeroActivity(
  perfectList,
  goodList,
  usedHeroActivities, // ✅ must be a Set
  true                // allowRepeats
);

    console.log('Selected Hero Activity:', heroActivity);

    return {
      day,
      suggestions,
      heroActivity,
      alsoGoodPerfect: perfectList.filter(a => a.activityId !== heroActivity?.activityId),
      suggestionsData
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
              date,
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
        const res = await fetch(`/api/marine?lat=${homeLocation.lat}&lon=${homeLocation.lon}&start=${startISO}&end=${endISO}`);
        if (!res.ok) throw new Error(`Failed to fetch marine data: ${res.statusText}`);
        const data = await res.json();
        setMarineHours(data.hours || []);
      } catch (err) {
        console.error('Error fetching marine data:', err);
      }
    }

    if (homeLocation?.lat && homeLocation?.lon) {
      fetchMarineData();
    }
  }, [homeLocation]);

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

  // MAIN RETURN
  return (
  <>
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
          <p className="homepage-banner__subtitle"></p>
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
          <div className="main-grid">
            {heroDataByDay.map(({ day, suggestions, heroActivity, alsoGoodPerfect, suggestionsData }, idx) => {
              
              const marineSummary = marineConditionsSummary(day.waveHeight, day.windSpeed);
              const backgroundStyle = {
                backgroundImage: `url(${getActivityBg(heroActivity.activityId)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              };

              console.log('Background Style:', backgroundStyle);

              return (
                <article
                  key={day.date}
                  className="activity-card-enhanced"
                  role="listitem"
                  tabIndex={0}
                  aria-label={`Suggestions for ${getDayLabel(day.date, idx, timeInfo?.serverTime)}`}
                >
                  <div className="activity-card-overlay" />
                  <div className="activity-card-content" style={backgroundStyle}>

                    {/* HEADER */}
                    <div className="card__header">
                      <div className="card__header-title">
                        {getDayLabel(day.date, idx, timeInfo?.serverTime)}
                      </div>
                      
                      <img
                        src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                        alt={day.description}
                        className="card__weather-icon"
                      />
                    </div>

{heroActivity && (() => {
  const { activityId, score } = heroActivity;
  const activity = activityTypes.find((a) => a.id === activityId);
  const emoji = getActivityEmoji(activityId) || '❓';
  const scoreInfo = getScoreCategory(score || 0);
  const isOutdoorActivity = isOutdoor(activityId);
  

  // Prepare popup payload once
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
        <span className={`card__hero-name ${isOutdoorActivity ? 'outdoor' : ''}`}>
          {activity?.name || activityId.replace(/_/g, ' ')}
        </span>
      </div>

      <div
        className="card__score-badge"
        style={{ background: scoreInfo.color }}
        title={scoreInfo.label}
      >
        {scoreInfo.emoji}
      </div>
    </div>
  );
})()}



  {/* ALSO PERFECT TODAY */}
<ul className="also-good-perfect-list">
  {alsoGoodPerfect.map(suggestion => {
    const activity = activityTypes.find(a => a.id === suggestion.activityId);
    const isOutdoorActivity = isOutdoor(suggestion.activityId);

    return (
      <li
        key={suggestion.activityId}
        role="button"
        tabIndex={0}
        className="card__suggestion"
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
      >
        {getActivityEmoji(suggestion.activityId)}{' '}
        {activity?.name || suggestion.activityId.replace(/_/g, ' ')}{' '}
        {suggestion.score}%
      </li>
    );
  })}
</ul>



                    {/* LAND AND MARINE DATA */}
                      {/* ENHANCED LAND and MARINE CONDITIONS */}
                      {hasMarineInterest(interests) &&
                        [day.waveHeight, day.waterTemperature, day.swellHeight, day.swellPeriod, day.windSpeed].some(v => typeof v === 'number') && (
                          <div className="marine-block" style={{
                            marginBottom: '16px',
                            padding: '10px',
                            background: 'rgba(6, 69, 170, 0.5)',
                            borderRadius: '6px',
                            fontSize: '0.85rem' // Match "also good"
                          }}>
{/* homelocation summary text */}
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
</div>

{/* Marine summary text */}
<p style={{ fontSize: '0.85rem', margin: '0 0 6px 0', opacity: 0.92 }}>
  🌊 {marineSummary} in {' '}
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
  
</p>



<ul className="marine-values">
    {typeof day.temperature === 'number' && (
    <li>
      🌡️ {day.temperature}°
    </li>
  )}
  {typeof day.waveHeight === 'number' && (
  <li>🌊 {day.waveHeight}m</li>
)}
{typeof day.windSpeed === 'number' && (
  <li>💨 {day.windSpeed}km/h</li>
)}
{typeof day.waterTemperature === 'number' && (
  <li>🏊‍♂️ {day.waterTemperature.toFixed(1)}°</li>
)}

</ul>
                          </div>
                        )}

                    {/* ALSO GOOD TODAY */}
                    {suggestions
  .filter(s => s.score >= 60 && s.score < 80 && s.activityId !== heroActivity?.activityId)
  .sort((a, b) => b.score - a.score)
  .slice(0, 4)
  .map(suggestion => {
    const activity = activityTypes.find(a => a.id === suggestion.activityId);
    const isOutdoorActivity = isOutdoor(suggestion.activityId);

    return (
      <li
        key={suggestion.activityId}
        role="button"
        tabIndex={0}
        className="card__suggestion"
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
      >
        {getActivityEmoji(suggestion.activityId)}{' '}
        {activity?.name || suggestion.activityId.replace(/_/g, ' ')}{' '}
        {suggestion.score}%
      </li>
    );
  })}



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
            const isOutdoorActivity = isOutdoor(s.activityId);

            return (
              <li
                key={s.activityId}
                className="indoor-item"
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!isOutdoorActivity) return; // or return null if preferred
                  const popupPayload = buildPopupActivityPayload({
                    activityId: s.activityId,
                    day,
                    score: s.score ?? 0,
                    reasons: buildReasons(day, s.activityId),
                  });
                  setPopupActivity(popupPayload);
                }}
              >
                <span>
                  {getActivityEmoji(s.activityId)} {activity?.name || s.activityId.replace(/_/g, ' ')}
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
                        href="/activities"
                        className="add-interests-link"
                        onMouseEnter={(e) => e.currentTarget.classList.add('hover')}
                        onMouseLeave={(e) => e.currentTarget.classList.remove('hover')}
                      >
                        🏅 Browse All My Activities
                      </a>
                    </div>

                  </div>
                </article>
              );
            })} {/* <-- CLOSES .map() */}
            </div>
  
          )} {/* <-- CLOSES the main conditional rendering */}
        </div>
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
</section>


      {/* ✅ POPUP */}
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
    </>
  );
}
