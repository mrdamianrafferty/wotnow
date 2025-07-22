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

// ✅ FIXED: Move time-sensitive logic into useEffect to prevent hydration mismatch
const MARINE_ACTIVITY_IDS = [
  'surfing', 'kitesurfing', 'windsurfing', 'kayaking', 'canoeing',
  'snorkeling', 'scuba_diving', 'jet_skiing', 'stand_up_paddleboarding',
  'swimming', 'sea_fishing_shore', 'sea_fishing_boat'
];

// Helper functions (safe for SSR)
const formatMarineValue = (value: number | undefined, label: string, unit: string): string =>
  typeof value === 'number' ? ` • ${label}: ${value}${unit}` : '';

const hasMarineInterest = (interests: string[]) =>
  interests.some(id => MARINE_ACTIVITY_IDS.includes(id));

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

// ✅ FIXED: Safe day label function with consistent formatting
function getDayLabel(dateStr: string, idx: number, serverTime?: Date) {
  console.log(`🗓️ getDayLabel called for ${dateStr}, idx: ${idx}`);
  
  const date = new Date(dateStr);
  const today = serverTime || new Date();
  
  const isSameDay = date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  
  if (isSameDay) {
    return 'Today';
  }
  
  return date.toLocaleDateString('en-GB', { weekday: 'long' });
}

export default function Home() {
  console.log('🏠 Home component rendering...');
  
  const { preferences, setPreferences } = useUserPreferences();
  const hasMounted = useHasMounted();

  // ✅ FIXED: All client-only state properly managed
  const [timeInfo, setTimeInfo] = useState<{
    currentDay: string;
    hour: number;
    contextTags: string[];
    serverTime: Date;
  } | null>(null);

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

  // ✅ COMPREHENSIVE LOGGING: Add detailed debugging
  useEffect(() => {
    console.log('🔍 HYDRATION DEBUG - Component state:', {
      hasMounted,
      homeLocation: homeLocation ? `${homeLocation.name} (${homeLocation.lat}, ${homeLocation.lon})` : 'undefined',
      coastalLocation: coastalLocation ? `${coastalLocation.name}` : 'undefined',
      interests: interests.length,
      interestsList: interests,
      isFirstTimeUser,
      needsLocation
    });
  }, [hasMounted, homeLocation, coastalLocation, interests, isFirstTimeUser, needsLocation]);

  // ✅ FIXED: Handle time-sensitive data after hydration
  useEffect(() => {
    if (!hasMounted) return;
    
    console.log('⏰ Setting up time info after hydration...');
    
    const now = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const currentDay = days[now.getDay()];
    const hour = now.getHours();

    const contextTags = [
      currentDay,
      hour >= 18 ? 'evening' : hour >= 12 ? 'afternoon' : 'morning',
      'relaxation', 'family', 'cultural', 'leisure', 'home', 'social'
    ];

    console.log('⏰ Time info generated:', { currentDay, hour, contextTags });

    setTimeInfo({
      currentDay,
      hour,
      contextTags,
      serverTime: now
    });
  }, [hasMounted]);

  // ✅ FIXED: Weather fetching with comprehensive error handling
  useEffect(() => {
    if (!hasMounted || !homeLocation?.lat || !homeLocation?.lon) {
      console.log('⏭️ Skipping weather fetch - conditions not met:', {
        hasMounted,
        hasLocation: !!homeLocation?.lat && !!homeLocation?.lon
      });
      return;
    }

    let isMounted = true;
    console.log('🌤️ Starting weather fetch...');

    async function fetchForecasts() {
      try {
        console.log('🌤️ Fetching forecasts for:', homeLocation.name);
        setLoading(true);
        setError(null);

        // OpenWeather API
        const openWeatherKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
        console.log('🔑 OpenWeather key available:', !!openWeatherKey);
        
        const [lat, lon] = [homeLocation.lat, homeLocation.lon];
        console.log('📍 Coordinates:', { lat, lon });

        const owRes = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${openWeatherKey}`
        );
        
        console.log('🌤️ OpenWeather response status:', owRes.status);
        const owData = await owRes.json();
        
        if (!owData?.list) {
          console.error('❌ Invalid OpenWeather ', owData);
          throw new Error('Invalid weather data');
        }

        console.log('✅ OpenWeather data received, entries:', owData.list.length);

        // Group forecasts by day
        const grouped: Record<string, any[]> = {};
        owData.list.forEach((item: any) => {
          const date = item.dt_txt.split(' ')[0];
          if (!grouped[date]) grouped[date] = [];
          grouped[date].push(item);
        });

        console.log('📅 Grouped forecast days:', Object.keys(grouped));

        const forecast = Object.entries(grouped).slice(0, 5).map(([date, entries]: [string, any[]]) => {
          const noon = entries.find(e => e.dt_txt.includes('12:00:00')) ?? entries[0];
          console.log(`📅 Processing day ${date}, entries: ${entries.length}, noon `, !!noon);
          
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

        console.log('✅ Land forecast processed:', forecast.length, 'days');

        // Marine data (optional, will fail gracefully)
        const marineLat = coastalLocation?.lat ?? lat;
        const marineLon = coastalLocation?.lon ?? lon;
        const now = Math.floor(Date.now() / 1000);
        const end = now + (5 * 86400);

        console.log('🌊 Attempting marine data fetch for:', { marineLat, marineLon });

        let marineHours: any[] = [];
        try {
          const sgRes = await fetch(
            `/api/marine?lat=${marineLat}&lon=${marineLon}&start=${now}&end=${end}`
          );
          const sgData = await sgRes.json();
          
          console.log('🌊 Marine API response:', sgRes.status, sgData);
          
          if (Array.isArray(sgData.hours)) {
            marineHours = sgData.hours;
            console.log('✅ Marine data received:', marineHours.length, 'hours');
          } else {
            console.warn('⚠️ Unexpected marine data format:', sgData);
          }
        } catch (marineErr) {
          console.warn('⚠️ Marine fetch failed (expected if quota exceeded):', marineErr);
        }

        // Merge marine data
        forecast.forEach(day => {
          const match = marineHours.find((h: any) => h.time.startsWith(day.date));
          if (match) {
            day.waveHeight = match.waveHeight?.sg;
            day.waterTemperature = match.waterTemperature?.sg;
            day.swellHeight = match.swellHeight?.sg;
            day.swellPeriod = match.swellPeriod?.sg;
            console.log(`🌊 Marine data merged for ${day.date}`);
          }
        });

        if (isMounted) {
          console.log('✅ Setting forecast ', forecast);
          setForecastByDay(forecast);
        }

      } catch (err: any) {
        console.error('❌ Weather fetch error:', err);
        if (isMounted) {
          setForecastByDay([]);
          setError(err.message || 'Failed to load forecast data.');
        }
      } finally {
        if (isMounted) {
          console.log('🏁 Weather fetch complete');
          setLoading(false);
        }
      }
    }

    fetchForecasts();
    return () => {
      console.log('🧹 Cleaning up weather fetch');
      isMounted = false;
    };
  }, [homeLocation, coastalLocation, hasMounted]);

  // Location save handler
  const handleSaveLocation = async () => {
    console.log('💾 Saving location:', inputLocation);
    try {
      setError(null);
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputLocation)}&limit=1&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_KEY}`
      );
      const data = await res.json();
      console.log('🗺️ Geocoding response:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon } = data[0];
        console.log('✅ Location found:', { name: inputLocation, lat, lon });
        setPreferences({ 
          ...preferences, 
          locations: [
            ...(preferences.locations?.filter(l => l.type !== 'home') || []),
            { name: inputLocation, lat, lon, type: 'home' }
          ]
        });
      } else {
        console.error('❌ Location not found');
        setError('Could not find that location. Please try another.');
      }
    } catch (err) {
      console.error('❌ Location save error:', err);
      setError('Failed to fetch location. Please try again.');
    }
  };

  // ✅ FIXED: Prevent hydration mismatch by ensuring consistent initial render
  if (!hasMounted) {
    console.log('⏳ Pre-hydration render - showing minimal content');
    return (
      <section>
        <header className="homepage-banner">
          <div className="homepage-banner__container">
            <img src="/wotnow-horizontal.png" alt="WotNow Logo" className="homepage-banner__logo" />
            <div className="homepage-banner__text">
              <h1 className="homepage-banner__title">What's good, when?</h1>
              <p className="homepage-banner__subtitle">Live your best life, every day</p>
            </div>
          </div>
        </header>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div>⏳ Loading your personalized suggestions...</div>
        </div>
      </section>
    );
  }

  console.log('🎨 Rendering main content - hydration complete');

  return (
    <section>
      {/* HEADER */}
      <header className="homepage-banner">
        <div className="homepage-banner__container">
          <img src="/wotnow-horizontal.png" alt="WotNow Logo" className="homepage-banner__logo" />
          <div className="homepage-banner__text">
            <h1 className="homepage-banner__title">What's good, when?</h1>
            <p className="homepage-banner__subtitle">Live your best life, every day</p>
          </div>
        </div>
      </header>

      <div>
        {/* LOCATION BANNER */}
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
              {homeLocation?.name ?? ""}
            </span>
          </div>
          {error && <p className="location-error" style={{ color: '#c00', marginTop: 6 }}>{error}</p>}
        </div>

        {/* ONBOARDING */}
        {isFirstTimeUser && (
          <aside className="onboarding-message">
            👋 Welcome! <a href="/interests">Choose your favourite activities</a> to get personalized suggestions.
          </aside>
        )}

        {/* MAIN CONTENT */}
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
                console.log(`🎯 Processing suggestions for day ${idx} (${day.date})`);
                
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

                console.log(`🎯 Day ${idx} suggestions:`, {
                  total: suggestions.length,
                  evaluations: suggestions.map(s => s.evaluation)
                });

                const perfect = suggestions.filter(s => s.evaluation === 'perfect');
                const good = suggestions.filter(s => ['good', 'acceptable'].includes(s.evaluation));
                const indoor = suggestions.filter(s => ['indoor', 'indoorAlternative'].includes(s.evaluation));
                const showOnlyIndoor = perfect.length === 0 && good.length === 0;

                console.log(`🎯 Day ${idx} categorized:`, {
                  perfect: perfect.length,
                  good: good.length,
                  indoor: indoor.length,
                  showOnlyIndoor
                });

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
                    aria-label={`Suggestions for ${getDayLabel(day.date, idx, timeInfo?.serverTime)}`}
                  >
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.32)',
                      borderRadius: 22,
                      zIndex: 1
                    }} />
                    <div style={{ position: 'relative', zIndex: 2 }}>

                      {/* CARD HEADER */}
                      <div className="card-header">
                        <span className="day-name">
                          {getDayLabel(day.date, idx, timeInfo?.serverTime)}
                        </span>
                        
                        <div className="card-condition">
                          <img
                            src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                            alt={day.description}
                            className="weather-icon"
                          />
                          <span>
                            {day.description.charAt(0).toUpperCase() + day.description.slice(1)}
                          </span>
                        </div>
                        
                        <span className="temperature">
                          {day.temperature}°C
                        </span>
                      </div>

                      <div className="weather-stats">
                        <span>H: {day.tempMax}°</span>
                        <span>L: {day.tempMin}°</span>
                      </div>

                      {/* PERFECT SUGGESTIONS */}
                      {perfect.length > 0 && (() => {
                        const best = perfect[0];
                        const activity = activityTypes.find(a => a.id === best.activityId);
                        console.log(`🌟 Perfect activity for day ${idx}:`, best.activityId);
                        return (
                          <div className="perfect-activity" style={{ marginTop: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontSize: '2.3rem', marginRight: 15 }}>
                                {getActivityEmoji(best.activityId)}
                              </span>
                              <strong style={{ fontSize: '1.25rem' }}>
                                {activity?.name || best.activityId} 💯
                                {best.score != null ? ` (${Math.round(best.score)})` : ''}
                              </strong>
                            </div>
                          </div>
                        );
                      })()}

                      {/* MARINE CONDITIONS */}
                      {hasMarineInterest(interests) &&
                        [day.waveHeight, day.waterTemperature, day.swellHeight, day.swellPeriod, day.wind_speed].some(v => typeof v === 'number') && (
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
                        )}

                      {/* GOOD SUGGESTIONS */}
                      {!showOnlyIndoor && good.length > 0 && (
                        <div className="also-good-section" style={{ marginTop: 14 }}>
                          <strong>It's a good day for</strong>
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

                      {/* ✅ FIXED: INDOOR SUGGESTIONS */}
                      {(showOnlyIndoor || indoor.length > 0) && (
                        <>
                          <div className="indoor-section" style={{ marginTop: 14 }}>
                            <strong>Indoor ideas:</strong>
                            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                              {/* ✅ FIXED: Use correct suggestions array, not day.suggestions */}
                              {indoor
                                .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                                .map(s => {
                                  const a = activityTypes.find(x => x.id === s.activityId);
                                  console.log(`🏠 Indoor activity for day ${idx}:`, s.activityId, s.evaluation);
                                  return (
                                    <li key={s.activityId}>
                                      {getActivityEmoji(s.activityId)} {a?.name || s.activityId}
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
                              }}
                            >
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

        {/* COASTAL DIALOG */}
        {showCoastDialog && (
          <CoastalLocationDialog
            open={showCoastDialog}
            onClose={() => setShowCoastDialog(false)}
            onSave={(loc) => {
              console.log('🏖️ Saving coastal location:', loc);
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
