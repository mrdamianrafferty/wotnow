
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

const Weather: React.FC = () => {
  const { preferences } = useUserPreferences();
  const { location } = preferences;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [sunrise, setSunrise] = useState<string>('');
  const [sunset, setSunset] = useState<string>('');

  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

  useEffect(() => {
    if (!location || !location.lat || !location.lon) {
      setError('Location not set in preferences.');
      setLoading(false);
      return;
    }
    if (!apiKey) {
      setError('OpenWeather API key is not configured.');
      setLoading(false);
      return;
    }

    const fetchForecast = async () => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${apiKey}`
        );
        if (!response.ok) throw new Error('Failed to fetch forecast');
        const data = await response.json();
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
            visibility: (item.visibility ?? 10000) / 1000
          };
        });
        const expanded: Record<string, boolean> = {};
        expanded[todayStr] = true;
        setExpandedDays(expanded);
        setSlots(newSlots);

        // Fetch sunrise and sunset times
        const weatherResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${apiKey}`
        );
        if (!weatherResponse.ok) throw new Error('Failed to fetch weather data');
        const weatherData = await weatherResponse.json();
        const sunriseDate = new Date(weatherData.sys.sunrise * 1000);
        const sunsetDate = new Date(weatherData.sys.sunset * 1000);
        setSunrise(sunriseDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
        setSunset(sunsetDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, [location, apiKey]);

  if (loading) return <div>Loading forecast...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  const getWeatherIcon = (description: string, time?: string) => {
    const lower = description.toLowerCase();

    const isNight = (() => {
      if (!time) return false;
      const [hourStr] = time.split(':');
      const hour = parseInt(hourStr, 10);
      return hour < 6 || hour >= 20;
    })();

    if (lower.includes('rain') || lower.includes('shower')) return '🌧️';
    if (lower.includes('storm') || lower.includes('thunder')) return '⛈️';
    if (lower.includes('snow') || lower.includes('sleet') || lower.includes('flurr')) return '❄️';
    if (lower.includes('clear') || lower.includes('sun')) return isNight ? '🌙' : '☀️';
    if (lower.includes('cloud')) return '☁️';
    return isNight ? '🌙' : '☀️';
  };

  const toggleDay = (date: string) => {
    setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const groupedByDay = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
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

  return (
    <div className="container" style={{ paddingLeft: '1rem' }}>
      <h1>5-Day Detailed Forecast for {location.name.charAt(0).toUpperCase() + location.name.slice(1)}</h1>
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
              <tr className="day-header" onClick={() => toggleDay(date)}>
                <td colSpan={8} style={{ cursor: 'pointer', background: '#f0f0f0' }}>
                  <span style={{ fontWeight: 'bold' }}>{expandedDays[date] ? '▼' : '▶'} {getDayName(date)}</span>{getDayName(date) === 'Today' && sunrise && sunset ? ` (Sunrise at ${sunrise} and Sunset at ${sunset})` : ''}
                </td>
              </tr>
              {expandedDays[date] && daySlots.map(slot => (
                <tr key={`${slot.date}-${slot.time}`}>
                  <td>
                    {(() => {
                      const dateObj = new Date(`${slot.date}T${slot.time}`);
                      const hours = dateObj.getHours();
                      const minutes = dateObj.getMinutes().toString().padStart(2, '0');
                      if (hours === 0) return 'Midnight';
                      if (hours === 12) return 'Noon';
                      return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    })()}
                  </td>
                  <td className={slot.temp > 25 ? 'hot' : slot.temp < 5 ? 'cold' : ''}>{slot.temp}°C</td>
                  <td style={{ fontSize: '1.2rem' }}>{getWeatherIcon(slot.description, slot.time)}</td>
                  <td>{slot.precipitation} mm</td>
                  <td className={slot.wind > 15 ? 'windy' : ''}>{(slot.wind * 3.6).toFixed(1)} km/h</td>
                  <td>{slot.humidity}%</td>
                  <td>{slot.clouds}%</td>
                  <td>{slot.visibility} km</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Weather;
