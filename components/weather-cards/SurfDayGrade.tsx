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

const colourFor = (light: "green" | "amber" | "red", isBeginnerFriendly = false) =>
  isBeginnerFriendly ? "badge-info text-white" : // Changed to white text for better contrast on blue background
  light === "green" ? "badge-success" : 
  light === "amber" ? "badge-warning" : 
  "badge-error";

// Modified text function that takes skill level into account
const textFor = (light: "green" | "amber" | "red", skill: "novice" | "intermediate" | "advanced" = "intermediate", waveHeight?: number) => {
  // For small waves that are still rideable (under 1m)
  const isSmallWaves = typeof waveHeight === 'number' && waveHeight < 1 && waveHeight >= 0.3;
  
  if (light === "green") {
    return "Good";
  } else if (light === "amber") {
    return "Fair";
  } else if (light === "red" && skill === "novice" && isSmallWaves) {
    return "Beginner friendly";
  } else {
    return "Poor";
  }
};

// Helper to check if conditions are beginner-friendly
const isBeginnerFriendly = (light: "green" | "amber" | "red", skill: "novice" | "intermediate" | "advanced" = "intermediate", waveHeight?: number) => {
  // Skip lengthy calculation if it's not a novice or not red
  if (light !== "red" || skill !== "novice") return false;
  
  // Check if wave height is in the beginner-friendly range
  return typeof waveHeight === 'number' && waveHeight < 1 && waveHeight >= 0.3;
};

export default function SurfDayGrade({ data, locationId = "default-location" }: Props) {
  // State for user override
  const [orientationOverride, setOrientationOverride] = useState<number | null>(null);
  const [skillOverride, setSkillOverride] = useState<"novice" | "intermediate" | "advanced" | null>(null);
  
  // Load any existing override on mount
  useEffect(() => {
    const savedOverride = getBeachOrientationOverride(locationId);
    setOrientationOverride(savedOverride);
  }, [locationId]);
  
  // Apply override if it exists
  const effectiveData = React.useMemo(() => {
    let updatedData = data;
    
    // Apply orientation override if it exists
    if (orientationOverride !== null) {
      updatedData = { ...updatedData, beachFacingDeg: orientationOverride };
    }
    
    // Apply skill level override if it exists
    if (skillOverride !== null) {
      updatedData = { ...updatedData, skill: skillOverride };
    }
    
    return updatedData;
  }, [data, orientationOverride, skillOverride]);
  
  // Modify gradeDay result to filter out night hours from best hour
  const day = React.useMemo(() => {
    const rawDayResult = gradeDay(effectiveData);
    
    // If the best hour is during nighttime (before 6 AM or after 8 PM), find the best daytime hour instead
    if (rawDayResult.bestHour) {
      const bestHourTime = new Date(rawDayResult.bestHour.ts);
      const hour = bestHourTime.getHours();
      const isNightHour = hour < 6 || hour >= 20;
      
      if (isNightHour) {
        // Find the best daytime hour instead
        const daytimeHours = rawDayResult.hours.filter(h => {
          const hourTime = new Date(h.ts);
          const hourNum = hourTime.getHours();
          return hourNum >= 6 && hourNum < 20; // Only consider hours between 6 AM and 8 PM
        });
        
        // Sort by light (green > amber > red) then by score
        const byLight = (l: "green" | "amber" | "red") => (l === "green" ? 2 : l === "amber" ? 1 : 0);
        const bestDaytimeHour = daytimeHours.length > 0 
          ? daytimeHours.sort((a, b) => byLight(b.light) - byLight(a.light) || b.score - a.score)[0] 
          : null;
        
        return {
          ...rawDayResult,
          bestHour: bestDaytimeHour
        };
      }
    }
    
    return rawDayResult;
  }, [effectiveData]);
  
  const best = day.bestHour;

  // Calculate average wave height once to avoid recalculations
  const avgWaveHeight = React.useMemo(() => {
    return effectiveData.hours.length > 0 
      ? effectiveData.hours.reduce((sum, h) => sum + h.primary.heightM, 0) / effectiveData.hours.length
      : undefined;
  }, [effectiveData.hours]);

  // Get badge text and color once to avoid recalculations
  const badgeInfo = React.useMemo(() => {
    return {
      color: colourFor(day.dayLight, isBeginnerFriendly(day.dayLight, effectiveData.skill, avgWaveHeight)),
      text: textFor(day.dayLight, effectiveData.skill, avgWaveHeight)
    };
  }, [day.dayLight, effectiveData.skill, avgWaveHeight]);

  // Debug: Log hour-by-hour grades to console
  React.useEffect(() => {
    console.log('Surf hour-by-hour grades:');
    day.hours.forEach(h => {
      const hourTime = new Date(h.ts);
      console.log(`${hourTime.toLocaleTimeString()}: ${h.light} (score: ${h.score})`);
    });
    
    // Log if there are mixed grades
    const uniqueLights = [...new Set(day.hours.map(h => h.light))];
    console.log('Unique grade types:', uniqueLights);
    console.log('Has mixed grades:', uniqueLights.length > 1);
  }, [day]);

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
          <div className={`badge ${badgeInfo.color} text-base-100`}>
            {badgeInfo.text}
          </div>
        </div>

        {best ? (
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Best slot</div>
              <div className="flex items-center gap-1">
                <div className="text-xs rounded-md bg-base-200 px-1.5 py-0.5">Daylight hours only</div>
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
            isBeginnerFriendly(day.dayLight, effectiveData.skill, avgWaveHeight) ? 
              "text-info-content bg-info" :
              day.dayLight === "green" ? "text-success-content bg-success" : 
              day.dayLight === "amber" ? "text-warning-content bg-warning" : 
              "text-error-content bg-error"
          } px-2 py-0.5 rounded inline-block`}>
            {isBeginnerFriendly(day.dayLight, effectiveData.skill, avgWaveHeight) ?
              "Beginner-Friendly Surf" :
              "Surf Advice"
            }
          </h3>
          <p className="text-sm">
            {day.dayLight === "green" 
              ? "Good conditions for surfing! Check the best times above for optimal experience."
              : day.dayLight === "amber"
                ? "Fair conditions with some challenges. Be careful and check the forecast details."
                : (() => {
                    // Check if this is beginner-friendly small waves
                    if (avgWaveHeight !== undefined && avgWaveHeight >= 0.3 && avgWaveHeight < 1 && effectiveData.skill === "novice") {
                      return "Small waves today - perfect for beginners, bodyboards, and learning! Experienced surfers may want to check other spots.";
                    } else {
                      return "Poor conditions today. Consider alternative activities or check back tomorrow.";
                    }
                  })()
            }
          </p>
          {best ? (
            <p className="text-sm mt-2">
              <strong>Best time to go:</strong> {new Date(best.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {best.light === "green" ? " - excellent conditions!" : 
               best.light === "amber" ? " - acceptable conditions" : 
               isBeginnerFriendly(best.light, effectiveData.skill, bestHourData?.primary?.heightM) ? 
                " - good for beginners" : " - challenging conditions"}
            </p>
          ) : (
            <p className="text-sm mt-2">
              <strong>Best time to go:</strong> No suitable surfing hours found during daylight. Check back tomorrow or choose a different location.
            </p>
          )}
          
          <p className="text-xs mt-3 italic opacity-80">
            {effectiveData.skill === "novice" && avgWaveHeight !== undefined && avgWaveHeight >= 0.3 && avgWaveHeight < 1 ?
              "For novice surfers, we show small waves (0.3-1.0m) as beginner-friendly even when other conditions may not be ideal. More experienced surfers may prefer larger waves and better overall conditions." :
              "We blend wave size, period, wind strength, relative direction, and tide status into a simple traffic-light — with safety gates to keep intermediates out of dangerous surf. Advanced surfers can read the raw data. Hang tight and be safe!"
            }
          </p>
        </div>

        <details className="collapse collapse-arrow">
          <summary className="collapse-title text-sm font-medium flex items-center">
            Hour-by-hour
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 opacity-60" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {day.hours.length > 0 && 
              (() => {
                // Get unique light types for daytime hours only - wrapped in a function to avoid recalculation
                const daytimeHours = day.hours.filter(h => {
                  const hourTime = new Date(h.ts);
                  const hour = hourTime.getHours();
                  return hour >= 6 && hour < 20; // Only consider daytime hours
                });
                const uniqueLights = new Set(daytimeHours.map(h => h.light));
                return uniqueLights.size === 1 && 
                  <span className="ml-2 text-xs opacity-70">(all hours graded similarly)</span>;
              })()
            }
          </summary>
          <div className="collapse-content">
            <div className="grid grid-cols-1 gap-3">{
              // Memoize the hours rendering to prevent excessive recalculation
              React.useMemo(() => day.hours.map((h, index, array) => {
                const hourTime = new Date(h.ts);
                const hour = hourTime.getHours();
                const isNight = hour < 6 || hour >= 20;
                const hourData = effectiveData.hours.find(hData => hData.ts === h.ts);
                
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
                
                // Determine if conditions are beginner-friendly for this hour
                const hourBeginnerFriendly = isBeginnerFriendly(
                  h.light, 
                  effectiveData.skill, 
                  hourData?.primary?.heightM
                );
                
                return (
                <div key={h.ts} className="border rounded-lg p-2">
                  <div className="flex items-center justify-between">
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
                      <div className={`badge ${colourFor(h.light, hourBeginnerFriendly)} text-base-100`}>
                        {textFor(h.light, effectiveData.skill, hourData?.primary?.heightM)}
                      </div>
                    )}
                  </div>
                  {!isNight && (
                    <div className="mt-1 text-xs">
                      <div className="opacity-75">
                        {h.reasons[0]?.includes('Safety') ? (
                          <span className="text-error font-medium">{h.reasons[0]}</span>
                        ) : (
                          h.reasons.slice(0, 2).map((r, i) => (
                            <div key={i}>{r}</div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}), [day.hours, effectiveData.hours, effectiveData.skill])
            }</div>
          </div>
        </details>

        {/* Beach Orientation Selector */}
        <div className="mt-2 text-xs">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Beach Orientation:</span>
              <select 
                className="select select-xs select-bordered text-base-content" 
                value={orientationOverride !== null ? orientationOverride : (data.beachFacingDeg ? Math.round(data.beachFacingDeg / 45) * 45 : "")}
                onChange={handleOrientationChange}
              >
                <option value="" className="text-base-content">Auto-detect</option>
                <option value="0" className="text-base-content">North (0°)</option>
                <option value="45" className="text-base-content">Northeast (45°)</option>
                <option value="90" className="text-base-content">East (90°)</option>
                <option value="135" className="text-base-content">Southeast (135°)</option>
                <option value="180" className="text-base-content">South (180°)</option>
                <option value="225" className="text-base-content">Southwest (225°)</option>
                <option value="270" className="text-base-content">West (270°)</option>
                <option value="315" className="text-base-content">Northwest (315°)</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Experience Level:</span>
              <select 
                className="select select-xs select-bordered text-base-content" 
                value={skillOverride !== null ? skillOverride : (data.skill || "intermediate")}
                onChange={(e) => {
                  const value = e.target.value as "novice" | "intermediate" | "advanced" | "";
                  setSkillOverride(value === "" ? null : value);
                }}
              >
                <option value="" className="text-base-content">Default (Intermediate)</option>
                <option value="novice" className="text-base-content">Beginner/Novice</option>
                <option value="intermediate" className="text-base-content">Intermediate</option>
                <option value="advanced" className="text-base-content">Advanced</option>
              </select>
            </div>
          </div>
          
          {(orientationOverride !== null || skillOverride !== null) && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-info">
                {orientationOverride !== null && skillOverride !== null 
                  ? "Using custom orientation and experience level." 
                  : orientationOverride !== null 
                    ? "Using custom orientation." 
                    : "Using custom experience level."}
              </span>
              <button 
                className="btn btn-xs btn-ghost" 
                onClick={() => {
                  if (orientationOverride !== null) {
                    setOrientationOverride(null);
                    saveBeachOrientationOverride(locationId, null);
                  }
                  if (skillOverride !== null) {
                    setSkillOverride(null);
                  }
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