import React, { useEffect, useState } from 'react';
import { WeatherCardGrid } from '../weather-cards/WeatherCardGrid';
import { WaveCard } from '../weather-cards/WaveCard';
import { HourlyMarineCard } from '../weather-cards/HourlyMarineCard';
import { TidesCard } from '../weather-cards/TidesCard';
import SurfDayGrade from '../weather-cards/SurfDayGrade';
import NextFewDaysCard from '../weather-cards/NextFewDaysCard';
import { getWindMessage } from '../../utils/weatherLabels';
import { resolveBeachOrientationAsync } from '../../utils/orientation';

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
  tideState: {
    text: string;
    icon?: string | null;
    nextTimeISO?: string | null;
  };
  remMs?: number | null;
  remH?: number;
  remM?: number;
  remS?: number;
  tidePhase?: string | null;
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
  tideState,
  remMs,
  remH,
  remM,
  remS,
  tidePhase,
}) => {
  const [beachOrientation, setBeachOrientation] = useState<number | null>(null);

  // Fetch beach orientation when lat/lon changes
  useEffect(() => {
    const fetchBeachOrientation = async () => {
      if (weather?.lat && weather?.lon) {
        try {
          const result = await resolveBeachOrientationAsync({ 
            lat: weather.lat, 
            lon: weather.lon 
          });
          setBeachOrientation(result.orientation || null);
          console.log('Beach orientation:', result.orientation, 'Source:', result.source);
        } catch (error) {
          console.error('Failed to fetch beach orientation:', error);
        }
      }
    };
    
    fetchBeachOrientation();
  }, [weather?.lat, weather?.lon]);
  
  return (
    <div>
      {/* Marine layout with hourly, wind/tides, waves */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6 xl:gap-8 items-start">
        
        {/* LEFT — Hourly (full column height) */}
        <div className="flex flex-col">
          <h2 className="text-sm opacity-70 mb-2 flex items-center gap-2">
            Hourly {hasMarine && (<span className="badge badge-info badge-outline badge-xs">Marine</span>)}
          </h2>
          <HourlyMarineCard
            hourlyWithEvents={hourlyWithEvents}
            aqiAssess={aqiAssess}
            pollenAssess={pollenAssess}
            pollenBadgeClass={pollenBadgeClass}
            hasMarine={hasMarine}
          />
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
              {/* Wind Description */}
              <div className="text-sm opacity-80 mb-2">
                {getWindMessage({
                  windSpeed: weather?.windSpeedMS,
                  gustSpeed: weather?.windGustMS,
                  windDirection: weather?.windDeg,
                  context: 'marine'
                })}
              </div>
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
          <TidesCard
            weather={weather}
            tideState={tideState}
            remMs={remMs}
            remH={remH}
            remM={remM}
            remS={remS}
            tidePhase={tidePhase}
          />
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
            seaTemp={(currentMarine?.waterTemperature?.sg as number | undefined) ?? 
                     (currentMarine?.waterTemperature?.meto as number | undefined) ?? 
                     (currentMarine?.waterTemperature?.noaa as number | undefined) ?? 
                     (weather?.marine?.waterTemperature as number | undefined)}
            lat={weather?.lat}
            lon={weather?.lon}
            waveSeries={(marineHours.length ? 
              marineHours.map((m, i) => {
                const now = new Date();
                const time = new Date(now.getTime() + i * 60 * 60 * 1000);
                return {
                  height: typeof m?.waveHeight?.noaa === 'number' ? m.waveHeight.noaa : null,
                  time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
              }) : 
              (weather?.hourly || []).map((h: any, i: number) => {
                const now = new Date();
                const time = new Date(now.getTime() + i * 60 * 60 * 1000);
                return {
                  height: typeof h.waveHeightM === 'number' ? h.waveHeightM : null,
                  time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
              })
            )}
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

      {/* 8-Day Forecast - Single column */}
      <div className="mt-4 grid grid-cols-1">
        <NextFewDaysCard
          daily={weather?.daily || []}
          maxDays={8}
        />
      </div>

      {/* SurfDayGrade Card */}
      {weather?.tides && weather?.tides.length > 0 && marineHours.length > 0 && (
        <div className="mt-4">
          <SurfDayGrade 
            data={{
              beachFacingDeg: beachOrientation, // Use resolved beach orientation
              // Set skill level based on beach/location type
              skill: weather?.lat && weather?.lon && weather?.lat > 43.0 && weather?.lat < 44.0 ? 
                'intermediate' : // Northern Spain beaches are generally intermediate
                'novice',       // Default to novice for safety
              tideProfile: {
                // Use dynamic tide range if available
                minM: weather?.tides && Array.isArray(weather.tides) && weather.tides.length > 0 ? 
                  Math.min(...weather.tides
                    .filter((event: any) => typeof event.height === 'number')
                    .map((event: any) => event.height)) : 0,
                maxM: weather?.tides && Array.isArray(weather.tides) && weather.tides.length > 0 ? 
                  Math.max(...weather.tides
                    .filter((event: any) => typeof event.height === 'number')
                    .map((event: any) => event.height)) : 4,
                name: weather?.name || 'Generic Beach',
              },
              hours: marineHours.map((m) => {
                // Find the nearest tide event
                let tideInput = { 
                  tideHeightM: 2, 
                  tideRangeM: 4 
                }; // Default values
                
                if (weather?.tides && Array.isArray(weather.tides) && weather.tides.length > 0) {
                  // Try to calculate actual tide data from available tide events
                  const tideEvents = weather.tides;
                  const tideHeights = tideEvents
                    .filter((event: any) => typeof event.height === 'number')
                    .map((event: any) => event.height);
                  
                  if (tideHeights.length > 0) {
                    const minTide = Math.min(...tideHeights);
                    const maxTide = Math.max(...tideHeights);
                    const tideRange = maxTide - minTide;
                    
                    // Look for the tide height at this time
                    const timeMs = new Date(m.time).getTime();
                    const nearestTide = tideEvents
                      .sort((a: any, b: any) => {
                        const aTime = new Date(a.time).getTime();
                        const bTime = new Date(b.time).getTime();
                        return Math.abs(aTime - timeMs) - Math.abs(bTime - timeMs);
                      })[0];
                    
                    const currentHeight = nearestTide?.height || (minTide + maxTide) / 2;
                    
                    tideInput = {
                      tideHeightM: currentHeight,
                      tideRangeM: tideRange > 0 ? tideRange : 4
                    };
                  }
                }
                
                return {
                  ts: m.time,
                  wind: { 
                    speedKt: m.windSpeed?.noaa ? m.windSpeed.noaa * 1.94384 : 0, // Convert m/s to knots
                    // Use the same wind direction source as the Wind Card for consistency
                    directionDeg: (weather?.marine?.windDirection as number | undefined) ?? 
                      (weather?.windDeg as number | undefined) ?? 
                      (m.windDirection?.noaa || 0)
                  },
                  primary: {
                    // Use the *exact* same wave height source as WaveCard for consistency
                    heightM: (currentMarine?.waveHeight?.noaa as number | undefined) ?? 
                      (weather?.marine?.waveHeight as number | undefined) ?? 
                      0,
                    periodS: (currentMarine?.swellPeriod?.noaa as number | undefined) ?? 
                      (weather?.marine?.wavePeriod as number | undefined) ?? 
                      (m.wavePeriod?.noaa || m.swellPeriod?.noaa || 0),
                    directionDeg: (currentMarine?.swellDirection?.noaa as number | undefined) ?? 
                      (weather?.marine?.waveDirection as number | undefined) ?? 
                      (m.waveDirection?.noaa || m.swellDirection?.noaa || 0)
                  },
                  tide: tideInput
                };
              })
            }}
          />
        </div>
      )}
    </div>
  );
};

/* Wind Direction Discrepancy Resolution:
 * We've aligned all wind direction data sources to use the same hierarchy:
 * 1. weather?.marine?.windDirection (if available)
 * 2. weather?.windDeg (fallback)
 * 3. hourly data from marine API (last resort)
 * 
 * All components (Wind Card, WaveCard, SurfDayGrade) use the same 16-direction compass model
 * with directions: N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW
 * This ensures consistency across the application.
 */

/**
 * Marine data caching implementation:
 * 
 * 1. API Layer:
 *    - /api/marine endpoint caches responses for 15 minutes per location
 *    - fetchMarineWithCache in utils/fetchStormglass.ts has a 15-minute TTL
 * 
 * 2. UI Layer:
 *    - my-new-weather.tsx tracks lastMarineFetchTime and only refetches 
 *      after 15 minutes to reduce API calls and improve performance
 * 
 * This multi-layer approach ensures we don't call the marine API endpoints
 * more than once every 15 minutes, even with multiple page loads or component remounts.
 */
