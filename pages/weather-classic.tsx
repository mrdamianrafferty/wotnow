import React, { useState, useEffect } from 'react';
import { visibilityPercentMarine } from '../utils/weatherLabels';
import { useUserPreferences } from '../context/UserPreferencesContext';
import SwellArrow from '../components/SwellArrow';
import Link from 'next/link';
import Image from 'next/image';
import type { LocationLite } from '../components/AppHeader';

interface Slot {
  date: string;
  time: string;
  temp: number;
  description: string;
  precipitation: number;
  wind: number;
  windDirection: number | null; // Update windDirection type
  humidity: number;
  clouds: number;
  visibility: number;
}

// Minimal type for OpenWeatherMap forecast items used here
interface OwmForecastItem {
  dt_txt: string;
  main: { temp: number; humidity: number };
  weather?: Array<{ description?: string }>;
  rain?: { '3h'?: number };
  snow?: { '3h'?: number };
  wind?: { speed?: number; deg?: number };
  clouds?: { all?: number };
  visibility?: number;
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

const MainOpenWeatherForecast = ({ location }: { location: LocationLite }) => {
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
        const newSlots: Slot[] = (data.list as OwmForecastItem[]).map((item) => {
          const [date, time] = item.dt_txt.split(' ');
          return {
            date,
            time: time.slice(0, 5),
            temp: Math.round(item.main.temp),
            description: item.weather?.[0]?.description ?? '',
            precipitation: item.rain?.['3h'] ?? item.snow?.['3h'] ?? 0,
            wind: item.wind?.speed ?? 0,
            windDirection: item.wind?.deg ?? null, // Add wind direction
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
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to fetch forecast');
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
          <th style={{ textAlign: 'left' }}>Time</th>
          <th style={{ textAlign: 'left' }}>🌡️</th>
          <th style={{ textAlign: 'left' }}>☔</th>
          <th style={{ textAlign: 'left' }}>💨 Wind</th>
          <th style={{ textAlign: 'left' }}>↗️</th>
          <th style={{ textAlign: 'left' }}>💧 Humidity</th>
          <th style={{ textAlign: 'left' }}>☁️ Clouds</th>
          <th style={{ textAlign: 'left' }}>🔍 Visibility</th>
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
              <td colSpan={8} style={{ textAlign: 'left' }}>
                <strong>{getDayName(date)}</strong>
                {date === new Date().toISOString().split('T')[0] && sunrise && sunset && (
                  <span style={{ marginLeft: 16, fontWeight: 400, fontSize: '0.95em', color: '#eab308' }}>
                    🌅 Sunrise: {sunrise} &nbsp;|&nbsp; 🌇 Sunset: {sunset}
                  </span>
                )}
              </td>
            </tr>
            {expandedDays[date] &&
              daySlots.map((slot) => (
                <tr key={`${slot.date}-${slot.time}`}>
                  <td style={{ textAlign: 'left' }}>
                    {new Date(`${slot.date}T${slot.time}`).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                    <span className="weather-icon" style={{ float: 'right' }}>
                      {getWeatherIcon(slot.description, slot.time)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'left' }}>{slot.temp}°C</td>
                  <td style={{ textAlign: 'left' }}>{slot.precipitation} mm</td>
                  <td style={{ textAlign: 'left' }}>{(slot.wind * 3.6).toFixed(1)} km/h</td>
                  <td style={{ textAlign: 'left' }}>
                    {slot.windDirection != null && <SwellArrow deg={slot.windDirection} />}
                  </td>
                  <td style={{ textAlign: 'left' }}>{slot.humidity}%</td>
                  <td style={{ textAlign: 'left' }}>{slot.clouds}%</td>
                  <td style={{ textAlign: 'left' }}>{slot.visibility} km</td>
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
  location: LocationLite;
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
            <abbr title="Average wind speed (km/h) with direction. Affects surface conditions.">💨 Wind</abbr>
          </th>
          <th>
            <abbr title="Strongest wind gusts (km/h). Sudden bursts increase difficulties.">💨 Gust</abbr>
          </th>
          {slots.some(s => s.currentSpeed?.noaa != null) && (
            <th>
              <abbr title="Current speed (m/s). Important for paddlers and swimmers.">⚡ Curr Speed</abbr>
            </th>
          )}
          <th>
            <abbr title="Visibility in km; log scale up to 24 km.">👁 Visib</abbr>
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
              <td colSpan={slots.some(s => s.currentSpeed?.noaa != null) ? 9 : 8}>
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
                  <td style={{ textAlign: 'left' }}>
                    {new Date(s.time).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </td>
                  <td style={{ textAlign: 'left' }}>{formatMarineValue(s.waterTemperature?.noaa, '°C')}</td>
                  <td style={{ textAlign: 'left', fontSize: '1em' }}>{formatMarineValue(s.waveHeight?.noaa, 'm')}</td>
                  <td style={{ textAlign: 'left' }}>{formatMarineValue(s.wavePeriod?.noaa, 's')}</td>
                  <td style={{ textAlign: 'left' }}>
                    {formatMarineValue(s.swellHeight?.noaa, 'm')}
                    {typeof s.swellDirection?.noaa === 'number' && (
                      <>
                        &nbsp;<SwellArrow deg={s.swellDirection.noaa} />
                      </>
                    )}
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    {formatMarineValue(s.windSpeed?.noaa, '', true)}
                    {typeof s.windDirection?.noaa === 'number' && (
                      <>
                        &nbsp;<SwellArrow deg={s.windDirection.noaa} />
                      </>
                    )}
                  </td>
                  <td style={{ textAlign: 'left' }}>{formatMarineValue(s.gust?.noaa, '', true)}</td>
                  {daySlots.some(slot => slot.currentSpeed?.noaa != null) && (
                    <td style={{ textAlign: 'left' }}>
                      {s.currentSpeed?.noaa != null ? formatMarineValue(s.currentSpeed.noaa, 'm/s') : ''}
                    </td>
                  )}
                  <td style={{ textAlign: 'left', minWidth: 120 }}>
                    {formatMarineValue(s.visibility?.noaa, 'km')}
                    {typeof s.visibility?.noaa === 'number' && (
                      <div style={{ marginTop: 4 }}>
                        <progress className="progress w-full" value={visibilityPercentMarine(s.visibility.noaa)} max={100}></progress>
                      </div>
                    )}
                  </td>
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

  const mainLocation = preferences.locations?.find((l) => l.type === 'home') || preferences.locations?.[0];
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

  // Update the state definition
  const [activeTab, setActiveTab] = useState<'main' | 'marine'>('main');

  const [tides, setTides] = useState<Record<string, { high: string[]; low: string[] }>>({});

  useEffect(() => {
    if (!coastalLocation) return;
    const fetchTides = async () => {
      try {
        const res = await fetch(`/api/tides?lat=${coastalLocation.lat}&lon=${coastalLocation.lon}`);
        const data = await res.json();
        // Group by date and type
        type TideType = 'high' | 'low';
        type Tide = { time: string; type: TideType; height: number };
        const grouped: Record<string, Record<TideType, string[]>> = {};
        ((data.data || []) as Tide[]).forEach((tide) => {
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

  useEffect(() => {
    console.log("Saving preferences to localStorage:", preferences);
    localStorage.setItem('preferences', JSON.stringify(preferences));
  }, [preferences]);

  return (
    <>
      {/* ✅ ADD HEADER BANNER */}
      <header
        className="homepage-banner"
        style={{
          position: 'relative',
          minHeight: 60,
          display: 'flex',
          alignItems: 'center',
          padding: '8px 0 8px 0',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {/* Hamburger icon: left */}
        <Image
          src="/burger-menu-svgrepo-com.svg"
          alt="Open menu"
          className="burger-menu-icon"
          width={36}
          height={36}
          style={{
            cursor: 'pointer',
            marginLeft: 12,
            marginRight: 12,
            zIndex: 10,
            display: 'block',
          }}
          onClick={() => setMenuOpen(true)}
        />

        {/* Logo: left-aligned, next to hamburger */}
        <Link href="/" style={{ display: 'block' }}>
          <Image
            src="/wotnow-horizontal.png"
            alt="WotNow Logo"
            className="homepage-banner__logo"
            width={180}
            height={40}
            style={{
              display: 'block',
              height: 'auto',
            }}
          />
        </Link>

        {/* Spacer to push content to right */}
        <div style={{ flex: 1 }} />

        {/* Page-specific text */}
        <div className="homepage-banner__text" style={{ textAlign: 'right', paddingRight: '12px' }}>
          <h2 className="homepage-banner__title" style={{ fontSize: '1.5rem', margin: 0, color: '#1f2937' }}>
            Weather Details
          </h2>
          <p className="homepage-banner__subtitle" style={{ fontSize: '0.9rem', margin: 0, color: '#6b7280' }}>
            5-day forecast & marine conditions
          </p>
        </div>

        <style>{`
          @media (max-width: 800px) {
            .homepage-banner__text {
              display: none !important;
            }
          }
        `}</style>
      </header>

      {/* ✅ ADD MOBILE NAVIGATION MENU */}
      {menuOpen && (
        <>
          {/* Invisible overlay to detect clicks outside the menu */}
          <div 
            className="menu-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
              cursor: 'default'
            }}
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu container */}
          <nav
            className="navigation-menu"
            style={{
              position: 'fixed',
              zIndex: 1000,
              top: 0,
              left: 0
            }}
          >
            {/* Menu content with properly rounded corners */}
            <div 
              className="menu-content"
              style={{
                background: '#2b323c',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '12px 24px',
                minWidth: '220px',
                maxWidth: '280px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                margin: '12px'
              }}
              onClick={(e) => e.stopPropagation()} // Prevent clicks from closing menu
            >
              <Link href="/" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Home</Link>
        <Link href="/interests" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Manage my interests</Link>
        <Link href="/activities" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Scan my interests</Link>
        <Link href="/weather" onClick={() => setMenuOpen(false)} style={{ color: '#fff', fontSize: '1.5rem', margin: '16px 0', textDecoration: 'none' }}>Local weather in detail</Link>
        <button
                onClick={() => setMenuOpen(false)}
                style={{
                  marginTop: 24,
                  background: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#000'
                }}
              >
                Close
              </button>
            </div>

            <style jsx>{`
              @media (min-width: 800px) {
                .navigation-menu {
                  top: 60px; /* Position below header on desktop */
                }
                
                .menu-content {
                  margin: 0 0 0 12px;
                  border-radius: 0 0 12px 12px !important; /* Only round bottom corners on desktop */
                }
                
                .menu-content a:hover {
                  text-decoration: underline;
                }
                
                .menu-content button {
                  display: none; /* Hide close button on desktop */
                }
              }
              
              @media (max-width: 799px) {
                .menu-overlay {
                  background: rgba(0,0,0,0.7);
                }
              }
            `}</style>
          </nav>
        </>
      )}
      {/* EXISTING WEATHER CONTENT */}
      <div className="container" style={{ padding: '1rem', position: 'relative' }}>
        <div className="day-tabs">
          <button 
            className={activeTab === 'main' ? 'active' : ''} 
            onClick={() => setActiveTab('main')} 
            style={{ marginRight: '0.5rem' }}
          >
            Main Weather
          </button>
          <button 
            className={activeTab === 'marine' ? 'active' : ''} 
            onClick={() => setActiveTab('marine')} 
            style={{ marginRight: '0.5rem' }}
          >
            Marine Weather
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
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#3b82f6';
          }}
        >
          ← Back to Homepage
        </Link>
      </div>
    </>
  );
};

export default WeatherPageBothLocations;
