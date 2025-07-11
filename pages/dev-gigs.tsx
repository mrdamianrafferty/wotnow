import React, { useState, useEffect } from 'react';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { ActivityType, activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { WeatherCondition } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { evaluateCondition } from '../pages/evaluateCondition';

function getWeatherIconEmoji(condition: string): string {
  switch (condition.toLowerCase()) {
    case 'sunny':
    case 'clear':
      return '☀️';
    case 'rain':
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
    case 'drizzle':
      return '🌦️';
    default:
      return '❔';
  }
}

function DevGigs() {
  const { preferences: { interests, location }, setPreferences, preferences } = useUserPreferences();
  const safeInterests = interests || [];
  const safeVenues = preferences.venues || [];
  const safeGenres = preferences.genres || [];
  const [inputLocation, setInputLocation] = useState(location?.name || '');

  const [gigs, setGigs] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  const handleSaveLocation = async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputLocation)}&limit=1&appid=${import.meta.env.VITE_OPENWEATHER_KEY}`
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

  console.log('🏠 Home component rendered, interests:', interests);

  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
        const lat = location?.lat ?? 40.4168;
        const lon = location?.lon ?? -3.7038;
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        );
        const data = await response.json();

        // Group forecast entries by date and sum rain per day, collect per-block rain details
        const groupedByDate: Record<string, { entries: any[]; totalRain: number }> = {};

        data.list.forEach((entry: any) => {
          const date = entry.dt_txt.split(' ')[0];
          if (!groupedByDate[date]) {
            groupedByDate[date] = { entries: [], totalRain: 0 };
          }
          groupedByDate[date].entries.push(entry);
          if (entry.rain?.['3h']) {
            groupedByDate[date].totalRain += entry.rain['3h'];
          }
        });

        const dailyForecast: WeatherForecastDay[] = Object.entries(groupedByDate)
          .slice(0, 5)
          .map(([date, { entries, totalRain }]) => {
            // Prefer noon entry, fallback to first
            const noonEntry = entries.find(e => e.dt_txt.includes('12:00:00')) || entries[0];
            const rainDetails = entries
              .filter(e => e.rain?.['3h'] && Math.round(e.rain['3h']) > 0)
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
              snow: noonEntry.snow?.['3h'] ? Math.round(noonEntry.snow['3h']) : 0,
              clouds: noonEntry.clouds?.all ?? null,
              humidity: noonEntry.main.humidity,
              visibility: noonEntry.visibility ?? null,
              totalRain: Math.round(totalRain),
              rainDetails
            };
          });

        setForecastByDay(dailyForecast);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, [location]);

  useEffect(() => {
    async function fetchGigs() {
      try {
        const params = new URLSearchParams();
        params.append('city', location?.name || '');
        if (selectedCategory) params.append('category', selectedCategory);
        if (safeVenues.length > 0) params.append('venues', safeVenues.join(','));
        if (safeGenres.length > 0) params.append('genres', safeGenres.join(','));

        const res = await fetch(`/api/gigs?${params.toString()}`);
        const data = await res.json();
        setGigs(data || []);
      } catch (err) {
        console.error('Error fetching gigs:', err);
      }
    }
    fetchGigs();
  }, [location, selectedCategory, safeVenues, safeGenres]);

  if (!forecastByDay) {
    return (
      <section>
        <h2>Loading forecast data…</h2>
        <p>Please wait while we fetch the latest weather information.</p>
      </section>
    );
  }

  if (forecastByDay.length === 0) {
    return (
      <section>
        <h2>No forecast data available.</h2>
        <p>We couldn't retrieve any forecast data. Please try again later or check your connection.</p>
      </section>
    );
  }

  return (
    <section>
      <header className="site-header">
        <div>
          <h1 className="page-title">WotNow</h1>
          <p className="page-subtitle"><a href="/interests">What are you into?</a></p>
        </div>
        <div className="location-input">
          <span>Location: </span>
          <input
            type="text"
            value={inputLocation}
            onChange={e => setInputLocation(e.target.value)}
            placeholder="Enter city name"
          />
          <button onClick={handleSaveLocation}>Save</button>
        </div>
      </header>

      <section className="main-grid">
        {forecastByDay.map((dayForecast, index) => {
          const weather = {
            temperature: dayForecast.temperature ?? Math.round((dayForecast.tempMin + dayForecast.tempMax) / 2),
            precipitation: dayForecast.rain ?? 0,
            windSpeed: dayForecast.wind_speed ?? 0,
            water_temp: null,
            clouds: dayForecast.clouds ?? null
          };

          const allActivities: ActivityType[] = activityTypes;

          console.log('Filtered activities:', allActivities);
          console.log('Weather for', dayForecast.date, ':', weather);

          const suggestionsResult =
            allActivities.length > 0
              ? getSuggestionsByDay({
                  activities: allActivities,
                  interests: safeInterests,
                  forecast: [
                    {
                      date: dayForecast.date,
                      weather
                    }
                  ]
                })
              : [];

          const todaySuggestions = suggestionsResult[0]?.suggestions ?? [];

          console.log('Suggestions for', dayForecast.date, ':', todaySuggestions);

          const friendlyTimeSlots = dayForecast.rainDetails.length > 0 ? (
            <>
              {dayForecast.rainDetails
                .map(detail => {
                  // detail is like "0:00 1mm"
                  const match = detail.match(/^(\d+):\d+\s+(\d+)mm$/);
                  if (!match) return detail;
                  const hour = parseInt(match[1], 10);
                  const mm = match[2];
                  if (hour === 0) {
                    return `${mm}mm around midnight`;
                  } else if (hour === 12) {
                    return `${mm}mm around noon`;
                  } else {
                    const period = hour < 12 ? 'AM' : 'PM';
                    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
                    return `${mm}mm around ${hour12} ${period}`;
                  }
                })
                .join(', ')}
            </>
          ) : null;

          return (
            <article key={dayForecast.date} className="homepage-card">
              <header className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="card-title" style={{ margin: 0 }}>
                    {index === 0
                      ? 'Today'
                      : index === 1
                      ? 'Tomorrow'
                      : new Date(dayForecast.date).toLocaleDateString('en-GB', { weekday: 'long' })}
                  </h2>
                  <div className="card-date" style={{ fontSize: '0.9rem' }}>
                    {new Date(dayForecast.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <div className="card-condition" style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '4rem', marginRight: '0.5rem' }}>{getWeatherIconEmoji(dayForecast.condition)}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 'normal', textTransform: 'capitalize' }}>{dayForecast.description}</span>
                </div>
              </header>

              <div className="card-info">
                <div
                  className="temperature"
                  style={{ fontSize: '2rem', fontWeight: 'bold' }}
                >
                  {dayForecast.temperature}°C
                </div>
                {dayForecast.totalRain > 0 && (
                  <div className="rain-summary">🌧️ {dayForecast.totalRain}mm expected ({friendlyTimeSlots})</div>
                )}
                <div className="weather-stats">
                  💨 {dayForecast.wind_speed} km/h | ☁️ {dayForecast.clouds}% | 💧 {dayForecast.humidity}% | 🔍 {Math.round((dayForecast.visibility ?? 10000) / 1000)} km
                </div>
              </div>

              <div className="card-suggestions" style={{ marginTop: '0.25rem' }}>
                {todaySuggestions.length > 0 ? (
                  <p>
                    <strong>Suggestions:</strong>{' '}
                    {todaySuggestions
                      .slice(0, 5)
                      .map((s, idx) => {
                        const activity = activityTypes.find(a => a.id === s.activityId);
                        return activity?.name || s.activityId;
                      })
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                ) : (
                  <p>No suggestions match your current interests for this day. <a href="/interests">Add more interests</a> to get better suggestions!</p>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <div style={{ marginTop: '1rem' }}>
        <label htmlFor="categorySelect">Category: </label>
        <select
          id="categorySelect"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
        >
          <option value="">All</option>
          <option value="Music">Music</option>
          <option value="Sports">Sports</option>
          <option value="Arts & Theatre">Arts & Theatre</option>
          <option value="Film">Film</option>
          <option value="Miscellaneous">Miscellaneous</option>
        </select>
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2>Upcoming Gigs</h2>
        {Array.isArray(gigs) && gigs.length > 0 ? (
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Date</th>
                <th>Artist</th>
                <th>Venue</th>
                <th>Genres</th>
              </tr>
            </thead>
            <tbody>
              {gigs.map((gig, idx) => (
                <tr key={idx}>
                  <td>{gig.date || 'N/A'}</td>
                  <td>{gig.artist || 'Unknown Artist'}</td>
                  <td>{gig.venue || 'Unknown Venue'}</td>
                  <td>
                    {(Array.isArray(gig.genres) ? gig.genres : []).map((genre, gidx) => (
                      <span key={gidx} className="badge bg-secondary" style={{ marginRight: '0.25rem' }}>
                        {genre}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No gigs found for your preferences. <a href="/venues">Set your venues and genres</a> to see suggestions here.</p>
        )}
      </section>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <p>🎵 No gig preferences yet. We can give you suggestions for music and events in your favourite local venues if you'd like.</p>
        <a href="/venues" className="btn btn-secondary">Set My Venues</a>
      </div>
    </section>
  );
}

export default DevGigs;