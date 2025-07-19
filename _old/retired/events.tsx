import React, { useState, useEffect } from 'react';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { ActivityType, activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';

function getWeatherIconEmoji(condition: string): string {
  switch (condition.toLowerCase()) {
    case 'sunny':
    case 'clear':
      return '☀️';
    case 'rain':
    case 'drizzle':
      return '🌧️';
    case 'cloudy':
    case 'clouds':
      return '☁️';
    case 'snow':
      return '❄️';
    case 'thunderstorm':
      return '⛈️';
    case 'fog':
    case 'mist':
      return '🌫️';
    default:
      return '❔';
  }
}

function getActivityEmoji(activityId: string): string {
  const emojiMap: Record<string, string> = {
    // Team Sports
    'football_soccer': '⚽',
    'cricket': '🏏',
    'rugby': '🏉',
    'basketball_outdoor': '🏀',
    'beach_volleyball': '🏐',
    'american_football': '🏈',
    'baseball': '⚾',
    'hurling': '🏑',
    'gaelic_football': '🏐',
    'hockey': '🏑',
    'netball': '🏐',
    
    // Individual Sports
    'golf': '⛳',
    'tennis': '🎾',
    'tennis_indoor': '🎾',
    'squash': '🎾',
    'badminton': '🏸',
    'table_tennis': '🏓',
    'archery': '🏹',
    'pickleball': '🏓',
    'padel': '🎾',
    
    // Water Sports
    'kayaking': '🛶',
    'canoeing': '🛶',
    'surfing': '🏄',
    'stand_up_paddleboarding': '🦦',
    'snorkeling': '🤿',
    'swimming': '🏊',
    'indoor_swimming': '🏊🏽‍♀️',
    
    // Action Sports
    'mountain_biking': '🚵',
    'rock_climbing': '🧗',
    'indoor_climbing': '🧗🏿‍♀️',
    'skateboarding': '🛹',
    'rollerblading': '🛼',
    
    // Cardio & Running
    'running': '🏃',
    'trail_running': '👟',
    'road_cycling': '🚴',
    'cycling': '🚲',
    'urban_exploring': '🚶🏽',
    
    // Strength & Fitness
    'gym_workout': '🏋️',
    'outdoor_gym': '💪',
    
    // Mindfulness & Wellness
    'yoga': '🧘',
    'outdoor_yoga': '🧘',
    'meditation': '🧘',
    'outdoor_meditation': '🧘',
    'pilates': '🤸',
    'martial_arts': '🥋',
    'tai_chi': '🥷🏽',
 
    // Nature Activities
    'hiking': '🥾',
    'birdwatching': '🦅',
    'photography': '📸',
    'foraging': '🌿',
    'mushroom_hunting': '🍄',
    'stargazing': '🌌',
 
    // Fishing
    'fishing': '🎣',
    'fly_fishing_freshwater': '🪶',
    'coarse_fishing': '🎣',
    'sea_fishing_shore': '🌊',
    'sea_fishing_boat': '🚤',
    'ice_fishing': '🧊',
    
    // Recreation & Outdoor
    'picnicking': '🧺',
    'bbq': '🪵',
    'geocaching': '🗺️',
    'camping': '⛺',
    'outdoor_reading': '📚',
    'dog_walking': '🐕‍🦺',
    'outdoor_playground': '🛝',
    'outdoor_chess': '♟️',
    
    // Winter Sports
    'skiing': '⛷️',
    'snowboarding': '🏂',
    'cross_country_skiing': '🎿',
    
    // Ice Sports
    'ice_skating': '⛸️',
    'curling': '🥌',
    'ice_hockey': '🏒',
    
    // Visual Arts & Crafts
    'painting': '🎨',
    'outdoor_painting': '🖼️',
    'crafts': '✂️',
    'knitting': '🧶',
    'diy': '🔨',
    
    // Music & Performance
    'playing_records': '👩🏽‍🎤',
    'make-music': '🪗',
    'dance': '💃',
    'outdoor_music': '🎷',

    // Literature & Learning
    'reading': '📚',
    
    // Social Activities
    'going_to_pub': '🍺',
    'playing_cards': '🃏',
    'watch_a_movie': '🎬',
    
    // Indoor Activities
    'cooking': '👨‍🍳',
    'cinema': '🎬',
    'museum': '🏛️',
    'shopping': '🛍️',
    'cafe': '☕'
  };
  
  return emojiMap[activityId] || '🎯';
}

// Indoor activities for fallback suggestions
const getIndoorActivities = (interests: string[]) => {
  const indoorActivityIds = [
    'reading', 'going_to_pub', 'watch_a_movie', 'cooking', 'cinema', 
    'museum', 'shopping', 'cafe', 'playing_cards', 'crafts', 'knitting', 
    'diy', 'indoor_climbing', 'gym_workout', 'yoga', 'meditation'
  ];
  
  return indoorActivityIds
    .filter(id => interests.includes(id))
    .slice(0, 4)
    .map(id => {
      const activity = activityTypes.find(a => a.id === id);
      return { activityId: id, activity };
    })
    .filter(item => item.activity);
};

export default function Home() {
  const { preferences, setPreferences } = useUserPreferences();
  const { interests = [], location } = preferences;

  const [inputLocation, setInputLocation] = useState(location?.name || '');
  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>([]);
  const isFirstTimeUser = interests.length === 0;

  useEffect(() => {
    async function fetchForecast() {
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY as string;
        const lat = location?.lat ?? 40.4168;
        const lon = location?.lon ?? -3.7038;
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        );
        const data = await response.json();

        const groupedByDate: Record<string, { entries: any[]; totalRain: number }> = {};
        data.list.forEach((entry: any) => {
          const date = entry.dt_txt.split(' ')[0];
          if (!groupedByDate[date]) groupedByDate[date] = { entries: [], totalRain: 0 };
          groupedByDate[date].entries.push(entry);
          if (entry.rain?.['3h']) {
            groupedByDate[date].totalRain += entry.rain['3h'];
          }
        });

        const dailyForecast: WeatherForecastDay[] = Object.entries(groupedByDate)
          .slice(0, 5)
          .map(([date, { entries, totalRain }]) => {
            const noonEntry = entries.find(e => e.dt_txt.includes('12:00:00')) || entries[0];
            const rainDetails = entries
              .filter(e => e.rain?.['3h'] > 0)
              .map(e => {
                const hour = new Date(e.dt_txt).getHours();
                return `${hour}:00 ${Math.round(e.rain['3h'])}mm`;
              });

            return {
              date,
              tempMax: Math.round(noonEntry.main.temp_max),
              tempMin: Math.round(noonEntry.main.temp_min),
              temperature: Math.round(noonEntry.main.temp),
              condition: noonEntry.weather[0].main,
              description: noonEntry.weather[0].description,
              icon: noonEntry.weather[0].icon,
              wind_speed: Math.round(noonEntry.wind.speed * 3.6),
              rain: Math.round(noonEntry.rain?.['3h'] ?? 0),
              snow: Math.round(noonEntry.snow?.['3h'] ?? 0),
              clouds: noonEntry.clouds?.all ?? 0,
              humidity: noonEntry.main.humidity,
              visibility: noonEntry.visibility ?? 10000,
              totalRain: Math.round(totalRain),
              rainDetails
            };
          });

        setForecastByDay(dailyForecast);
      } catch (err) {
        console.error('Failed to fetch forecast:', err);
        setForecastByDay([]);
      }
    }

    fetchForecast();
  }, [location]);

  const handleSaveLocation = async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputLocation)}&limit=1&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_KEY}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setPreferences({ ...preferences, location: { name: inputLocation, lat, lon } });
      } else {
        setPreferences({ ...preferences, location: { name: inputLocation } });
      }
    } catch {
      setPreferences({ ...preferences, location: { name: inputLocation } });
    }
  };

  if (forecastByDay.length === 0) {
    return (
      <section style={{ padding: '2rem' }}>
        <h2>Loading forecast…</h2>
        <p>Please wait while we fetch the latest weather information.</p>
      </section>
    );
  }

  return (
    <section>
      {/* Homepage logo banner */}
      <header className="homepage-banner">
        <div className="homepage-banner__container">
          <img
            src="wotnow-horizontal.png"
            alt="WotNow Logo"
            className="homepage-banner__logo"
          />
          <div className="homepage-banner__text">
            <h1 className="homepage-banner__title">What's good, when?</h1>
            <p className="homepage-banner__subtitle">
              Live your best life, every day
            </p>
          </div>
        </div>
      </header>

      {/* Location input */}
      <div className="location-banner">
        <div className="location-banner__container">
          <span className="location-banner__label">📍 Your location:</span>
          <input
            type="text"
            className="location-banner__input"
            value={inputLocation}
            onChange={e => setInputLocation(e.target.value)}
            placeholder="Enter city or town"
          />
          <button
            type="button"
            className="location-banner__button"
            onClick={handleSaveLocation}
          >
            Save
          </button>
        </div>
      </div>

      {/* Onboarding message */}
      {isFirstTimeUser && (
        <aside className="onboarding-message" style={{
          background: '#fffae6',
          border: '1px solid #ffe066',
          color: '#554400',
          padding: '1.2rem 2rem',
          borderRadius: 12,
          margin: '2rem 0',
          textAlign: 'center',
          fontWeight: 500
        }}>
          👋 Welcome! Get the most out of <strong>WotNow</strong> by{' '}
          <a href="/interests" style={{ color: '#2563eb', textDecoration: 'underline' }}>
            selecting your favourite activities
          </a>. You'll receive daily ideas matched to your weather!
        </aside>
      )}

      <section className="main-grid">
        {forecastByDay.map((day, idx) => {
          const suggestions = getSuggestionsByDay({
            forecast: [{
              date: day.date,
              weather: {
                temperature: day.temperature,
                precipitation: day.rain,
                windSpeed: day.wind_speed,
                water_temp: null,
                clouds: day.clouds
              }
            }],
            interests: interests,
            activities: activityTypes
          })[0]?.suggestions ?? [];

          const dayLabel = idx === 0
            ? 'Today'
            : idx === 1
              ? 'Tomorrow'
              : new Date(day.date).toLocaleDateString('en-GB', { weekday: 'long' });

          const prettyRainTimes = day.rainDetails?.map(detail => {
            const match = detail.match(/^(\d+):00\s(\d+)mm$/);
            if (!match) return detail;
            const hour = parseInt(match[1], 10);
            const mm = match[2];
            const label = hour === 0 ? 'midnight' : hour === 12 ? 'noon' : `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
            return `${mm}mm around ${label}`;
          }).join(', ');

          // ✅ CORRECTED: Filter using the actual evaluation strings returned by getSuggestionsByDay
          const perfectActivities = suggestions.filter(s => s.evaluation === 'perfect');
          const goodActivities = suggestions.filter(s => s.evaluation === 'good' || s.evaluation === 'acceptable');
          const indoorAlternatives = suggestions.filter(s => s.evaluation === 'indoorAlternative');
          const indoorActivities = suggestions.filter(s => s.evaluation === 'indoor');
          
          // Combined indoor options for fallback
          const allIndoorOptions = [...indoorAlternatives, ...indoorActivities];
          const fallbackIndoorOptions = getIndoorActivities(interests);

          // Weather context
          const getWeatherContext = () => {
            if (day.totalRain > 0) {
              return `${getWeatherIconEmoji(day.condition)} ${day.temperature}°C • ${day.totalRain}mm rain expected`;
            }
            return `${getWeatherIconEmoji(day.condition)} ${day.temperature}°C • ${day.description}`;
          };

          // Determine if weather is particularly bad
          const isBadWeather = day.totalRain > 10 || day.temperature < 5 || day.wind_speed > 40;

          return (
            <article key={day.date} className="activity-card-enhanced">
              {/* Bad weather scenario */}
              {isBadWeather && perfectActivities.length === 0 && goodActivities.length === 0 ? (
                <>
                  <div className="activity-card__header-bad">
                    <h2 className="activity-card__title-bad">
                      {dayLabel} - the weather sucks
                    </h2>
                    <p className="activity-card__subtitle-bad">Stay inside and have fun</p>
                  </div>
                  
                  {(allIndoorOptions.length > 0 || fallbackIndoorOptions.length > 0) && (
                    <div className="activity-card__indoor-only">
                      <ul className="activity-list-indoor">
                        {(allIndoorOptions.length > 0 ? allIndoorOptions : fallbackIndoorOptions).slice(0, 4).map((item, idx) => {
                          const activity = allIndoorOptions.length > 0 
                            ? activityTypes.find(a => a.id === item.activityId)
                            : item.activity;
                          const activityId = allIndoorOptions.length > 0 ? item.activityId : item.activityId;
                          
                          return (
                            <li key={idx} className="activity-item-indoor">
                              <span className="activity-emoji">{getActivityEmoji(activityId)}</span>
                              <span className="activity-name">{activity?.name}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                /* Normal weather scenarios */
                <>
                  <div className="activity-card__header">
                    <h2 className="activity-card__title">
                      Perfect for {dayLabel}:
                    </h2>
                    <p className="activity-card__date">
                      {new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>

                  {/* Perfect activity (prominent display) */}
                  {perfectActivities.length > 0 ? (
                    <div className="perfect-activity">
                      {(() => {
                        const perfectAct = activityTypes.find(a => a.id === perfectActivities[0].activityId);
                        return (
                          <div className="perfect-activity-item">
                            <span className="perfect-emoji">{getActivityEmoji(perfectActivities[0].activityId)}</span>
                            <span className="perfect-name">{perfectAct?.name || perfectActivities[0].activityId}</span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="no-perfect-activity">
                      <p className="no-perfect-text">Nothing's perfect but these are good:</p>
                    </div>
                  )}

                  {/* Good activities */}
                  {(perfectActivities.length > 1 || goodActivities.length > 0) && (
                    <div className="also-good-section">
                      <h3 className="also-good-title">Also good:</h3>
                      <ul className="activity-list-good">
                        {[...perfectActivities.slice(1), ...goodActivities].slice(0, 3).map((s, idx) => {
                          const act = activityTypes.find(a => a.id === s.activityId);
                          return (
                            <li key={idx} className="activity-item-good">
                              <span className="activity-emoji">{getActivityEmoji(s.activityId)}</span>
                              <span className="activity-name">{act?.name || s.activityId}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Indoor options */}
                  {(allIndoorOptions.length > 0 || fallbackIndoorOptions.length > 0) && (
                    <div className="indoor-section">
                      <h3 className="indoor-title">Or stay indoors</h3>
                      <ul className="activity-list-indoor">
                        {(allIndoorOptions.length > 0 ? allIndoorOptions : fallbackIndoorOptions).slice(0, 2).map((item, idx) => {
                          const activity = allIndoorOptions.length > 0 
                            ? activityTypes.find(a => a.id === item.activityId)
                            : item.activity;
                          const activityId = allIndoorOptions.length > 0 ? item.activityId : item.activityId;
                          
                          return (
                            <li key={idx} className="activity-item-indoor">
                              <span className="activity-emoji">{getActivityEmoji(activityId)}</span>
                              <span className="activity-name">{activity?.name}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* Weather context (always shown at bottom) */}
              <div className="activity-card__weather-context">
                <span className="weather-context-text">{getWeatherContext()}</span>
                {day.totalRain > 0 && prettyRainTimes && (
                  <span className="weather-context-detail">({prettyRainTimes})</span>
                )}
              </div>

              {/* Action button */}
              <div className="activity-card__action">
                <a href="/interests" className="add-interests-btn">
                  ➕ Add More Interests
                </a>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}
