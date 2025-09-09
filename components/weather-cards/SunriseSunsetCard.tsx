import React from 'react';
import Image from 'next/image';

interface SunriseSunsetCardProps {
  weather: {
    sunriseISO?: string;
    sunsetISO?: string;
  };
}

export const SunriseSunsetCard: React.FC<SunriseSunsetCardProps> = ({
  weather
}) => {
  const formatTime = (timestamp: number | null): string => {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getDayLength = (sunrise: number | null, sunset: number | null): string => {
    if (!sunrise || !sunset) return '—';
    const diffMs = (sunset - sunrise) * 1000;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const sunrise = weather?.sunriseISO ? new Date(weather.sunriseISO).getTime() / 1000 : null;
  const sunset = weather?.sunsetISO ? new Date(weather.sunsetISO).getTime() / 1000 : null;

  return (
    <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
      <div className="card-body">
        <h3 className="card-title flex items-center gap-2">
          <Image src="/weather-icons/design/fill/final/sunrise.svg" alt="Sun" width={20} height={20} className="w-5 h-5" />
          Sun Times
        </h3>
        
        {/* Big icons side by side */}
        <div className="flex items-center justify-center gap-8 my-4">
          <div className="text-center">
            <Image 
              src="/weather-icons/design/fill/final/sunrise.svg" 
              alt="Sunrise" 
              width={96} 
              height={96} 
              className="w-24 h-24 mx-auto mb-2" 
            />
            <div className="text-lg font-bold">{formatTime(sunrise)}</div>
            <div className="text-sm opacity-70">Sunrise</div>
          </div>
          
          <div className="text-center">
            <Image 
              src="/weather-icons/design/fill/final/sunset.svg" 
              alt="Sunset" 
              width={96} 
              height={96} 
              className="w-24 h-24 mx-auto mb-2" 
            />
            <div className="text-lg font-bold">{formatTime(sunset)}</div>
            <div className="text-sm opacity-70">Sunset</div>
          </div>
        </div>

        <div className="divider my-2"></div>
        
        <div className="text-center">
          <div className="text-sm opacity-70">Day length</div>
          <div className="text-lg font-semibold">{getDayLength(sunrise, sunset)}</div>
        </div>
      </div>
    </div>
  );
};
