import React from 'react';
import { WeatherCardGrid } from '../weather-cards/WeatherCardGrid';
import NextFewDaysCard from '../weather-cards/NextFewDaysCard';

interface InlandLayoutProps {
  weather: any;
  today: any;
  uvRingClass: string;
  aqiAssess: any;
  pollenAssess: any;
  pollenIdx: number;
  pollenBadgeClass: string;
  pollenToday: any;
  visibilityKm: number | null;
  humidity: number | null;
  pressureTrend: string | null;
  pressure: number | null;
  hourlyWithEvents: any[];
}

export const InlandLayout: React.FC<InlandLayoutProps> = ({
  weather,
  today,
  uvRingClass,
  aqiAssess,
  pollenAssess,
  pollenIdx,
  pollenBadgeClass,
  pollenToday,
  visibilityKm,
  humidity,
  pressureTrend,
  pressure,
  hourlyWithEvents,
}) => {
  return (
    <div>
      {/* Inland layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 xl:gap-8 auto-rows-fr">
        
        {/* Row 1: Hourly */}
        <div className="flex flex-col h-full">
          <h2 className="text-sm opacity-70 mb-2">Hourly</h2>
          <div className="card bg-transparent shadow-none h-full">
            <div className="card-body p-0 h-full">
              <div className="carousel rounded-box space-x-2 bg-transparent h-full">
                {hourlyWithEvents.map((it) => (
                  <div className="carousel-item" key={it.key}>
                    {it.kind === 'hour' ? (
                      <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm w-40 h-full">
                        <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                          <div className="w-full">
                            <div className="text-xs opacity-70">{it.hour.label}</div>
                            <img src={it.hour.iconUrl} alt="" className="w-10 h-10 mx-auto my-1" />
                            <div className="text-3xl font-bold leading-none">{it.hour.temp}°</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="card bg-amber-500/35 backdrop-blur-sm text-base-content border border-amber-400/60 shadow-sm w-32 h-full">
                        <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                          <div>
                            <div className="text-[11px] opacity-70">{it.hour?.label || '—'}</div>
                            <img src={it.sub === 'sunrise' ? '/weather-icons/design/fill/final/sunrise.svg' : '/weather-icons/design/fill/final/sunset.svg'} alt="" className="w-16 h-16 mx-auto my-2" />
                            <div className="text-sm font-semibold capitalize">{it.sub}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feels Like */}
        <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm">
          <div className="card-body">
            <h3 className="card-title">Feels Like</h3>
            <div className="stats">
              <div className="stat">
                <div className="stat-title">Now</div>
                <div className="stat-value text-2xl">
                  {weather?.feelsLike != null ? `${Math.round(weather.feelsLike)}°` : '—'}
                </div>
                <div className="stat-desc">
                  Actual {weather?.tempC != null ? `${Math.round(weather.tempC)}°` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Few Days - 8-Day Forecast */}
        <NextFewDaysCard
          daily={weather?.daily || []}
          maxDays={8}
        />
      </div>

      {/* 8-Day Forecast */}
      <div className="mt-4">
        <NextFewDaysCard
          daily={weather?.daily || []}
          maxDays={8}
        />
      </div>

      {/* Shared cards for inland layout */}
      <WeatherCardGrid
        weather={weather}
        today={today}
        uvRingClass={uvRingClass}
        aqiAssess={aqiAssess}
        pollenAssess={pollenAssess}
        pollenIdx={pollenIdx}
        pollenBadgeClass={pollenBadgeClass}
        pollenToday={pollenToday}
        visibilityKm={visibilityKm}
        humidity={humidity}
        pressureTrend={pressureTrend}
        pressure={pressure}
      />
    </div>
  );
};
