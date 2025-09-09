import React from 'react';

interface HumidityCardProps {
  weather: {
    dewPointC?: number;
  };
  humidity: number | null;
}

export const HumidityCard: React.FC<HumidityCardProps> = ({ weather, humidity }) => {
  return (
    <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h3 className="card-title">Humidity</h3>
          <span className="badge badge-info">
            {humidity != null ? `${humidity}%` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div 
            className="radial-progress" 
            style={{ ["--value" as any]: humidity || 0 }} 
            aria-label="Humidity"
          >
            {humidity != null ? `${humidity}%` : '—'}
          </div>
          <div className="text-sm opacity-80">
            Dew point {weather?.dewPointC != null ? Math.round(weather.dewPointC) : '—'}°
          </div>
        </div>
      </div>
    </div>
  );
};
