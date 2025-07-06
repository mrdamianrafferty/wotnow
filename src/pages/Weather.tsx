import "../index.css";
import "../weather-cards.css";
import React, { useState, useEffect } from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';

interface SlotData {
  temp: number | null;
  wind: number | null;
  precipitation: number | null;
  description: string | null;
}

interface ForecastEntry {
  date: string;
  morning: SlotData;
  afternoon: SlotData;
  night: SlotData;
}

const Weather: React.FC = () => {
  const { preferences } = useUserPreferences();
  const { location } = preferences;
  const [forecast, setForecast] = useState<ForecastEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const apiKey = import.meta.env.VITE_OPENWEATHER_KEY;

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
        // Group by date and time slots
        const slots = ['09:00:00', '15:00:00', '21:00:00'];
        const emptySlot = (): SlotData => ({
          temp: null,
          wind: null,
          precipitation: null,
          description: null,
        });
        const entries: Record<string, ForecastEntry> = {};
        data.list.forEach((item: any) => {
          const [date, time] = item.dt_txt.split(' ');
          if (!entries[date]) {
            entries[date] = {
              date,
              morning: emptySlot(),
              afternoon: emptySlot(),
              night: emptySlot(),
            };
          }
          if (time === slots[0]) {
            entries[date].morning.temp = Math.round(item.main.temp);
            entries[date].morning.wind = item.wind?.speed ?? null;
            entries[date].morning.precipitation = item.rain?.['3h'] ?? item.snow?.['3h'] ?? null;
            entries[date].morning.description = item.weather?.[0]?.description ?? null;
          }
          if (time === slots[1]) {
            entries[date].afternoon.temp = Math.round(item.main.temp);
            entries[date].afternoon.wind = item.wind?.speed ?? null;
            entries[date].afternoon.precipitation = item.rain?.['3h'] ?? item.snow?.['3h'] ?? null;
            entries[date].afternoon.description = item.weather?.[0]?.description ?? null;
          }
          if (time === slots[2]) {
            entries[date].night.temp = Math.round(item.main.temp);
            entries[date].night.wind = item.wind?.speed ?? null;
            entries[date].night.precipitation = item.rain?.['3h'] ?? item.snow?.['3h'] ?? null;
            entries[date].night.description = item.weather?.[0]?.description ?? null;
          }
        });
        // Remove past slots for today
        const today = new Date().toISOString().split('T')[0];
        if (entries[today]) {
          const now = new Date().getHours();
          if (now >= 9) entries[today].morning.temp = null;
          if (now >= 15) entries[today].afternoon.temp = null;
        }
        // Take next 5 calendar days
        const sortedDates = Object.keys(entries).sort();
        const nextFive = sortedDates.slice(0, 5).map(date => entries[date]);
        setForecast(nextFive);
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

  // Function to determine card class based on description and slot
  const getCardClass = (description: string | null, slot: 'morning' | 'afternoon' | 'night') => {
    if (slot === 'night') return 'card-night';
    if (!description) return 'card-sunny';
    const lower = description.toLowerCase();
    if (lower.includes('rain') || lower.includes('shower')) return 'card-rain';
    if (lower.includes('storm') || lower.includes('thunder')) return 'card-storm';
    if (lower.includes('snow') || lower.includes('sleet') || lower.includes('flurr')) return 'card-snow';
    if (lower.includes('clear') || lower.includes('sun')) return 'card-sunny';
    return 'card-sunny';
  };

  return (
    <div className="container">
      <h1>5-Day Forecast for {location.name}</h1>
      {forecast.map(entry => (
        <div key={entry.date}>
          <h3>{new Date(entry.date).toLocaleDateString()}</h3>
          <div className="grid-container">
            {entry.morning.temp != null && (
              <div className="grid-item">
                <div className={`card ${getCardClass(entry.morning.description, 'morning')}`}>
                  <div className="status">
                    <p>🌅 Morning: {entry.morning.temp}°C</p>
                    <p>💨 Wind: {entry.morning.wind} m/s</p>
                    <p>☔ Precipitation: {entry.morning.precipitation ?? 0} mm</p>
                    <p>{entry.morning.description}</p>
                  </div>
                </div>
              </div>
            )}
            {entry.afternoon.temp != null && (
              <div className="grid-item">
                <div className={`card ${getCardClass(entry.afternoon.description, 'afternoon')}`}>
                  <div className="status">
                    <p>🌇 Afternoon: {entry.afternoon.temp}°C</p>
                    <p>💨 Wind: {entry.afternoon.wind} m/s</p>
                    <p>☔ Precipitation: {entry.afternoon.precipitation ?? 0} mm</p>
                    <p>{entry.afternoon.description}</p>
                  </div>
                </div>
              </div>
            )}
            {entry.night.temp != null && (
              <div className="grid-item">
                <div className={`card ${getCardClass(entry.night.description, 'night')}`}>
                  <div className="status">
                    <p>🌃 Night: {entry.night.temp}°C</p>
                    <p>💨 Wind: {entry.night.wind} m/s</p>
                    <p>☔ Precipitation: {entry.night.precipitation ?? 0} mm</p>
                    <p>{entry.night.description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Weather;
