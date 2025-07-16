import React, { useEffect, useState } from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';

function getWeatherIconEmoji(condition: string = '') {
  const val = condition.toLowerCase();
  if (val.includes('sun') || val === 'clear') return '☀️';
  if (val.includes('rain')) return '🌧️';
  if (val.includes('snow')) return '❄️';
  if (val.includes('cloud')) return '☁️';
  if (val.includes('thunderstorm')) return '⛈️';
  return '🌤️';
}

const EVENT_MAPPINGS: Record<string, {
  label: string;
  category: number;
  format?: number;
  keywords?: string;
  radius?: string;
}> = {
  live_music:        { label: 'Live Music', category: 103, format: 6 },
  music_festivals:   { label: 'Music Festivals', category: 103, format: 7 },
  dj_dance:          { label: 'DJ / Dance Events', category: 103, format: 5, keywords: 'DJ OR dance OR club' },
  local_music:       { label: 'Local Music Scene', category: 103, format: 6, radius: '25km' },
  theatre_performance: { label: 'Theatre & Performance', category: 105, keywords: 'theatre OR play OR drama' },
  comedy_entertainment: { label: 'Comedy & Entertainment', category: 105, format: 5, keywords: 'comedy OR stand-up OR improv' },
  art_exhibitions:   { label: 'Art Exhibitions', category: 105, keywords: 'exhibition OR gallery' },
  dance_movement:    { label: 'Dance & Movement', category: 105, format: 6, keywords: 'dance OR ballet OR contemporary' },
  film_media:        { label: 'Film & Media', category: 104, format: 9 },
  competitive_sports:{ label: 'Competitive Sports', category: 108, format: 12 },
  fitness_wellness:  { label: 'Fitness & Wellness', category: 107, format: 11 },
  running_cycling:   { label: 'Running & Cycling', category: 108, format: 12, keywords: 'run OR cycle OR marathon' },
  outdoor_adventures:{ label: 'Outdoor Adventures', category: 109, format: 11 },
  team_sports_social:{ label: 'Team Sports Social', category: 108, format: 4, keywords: 'football OR basketball OR volleyball' },
};

export default function DevGigs() {
  const { preferences, setPreferences } = useUserPreferences();
  const location = preferences.location;
  const userInterests = preferences.interests || [];
  const city = location?.name || 'Berlin';
  const [inputLocation, setInputLocation] = useState(city);
  const [forecast, setForecast] = useState<any[]>([]);
  const [eventsByCategory, setEventsByCategory] = useState<Record<string, any[]>>({});
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const selectedKeys = [
    ...(preferences.eventPreferences?.musicCategories ?? []),
    ...(preferences.eventPreferences?.artsCategories ?? []),
    ...(preferences.eventPreferences?.sportsCategories ?? []),
  ];

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    async function fetchForecast() {
      try {
        const key = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
        const lat = location?.lat ?? 52.52;
        const lon = location?.lon ?? 13.405;
        const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${key}`);
        const json = await res.json();
        const grouped: Record<string, any[]> = {};
        json.list.forEach((entry: any) => {
          const date = entry.dt_txt.split(' ')[0];
          if (!grouped[date]) grouped[date] = [];
          grouped[date].push(entry);
        });
        const days = Object.entries(grouped).slice(0, 5).map(([date, entries]) => {
          const noon = entries.find(e => e.dt_txt.includes('12:00:00')) || entries[0];
          return {
            date,
            temp: Math.round(noon.main.temp),
            tempMax: Math.round(noon.main.temp_max),
            tempMin: Math.round(noon.main.temp_min),
            condition: noon.weather[0].main,
            windSpeed: Math.round(noon.wind.speed * 3.6),
            rain: Math.round(noon.rain?.['3h'] || 0),
            clouds: noon.clouds?.all ?? 0,
          };
        });
        setForecast(days);
      } catch (err) {
        console.error('Failed to fetch forecast:', err);
      }
    }
    fetchForecast();
  }, [location]);

  useEffect(() => {
    async function fetchAllEvents() {
      if (!city || selectedKeys.length === 0) return;
      setLoadingEvents(true);
      const results: Record<string, any[]> = {};

      for (const key of selectedKeys) {
        const meta = EVENT_MAPPINGS[key];
        if (!meta) continue;
        const params = new URLSearchParams({ city, category: String(meta.category) });
        if (meta.format) params.set('format', String(meta.format));
        if (meta.keywords) params.set('keywords', meta.keywords);
        params.set('radius', meta.radius || '100km');
        try {
          const res = await fetch(`/api/events?${params.toString()}`);
          const json = await res.json();
          if (Array.isArray(json.events)) {
            results[key] = json.events;
          } else {
            results[key] = [];
          }
        } catch (err) {
          results[key] = [];
        }
      }

      if (process.env.NODE_ENV === 'development') {
        results['live_music'] ??= [];
        results['live_music'].push({
          id: 'demo-event',
          name: '🎵 Demo Live Music Event',
          date: new Date().toISOString(),
          venue: 'Test Venue Hall',
          city: city,
          url: 'https://eventbrite.com/fake'
        });
      }

      setEventsByCategory(results);
      setLoadingEvents(false);
    }
    fetchAllEvents();
  }, [city, selectedKeys.join(',')]);

  async function handleLocationSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputLocation)}&limit=1&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_KEY}`;
      const geoData = await fetch(geoUrl).then(res => res.json());
      if (geoData[0]) {
        const { lat, lon, country } = geoData[0];
        setPreferences(prev => ({
          ...prev,
          location: { name: inputLocation, lat, lon, countryCode: country }
        }));
      }
    } catch (err) {}
  }

  const suggestions = forecast.map(day => {
    const weather = {
      temperature: day.temp,
      precipitation: day.rain,
      windSpeed: day.windSpeed,
      water_temp: null,
      clouds: day.clouds,
    };
    const result = getSuggestionsByDay({
      forecast: [{ date: day.date, weather }],
      interests: userInterests,
      activities: activityTypes,
    });
    return {
      date: day.date,
      emoji: getWeatherIconEmoji(day.condition),
      description: day.condition,
      suggestions: result[0]?.suggestions || [],
    };
  });

  if (!isClient) return null;

  return (
    <main className="devgigs">
      <h1 className="devgigs__title">WotNow: Suggestions & Upcoming Events</h1>

      <section className="devgigs__section devgigs__section--location">
        <h2>Location</h2>
        <form className="devgigs__location-form" onSubmit={handleLocationSave}>
          <input
            className="devgigs__location-input"
            value={inputLocation}
            onChange={(e) => setInputLocation(e.target.value)}
            placeholder="Enter city or town"
            />
          <button className="devgigs__location-btn" type="submit">Save</button>
        </form>
      </section>

      <section className="devgigs__section devgigs__section--forecast">
        <h2>Suggestions by Day</h2>
        <ul className="devgigs__forecast-list">
        {suggestions.map(({ date, emoji, description, suggestions }) => (
          <li
            className="devgigs__forecast-item"
            key={date}
          >
            <span className="devgigs__forecast-date"><strong>{date}</strong> – {emoji} {description}</span>
            {suggestions.length > 0 ? (
              <ul className="devgigs__activity-list">
                {suggestions.map((s) => {
                  const act = activityTypes.find(a => a.id === s.activityId);
                  return (
                    <li className="devgigs__activity-item" key={s.activityId}>
                      {act?.name || s.activityId} <span className="devgigs__activity-eval">({s.evaluation})</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <span className="devgigs__forecast-none">No suggestions for this day.</span>
            )}
          </li>
        ))}
        </ul>
      </section>

      <section className="devgigs__section devgigs__section--events">
        <h2>Events You Might Enjoy</h2>
        {selectedKeys.length === 0 && (
          <p className="devgigs__no-categories">You haven't selected any event categories in your preferences. Head to the <strong>Interests</strong> page to pick some!</p>
        )}
        {!loadingEvents &&
          Object.values(eventsByCategory).flat().length === 0 &&
          selectedKeys.length > 0 && (
            <p className="devgigs__no-events">✅ No upcoming events found for your selected categories. Adjust preferences or check again later.</p>
        )}
        <div className="devgigs__events-group">
        {selectedKeys.map(key => {
          const meta = EVENT_MAPPINGS[key];
          const events = eventsByCategory[key];
          if (!meta) return null;
          return (
            <div className="devgigs__category" key={key}>
              <h3 className="devgigs__category-label">{meta.label}</h3>
              {loadingEvents ? (
                <p className="devgigs__loading">Fetching events…</p>
              ) : !events || events.length === 0 ? (
                <p className="devgigs__no-events-category">No events found in this category.</p>
              ) : (
                <ul className="devgigs__events-list">
                  {events.map(e => (
                    <li className="devgigs__event-card" key={e.id}>
                      <strong className="devgigs__event-title">{e.name}</strong><br />
                      <span className="devgigs__event-details">
                        {new Date(e.date).toLocaleString()} at{' '}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue + ', ' + e.city)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="devgigs__event-venue-link"
                        >
                          {e.venue}
                        </a>
                      </span><br />
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="devgigs__event-link"
                      >
                        Event details →
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        </div>
      </section>
    </main>
  );
}
