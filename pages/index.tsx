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
import { knotsToMps } from '../utils/weatherUtils';
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
import { getActivityMessage } from '../data/activityMessages';
import AstronomyCard from '../components/AstronomyCard';

// MarineHour interface for typing
interface MarineHour {
  time: string;
  windSpeed?: { noaa?: number };
  windDirection?: { noaa?: number };
  waveHeight?: { noaa?: number };
  swellHeight?: { noaa?: number };
  swellPeriod?: { noaa?: number };
  waterTemperature?: { noaa?: number };
  windGust?: { noaa?: number };
  visibility?: { noaa?: number };
  currentSpeed?: { noaa?: number };
  swellDirection?: { noaa?: number };
}

function WindIcon({ windMs, size = 28, alt = 'Wind' }: { windMs: number, size?: number, alt?: string }) {
  // Convert m/s to km/h for Beaufort calculation (getBeaufortNumber expects m/s now)
  const beaufort = getBeaufortNumber(windMs);

  // Use windsock for Beaufort < 3, otherwise wind-beaufort-X.svg or fallback to wind.svg
  let iconName = '';
  let needsGlow = false; // Only numbered Beaufort icons need glow for visibility
  
  if (beaufort < 3) {
    iconName = 'windsock.svg';
    needsGlow = false; // Windsock doesn't have dark numbers
  } else if (beaufort <= 12) {
    iconName = `wind-beaufort-${beaufort}.svg`;
    needsGlow = true; // Beaufort icons have dark numbers that need glow
  } else {
    iconName = 'wind.svg';
    needsGlow = false; // Fallback icon doesn't need glow
  }

  return (
    <img
      src={`/weather-icons/design/fill/final/${iconName}`}
      alt={alt}
      style={{ 
        width: size, 
        height: size, 
        verticalAlign: 'middle',
        // Only add white glow for Beaufort numbered icons to make dark numbers visible
        filter: needsGlow 
          ? 'drop-shadow(0px 0px 3px rgba(255, 255, 255, 0.9)) drop-shadow(0px 0px 1px rgba(255, 255, 255, 1)) drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.5))' 
          : 'none',
      }}
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

        // Fetch merged weather data including pollen
        const weatherResponse = await fetch(`/api/weather-with-pollen?lat=${homeLocation.lat}&lon=${homeLocation.lon}`, {
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
        const endTime = startTime + (8 * 24 * 60 * 60); // 8 days later
        
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
    .map(([dateStr, dayEntries]: [string, any[]], dayIndex) => {
      // Different handling for today vs future days
      const isToday = dayIndex === 0;
      
      let currentEntry;
      
      if (isToday) {
        // For today, find the closest time entry to now
        const now = new Date();
        const currentHour = now.getHours();
        
        // Sort entries by how close they are to current time
        const sortedByCloseness = [...dayEntries].sort((a, b) => {
          const hourA = new Date(a.dt_txt).getHours();
          const hourB = new Date(b.dt_txt).getHours();
          return Math.abs(hourA - currentHour) - Math.abs(hourB - currentHour);
        });
        
        // Use the closest time entry
        currentEntry = sortedByCloseness[0];
        console.log('Today: Using current conditions instead of noon:', 
          { time: currentEntry.dt_txt, temp: currentEntry.main.temp });
      } else {
        // For future days, use noon as before
        currentEntry = dayEntries.find((e) => e.dt_txt.includes('12:00:00')) ?? dayEntries[0];
      }
      
      // Calculate true min and max temps across all hours of the day
      const allTemps = dayEntries.map(entry => entry.main.temp);
      const minTemp = Math.min(...allTemps);
      const maxTemp = Math.max(...allTemps);
      
      const marineForDay = marineHours.filter(
        (h: MarineHour) => h.time && h.time.slice(0, 10) === dateStr
      );
      
      // Get pollen and air quality data for this date
      const pollenForDate = weatherData.pollenByDate?.[dateStr];
      const airQualityForDate = weatherData.airQualityByDate?.[dateStr];
      
      return {
        date: Math.floor(new Date(currentEntry.dt_txt).getTime() / 1000),
        temperature: Math.round(currentEntry.main.temp),
        tempMax: Math.round(maxTemp),
        tempMin: Math.round(minTemp),
        condition: currentEntry.weather[0].main,
        description: currentEntry.weather[0].description,
        icon: currentEntry.weather[0].icon,
        rain: Math.round(currentEntry.rain?.['3h'] || 0),
        wind_speed: currentEntry.wind.speed, // OpenWeather provides m/s - keep in m/s for consistency
        wind_direction: currentEntry.wind.deg,
        clouds: currentEntry.clouds.all,
        humidity: currentEntry.main.humidity,
        visibility: currentEntry.visibility ?? 10000,
        waveHeight: undefined,
        waterTemperature: undefined,
        marine: marineForDay,
        pollen: pollenForDate, // Add pollen data
        airQuality: airQualityForDate, // Add air quality data
      };
    });

  setForecastByDay(forecast);
}, [weatherData, marineHours]);

  return { forecastByDay, loading, error, timeInfo, marineHours };
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
  return { emoji: '👺', label: 'Indoor', color: '#8b5cf6' };
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
    console.log("Marine hours available:", day.marine.map((h: any) => h.time));
    
    const marineHour = day.marine.find(
      (h: any) => typeof h.time === 'string' && h.time.startsWith(targetHourIso)
    );
    
    if (marineHour) {
      console.log("Found matching marine hour:", marineHour);
      console.log("Raw Stormglass wind speed (knots):", marineHour.windSpeed?.noaa);
      
      // Convert Stormglass wind speed from knots to m/s for internal consistency
      const windSpeedKnots = marineHour.windSpeed?.noaa;
      const windSpeedMps = windSpeedKnots ? knotsToMps(windSpeedKnots) : undefined;
      
      console.log("Converted wind speed (m/s):", windSpeedMps);
      
      // Use CONSISTENT property names and units (all wind speeds in m/s)
      return {
        ...day,
        waveHeight: marineHour.waveHeight?.noaa,
        swellHeight: marineHour.swellHeight?.noaa,
        swellPeriod: marineHour.swellPeriod?.noaa,
        waterTemperature: marineHour.waterTemperature?.noaa,
        windSpeed: windSpeedMps, // ⚠️ FIXED: Convert knots to m/s
        swellDir: marineHour.swellDirection?.noaa,
        gust: marineHour.windGust?.noaa ? knotsToMps(marineHour.windGust.noaa) : undefined, // Convert gust too
        vis: marineHour.visibility?.noaa,
        current: marineHour.currentSpeed?.noaa,
        windDir: marineHour.windDirection?.noaa,
      };
    } else {
      console.log("No matching marine hour found");
    }
  }
  return day;
}

// Consistent helper function you can reuse
const getTargetHourForDay = (dayUnixTimestamp: number) => {
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

// Helper: Build forecastByDay from One Call 3.0 if available
function buildForecastFromOneCall(weatherData: any): WeatherForecastDay[] {
  if (!weatherData?.daily) return [];
  return weatherData.daily.slice(0, 5).map((day: any, idx: number) => {
    return {
      date: day.dt,
      temperature: Math.round(day.temp.day),
      tempMax: Math.round(day.temp.max),
      tempMin: Math.round(day.temp.min),
      condition: day.weather?.[0]?.main ?? '',
      description: day.weather?.[0]?.description ?? '',
      icon: day.weather?.[0]?.icon ?? '01d',
      rain: Math.round(day.rain ?? 0),
      wind_speed: day.wind_speed,
      wind_direction: day.wind_deg,
      clouds: day.clouds,
      humidity: day.humidity,
      visibility: weatherData.current?.visibility ?? 10000,
      waveHeight: undefined,
      waterTemperature: undefined,
      marine: [],
      pollen: weatherData.pollenByDate?.[day.dt],
      airQuality: weatherData.airQualityByDate?.[day.dt],
    };
  });
}



  // Use the forecast data from the hook
  const forecastDays = forecastByDay;

  const heroDataByDay = forecastDays.map((day, idx) => {
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

    // Filter out out-of-season activities
    const suggestions = suggestionsData?.suggestions ?? [];
    const currentMonth = new Date(day.date * 1000).getMonth() + 1;
    const filteredSuggestions = suggestions.filter((suggestion: any) => {
      if (!suggestion) return false; // Filter out null/undefined
      const activity = activityTypes.find(a => a.id === suggestion.activityId);
      return !activity?.seasonalMonths || activity.seasonalMonths.includes(currentMonth);
    });
    const perfectList = filteredSuggestions.filter((s: any) => s.score >= 80).sort((a: any, b: any) => b.score - a.score);
    const goodList = filteredSuggestions.filter((s: any) => s.score >= 60 && s.score < 80).sort((a: any, b: any) => b.score - a.score);
    const indoorList: any[] = []; // No stayInside property available

    // Select a unique hero activity for the day
    const heroActivity = selectHeroActivity(filteredSuggestions as any);

    // ✅ Add the hero to used activities AFTER finding it
    if (heroActivity) {
      usedHeroActivities.add(heroActivity.activityId);
    }

    return {
      day,
      suggestions: filteredSuggestions,
      heroActivity,
      alsoGoodPerfect: perfectList.filter((a: any) => a.activityId !== heroActivity?.activityId),
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

  if (isFirstTimeUser) {
    return (
      <div style={{ 
        textAlign: 'center' as const, 
        padding: '3rem', 
        background: '#fefbf2', 
        borderRadius: '8px',
        border: '1px solid #fed7aa',
        margin: '2rem'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
        <h2 style={{ color: '#d97706', marginBottom: '0.5rem' }}>No Activities Selected</h2>
        <p style={{ color: '#92400e' }}>
          Choose your outdoor interests to see personalised activity recommendations based on the weather.
        </p>
        <a 
          href="/interests" 
          style={{ 
            display: 'inline-block',
            marginTop: '1rem',
            padding: '12px 24px',
            background: '#d97706',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '1.1rem'
          }}
        >
          Choose Activities
        </a>
      </div>
    );
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
        <header className="homepage-banner">
          <div className="homepage-banner__left">
            <img
              src="/burger-menu-svgrepo-com.svg"
              alt="Open menu"
              className="burger-menu-icon"
              onClick={() => setMenuOpen(true)}
            />
            <img src="/wotnow-horizontal.png" alt="WotNow Logo" className="homepage-banner__logo" />
          </div>
          
          {/* Desktop location buttons - in top right */}
          <div className="homepage-banner__location-buttons desktop-location-buttons">
            <button
              className="location-banner__button"
              style={{ background: '#10b981' }} // green for home
              onClick={() => setShowHomeDialog(true)}
            >
              {homeLocation?.name 
                ? `🏡 ${homeLocation.name.split(',')[0]} ✓` 
                : 'Set home location'}
            </button>
            <button
              className="location-banner__button"
              style={{ background: '#3b82f6' }} // blue for coastal
              onClick={() => setShowCoastDialog(true)}
            >
              {coastalLocation?.name 
                ? `🏖️ ${coastalLocation.name.split(',')[0]} ✓` 
                : 'Set beach location'}
            </button>
          </div>
        </header>

        {/* Mobile location buttons (below banner) */}
        <div className="homepage-banner__location-buttons mobile-location-buttons">
          <button
            className="location-banner__button"
            style={{ background: '#10b981', flex: 1 }} // green for home
            onClick={() => setShowHomeDialog(true)}
          >
            {homeLocation?.name 
              ? `🏡 ${homeLocation.name.split(',')[0]} ✓` 
              : 'Set home location'}
          </button>
          <button
            className="location-banner__button"
            style={{ background: '#3b82f6', flex: 1 }} // blue for coastal
            onClick={() => setShowCoastDialog(true)}
          >
            {coastalLocation?.name 
              ? `🏖️ ${coastalLocation.name.split(',')[0]} ✓` 
              : 'Set beach location'}
          </button>
        </div>
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

    // Always show AstronomyCard for users with stargazing interest after today's card
    const hasStargazing = interests.includes('stargazing');
    // Use the day data with nightTemp fallback
    const astronomyWeatherData = {
      ...day,
      nightTemp: typeof (day as any).nightTemp === 'number' ? (day as any).nightTemp : day.temperature // fallback to temperature if nightTemp missing
    };
    const astronomyCard = idx === 0 && hasStargazing ? (
      <AstronomyCard
        key="astronomy-card"
        weatherData={astronomyWeatherData}
      />
    ) : null;

    const dayCard = (
      <div
        key={day.date}
        className="activity-card-enhanced"
        style={{
          backgroundImage: `url(${getActivityBg(heroActivity?.activityId || 'default')})`,
        }}
      >
        <div className="activity-card-overlay" />
        <div className="activity-card-content">
            <div className="weather-icon-topright">
    <div className="weather-icon-topright">
  <img
    src={getWeatherIconUrl(day.icon || '01d')}
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
  <WindIcon windMs={day.wind_speed || 0} />
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
            const activityMessage = getActivityMessage(activityId, scoreInfo.label.toLowerCase() as "perfect" | "good" | "fair" | "poor", []);

            // Suppose 'forecastDay' is the day object and you have marine hours attached
const dayDate = new Date(day.date * 1000);
const today = new Date();
const isToday = dayDate.getDate() === today.getDate() && 
                dayDate.getMonth() === today.getMonth() && 
                dayDate.getFullYear() === today.getFullYear();

// Use current time for today, midday for future
const hour = isToday ? today.getHours() : 12;
const targetHourIso = `${dayDate.toISOString().slice(0, 10)}T${hour.toString().padStart(2, '0')}`;

            const isMarineActivity = MARINE_ACTIVITY_IDS.includes(heroActivity.activityId);
const marinePopupDay = getPopupDay(heroActivity.activityId, day, timeInfo); // Stormglass
const weatherPopupDay = getWeatherDay(day, timeInfo); // <-- Use a function that extracts OpenWeather fields

const popupPayload = buildPopupActivityPayload({
  activityId: heroActivity.activityId,
  score: heroActivity.score,
  day: marinePopupDay,
  reasons: buildReasons(day, heroActivity.activityId),
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
                  {alsoGoodPerfect.map((suggestion: any) => {
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
const isMarineActivity = MARINE_ACTIVITY_IDS.includes(suggestion.activityId);
const popupPayload = buildPopupActivityPayload({
  activityId: suggestion.activityId,
  score: suggestion.score,
  day: getPopupDay(suggestion.activityId, day, timeInfo),
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
                .filter((s: any) => s.score >= 60 && s.score < 80 && s.activityId !== heroActivity?.activityId)
                .sort((a: any, b: any) => b.score - a.score)
                .slice(0, 4);

              if (goodActivities.length === 0) return null;

              return (
                <div className="activity-section">
                  <h4 className="also-good-title">👍 Good Options Today</h4>
                  <ul className="activity-list-good">
                    {goodActivities.map((suggestion: any) => {
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
const isMarineActivity = MARINE_ACTIVITY_IDS.includes(suggestion.activityId);
const popupPayload = buildPopupActivityPayload({
  activityId: suggestion.activityId,
  score: suggestion.score,
  day: getPopupDay(suggestion.activityId, day, timeInfo),
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
  // Get indoor activities from the suggestions list
  const indoorListFiltered = suggestions
    .filter((s: any) => {
      const activity = activityTypes.find(a => a.id === s.activityId);
      return activity && !activity.weatherSensitive;
    })
    .sort((a: any, b: any) => b.score - a.score);
  
  if (!indoorListFiltered.length) return null;

  return (
    <div className="also-good-section">
      <h4 className="also-good-title">👺 Staying Indoors?</h4>
      <ul className="also-good-list">
        {indoorListFiltered.map((s: any) => {
          const activity = activityTypes.find((a) => a.id === s.activityId);
          
          return (
            <li
              key={s.activityId}
              className="also-good-item"
              role="button"
              tabIndex={0}
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

    // Return both the day card and astronomy card if it's the first day
    return (
      <React.Fragment key={`fragment-${day.date}`}>
        {dayCard}
        {astronomyCard}
      </React.Fragment>
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
    dayTimestamp={popupActivity.dayTimestamp} // Use the direct timestamp property
    coastalLocation={coastalLocation}
    homeLocation={homeLocation}
    pollen={popupActivity.pollen}
    airQuality={popupActivity.airQuality}
    onClose={() => setPopupActivity(null)}
  />
)}
      </section> {/* End of section */}
    </> /* End of fragment */
  ); // End of return
} // End of Home component

function getWeatherDay(day: any, timeInfo: any) {
  return {
    temperature: day.temperature,
    tempMax: day.tempMax,
    tempMin: day.tempMin,
    condition: day.condition,
    description: day.description,
    icon: day.icon,
    precipitation: day.rain,
    windSpeed: day.wind_speed, // Already in m/s from OpenWeather
    windDir: day.wind_direction,
    humidity: day.humidity,
    visibility: day.visibility,
    clouds: day.clouds,
    // Add more OpenWeather fields as needed
  };
}