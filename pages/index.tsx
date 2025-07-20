'use client';

import React, { useState, useEffect } from 'react';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getActivityEmoji } from '../data/emojiMap';
import { getActivityBg } from '../data/bgMap';
import { useHasMounted } from '../utils/useHasMounted';
import CoastalLocationDialog from '../components/CoastalLocationDialog';

// List of activities that use marine conditions
const MARINE_ACTIVITY_IDS = [
  'surfing', 'kitesurfing', 'windsurfing', 'kayaking', 'canoeing',
  'snorkeling', 'scuba_diving', 'jet_skiing', 'stand_up_paddleboarding',
  'swimming', 'sea_fishing_shore', 'sea_fishing_boat'
];

// Helper to safely render marine values
const formatMarineValue = (value: number | undefined, label: string, unit: string): string =>
  typeof value === 'number' ? ` • ${label}: ${value}${unit}` : '';


const hasMarineInterest = (interests: string[]) =>
  interests.some(id => MARINE_ACTIVITY_IDS.includes(id));

// --- Utility for fallback indoor activities ---
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

function getDayLabel(dateStr: string, idx: number) {
  const date = new Date(dateStr);
  const today = new Date();
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }
  return date.toLocaleDateString('en-GB', { weekday: 'long' });
}

export default function Home() {
  const { preferences, setPreferences } = useUserPreferences();
  const hasMounted = useHasMounted();

  const homeLocation = preferences.locations?.find((loc) => loc.type === 'home');
  const coastalLocation = preferences.locations?.find((loc) => loc.type === 'coastal');
  const interests = preferences.interests ?? [];

  const [showCoastDialog, setShowCoastDialog] = useState(false);
  const [inputLocation, setInputLocation] = useState(homeLocation?.name ?? '');
  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFirstTimeUser = interests.length === 0;
  const needsLocation = !homeLocation?.lat || !homeLocation?.lon;


useEffect(() => {
  if (!hasMounted || !homeLocation?.lat || !homeLocation?.lon) return;
  let isMounted = true;

  async function fetchForecasts() {
    try {
      setLoading(true);
      setError(null);

      // --- OpenWeather (Land Forecast) ---
      const openWeatherKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
      const [lat, lon] = [homeLocation.lat, homeLocation.lon];

      const owRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${openWeatherKey}`
      );
      const owData = await owRes.json();
      if (!owData?.list) throw new Error('Invalid weather data');

      // Group forecasts by day
      const grouped: Record<string, any[]> = {};
      owData.list.forEach((item: any) => {
        const date = item.dt_txt.split(' ')[0];
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(item);
      });

      const forecast = Object.entries(grouped).slice(0, 5).map(([date, entries]: [string, any[]]) => {
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
          wind_speed: Math.round(noon.wind.speed * 3.6),
          clouds: noon.clouds.all,
          humidity: noon.main.humidity,
          visibility: noon.visibility ?? 10000,
          totalRain: Math.round(entries.reduce((sum, e) => sum + (e.rain?.['3h'] || 0), 0)),
          rainDetails: entries
            .filter(e => e.rain?.['3h'])
            .map(e => `${new Date(e.dt_txt).getHours()}:00 ${Math.round(e.rain['3h'])}mm`),
          // Marine fields (to be merged)
          waveHeight: undefined,
          waterTemperature: undefined,
          swellHeight: undefined,
          swellPeriod: undefined,
        };
      });

      // --- Stormglass (Marine Forecast) ---
      const marineLat = coastalLocation?.lat ?? lat;
      const marineLon = coastalLocation?.lon ?? lon;
      const now = Math.floor(Date.now() / 1000); // UNIX time in seconds
      const end = now + (5 * 86400); // 5 days

      let marineHours: any[] = [];
      try {
        const sgRes = await fetch(
          `/api/marine?lat=${marineLat}&lon=${marineLon}&start=${now}&end=${end}`
        );
        const sgData = await sgRes.json();
        if (Array.isArray(sgData.hours)) {
          marineHours = sgData.hours;
        } else {
          console.warn("Stormglass returned unexpected format", sgData);
        }
      } catch (marineErr) {
        console.warn('Failed to fetch marine data', marineErr);
      }

      // Merge marine data into forecast
      forecast.forEach(day => {
        const match = marineHours.find((h: any) => h.time.startsWith(day.date));
        if (match) {
          day.waveHeight = match.waveHeight?.sg;
          day.waterTemperature = match.waterTemperature?.sg;
          day.swellHeight = match.swellHeight?.sg;
          day.swellPeriod = match.swellPeriod?.sg;
        }
      });

      if (isMounted) setForecastByDay(forecast);
    } catch (err: any) {
      if (isMounted) {
        setForecastByDay([]);
        setError(err.message || 'Failed to load forecast data.');
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }

  fetchForecasts();
  return () => {
    isMounted = false;
  };
}, [homeLocation, coastalLocation, hasMounted]);


  // --- User location change handler ---
  const handleSaveLocation = async () => {
    try {
      setError(null);
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputLocation)}&limit=1&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_KEY}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon } = data[0];
        setPreferences({ ...preferences, location: { name: inputLocation, lat, lon } });
      } else {
        setError('Could not find that location. Please try another.');
      }
    } catch {
      setError('Failed to fetch location. Please try again.');
    }
  };

  return ( <section>
      {/* -------- HEADER -------- */}
      <header className="homepage-banner">
        <div className="homepage-banner__container">
          <img src="/wotnow-horizontal.png" alt="WotNow Logo" className="homepage-banner__logo" />
          <div className="homepage-banner__text">
            <h1 className="homepage-banner__title">What's good, when?</h1>
            <p className="homepage-banner__subtitle">Live your best life, every day</p>
          </div>
        </div>
      </header>

      {/* -------- PAGE CONTENT -------- */}
      <div>
        {/* --- LOCATION BANNER --- */}
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
            <span style={{ marginLeft: 10, color: '#237e6b', fontWeight: 500 }}>
  {hasMounted ? (location?.name ?? "") : ""}
</span>


          </div>
          {error && <p className="location-error" style={{ color: '#c00', marginTop: 6 }}>{error}</p>}
        </div>

        {/* --- ONBOARDING PROMPT --- */}
        {isFirstTimeUser && (
          <aside className="onboarding-message">
            👋 Welcome! <a href="/interests">Choose your favourite activities</a> to get personalized suggestions.
          </aside>
        )}

        {/* -------- SNAG-FREE, CONSISTENT UI STRUCTURE -------- */}
        <div>
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
                      humidity: day.humidity,
                      visibility: day.visibility,
                      waterTemperature: day.waterTemperature,
                      waveHeight: day.waveHeight,
                      swellHeight: day.swellHeight,
                      swellPeriod: day.swellPeriod
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
                    <div style={{ position: 'relative', zIndex: 2 }}>
                     
                     {/* --- HOMEPAGE CARD TOP --- */}
<div className="card-header">
  {/* Day Name */}
  <span className="day-name">
    {getDayLabel(day.date, idx)}
  </span>
  
  {/* Weather Icon + Description */}
  <div className="card-condition">
    <span>
      <img
        src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
        alt={day.description}
        className="weather-icon"
      />
    </span>
    <span>
      {day.description.charAt(0).toUpperCase() + day.description.slice(1)}
    </span>
  </div>
  
  {/* Main Temperature */}
  <span className="temperature">
    {day.temperature}°C
  </span>
</div>

{/* --- High/Low and other stats --- */}
<div className="weather-stats">
  <span>H: {day.tempMax}°</span>
  <span>L: {day.tempMin}°</span>
</div>




                      {/* --- Perfect suggestions --- */}
                      {perfect.length > 0 && (() => {
                        const best = perfect[0];
                        const activity = activityTypes.find(a => a.id === best.activityId);
                        return (
                          <div className="perfect-activity" style={{ marginTop: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontSize: '2.3rem', marginRight: 15 }}>
                                {getActivityEmoji(best.activityId)}
                              </span>
                              <strong style={{ fontSize: '1.25rem' }}>Perfect for&nbsp;
                                {activity?.name || best.activityId}
                                {best.score != null ? ` (${Math.round(best.score)})` : ''}
                              </strong>
                            </div>
                          </div>
                        );
                      })()}
                      
                {/* --- marine conditions --- */}
{hasMounted &&
  hasMarineInterest(interests) &&
  [
    day.waveHeight,
    day.waterTemperature,
    day.swellHeight,
    day.swellPeriod,
    day.wind_speed
  ].some(v => typeof v === 'number') && (
<div className="marine-block">
  <div className="marine-header">
    Conditions for{' '}
    {coastalLocation ? (
      <button
        type="button"
        onClick={() => setShowCoastDialog(true)}
        className="marine-location-button"
      >
        {coastalLocation.name}
      </button>
    ) : (
      'your coastal location'
    )}
    :
  </div>

  <ul className="marine-values">
    {typeof day.waveHeight === 'number' && (
      <li>🌊 Wave: {day.waveHeight}m</li>
    )}
    {typeof day.wind_speed === 'number' && (
      <li>💨 Wind: {day.wind_speed} km/h</li>
    )}
    {typeof day.waterTemperature === 'number' && (
      <li>🌡️ Water: {day.waterTemperature}°C</li>
    )}
    {typeof day.swellHeight === 'number' && (
      <li>🌊📈 Swell: {day.swellHeight}m</li>
    )}
    {typeof day.swellPeriod === 'number' && (
      <li>⏱️ Period: {day.swellPeriod}s</li>
    )}
  </ul>
</div>


  )
}



                      {/* --- Good suggestions --- */}
                      {!showOnlyIndoor && good.length > 0 && (
                        <div className="also-good-section" style={{ marginTop: 14 }}>
                          <strong>Also good:</strong>
                          <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
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

                    
                      {/* --- Indoor or fallback suggestions + Add More Interests --- */}
                      {(showOnlyIndoor || indoor.length > 0) && (
                        <>
                          <div className="indoor-section" style={{ marginTop: 14 }}>
                            <strong>Indoor ideas:</strong>
                            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
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
                          <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
                            <a
                              href="/interests"
                              style={{
                                display: "inline-block",
                                padding: "10px 20px",
                                borderRadius: "8px",
                                background: "rgba(59, 130, 246, 0.1)",
                                color: "#fff",
                                fontWeight: 600,
                                textDecoration: "none",
                                fontSize: "1rem",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
                              }}>
                              ➕ Add More Interests
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
     
        {showCoastDialog && (
          <CoastalLocationDialog
            open={showCoastDialog}
            onClose={() => setShowCoastDialog(false)}
            onSave={(loc) => {
              setPreferences((prev) => ({
                ...prev,
                locations: [
                  ...(prev.locations?.filter(l => l.type !== 'coastal') || []),
                  { ...loc, type: 'coastal' }
                ]
              }));
              setShowCoastDialog(false);
            }}
          />
        )}
      </div>
    </section>
  );
}


