import React, { useState, useEffect } from 'react';
// WindIcon copied from pages/index.tsx for local use
type WindIconProps = {
  windMs: number;
  size?: number;
  alt?: string;
};

function WindIcon({ windMs, size = 28, alt = 'Wind' }: WindIconProps) {
  // Convert m/s to Beaufort scale
  function getBeaufortNumber(windMs: number) {
    // Standard Beaufort scale for m/s
    if (windMs < 0.3) return 0;
    if (windMs < 1.5) return 1;
    if (windMs < 3.3) return 2;
    if (windMs < 5.4) return 3;
    if (windMs < 7.9) return 4;
    if (windMs < 10.7) return 5;
    if (windMs < 13.8) return 6;
    if (windMs < 17.1) return 7;
    if (windMs < 20.7) return 8;
    if (windMs < 24.4) return 9;
    if (windMs < 28.4) return 10;
    if (windMs < 32.6) return 11;
    return 12;
  }
  const beaufort = getBeaufortNumber(windMs);
  let iconName = '';
  let needsGlow = false;
  if (beaufort < 3) {
    iconName = 'windsock.svg';
    needsGlow = false;
  } else if (beaufort <= 12) {
    iconName = `wind-beaufort-${beaufort}.svg`;
    needsGlow = true;
  } else {
    iconName = 'wind.svg';
    needsGlow = false;
  }
  return (
    <img
      src={`/weather-icons/design/fill/final/${iconName}`}
      alt={alt}
      style={{
        width: size,
        height: size,
        verticalAlign: 'middle',
        filter: needsGlow
          ? 'drop-shadow(0px 0px 3px rgba(255, 255, 255, 0.9)) drop-shadow(0px 0px 1px rgba(255, 255, 255, 1)) drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.5))'
          : 'none',
      }}
      loading="lazy"
    />
  );
}
import { getMoonLore, getRandomMoonLore, MoonPhase } from '../data/moonLore';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { describeIssPass } from '../utils/issHelper';
import '../styles/Card.css';
import { indieFlower, oxanium } from "@/app/fonts";
import { describeClearestSkiesFromHourly } from '../lib/services/goingOutTonight';

// Astronomy highlight interfaces
interface AstronomyEvent {
  type: 'sunset' | 'sunrise' | 'moonrise' | 'moonset' | 'eclipse' | 'meteor_shower' | 'new_moon' | 'full_moon';
  time: string;
  description?: string;
  name?: string;
  peak?: string;
  visible_from?: string;
  duration?: string;
}

interface SpecialEvent {
  type: 'meteor_shower' | 'moon_event' | 'seasonal' | 'planet' | 'eclipse';
  name: string;
  description: string;
  visibility: 'excellent' | 'good' | 'fair' | 'poor';
  activitySuggestion?: string;
  bestTime?: string;
  direction?: string;
}

interface AstronomyHighlight {
  date: string;
  dayName: string;
  isToday: boolean;
  sun: {
    sunset?: string;
    sunrise?: string;
  };
  moon: {
    rise?: string;
    set?: string;
    phaseName: string;
    illumination: number;
    icon: string;
  };
  darkWindow?: {
    start: string;
    end: string;
    durationHours: number;
  };
  events: SpecialEvent[];
  wotnowMessage: string;
}

interface AstronomyCardProps {
  className?: string;
  style?: React.CSSProperties;
  weatherData?: any;
}

// Helper function to get appropriate astronomy icon based on events
const getAstronomyIcon = (events: SpecialEvent[], moonIllumination: number, cloudCover: number) => {
  // Priority 1: Eclipse events
  const eclipseEvent = events.find(e => e.type === 'eclipse' || e.name.toLowerCase().includes('eclipse'));
  if (eclipseEvent) {
    return 'solar-eclipse.svg';
  }

  // Priority 2: Meteor shower events
  const meteorEvent = events.find(e => e.type === 'meteor_shower' || e.name.toLowerCase().includes('meteor'));
  if (meteorEvent) {
    return 'falling-stars.svg';
  }

  // Priority 3: Good stargazing conditions (low moon, low clouds)
  if (moonIllumination < 50 && cloudCover < 30) {
    return 'starry-night.svg';
  }

  // Default: Star icon
  return 'star.svg';
};

// Helper function to generate weather-aware astronomy message
const getWeatherAwareMessage = (
  primaryEvent: SpecialEvent | undefined,
  tonight: AstronomyHighlight,
  weatherData: any,
  stargazingScore: number
) => {
  const cloudCover = weatherData?.clouds || 0;
  const visibility = weatherData?.visibility || 10000;
  const rain = weatherData?.rain || 0;
  const snow = weatherData?.snow || 0;
  
  // Poor weather conditions
  if (rain > 0 || snow > 0) {
    return "Rain/snow expected tonight - not ideal for stargazing. Check forecast for clearer nights.";
  }
  
  if (cloudCover >= 80) {
    return "Heavy cloud cover expected - limited visibility for astronomy tonight.";
  }
  
  if (cloudCover >= 60) {
    return "Cloudy skies expected - some breaks in clouds may allow brief stargazing opportunities.";
  }
  
  // Special events with weather context
  if (primaryEvent) {
    // Build message parts, deduplicate direction, join naturally
    const parts: string[] = [];
    // Do NOT include bestTime here (now shown in data bar)
    if (primaryEvent.description) {
      parts.push(primaryEvent.description);
    }
    // Weather context
    if (cloudCover >= 40) {
      parts.push("Cloud breaks may offer good windows");
    } else if (cloudCover < 20) {
      parts.push("Clear skies expected - excellent viewing conditions!");
    }
    // Direction, only add if not already present
    if (primaryEvent.direction && typeof primaryEvent.direction === 'string' && primaryEvent.direction.trim()) {
      const direction = primaryEvent.direction;
      const dirPhrase = `Look ${direction}`;
      if (!parts.some(p => p.toLowerCase().includes(direction.toLowerCase()))) {
        parts.push(dirPhrase);
      }
    }
    // Remove duplicate phrases
    const deduped = Array.from(new Set(parts));
    return deduped.join('. ') + '.';
  }
  
  // General stargazing conditions
  if (stargazingScore >= 80) {
    return "Excellent conditions for deep space observation and Milky Way photography.";
  } else if (stargazingScore >= 60) {
    return "Good stargazing conditions - planets and bright stars clearly visible.";
  } else if (stargazingScore >= 40) {
    return "Fair conditions for basic stargazing - bright objects will be visible.";
  } else if (tonight.moon.illumination > 80) {
    return "Bright moonlight will wash out fainter stars, but great for lunar observation.";
  } else {
    return "Challenging conditions for stargazing tonight - consider waiting for clearer skies.";
  }
};
const getMidnightWeatherIcon = (weatherData: any) => {
  // Always return a night icon since this is for midnight
  if (!weatherData) return '01n.svg'; // Default clear night
  
  const condition = weatherData.condition || '';
  const clouds = weatherData.clouds || 0;
  const rain = weatherData.rain || 0;
  const snow = weatherData.snow || 0;
  
  // Check for precipitation first
  if (snow > 0) return '13n.svg'; // Snow
  if (rain > 0) return '10n.svg'; // Rain
  
  // Check for thunderstorms
  if (condition.toLowerCase().includes('thunderstorm') || condition.toLowerCase().includes('storm')) {
    return '11n.svg';
  }
  
  // Check cloud coverage
  if (clouds >= 75) return '04n.svg'; // Overcast/broken clouds
  if (clouds >= 50) return '03n.svg'; // Scattered clouds  
  if (clouds >= 25) return '02n.svg'; // Few clouds
  
  // Check for fog/mist
  if (condition.toLowerCase().includes('mist') || 
      condition.toLowerCase().includes('fog') || 
      (weatherData.visibility && weatherData.visibility < 5000)) {
    return '50n.svg';
  }
  
  return '01n.svg'; // Clear night
};

// Helper to get midnight weather from hourly data
const getMidnightWeather = (weatherData: any) => {
  if (!weatherData?.hourly) return null;
  // Find the first hour at 00:00 (midnight)
  const midnightHour = weatherData.hourly.find((h: any) => {
    const date = new Date(h.dt * 1000);
    return date.getHours() === 0;
  });
  return midnightHour || null;
};

// Helper to get current weather
const getCurrentWeather = (weatherData: any) => {
  return weatherData?.current || null;
};

// Helper to get daily high/low
const getDailyTemps = (weatherData: any) => {
  const today = weatherData?.daily?.[0];
  if (!today) return { tempMin: null, tempMax: null };
  return {
    tempMin: today.temp?.min ?? null,
    tempMax: today.temp?.max ?? null,
  };
};

// Build an Open‑Meteo‑like hourly object from OpenWeather One Call hourly
function buildHourlyForClearSkies(weatherData: any) {
  const hourly = Array.isArray(weatherData?.hourly) ? weatherData.hourly : [];
  if (!hourly.length) return null;
  const time = hourly.map((h: any) => new Date(h.dt * 1000).toISOString());
  const cloudcover = hourly.map((h: any) => Number(h?.clouds ?? NaN));
  return { time, cloudcover };
}

// Only treat as ISO if it looks like a date string; otherwise ignore
function toISOIfISOish(s?: string) {
  if (typeof s !== 'string') return undefined;
  if (!(/[TZ]|\d{4}-\d{2}-\d{2}/.test(s))) return undefined;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
}

const AstronomyCard: React.FC<AstronomyCardProps> = ({ className = '', style = {}, weatherData }) => {

  // Stable moon lore selection
  const [moonLoreText, setMoonLoreText] = useState<string | undefined>(undefined);
  const [moonLoreTitle, setMoonLoreTitle] = useState<string | undefined>(undefined);
  const { preferences } = useUserPreferences();
  const [highlights, setHighlights] = useState<AstronomyHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Defensive: preferences and locations
  const homeLocation = preferences?.locations?.find((l) => l.type === 'home');

  // Defensive: interests array
  const interests = Array.isArray(preferences?.interests) ? preferences.interests : [];

  // Defensive: always call hooks at top level, now pass sunrise/sunset for night time logic
  // We'll use tonight.sun.sunrise/sunset if available, else undefined
  const [sunTimes, setSunTimes] = useState<{sunrise?: string, sunset?: string}>({});
  useEffect(() => {
    if (highlights && highlights.length > 0 && highlights[0].sun) {
      setSunTimes({
        sunrise: highlights[0].sun.sunrise,
        sunset: highlights[0].sun.sunset
      });
    }
  }, [highlights]);

  // Defensive: fetch astronomy highlights only if lat/lon are available
  useEffect(() => {
    let cancelled = false;
    const fetchAstronomyHighlights = async () => {
      if (!homeLocation?.lat || !homeLocation?.lon) {
        setLoading(false);
        setHighlights([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/astronomy-highlights?lat=${homeLocation.lat}&lon=${homeLocation.lon}&days=3`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch astronomy highlights');
        }
        const data = await response.json();
        if (!cancelled) setHighlights(Array.isArray(data.highlights) ? data.highlights : []);
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching astronomy highlights:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch astronomy data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAstronomyHighlights();
    return () => { cancelled = true; };
  }, [homeLocation?.lat, homeLocation?.lon]);

  // Defensive: ensure highlights array has at least 2 days
  let safeHighlights = Array.isArray(highlights) ? highlights.slice(0, 2) : [];
  if (safeHighlights.length === 1) {
    // Mock a second day by copying the first and incrementing the date
    const first = safeHighlights[0];
    const nextDate = new Date(first.date);
    nextDate.setDate(nextDate.getDate() + 1);
    safeHighlights.push({
      ...first,
      date: nextDate.toISOString().split('T')[0],
      dayName: nextDate.toLocaleDateString('en-US', { weekday: 'long' }),
      isToday: false,
      wotnowMessage: '[Mocked] Second day highlight.'
    });
  }
  const tonight = safeHighlights.length > 0 ? safeHighlights[0] : undefined;

  useEffect(() => {
    if (tonight?.moon?.phaseName) {
      // Normalize phase name to match enum keys
      let phaseKey = tonight.moon.phaseName.toLowerCase().replace(/\s+/g, '_');
      if (phaseKey === 'new_moon' || phaseKey === 'newmoon') phaseKey = 'new';
      const loreItem = getRandomMoonLore(phaseKey as MoonPhase);
      if (loreItem) {
        setMoonLoreText(loreItem.text);
        setMoonLoreTitle(loreItem.title);
      } else {
        setMoonLoreText(undefined);
        setMoonLoreTitle(undefined);
      }
    } else {
      setMoonLoreText(undefined);
      setMoonLoreTitle(undefined);
    }
  }, [tonight?.moon?.phaseName]);

  // Always render the Astronomy Card, regardless of interests, loading, error, or highlight state
  // Show fallback UI if loading, error, or no highlights
  if (loading) {
    return (
      <div className={`activity-card-enhanced ${className}`} style={{ backgroundImage: `url(/milkyway.png)`, ...style }}>
        <div className="activity-card-overlay" />
        <div className="activity-card-content">
          <div className="forecast-header">
            <div className="date-info">
              <h3 className="date-label">Tonight's Sky</h3>
            </div>
          </div>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            Loading astronomy highlights...
          </div>
        </div>
      </div>
    );
  }
  if (error || !tonight) {
    return (
      <div className={`activity-card-enhanced ${className}`} style={{ backgroundImage: `url(/milkyway.png)`, ...style }}>
        <div className="activity-card-overlay" />
        <div className="activity-card-content">
          <div className="forecast-header">
            <div className="date-info">
              <h3 className="date-label">Tonight's Sky</h3>
            </div>
          </div>
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            Unable to load astronomy highlights.<br />
            {error ? `Error: ${error}` : 'No highlight data available.'}
          </div>
        </div>
      </div>
    );
  }

  // Extract weather info
  const currentWeather = getCurrentWeather(weatherData);
  const midnightWeather = getMidnightWeather(weatherData);
  const { tempMin, tempMax } = getDailyTemps(weatherData);
  // Robust: Get night temperature and description for tonight
  let nightTemp = null;
  let nightDescription = '';
  // Prefer One Call 3.0 daily[0] for tonight
  if (weatherData?.daily?.[0]?.temp?.night !== undefined) {
    nightTemp = weatherData.daily[0].temp.night;
    nightDescription = weatherData.daily[0].weather?.[0]?.description ?? '';
  } else if (weatherData?.nightTemp !== undefined) {
    nightTemp = weatherData.nightTemp;
    // Try to get a description for night: prefer 'nightDescription', else fallback to 'description'
    nightDescription = weatherData.nightDescription ?? weatherData.description ?? '';
  } else if (midnightWeather?.temp !== undefined) {
    nightTemp = midnightWeather.temp;
    nightDescription = midnightWeather.weather?.[0]?.description ?? '';
  } else if (
    tonight?.sun?.sunset &&
    Array.isArray(weatherData?.hourly) &&
    weatherData.hourly.length > 0
  ) {
    // Offset sunset by 2 hours and find nearest hourly data
    const sunsetTime = new Date(tonight.sun.sunset).getTime();
    const targetTime = sunsetTime + 2 * 60 * 60 * 1000;
    let closestHour = weatherData.hourly[0];
    let minDiff = Math.abs(new Date(weatherData.hourly[0].dt * 1000).getTime() - targetTime);
    for (const h of weatherData.hourly) {
      const hTime = new Date(h.dt * 1000).getTime();
      const diff = Math.abs(hTime - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestHour = h;
      }
    }
    nightTemp = closestHour.temp;
    nightDescription = closestHour.weather?.[0]?.description ?? '';
  } else if (currentWeather?.temp !== undefined) {
    nightTemp = currentWeather.temp;
    nightDescription = currentWeather.weather?.[0]?.description ?? '';
  }

  // Defensive: weather data
  const cloudCover = typeof weatherData?.clouds === 'number' ? weatherData.clouds : 0;
  const astronomyIcon = getAstronomyIcon(Array.isArray(tonight.events) ? tonight.events : [], tonight.moon.illumination, cloudCover);
  const midnightWeatherIcon = midnightWeather ? midnightWeather.weather?.[0]?.icon + '.svg' : getMidnightWeatherIcon(weatherData);

  // Defensive: primary event
  const eventsArr = Array.isArray(tonight.events) ? tonight.events : [];
  const primaryEvent = eventsArr.find(e => e.type === 'eclipse') ||
                      eventsArr.find(e => e.type === 'meteor_shower') ||
                      eventsArr[0];

  // Defensive: stargazing score
  const moonIllum = typeof tonight.moon.illumination === 'number' ? tonight.moon.illumination : 0;
  const stargazingScore = Math.max(0, 100 - moonIllum - cloudCover);

  console.log('AstronomyCard weatherData:', weatherData);
  console.log('midnightWeather:', midnightWeather);
  console.log('currentWeather:', currentWeather);

  // "Clearest skies" message using hourly cloud cover (prefers dark window if provided)
  const hourlyForClear = buildHourlyForClearSkies(weatherData);
  const tzGuess = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
  const windowStartISO = toISOIfISOish(tonight?.darkWindow?.start);
  const windowEndISO = toISOIfISOish(tonight?.darkWindow?.end);
  const clearestSkiesMsg = hourlyForClear
    ? describeClearestSkiesFromHourly(hourlyForClear, tzGuess, { windowStartISO, windowEndISO, smooth: 3 })
    : null;

  return (
    <div
      className={`activity-card-enhanced ${className}`}
      style={{
        backgroundImage: `url(/milkyway.png)`,
        ...style,
      }}
    >
      <div className="activity-card-overlay" />
      <div className="activity-card-content">
        {/* Weather icon top right - show midnight weather icon */}
        <div className="weather-icon-topright">
          <img
            src={`/weather-icons/design/fill/final/${midnightWeatherIcon}`}
            alt="Midnight weather"
            style={{ width: 48, height: 48 }}
            loading="lazy"
          />
        </div>

        {/* Header matching day card structure */}
        <div className="forecast-header">
          <div className="date-info">
            <h3 className="date-label">Tonight's Sky</h3>
            {/* Astronomy header details: temp, condition, wind - styled as in day cards */}
            <div className="astro-header-details card__header-details">
<span className="temperature-label">
  &nbsp;{typeof nightTemp === 'number' ? Math.round(nightTemp) : '--'}°
  {nightDescription ? ` ${nightDescription}` : ''}
  <WindIcon windMs={
    typeof weatherData?.wind_speed === 'number'
      ? weatherData.wind_speed
      : typeof midnightWeather?.wind_speed === 'number'
      ? midnightWeather.wind_speed / 3.6
      : typeof currentWeather?.wind_speed === 'number'
      ? currentWeather.wind_speed / 3.6
      : 0
  } />
</span>
            </div>
          </div>
        </div>

        {/* Hero activity section - astronomy event or stargazing */}
        <div className="card__hero-activity">
          <div className="card__hero-icon">
            <img
              src={`/weather-icons/design/fill/final/${astronomyIcon}`}
              alt="Astronomy highlight"
              style={{ width: 96, height: 96 }}
              loading="lazy"
            />
          </div>
          <div className="card__hero-title">
            <div className="card__hero-name outdoor">
              {primaryEvent ? primaryEvent.name : 'Stargazing'}
            </div>
            <div className="card__hero-message">
              {primaryEvent ? 'Special event tonight' : `${Math.round(stargazingScore)}% visibility`}
            </div>
          </div>
          <div
            className="card__score-badge"
            style={{ background: 'transparent' }}
          >
            <img
              src={`/weather-icons/design/fill/final/${tonight.moon.icon}`}
              alt={tonight.moon.phaseName}
              style={{ width: 80, height: 80 }}
              loading="lazy"
            />
          </div>
        </div>

        {/* Data bars section - astronomy and weather specific */}
        <div className="data-bars">
          {/* Moon illumination bar */}
          <div className="weather-data-bar">
            <div className="weather-data-label">
              <span className="data-icon">🌙</span>
              <span>Moon</span>
            </div>
            <div className="weather-data-content">
              <div className="weather-data-value">{tonight.moon.illumination}%</div>
              <div className="weather-data-bar-visual">
                <div 
                  className="weather-data-bar-fill" 
                  style={{ 
                    width: `${tonight.moon.illumination}%`,
                    background: tonight.moon.illumination < 30 ? '#10b981' : tonight.moon.illumination < 70 ? '#fbbf24' : '#ef4444'
                  }}
                />
              </div>
            </div>
          </div>


          {/* Cloud cover bar */}
          {weatherData?.clouds !== undefined && (
            <div className="weather-data-bar">
              <div className="weather-data-label">
                <span className="data-icon">☁️</span>
                <span>Clouds</span>
              </div>
              <div className="weather-data-content">
                <div className="weather-data-value">{weatherData.clouds}%</div>
                <div className="weather-data-bar-visual">
                  <div 
                    className="weather-data-bar-fill" 
                    style={{ 
                      width: `${weatherData.clouds}%`,
                      background: weatherData.clouds < 30 ? '#10b981' : weatherData.clouds < 70 ? '#fbbf24' : '#ef4444'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Visibility bar */}
          {weatherData?.visibility && (
            <div className="weather-data-bar">
              <div className="weather-data-label">
                <span className="data-icon">👁️</span>
                <span>Visibility</span>
              </div>
              <div className="weather-data-content">
                <div className="weather-data-value">{Math.round(weatherData.visibility / 1000)}km</div>
                <div className="weather-data-bar-visual">
                  <div 
                    className="weather-data-bar-fill" 
                    style={{ 
                      width: `${Math.min(100, (weatherData.visibility / 10000) * 100)}%`,
                      background: weatherData.visibility > 8000 ? '#10b981' : weatherData.visibility > 5000 ? '#fbbf24' : '#ef4444'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sunset time */}
          {tonight.sun.sunset && (
            <div className="weather-data-bar">
              <div className="weather-data-label">
                <img
                  src="/weather-icons/design/fill/final/sunset.svg"
                  alt="sunset"
                  style={{ width: 16, height: 16 }}
                />
                <span>Sunset</span>
              </div>
              <div className="weather-data-content">
                <div className="weather-data-value">{tonight.sun.sunset}</div>
              </div>
            </div>
          )}

          {/* Moonrise and Moonset bars */}
          {(tonight.moon.rise || tonight.moon.set) && (
            <div className="weather-data-bar">
              <div className="weather-data-label">
                <img
                  src="/weather-icons/design/fill/final/moonrise.svg"
                  alt="moonrise"
                  style={{ width: 16, height: 16, marginRight: 4 }}
                />
                <span>Moonrise</span>
              </div>
              <div className="weather-data-content">
                <div className="weather-data-value">{tonight.moon.rise ?? '--'}</div>
              </div>
            </div>
          )}
          {(tonight.moon.set) && (
            <div className="weather-data-bar">
              <div className="weather-data-label">
                <img
                  src="/weather-icons/design/fill/final/moonset.svg"
                  alt="moonset"
                  style={{ width: 16, height: 16, marginRight: 4 }}
                />
                <span>Moonset</span>
              </div>
              <div className="weather-data-content">
                <div className="weather-data-value">{tonight.moon.set}</div>
              </div>
            </div>
          )}

          {/* Special events */}
          {primaryEvent && (
            <div className="weather-data-bar">
              <div className="weather-data-label">
                <span className="data-icon">✨</span>
                <span>Event</span>
              </div>
              <div className="weather-data-content">
                <div className="weather-data-value">{primaryEvent.name}</div>
                {primaryEvent.bestTime && (
                  <div className="weather-data-subtitle">Best viewing {primaryEvent.bestTime}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Moon folklore section - stable moon lore below weather bars */}
        
<div className="moon-lore mt-4">
  <h4 className={`${indieFlower.className} font-bold text-lg leading-snug mb-1`}>
    {tonight?.moon?.phaseName
      ? `${tonight.moon.phaseName.replace(/_/g, ' ')} Moon Folklore${moonLoreTitle ? ' - ' + moonLoreTitle : ''}`
      : 'Moon Folklore'}
  </h4>
  <p className={`${indieFlower.className} opacity-90`} style={{ marginTop: 0 }}>
    {moonLoreText ?? 'No lore available for this phase.'}
  </p>
</div>

        {/* Astronomy message section - formatted similarly to moon lore */}
        <div className={`astronomy-message ${oxanium.className}`} style={{ margin: '16px 0', fontSize: '0.9rem' }}>
          <strong>🔭 Astronomy 🌖utlook</strong>
          <br />
          {getWeatherAwareMessage(primaryEvent, tonight, weatherData, stargazingScore)}
        </div>

        {/* Best sky window hint: only show concise time window message */}
        {clearestSkiesMsg && (
          <div className={`astronomy-message ${oxanium.className}`} style={{ margin: '4px 0 12px', opacity: 0.9, fontSize: '0.85rem' }}>
            <span style={{ fontStyle: 'italic' }}>{clearestSkiesMsg}</span>
          </div>
        )}

        {/* ISS sighting note - only if visible tonight */}
        {/* Next ISS pass tonight (first after sunset) */}
        {homeLocation?.lat && homeLocation?.lon && tonight?.sun?.sunset && (
          <IssNextPassNote lat={homeLocation.lat} lon={homeLocation.lon} sunsetISO={tonight.sun.sunset} />
        )}
      </div>
    </div>
  );
};

// Helper component: fetch and show next ISS pass tonight
const IssNextPassNote: React.FC<{ lat: number; lon: number; sunsetISO?: string }> = ({ lat, lon, sunsetISO }) => {
  // Import the helper
  // ...existing imports...
  // import { describeIssPass } from '../utils/issHelper';
  const [pass, setPass] = useState<{ risetime?: string; duration?: number; mag?: number; maxEl?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Fetch ISS next night pass from backend API
    fetch(`/api/iss-next-night-pass?lat=${lat}&lon=${lon}&sunsetISO=${encodeURIComponent(sunsetISO ?? '')}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          if (data?.pass && data.pass.risetime) {
            setPass({
              risetime: data.pass.risetime,
              duration: data.pass.duration,
              mag: data.pass.mag,
              maxEl: data.pass.maxEl
            });
          } else if (data?.error) {
            setError(data.error);
            setPass(null);
          } else {
            setError('No ISS pass found after sunset');
            setPass(null);
          }
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err?.message || String(err));
          setPass(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lat, lon, sunsetISO]);
  if (loading) return null;
  if (error) {
    // Friendlier message for no pass found
    const friendlyMsg = error === 'No ISS pass found after sunset'
      ? 'No visible ISS pass tonight for your location. Try again tomorrow!'
      : `ISS sighting info unavailable: ${error}`;
    return (
      <div className={`astronomy-message ${oxanium.className}`} style={{ margin: '8px 0', opacity: 0.8, color: '#ef4444', fontSize: '0.85rem' }}>
        <span style={{ fontWeight: 500 }}>
          {friendlyMsg}
        </span>
      </div>
    );
  }
  if (!pass?.risetime) return null;
  // Use describeIssPass helper for a natural language summary
  // Compose the data object for the helper
  const issData = {
    ok: true,
    risetime: pass.risetime,
    duration: typeof pass.duration === 'number' ? pass.duration : 0,
    mag: typeof pass.mag === 'number' ? pass.mag : 0,
    maxEl: typeof pass.maxEl === 'number' ? pass.maxEl : 0,
    sunset: '', // not needed for summary
    nextSunrise: '' // not needed for summary
  };
  // Import describeIssPass at the top of the file:
  // import { describeIssPass } from '../utils/issHelper';
  // If not already imported, add it.
  // Render the summary
  return (
    <div className={`astronomy-message ${oxanium.className}`} style={{ margin: '8px 0', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
      <img
        src="/satellite_iss.png"
        alt="ISS icon"
        style={{ width: 28, height: 28, verticalAlign: 'middle', filter: 'drop-shadow(0px 0px 2px #fff)' }}
        loading="lazy"
      />
      <span style={{ fontWeight: 500 }}>
        {describeIssPass(issData)}
      </span>
    </div>
  );
};

export default AstronomyCard;
