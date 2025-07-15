import React, { useState, useEffect } from 'react';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { ActivityType, activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { WeatherCondition } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { safeEvaluate } from '../pages/evaluateCondition';

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

function Home() {
  const { preferences: { interests, location }, setPreferences, preferences } = useUserPreferences();
  const safeInterests = interests || [];
  const [inputLocation, setInputLocation] = useState(location?.name || '');

  const handleSaveLocation = async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputLocation)}&limit=1&appid=${import.meta.env.NEXT_PUBLIC_OPENWEATHER_KEY}`
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
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY as string;
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
    </section>
  );
}

export default Home;
