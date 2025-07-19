'use client';

import React, { useState, useEffect } from 'react';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getActivityEmoji } from '../data/emojiMap';
import { getActivityBg } from '../data/bgMap';

// --- Utility: Indoor Fallback Activities ---
// This function returns indoor activities prioritized by user interests.
const getIndoorActivities = (interests: string[]) => {
  const indoorIds = [
    'reading', 'going_to_pub', 'watch_a_movie', 'cooking', 'cinema', 'museum', 'shopping',
    'cafe', 'playing_cards', 'crafts', 'knitting', 'diy', 'indoor_climbing', 'gym_workout',
    'yoga', 'meditation', 'painting'
  ];
  const prioritised = indoorIds.filter(id => interests.includes(id));
  const filled = [...prioritised, ...indoorIds.filter(id => !prioritised.includes(id))].slice(0, 10);
  return filled.map(id => {
    const activity = activityTypes.find(a => a.id === id);
    return { activityId: id, activity };
  });
};

export default function Home() {
  // --- User Preferences & State Initialization ---
  const { preferences, setPreferences } = useUserPreferences();
  const { interests = [], location } = preferences;

  // Tracks forecast data, input location text, loading & error states
  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>([]);
  const [inputLocation, setInputLocation] = useState(location?.name || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Utility flags for UI state
  const isFirstTimeUser = interests.length === 0;
  const needsLocation = !location?.lat || !location?.lon;

  // --- Effect: Fetch Weather Forecast ---
  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
        if (!apiKey) throw new Error('Missing OpenWeather API key');
        if (!location?.lat || !location?.lon) return;

        setLoading(true);

        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${apiKey}`
        );
        const data = await res.json();
        if (!data.list) throw new Error('Invalid weather data');

        // Group forecast by date
        const grouped: Record<string, any[]> = {};
        data.list.forEach((item: any) => {
          const date = item.dt_txt.split(' ')[0];
          if (!grouped[date]) grouped[date] = [];
          grouped[date].push(item);
        });

        // Build 5-day forecast summary
        const forecast = Object.entries(grouped)
          .slice(0, 5)
          .map(([date, entries]: [string, any[]]) => {
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
              snow: Math.round(noon.snow?.['3h'] || 0),
              wind_speed: Math.round(noon.wind.speed * 3.6),
              clouds: noon.clouds.all,
              humidity: noon.main.humidity,
              visibility: noon.visibility ?? 10000,
              totalRain: Math.round(entries.reduce((sum, e) => sum + (e.rain?.['3h'] || 0), 0)),
              rainDetails: entries.filter(e => e.rain?.['3h']).map(e => `${new Date(e.dt_txt).getHours()}:00 ${Math.round(e.rain['3h'])}mm`)
            };
          });

        setForecastByDay(forecast);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load forecast data.');
        setForecastByDay([]);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [location]);

  // --- Handler: Save User Location ---
  const handleSaveLocation = async () => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputLocation)}&limit=1&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_KEY}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon } = data[0];
        setPreferences({ ...preferences, location: { name: inputLocation, lat, lon } });
        setError(null);
      } else {
        setError('Could not find that location. Please try another.');
      }
    } catch {
      setError('Failed to fetch location. Please try again.');
    }
  };

  // --- Rendering ---
  return (
    <section>
      {/* === HEADER SECTION === */}
      <header className="homepage-banner">
        <div className="homepage-banner__container">
          <img src="/wotnow-horizontal.png" alt="WotNow Logo" className="homepage-banner__logo" />
          <div className="homepage-banner__text">
            <h1 className="homepage-banner__title">What's good, when?</h1>
            <p className="homepage-banner__subtitle">Live your best life, every day</p>
          </div>
        </div>
      </header>

      {/* === LOCATION INPUT BANNER === */}
      <div className="location-banner">
        <div className="location-banner__container">
          <label htmlFor="location-input" className="location-banner__label">📍 Your location:</label>
          <input
            id="location-input"
            type="text"
            className="location-banner__input"
            value={inputLocation}
            onChange={e => setInputLocation(e.target.value)}
            placeholder="Enter your city or town"
            aria-label="Location input"
          />
          <button className="location-banner__button" onClick={handleSaveLocation}>Save</button>
          <span 
            style={{ marginLeft: 10, color: '#237e6b', fontWeight: 500 }}
            aria-live="polite"
          >
            {location?.name ?? ''}
          </span>
        </div>
        {error && <p className="location-error" style={{ color: '#c00', marginTop: 6 }}>{error}</p>}
      </div>

      {/* === ONBOARDING PROMPT === */}
      {isFirstTimeUser && (
        <aside className="onboarding-message">
          👋 Welcome! <a href="/interests">Choose your favourite activities</a> to get personalized suggestions.
        </aside>
      )}

      {/* === CONDITIONAL UI: Location Needed, Loading, Error, or Forecast === */}
      {needsLocation ? (
        <div style={{ padding: '2rem' }}>Please enter a location above to view tailored suggestions.</div>
      ) : loading ? (
        <div style={{ padding: '2rem' }}>⏳ Loading forecast…</div>
      ) : error ? (
        <div style={{ padding: '2rem', color: 'red' }}>⚠️ {error}</div>
      ) : (
        <div className="main-grid" role="list">
          {forecastByDay.map((day, idx) => {
            const suggestions = getSuggestionsByDay({
              forecast: [{
                date: day.date,
                weather: {
                  temperature: day.temperature,
                  precipitation: day.rain,
                  windSpeed: day.wind_speed,
                  clouds: day.clouds,
                  water_temp: null,
                  humidity: day.humidity,
                  visibility: day.visibility
                }
              }],
              interests,
              activities: activityTypes
            })[0]?.suggestions ?? [];

            const perfect = suggestions.filter(s => s.evaluation === 'perfect');
            const good = suggestions.filter(s => ['good', 'acceptable'].includes(s.evaluation));
            const indoor = suggestions.filter(s => ['indoor', 'indoorAlternative'].includes(s.evaluation));
            const fallbackIndoor = getIndoorActivities(interests);
            const showOnlyIndoor = perfect.length === 0 && good.length === 0;

            const mainActivityId =
              perfect.length > 0 ? perfect[0].activityId
              : good.length > 0 ? good[0].activityId
              : indoor.length > 0 ? indoor[0].activityId
              : 'indoorsy';

            const cardBg = `url(${getActivityBg(mainActivityId)})`;

            return (
              <article
                key={day.date}
                className="activity-card-enhanced"
                style={{
                  backgroundImage: cardBg,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  borderRadius: 22,
                  color: '#fff',
                  overflow: 'hidden',
                  position: 'relative',
                  minHeight: 170,
                }}
                role="listitem"
                tabIndex={0}
                aria-label={`Suggestions for ${new Date(day.date).toLocaleDateString('en-GB', { weekday: 'long' })}`}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.32)',
                  borderRadius: 22,
                  zIndex: 1
                }} />
                <div style={{ position: 'relative', zIndex: 2, padding: '1.5rem' }}>
                  <h2 className="day-name">
                    {idx === 0
                      ? 'Today is perfect for'
                      : new Date(day.date).toLocaleDateString('en-GB', { weekday: 'long' })}
                  </h2>
                  <p>
                    {day.temperature}°C • {day.description} {day.totalRain > 0 ? `• ${day.totalRain}mm rain` : '• Dry day'}
                  </p>

                  {/* Perfect suggestion block */}
                  {perfect.length > 0 && (() => {
                    const best = perfect[0];
                    const activity = activityTypes.find(a => a.id === best.activityId);
                    return (
                      <div className="perfect-activity" style={{ marginTop: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '2.3rem', marginRight: 15 }}>
                            {getActivityEmoji(best.activityId)}
                          </span>
                          <strong style={{ fontSize: '1.25rem' }}>
                            {activity?.name || best.activityId}
                            {best.score != null ? ` (${Math.round(best.score)})` : ''}
                          </strong>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Good suggestions */}
                  {!showOnlyIndoor && good.length > 0 && (
                    <div className="also-good-section" style={{ marginTop: 14 }}>
                      <strong>Also good:</strong>
                      <ul>
                        {good.map(g => {
                          const a = activityTypes.find(x => x.id === g.activityId);
                          return (
                            <li key={g.activityId}>
                              {getActivityEmoji(g.activityId)} {a?.name || g.activityId}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Indoor or fallback suggestions */}
                  {(showOnlyIndoor || indoor.length > 0) && (
                    <div className="indoor-section" style={{ marginTop: 14 }}>
                      <strong>Indoor ideas:</strong>
                      <ul>
                        {(indoor.length > 0 ? indoor : fallbackIndoor).map(g => {
                          const a = activityTypes.find(x => x.id === g.activityId);
                          return (
                            <li key={g.activityId}>
                              {getActivityEmoji(g.activityId)} {a?.name || g.activityId}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
