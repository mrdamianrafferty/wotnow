import React from 'react';
import '../styles/Popup.css';

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

interface PopupTemplateProps {
  emoji?: string;
  title: string;
  category: 'perfect' | 'good' | 'fair' | 'poor';
  message?: string;
  marineData?: MarineData;
  weatherData?: WeatherData;
  score?: number;
  onClose: () => void;
}

const PopupTemplate: React.FC<PopupTemplateProps> = ({
  emoji,
  title,
  category,
  message,
  marineData,
  weatherData,
  score,
  onClose,
}) => {
  const isMarine = !!marineData;

  return (
    <div className="popup" onClick={onClose}>
      <div
        className={`popup__content popup__content--${category}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="popup__close"
          onClick={onClose}
          aria-label="Close popup"
        >
          ×
        </button>

        {/* Header with emoji + title + badge */}
        <header className="popup__header">
          {emoji && (
            <span className="popup__emoji" role="img" aria-label="activity emoji">
              {emoji}
            </span>
          )}
          <h2 className="popup__title">{title}</h2>
          <span className={`popup__badge popup__badge--${category}`}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </span>
        </header>

        {/* Description or message */}
        {message && <p className="popup__message">{message}</p>}

        {/* Weather / Marine conditions */}
        {(marineData || weatherData) && (
          <section className="popup__weather-bar">
            <ul>
              {isMarine && marineData && (
                <>
                  {typeof marineData.waveHeight === 'number' && (
                    <li>🌊 <strong>{marineData.waveHeight.toFixed(2)}</strong> m waves</li>
                  )}
                  {typeof marineData.swellPeriod === 'number' && (
                    <li>🔁 <strong>{marineData.swellPeriod}</strong> s swell gap</li>
                  )}
                  {typeof marineData.windSpeed === 'number' && (
                    <li>💨 <strong>{Math.round(marineData.windSpeed * 3.6)}</strong> km/h wind</li>
                  )}
                  {typeof marineData.waterTemperature === 'number' && (
                    <li>🏊 <strong>{marineData.waterTemperature.toFixed(1)}</strong>°C water</li>
                  )}
                </>
              )}

              {!isMarine && weatherData && (
                <>
                  {weatherData.description && <li>📍 {weatherData.description}</li>}
                  {typeof weatherData.temperature === 'number' && (
                    <li>🌡️ <strong>{weatherData.temperature}</strong>°C</li>
                  )}
                  {typeof weatherData.windSpeed === 'number' && (
                    <li>💨 <strong>{(weatherData.windSpeed * 3.6).toFixed(1)}</strong> km/h</li>
                  )}
                  {typeof weatherData.humidity === 'number' && (
                    <li>💧 <strong>{weatherData.humidity}</strong>%</li>
                  )}
                  {typeof weatherData.precipitation === 'number' && (
                    <li>🌧️ <strong>{weatherData.precipitation}</strong> mm</li>
                  )}
                </>
              )}
            </ul>
          </section>
        )}

        {/* Footer score */}
        <footer className="popup__footer">
          Score: {typeof score === 'number' ? `${score}%` : '—'}
        </footer>
      </div>
    </div>
  );
};

export default PopupTemplate;
