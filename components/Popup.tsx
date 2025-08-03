import React, { useEffect } from 'react';
import '../styles/Popup.css';
import { getActivityMessage } from '../data/activityMessages';

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
  description?: string;
  category: 'perfect' | 'good' | 'fair' | 'poor';
  reasons?: Reason[];
  marineData?: MarineData;
  onClose: () => void;
}

/**
 * Fully typed, production-ready Popup component
 */
const Popup: React.FC<PopupProps> = ({
  title,
  description,
  category,
  reasons,
  marineData,
  onClose
}) => {
  useEffect(() => {
    // Lock background scroll while popup is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // If you want to use the activityMessage utility, you can safely call it here
  // or just display `description`
  // const activityMessage = description || getActivityMessage(title, category, reasons) || 'No description available.';
  const activityMessage = description || 'No description available.';

  return (
    <div className="popup">
      <div className="popup__overlay" onClick={onClose}></div>
      <div className={`popup__content popup__content--${category}`}>
        <button className="popup__close" onClick={onClose}>✖</button>
        <h2 className="popup__title">{(title || 'Unknown Activity').replace(/_/g, ' ')}</h2>
        <p className="popup__description">{activityMessage}</p>
        {reasons && reasons.length > 0 && (
          <ul className="popup__reasons">
            {reasons.map((reason) => (
              <li key={reason.key}>{reason.label}</li>
            ))}
          </ul>
        )}
        {marineData && (
          <div className="popup__marine-data">
            {marineData.waveHeight && <p>🌊 <strong>Wave Height:</strong> {marineData.waveHeight.toFixed(2)}m</p>}
            {marineData.windSpeed && <p>💨 <strong>Wind Speed:</strong> {marineData.windSpeed}km/h</p>}
            {marineData.waterTemperature && <p>🏊‍♂️ <strong>Water Temp:</strong> {marineData.waterTemperature.toFixed(1)}°C</p>}
            {marineData.swellHeight && <p>🌊 <strong>Swell Height:</strong> {marineData.swellHeight.toFixed(2)}m</p>}
            {marineData.swellPeriod && <p>🌊 <strong>Swell Period:</strong> {marineData.swellPeriod.toFixed(2)}s</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Popup;
