import React from 'react';
import { WeatherCardGrid } from '../weather-cards/WeatherCardGrid';
import { WaveCard } from '../weather-cards/WaveCard';

interface MarineLayoutProps {
  weather: any;
  today: any;
  hasMarine: boolean;
  hourlyWithEvents: any[];
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
  marineHours: any[];
  currentMarine: any;
}

export const MarineLayout: React.FC<MarineLayoutProps> = ({
  weather,
  today,
  hasMarine,
  hourlyWithEvents,
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
  marineHours,
  currentMarine,
}) => {
  return (
    <div>
      {/* Marine layout with hourly, wind/tides, waves */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 xl:gap-8 items-start">
        
        {/* LEFT — Hourly (full column height) */}
        <div className="flex flex-col">
          <h2 className="text-sm opacity-70 mb-2 flex items-center gap-2">
            Hourly {hasMarine && (<span className="badge badge-info badge-outline badge-xs">Marine</span>)}
          </h2>
          <div className="card bg-transparent shadow-none h-full">
            <div className="card-body p-0 h-full">
              <div className="carousel rounded-box space-x-2 bg-transparent h-full">
                {/* Placeholder for hourly cards */}
                <div className="text-center p-4 opacity-70">
                  Hourly forecast will be rendered here...
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE — Wind/Tides */}
        <div className="grid grid-rows-2 gap-4">
          {/* Wind Card */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2">
                Wind
                <span className="badge badge-primary">Marine</span>
              </h3>
              <div className="stats">
                <div className="stat">
                  <div className="stat-title">Speed</div>
                  <div className="stat-value text-xl">
                    {weather?.windSpeedMS != null ? `${Math.round(weather.windSpeedMS * 3.6)} km/h` : '—'}
                  </div>
                  <div className="stat-desc">
                    {weather?.windGustMS != null ? `Gusts ${Math.round(weather.windGustMS * 3.6)}` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tides Card */}
          <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
            <div className="card-body">
              <h3 className="card-title flex items-center gap-2">
                Tides
                <span className="badge badge-info">Live</span>
              </h3>
              <div className="text-center p-4 opacity-70">
                Tide chart and timing will be rendered here...
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Waves */}
        <div>
          <WaveCard
            waveHeightM={(currentMarine?.waveHeight?.noaa as number | undefined) ?? (weather?.marine?.waveHeight as number | undefined)}
            wavePeriodS={(currentMarine?.swellPeriod?.noaa as number | undefined) ?? (weather?.marine?.wavePeriod as number | undefined)}
            waveDir={(currentMarine?.swellDirection?.noaa as number | undefined) ?? (weather?.marine?.waveDirection as number | undefined)}
            swellHeightM={(currentMarine?.swellHeight?.noaa as number | undefined) ?? (weather?.marine?.swellHeight as number | undefined)}
            swellPeriodS={(currentMarine?.swellPeriod?.noaa as number | undefined) ?? (weather?.marine?.swellPeriod as number | undefined)}
            swellDir={(currentMarine?.swellDirection?.noaa as number | undefined) ?? (weather?.marine?.swellDirection as number | undefined)}
            windSpeedMS={(weather?.marine?.windSpeed as number | undefined) ?? (weather?.windSpeedMS as number | undefined)}
            windDir={(weather?.marine?.windDirection as number | undefined) ?? (weather?.windDeg as number | undefined)}
            seaTemp={(currentMarine?.waterTemperature?.noaa as number | undefined) ?? (weather?.marine?.waterTemperature as number | undefined)}
            waveSeries={(marineHours.length ? marineHours.map((m) => (typeof m?.waveHeight?.noaa === 'number' ? m.waveHeight.noaa : null)) : (weather?.hourly || []).map((h: any) => (typeof h.waveHeightM === 'number' ? h.waveHeightM : null)))}
          />
        </div>
      </div>

      {/* Shared cards for marine layout */}
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
