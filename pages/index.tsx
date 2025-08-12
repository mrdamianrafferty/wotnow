'use client';

import React, { useEffect, useState } from 'react';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getActivityEmoji } from '../data/emojiMap';
import { getAssessmentEmoji } from '../data/emojiMap';
import { getActivityBg } from '../data/bgMap';
import { useHasMounted } from '../utils/useHasMounted';
import CoastalLocationDialog from '../components/CoastalLocationDialog';
import SwellArrow from '../components/SwellArrow';
import { marineConditionsSummary } from '../utils/marineConditionsSummary';
import { activityMessages } from '../data/activityMessages';
import { buildPopupActivityPayload } from '../utils/buildPopupActivityPayload';
import PopupTemplate from '../components/PopupTemplate';
import { findHeroActivity } from '../utils/activityHelpers';
import { useForecastData } from '../lib/useForecastData';
import { MARINE_ACTIVITY_IDS } from '../utils/activityHelpers';
import { selectHeroActivity } from '../utils/heroSelector';
import 'weather-icons/css/weather-icons.css';
import { getBeaufortNumber } from '../utils/beaufort';

import '../styles/Card.css';
import '../styles/Popup.css';
import {
  getBeaufortDescription,
  getRainfallDescription,
  getTemperatureDescription,
  getHumidityDescription,
  getWaveDescription,
  getWaterTemperatureDescription,
  getWindMessage,
} from '../utils/weatherLabels';
import Popup from '../components/Popup';
import { buildReasons } from '../utils/activityHelpers'; // Adjust the path based on your project structure
import { isOutdoor } from '../utils/activityHelpers';
import { getActivityMessage } from '../data/activityMessages';

function WindIcon({ windKmh, size = 28, alt = 'Wind' }: { windKmh: number, size?: number, alt?: string }) {
  const beaufort = getBeaufortNumber(windKmh);

  // Use windsock for Beaufort < 3, otherwise wind-beaufort-X.svg or fallback to wind.svg
  let iconName = '';
  if (beaufort < 3) {
    iconName = 'windsock.svg';
  } else if (beaufort <= 12) {
    iconName = `wind-beaufort-${beaufort}.svg`;
  } else {
    iconName = 'wind.svg';
  }

  return (
    <img
      src={`/weather-icons/design/fill/final/${iconName}`}
      alt={alt}
      style={{ width: size, height: size, verticalAlign: 'middle' }}
      loading="lazy"
    />
  );
}

// Improved data fetching hook
const useFetchForecastData = (homeLocation: any, coastalLocation: any, interests: string[]) => {
  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeInfo, setTimeInfo] = useState<any>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [marineHours, setMarineHours] = useState<any[]>([]);

  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!homeLocation?.lat || !homeLocation?.lon) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch main weather data
        const weatherResponse = await fetch(`/api/owm?lat=${homeLocation.lat}&lon=${homeLocation.lon}`, {
          cache: 'no-store'
        });

        if (!weatherResponse.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const weatherData = await weatherResponse.json();
        setWeatherData(weatherData);

      } catch (err) {
        console.error('Error fetching forecast ', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [homeLocation?.lat, homeLocation?.lon]);

  useEffect(() => {
    const fetchMarineData = async () => {
      try {
        // Get coastal or home location
        const lat = coastalLocation?.lat ?? homeLocation?.lat;
        const lon = coastalLocation?.lon ?? homeLocation?.lon;
        
        if (!lat || !lon) return;
        
        // Use Unix timestamps (seconds)
        const now = new Date();
        const startTime = Math.floor(now.getTime() / 1000); // Unix seconds
        const endTime = startTime + (5 * 24 * 60 * 60); // 5 days later
        
        const res = await fetch(`/api/marine?lat=${lat}&lon=${lon}&start=${startTime}&end=${endTime}`);
        if (!res.ok) throw new Error(`Failed to fetch marine data: ${res.statusText}`);
        
        const data = await res.json();
        setMarineHours(data.hours || []);
      } catch (err) {
        console.error("Marine data error:", err);
      }
    };

    if ((coastalLocation?.lat && coastalLocation?.lon) || (homeLocation?.lat && homeLocation?.lon)) {
      fetchMarineData();
    }
  }, [coastalLocation, homeLocation]);

  useEffect(() => {
  if (!weatherData || marineHours.length === 0) return;

  // Now build forecastByDay using weatherData and marineHours
  const grouped: Record<string, any[]> = {};
  weatherData.list.forEach((item: any) => {
    const date = item.dt_txt.split(' ')[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(item);
  });

  const forecast: WeatherForecastDay[] = Object.entries(grouped)
    .slice(0, 5)
    .map(([, dayEntries]: [string, any[]]) => {
      const noon = dayEntries.find((e) => e.dt_txt.includes('12:00:00')) ?? dayEntries[0];
      const dateStr = noon.dt_txt.split(' ')[0]; // "YYYY-MM-DD"
      const marineForDay = marineHours.filter(
        (h: MarineHour) => h.time && h.time.slice(0, 10) === dateStr
      );
      return {
        date: Math.floor(new Date(noon.dt_txt).getTime() / 1000),
        temperature: Math.round(noon.main.temp),
        tempMax: Math.round(noon.main.temp_max),
        tempMin: Math.round(noon.main.temp_min),
        condition: noon.weather[0].main,
        description: noon.weather[0].description,
        icon: noon.weather[0].icon,
        rain: Math.round(noon.rain?.['3h'] || 0),
        wind_speed: Math.round(noon.wind.speed * 3.6),
        windSpeed: Math.round(noon.wind.speed * 3.6),
        clouds: noon.clouds.all,
        humidity: noon.main.humidity,
        visibility: noon.visibility ?? 10000,
        waveHeight: undefined,
        waterTemperature: undefined,
        marine: marineForDay,
      };
    });

  setForecastByDay(forecast);
}, [weatherData, marineHours]);

  return { forecastByDay, loading, error, timeInfo, marineHours };
};

const processWeatherData = (weatherData: any, marineData?: any) => {
  const forecast: WeatherForecastDay[] = weatherData.daily.map((day: any, index: number) => ({
    date: day.dt,
    temperature: Math.round(day.temp.day),
    rain: day.rain?.['1h'] || 0,
    wind_speed: day.wind_speed,
    clouds: day.clouds,
    humidity: day.humidity,
    visibility: day.visibility || 10000,
    waterTemperature: marineData?.daily?.[index]?.water_temp || null,
    waveHeight: marineData?.daily?.[index]?.wave_height || null,
    swellHeight: marineData?.daily?.[index]?.swell_height || null,
    swellPeriod: marineData?.daily?.[index]?.swell_period || null,
  }));

  return {
    forecast,
    timeInfo: {
      serverTime: new Date(weatherData.current.dt * 1000),
      sunrise: new Date(weatherData.current.sunrise * 1000),
      sunset: new Date(weatherData.current.sunset * 1000),
    },
    marineHours: marineData?.hourly || [],
  };
};

const handleClose = () => {
  setPopupActivity(null);
};


const hasMarineInterest = (interests: string[]) =>
  interests.some((id) => MARINE_ACTIVITY_IDS.includes(id));

const getDayLabel = (dateNum: number, idx: number, serverTime?: Date) => {
  const date = new Date(dateNum * 1000);
  const today = serverTime || new Date();
  const isSameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  return isSameDay ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'long' });
};

const getScoreCategory = (score: number) => {
  if (score >= 90) return { emoji: '💯', label: 'Perfect', color: '#10b981' };
  if (score >= 60) return { emoji: '👍', label: 'Good', color: '#3b82f6' };
  if (score >= 40) return { emoji: '🙆', label: 'Fair', color: '#fbbf24' };
  if (score >= 30) return { emoji: '⚠️', label: 'Poor', color: '#f59e0b' };
  return { emoji: '🏠', label: 'Indoor', color: '#8b5cf6' };
};

const isOutdoor = (activityId: string) => {
  return !!activityMessages[activityId];
};

function getWeatherIconUrl(iconCode: string) {
  // Fallback to a default icon if not found
  const supportedIcons = [
    '01d','01n','02d','02n','03d','03n','04d','04n',
    '09d','09n','10d','10n','11d','11n','13d','13n','50d','50n'
  ];
  if (supportedIcons.includes(iconCode)) {
    return `/weather-icons/design/fill/final/${iconCode}.svg`;
  }
  return '/weather-icons/design/fill/final/na.svg'; // fallback icon
}

function getPopupDay(activityId: string, day: any, timeInfo: any) {
  if (MARINE_ACTIVITY_IDS.includes(activityId) && Array.isArray(day.marine)) {
    // Convert Unix timestamp to Date
    const dayDate = new Date(day.date * 1000);
    const today = new Date();
    
    // Check if this is today
    const isToday = dayDate.getDate() === today.getDate() &&
                   dayDate.getMonth() === today.getMonth() &&
                   dayDate.getFullYear() === today.getFullYear();
    
    // Use current hour for today, noon (12) for future days
    const hour = isToday ? today.getHours() : 12;
    
    // Format: YYYY-MM-DDThh
    const targetHourIso = `${dayDate.toISOString().slice(0, 10)}T${hour.toString().padStart(2, '0')}`;
    
    console.log(`Looking for marine hour with time starting with: ${targetHourIso} (${isToday ? 'today' : 'future day'})`);
    console.log("Marine hours available:", day.marine.map(h => h.time));
    
    const marineHour = day.marine.find(
      (h: any) => typeof h.time === 'string' && h.time.startsWith(targetHourIso)
    );
    
    if (marineHour) {
      console.log("Found matching marine hour:", marineHour);
      // Use CONSISTENT property names
      return {
        ...day,
        waveHeight: marineHour.waveHeight?.noaa,  // FIXED
        swellHeight: marineHour.swellHeight?.noaa,  // FIXED
        swellPeriod: marineHour.swellPeriod?.noaa,  // FIXED
        waterTemperature: marineHour.waterTemperature?.noaa,  // FIXED
        windSpeed: marineHour.windSpeed?.noaa,  // FIXED
        swellDir: marineHour.swellDirection?.noaa,
        gust: marineHour.windGust?.noaa,
        vis: marineHour.visibility?.noaa,
        current: marineHour.currentSpeed?.noaa,
      };
    } else {
      console.log("No matching marine hour found");
    }
  }
  return day;
}

// Consistent helper function you can reuse
const getTargetHourForDay = (dayUnixTimestamp) => {
  const dayDate = new Date(dayUnixTimestamp * 1000);
  const today = new Date();
  const isToday = dayDate.getDate() === today.getDate() && 
                  dayDate.getMonth() === today.getMonth() && 
                  dayDate.getFullYear() === today.getFullYear();
  
  const hour = isToday ? today.getHours() : 12;
  return `${dayDate.toISOString().slice(0, 10)}T${hour.toString().padStart(2, '0')}`;
};

export default function Home() {
  const { preferences, setPreferences } = useUserPreferences();
  const interests = preferences.interests ?? [];
  
  // Add these missing state variables
  const [showHomeDialog, setShowHomeDialog] = useState(false);
  const [showCoastDialog, setShowCoastDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Your existing state
  const hasMounted = useHasMounted();
  const [popupActivity, setPopupActivity] = useState<any>(null);


  const homeLocation = preferences.locations?.find((loc) => loc.type === 'home');
  const coastalLocation = preferences.locations?.find((loc) => loc.type === 'coastal');
  
// Helper functions to update locations
  const setHomeLocation = (loc: any) => {
    const newLocations = Array.isArray(preferences.locations) 
      ? preferences.locations.slice() // Create a copy
      : [];
      
    // Find if home location already exists
    const homeIndex = newLocations.findIndex(l => l.type === 'home');
    
    if (homeIndex >= 0) {
      // Update existing home location
      newLocations[homeIndex] = { ...newLocations[homeIndex], ...loc };
    } else {
      // Add new home location
      newLocations.push({ ...loc, type: 'home' });
    }
    
    // Update preferences
    setPreferences({
      ...preferences,
      locations: newLocations
    });
  };

  const setCoastalLocation = (loc: any) => {
    const newLocations = Array.isArray(preferences.locations) 
      ? preferences.locations.slice() // Create a copy
      : [];
      
    // Find if coastal location already exists
    const coastalIndex = newLocations.findIndex(l => l.type === 'coastal');
    
    if (coastalIndex >= 0) {
      // Update existing coastal location
      newLocations[coastalIndex] = { ...newLocations[coastalIndex], ...loc };
    } else {
      // Add new coastal location
      newLocations.push({ ...loc, type: 'coastal' });
    }
    
    // Update preferences
    setPreferences({
      ...preferences,
      locations: newLocations
    });
  };

  const isFirstTimeUser = interests.length === 0;
  const needsLocation = !homeLocation?.lat || !homeLocation?.lon;
  const usedHeroActivities = new Set<string>();

const { forecastByDay, loading, error, timeInfo, marineHours } = useFetchForecastData(
  homeLocation, 
  coastalLocation, 
  interests
);



  const heroDataByDay = forecastByDay.map((day, idx) => {
    const filteredActivities = activityTypes.filter(a => interests.includes(a.id));

    // ✅ CORRECT: Use the original getSuggestionsByDay structure
    const suggestionsData = getSuggestionsByDay({
      forecast: [{
        date: day.date,
        weather: {
          temperature: day.temperature,
          precipitation: day.rain,
          windspeed: day.wind_speed,
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
      activities: filteredActivities,
      now: timeInfo?.serverTime || new Date()
    })[0]; // Get first day's data

  // ✅ CORRECT: Access suggestions directly (no double nesting)
  const suggestions = suggestionsData?.suggestions ?? [];
  const perfectList = suggestions.filter(s => s.score >= 80).sort((a, b) => b.score - a.score);
  const goodList = suggestions.filter(s => s.score >= 60 && s.score < 80).sort((a, b) => b.score - a.score);
  const indoorList = suggestionsData?.stayInside ?? [];

  // Select a unique hero activity for the day
  const heroActivity = selectHeroActivity(suggestions);

  // ✅ Add the hero to used activities AFTER finding it
  if (heroActivity) {
    usedHeroActivities.add(heroActivity.activityId);
  }

  return {
    day,
    suggestions,
    heroActivity,
    alsoGoodPerfect: perfectList.filter(a => a.activityId !== heroActivity?.activityId),
    suggestionsData,
    indoorList,
    dayLabel: getDayLabel(day.date, idx, timeInfo?.serverTime) // Add this for the render
  };
});


  useEffect(() => {
    console.log('Forecast by day:', forecastByDay);
  }, [forecastByDay]);

  console.log('marineHours before building forecast:', marineHours);

  if (!hasMounted) {
    return <div>Loading...</div>;
  }

  if (needsLocation) {
    return <div>Please set your home location to see suggestions.</div>;
  }

  if (loading) {
    return <div>Loading your smart recommendations...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // MAIN RETURN - Enhanced version preserving all your functionality
  return (
    <>
      {/* Home Location Modal */}
      {showHomeDialog && (
        <CoastalLocationDialog
          open={showHomeDialog}
          onClose={() => setShowHomeDialog(false)}
          title="Pick your home location"
          homeLocation={homeLocation}
          coastalLocation={coastalLocation}
          setHomeLocation={setHomeLocation}
          setCoastalLocation={setCoastalLocation}
          onSave={(loc) => {
            setHomeLocation(loc);
            setShowHomeDialog(false);
          }}
        />
      )}

      {/* Coastal Location Modal */}
      {showCoastDialog && (
        <CoastalLocationDialog
  open={showCoastDialog}
  onClose={() => setShowCoastDialog(false)}
  coastalLocation={coastalLocation}
  setHomeLocation={setHomeLocation}
  setCoastalLocation={setCoastalLocation}
  onSave={(loc) => {
    setCoastalLocation(loc);
    setShowCoastDialog(false);
  }}
/>
      )}

      <section>
        {/* Banner with location buttons */}
        <header
          className="homepage-banner"
          style={{
            position: 'relative',
            minHeight: 60,
            display: 'flex',
            alignItems: 'center',
            padding: '8px 0',
            background: '#fff',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          {/* Menu icon */}
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
              display: 'block',
            }}
            onClick={() => setMenuOpen(true)}
          />
          
          {/* Logo */}
          <img
            src="/wotnow-horizontal.png"
            alt="WotNow Logo"
            className="homepage-banner__logo"
            style={{
              display: 'block',
              maxWidth: 180,
              height: 'auto',
            }}
          />
          
          {/* Spacer */}
          <div style={{ flex: 1 }} />
          
          {/* Title section */}
          <div className="homepage-banner__text" style={{ textAlign: 'right', paddingRight: '12px' }}>
            <h1 className="homepage-banner__title" style={{ fontSize: '1.5rem', margin: 0, color: '#1f2937' }}>
              Wots good,&nbsp;when?
            </h1>
            <p className="homepage-banner__subtitle" style={{ fontSize: '0.9rem', margin: 0, color: '#6b7280' }}>
              Defy the doom loop
            </p>
          </div>
          
{/* Location buttons */}
<div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', marginRight: 12 }}>
  <button 
    className="location-banner__button"
    onClick={() => setShowHomeDialog(true)}
  >
    {homeLocation?.name 
      ? `My 🏡 is ${homeLocation.name.split(',')[0]} ✓` 
      : 'My home is here...'}
  </button>
  <button 
    className="location-banner__button"
    style={{ background: '#10b981' }}
    onClick={() => setShowCoastDialog(true)}
  >
    {coastalLocation?.name 
      ? `My 🏖️ is ${coastalLocation.name.split(',')[0]} ✓` 
      : 'My beach is here...'}
  </button>
</div>
        </header>

        {/* Menu overlay */}
        {menuOpen && (
          <>
        <div
          className="menu-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
            cursor: 'default',
            background: 'rgba(0,0,0,0.7)',
          }}
          onClick={() => setMenuOpen(false)}
        />
        <nav
          className="navigation-menu"
          style={{
            position: 'fixed',
            zIndex: 1000,
            top: 0,
            left: 0,
            background: '#2b323c',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '12px 24px',
            minWidth: '220px',
            maxWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            margin: '12px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <a href="/" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>
            Home
          </a>
          <a href="/interests" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>
            Manage my interests
          </a>
          <a href="/activities" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>
            Scan my interests
          </a>
          <a
            href="/weather"
            onClick={() => setMenuOpen(false)}
            style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}
          >
            Local weather in detail
          </a>
        </nav>
      </>
    )}


<div className="main-grid">
  {heroDataByDay.map(({ day, heroActivity, alsoGoodPerfect, suggestions, suggestionsData, dayLabel }, idx) => {
    const date = new Date(day.date * 1000);
    const isToday = idx === 0;

    return (
      <div
        key={day.date}
        className="activity-card-enhanced"
        style={{
          backgroundImage: `url(${getActivityBg(heroActivity?.activityId)})`,
        }}
      >
        <div className="activity-card-overlay" />
        <div className="activity-card-content">
            <div className="weather-icon-topright">
    <div className="weather-icon-topright">
  <img
    src={getWeatherIconUrl(day.icon)}
    alt={day.description || 'weather icon'}
    style={{ width: 48, height: 48 }}
    loading="lazy"
  />
</div>
  </div>

          {/* Weather summary */}
          <div className="forecast-header">
            <div className="date-info">
              <h3 className="date-label">{dayLabel}</h3>

            </div>
            <div className="temperature-info">
             
                            <span className="temperature-label">
  
  &nbsp;{Math.round(day.temperature)}° {day.description}
  <WindIcon windKmh={day.wind_speed} />
</span>

            </div>
          </div>

          {/* HERO ACTIVITY */}
          {heroActivity && (() => {
            const { activityId, score } = heroActivity;
            const activity = activityTypes.find((a) => a.id === activityId);
            const emoji = getActivityEmoji(activityId) || '❓';
            const scoreInfo = getScoreCategory(score || 0);
            const isOutdoorActivity = isOutdoor(activityId);
            const activityMessage = getActivityMessage(activityId, scoreInfo.label.toLowerCase(), []);

            // Suppose 'forecastDay' is the day object and you have marine hours attached
const dayDate = new Date(day.date * 1000);
const today = new Date();
const isToday = dayDate.getDate() === today.getDate() && 
                dayDate.getMonth() === today.getMonth() && 
                dayDate.getFullYear() === today.getFullYear();

// Use current time for today, midday for future
const hour = isToday ? today.getHours() : 12;
const targetHourIso = `${dayDate.toISOString().slice(0, 10)}T${hour.toString().padStart(2, '0')}`;

// Option 2: Build reasons with the enhanced day object
const enhancedDay = getPopupDay(heroActivity.activityId, day, timeInfo);
const popupPayload = buildPopupActivityPayload({
activityId: heroActivity.activityId,
day: enhancedDay,
score: heroActivity.score,
reasons: buildReasons(enhancedDay, heroActivity.activityId), // Use enhanced day
});

            const handlePopupOpen = () => {
              if (isOutdoorActivity) {
                setPopupActivity(popupPayload);
              }
            };

            return (
              <div
                className="card__hero-activity"
                role="button"
                tabIndex={0}
                onClick={handlePopupOpen}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && isOutdoorActivity) {
                    e.preventDefault();
                    handlePopupOpen();
                  }
                }}
              >
                <div className="card__hero-icon">{emoji}</div>
                <div className="card__hero-title">
                  <div className={`card__hero-name ${isOutdoorActivity ? 'outdoor' : ''}`}>
                    {activity?.name || activityId.replace(/_/g, ' ')}
                  </div>
                  <div className="card__hero-message">
                    {activityMessage}
                  </div>
                </div>
                <div
                  className="card__score-badge"
                  title={scoreInfo.label}
                  style={{ background: scoreInfo.color }}
                >
                  {scoreInfo.emoji}
                </div>
              </div>
            );
          })()}

          {/* Activity Lists */}
          <div className="activity-suggestions">
            {/* Perfect Activities */}
            {alsoGoodPerfect.length > 0 && (
              <div className="activity-section">
                <h4 className="also-good-title">💯 Also Perfect Today</h4>
                <ul className="also-good-list">
                  {alsoGoodPerfect.map(suggestion => {
                    const activity = activityTypes.find(a => a.id === suggestion.activityId);
                    const isOutdoorActivity = isOutdoor(suggestion.activityId);

                    return (
                      <li
                        key={suggestion.activityId}
                        role="button"
                        tabIndex={0}
                        className="also-good-item"
                        onClick={() => {
                          if (isOutdoorActivity) {
                            const popupPayload = buildPopupActivityPayload({
                            activityId: suggestion.activityId,
                            day: getPopupDay(suggestion.activityId, day, timeInfo),
                            score: suggestion.score,
                            reasons: buildReasons(day, suggestion.activityId),
});
                            setPopupActivity(popupPayload);
                          }
                        }}
                        style={{
                          cursor: isOutdoorActivity ? 'pointer' : 'default',
                        }}
                      >
                        <span>
                          {getActivityEmoji(suggestion.activityId)} {activity?.name || suggestion.activityId.replace(/_/g, ' ')}
                        </span>
                        <span className="also-good-score">
                          {Math.round(suggestion.score)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Good Activities */}
            {(() => {
              const goodActivities = suggestions
                .filter(s => s.score >= 60 && s.score < 80 && s.activityId !== heroActivity?.activityId)
                .sort((a, b) => b.score - a.score)
                .slice(0, 4);

              if (goodActivities.length === 0) return null;

              return (
                <div className="activity-section">
                  <h4 className="also-good-title">👍 Good Options Today</h4>
                  <ul className="activity-list-good">
                    {goodActivities.map(suggestion => {
                      const activity = activityTypes.find(a => a.id === suggestion.activityId);
                      const isOutdoorActivity = isOutdoor(suggestion.activityId);

                      return (
                        <li
                          key={suggestion.activityId}
                          role="button"
                          tabIndex={0}
                          className="activity-item-good"
                          onClick={() => {
                            if (isOutdoorActivity) {
                              const popupPayload = buildPopupActivityPayload({
                              activityId: suggestion.activityId,
                              day: getPopupDay(suggestion.activityId, day, timeInfo),
                              score: suggestion.score,
                              reasons: buildReasons(day, suggestion.activityId),
                            });
                              setPopupActivity(popupPayload);
                            }
                          }}
                          style={{
                            cursor: isOutdoorActivity ? 'pointer' : 'default',
                          }}
                        >
                          <span>
                            {getActivityEmoji(suggestion.activityId)} {activity?.name || suggestion.activityId.replace(/_/g, ' ')}
                          </span>
                          <span className="also-good-score">
                            {Math.round(suggestion.score)}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}

            {/* Indoor Section */}
            {(() => {
              const isEvening = timeInfo?.isEvening && isToday;
              if (!isEvening) {
                const indoorList = suggestionsData?.stayInside ?? [];
                if (!indoorList.length) return null;

                return (
                  <div className="also-good-section">
                    <h4 className="also-good-title">🏠 Indoor Alternatives</h4>
                    <ul className="also-good-list">
                      {indoorList.map((s) => {
                        const activity = activityTypes.find((a) => a.id === s.activityId);
                        const isOutdoorActivity = isOutdoor(s.activityId);

                        return (
                          <li
                            key={s.activityId}
                            className="also-good-item"
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (!isOutdoorActivity) return;
                              const popupPayload = buildPopupActivityPayload({
                                activityId: s.activityId,
                                day: getPopupDay(s.activityId, day, timeInfo),
                                score: s.score,
                                reasons: buildReasons(day, s.activityId),
                              });
                              setPopupActivity(popupPayload);
                            }}
                            style={{
                              cursor: 'default',
                            }}
                          >
                            <span>
                              {getActivityEmoji(s.activityId)} {activity?.name || s.activityId.replace(/_/g, ' ')}
                            </span>
                            <span className="also-good-score">
                              {Math.round(s.score ?? 0)}%
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
          </div> {/* This is the closing tag for activity-suggestions */}
          
          {/* Add back the bottom-aligned action buttons */}
          <div className="activity-card-actions">
            <a 
              href="/interests" 
              className="activity-card-btn"
            >
              Add more interests
            </a>
            <a 
              href="/activities" 
              className="activity-card-btn"
            >
              Scan my activities
            </a>
          </div>
          
        </div> 
      </div> 

    );
  })}
</div> {/* End of main-grid */}

{/* Popup for activity details */}
{popupActivity && (
  <Popup
    activityId={popupActivity.activityId}
    title={
      activityTypes.find(a => a.id === popupActivity.activityId)?.name ||
      popupActivity.activityId
    }
    category={popupActivity.category}
    message={popupActivity.message}
    marineData={popupActivity.marineData}
    weatherData={popupActivity.weatherData}
    score={popupActivity.score}
    onClose={() => setPopupActivity(null)}
  />
)}
      </section> {/* End of section */}
    </> /* End of fragment */
  ); // End of return
} // End of Home component