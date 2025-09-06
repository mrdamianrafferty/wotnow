// SurfDayGrade.tsx
import React, { useState, useEffect } from "react";
import { DayMarine, gradeDay } from "../../utils/surfScoring";
import { getWaveDescription } from "../../utils/weatherLabels";
import { saveBeachOrientationOverride, getBeachOrientationOverride } from "../../utils/beachOrientationOverride";
import Image from "next/image";

type Props = {
  data: DayMarine; // includes hourly Stormglass marine + separate Stormglass tides + (optional) beachFacingDeg
  locationId?: string; // Optional locationId prop to identify the location - will fallback to default location if not provided
};

const colourFor = (light: "green" | "amber" | "red") =>
  light === "green" ? "badge-success" : light === "amber" ? "badge-warning" : "badge-error";

const textFor = (light: "green" | "amber" | "red") =>
  light === "green" ? "Good" : light === "amber" ? "Fair" : "Poor";

export default function SurfDayGrade({ data, locationId = "default-location" }: Props) {
  // State for user override
  const [orientationOverride, setOrientationOverride] = useState<number | null>(null);
  
  // Load any existing override on mount
  useEffect(() => {
    const savedOverride = getBeachOrientationOverride(locationId);
    setOrientationOverride(savedOverride);
  }, [locationId]);
  
  // Apply override if it exists
  const effectiveData = React.useMemo(() => {
    if (orientationOverride === null) return data;
    return { ...data, beachFacingDeg: orientationOverride };
  }, [data, orientationOverride]);
  
  const day = gradeDay(effectiveData);
  const best = day.bestHour;

  // Find the best hour data
  const bestHourData = best ? effectiveData.hours.find(h => h.ts === best.ts) : null;

  // Get wave description for best hour if available
  const getBestWaveDescription = () => {
    if (!best || !bestHourData) return "";
    return getWaveDescription(bestHourData.primary.heightM);
  };

  const waveDescription = getBestWaveDescription();
  
  // Determine which surf icon to use based on day light
  const surfIconSrc = 
    day.dayLight === "green" ? "/surf-green.svg" : 
    day.dayLight === "amber" ? "/surf-amber.svg" : "/surf-red.svg";
    
  // Handle orientation override change
  const handleOrientationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === "" ? null : parseInt(e.target.value);
    setOrientationOverride(value);
    saveBeachOrientationOverride(locationId, value);
  };

  return (
    <div className="card bg-base-100 shadow-xl max-w-sm">
      <div className="card-body gap-3">
        <div className="flex items-center gap-3">
          <Image 
            src={surfIconSrc} 
            alt={`Surf conditions: ${textFor(day.dayLight)}`} 
            width={24} 
            height={24} 
          />
          <h2 className="card-title">Surf Outlook</h2>
          <div className={`badge ${colourFor(day.dayLight)} text-base-100`}>
            {textFor(day.dayLight)}
          </div>
        </div>

        {best ? (
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Best slot</div>
              <div className="flex items-center gap-1">
                {bestHourData && bestHourData.primary && (
                  <div className="relative">
                    <Image 
                      src="/wave-period-icons/parametric-wave.svg"
                      alt="Wave visualization"
                      width={80}
                      height={80}
                      className="inline-block"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[14px] font-medium">
                      <span>{bestHourData.primary.heightM.toFixed(1)}m</span>
                      <span>{Math.round(bestHourData.primary.periodS)}s</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm opacity-80">
              {new Date(best.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            
            {waveDescription && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Wave conditions:</span> {waveDescription}
              </div>
            )}
            
            <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
              {best.reasons.slice(0, 4).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="alert alert-info">No hourly data available.</div>
        )}

        {/* Surf Advice Section */}
        <div className="mt-2">
          <h3 className={`font-medium text-sm mb-2 ${
            day.dayLight === "green" ? "text-success-content bg-success" : 
            day.dayLight === "amber" ? "text-warning-content bg-warning" : 
            "text-error-content bg-error"
          } px-2 py-0.5 rounded inline-block`}>Surf Advice</h3>
          <p className="text-sm">
            {day.dayLight === "green" 
              ? "Good conditions for surfing! Check the best times above for optimal experience."
              : day.dayLight === "amber"
                ? "Fair conditions with some challenges. Be careful and check the forecast details."
                : "Poor conditions today. Consider alternative activities or check back tomorrow."
            }
          </p>
          {best && (
            <p className="text-sm mt-2">
              <strong>Best time to go:</strong> {new Date(best.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {best.light === "green" ? " - excellent conditions!" : best.light === "amber" ? " - acceptable conditions" : " - challenging conditions"}
            </p>
          )}
          
          <p className="text-xs mt-3 italic opacity-80">
            We blend wave size, period, wind strength, relative direction, and tide status into a simple traffic-light — with safety gates to keep intermediates out of dangerous surf. Advanced surfers can read the raw data. Hang tight and be safe!
          </p>
        </div>

        <details className="collapse collapse-arrow">
          <summary className="collapse-title text-sm font-medium flex items-center">
            Hour-by-hour
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 opacity-60" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </summary>
          <div className="collapse-content">
            <div className="grid grid-cols-1 gap-3">
              {day.hours.map((h, index, array) => {
                const hourTime = new Date(h.ts);
                const hour = hourTime.getHours();
                const isNight = hour < 6 || hour >= 20;
                
                // Logic to show only the first night hour
                // If it's night time, check if it's the first one after sunset or if there's
                // a previous hour that's also night time
                if (isNight) {
                  // Get the previous hour's night status (if available)
                  const prevHour = index > 0 ? array[index - 1] : null;
                  const prevHourTime = prevHour ? new Date(prevHour.ts) : null;
                  const prevIsNight = prevHourTime ? 
                    (prevHourTime.getHours() < 6 || prevHourTime.getHours() >= 20) : false;
                  
                  // Skip if it's not the first night hour (except after dawn)
                  if (prevIsNight) {
                    // Show if it's the first hour after dawn (i.e., previous was night, this is day)
                    if (hour >= 6 && hour < 20) {
                      // This is day time after night - show it
                    } else {
                      // This is another night hour - skip it
                      return null;
                    }
                  }
                }
                
                return (
                <div key={h.ts} className="flex items-center justify-between border rounded-lg p-2">
                  <div>
                    <div className="font-medium">
                      {hourTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="text-xs opacity-80">Score {h.score}</div>
                  </div>
                  {isNight ? (
                    <div className="text-xl p-1" title="Night time - not suitable for surfing">
                      🌙
                    </div>
                  ) : (
                    <div className={`badge ${colourFor(h.light)} text-base-100`}>
                      {textFor(h.light)}
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>
        </details>

        {/* Beach Orientation Selector */}
        <div className="mt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium">Beach Orientation:</span>
            <select 
              className="select select-xs select-bordered" 
              value={orientationOverride !== null ? orientationOverride : (data.beachFacingDeg ? Math.round(data.beachFacingDeg / 45) * 45 : "")}
              onChange={handleOrientationChange}
            >
              <option value="">Auto-detect</option>
              <option value="0">North (0°)</option>
              <option value="45">Northeast (45°)</option>
              <option value="90">East (90°)</option>
              <option value="135">Southeast (135°)</option>
              <option value="180">South (180°)</option>
              <option value="225">Southwest (225°)</option>
              <option value="270">West (270°)</option>
              <option value="315">Northwest (315°)</option>
            </select>
          </div>
          {orientationOverride !== null && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-info">Using your custom orientation.</span>
              <button 
                className="btn btn-xs btn-ghost" 
                onClick={() => {
                  setOrientationOverride(null);
                  saveBeachOrientationOverride(locationId, null);
                }}
              >
                Reset
              </button>
            </div>
          )}
        </div>

        <div className="text-xs opacity-70 mt-2">
          <p>Note: Uses stored beach orientation if available; falls back gracefully when unknown. Tides come from the
          separate Stormglass Tides API.</p>
          <p className="mt-1">For better accuracy, use the map picker to precisely select your surf spot or set the beach orientation above to match your specific break.</p>
        </div>
      </div>
    </div>
  );
}