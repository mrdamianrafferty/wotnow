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
}) => {
  const isMarine = !!marineData;
  const emoji = getActivityEmoji(activityId);
  const backgroundImage = bgMap[activityId] ?? '/default-bg.jpg';

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
                  {typeof marineData.waveHeight === 'number' && (
                    <li>🌊 <strong>{marineData.waveHeight.toFixed(2)}</strong> m</li>
                  )}
                  {typeof marineData.swellPeriod === 'number' && (
                    <li>🔁 <strong>{marineData.swellPeriod}</strong> s</li>
                  )}
                  {typeof marineData.windSpeed === 'number' && (
                    <li>💨 <strong>{marineData.windSpeed}</strong> km/h</li>
                  )}
                  {typeof marineData.waterTemperature === 'number' && (
                    <li>🏊 <strong>{marineData.waterTemperature.toFixed(1)}</strong>°C</li>
                  )}
                </>
              )}
              {!isMarine && weatherData && (
                <>
                  {weatherData.description && (
                    <li>📍 {weatherData.description}</li>
                  )}
                  {typeof weatherData.temperature === 'number' && (
                    <li>🌡️ <strong>{weatherData.temperature}</strong>°C</li>
                  )}
                  {typeof weatherData.windSpeed === 'number' && (
                    <li>💨 <strong>{(weatherData.windSpeed * 1).toFixed(1)}</strong> km/h</li>
                  )}
                  {typeof weatherData.humidity === 'number' && (
                    <li>😅 <strong>{weatherData.humidity}</strong> %</li>
                  )}
                  {typeof weatherData.precipitation === 'number' && (
                    <li>☂️ <strong>{weatherData.precipitation}</strong> mm</li>
                  )}
                </>
              )}
            </ul>
          </section>
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

export default Popup;
