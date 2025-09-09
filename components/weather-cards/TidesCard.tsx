import React from 'react';
import PrettyTideWaveRolling from '../PrettyTideWaveRolling';

interface TidesCardProps {
  weather: any;
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

// Helper functions
const synthesizeTideSamplesFromExtrema = (events: any[]): any[] => {
  if (!events || events.length === 0) return [];
  
  // Convert time strings to timestamps and sort
  const sortedEvents = events
    .map(e => ({
      ...e,
      ts: new Date(e.time).getTime(),
    }))
    .sort((a, b) => a.ts - b.ts);

  if (sortedEvents.length < 2) return [];

  const samples: any[] = [];
  const now = Date.now();
  const windowStart = now - 6 * 60 * 60 * 1000; // 6 hours ago
  const windowEnd = now + 18 * 60 * 60 * 1000; // 18 hours ahead

  // If we have enough events, extrapolate future tides based on the pattern
  if (sortedEvents.length >= 4) {
    const lastEvent = sortedEvents[sortedEvents.length - 1];
    const secondLastEvent = sortedEvents[sortedEvents.length - 2];
    const thirdLastEvent = sortedEvents[sortedEvents.length - 3];
    const fourthLastEvent = sortedEvents[sortedEvents.length - 4];
    
    // Calculate average tidal cycle (time between high/low tides)
    const cycle1 = secondLastEvent.ts - fourthLastEvent.ts;
    const cycle2 = lastEvent.ts - thirdLastEvent.ts;
    const avgCycle = (cycle1 + cycle2) / 2;
    
    // Determine the pattern (alternating high/low)
    const lastType = lastEvent.type;
    const nextType = lastType === 'high' ? 'low' : 'high';
    const nextNextType = nextType === 'high' ? 'low' : 'high';
    
    // Calculate next tide heights based on recent pattern
    const nextHeight = nextType === 'high' ? 
      Math.max(lastEvent.height, secondLastEvent.height) : 
      Math.min(lastEvent.height, secondLastEvent.height);
    
    // Add extrapolated events to sortedEvents for interpolation
    const extrapolatedEvents = [
      {
        ts: lastEvent.ts + avgCycle,
        height: nextHeight,
        type: nextType
      },
      {
        ts: lastEvent.ts + avgCycle * 2,
        height: nextNextType === 'high' ? 
          Math.max(lastEvent.height, secondLastEvent.height) : 
          Math.min(lastEvent.height, secondLastEvent.height),
        type: nextNextType
      }
    ];
    
    // Add extrapolated events to sortedEvents for interpolation
    sortedEvents.push(...extrapolatedEvents);
  }
  
  // Generate samples at regular 15-minute intervals across the entire window
  const intervalMs = 15 * 60 * 1000; // 15 minutes
  for (let ts = windowStart; ts <= windowEnd; ts += intervalMs) {
    // Find the two nearest tide events for interpolation
    let beforeEvent = null;
    let afterEvent = null;
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      if (sortedEvents[i].ts <= ts && sortedEvents[i + 1].ts >= ts) {
        beforeEvent = sortedEvents[i];
        afterEvent = sortedEvents[i + 1];
        break;
      }
    }
    
    if (beforeEvent && afterEvent) {
      const duration = afterEvent.ts - beforeEvent.ts;
      const elapsed = ts - beforeEvent.ts;
      const ratio = elapsed / duration;
      
      // Create a smooth sine wave between tide events
      // Use cosine for smoother transition (peaks at 0 and π, troughs at π/2)
      const heightDiff = afterEvent.height - beforeEvent.height;
      
      // More elegant sine wave: base linear interpolation + sinusoidal modulation
      const baseHeight = beforeEvent.height + (heightDiff * ratio);
      const waveAmplitude = Math.abs(heightDiff) * 0.3; // Amplitude based on tide range
      const sineModulation = waveAmplitude * Math.sin(ratio * Math.PI);
      
      const height = baseHeight + sineModulation;
      samples.push({ ts, height });
    } else if (beforeEvent && !afterEvent) {
      // After last event, maintain the last known height
      samples.push({ ts, height: beforeEvent.height });
    } else if (!beforeEvent && afterEvent) {
      // Before first event, maintain the first known height
      samples.push({ ts, height: afterEvent.height });
    }
  }
  
  // Ensure we include the actual tide events
  sortedEvents.forEach(event => {
    if (event.ts >= windowStart && event.ts <= windowEnd) {
      // Remove any existing sample at this exact timestamp
      const existingIndex = samples.findIndex(s => Math.abs(s.ts - event.ts) < intervalMs / 2);
      if (existingIndex >= 0) {
        samples[existingIndex] = { ts: event.ts, height: event.height };
      } else {
        samples.push({ ts: event.ts, height: event.height });
      }
    }
  });
  
  return samples.sort((a, b) => a.ts - b.ts);
};

const getTideTips = (phase: string) => {
  const tips = {
    high: [
      { icon: 'tide-high', title: 'Best for photos', detail: 'High water creates dramatic coastal scenes' },
      { icon: 'tide-high', title: 'Deep water activities', detail: 'Swimming, kayaking, and boating conditions optimal' }
    ],
    low: [
      { icon: 'tide-low', title: 'Beach exploration', detail: 'Tide pools and rock formations exposed' },
      { icon: 'tide-low', title: 'Beach combing', detail: 'Best time to search for shells and sea glass' }
    ],
    rising: [
      { icon: 'tide-rising', title: 'Fishing opportunities', detail: 'Fish move in with rising water' },
      { icon: 'tide-rising', title: 'Launching boats', detail: 'Water level increasing for easier access' }
    ],
    falling: [
      { icon: 'tide-falling', title: 'Safe shore time', detail: 'Water receding - good for beach walks' },
      { icon: 'tide-falling', title: 'Rock pool hunting', detail: 'Exposed areas reveal marine life' }
    ]
  };
  return tips[phase as keyof typeof tips] || [];
};

// Demo tide sequence for fallback
const tideSeq = [
  { time: '06:15', height: 0.3, kind: 'Low tide' },
  { time: '12:30', height: 3.2, kind: 'High tide' },
  { time: '18:45', height: 0.5, kind: 'Low tide' },
  { time: '01:00', height: 3.0, kind: 'High tide' },
];

export const TidesCard: React.FC<TidesCardProps> = ({
  weather,
  tideState,
  remMs,
  remH,
  remM,
  remS,
  tidePhase,
}) => {
  return (
    <div className="card bg-black/35 backdrop-blur-sm text-base-content border border-white/10 shadow-sm h-full">
      <div className="card-body">
        <h3 className="card-title text-white flex items-center gap-3">
          {tideState.text}
          {tideState.icon && (<img src={tideState.icon} alt="" className="w-10 h-10 md:w-12 md:h-12" />)}
          {remMs != null && (
            <span className="ml-2 text-sm opacity-70 flex items-center gap-2">
              <span>for</span>
              <span className="countdown font-mono text-sm">
                <span style={{ ['--value' as any]: remH }}></span>h:
                <span style={{ ['--value' as any]: remM }}></span>m:
                <span style={{ ['--value' as any]: remS }}></span>s
              </span>
            </span>
          )}
        </h3>
        
        {Array.isArray(weather?.tides) && weather!.tides!.length >= 2 ? (
          (() => {
            const raw = (weather!.tides || [])
              .filter((e: any) => e && e.time)
              .map((e: any) => ({
                time: String(e.time),
                type: (String(e.type).toLowerCase().includes('high') ? 'high' : 'low') as 'high'|'low',
                height: typeof e.height === 'number' ? e.height : (e.height != null ? Number(e.height) : 0)
              }));
            
            // Sort and window to next 24h
            const nowTs = Date.now();
            const endTs = nowTs + 24 * 60 * 60 * 1000;
            const sorted = raw.slice().sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
            
            // Always include the last event before now and the first event after end to ensure full segments
            let beforeIdx = -1; 
            let _afterIdx = -1;
            for (let i = 0; i < sorted.length; i++) {
              const t = new Date(sorted[i].time).getTime();
              if (t < nowTs) beforeIdx = i; 
              else { _afterIdx = i; break; }
            }
            
            const windowed = sorted.filter((e: any) => {
              const t = new Date(e.time).getTime();
              return t >= nowTs && t <= endTs;
            });
            
            const extras: typeof sorted = [];
            if (beforeIdx >= 0) extras.push(sorted[beforeIdx]);
            const firstAfterEndIdx = sorted.findIndex((e: any) => new Date(e.time).getTime() > endTs);
            if (firstAfterEndIdx >= 0) extras.push(sorted[firstAfterEndIdx]);
            
            const events = (windowed.length ? [...extras.slice(0,1), ...windowed, ...extras.slice(1,2)] : sorted);
            const samples = synthesizeTideSamplesFromExtrema(events);
            const extrema = events.map((e: any) => ({ ts: new Date(e.time).getTime(), height: e.height, type: e.type }));
            
            return (
              <PrettyTideWaveRolling
                samples={samples}
                extrema={extrema}
                highIconSrc="/weather-icons/design/fill/final/tide-high.svg"
                lowIconSrc="/weather-icons/design/fill/final/tide-low.svg"
                className="bg-base-200/20"
              />
            );
          })()
        ) : (
          (() => {
            // Fallback: use demo sequence to render the same pretty tide card shape
            const today = new Date();
            const isoFor = (hhmm: string) => {
              const [hh, mm] = hhmm.split(':').map(Number);
              const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh % 24, mm || 0, 0, 0);
              return d.toISOString();
            };
            
            const events = tideSeq.map(e => ({
              time: isoFor(e.time),
              type: (e.kind.toLowerCase().includes('high') ? 'high' : 'low') as 'high'|'low',
              height: e.height
            }));
            
            const samples = synthesizeTideSamplesFromExtrema(events);
            const extrema = events.map(e => ({ ts: new Date(e.time).getTime(), height: e.height, type: e.type }));
            
            return (
              <PrettyTideWaveRolling
                samples={samples}
                extrema={extrema}
                highIconSrc="/weather-icons/design/fill/final/tide-high.svg"
                lowIconSrc="/weather-icons/design/fill/final/tide-low.svg"
                className="bg-base-200/20"
              />
            );
          })()
        )}

        {/* Tide Tips (accordion like Moon lore) */}
        {tidePhase && (
          <details className="collapse collapse-arrow mt-3">
            <summary className="collapse-title p-0">
              <div className="flex items-center gap-2">
                <img
                  src={
                    tidePhase === 'high' ? '/weather-icons/design/fill/final/tide-high.svg'
                    : tidePhase === 'low' ? '/weather-icons/design/fill/final/tide-low.svg'
                    : tidePhase === 'rising' ? '/weather-icons/design/fill/final/tide-high.svg'
                    : '/weather-icons/design/fill/final/tide-low.svg'
                  }
                  alt=""
                  className="w-6 h-6"
                />
                <span className="font-medium">Tide tips</span>
                <span className="badge badge-ghost badge-sm capitalize">{tidePhase}</span>
              </div>
            </summary>
            <div className="collapse-content p-0 mt-2">
              <ul className="space-y-2">
                {getTideTips(tidePhase).map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <img
                      src={
                        tip.icon === 'tide-high' ? '/weather-icons/design/fill/final/tide-high.svg'
                        : tip.icon === 'tide-low' ? '/weather-icons/design/fill/final/tide-low.svg'
                        : tip.icon === 'tide-rising' ? '/weather-icons/design/fill/final/tide-high.svg'
                        : '/weather-icons/design/fill/final/tide-low.svg'
                      }
                      alt=""
                      className="w-5 h-5 mt-0.5 opacity-80"
                    />
                    <div>
                      <div className="text-sm font-medium">{tip.title}</div>
                      <div className="text-xs opacity-80">{tip.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}
      </div>
    </div>
  );
};
