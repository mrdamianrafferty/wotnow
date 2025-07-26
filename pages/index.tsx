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
import BurgerIcon from '../public/burger-menu-svgrepo-com.svg';
import { marineConditionsSummary } from '../utils/marineConditionsSummary';

// Example usage:
// const summary = marineConditionsSummary(day.waveHeight, day.wind_speed);

// Marine activities that benefit from coastal conditions
const MARINE_ACTIVITY_IDS = [
  'surfing', 'kitesurfing', 'windsurfing', 'kayaking', 'canoeing',
  'snorkeling', 'scuba_diving', 'jet_skiing', 'stand_up_paddleboarding',
  'swimming', 'sea_fishing_shore', 'sea_fishing_boat'
];

// Helper functions (SSR-safe)
const formatMarineValue = (value: number | undefined, label: string, unit: string): string =>
  typeof value === 'number' ? ` • ${label}: ${value}${unit}` : '';

const hasMarineInterest = (interests: string[]) =>
  interests.some(id => MARINE_ACTIVITY_IDS.includes(id));

// Enhanced day label function with hydration-safe rendering
function getDayLabel(dateStr: string, idx: number, serverTime?: Date) {
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

// Score-based activity categorization for UI display
function getScoreCategory(score: number): { emoji: string; label: string; color: string } {
  if (score >= 80) return { emoji: '💯', label: 'Perfect', color: '#10b981' };
  if (score >= 60) return { emoji: '👍', label: 'Good', color: '#3b82f6' };
  if (score >= 30) return { emoji: '🤔', label: 'Okay', color: '#f59e0b' };
  return { emoji: '🏠', label: 'Indoor', color: '#8b5cf6' };
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  console.log('🏠 Enhanced Home component rendering with activity scoring system...');
  
  const { preferences, setPreferences } = useUserPreferences();
  const hasMounted = useHasMounted();

  // Enhanced time information state with context awareness
  const [timeInfo, setTimeInfo] = useState<{
    currentDay: string;
    hour: number;
    contextTags: string[];
    serverTime: Date;
    isEvening: boolean;
    eveningPhase: string;
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

  // Comprehensive hydration debug logging
  useEffect(() => {
    console.log('🔍 ENHANCED HYDRATION DEBUG - System state:', {
      hasMounted,
      homeLocation: homeLocation ? `${homeLocation.name} (${homeLocation.lat}, ${homeLocation.lon})` : 'undefined',
      coastalLocation: coastalLocation ? `${coastalLocation.name}` : 'undefined',
      interests: interests.length,
      interestsSample: interests.slice(0, 5),
      isFirstTimeUser,
      needsLocation,
      timeInfo: timeInfo ? {
        hour: timeInfo.hour,
        isEvening: timeInfo.isEvening,
        phase: timeInfo.eveningPhase
      } : 'not set'
    });
  }, [hasMounted, homeLocation, coastalLocation, interests, isFirstTimeUser, needsLocation, timeInfo]);

  // Enhanced time-aware context generation
  useEffect(() => {
    if (!hasMounted) return;
    
    console.log('⏰ Setting up enhanced time info with evening intelligence...');
    
    const now = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const currentDay = days[now.getDay()];
    const hour = now.getHours();
    const isEvening = hour >= 18;

    // Generate evening-aware context tags
    const baseContextTags = [
      currentDay,
      isEvening ? 'evening' : hour >= 12 ? 'afternoon' : 'morning',
      'relaxation', 'family', 'cultural', 'leisure', 'home', 'social'
    ];

    // Enhanced evening context
    let eveningPhase = 'day';
    if (isEvening) {
      if (hour < 19) {
        baseContextTags.push('early_evening', 'social', 'dining', 'transition_time');
        eveningPhase = 'early evening';
      } else if (hour < 21) {
        baseContextTags.push('prime_evening', 'entertainment', 'social_gathering', 'peak_activity');
        eveningPhase = 'prime evening';
      } else {
        baseContextTags.push('late_evening', 'wind_down', 'quiet_activities', 'preparation');
        eveningPhase = 'late evening';
      }

      // Day-specific evening preferences
      const daySpecificEvening: Record<string, string[]> = {
        'Friday': ['going_out', 'social', 'celebration', 'pub'],
        'Saturday': ['leisure', 'family_time', 'extended_activities'],
        'Sunday': ['preparation', 'relaxation', 'early_rest'],
        'Monday': ['recovery', 'light_activity', 'week_planning'],
        'Tuesday': ['mid_week_social', 'hobby_time'],
        'Wednesday': ['mid_week_break', 'personal_time'],
        'Thursday': ['anticipation', 'social_prep']
      };
      
      if (daySpecificEvening[currentDay]) {
        baseContextTags.push(...daySpecificEvening[currentDay]);
      }
    }

    console.log('⏰ Enhanced time info generated:', { 
      currentDay, 
      hour, 
      isEvening, 
      eveningPhase,
      contextTags: baseContextTags.length 
    });

    setTimeInfo({
      currentDay,
      hour,
      contextTags: baseContextTags,
      serverTime: now,
      isEvening,
      eveningPhase
    });
  }, [hasMounted]);

  // Enhanced weather fetching with comprehensive error handling
  useEffect(() => {
    if (!hasMounted || !homeLocation?.lat || !homeLocation?.lon) {
      console.log('⏭️ Skipping weather fetch - conditions not met:', {
        hasMounted,
        hasLocation: !!homeLocation?.lat && !!homeLocation?.lon
      });
      return;
    }

    let isMounted = true;
    console.log('🌤️ Starting enhanced weather fetch with marine integration...');

    async function fetchForecasts() {
      try {
        console.log('🌤️ Fetching forecasts for:', homeLocation.name);
        setLoading(true);
        setError(null);

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
          console.error('❌ Invalid OpenWeather response:', owData);
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
          console.log(`📅 Processing day ${date}, entries: ${entries.length}, noon  ${!!noon}`);
          
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
            waveHeight: undefined,
            waterTemperature: undefined,
            swellHeight: undefined,
            swellPeriod: undefined,
          };
        });

        console.log('✅ Land forecast processed:', forecast.length, 'days');

        // Enhanced marine data integration with graceful degradation
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
          
          console.log('🌊 Marine API response:', sgRes.status);
          
          if (Array.isArray(sgData.hours)) {
            marineHours = sgData.hours;
            console.log('✅ Marine data received:', marineHours.length, 'hours');
          } else {
            console.warn('⚠️ Unexpected marine data format, continuing without marine conditions');
          }
        } catch (marineErr) {
          console.warn('⚠️ Marine fetch failed (expected if quota exceeded), continuing with land-only forecast');
        }

        // Merge marine data with enhanced logging
        forecast.forEach(day => {
          const match = marineHours.find((h: any) => h.time.startsWith(day.date));
          if (match) {
            day.waveHeight = match.waveHeight?.sg;
            day.waterTemperature = match.waterTemperature?.sg;
            day.swellHeight = match.swellHeight?.sg;
            day.swellPeriod = match.swellPeriod?.sg;
            console.log(`🌊 Marine data merged for ${day.date}:`, {
              wave: day.waveHeight,
              water: day.waterTemperature
            });
          }
        });

        if (isMounted) {
          console.log('✅ Setting enhanced forecast ', forecast.length, 'days');
          setForecastByDay(forecast);
        }

      } catch (err: any) {
        console.error('❌ Enhanced weather fetch error:', err);
        if (isMounted) {
          setForecastByDay([]);
          setError(err.message || 'Failed to load forecast data.');
        }
      } finally {
        if (isMounted) {
          console.log('🏁 Enhanced weather fetch complete');
          setLoading(false);
        }
      }
    }

    fetchForecasts();
    return () => {
      console.log('🧹 Cleaning up enhanced weather fetch');
      isMounted = false;
    };
  }, [homeLocation, coastalLocation, hasMounted]);

  // Enhanced location save handler
  const handleSaveLocation = async () => {
    console.log('💾 Saving location with enhanced validation:', inputLocation);
    try {
      setError(null);
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputLocation)}&limit=1&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_KEY}`
      );
      const data = await res.json();
      console.log('🗺️ Enhanced geocoding response:', data.length, 'results');
      
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon } = data[0];
        console.log('✅ Location found and validated:', { name: inputLocation, lat, lon });
        setPreferences({ 
          ...preferences, 
          locations: [
            ...(preferences.locations?.filter(l => l.type !== 'home') || []),
            { name: inputLocation, lat, lon, type: 'home' }
          ]
        });
      } else {
        console.error('❌ Location not found in geocoding service');
        setError('Could not find that location. Please try another.');
      }
    } catch (err) {
      console.error('❌ Enhanced location save error:', err);
      setError('Failed to fetch location. Please try again.');
    }
  };

  // Hydration-safe pre-render state
  if (!hasMounted) {
    console.log('⏳ Pre-hydration render - showing loading state');
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

  console.log('🎨 Rendering enhanced main content - full scoring system active');

  return (
    <section>
      {/* ENHANCED HEADER */}
      <header
  className="homepage-banner"
  style={{
    position: 'relative',
    minHeight: 60,
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0 8px 0',
    background: '#fff'
  }}
>
  {/* Hamburger icon: left */}
  <img
    src="/burger-menu-svgrepo-com.svg"
    alt="Open menu"
    className="burger-menu-icon"
    style={{
      width: 36,
      height: 36,
      cursor: 'pointer',
      marginLeft: 12,
      marginRight: 12,
      zIndex: 10,
      display: 'block'
    }}
    onClick={() => setMenuOpen(true)}
  />
  {/* Logo: left-aligned, next to hamburger */}
  <img
    src="/wotnow-horizontal.png"
    alt="WotNow Logo"
    className="homepage-banner__logo"
    style={{
      display: 'block',
      maxWidth: 180,
      height: 'auto'
    }}
  />
  {/* Spacer to push nav to right if needed */}
  <div style={{ flex: 1 }} />
  {/* TEXT NAVIGATION: hidden on mobile, visible on desktop */}
  <nav className="global-nav" style={{ marginRight: 24 }}>
    {/* ...nav links here... */}
  </nav>
  <style>{`
    @media (max-width: 800px) {
      .global-nav {
        display: none !important;
      }
    }
  `}</style>
</header>

      <div>
        {/* ENHANCED MAIN CONTENT WITH FULL SCORING SYSTEM */}
        <div>
          {needsLocation ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>📍</div>
              <div>Please enter a location above to view your personalized, weather-aware activity suggestions.</div>
            </div>
          ) : loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>⏳</div>
              <div>Loading your smart recommendations...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>⚠️</div>
              <div>{error}</div>
            </div>
          ) : (
            <div className="main-grid" role="list">
              {forecastByDay.map((day, idx) => {
                console.log(`🎯 Processing enhanced suggestions for day ${idx} (${day.date})`);
                
                // ENHANCED: Pass time information for evening intelligence
const userActivities = activityTypes.filter(a => interests.includes(a.id));

const suggestionsData = getSuggestionsByDay({
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
  activities: userActivities, // <-- NOW ONLY USER'S ACTIVITIES
  now: timeInfo?.serverTime || new Date()
})[0];
const suggestions = suggestionsData?.suggestions ?? [];
const perfectList = suggestions.filter(s => s.score >= 80).sort((a, b) => b.score - a.score);
                const heroActivity = perfectList[0] || (suggestions.length > 0 ? suggestions[0] : null);
                const alsoGoodPerfect = perfectList.slice(1, 10); // Up to 9 more perfects

                // ENHANCED: Comprehensive analytics logging
                console.log(`🎯 Day ${idx} enhanced analytics:`, {
                  date: day.date,
                  totalSuggestions: suggestions.length,
                  heroActivity: heroActivity ? {
                    id: heroActivity.activityId,
                    score: heroActivity.score,
                    evaluation: heroActivity.evaluation,
                    reasoning: heroActivity.reasoning
                  } : 'none',
                  scoreDistribution: {
                    perfect: suggestions.filter(s => s.score >= 80).length,
                    good: suggestions.filter(s => s.score >= 60 && s.score < 80).length,
                    acceptable: suggestions.filter(s => s.score >= 30 && s.score < 60).length,
                    indoor: suggestions.filter(s => s.evaluation === 'indoor').length
                  },
                  eveningMode: timeInfo ? timeInfo.isEvening : false,
                  averageScore: suggestions.length > 0 ? Math.round(suggestions.reduce((sum, s) => sum + (s.score || 0), 0) / suggestions.length) : 0
                });

                // ENHANCED: Smart hero selection with fallback
                const displayHero = heroActivity || (suggestions.length > 0 ? 
                  suggestions.sort((a, b) => (b.score || 0) - (a.score || 0))[0] : null);

                // ENHANCED: Dynamic background based on hero activity
                const mainActivityId = displayHero?.activityId || 'indoorsy';
                const cardBg = `url(${getActivityBg(mainActivityId)})`;

                const marineSummary = marineConditionsSummary(day.waveHeight, day.wind_speed);

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
                      minHeight: 180,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`Suggestions for ${getDayLabel(day.date, idx, timeInfo?.serverTime)}`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.35)',
                      borderRadius: 22,
                      zIndex: 1
                    }} />
                    <div style={{ position: 'relative', zIndex: 2, padding: '8px 12px 14px 12px' }}>

                      {/* ENHANCED CARD HEADER */}
                      <div style={{ 
  display: 'flex', 
  alignItems: 'flex-end',
  justifyContent: 'space-between', 
  marginBottom: '8px' // was 12px
}}>
  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', lineHeight: 1.1 }}>
    {getDayLabel(day.date, idx, timeInfo?.serverTime)}
  </div>
  <img
    src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
    alt={day.description}
    className="weather-icon"
    style={{
      width: 72, // or 64 for slightly smaller
      height: 72,
      marginLeft: 12,
      objectFit: 'contain',
      display: 'block'
      // No marginTop!
    }}
  />
</div>

{/* HERO BOX NOW SITS DIRECTLY UNDER DAY NAME */}
{heroActivity && (() => {
  const activity = activityTypes.find(a => a.id === heroActivity.activityId);
  const scoreInfo = getScoreCategory(heroActivity.score || 0);
  return (
    <div className="hero-activity" style={{ 
      marginBottom: '18px',
      padding: '12px',
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '8px',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '2.2rem', marginRight: '12px' }}>
          {getActivityEmoji(heroActivity.activityId)}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <strong style={{ fontSize: '1.2rem' }}>
              {activity?.name || heroActivity.activityId}
            </strong>
            <span style={{ 
              fontSize: '0.8rem',
              padding: '2px 6px',
              borderRadius: '4px',
              background: scoreInfo.color,
              color: 'white',
              fontWeight: 'bold'
            }}>
              {scoreInfo.emoji} 
            </span>
          </div>
          {heroActivity.reasoning && (
            <div style={{ fontSize: '0.75rem', opacity: 0.8, fontStyle: 'italic' }}>
              {heroActivity.reasoning}
            </div>
          )}
        </div>
      </div>
    </div>
  );
})()}


                      {/* ENHANCED HERO ACTIVITY */}
                      

                      {/* ALSO GOOD: Up to 9 more perfects */}
                      {alsoGoodPerfect.length > 0 && (
                        <div className="also-good-section" style={{ marginBottom: '14px' }}>
                          <strong style={{ fontSize: '0.95rem', marginBottom: '6px', display: 'block' }}>
                            Also perfect today
                          </strong>
                          <ul style={{ 
                            listStyle: 'none', 
                            paddingLeft: 0, 
                            margin: 0,
                            fontSize: '0.85rem'
                          }}>
                            {alsoGoodPerfect.map(suggestion => {
                              const activity = activityTypes.find(x => x.id === suggestion.activityId);
                              return (
                                <li key={suggestion.activityId} style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '4px'
                                }}>
                                  <span>
                                    {getActivityEmoji(suggestion.activityId)} {activity?.name || suggestion.activityId}
                                  </span>
                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    opacity: 0.8,
                                    background: 'rgba(255,255,255,0.2)',
                                    padding: '1px 4px',
                                    borderRadius: '3px'
                                  }}>
                                    {suggestion.score}%
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* ENHANCED LAND and MARINE CONDITIONS */}
                      {hasMarineInterest(interests) &&
                        [day.waveHeight, day.waterTemperature, day.swellHeight, day.swellPeriod, day.wind_speed].some(v => typeof v === 'number') && (
                          <div className="marine-block" style={{
                            marginBottom: '16px',
                            padding: '10px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            borderRadius: '6px',
                            fontSize: '0.85rem' // Match "also good"
                          }}>
{/* homelocation summary text */}
 <div style={{ fontSize: '0.85rem', marginBottom: 6 }}>
  🏡 {day.temperature}° and {day.description} in{' '}
  <button
    type="button"
    onClick={() => {
      document.getElementById(
        window.innerWidth < 800 ? 'location-input-mobile' : 'location-input-desktop'
      )?.focus();
    }}
    style={{
      background: 'none',
      border: 'none',
      color: '#fff',
      textDecoration: 'underline',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: 'inherit',
      padding: 0,
    }}
  >
    {homeLocation ? homeLocation.name.split(',')[0] : 'your location'}
  </button>
</div>

{/* Marine summary text */}
<p style={{ fontSize: '0.85rem', margin: '0 0 6px 0', opacity: 0.92 }}>
  🌊 {marineSummary} in{' '}
  <button
    type="button"
    onClick={() => setShowCoastDialog(true)}
    style={{
      background: 'none',
      border: 'none',
      color: '#fff',
      textDecoration: 'underline',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: 'inherit',
      padding: 0,
    }}
  >
    {coastalLocation ? coastalLocation.name.split(',')[0] : 'your coastal location'}
  </button>
  
</p>



<ul className="marine-values" style={{
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px'
}}>
  {typeof day.waveHeight === 'number' && (
    <li style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
      🌊 {day.waveHeight}m
    </li>
  )}
  {typeof day.wind_speed === 'number' && (
    <li style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
      💨 {day.wind_speed}km/h
    </li>
  )}
  {typeof day.waterTemperature === 'number' && (
    <li style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
      🌡️ {day.waterTemperature.toFixed(1)}°
    </li>
  )}
</ul>
                          </div>
                        )}

                      {/* ENHANCED GOOD SUGGESTIONS WITH SCORES */}
                      {suggestions.filter(s => s.score >= 60 && s.score < 80).length > 0 && (
                        <div className="also-good-section" style={{ marginBottom: '14px' }}>
                          <strong style={{ fontSize: '0.95rem', marginBottom: '6px', display: 'block' }}>
                            Also good today
                          </strong>
                          <ul style={{ 
                            listStyle: 'none', 
                            paddingLeft: 0, 
                            margin: 0,
                            fontSize: '0.85rem'
                          }}>
                            {suggestions
                              .filter(s => s.score >= 60 && s.score < 80)
                              .sort((a, b) => b.score - a.score)
                              .slice(0, 4)
                              .map(suggestion => {
                                const activity = activityTypes.find(x => x.id === suggestion.activityId);
                                return (
                                  <li key={suggestion.activityId} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '4px'
                                  }}>
                                    <span>
                                      {getActivityEmoji(suggestion.activityId)} {activity?.name || suggestion.activityId}
                                    </span>
                                    <span style={{ 
                                      fontSize: '0.7rem', 
                                      opacity: 0.8,
                                      background: 'rgba(255,255,255,0.2)',
                                      padding: '1px 4px',
                                      borderRadius: '3px'
                                    }}>
                                      {suggestion.score}%
                                    </span>
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      )}

{/* ENHANCED INDOOR SUGGESTIONS WITH EVENING PRIORITY */}

{(() => {
  const isToday = idx === 0;
  const isEvening = timeInfo?.isEvening && isToday;

  // Only show "Stay Inside" if NOT evening for today
  if (!isEvening) {
    // Find the top 5 indoor activities by score, deduped
    const indoorList = suggestionsData?.stayInside ?? [];

    if (!indoorList.length) return null;

    return (
<div className="indoor-section" style={{ marginTop: 12 }}>
  <strong style={{ fontSize: '0.95rem', marginBottom: '6px', display: 'block' }}>
    👹 Staying inside?
  </strong>
  <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0, fontSize: '0.85rem' }}>
    {indoorList.map(s => {
      const activity = activityTypes.find(a => a.id === s.activityId);
      return (
        <li
          key={s.activityId}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
          }}
        >
          <span>
            {getActivityEmoji(s.activityId)} {activity?.name}
          </span>

        </li>
      );
    })}
  </ul>
</div>
    );
  }
  return null;
})()}



                      {/* ENHANCED ADD INTERESTS LINK */}
                      <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
                        <a
                          href="/interests"
                          style={{
                            display: "inline-block",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            background: "rgba(59, 130, 246, 0.8)",
                            color: "#fff",
                            fontWeight: 600,
                            textDecoration: "none",
                            fontSize: "0.9rem",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(59, 130, 246, 1)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(59, 130, 246, 0.8)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          ➕ Add More Interests
                        </a>
                      </div>

                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* ENHANCED COASTAL DIALOG */}
        {showCoastDialog && (
          <CoastalLocationDialog
            open={showCoastDialog}
            onClose={() => setShowCoastDialog(false)}
            onSave={(loc) => {
              console.log('🏖️ Saving coastal location with enhanced validation:', loc);
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

        {/* ENHANCED MOBILE NAVIGATION */}
        {menuOpen && (
  <nav
    className="mobile-nav"
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.7)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >
    <a href="/" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0' }}>Home</a>
    <a href="/interests" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0' }}>Interests</a>
    <a href="/weather" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0' }}>Weather</a>
    <button
      onClick={() => setMenuOpen(false)}
      style={{
        marginTop: 24,
        background: '#fff',
        border: 'none',
        padding: '8px 16px',
        borderRadius: 6,
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      Close
    </button>
  </nav>
)}

{/* Mobile location banner (bottom, visible on mobile only) */}
<div className="location-banner mobile-location-banner">
  <div className="location-banner__container">
    <label htmlFor="location-input-mobile" className="location-banner__label">📍 Your location:</label>
    <input
      id="location-input-mobile"
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

{/* Desktop location banner (top, visible on desktop/tablet) */}
<div className="location-banner desktop-location-banner">
  <div className="location-banner__container">
    <label htmlFor="location-input-desktop" className="location-banner__label">📍 Your location:</label>
    <input
      id="location-input-desktop"
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
      </div>
    </section>
  );
}
