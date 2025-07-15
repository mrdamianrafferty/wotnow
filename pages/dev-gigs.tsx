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

export default function DevGigs() {
  const today = new Date();
  const { preferences, setPreferences } = useUserPreferences();
  const location = preferences.location;
  const userInterests = preferences.interests || [];
  const [inputLocation, setInputLocation] = useState(location?.name || 'Berlin');
  const [forecast, setForecast] = useState<any[]>([]);
  const [gigs, setGigs] = useState<any[]>([]);
  const [category, setCategory] = useState(preferences.gigsCategory || 'Music');
  const [genre, setGenre] = useState(preferences.gigsGenre || '');

  // Use countryCode from preferences if present
  const city = location?.name || 'Berlin';
  const countryCode = location?.countryCode || '';

  useEffect(() => {
    async function fetchForecast() {
      try {
        const key = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
        const lat = location?.lat ?? 52.52;
        const lon = location?.lon ?? 13.405;

        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${key}`
        );
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
        console.error('Forecast error:', err);
      }
    }

    fetchForecast();
  }, [location]);

  useEffect(() => {
    async function fetchGigs() {
      const params = new URLSearchParams();
      params.append('city', city);
      if (countryCode) params.append('countryCode', countryCode);
      if (category && category !== 'All') params.append('category', category);
      if (genre) params.append('genre', genre);

      try {
        const res = await fetch(`/api/gigs?${params.toString()}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setGigs(data);
        } else {
          setGigs([]);
        }
      } catch (err) {
        setGigs([]);
      }
    }

    fetchGigs();
  }, [city, countryCode, category, genre]);

  // Save location and set countryCode by geocoding
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
    } catch (err) {
      // Optional: fallback or error message
    }
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

  const genres = Array.from(new Set(
    (Array.isArray(gigs) ? gigs : [])
      .filter(g => g.category === 'Music' && Array.isArray(g.genres))
      .flatMap(g => g.genres)
  ));

  const filteredGigs = (Array.isArray(gigs) ? gigs : []).filter(g =>
    (category === 'All' || g.category === category) &&
    (!genre || (Array.isArray(g.genres) && g.genres.includes(genre)))
  );

  return (
    <main style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>WotNow: Suggestions & Upcoming Gigs</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Location</h2>
        <form onSubmit={handleLocationSave}>
          <input value={inputLocation} onChange={e => setInputLocation(e.target.value)} />
          <button type="submit">Save</button>
        </form>
      </section>

      <section>
        <h2>Suggestions by Day</h2>
        {suggestions.map(({ date, emoji, description, suggestions }) => (
          <div key={date} style={{ borderBottom: '1px solid #ccc', marginBottom: '1rem', paddingBottom: '1rem' }}>
            <strong>{date}</strong> – {emoji} {description}
            {suggestions.length > 0 ? (
              <ul>
                {suggestions.map(s => {
                  const act = activityTypes.find(a => a.id === s.activityId);
                  return (
                    <li key={s.activityId}>{act?.name || s.activityId} ({s.evaluation})</li>
                  );
                })}
              </ul>
            ) : (
              <p>No suggestions for this day.</p>
            )}
          </div>
        ))}
      </section>

      <section>
        <h2>Event Filters</h2>
        <div>
          {['All', 'Music', 'Arts & Theatre', 'Sports'].map(cat => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setGenre('');
                setPreferences(prev => ({ ...prev, gigsCategory: cat, gigsGenre: '' }));
              }}
              style={{ marginRight: 8, fontWeight: category === cat ? 'bold' : 'normal' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {category === 'Music' && genres.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            {genres.map(g => (
              <button
                key={g}
                onClick={() => {
                  setGenre(g);
                  setPreferences(prev => ({ ...prev, gigsGenre: g }));
                }}
                aria-pressed={genre === g}
                style={{ marginRight: 8, fontWeight: genre === g ? 'bold' : 'normal' }}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Upcoming Gigs in {city}</h2>

        {filteredGigs.length > 0 ? (
          <ul>
            {filteredGigs.map((gig, i) => (
              <li key={i} style={{ marginBottom: '1rem' }}>
                <strong>{gig.artist}</strong> @ {gig.venue}<br />
                📅 {gig.date}<br />
                {gig.genres && gig.genres.length > 0 && (
                  <div>{gig.genres.map(g => <span key={g} style={{
                    display: 'inline-block',
                    marginRight: '0.5rem',
                    padding: '0.2rem 0.4rem',
                    background: '#eee',
                    borderRadius: '4px'
                  }}>{g}</span>)}</div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No gigs match your filters.</p>
        )}
      </section>
    </main>
  );
}
