import React, { useEffect } from 'react';
import styles from './Popup.module.css'; // Import the CSS module for styling

interface Reason {
  key: string;
  label: string;
}

interface MarineData {
  waveHeight?: number;
  windSpeed?: number;
  waterTemperature?: number;
  swellHeight?: number;
  swellPeriod?: number;
}

interface PopupProps {
  title: string;
  description: string;
  category: 'perfect' | 'good' | 'fair' | 'poor';
  reasons?: Reason[];
  marineData?: MarineData;
  onClose: () => void;
}

const Popup: React.FC<PopupProps> = ({ title, description, category, reasons, marineData, onClose }) => {
  useEffect(() => {
    // Lock scrolling when the popup is open
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore scrolling when the popup is closed
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="popup">
      <div className="popup__overlay" onClick={onClose}></div>
      <div className={`popup__content popup__content--${category}`}>
        <button className="popup__close" onClick={onClose}>✖</button>
        <h2 className="popup__title">{title}</h2>
        <p className="popup__description">{description || 'No description available'}</p>
        {reasons && reasons.length > 0 && (
          <ul className="popup__reasons">
            {reasons.map(reason => (
              <li key={reason.key}>{reason.label}</li>
            ))}
          </ul>
        )}
        {marineData && (
          <div className="popup__marine-data">
            {marineData.waveHeight && <p>🌊 Wave Height: {marineData.waveHeight}m</p>}
            {marineData.windSpeed && <p>💨 Wind Speed: {marineData.windSpeed}km/h</p>}
            {marineData.waterTemperature && <p>🏊‍♂️ Water Temperature: {marineData.waterTemperature.toFixed(1)}°C</p>}
            {marineData.swellHeight && <p>🌊 Swell Height: {marineData.swellHeight}m</p>}
            {marineData.swellPeriod && <p>🌊 Swell Period: {marineData.swellPeriod}s</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Popup;