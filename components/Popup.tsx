// src/components/Popup.tsx

import React, { useEffect } from 'react';
import '../styles/Popup.css';
import { getActivityEmoji, getAssessmentEmoji } from '../data/emojiMap'; // Adjust path as necessary
import { getActivityMessage } from '../data/activityMessages';
import { MARINE_ACTIVITY_IDS } from '../utils/activityHelpers';
import bgMap from '../data/bgMap'; // Should be default export if used
import SwellArrow from './SwellArrow'; // Path as appropriate


interface MarineData {
  waveHeight?: number;
  windSpeed?: number;
  waterTemperature?: number;
  swellPeriod?: number;
}

interface WeatherData {
  description?: string;
  temperature?: number;
  windSpeed?: number;
  humidity?: number;
  precipitation?: number;
}

type Category = 'perfect' | 'good' | 'fair' | 'poor';

interface PopupProps {
  activityId: string;
  title: string;
  category: Category;
  message?: string;
  marineData?: MarineData;
  weatherData?: WeatherData;
  score?: number;
  onClose: () => void;
  coastalLocation?: { lat: number; lon: number };
  homeLocation?: { lat: number; lon: number };
}

const Popup: React.FC<PopupProps> = ({
  activityId,
  title,
  category,
  message,
  marineData,
  weatherData,
  score,
  onClose,
  coastalLocation,
  homeLocation,
}) => {
  const isMarine = !!marineData && Object.keys(marineData).length > 1; // More than just windSpeed
  const emoji = getActivityEmoji(activityId);
  const backgroundImage = bgMap[activityId] ?? '/default-bg.jpg';
  const isMarineActivity = MARINE_ACTIVITY_IDS.includes(activityId);

  const handleShare = () => {
    const shareUrl = `${window.location.origin}?activity=${encodeURIComponent(activityId)}`;
    const shareText = `Want to join me for ${title}? Check it out: ${shareUrl}`;

    if (navigator.share) {
      navigator
        .share({
          title: `Join me for ${title}`,
          text: shareText,
          url: shareUrl,
        })
        .catch((err) => console.log('Share cancelled:', err));
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Link copied to clipboard!');
    }
  };

  useEffect(() => {
    const lat = coastalLocation?.lat ?? homeLocation?.lat;
    const lon = coastalLocation?.lon ?? homeLocation?.lon;

    if (typeof lat === 'number' && !isNaN(lat) && typeof lon === 'number' && !isNaN(lon)) {
      fetchMarineData(lat, lon);
    }
  }, [coastalLocation, homeLocation]);

  return (
    <div className="popup" onClick={onClose}>
      <div
        className={`popup__content popup__content--${category}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.6)), url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button className="popup__close" onClick={onClose} aria-label="Close">×</button>

       <header className="popup__card-header">
  <div className="popup__card-emoji">{emoji}</div>
  <div className="popup__card-title">{title}</div>
  <span className={`popup__card-badge popup__badge--${category}`}>{getAssessmentEmoji(category)}</span>
</header>

        {message && <p className="popup__message">{message}</p>}

        {(marineData || weatherData) && (
          <section className="popup__weather-bar">
            <ul>
              {isMarine && marineData && (
                <>
                  <li>💧 <strong>{marineData.waterTemperature?.toFixed(1)}</strong>°C</li>
                  <li>🌊 <strong>{marineData.waveHeight?.toFixed(1)}</strong> m</li>
                  <li>
                    <img
                      src={getWindIcon(marineData.windSpeed)}
                      alt="Wind"
                      style={{ width: 28, height: 28, verticalAlign: 'middle' }}
                    />{' '}
                    <strong>{marineData.windSpeed?.toFixed(1)}</strong> m/s
                    {marineData.gust && <> (gust {marineData.gust.toFixed(1)} m/s)</>}
                  </li>
                  <li>🌊 Swell: <strong>{marineData.swellHeight?.toFixed(1)}</strong> m</li>
                  <li>
                    <SwellArrow deg={marineData.swellDir} /> {marineData.swellDir}°
                  </li>
                  <li>⏲ <strong>{marineData.swellPeriod}</strong> s</li>
                  <li>👁️ <strong>{marineData.vis}</strong> km</li>
                  <li>🧭 Current: <strong>{marineData.current}</strong> kts</li>
                </>
              )}
              {!isMarine && weatherData && (
                <>
                  {weatherData.icon && (
                    <li>
                      <img
                        src={getWeatherIconUrl(weatherData.icon)}
                        alt={weatherData.description || 'weather'}
                        style={{ width: 28, height: 28, verticalAlign: 'middle' }}
                      />{' '}
                      {weatherData.description}
                    </li>
                  )}
                  {typeof weatherData.temperature === 'number' && (
                    <li>
                      <img
                        src={thermometerIcon}
                        alt="Temperature"
                        style={{ width: 24, height: 24, verticalAlign: 'middle' }}
                      />{' '}
                      <strong>{weatherData.temperature}</strong>°
                    </li>
                  )}
                  {typeof weatherData.windSpeed === 'number' && (
                    <li>
                      <img
                        src={getWindIcon(weatherData.windSpeed)}
                        alt="Wind"
                        style={{ width: 28, height: 28, verticalAlign: 'middle' }}
                      />{' '}
                      <strong>{weatherData.windSpeed}</strong> km/h
                    </li>
                  )}
                  {typeof weatherData.humidity === 'number' && (
                    <li>
                      <img
                        src={humidityIcon}
                        alt="Humidity"
                        style={{ width: 24, height: 24, verticalAlign: 'middle' }}
                      />{' '}
                      <strong>{weatherData.humidity}</strong>%
                    </li>
                  )}
                  {typeof weatherData.precipitation === 'number' && (
                    <li>
                      <img
                        src={rainIcon}
                        alt="Precipitation"
                        style={{ width: 24, height: 24, verticalAlign: 'middle' }}
                      />{' '}
                      <strong>{weatherData.precipitation}</strong> mm
                    </li>
                  )}
                </>
              )}
            </ul>
          </section>
        )}

        {(!coastalLocation?.lat && !homeLocation?.lat) && (
          <div className="popup__marine-warning">
            Please set your beach or coastal location to see marine stuff like wave heights and swells.
          </div>
        )}

        <footer className="popup__footer">Score: {typeof score === 'number' ? `${score}%` : '—'}</footer>

        <div className="popup__action">
          <button className="popup__share-button" onClick={handleShare}>
            📤 Invite a friend to join
          </button>
        </div>
      </div>
    </div>
  );
};

// Map weather description/icon code to your SVG
function getWeatherIconUrl(iconCode: string) {
  const supportedIcons = [
    '01d','01n','02d','02n','03d','03n','04d','04n',
    '09d','09n','10d','10n','11d','11n','13d','13n','50d','50n'
  ];
  if (supportedIcons.includes(iconCode)) {
    return `/weather-icons/design/fill/final/${iconCode}.svg`;
  }
  return '/weather-icons/design/fill/final/na.svg';
}

// Thermometer, humidity, rain icons
const thermometerIcon = '/weather-icons/design/fill/final/thermometer-celsius.svg';
const humidityIcon = '/weather-icons/design/fill/final/humidity.svg';
const rainIcon = '/weather-icons/design/fill/final/raindrop-measure.svg';

// Beaufort wind icon logic
import { getBeaufortNumber } from '../utils/beaufort'; // adjust path as needed
function getWindIcon(windKmh: number) {
  const beaufort = getBeaufortNumber(windKmh);
  if (beaufort < 3) return '/weather-icons/design/fill/final/windsock.svg';
  if (beaufort <= 12) return `/weather-icons/design/fill/final/wind-beaufort-${beaufort}.svg`;
  return '/weather-icons/design/fill/final/wind.svg';
}

function kmhToKnots(kmh: number): number {
  return kmh * 0.539957;
}

async function fetchMarineData(lat: number | undefined, lon: number | undefined) {
  try {
    // Validate lat and lon
    if (typeof lat !== 'number' || isNaN(lat) || typeof lon !== 'number' || isNaN(lon)) {
      console.error('Invalid latitude or longitude:', { lat, lon });
      return; // Exit early if validation fails
    }

    const startISO = new Date().toISOString();
    const endISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(`/api/marine?lat=${lat}&lon=${lon}&start=${startISO}&end=${endISO}`);
    if (!res.ok) throw new Error(`Failed to fetch marine data: ${res.statusText}`);
    const data = await res.json();
    setMarineHours(data.hours || []);
  } catch (err) {
    console.error('Error fetching marine data:', err);
  }
}

export default Popup;
