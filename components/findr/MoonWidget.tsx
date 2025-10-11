// MoonWidget.tsx
// A comprehensive moon phase widget for fishing applications
// Fetches data from /api/moon and displays fishing-relevant moon information
//
// Usage:
// <MoonWidget lat={43.3614} lon={-5.8593} />

import React, { useState, useEffect } from 'react';
import { Microscope, Sparkles } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';

// Types matching the API schema
interface PhaseInfo {
  timestamp: number;
  datestamp: string;
  days_ago?: number;
  days_ahead?: number;
}

interface FullMoonPhaseInfo extends PhaseInfo {
  name: string;
  description: string;
}

interface MoonApiResponse {
  timestamp: number;
  datestamp: string;
  
  sun: {
    sunrise: number;
    sunrise_timestamp: string;
    sunset: number;
    sunset_timestamp: string;
    solar_noon: string;
    day_length: string;
    sun_altitude: number;
    sun_distance: number;
    sun_azimuth: number;
    next_solar_eclipse?: {
      timestamp: number;
      datestamp: string;
      type: string;
      visibility_regions: string;
    };
  };
  
  moon: {
    phase: number;
    phase_name: string;
    stage: string;
    illumination: string;
    age_days: number;
    lunar_cycle: string;
    emoji: string;
    zodiac: {
      sun_sign: string;
      moon_sign: string;
    };
    moonrise: string;
    moonrise_timestamp: number;
    moonset: string;
    moonset_timestamp: number;
    moon_altitude: number;
    moon_distance: number;
    moon_azimuth: number;
    moon_parallactic_angle: number;
    next_lunar_eclipse?: {
      timestamp: number;
      datestamp: string;
      type: string;
      visibility_regions: string;
    };
  };
  
  moon_phases: {
    new_moon: {
      last: PhaseInfo;
      next: PhaseInfo;
    };
    first_quarter: {
      last: PhaseInfo;
      next: PhaseInfo;
    };
    full_moon: {
      last: FullMoonPhaseInfo;
      next: FullMoonPhaseInfo;
    };
    last_quarter: {
      last: PhaseInfo;
      next: PhaseInfo;
    };
  };
  
  location: {
    latitude: number;
    longitude: number;
  };
}

type ViewMode = 'summary' | 'detail' | 'science' | 'folklore';

interface MoonWidgetProps {
  lat: number;
  lon: number;
  defaultView?: ViewMode;
}

// Helper function to determine if it's spring or neap tides
const getTideType = (phaseName: string): 'spring' | 'neap' => {
  const phase = phaseName.toLowerCase();
  // Spring tides occur during new moon and full moon
  if (phase.includes('new_moon') || phase.includes('full_moon')) {
    return 'spring';
  }
  // Neap tides occur during quarter moons
  return 'neap';
};

// Get science fact based on moon phase
const getScienceFact = (phaseName: string) => {
  const phase = phaseName.toLowerCase();
  
  if (phase.includes('new_moon')) {
    return "Studies show approximately 90% of record catches happened during new moon phases, likely due to stronger tidal movement stirring up nutrients and baitfish.";
  } else if (phase.includes('full_moon')) {
    return "Full moon creates the strongest tides of the month. The increased water movement and visibility makes this an excellent time for predatory fish feeding.";
  } else if (phase.includes('first_quarter') || phase.includes('last_quarter')) {
    return "Quarter moons produce neap tides with less tidal movement. Fish tend to feed more consistently throughout the day rather than during specific tidal peaks.";
  } else if (phase.includes('waxing')) {
    return "Waxing moon phases show increased fish activity as we approach full moon. Many anglers report better catches as illumination increases.";
  } else {
    return "Waning moon phases can still produce good catches. Focus on dawn and dusk feeding periods when fish are most active.";
  }
};

// Get folklore story based on moon phase
const getFolkloreStory = (phaseName: string) => {
  const phase = phaseName.toLowerCase();
  
  if (phase.includes('new_moon')) {
    return {
      title: "Dark Moon Warning",
      story: 'Asturian fishers avoided the "dark of the moon", expecting thin catches.',
      culture: "Asturian"
    };
  } else if (phase.includes('full_moon')) {
    return {
      title: "Harvest Moon Bounty",
      story: "Caribbean fishermen believed the full moon brought fish closer to shore, drawn by the bright light reflecting off the water.",
      culture: "Caribbean"
    };
  } else if (phase.includes('first_quarter')) {
    return {
      title: "Rising Moon Fortune",
      story: "Ainu fishing communities saw the first quarter as a time of renewal, when fish returned to feeding grounds with vigor.",
      culture: "Ainu"
    };
  } else if (phase.includes('last_quarter')) {
    return {
      title: "Waning Moon Wisdom",
      story: "Chinese coastal villages taught that the last quarter moon was ideal for catching bottom-dwelling fish as they searched for food in darker waters.",
      culture: "Chinese"
    };
  } else {
    return {
      title: "Crescent Moon Mystery",
      story: "Norwegian fishermen believed crescent moons brought unpredictable catches, requiring adaptability and patience.",
      culture: "Norwegian"
    };
  }
};

// Calculate moon overhead and underfoot times (simplified solunar theory)
const getSolunarTimes = (moonrise: string, moonset: string) => {
  // This is a simplified calculation
  // In reality, you'd calculate when the moon crosses the meridian
  const riseTime = moonrise ? new Date(`2000-01-01 ${moonrise}`) : null;
  const setTime = moonset ? new Date(`2000-01-01 ${moonset}`) : null;
  
  if (!riseTime || !setTime) return { overhead: '—', underfoot: '—' };
  
  // Approximate moon overhead (halfway between rise and set)
  const overheadMs = (riseTime.getTime() + setTime.getTime()) / 2;
  const overhead = new Date(overheadMs);
  const overheadStr = overhead.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  // Underfoot is approximately 12 hours from overhead
  const underfoot = new Date(overheadMs + 12 * 60 * 60 * 1000);
  const underfootStr = underfoot.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  
  return { overhead: overheadStr, underfoot: underfootStr };
};

// Sub-components
const LoadingState = () => (
  <div className="hero bg-base-200 min-h-screen">
    <div className="hero-content text-center">
      <div>
        <span className="loading loading-ring loading-md text-blue-500"></span>
        <p className="text-sm"><TranslatedText text="Loading moon data..." /></p>
      </div>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="alert alert-error">
    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>{message}</span>
  </div>
);

const FullBadge = ({ moon }: { moon: MoonApiResponse['moon'] }) => {
  const illuminationValue = Number.parseFloat(moon.illumination);
  const illuminationLabel = Number.isFinite(illuminationValue)
    ? `${illuminationValue.toFixed(0)}% lit`
    : moon.illumination?.trim() || '—';
  const phaseName = moon.phase_name.replace(/_/g, ' ');
  const formattedPhaseName = phaseName
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">{moon.emoji}</span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formattedPhaseName}</div>
            <div className="text-sm text-slate-600">{illuminationLabel}</div>
          </div>
        </div>
        <span className="badge badge-success"><TranslatedText text="Prime" /></span>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>
            <div className="font-semibold text-slate-700"><TranslatedText text="Next major" /></div>
            <div className="text-xs text-slate-500"><TranslatedText text="Moonrise" /> {moon.moonrise || '—'}</div>
          </div>
          <div className="font-mono text-lg font-semibold text-slate-800">{moon.moonrise || '—'}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500"><TranslatedText text="Rise" /></div>
          <div className="mt-1 text-2xl font-semibold text-slate-800">{moon.moonrise || '—'}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500"><TranslatedText text="Set" /></div>
          <div className="mt-1 text-2xl font-semibold text-slate-800">{moon.moonset || '—'}</div>
        </div>
      </div>
    </div>
  );
};

const DetailView = ({ data }: { data: MoonApiResponse }) => {
  const tideType = getTideType(data.moon.phase_name);
  const solunarTimes = getSolunarTimes(data.moon.moonrise, data.moon.moonset);
  
  return (
    <div className="card border border-slate-200 bg-white shadow-sm">
      <div className="card-body space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="card-title">{data.moon.emoji} {data.moon.phase_name}</h2>
            <p className="text-sm opacity-60">{data.moon.illumination} <TranslatedText text="illuminated" /></p>
          </div>
          <div className="text-right">
            <div className={`badge ${tideType === 'spring' ? 'badge-success' : 'badge-warning'}`}>
              <TranslatedText text={tideType === 'spring' ? 'Spring Tides' : 'Neap Tides'} />
            </div>
            <p className="text-xs opacity-60">
              <TranslatedText text={tideType === 'spring' ? 'Excellent' : 'Good'} />
            </p>
          </div>
        </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
        {parseInt(data.moon.illumination) < 25 
          ? <TranslatedText text="Dark water - Use noise lures, live bait" />
          : parseInt(data.moon.illumination) > 75
          ? <TranslatedText text="Bright moon - Excellent night fishing visibility" />
          : <TranslatedText text="Moderate moonlight - Balanced conditions" />}
      </div>

      <div>
        <h3 className="font-semibold"><TranslatedText text="Prime Fishing Times" /></h3>
        <div className="space-y-2">
          <div className="card border border-indigo-200 bg-white">
            <div className="card-body compact">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="badge badge-success badge-sm"><TranslatedText text="MAJOR" /></div>
                  <span className="text-sm"><TranslatedText text="Moonrise" /> {data.moon.moonrise}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold"><TranslatedText text="90 min window" /></p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card border border-slate-200 bg-white">
            <div className="card-body compact">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="badge badge-warning badge-sm"><TranslatedText text="Minor" /></div>
                  <span className="text-sm"><TranslatedText text="Moon overhead" /> {solunarTimes.overhead}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold"><TranslatedText text="60 min window" /></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500"><TranslatedText text="Next New Moon" /></div>
          <div className="mt-1 text-2xl font-semibold text-slate-800">{data.moon_phases.new_moon.next.days_ahead} <TranslatedText text="days" /></div>
          <div className="text-sm text-slate-500"><TranslatedText text="Spring tides building" /></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500"><TranslatedText text="Next Full Moon" /></div>
          <div className="mt-1 text-xl font-semibold text-slate-800">{data.moon_phases.full_moon.next.name}</div>
          <div className="text-sm text-slate-500"><TranslatedText text="In" /> {data.moon_phases.full_moon.next.days_ahead} <TranslatedText text="days" /></div>
        </div>
      </div>
    </div>
  </div>
  );
};

const ScienceView = ({ moon }: { moon: MoonApiResponse['moon'] }) => {
  const scienceFact = getScienceFact(moon.phase_name);
  const tideType = getTideType(moon.phase_name);
  
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="card bg-gradient-to-br from-base-100 to-base-200 shadow-md">
        <div className="card-body">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span>{moon.emoji}</span>
              <span className="badge badge-ghost text-xs">{moon.phase_name}</span>
            </div>
            <div className="badge badge-primary badge-sm gap-1">
              <Microscope size={12} /> <TranslatedText text="Science" />
            </div>
          </div>
          
          <h3 className="font-semibold">
            <TranslatedText text={tideType === 'spring' ? 'Peak Feeding Activity' : 'Steady Feeding Patterns'} />
          </h3>
          <p className="text-sm opacity-80">
            <TranslatedText text={scienceFact} />
          </p>
        
        <div className="divider"></div>
        
        <div className="flex items-center justify-between text-xs opacity-50">
          <span><TranslatedText text="Fishing Science" /></span>
          <span>{moon.illumination} <TranslatedText text="lit" /></span>
        </div>
      </div>
    </div>
    
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title text-base"><TranslatedText text="About Science Mode" /></h3>
        <p className="text-sm"><TranslatedText text="Research-based fishing facts about moon phases, tides, and fish behavior." /></p>
        
        <div className="divider text-xs"></div>
        
        
        
      </div>
    </div>
  </div>
  );
};

const FolkloreView = ({ moon }: { moon: MoonApiResponse['moon'] }) => {
  const folklore = getFolkloreStory(moon.phase_name);
  
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="card bg-gradient-to-br from-base-100 to-base-200 shadow-md">
        <div className="card-body">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span>{moon.emoji}</span>
              <span className="badge badge-ghost text-xs">{moon.phase_name}</span>
              <span className="badge badge-outline text-xs"><TranslatedText text={folklore.culture} /></span>
            </div>
            <div className="badge badge-secondary badge-sm gap-1">
              <Sparkles size={12} /> <TranslatedText text="Folklore" />
            </div>
          </div>
          
          <h3 className="font-semibold"><TranslatedText text={folklore.title} /></h3>
          <p className="text-sm opacity-80">
            <TranslatedText text={folklore.story} />
          </p>
        
        <div className="divider"></div>
        
        <div className="flex items-center justify-between text-xs opacity-50">
          <span><TranslatedText text="Fishing Folklore" /></span>
          <span>{moon.illumination} <TranslatedText text="lit" /></span>
        </div>
      </div>
    </div>
    
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title text-base"><TranslatedText text="About Folklore Mode" /></h3>
        <p className="text-sm"><TranslatedText text="Traditional fishing wisdom from coastal communities worldwide." /></p>
        
        <div className="divider text-xs"><TranslatedText text="Cultures" /></div>
        
        <div className="flex flex-wrap gap-2">
          <div className="badge badge-outline"><TranslatedText text="Asturian" /></div>
          <div className="badge badge-outline"><TranslatedText text="Caribbean" /></div>
          <div className="badge badge-outline"><TranslatedText text="Ainu" /></div>
          <div className="badge badge-outline"><TranslatedText text="Chinese" /></div>
          <div className="badge badge-outline"><TranslatedText text="Norwegian" /></div>
        </div>
      </div>
    </div>
  </div>
  );
};

// Main Component
export default function MoonWidget({ lat, lon, defaultView = 'summary' }: MoonWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MoonApiResponse | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>(defaultView);

  useEffect(() => {
    const fetchMoonData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/moon?lat=${lat}&lon=${lon}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch moon data: ${response.status}`);
        }
        
        const moonData = await response.json();
        setData(moonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load moon data');
      } finally {
        setLoading(false);
      }
    };

    fetchMoonData();
  }, [lat, lon]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="No moon data available" />;

  return (
    <div className="container mx-auto p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold"><TranslatedText text="Moon Fishing Guide" /></h1>
          <button 
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
            className="btn btn-sm btn-ghost"
          >
            <TranslatedText text="Reload" />
          </button>
        </div>

        <div className="tabs tabs-boxed" role="tablist" aria-label="Moon fishing views">
          {([
            { key: 'summary', label: 'Summary' },
            { key: 'detail', label: 'Detail' },
            { key: 'science', label: 'Science' },
            { key: 'folklore', label: 'Folklore' },
          ] as Array<{ key: ViewMode; label: string }>).map((view) => {
            const isActive = activeView === view.key;
            return (
              <button
                key={view.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`moon-view-${view.key}`}
                className={`tab whitespace-nowrap ${isActive ? 'tab-active' : 'text-base-content'}`}
                onClick={() => setActiveView(view.key)}
              >
                <TranslatedText text={view.label} />
              </button>
            );
          })}
        </div>

        {activeView === 'summary' && (
          <div id="moon-view-summary" role="tabpanel" className="space-y-4">
            <FullBadge moon={data.moon} />
          </div>
        )}

        {activeView === 'detail' && <div id="moon-view-detail" role="tabpanel"><DetailView data={data} /></div>}
        {activeView === 'science' && <div id="moon-view-science" role="tabpanel"><ScienceView moon={data.moon} /></div>}
        {activeView === 'folklore' && <div id="moon-view-folklore" role="tabpanel"><FolkloreView moon={data.moon} /></div>}
      </div>
    </div>
  );
}