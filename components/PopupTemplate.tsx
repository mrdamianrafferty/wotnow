import React from 'react';

interface PopupTemplateProps {
  title: string;
  description: string;
  marineData?: {
    windSpeed: string;
    waveHeight: string;
    waterTemperature: string;
  };
  onClose: () => void;
}

const PopupTemplate: React.FC<PopupTemplateProps> = ({ title, description, marineData, onClose }) => {
  return (
    <div className="popup">
      <div className="popup__header">
        <h2>{title}</h2>
        <button onClick={onClose} className="popup__close-button">✖</button>
      </div>
      <div className="popup__content">
        <p>{description}</p>
        {marineData && (
          <div className="popup__marine-data">
            <p>💨 Wind Speed: {marineData.windSpeed}</p>
            <p>🌊 Wave Height: {marineData.waveHeight}</p>
            <p>🌡️ Water Temperature: {marineData.waterTemperature}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PopupTemplate;