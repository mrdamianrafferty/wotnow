import React from "react";
import Image from "next/image";

// Helper function to get weather icon URL
function getWeatherIconUrl(iconCode?: string) {
  const code = iconCode || 'na';
  const supported = new Set(['01d','01n','02d','02n','03d','03n','04d','04n','09d','09n','10d','10n','11d','11n','13d','13n','50d','50n']);
  return supported.has(code) ? `/weather-icons/design/fill/final/${code}.svg` : '/weather-icons/design/fill/final/na.svg';
}

interface DailyForecast {
  dateISO: string;
  icon?: string;
  minC?: number;
  maxC?: number;
  pop?: number;
  precipMM?: number;
}

interface NextFewDaysCardProps {
  daily: DailyForecast[];
  maxDays?: number;
  className?: string;
}

const NextFewDaysCard: React.FC<NextFewDaysCardProps> = ({ 
  daily, 
  maxDays = 8,
  className = ""
}) => {
  return (
    <div className={`card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm col-span-1 ${className}`}>
      <div className="card-body">
        <h3 className="card-title">Next Few Days</h3>
        <div className="overflow-x-auto rounded-box bg-transparent">
          <table className="table table-compact bg-transparent w-full">
            <tbody>
              {(daily || []).slice(0, maxDays).map((d: DailyForecast, idx: number) => {
                const date = new Date(d.dateISO);
                const label = idx === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
                const iconUrl = getWeatherIconUrl(d.icon);
                return (
                  <tr key={d.dateISO} className="odd:bg-white/0 even:bg-white/5/30 hover:bg-white/10 transition-colors">
                    <td className="w-20 px-2 py-2 text-sm whitespace-nowrap">{label}</td>
                    <td className="w-8 px-2 py-2 text-center">
                      <Image 
                        src={iconUrl} 
                        alt="Weather icon" 
                        width={24} 
                        height={24} 
                        className="inline-block" 
                      />
                    </td>
                    <td className="px-2 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-sky-100/90">Low {d.minC != null ? Math.round(d.minC) : '—'}°</span>
                        <span className="text-warning">High {d.maxC != null ? Math.round(d.maxC) : '—'}°</span>
                        <span className={`badge badge-outline badge-xs flex items-center gap-1 ${d.precipMM && d.precipMM > 0.1 ? 'badge-info bg-opacity-20' : ''}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-70">
                            <path d="M12,3.77L11.25,4.61C11.25,4.61 9.97,6.06 8.68,7.94C7.39,9.82 6,12.07 6,14.23A6,6 0 0,0 12,20.23A6,6 0 0,0 18,14.23C18,12.07 16.61,9.82 15.32,7.94C14.03,6.06 12.75,4.61 12.75,4.61L12,3.77M12,6.9C12.44,7.42 12.84,7.85 13.68,9.07C14.89,10.83 16,13.07 16,14.23C16,16.45 14.22,18.23 12,18.23C9.78,18.23 8,16.45 8,14.23C8,13.07 9.11,10.83 10.32,9.07C11.16,7.85 11.56,7.42 12,6.9Z" />
                          </svg>
                          {d.precipMM && d.precipMM > 0 ? d.precipMM.toFixed(1) : '0'} mm
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default NextFewDaysCard;
