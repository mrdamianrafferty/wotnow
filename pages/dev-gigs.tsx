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
  // Date range constants for filtering gigs
  const today = new Date();
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(today.getMonth() + 3);
  const dateRange = {
    start: today.toISOString().split('T')[0],
    end: threeMonthsLater.toISOString().split('T')[0]
  };
  const { preferences, setPreferences } = useUserPreferences();
  const location = preferences.location;
  const safeInterests = preferences.interests || [];
  const safeVenues = preferences.venues || [];
  const [inputLocation, setInputLocation] = useState(location?.name || '');
  const [gigs, setGigs] = useState([]);
  // Category/genre state, default category is 'Music', genre is empty (All)
  const [selectedCategory, setSelectedCategory] = useState(preferences.gigsCategory || 'Music');
  const [selectedGenre, setSelectedGenre] = useState(preferences.gigsGenre || '');

  // Tab click handlers
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPreferences({ ...preferences, gigsCategory: cat, gigsGenre: '' });
    if (cat !== 'Music') {
      setSelectedGenre('');
    }
  };

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre);
    setPreferences({ ...preferences, gigsCategory: selectedCategory, gigsGenre: genre });
  };

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

  // Fetch gigs with new category/genre UI
  useEffect(() => {
    async function fetchGigs() {
      try {
        const params = new URLSearchParams();
        params.append('city', location?.name || '');
        if (selectedCategory) params.append('category', selectedCategory);
        if (selectedCategory === 'Music' && selectedGenre) params.append('genre', selectedGenre);
        if (safeVenues.length > 0) params.append('venues', safeVenues.join(','));
        const res = await fetch(`/api/gigs?${params.toString()}`);
        const data = await res.json();
        setGigs(data || []);
      } catch (err) {
        console.error('Error fetching gigs:', err);
      }
    }
    fetchGigs();
  }, [location, selectedCategory, selectedGenre, safeVenues]);

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

  // All genres for the current set of gigs (for Music category)
  const allGenres = Array.from(
    new Set(
      gigs
        .filter(g => g.category === 'Music' && Array.isArray(g.genres))
        .flatMap(g => g.genres)
    )
  );

  // Filter gigs by date range, category, and genre
  const filteredGigs = gigs.filter(gig =>
    (!gig.date ? false : (() => {
      const gigDate = new Date(gig.date);
      return gigDate >= today && gigDate <= threeMonthsLater;
    })()) &&
    (selectedCategory === 'All' || gig.category === selectedCategory) &&
    (selectedCategory !== 'Music' || !selectedGenre || (Array.isArray(gig.genres) && gig.genres.includes(selectedGenre)))
  );

  // Needed for date range display
  const todayISO = today.toISOString().split('T')[0];
  const threeMonthsLaterISO = threeMonthsLater.toISOString().split('T')[0];

  // Ticketmaster category/genre mapping (should exist in file scope or above, not duplicated)
  const ticketmasterCategoryMap = {
    'Music': 'KZFzniwnSyZfZ7v7nJ',
    'Arts & Theatre': 'KZFzniwnSyZfZ7v7na',
    'Sports': 'KZFzniwnSyZfZ7v7nE',
    'All': ''
  };
  // Genre mapping for Music genres (should exist in file scope or above, not duplicated)
  const ticketmasterGenreMap = {};
  allGenres.forEach(g => { ticketmasterGenreMap[g] = g; });

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

          // Keep logging for debug
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
      <section>
        {/* Category and genre filter tabs */}
        <nav aria-label="Event categories" className="category-tabs" style={{ marginBottom: '1rem', marginTop: '2rem' }}>
          {['Music', 'Arts & Theatre', 'Sports', 'All'].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(ticketmasterCategoryMap[cat] || '');
                setSelectedGenre('');
              }}
              style={{
                marginRight: '0.5rem',
                padding: '0.5rem 1rem',
                border: selectedCategory === (ticketmasterCategoryMap[cat] || '') ? '2px solid #0070f3' : '1px solid #ccc',
                background: selectedCategory === (ticketmasterCategoryMap[cat] || '') ? '#eef6ff' : '#fff',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
              aria-pressed={selectedCategory === (ticketmasterCategoryMap[cat] || '')}
            >
              {cat}
            </button>
          ))}
        </nav>

        {selectedCategory === 'KZFzniwnSyZfZ7v7nJ' /* Ticketmaster 'Music' segmentId */ && (
          <nav aria-label="Music genres" className="genre-tabs" style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setSelectedGenre('')}
              style={{
                marginRight: '0.5rem',
                padding: '0.3rem 0.8rem',
                border: !selectedGenre ? '2px solid #0070f3' : '1px solid #ccc',
                background: !selectedGenre ? '#eef6ff' : '#fff',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '0.85rem'
              }}
              aria-pressed={!selectedGenre}
            >
              All Genres
            </button>
            {allGenres.map(genre => (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(ticketmasterGenreMap[genre] || '')}
                style={{
                  marginRight: '0.5rem',
                  padding: '0.3rem 0.8rem',
                  border: selectedGenre === (ticketmasterGenreMap[genre] || '') ? '2px solid #0070f3' : '1px solid #ccc',
                  background: selectedGenre === (ticketmasterGenreMap[genre] || '') ? '#eef6ff' : '#fff',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}
                aria-pressed={selectedGenre === (ticketmasterGenreMap[genre] || '')}
              >
                {genre}
              </button>
            ))}
          </nav>
        )}

        <section aria-labelledby="upcoming-gigs-heading">
          <h2 id="upcoming-gigs-heading">Upcoming Gigs and Events</h2>

          <div className="date-range" style={{ marginBottom: '1rem' }}>
            Showing events from <time dateTime={todayISO}>{today.toLocaleDateString()}</time> to <time dateTime={threeMonthsLaterISO}>{threeMonthsLater.toLocaleDateString()}</time>
          </div>

          {filteredGigs.length > 0 ? (
            <ul className="gigs-list" style={{ listStyle: 'none', padding: 0 }}>
              {filteredGigs.slice(0, 10).map((gig, idx) => (
                <li
                  key={idx}
                  className="gig-item"
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: '#fff'
                  }}
                >
                  <h3 style={{ fontSize: '1.1rem' }}>
                    {gig.artist?.trim() || 'Unknown Artist'}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#555' }}>
                    📅 <time dateTime={gig.dateISO || ''}>{gig.date || 'N/A'}</time> | 📍 {gig.venue?.trim() || 'N/A'}
                  </p>
                  {Array.isArray(gig.genres) && gig.genres.length > 0 ? (
                    <div style={{ marginTop: '0.25rem' }}>
                      {gig.genres.map((genre, gidx) => (
                        <span
                          key={gidx}
                          className="badge genre-badge"
                          style={{
                            display: 'inline-block',
                            marginRight: '0.25rem',
                            padding: '0.2rem 0.4rem',
                            background: '#0070f3',
                            color: '#fff',
                            borderRadius: '3px',
                            fontSize: '0.75rem'
                          }}
                        >
                          {genre || 'N/A'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#777' }}>
                      🎵 Genres: N/A
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ marginTop: '1rem' }}>
              No gigs or events found for your preferences in this date range.
              <br />
              <a href="/venues">Select your favourite venues</a> or adjust your filters to see more suggestions.
            </p>
          )}
        </section>
      </section>
    </section>
  );
}

export default DevGigs;