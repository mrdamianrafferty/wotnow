// Enhanced WotNow Astronomy Integration
// Integrates with existing API patterns to provide astronomy highlights

import type { NextApiRequest, NextApiResponse } from 'next';

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
  };
  darkWindow?: {
    start: string;
    end: string;
    durationHours: number;
  };
  events: SpecialEvent[];
  wotnowMessage: string;
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

  // Use existing WotNow pattern for Stormglass astronomy
  async fetchStormglassAstronomy(lat: number, lon: number, startDate: string, endDate: string) {
    if (!this.stormglassKey) {
      throw new Error('Missing STORMGLASS_SECRET_KEY');
    }

    const url = new URL('https://api.stormglass.io/v2/astronomy/point');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lng', String(lon));
    url.searchParams.set('start', `${startDate}T00:00:00Z`);
    url.searchParams.set('end', `${endDate}T23:59:59Z`);

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': this.stormglassKey },
    });

    if (!response.ok) {
      throw new Error(`Stormglass astronomy error: ${response.status}`);
    }

    return response.json();
  }

  // Use existing WotNow pattern for OpenWeather
  async fetchOpenWeatherCurrent(lat: number, lon: number) {
    if (!this.openweatherKey) {
      throw new Error('Missing NEXT_PUBLIC_OPENWEATHER_KEY');
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${this.openweatherKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenWeather error: ${response.status}`);
    }

    return response.json();
  }

  // Moon phase icons matching WotNow's available assets
  getMoonPhaseIcon(phaseFraction: number): string {
    if (phaseFraction < 0.05) return 'moon-new.svg';
    if (phaseFraction < 0.2) return 'moon-waxing-crescent.svg';
    if (phaseFraction < 0.3) return 'moon-first-quarter.svg';
    if (phaseFraction < 0.45) return 'moon-waxing-gibbous.svg';
    if (phaseFraction < 0.55) return 'moon-full.svg';
    if (phaseFraction < 0.7) return 'moon-waning-gibbous.svg';
    if (phaseFraction < 0.8) return 'moon-last-quarter.svg';
    if (phaseFraction < 0.95) return 'moon-waning-crescent.svg';
    return 'moon-new.svg';
  }

  getMoonPhaseName(phaseFraction: number): string {
    if (phaseFraction < 0.05) return 'New Moon';
    if (phaseFraction < 0.2) return 'Waxing Crescent';
    if (phaseFraction < 0.3) return 'First Quarter';
    if (phaseFraction < 0.45) return 'Waxing Gibbous';
    if (phaseFraction < 0.55) return 'Full Moon';
    if (phaseFraction < 0.7) return 'Waning Gibbous';
    if (phaseFraction < 0.8) return 'Last Quarter';
    if (phaseFraction < 0.95) return 'Waning Crescent';
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
        name: 'Full Moon Night',
        description: 'Bright moonlight perfect for night hiking and lunar photography',
        visibility: 'excellent',
        activitySuggestion: 'moonlight hiking',
        bestTime: 'all night'
      });
    } else if (moonIllumination < 5) {
      events.push({
        type: 'moon_event',
        name: 'New Moon - Dark Skies',
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
  calculateDarkWindow(sunset?: string, sunrise?: string) {
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
    darkWindow?: any, 
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
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
    
    const [astronomyData, currentWeather] = await Promise.all([
      this.fetchStormglassAstronomy(lat, lon, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]),
      this.fetchOpenWeatherCurrent(lat, lon)
    ]);
    
    const timezoneOffset = currentWeather.timezone || 0;
    const highlights: AstronomyHighlight[] = [];
    
    for (let i = 0; i < days && i < astronomyData.data.length; i++) {
      const dayData = astronomyData.data[i];
      const date = new Date(dayData.time);
      
      // Extract astronomy data
      const sunrise = dayData.sunrise;
      const sunset = dayData.sunset;
      const moonrise = dayData.moonrise;
      const moonset = dayData.moonset;
      const moonPhase = dayData.moonPhase?.value || 0.5;
      
      // Calculate moon illumination (approximate)
      const moonIllumination = moonPhase <= 0.5 
        ? (0.5 - moonPhase) * 200 
        : (moonPhase - 0.5) * 200;
      
      // Get moon phase info
      const moonIcon = this.getMoonPhaseIcon(moonPhase);
      const moonName = this.getMoonPhaseName(moonPhase);
      
      // Calculate dark window
      const darkWindow = this.calculateDarkWindow(sunset, sunrise);
      
      // Detect special events
      const events = this.detectSpecialEvents(date, moonPhase, moonIllumination);
      
      // Format times
      const sunriseLocal = this.formatTimeLocal(sunrise, timezoneOffset);
      const sunsetLocal = this.formatTimeLocal(sunset, timezoneOffset);
      const moonriseLocal = this.formatTimeLocal(moonrise, timezoneOffset);
      const moonsetLocal = this.formatTimeLocal(moonset, timezoneOffset);
      
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
          phaseName: moonName,
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
}

// Next.js API route handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon, days = 7 } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat/lon parameters' });
  }
  
  try {
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const numDays = parseInt(days as string);
    
    const api = new WotNowAstronomyAPI();
    const result = await api.generateHighlights(latitude, longitude, numDays);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Astronomy highlights error:', error);
    res.status(500).json({ error: 'Failed to fetch astronomy highlights' });
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
