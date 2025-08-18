import React, { useState, useEffect } from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';
import '../styles/Card.css';

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

// Helper function to get weather icon for night conditions
const getNightWeatherIcon = (condition: string, isNight: boolean) => {
  if (!isNight) return null;
  
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes('clear')) return '01n.svg';
  if (conditionLower.includes('few clouds')) return '02n.svg';
  if (conditionLower.includes('scattered clouds')) return '03n.svg';
  if (conditionLower.includes('broken clouds') || conditionLower.includes('overcast')) return '04n.svg';
  if (conditionLower.includes('rain')) return '10n.svg';
  if (conditionLower.includes('thunderstorm')) return '11n.svg';
  if (conditionLower.includes('snow')) return '13n.svg';
  if (conditionLower.includes('mist') || conditionLower.includes('fog')) return '50n.svg';
  
  return '01n.svg'; // Default clear night
};

const AstronomyCard: React.FC<AstronomyCardProps> = ({ className = '', style = {}, weatherData }) => {
  const { preferences } = useUserPreferences();
  const [highlights, setHighlights] = useState<AstronomyHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const homeLocation = preferences.locations?.find((l) => l.type === 'home');

  useEffect(() => {
    const fetchAstronomyHighlights = async () => {
      if (!homeLocation?.lat || !homeLocation?.lon) {
        setLoading(false);
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
        setHighlights(data.highlights || []);
      } catch (err) {
        console.error('Error fetching astronomy highlights:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch astronomy data');
      } finally {
        setLoading(false);
      }
    };

    fetchAstronomyHighlights();
  }, [homeLocation?.lat, homeLocation?.lon]);

  // Don't render if no astronomy-related interests
  const hasAstronomyInterest = preferences.interests?.some(interest => 
    ['stargazing', 'astrophotography', 'camping', 'hiking', 'nature_observation', 'photography'].includes(interest)
  );

  if (!hasAstronomyInterest || loading || error || !highlights.length) {
    return null;
  }

  const tonight = highlights[0];
  const hasSpecialEvents = tonight.events.length > 0;
  const hasDarkWindow = tonight.darkWindow && tonight.darkWindow.durationHours > 6;
  const cloudCover = weatherData?.clouds || 0;
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 20 || currentHour < 6;

  // Only show if there's something interesting or good conditions
  if (!hasSpecialEvents && !hasDarkWindow && (tonight.moon.illumination > 60 || cloudCover > 70)) {
    return null;
  }

  // Get the appropriate astronomy icon
  const astronomyIcon = getAstronomyIcon(tonight.events, tonight.moon.illumination, cloudCover);
  const nightWeatherIcon = getNightWeatherIcon(weatherData?.condition || 'clear', isNight);

  // Determine the primary event to feature
  const primaryEvent = tonight.events.find(e => e.type === 'eclipse') ||
                      tonight.events.find(e => e.type === 'meteor_shower') ||
                      tonight.events[0];

  const stargazingScore = Math.max(0, 100 - tonight.moon.illumination - cloudCover);

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
        {/* Weather icon top right - show night weather icon */}
        <div className="weather-icon-topright">
          {nightWeatherIcon && (
            <img
              src={`/weather-icons/design/fill/final/${nightWeatherIcon}`}
              alt="Tonight's weather"
              style={{ width: 48, height: 48 }}
              loading="lazy"
            />
          )}
        </div>

        {/* Header matching day card structure */}
        <div className="forecast-header">
          <div className="date-info">
            <h3 className="date-label">Tonight's Sky</h3>
          </div>
          <div className="temperature-info">
            <span className="temperature-label">
              {weatherData?.tempMin && `${Math.round(weatherData.tempMin)}°`} {tonight.moon.phaseName}
            </span>
          </div>
        </div>

        {/* Hero activity section - astronomy event or stargazing */}
        <div className="card__hero-activity">
          <div className="card__hero-icon">
            <img
              src={`/weather-icons/design/fill/final/${astronomyIcon}`}
              alt="Astronomy highlight"
              style={{ width: 48, height: 48 }}
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
            style={{ background: stargazingScore > 70 ? '#10b981' : stargazingScore > 40 ? '#3b82f6' : '#fbbf24' }}
          >
            {stargazingScore > 70 ? '🌟' : stargazingScore > 40 ? '👍' : '⭐'}
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
                  <div className="weather-data-subtitle">Best: {primaryEvent.bestTime}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer message */}
        <div className="activity-footer">
          <div className="activity-message">
            {primaryEvent 
              ? `${primaryEvent.description}${primaryEvent.direction ? ` Look ${primaryEvent.direction}` : ''}`
              : tonight.wotnowMessage.split('\n')[0]
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default AstronomyCard;
