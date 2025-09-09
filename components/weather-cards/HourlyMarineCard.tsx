import React from 'react';
import Image from 'next/image';
import BeaufortIcon from '../BeaufortIcon';
import WindDirectionIcon from '../WindDirectionIcon';

interface HourlyMarineCardProps {
  hourlyWithEvents: any[];
  aqiAssess: any;
  pollenAssess: any;
  pollenBadgeClass: string;
  hasMarine: boolean;
}

// Helper functions (moved from main file)
const fmtTimeHM = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  } catch {
    return '—';
  }
};

const degToCompassHourly = (deg?: number) => {
  if (deg == null) return '—';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(deg / 22.5) % 16];
};

const badgeForUv = (uv?: number): string => {
  if (!uv) return 'badge-neutral';
  if (uv <= 2) return 'badge-success';
  if (uv <= 5) return 'badge-warning';
  if (uv <= 7) return 'badge-warning';
  if (uv <= 10) return 'badge-error';
  return 'badge-error';
};

const badgeForAqi = (level?: number): string => {
  if (!level) return 'badge-neutral';
  if (level <= 1) return 'badge-success';
  if (level <= 2) return 'badge-warning';
  if (level <= 3) return 'badge-warning';
  return 'badge-error';
};

const getAirQualityLevelDescription = (level: number): string => {
  if (level <= 1) return 'Good';
  if (level <= 2) return 'Moderate';
  if (level <= 3) return 'Unhealthy';
  return 'Hazardous';
};

const getPollenLevelDescription = (level: number): string => {
  if (level <= 1) return 'Low';
  if (level <= 2) return 'Moderate';
  if (level <= 3) return 'High';
  return 'Very High';
};

export const HourlyMarineCard: React.FC<HourlyMarineCardProps> = ({
  hourlyWithEvents,
  aqiAssess,
  pollenAssess,
  pollenBadgeClass,
  hasMarine,
}) => {
  return (
    <div className="flex flex-col">
      <h2 className="text-sm opacity-70 mb-2 flex items-center gap-2">
        Hourly {hasMarine && (<span className="badge badge-info badge-outline badge-xs">Marine</span>)}
      </h2>
      <div className="card bg-transparent shadow-none h-full">
        <div className="card-body p-0 h-full">
          <div className="carousel rounded-box space-x-2 bg-transparent h-full">
            {hourlyWithEvents.map((it) => (
              <div className="carousel-item" key={it.key}>
                {it.kind === 'hour' ? (
                  <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm w-36 h-full">
                    <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                      <div className="w-full">
                        <div className="text-xs opacity-70">{it.hour.label}</div>
                        <img src={it.hour.iconUrl} alt="" className="w-10 h-10 mx-auto my-1" />
                        <div className="text-3xl font-bold leading-none">{it.hour.temp}°</div>
                        <div className="mt-1">
                          <div className="relative flex items-center justify-center">
                            <Image 
                              src="/weather-icons/design/fill/final/raindrops.svg" 
                              alt="Precipitation" 
                              width={56} 
                              height={56} 
                              className="w-14 h-14" 
                            />
                            <span className="absolute text-[12px] font-medium text-white">
                              {Math.round(it.hour.precipMM || 0)}mm
                            </span>
                          </div>
                        </div>
                        {/* Wind */}
                        <div className="mt-2 text-sm leading-snug text-white/90 w-full space-y-1">
                          <div className="flex items-center justify-center gap-1">
                            <BeaufortIcon windMS={it.hour.windMS || 0} size={30} />
                            <WindDirectionIcon deg={it.hour.windDeg || 0} size={16} />
                            <span>{degToCompassHourly(it.hour.windDeg)}</span>
                          </div>
                          <div>
                            {typeof it.hour.wind === 'number' ? Math.round(it.hour.wind) : 0} km/h{typeof it.hour.gust === 'number' ? ` (${Math.round(it.hour.gust)})` : ''}
                          </div>
                          <div>
                            {typeof it.hour.wind === 'number' ? Math.round(it.hour.wind / 1.852) : 0} knots{typeof it.hour.gust === 'number' ? ` (${Math.round(it.hour.gust / 1.852)})` : ''}
                          </div>
                          {/* Marine extras */}
                          <div className="flex items-center justify-center gap-1">
                            {(() => {
                              const period = typeof it.hour.wavePeriodS === 'number' ? it.hour.wavePeriodS : 10; // fallback to 10s
                              const pIcon = Math.max(1, Math.min(20, Math.round(period)));
                              const periodIconSrc = `/wave-period-icons/wave-period-${pIcon}s.svg`;
                              return (
                                <div className="tooltip" data-tip={`${period.toFixed(1)}s period`}>
                                  <Image 
                                    src={periodIconSrc} 
                                    alt={`${pIcon}s period`} 
                                    width={16} 
                                    height={16} 
                                    className="w-4 h-4" 
                                  />
                                </div>
                              );
                            })()}
                            <span>{typeof it.hour.waveHeightM === 'number' ? it.hour.waveHeightM.toFixed(1) : '—'} m</span>
                          </div>
                          {/* UV / Air / Pollen */}
                          <div className="flex flex-col items-center gap-1 mt-2">
                            {typeof it.hour.uvi === 'number' && (
                              <span className={`badge badge-sm ${badgeForUv(it.hour.uvi)}`}>
                                UV {Math.round(it.hour.uvi)}
                              </span>
                            )}
                            <span className={`badge badge-sm ${badgeForAqi(aqiAssess?.overall)}`}>
                              Air {getAirQualityLevelDescription(aqiAssess?.overall || 0)}
                            </span>
                            <span className={`badge badge-sm ${pollenBadgeClass}`}>
                              Pollen {getPollenLevelDescription(pollenAssess.overall)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : it.kind === 'tide' ? (
                  <div className="card bg-sky-800/35 backdrop-blur-sm text-base-content border border-sky-600/50 shadow-sm w-32 h-full">
                    <div className="card-body p-1 items-center text-center h-full flex flex-col">
                      {it.sub === 'high' ? (
                        // High tide: icon at top
                        <>
                          <div className="flex-none">
                            <div className="text-[11px] opacity-70">{fmtTimeHM(it.timeISO)}</div>
                            <div className="text-sm font-semibold capitalize">{it.sub} tide</div>
                          </div>
                          <div className="flex-1 flex items-center justify-center">
                            <img src="/weather-icons/design/fill/final/tide-high.svg" alt="" className="w-32 h-32" />
                          </div>
                          <div className="flex-none">
                            {typeof it.height === 'number' && (
                              <div className="text-xs opacity-90">{it.height.toFixed(2)} m</div>
                            )}
                          </div>
                        </>
                      ) : (
                        // Low tide: icon at bottom
                        <>
                          <div className="flex-none">
                            <div className="text-[11px] opacity-70">{fmtTimeHM(it.timeISO)}</div>
                            <div className="text-sm font-semibold capitalize">{it.sub} tide</div>
                          </div>
                          <div className="flex-1 flex items-end justify-center">
                            <img src="/weather-icons/design/fill/final/tide-low.svg" alt="" className="w-32 h-32" />
                          </div>
                          <div className="flex-none">
                            {typeof it.height === 'number' && (
                              <div className="text-xs opacity-90">{it.height.toFixed(2)} m</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="card bg-amber-500/35 backdrop-blur-sm text-base-content border border-amber-400/60 shadow-sm w-32 h-full">
                    <div className="card-body p-3 items-center text-center h-full flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] opacity-70">{fmtTimeHM(it.timeISO)}</div>
                        <img 
                          src={it.sub === 'sunrise' ? '/weather-icons/design/fill/final/sunrise.svg' : '/weather-icons/design/fill/final/sunset.svg'} 
                          alt="" 
                          className="w-16 h-16 mx-auto my-2" 
                        />
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
  );
};
