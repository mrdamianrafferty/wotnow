import type { NextApiRequest, NextApiResponse } from 'next';
import { getMoonTimes, getTimes } from 'suncalc';
import { getMoonSunData } from '../../lib/astro/moonService';

// Helper: Get moon emoji based on phase fraction
function getMoonEmoji(phaseFraction: number): string {
  if (phaseFraction < 0.03 || phaseFraction > 0.97) return '🌑'; // New
  if (phaseFraction < 0.22) return '🌒'; // Waxing Crescent
  if (phaseFraction < 0.28) return '🌓'; // First Quarter
  if (phaseFraction < 0.47) return '🌔'; // Waxing Gibbous
  if (phaseFraction < 0.53) return '🌕'; // Full
  if (phaseFraction < 0.72) return '🌖'; // Waning Gibbous
  if (phaseFraction < 0.78) return '🌗'; // Last Quarter
  return '🌘'; // Waning Crescent
}

// Helper: Calculate moon age in days
function getMoonAge(phaseFraction: number): number {
  return Math.round(phaseFraction * 29.53059);
}

// Helper: Get moon stage
function getMoonStage(phaseFraction: number): string {
  if (phaseFraction < 0.5) return 'waxing';
  return 'waning';
}

// Helper: Calculate lunar cycle percentage
function getLunarCycle(phaseFraction: number): string {
  return `${Math.round(phaseFraction * 100)}%`;
}

// Helper: Format time as HH:MM
function formatTimeHHMM(isoString: string | null): string {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

// Helper: Get Unix timestamp
function getUnixTimestamp(isoString: string | null): number {
  if (!isoString) return 0;
  return Math.floor(new Date(isoString).getTime() / 1000);
}

function formatDayLength(minutes?: number): string {
  if (minutes == null || Number.isNaN(minutes)) return '--:--';
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const hh = hours.toString().padStart(2, '0');
  const mm = mins.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function estimatePhaseFraction(date: Date): number {
  const synodic = 29.530588;
  const epoch = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - epoch) / (1000 * 60 * 60 * 24);
  const phase = ((days % synodic) + synodic) % synodic;
  return Number((phase / synodic).toFixed(4));
}

function calcIlluminationPct(fraction: number): number {
  const pct = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  return Math.round(pct * 100);
}

function getPhaseNameFromFraction(fraction: number): string {
  const f = (fraction + 1) % 1;
  if (f < 0.03 || f > 0.97) return 'New Moon';
  if (f < 0.22) return 'Waxing Crescent';
  if (f < 0.28) return 'First Quarter';
  if (f < 0.47) return 'Waxing Gibbous';
  if (f < 0.53) return 'Full Moon';
  if (f < 0.72) return 'Waning Gibbous';
  if (f < 0.78) return 'Last Quarter';
  return 'Waning Crescent';
}

function toIsoOrNull(date?: Date | null): string | null {
  if (!date) return null;
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
}

function buildFallbackMoonResponse(lat: number, lon: number, reason: string) {
  const now = new Date();
  const phaseFraction = estimatePhaseFraction(now);
  const phases = calculatePhaseDates(now, phaseFraction);
  const illuminationPct = calcIlluminationPct(phaseFraction);
  const moonTimes = getMoonTimes(now, lat, lon, true);
  const sunTimes = getTimes(now, lat, lon);

  const sunriseIso = toIsoOrNull(sunTimes.sunrise ?? null);
  const sunsetIso = toIsoOrNull(sunTimes.sunset ?? null);
  const moonriseIso = toIsoOrNull(moonTimes.rise ?? null);
  const moonsetIso = toIsoOrNull(moonTimes.set ?? null);

  const dayLengthMinutes =
    sunriseIso && sunsetIso
      ? Math.round((new Date(sunsetIso).getTime() - new Date(sunriseIso).getTime()) / (1000 * 60))
      : undefined;

  const nextFull = getFullMoonName(phases.full_moon.next);
  const lastFull = getFullMoonName(phases.full_moon.last);

  return {
    timestamp: Math.floor(now.getTime() / 1000),
    datestamp: now.toUTCString(),
    sun: {
      sunrise: getUnixTimestamp(sunriseIso),
      sunrise_timestamp: formatTimeHHMM(sunriseIso),
      sunset: getUnixTimestamp(sunsetIso),
      sunset_timestamp: formatTimeHHMM(sunsetIso),
      solar_noon: '--:--',
      day_length: formatDayLength(dayLengthMinutes),
      sun_altitude: 0,
      sun_distance: 0,
      sun_azimuth: 0,
    },
    moon: {
      phase: phaseFraction,
      phase_name: getPhaseNameFromFraction(phaseFraction),
      stage: getMoonStage(phaseFraction),
      illumination: `${illuminationPct}%`,
      age_days: getMoonAge(phaseFraction),
      lunar_cycle: getLunarCycle(phaseFraction),
      emoji: getMoonEmoji(phaseFraction),
      zodiac: {
        sun_sign: '',
        moon_sign: '',
      },
      moonrise: formatTimeHHMM(moonriseIso),
      moonrise_timestamp: getUnixTimestamp(moonriseIso),
      moonset: formatTimeHHMM(moonsetIso),
      moonset_timestamp: getUnixTimestamp(moonsetIso),
      moon_altitude: 0,
      moon_distance: 0,
      moon_azimuth: 0,
      moon_parallactic_angle: 0,
    },
    moon_phases: {
      new_moon: {
        last: {
          timestamp: Math.floor(phases.new_moon.last.getTime() / 1000),
          datestamp: phases.new_moon.last.toUTCString(),
          days_ago: daysBetween(phases.new_moon.last, now),
        },
        next: {
          timestamp: Math.floor(phases.new_moon.next.getTime() / 1000),
          datestamp: phases.new_moon.next.toUTCString(),
          days_ahead: daysBetween(now, phases.new_moon.next),
        },
      },
      first_quarter: {
        last: {
          timestamp: Math.floor(phases.first_quarter.last.getTime() / 1000),
          datestamp: phases.first_quarter.last.toUTCString(),
          days_ago: daysBetween(phases.first_quarter.last, now),
        },
        next: {
          timestamp: Math.floor(phases.first_quarter.next.getTime() / 1000),
          datestamp: phases.first_quarter.next.toUTCString(),
          days_ahead: daysBetween(now, phases.first_quarter.next),
        },
      },
      full_moon: {
        last: {
          timestamp: Math.floor(phases.full_moon.last.getTime() / 1000),
          datestamp: phases.full_moon.last.toUTCString(),
          days_ago: daysBetween(phases.full_moon.last, now),
          name: lastFull.name,
          description: lastFull.description,
        },
        next: {
          timestamp: Math.floor(phases.full_moon.next.getTime() / 1000),
          datestamp: phases.full_moon.next.toUTCString(),
          days_ahead: daysBetween(now, phases.full_moon.next),
          name: nextFull.name,
          description: nextFull.description,
        },
      },
      last_quarter: {
        last: {
          timestamp: Math.floor(phases.last_quarter.last.getTime() / 1000),
          datestamp: phases.last_quarter.last.toUTCString(),
          days_ago: daysBetween(phases.last_quarter.last, now),
        },
        next: {
          timestamp: Math.floor(phases.last_quarter.next.getTime() / 1000),
          datestamp: phases.last_quarter.next.toUTCString(),
          days_ahead: daysBetween(now, phases.last_quarter.next),
        },
      },
    },
    location: {
      latitude: lat,
      longitude: lon,
    },
    meta: {
      source: 'fallback',
      reason,
      algorithm: 'suncalc',
    },
  } as const;
}

// Helper: Calculate days between dates
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Helper: Calculate next/last phase dates based on phase fraction
function calculatePhaseDates(currentDate: Date, currentFraction: number) {
  const synodicMonth = 29.53059;
  
  // Calculate days to each phase (0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter)
  function daysToPhase(targetFraction: number): number {
    let diff = targetFraction - currentFraction;
    if (diff < 0) diff += 1;
    return Math.round(diff * synodicMonth);
  }
  
  function daysFromPhase(targetFraction: number): number {
    let diff = currentFraction - targetFraction;
    if (diff < 0) diff += 1;
    return Math.round(diff * synodicMonth);
  }
  
  const phases = {
    new_moon: {
      next: new Date(currentDate.getTime() + daysToPhase(0) * 24 * 60 * 60 * 1000),
      last: new Date(currentDate.getTime() - daysFromPhase(0) * 24 * 60 * 60 * 1000),
    },
    first_quarter: {
      next: new Date(currentDate.getTime() + daysToPhase(0.25) * 24 * 60 * 60 * 1000),
      last: new Date(currentDate.getTime() - daysFromPhase(0.25) * 24 * 60 * 60 * 1000),
    },
    full_moon: {
      next: new Date(currentDate.getTime() + daysToPhase(0.5) * 24 * 60 * 60 * 1000),
      last: new Date(currentDate.getTime() - daysFromPhase(0.5) * 24 * 60 * 60 * 1000),
    },
    last_quarter: {
      next: new Date(currentDate.getTime() + daysToPhase(0.75) * 24 * 60 * 60 * 1000),
      last: new Date(currentDate.getTime() - daysFromPhase(0.75) * 24 * 60 * 60 * 1000),
    }
  };
  
  return phases;
}

// Helper: Get full moon name by month
function getFullMoonName(date: Date): { name: string; description: string } {
  const moonNames: Record<number, { name: string; description: string }> = {
    0: { name: 'Wolf Moon', description: 'Named after howling wolves in winter.' },
    1: { name: 'Snow Moon', description: 'Reflects the cold snowy weather of this month.' },
    2: { name: 'Worm Moon', description: 'Indicates the return of earthworms and the beginning of spring.' },
    3: { name: 'Pink Moon', description: 'Named after wild ground phlox, one of the first spring flowers.' },
    4: { name: 'Flower Moon', description: 'Celebrates the abundance of spring blooms.' },
    5: { name: 'Strawberry Moon', description: 'Marks the strawberry harvesting season.' },
    6: { name: 'Buck Moon', description: 'Named for when bucks grow new antlers.' },
    7: { name: 'Sturgeon Moon', description: 'Named after the sturgeon fish abundant in August.' },
    8: { name: 'Harvest Moon', description: 'The full moon closest to the autumn equinox.' },
    9: { name: 'Hunter\'s Moon', description: 'Time to hunt in preparation for winter.' },
    10: { name: 'Beaver Moon', description: 'When beavers finish preparing for winter.' },
    11: { name: 'Cold Moon', description: 'Marks the beginning of winter\'s cold nights.' }
  };
  
  return moonNames[date.getMonth()] || { name: 'Full Moon', description: '' };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const lat = Number.parseFloat(String(req.query.lat ?? ''));
  const lon = Number.parseFloat(String(req.query.lon ?? ''));
  const dateParam = req.query.date ? String(req.query.date) : undefined;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'lat and lon query parameters are required numbers.' });
  }

  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return res.status(400).json({ error: 'date must be provided as YYYY-MM-DD if supplied.' });
  }

  try {
  const data = await getMoonSunData({ lat, lon, date: dateParam });
  const currentDate = new Date(data.localDate);
  const phaseFraction = data.moonPhaseFraction ?? 0;
  const illuminationPct = data.moonIlluminationPct ?? null;
  const phases = calculatePhaseDates(currentDate, phaseFraction);
    
    // Get full moon names
    const nextFullMoonInfo = getFullMoonName(phases.full_moon.next);
    const lastFullMoonInfo = getFullMoonName(phases.full_moon.last);
    
    // Build response matching the schema
    const response = {
      timestamp: Math.floor(currentDate.getTime() / 1000),
      datestamp: currentDate.toUTCString(),
      
      sun: {
        sunrise: getUnixTimestamp(data.sunriseISO ?? null),
        sunrise_timestamp: formatTimeHHMM(data.sunriseISO ?? null),
        sunset: getUnixTimestamp(data.sunsetISO ?? null),
        sunset_timestamp: formatTimeHHMM(data.sunsetISO ?? null),
        solar_noon: '--:--', // Not available from your service
        day_length: formatDayLength(data.dayLengthMinutes),
        sun_altitude: 0, // Not available
        sun_distance: 0, // Not available
        sun_azimuth: 0, // Not available
      },
      
      moon: {
        phase: phaseFraction,
        phase_name: data.moonPhaseName ?? 'Unknown phase',
        stage: data.moonPhaseStage ?? getMoonStage(phaseFraction),
        illumination: illuminationPct != null ? `${illuminationPct}%` : '--%',
        age_days: getMoonAge(phaseFraction),
        lunar_cycle: getLunarCycle(phaseFraction),
        emoji: getMoonEmoji(phaseFraction),
        days_until_next_full_moon: data.daysUntilNextFullMoon ?? null,
        days_until_next_new_moon: data.daysUntilNextNewMoon ?? null,
        zodiac: {
          sun_sign: '', // Not available
          moon_sign: '', // Not available
        },
        moonrise: formatTimeHHMM(data.moonriseISO ?? null),
        moonrise_timestamp: getUnixTimestamp(data.moonriseISO ?? null),
        moonset: formatTimeHHMM(data.moonsetISO ?? null),
        moonset_timestamp: getUnixTimestamp(data.moonsetISO ?? null),
        moon_altitude: 0, // Not available
        moon_distance: 0, // Not available
        moon_azimuth: 0, // Not available
        moon_parallactic_angle: 0, // Not available
      },
      
      moon_phases: {
        new_moon: {
          last: {
            timestamp: Math.floor(phases.new_moon.last.getTime() / 1000),
            datestamp: phases.new_moon.last.toUTCString(),
            days_ago: daysBetween(phases.new_moon.last, currentDate),
          },
          next: {
            timestamp: Math.floor(phases.new_moon.next.getTime() / 1000),
            datestamp: phases.new_moon.next.toUTCString(),
            days_ahead: daysBetween(currentDate, phases.new_moon.next),
          }
        },
        first_quarter: {
          last: {
            timestamp: Math.floor(phases.first_quarter.last.getTime() / 1000),
            datestamp: phases.first_quarter.last.toUTCString(),
            days_ago: daysBetween(phases.first_quarter.last, currentDate),
          },
          next: {
            timestamp: Math.floor(phases.first_quarter.next.getTime() / 1000),
            datestamp: phases.first_quarter.next.toUTCString(),
            days_ahead: daysBetween(currentDate, phases.first_quarter.next),
          }
        },
        full_moon: {
          last: {
            timestamp: Math.floor(phases.full_moon.last.getTime() / 1000),
            datestamp: phases.full_moon.last.toUTCString(),
            days_ago: daysBetween(phases.full_moon.last, currentDate),
            name: lastFullMoonInfo.name,
            description: lastFullMoonInfo.description,
          },
          next: {
            timestamp: Math.floor(phases.full_moon.next.getTime() / 1000),
            datestamp: phases.full_moon.next.toUTCString(),
            days_ahead: daysBetween(currentDate, phases.full_moon.next),
            name: nextFullMoonInfo.name,
            description: nextFullMoonInfo.description,
          }
        },
        last_quarter: {
          last: {
            timestamp: Math.floor(phases.last_quarter.last.getTime() / 1000),
            datestamp: phases.last_quarter.last.toUTCString(),
            days_ago: daysBetween(phases.last_quarter.last, currentDate),
          },
          next: {
            timestamp: Math.floor(phases.last_quarter.next.getTime() / 1000),
            datestamp: phases.last_quarter.next.toUTCString(),
            days_ahead: daysBetween(currentDate, phases.last_quarter.next),
          }
        }
      },
      
      location: {
        latitude: lat,
        longitude: lon,
      },
    };
    
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=43200');
    return res.status(200).json(response);
  } catch (error) {
    const message = (error as Error).message ?? 'Unknown error';
    const isUpstreamAuthIssue = /401/.test(message) || /api key/i.test(message) || /missing/i.test(message);

    if (isUpstreamAuthIssue) {
      console.warn('[api/moon] Upstream moon API unavailable; serving fallback data', message);
      const fallback = buildFallbackMoonResponse(lat, lon, message);
      res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400');
      return res.status(200).json(fallback);
    }

    console.error('[api/moon] Failed to fetch moon data', error);
    return res.status(502).json({
      error: 'Failed to load moon data',
      details: message,
    });
  }
}