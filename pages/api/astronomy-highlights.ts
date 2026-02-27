// Enhanced WotNow Astronomy Integration
// Integrates with existing API patterns to provide astronomy highlights
// Note: Open-Meteo requires **no API key**; OpenWeather still uses NEXT_PUBLIC_OPENWEATHER_KEY.
// Flow: Try Open-Meteo astronomy → normalise → if unavailable, fall back to OpenWeather daily and derive illumination.

import type { NextApiRequest, NextApiResponse } from 'next';
import { monitoredFetch } from '../../lib/monitoring/weatherMetrics';
// Simple in-memory daily cache for OpenWeather data (per lat/lon)
// In-memory cache for OpenWeather daily forecast (per lat/lon)
const openWeatherDailyCache: {
  [key: string]: {
    days: unknown[];
    timestamp: number;
  };
} = {};

// Types matching WotNow's existing patterns
interface AstronomyHighlight {
  date: string;
  dayName: string;
  isToday: boolean;
  sun: {
    sunrise?: string;
    sunset?: string;
  };
  moon: {
    rise?: string;
    set?: string;
    phaseName: string;
    illumination: number;
    icon: string;
    riseIcon?: string;
    setIcon?: string;
  };
  darkWindow?: DarkWindow;
  events: SpecialEvent[];
  wotnowMessage: string;
}

interface DarkWindow {
  start: string;
  end: string;
  durationHours: number;
}

// Minimal shape of Open-Meteo astronomy daily record (fields we read)
interface OpenMeteoAstronomyDay {
  date: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  moonphase?: number; // degrees 0–360
  moonillumination?: number; // percent
}

interface SpecialEvent {
  type: 'meteor_shower' | 'moon_event' | 'seasonal' | 'planet';
  name: string;
  description: string;
  visibility: 'excellent' | 'good' | 'fair' | 'poor';
  activitySuggestion?: string;
  bestTime?: string;
  direction?: string;
}

class WotNowAstronomyAPI {
  private stormglassKey: string;
  private openweatherKey: string;

  constructor() {
    this.stormglassKey = process.env.STORMGLASS_SECRET_KEY || '';
    this.openweatherKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY || '';
  }

  // Canonical moon phase mapping from phase angle (deg) with small tolerance
  private phaseFromDegrees(deg?: number) {
    const d = typeof deg === 'number' ? ((deg % 360) + 360) % 360 : 0;
    const T = 5; // tolerance in degrees around quarters/full/new
    let name = 'Waning Crescent';
    let icon = 'moon-waning-crescent.svg';

    if (d <= T || d >= 360 - T) { name = 'New Moon'; icon = 'moon-new.svg'; }
    else if (d < 90 - T) { name = 'Waxing Crescent'; icon = 'moon-waxing-crescent.svg'; }
    else if (d <= 90 + T) { name = 'First Quarter'; icon = 'moon-first-quarter.svg'; }
    else if (d < 180 - T) { name = 'Waxing Gibbous'; icon = 'moon-waxing-gibbous.svg'; }
    else if (d <= 180 + T) { name = 'Full Moon'; icon = 'moon-full.svg'; }
    else if (d < 270 - T) { name = 'Waning Gibbous'; icon = 'moon-waning-gibbous.svg'; }
    else if (d <= 270 + T) { name = 'Last Quarter'; icon = 'moon-last-quarter.svg'; }
    else { name = 'Waning Crescent'; icon = 'moon-waning-crescent.svg'; }

    return { name, icon } as const;
  }

  // Use Open-Meteo astronomy API
  async fetchOpenMeteoAstronomy(lat: number, lon: number, startDate: string, endDate: string) {
    // Open-Meteo API: https://api.open-meteo.com/v1/astronomy?latitude=...&longitude=...&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&timezone=auto
    const url = new URL('https://api.open-meteo.com/v1/astronomy');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date', endDate);
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('daily', 'sunrise,sunset,moonrise,moonset,moon_phase,moon_illumination');

    try {
      const requestUrl = url.toString();
      const response = await monitoredFetch(
        'open-meteo',
        'astronomy',
        requestUrl,
        undefined,
        JSON.stringify({ startDate, endDate })
      );
      if (!response.ok) {
        const text = await response.text();
        console.error(`[Open-Meteo] Astronomy API error: status=${response.status}, url=${requestUrl}, body=${text}`);
        // If 404, return empty astronomy array for fallback
        if (response.status === 404) {
          return { astronomy: [] as unknown[] };
        }
        throw new Error(`Open-Meteo astronomy error: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('[Open-Meteo] Astronomy API fetch failed:', err);
      // On network error, return empty astronomy array for fallback
      return { astronomy: [] as unknown[] };
    }
  }

  // Use existing WotNow pattern for OpenWeather
  // Fetch and cache OpenWeather daily forecast (One Call API)
  async fetchOpenWeatherDaily(lat: number, lon: number) {
    if (!this.openweatherKey) {
      throw new Error('Missing NEXT_PUBLIC_OPENWEATHER_KEY');
    }
    const cacheKey = `${lat},${lon}`;
    const cached = openWeatherDailyCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < 3 * 60 * 60 * 1000) && Array.isArray(cached.days) && cached.days.length >= 2) {
      return cached.days as Array<{
        dt: number;
        sunrise?: number;
        sunset?: number;
        moonrise?: number;
        moonset?: number;
        moon_phase?: number;
        temp?: Record<string, unknown>;
        weather?: unknown[];
        timezone_offset?: number;
      }>;
    }
    // Fetch daily forecast (One Call API)
    const { getOneCallData } = await import('@/lib/services/weatherService');
    console.log('[WotNowAstronomyAPI] Using OpenWeather API key:', this.openweatherKey);
    console.log('[WotNowAstronomyAPI] Cache key:', cacheKey);
    console.log('[WotNowAstronomyAPI] Cache contents before:', openWeatherDailyCache[cacheKey]);
    const result = await getOneCallData({ lat, lon, apiKey: this.openweatherKey, options: { exclude: 'minutely,hourly,current,alerts' } });
    console.log('[WotNowAstronomyAPI] getOneCallData result:', result);
    const resultData = result as { data?: { daily?: unknown[]; timezone_offset?: number } };
    const topLevelOffset = resultData.data?.timezone_offset ?? 0;
    let days = resultData.data?.daily;
    console.log('[WotNowAstronomyAPI] OpenWeather One Call daily response:', days);
    if (!Array.isArray(days) || days.length < 2) {
      // Fallback: create mock days if missing or incomplete
      const today = new Date();
      days = [
        {
          dt: Math.floor(today.getTime() / 1000),
          sunrise: undefined,
          sunset: undefined,
          moonrise: undefined,
          moonset: undefined,
          moon_phase: 0.5,
          temp: {},
          weather: [],
          timezone_offset: 0
        },
        {
          dt: Math.floor(today.getTime() / 1000) + 86400,
          sunrise: undefined,
          sunset: undefined,
          moonrise: undefined,
          moonset: undefined,
          moon_phase: 0.5,
          temp: {},
          weather: [],
          timezone_offset: 0
        }
      ];
      console.warn('[WotNowAstronomyAPI] OpenWeather daily data missing or incomplete, using mock days.');
    } else {
      // Inject top-level timezone_offset into each daily object —
      // OpenWeather puts timezone_offset at the response root, not on individual days
      for (const day of days) {
        if (typeof day === 'object' && day !== null && !('timezone_offset' in (day as Record<string, unknown>))) {
          (day as Record<string, unknown>).timezone_offset = topLevelOffset;
        }
      }
    }
    openWeatherDailyCache[cacheKey] = { days, timestamp: Date.now() };
    console.log('[WotNowAstronomyAPI] Cache contents after:', openWeatherDailyCache[cacheKey]);
    return days as Array<{
      dt: number;
      sunrise?: number;
      sunset?: number;
      moonrise?: number;
      moonset?: number;
      moon_phase?: number;
      temp?: Record<string, unknown>;
      weather?: unknown[];
      timezone_offset?: number;
    }>;
  }

  // Moon phase icons matching WotNow's available assets
  getMoonPhaseIcon(phaseFraction: number): string {
    // New Moon: very narrow range near 0 or 1
    if (phaseFraction < 0.02 || phaseFraction > 0.98) return 'moon-new.svg';
    if (phaseFraction < 0.24) return 'moon-waxing-crescent.svg';
    if (phaseFraction < 0.26) return 'moon-first-quarter.svg';
    if (phaseFraction < 0.48) return 'moon-waxing-gibbous.svg';
    if (phaseFraction < 0.52) return 'moon-full.svg';
    if (phaseFraction < 0.74) return 'moon-waning-gibbous.svg';
    if (phaseFraction < 0.76) return 'moon-last-quarter.svg';
    if (phaseFraction <= 0.98) return 'moon-waning-crescent.svg';
    return 'moon-new.svg';
  }

  getMoonPhaseName(phaseFraction: number): string {
    // New Moon: very narrow range near 0 or 1
    if (phaseFraction < 0.02 || phaseFraction > 0.98) return 'New Moon';
    if (phaseFraction < 0.24) return 'Waxing Crescent';
    if (phaseFraction < 0.26) return 'First Quarter';
    if (phaseFraction < 0.48) return 'Waxing Gibbous';
    if (phaseFraction < 0.52) return 'Full Moon';
    if (phaseFraction < 0.74) return 'Waning Gibbous';
    if (phaseFraction < 0.76) return 'Last Quarter';
    if (phaseFraction <= 0.98) return 'Waning Crescent';
    return 'New Moon';
  }

  // Detect special astronomical events for WotNow activity suggestions
  detectSpecialEvents(date: Date, moonPhase: number, moonIllumination: number): SpecialEvent[] {
    const events: SpecialEvent[] = [];
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Major meteor showers
    if (month === 8 && day >= 10 && day <= 15) {
      events.push({
        type: 'meteor_shower',
        name: 'Perseid Meteor Shower',
        description: 'Peak viewing after midnight, look northeast',
        visibility: moonIllumination < 30 ? 'excellent' : 'fair',
        activitySuggestion: 'meteor watching',
        bestTime: '00:00-04:00',
        direction: 'northeast'
      });
    }

    if (month === 12 && day >= 10 && day <= 15) {
      events.push({
        type: 'meteor_shower',
        name: 'Geminid Meteor Shower',
        description: 'Best meteor shower of the year, look east after 22:00',
        visibility: moonIllumination < 30 ? 'excellent' : 'good',
        activitySuggestion: 'meteor watching',
        bestTime: '22:00-06:00',
        direction: 'east'
      });
    }

    // Moon phase events
    if (moonIllumination > 95) {
      events.push({
        type: 'moon_event',
        name: 'Full Moon',
        description: 'Bright moonlight perfect for night strolls and lunar photography',
        visibility: 'excellent',
        activitySuggestion: 'moonlight hiking',
        bestTime: 'all night'
      });
    } else if (moonIllumination < 5) {
      events.push({
        type: 'moon_event',
        name: 'New Moon',
        description: 'Perfect conditions for deep space observation and Milky Way photography',
        visibility: 'excellent',
        activitySuggestion: 'astrophotography',
        bestTime: 'all night'
      });
    }

    // Seasonal highlights
    if (month >= 6 && month <= 8) {
      events.push({
        type: 'seasonal',
        name: 'Summer Milky Way',
        description: 'Best viewing 2-4 hours after sunset, look south',
        visibility: moonIllumination < 30 ? 'excellent' : 'fair',
        activitySuggestion: 'milky way photography',
        bestTime: '22:00-02:00',
        direction: 'south'
      });
    }

    return events;
  }

  // Format times to local display format (HH:MM)
  formatTimeLocal(utcTime: string | undefined, timezoneOffset: number = 0): string | undefined {
    if (!utcTime) return undefined;
    
    try {
      const dt = new Date(utcTime);
      const localTime = new Date(dt.getTime() + (timezoneOffset * 1000));
      return localTime.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return undefined;
    }
  }

  // Calculate optimal dark sky viewing window
  calculateDarkWindow(sunset?: string, sunrise?: string): DarkWindow | undefined {
    if (!sunset || !sunrise) return undefined;

    try {
      const sunsetTime = new Date(sunset);
      const sunriseTime = new Date(sunrise);
      
      // Add civil twilight buffer (30 minutes)
      const darkStart = new Date(sunsetTime.getTime() + 30 * 60 * 1000);
      let darkEnd = new Date(sunriseTime.getTime() - 30 * 60 * 1000);
      
      // Handle day transitions
      if (darkEnd < darkStart) {
        darkEnd = new Date(darkEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      
      const durationHours = (darkEnd.getTime() - darkStart.getTime()) / (1000 * 60 * 60);
      
      return {
        start: darkStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        end: darkEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        durationHours: Math.round(durationHours * 10) / 10
      };
    } catch {
      return undefined;
    }
  }

  // Generate WotNow-style formatted message
  generateWotNowMessage(
    date: Date, 
    moonIllumination: number, 
    moonSet?: string, 
    darkWindow?: DarkWindow, 
    events: SpecialEvent[] = []
  ): string {
    const lines: string[] = [];
    
    // Date header
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) {
      lines.push('📅 Tonight in your area');
    } else if (isTomorrow) {
      lines.push('📅 Tomorrow night');
    } else {
      lines.push(`📅 ${date.toLocaleDateString('en-US', { weekday: 'long' })}`);
    }
    
    // Moon conditions
    if (moonIllumination < 25 && moonSet) {
      lines.push(`🌙 Moon sets early (${moonSet}) - Dark skies ahead!`);
    } else if (moonIllumination > 80) {
      lines.push(`🌕 Bright moon (${Math.round(moonIllumination)}% illuminated) - Great for night activities!`);
    } else {
      lines.push(`🌙 Moon ${Math.round(moonIllumination)}% illuminated`);
    }
    
    // Dark viewing window
    if (darkWindow && darkWindow.durationHours > 6) {
      lines.push(`⭐ Stargazing window: ${darkWindow.start} - ${darkWindow.end}`);
    }
    
    // Activity suggestions
    const activities: string[] = [];
    if (moonIllumination < 30) {
      activities.push('Milky Way photography', 'meteor watching');
    }
    if (moonIllumination > 70) {
      activities.push('moonlight hiking', 'lunar photography');
    }
    
    // Special events
    const meteorEvents = events.filter(e => e.type === 'meteor_shower');
    if (meteorEvents.length > 0) {
      const event = meteorEvents[0];
      lines.push(`☄️ ${event.name} continues. Best seen around midnight`);
      if (!activities.includes('meteor watching')) {
        activities.push('meteor watching');
      }
    }
    
    if (activities.length > 0) {
      lines.push(`🔭 Perfect for: ${activities.join(', ')}`);
    }
    
    return lines.join('\n');
  }

  // Main method to generate highlights
  async generateHighlights(lat: number, lon: number, days: number = 7): Promise<{ highlights: AstronomyHighlight[] }> {
    // Clamp days to max 14
    const numDays = Math.max(1, Math.min(days, 14));
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (numDays - 1) * 24 * 60 * 60 * 1000);

    // Try Open-Meteo first
    const astronomyData = await this.fetchOpenMeteoAstronomy(
      lat,
      lon,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    // If Open-Meteo succeeded, normalise its data
    if (astronomyData && Array.isArray((astronomyData as { astronomy?: unknown[] }).astronomy) && (astronomyData as { astronomy: unknown[] }).astronomy.length > 0) {
      // Fetch OpenWeather daily for iteration bounds
      const dailyWeather = await this.fetchOpenWeatherDaily(lat, lon);
      const highlights: AstronomyHighlight[] = [];
      const astronomyArray = (astronomyData as { astronomy: OpenMeteoAstronomyDay[] }).astronomy;
      for (let i = 0; i < numDays && i < astronomyArray.length && i < dailyWeather.length; i++) {
        const dayData = astronomyArray[i];
        const date = new Date(dayData.date);
        const sunrise = dayData.sunrise;
        const sunset = dayData.sunset;
        const moonrise = dayData.moonrise;
        const moonset = dayData.moonset;
        const moonPhaseDeg = dayData.moonphase ?? 0; // 0–360°
        const moonIllumination = dayData.moonillumination ?? 0; // %
        // Canonical phase mapping
        const { name: moonPhaseName, icon: moonIcon } = this.phaseFromDegrees(moonPhaseDeg);
        // Calculate dark window
        const darkWindow = this.calculateDarkWindow(sunset, sunrise);
        // Detect special events
        const events = this.detectSpecialEvents(date, moonPhaseDeg / 360, moonIllumination);
        // Format times — Open-Meteo with timezone=auto already returns local times,
        // so pass offset=0 to avoid double-applying the timezone shift
        const sunriseLocal = this.formatTimeLocal(sunrise, 0);
        const sunsetLocal = this.formatTimeLocal(sunset, 0);
        const moonriseLocal = this.formatTimeLocal(moonrise, 0);
        const moonsetLocal = this.formatTimeLocal(moonset, 0);
        // Generate WotNow message
        const wotnowMessage = this.generateWotNowMessage(
          date, moonIllumination, moonsetLocal, darkWindow, events
        );
        highlights.push({
          date: date.toISOString().split('T')[0],
          dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
          isToday: i === 0,
          sun: {
            sunrise: sunriseLocal,
            sunset: sunsetLocal,
          },
          moon: {
            rise: moonriseLocal,
            set: moonsetLocal,
            phaseName: moonPhaseName,
            illumination: Math.round(moonIllumination * 10) / 10,
            icon: moonIcon
          },
          darkWindow,
          events,
          wotnowMessage
        });
      }
      return { highlights };
    }

    // Fallback: OpenWeather only (derive illumination and phase)
    const dailyWeather = await this.fetchOpenWeatherDaily(lat, lon);
    const highlights: AstronomyHighlight[] = [];
    for (let i = 0; i < numDays && i < dailyWeather.length; i++) {
      const weatherDay = dailyWeather[i];
      const date = new Date(((weatherDay.dt ?? 0) + (weatherDay.timezone_offset || 0)) * 1000);
      // OpenWeather moon_phase: 0=new, 0.25=first qtr, 0.5=full, 0.75=last qtr
      const phaseFraction = typeof weatherDay.moon_phase === 'number' ? weatherDay.moon_phase : 0;
      // Map to angle (0–360)
      const moonPhaseDeg = phaseFraction * 360;
      // Approximate illumination: 0=new, 0.5=full, 1=new
      const moonIllumination = Math.round(Math.abs(Math.sin(phaseFraction * Math.PI)) * 1000) / 10;
      const { name: moonPhaseName, icon: moonIcon } = this.phaseFromDegrees(moonPhaseDeg);
      // Format times (OpenWeather gives unix seconds)
      const sunrise = weatherDay.sunrise ? new Date(((weatherDay.sunrise ?? 0) + (weatherDay.timezone_offset || 0)) * 1000).toISOString() : undefined;
      const sunset = weatherDay.sunset ? new Date(((weatherDay.sunset ?? 0) + (weatherDay.timezone_offset || 0)) * 1000).toISOString() : undefined;
      const moonrise = weatherDay.moonrise ? new Date(((weatherDay.moonrise ?? 0) + (weatherDay.timezone_offset || 0)) * 1000).toISOString() : undefined;
      const moonset = weatherDay.moonset ? new Date(((weatherDay.moonset ?? 0) + (weatherDay.timezone_offset || 0)) * 1000).toISOString() : undefined;
      const sunriseLocal = this.formatTimeLocal(sunrise, 0);
      const sunsetLocal = this.formatTimeLocal(sunset, 0);
      const moonriseLocal = this.formatTimeLocal(moonrise, 0);
      const moonsetLocal = this.formatTimeLocal(moonset, 0);
      // Calculate dark window
      const darkWindow = this.calculateDarkWindow(sunset, sunrise);
      // Detect special events
      const events = this.detectSpecialEvents(date, phaseFraction, moonIllumination);
      // Generate WotNow message
      const wotnowMessage = this.generateWotNowMessage(
        date, moonIllumination, moonsetLocal, darkWindow, events
      );
      highlights.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        isToday: i === 0,
        sun: {
          sunrise: sunriseLocal,
          sunset: sunsetLocal,
        },
        moon: {
          rise: moonriseLocal,
          set: moonsetLocal,
          phaseName: moonPhaseName,
          illumination: Math.round(moonIllumination * 10) / 10,
          icon: moonIcon,
          // Add moonrise and moonset icons for frontend
          riseIcon: 'moonrise.svg',
          setIcon: 'moonset.svg'
        },
        darkWindow,
        events,
        wotnowMessage
      });
    }
    return { highlights };
  }
}

// Next.js API route handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon, days = 7 } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat/lon parameters' });
  }
  
  try {
    // Input validation with more specific error messages
    if (isNaN(parseFloat(lat as string))) {
      return res.status(400).json({ error: 'Invalid latitude value' });
    }
    if (isNaN(parseFloat(lon as string))) {
      return res.status(400).json({ error: 'Invalid longitude value' });
    }
    
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    
    // Additional range validation
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'Latitude must be between -90 and 90 degrees' });
    }
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Longitude must be between -180 and 180 degrees' });
    }
    
    let numDays = parseInt(days as string) || 3; // Default to 3 days if parsing fails
    // Clamp to max 14 days
    numDays = Math.max(1, Math.min(numDays, 14));

    const api = new WotNowAstronomyAPI();
    console.log(`Fetching astronomy data for lat: ${latitude}, lon: ${longitude}, days: ${numDays}`);
    
    const result = await api.generateHighlights(latitude, longitude, numDays);
    
    // Validate result structure before returning
    if (!result || !Array.isArray(result.highlights)) {
      console.error('Invalid result structure from WotNowAstronomyAPI:', result);
      return res.status(500).json({ 
        error: 'Astronomy API returned invalid data structure',
        details: 'Expected highlights array is missing or invalid'
      });
    }
    
    if (result.highlights.length === 0) {
      console.warn('No astronomy highlights generated for the requested location and days');
    }

    res.status(200).json(result);
  } catch (error: unknown) {
    // Enhanced error logging with more context
    const err = error as { message?: string; stack?: string } | undefined;
    console.error('Astronomy highlights error:', {
      message: err?.message || 'Unknown error',
      stack: err?.stack,
      latitude: lat,
      longitude: lon,
      days: days
    });
    
    // More detailed error response to help with debugging
    res.status(500).json({ 
      error: 'Failed to fetch astronomy highlights',
      message: err?.message || 'Internal server error',
      requestParams: { lat, lon, days }
    });
  }
}

// Example usage in a React component:
/*
const AstronomyCard = ({ location }) => {
  const [highlights, setHighlights] = useState([]);
  
  useEffect(() => {
    if (location?.lat && location?.lon) {
      fetch(`/api/astronomy-highlights?lat=${location.lat}&lon=${location.lon}&days=3`)
        .then(res => res.json())
        .then(data => setHighlights(data.highlights));
    }
  }, [location]);
  
  if (!highlights.length) return null;
  
  const tonight = highlights[0];
  
  return (
    <div className="astronomy-card">
      <div className="astronomy-message">
        {tonight.wotnowMessage.split('\n').map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      
      <div className="moon-info">
        <img 
          src={`/weather-icons/design/fill/final/${tonight.moon.icon}`} 
          alt={tonight.moon.phaseName}
          className="moon-icon"
        />
        <div>
          <div>{tonight.moon.phaseName}</div>
          <div>{tonight.moon.illumination}% illuminated</div>
          {tonight.moon.set && <div>Sets at {tonight.moon.set}</div>}
        </div>
      </div>
      
      <div className="sun-times">
        🌅 Sunrise: {tonight.sun.sunrise} | 🌇 Sunset: {tonight.sun.sunset}
      </div>
      
      {tonight.events.length > 0 && (
        <div className="special-events">
          {tonight.events.map((event, i) => (
            <div key={i} className="event">
              <strong>{event.name}</strong>: {event.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
*/
