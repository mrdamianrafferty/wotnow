import React from 'react';
import { Link } from 'react-router-dom';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { activityTypes as activities } from '../data/activityTypes';
import { getSuitability } from '../utils/activitySuitability';

function flattenWeather(raw: any) {
  return {
    temp: raw?.main?.temp,
    humidity: raw?.main?.humidity,
    wind_speed: raw?.wind?.speed,
    visibility: raw?.visibility ? raw.visibility / 1000 : undefined,
    description: raw?.weather?.[0]?.description,
  };
}

const Home: React.FC = () => {
  const { preferences, fetchForecast } = useUserPreferences();
  React.useEffect(() => {
    fetchForecast();
  }, []);
  const forecastByDay: any[] = preferences.forecast || [];

  const days = ['Today', 'Tomorrow', ...Array.from({ length: 3 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 2);
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  })];

  const renderCell = (dayIndex: number) => {
    const day = forecastByDay[dayIndex];
    const weather = day?.afternoon || day?.morning || day?.night;
    if (!weather) return <em>Loading...</em>;

    const getWeatherEmoji = (description: string | undefined) => {
      if (!description) return '🌤️';
      const desc = description.toLowerCase();
      if (desc.includes('cloud')) return '☁️';
      if (desc.includes('rain')) return '🌧️';
      if (desc.includes('storm')) return '⛈️';
      if (desc.includes('snow')) return '❄️';
      if (desc.includes('clear')) return '☀️';
      return '🌤️';
    };
    const emoji = getWeatherEmoji(weather?.weather?.[0]?.description);

    // Debug output
    console.log('Interests:', preferences.interests);
    console.log('Raw weather:', weather);

    const perfect: string[] = [];
    const good: string[] = [];

    (preferences.interests || []).forEach((interestId: string) => {
      const activity = activities.find(a => a.id === interestId);
      if (!activity) {
        console.warn(`Activity with ID ${interestId} not found in activityTypes.`);
        return;
      }
      const flatWeather = flattenWeather(weather);
      // Debug output for each activity
      console.log(`Checking activity: ${activity.name}`);
      console.log('Flattened weather:', flatWeather);
      // Ensure condition arrays are valid before calling getSuitability
      if (
        Array.isArray(activity.poorConditions) &&
        Array.isArray(activity.goodConditions) &&
        Array.isArray(activity.perfectConditions)
      ) {
        try {
          const suitability = getSuitability(activity, flatWeather);
          console.log(`Suitability for ${activity.name}: ${suitability}`);
          if (suitability === 'perfect') perfect.push(activity.name);
          else if (suitability === 'good') good.push(activity.name);
        } catch (err) {
          console.error(`Error evaluating suitability for ${activity.name}:`, err);
        }
      } else {
        console.error(
          `Activity "${activity.name}" has malformed conditions:`,
          {
            poorConditions: activity.poorConditions,
            goodConditions: activity.goodConditions,
            perfectConditions: activity.perfectConditions,
          }
        );
      }
    });

    const shown = [...perfect, ...good].slice(0, 5);

    return (
      <div>
        <strong>{emoji} {days[dayIndex]}: Best for…</strong>
        <ul>
          {shown.map(name => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <h1 className="page-title">Welcome to WotNow</h1>
      <nav className="category-tabs">
        <button><Link to="/">Home</Link></button>
        <button><Link to="/interests">Interests</Link></button>
        <button><Link to="/weather">Weather</Link></button>
      </nav>
      <div className="location-pill">
        📍 <strong>{preferences.location?.name || 'Not set'}</strong>{' '}
        <Link to="/location">[ Change ]</Link>
      </div>

      {forecastByDay.length === 0 ? (
        <p>Fetching forecast data…</p>
      ) : (
        <div className="cards-container">
          {[0, 1, 2, 3, 4].map(idx => (
            <div key={idx} className="card">
              {renderCell(idx)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
