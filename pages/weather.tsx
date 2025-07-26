import React, { useState, useEffect } from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';

interface Slot {
  date: string;
  time: string;
  temp: number;
  description: string;
  precipitation: number;
  wind: number;
  humidity: number;
  clouds: number;
  visibility: number;
}

interface MarineSlot {
  time: string;
  waveHeight?: { noaa?: number };
  waveDirection?: { noaa?: number };
  wavePeriod?: { noaa?: number };
  swellHeight?: { noaa?: number };
  swellDirection?: { noaa?: number };
  swellPeriod?: { noaa?: number };
  windSpeed?: { noaa?: number };
  windDirection?: { noaa?: number };
  gust?: { noaa?: number };
  currentSpeed?: { noaa?: number };
  currentDirection?: { noaa?: number };
  waterTemperature?: { noaa?: number };
  visibility?: { noaa?: number };
}

// Format values helper with units and wind conversion
const formatMarineValue = (val?: number, unit = '', isWind = false) => {
  if (val == null) return '-';
  if (isWind) return `${(val * 3.6).toFixed(1)} km/h`;
  return `${val.toFixed(1)}${unit}`;
};

const MainOpenWeatherForecast = ({ location }: { location: any }) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [sunrise, setSunrise] = useState('');
  const [sunset, setSunset] = useState('');

  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

  useEffect(() => {
    if (!location || !apiKey) return;
    const fetchForecast = async () => {
      try {
        const resp = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${apiKey}`
        );
        const data = await resp.json();

        const todayStr = new Date().toISOString().split('T')[0];
        const newSlots: Slot[] = data.list.map((item: any) => {
          const [date, time] = item.dt_txt.split(' ');
          return {
            date,
            time: time.slice(0, 5),
            temp: Math.round(item.main.temp),
            description: item.weather?.[0]?.description ?? '',
            precipitation: item.rain?.['3h'] ?? item.snow?.['3h'] ?? 0,
            wind: item.wind?.speed ?? 0,
            humidity: item.main?.humidity ?? 0,
            clouds: item.clouds?.all ?? 0,
            visibility: (item.visibility ?? 10000) / 1000,
          };
        });
        setSlots(newSlots);
        setExpandedDays({ [todayStr]: true });

        const weatherNow = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${apiKey}`
        );
        const weatherData = await weatherNow.json();
        setSunrise(
          new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        );
        setSunset(
          new Date(weatherData.sys.sunset * 1000).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        );
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, [location, apiKey]);

  if (loading) return <div>Loading forecast...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  const toggleDay = (date: string) => setExpandedDays((p) => ({ ...p, [date]: !p[date] }));

  const groupedByDay = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    acc[slot.date] = acc[slot.date] || [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
  };

  const getWeatherIcon = (desc: string, time?: string) => {
    const lower = desc.toLowerCase();
    const hour = time ? parseInt(time.split(':')[0], 10) : 12;
    const isNight = hour < 6 || hour >= 20;
    if (lower.includes('rain')) return '🌧️';
    if (lower.includes('storm') || lower.includes('thunder')) return '⛈️';
    if (lower.includes('snow')) return '❄️';
    if (lower.includes('clear')) return isNight ? '🌙' : '☀️';
    if (lower.includes('cloud')) return '☁️';
    return isNight ? '🌙' : '☀️';
  };

  return (
    <table className="weather-table spaced">
      <thead>
        <tr>
          <th>Time</th>
          <th>🌡️ Temp</th>
          <th>Weather</th>
          <th>☔ Precip</th>
          <th>💨 Wind</th>
          <th>💧 Humidity</th>
          <th>☁️ Clouds</th>
          <th>🔍 Visibility</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(groupedByDay).map(([date, daySlots]) => (
          <React.Fragment key={date}>
            <tr
              className={`day-header ${expandedDays[date] ? 'expanded' : ''}`}
              onClick={() => toggleDay(date)}
              style={{ cursor: 'pointer', background: '#f0f0f0' }}
            >
<td colSpan={10}>
  <strong>{getDayName(date)}</strong>
</td>
            </tr>
            {expandedDays[date] &&
              daySlots.map((slot) => (
                <tr key={`${slot.date}-${slot.time}`}>
                  <td>
                    {new Date(`${slot.date}T${slot.time}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className={slot.temp > 25 ? 'hot' : slot.temp < 5 ? 'cold' : ''}>
                    {slot.temp}°C
                  </td>
                  <td className="weather-icon">{getWeatherIcon(slot.description, slot.time)}</td>
                  <td>{slot.precipitation} mm</td>
                  <td>{(slot.wind * 3.6).toFixed(1)} km/h</td>
                  <td>{slot.humidity}%</td>
                  <td>{slot.clouds}%</td>
                  <td>{slot.visibility} km</td>
                </tr>
              ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

const StormglassMarineWeather = ({
  location,
  start,
  end,
  tides = {},
}: {
  location: any;
  start: string;
  end: string;
  tides?: Record<string, { high: string[]; low: string[] }>;
}) => {
  const [slots, setSlots] = useState<MarineSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!location || !start || !end) return;
    const fetchMarine = async () => {
      try {
        const res = await fetch(
          `/api/marine?lat=${location.lat}&lon=${location.lon}&start=${start}&end=${end}`
        );
        const data = await res.json();

        let marineSlots: MarineSlot[] = [];
        if (Array.isArray(data.hours)) {
          marineSlots = data.hours;
        } else if (Array.isArray(data)) {
          marineSlots = data;
        }
        setSlots(marineSlots);

        if (marineSlots.length > 0) {
          const todayKey = marineSlots[0].time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
          setExpandedDays({ [todayKey]: true });
        }
      } catch {
        setError('Failed to fetch marine data');
      } finally {
        setLoading(false);
      }
    };
    fetchMarine();
  }, [location, start, end]);

  if (loading) return <div>Loading marine forecast...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  const groupedByDay = slots.reduce<Record<string, MarineSlot[]>>((acc, slot) => {
    const dateStr = slot.time?.slice(0, 10);
    if (!dateStr) return acc;
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(slot);
    return acc;
  }, {});

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
  };

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  return (
    <table className="marine-table spaced">
      <thead>
        <tr>
          <th>
            <abbr title="The hour for this forecasted slot.">Time</abbr>
          </th>
          <th>
            <abbr title="Water temperature in °C. Indicates comfort & wetsuit needs.">🌡️ Water</abbr>
          </th>
          <th>
            <abbr title="The average height of breaking waves (in metres). Low (~0.5–1m): Good for beginners. High (&gt;2m): Powerful, caution advised.">🌊 Wave</abbr>
          </th>
          <th>
            <abbr title="Time (in seconds) between waves; longer means more powerful and better shaped.">⏳ Period</abbr>
          </th>
          <th>
            <abbr title="Height of ocean swell (m) before breaking.">🏄 Swell</abbr>
          </th>
          <th>
            <abbr title="Direction swell is coming from (degrees or compass).">🧭 Swell Dir</abbr>
          </th>
          <th>
            <abbr title="Average wind speed (km/h). Affects surface conditions.">💨 Wind</abbr>
          </th>
          <th>
            <abbr title="Strongest wind gusts (km/h). Sudden bursts increase difficulties.">💨 Gust</abbr>
          </th>
          <th>
            <abbr title="Current speed (m/s). Important for paddlers and swimmers.">⚡ Curr Speed</abbr>
          </th>
          <th>
            <abbr title="Visibility in km; important for navigation and safety.">👁 Visib</abbr>
          </th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(groupedByDay).map(([date, daySlots]) => (
          <React.Fragment key={date}>
            <tr
              className={`day-header ${expandedDays[date] ? 'expanded' : ''}`}
              onClick={() => toggleDay(date)}
              style={{ cursor: 'pointer', background: '#f0f0f0' }}
            >
              <td colSpan={10}>
                <strong>{getDayName(date)}</strong>
                {tides && tides[date] && (
                  <span style={{ marginLeft: 12, fontWeight: 400, fontSize: '0.95em', color: '#2563eb' }}>
                    {tides[date].high.length > 0 && (
                      <> | <b>High Tide:</b> {tides[date].high.join(', ')} </>
                    )}
                    {tides[date].low.length > 0 && (
                      <> | <b>Low:</b> {tides[date].low.join(', ')} </>
                    )}
                  </span>
                )}
              </td> 
            </tr>
            {expandedDays[date] &&
              daySlots.map((s, idx) => (
                <tr key={s.time || idx}>
                  <td>{new Date(s.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{formatMarineValue(s.waterTemperature?.noaa, '°C')}</td>
                  <td>{formatMarineValue(s.waveHeight?.noaa, 'm')}</td>
                  <td>{formatMarineValue(s.wavePeriod?.noaa, 's')}</td>
                  <td>{formatMarineValue(s.swellHeight?.noaa, 'm')}</td>
                  <td>{formatMarineValue(s.swellDirection?.noaa, '°')}</td>
                  <td>{formatMarineValue(s.windSpeed?.noaa, '', true)}</td>
                  <td>{formatMarineValue(s.gust?.noaa, '', true)}</td>
                  <td>{formatMarineValue(s.currentSpeed?.noaa, 'm/s')}</td>
                  <td>{formatMarineValue(s.visibility?.noaa, 'km')}</td>
                </tr>
              ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

const WeatherPageBothLocations: React.FC = () => {
  const { preferences } = useUserPreferences();
  const [range, setRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [isClient, setIsClient] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const mainLocation = preferences.locations?.find((l) => l.type === 'main') || preferences.location;
  const coastalLocation = preferences.locations?.find((l) => l.type === 'coastal');

  useEffect(() => {
    const now = new Date();
    const start = now.toISOString();
    const endDate = new Date();
    endDate.setDate(now.getDate() + 4);
    endDate.setHours(23, 59, 59, 999);
    setRange({ start, end: endDate.toISOString() });
    setIsClient(true);
  }, []);

  const [activeTab, setActiveTab] = useState<
    'main' | 'marine' | 'placeholder1' | 'placeholder2' | 'placeholder3' | 'placeholder4'
  >('main');

  const [tides, setTides] = useState<Record<string, { high: string[]; low: string[] }>>({});

  useEffect(() => {
    if (!coastalLocation) return;
    const fetchTides = async () => {
      try {
        const res = await fetch(`/api/tides?lat=${coastalLocation.lat}&lon=${coastalLocation.lon}`);
        const data = await res.json();
        // Group by date and type
        const grouped: Record<string, { high: string[]; low: string[] }> = {};
        (data.data || []).forEach((tide: any) => {
          const date = tide.time.slice(0, 10);
          if (!grouped[date]) grouped[date] = { high: [], low: [] };
          grouped[date][tide.type].push(
            `${new Date(tide.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${tide.height.toFixed(2)}m)`
          );
        });
        setTides(grouped);
      } catch {
        setTides({});
      }
    };
    fetchTides();
  }, [coastalLocation]);

  return (
    <div className="container" style={{ padding: '1rem', position: 'relative' }}>
      <img
        src="/burger-menu-svgrepo-com.svg"
        alt="Open menu"
        className="burger-menu-icon"
        style={{ width: 36, height: 36, cursor: 'pointer', display: 'none', position: 'absolute', top: 18, right: 18, zIndex: 1100 }}
        onClick={() => setMenuOpen(true)}
      />
      {menuOpen && (
        <nav
          className="mobile-nav"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <a href="/" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0' }}>Home</a>
          <a href="/interests" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0' }}>Interests</a>
          <a href="/weather" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0' }}>Weather</a>
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              marginTop: 24,
              background: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </nav>
      )}
      <h1>5-Day Forecast</h1>
      <div className="weather-tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={activeTab === 'main' ? 'active' : ''} onClick={() => setActiveTab('main')} style={{ marginRight: '0.5rem' }}>
          Main Weather
        </button>
        <button className={activeTab === 'marine' ? 'active' : ''} onClick={() => setActiveTab('marine')} style={{ marginRight: '0.5rem' }}>
          Marine Weather
        </button>
        <button className={activeTab === 'placeholder1' ? 'active' : ''} onClick={() => setActiveTab('placeholder1')} style={{ marginRight: '0.5rem' }}>
          🏄‍♂️ Surf Outlook
        </button>
        <button className={activeTab === 'placeholder2' ? 'active' : ''} onClick={() => setActiveTab('placeholder2')} style={{ marginRight: '0.5rem' }}>
          SUP Outlook
        </button>
        <button className={activeTab === 'placeholder3' ? 'active' : ''} onClick={() => setActiveTab('placeholder3')} style={{ marginRight: '0.5rem' }}>
          Boat Fishing
        </button>
        <button className={activeTab === 'placeholder4' ? 'active' : ''} onClick={() => setActiveTab('placeholder4')} style={{ marginRight: '0.5rem' }}>
          Kayak
        </button>
      </div>

      {activeTab === 'main' && (
        <>
          <h2>📍 {isClient && mainLocation?.name ? mainLocation.name : 'Main location'}</h2>
          {isClient && mainLocation ? (
            <MainOpenWeatherForecast location={mainLocation} />
          ) : (
            <p>⚠️ No main location selected.</p>
          )}
        </>
      )}

      {activeTab === 'marine' && (
        <>
          <h2>🌊 {isClient && coastalLocation?.name ? coastalLocation.name : 'Coastal location'}</h2>
          {isClient && coastalLocation ? (
            <StormglassMarineWeather location={coastalLocation} start={range.start} end={range.end} tides={tides} />
          ) : (
            <p>⚠️ No coastal location selected.</p>
          )}
        </>
      )}

{activeTab === 'placeholder1' && (
  <section style={{ lineHeight: 1.5, maxWidth: 700 }}>
    <h2>🏄‍♂️ Surf Outlook</h2>

    <h3>Conditions Overview for Today and Tomorrow</h3>
    <p>
      We’ve got small, steady swell all day, building slightly into the evening.
      Nothing epic, but clean and friendly — perfect for beginners and longboarders,
      with a few fun faces for intermediates later on. Advanced riders might get bored
      unless you just wanna get wet. Wind stays light through the morning, picking
      up in the afternoon but not too messy. Water’s mild, air is sunny and warm.
    </p>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🔆 Best windows to surf</h3>
    <p><b>✅ Morning (08:00–12:00)</b></p>
    <p>~1.3m, clean, 8–9s period, very light winds.<br />
      Super mellow, perfect for beginners and anyone looking to cruise a longboard or softie.
      Waves hold their shape and it’s glassier before the wind gets into it.
    </p>

    <p><b>✅ Evening (19:00–21:00)</b></p>
    <p>~1.2–1.4m, longer 14–15s period building in, light winds easing off.<br />
      Best of the day for intermediates — longer-period energy starts showing and waves
      have a bit more punch, while winds calm down. More wall to work with.
    </p>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🌤️ Hourly vibe check:</h3>

    <table className="marine-table spaced" style={{ marginTop: '0.75rem' }}>
      <thead>
        <tr>
          <th>Time</th>
          <th>🌊 Wave (m)</th>
          <th>⏳ Period (s)</th>
          <th>💨 Wind (km/h)</th>
          <th>🏄‍♀️ Who it suits</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>08–11</td><td>1.3</td><td>5.8–5.7</td><td>~10–14</td><td>Beginners, longboards</td></tr>
        <tr><td>12–16</td><td>1.3–1.1</td><td>5.6–6.5</td><td>~15–16</td><td>Still OK, wind picking up</td></tr>
        <tr><td>17–18</td><td>1.0–1.1</td><td>7.0–7.3</td><td>~14–12</td><td>Intermediates, small walls</td></tr>
        <tr><td>19–21</td><td>1.2–1.4</td><td>14–15</td><td>~12–10</td><td>Best punch, clean evening glass</td></tr>
        <tr><td>After dark</td><td>—</td><td>—</td><td>Grab a beer, not your board 🍻</td></tr>
      </tbody>
    </table>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🩱 What to bring?</h3>
    <ul>
      <li>3/2 or shorty if you’re tough — water ~14–16°C, air ~23°C</li>
      <li>Longboard or fish if you’ve got one — today’s not about barrels</li>
      <li>Sunscreen, wax, smile</li>
    </ul>
  </section>
)}

{activeTab === 'placeholder2' && (
  <section style={{ lineHeight: 1.5, maxWidth: 700 }}>
    <h2>🛶 SUP Outlook: Today + Tomorrow</h2>

    <h3>Conditions Overview</h3>
    <p>
      This is a great day for paddleboarders — small, steady swell with no real nastiness, light morning winds, and warm air & water. The wind does freshen a bit after midday and the sea chops up slightly, but evenings mellow out again. Perfect for beginners, casual cruisers, or even a fitness paddle.
    </p>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🔆 Best windows for paddleboarding</h3>
    <p><b>✅ Morning glass-off (08:00–12:00)</b></p>
    <p>
      Light winds, calm sea state, very manageable ~1.3m swell rolling through gently. Ideal for all levels, from absolute beginners to experienced SUPers who want to tour along the coast or get a proper workout.
    </p>

    <p><b>✅ Evening calm (19:00–21:00)</b></p>
    <p>
      Winds drop back down and the longer-period swell is slow and gentle — lovely sunset cruise conditions with plenty of stability.
    </p>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🌤️ Hourly vibe check:</h3>

    <table className="marine-table spaced" style={{ marginTop: '0.75rem' }}>
      <thead>
        <tr>
          <th>Time</th>
          <th>🌊 Wave (m)</th>
          <th>💨 Wind (km/h)</th>
          <th>🌅 Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>08–11</td>
          <td>~1.3</td>
          <td>~10–14</td>
          <td>Calm, clean, best for everyone</td>
        </tr>
        <tr>
          <td>12–16</td>
          <td>~1.3–1.1</td>
          <td>~15–16</td>
          <td>Manageable but choppier</td>
        </tr>
        <tr>
          <td>17–18</td>
          <td>~1.1</td>
          <td>~12–11</td>
          <td>Settling, decent again</td>
        </tr>
        <tr>
          <td>19–21</td>
          <td>~1.2–1.4</td>
          <td>~10–9</td>
          <td>Smooth & peaceful sunset vibes</td>
        </tr>
        <tr>
          <td>After dark</td>
          <td>—</td>
          <td>—</td>
          <td>Night paddling only if lit & confident! 🌙</td>
        </tr>
      </tbody>
    </table>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🩱 What to bring?</h3>
    <ul>
      <li>Flatwater or all-round board</li>
      <li>Light wetsuit or rash vest (water ~14–16°C)</li>
      <li>Dry bag & water bottle — it’s warm out there (air ~23°C)</li>
      <li>Sunglasses & hat, sun’s blazing</li>
    </ul>

    <p>
      🌅 <b>Best bet:</b> calm morning for easy paddling or a little SUP yoga.<br />
      🌇 <b>Evening:</b> serene sunset cruise along the coast.<br />
      💨 <b>Midday:</b> only for the confident — wind chop makes it harder work!
    </p>
  </section>
)}

{activeTab === 'placeholder3' && (
  <section style={{ lineHeight: 1.5, maxWidth: 700 }}>
    <h2>🪝 Boat Fishing Outlook: Today + Tomorrow</h2>

    <h3>Conditions Overview</h3>
    <p>
      We’re looking at a pretty decent stretch of weather for heading out. Swell stays low and steady through the daylight hours — no nasty surprises — and winds are lightest early and late, freshening a touch in the middle of the day. Visibility’s excellent, and it’s warm on deck. Overall: solid conditions for a comfortable day dropping lines or trolling.
    </p>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🔆 Best times to launch</h3>
    <p><b>✅ Early morning (08:00–12:00)</b></p>
    <p>
      Sea’s settled, wind’s still sleepy (~10–14 km/h), and swell’s mellow at around ~1.3m. Best for a calm trip, even for smaller craft or nervous passengers. You’ll have an easier time holding position and keeping baits where you want them.
    </p>

    <p><b>✅ Evening (19:00–21:00)</b></p>
    <p>
      Winds ease off again, and though the swell edges up slightly (to ~1.2–1.4m), it’s still very manageable — plus, golden light and cooler temps make for a cracking end to the day.
    </p>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🌤️ Hourly vibe check:</h3>
    
    <table className="marine-table spaced" style={{ marginTop: '0.75rem' }}>
      <thead>
        <tr>
          <th>Time</th>
          <th>🌊 Swell (m)</th>
          <th>💨 Wind (km/h)</th>
          <th>🎣 Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>08–11</td><td>~1.3</td><td>~10–14</td><td>Smooth sailing, ideal for dropping anchor</td></tr>
        <tr><td>12–16</td><td>~1.3–1.1</td><td>~15–16</td><td>Still fine, but a bit more drift</td></tr>
        <tr><td>17–18</td><td>~1.1</td><td>~12</td><td>Settling again</td></tr>
        <tr><td>19–21</td><td>~1.2–1.4</td><td>~10–9</td><td>Calm evening, scenic & productive</td></tr>
        <tr><td>After dark</td><td>—</td><td>—</td><td>Only if properly equipped & salty 🌙</td></tr>
      </tbody>
    </table>
    
    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🪝 What to pack?</h3>
    <ul>
      <li>Sunscreen & hat — deck gets hot (air ~23°C)</li>
      <li>Cool drinks & snacks</li>
      <li>Light jacket for evening breeze</li>
      <li>Something for shade if you’re out midday</li>
      <li>And of course… sharp hooks & fresh bait! 🐟</li>
    </ul>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>Top tips</h3>
    <p>
      🌅 <b>Best bet:</b> morning launch for calm seas & easy fishing.<br />
      🌇 Evening: relaxed sunset session & good bite chances.<br />
      💨 Midday: fine if you don’t mind a bit of drift.
    </p>

    <p style={{ fontSize: '0.85rem', color: '#555', marginTop: '1rem' }}>
      Current date: {new Date().toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hour12: true, timeZoneName: 'short',
      })}
    </p>
  </section>
)}

{activeTab === 'placeholder4' && (
  <section style={{ lineHeight: 1.5, maxWidth: 700 }}>
    <h2>🚣 Kayaking Outlook: Today + Tomorrow</h2>

    <h3>Conditions Overview</h3>
    <p>
      A solid day to get the kayak wet! Seas are mild, winds are mellow early and late, and visibility is crystal clear. Midday winds pick up and bring a bit of chop — manageable for experienced paddlers but not as relaxing. Air temps are warm and the water’s not too chilly, making it a pleasant few hours on the water.
    </p>
    <p>
      Perfect for coastal touring, wildlife spotting, or just drifting along. Beginners will feel happiest in the morning and evening.
    </p>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🔆 Best windows to paddle</h3>
    <p><b>✅ Morning calm (08:00–12:00)</b></p>
    <p>
      Low winds (10–14 km/h), ~1.3m swell — very manageable. Great for all levels; easy to track straight and stay stable even in a sit-on-top.
    </p>

    <p><b>✅ Evening mellow (19:00–21:00)</b></p>
    <p>
      Winds drop again to ~10 km/h or less, seas stay gentle around ~1.2–1.4m, and the sunset light is unbeatable. If you’re confident, it’s a magic time to be out.
    </p>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🌤️ Hourly vibe check:</h3>

    <table className="marine-table spaced" style={{ marginTop: '0.75rem' }}>
      <thead>
        <tr>
          <th>Time</th>
          <th>🌊 Swell (m)</th>
          <th>💨 Wind (km/h)</th>
          <th>🚣 Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>08–11</td><td>~1.3</td><td>~10–14</td><td>Calm & safe for all</td></tr>
        <tr><td>12–16</td><td>~1.3–1.1</td><td>~15–16</td><td>Choppier, better for experienced paddlers</td></tr>
        <tr><td>17–18</td><td>~1.1</td><td>~12</td><td>Settling down</td></tr>
        <tr><td>19–21</td><td>~1.2–1.4</td><td>~10–9</td><td>Smooth & serene sunset paddle</td></tr>
        <tr><td>After dark</td><td>—</td><td>—</td><td>Only with lights & skills 🌙</td></tr>
      </tbody>
    </table>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>🩱 What to bring?</h3>
    <ul>
      <li>Buoyancy aid (always)</li>
      <li>Dry bag for phone/keys</li>
      <li>Hat & sunscreen (it’s ~23°C)</li>
      <li>Water & snacks</li>
      <li>Light layers — evening breeze can cool you off</li>
      <li>Optional: fishing rod, camera, or a cold cider for the beach afterwards 🍏</li>
    </ul>

    <hr style={{ margin: '1.5rem 0' }} />

    <h3>Top tips</h3>
    <p>
      🌅 <b>Best bet:</b> morning if you’re newer to paddling.<br />
      🌇 Evening: for a peaceful glide along the coast.<br />
      💨 Midday: fine if you’re strong & steady in chop.
    </p>

    <p style={{ fontSize: '0.85rem', color: '#555', marginTop: '1rem' }}>
      Current date: {new Date().toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hour12: true, timeZoneName: 'short',
      })}
    </p>
  </section>
)}

    </div>
  );
};

export default WeatherPageBothLocations;
