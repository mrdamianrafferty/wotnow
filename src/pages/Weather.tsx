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

  // Function to get a simple weather icon emoji based on description
  const getWeatherIcon = (description: string | null) => {
    if (!description) return '☀️';
    const lower = description.toLowerCase();
    if (lower.includes('rain') || lower.includes('shower')) return '🌧️';
    if (lower.includes('storm') || lower.includes('thunder')) return '⛈️';
    if (lower.includes('snow') || lower.includes('sleet') || lower.includes('flurr')) return '❄️';
    if (lower.includes('clear') || lower.includes('sun')) return '☀️';
    if (lower.includes('cloud')) return '☁️';
    return '☀️';
  };

  // Function to capitalize first letter of each word for description
  const capitalizeDescription = (desc: string | null) => {
    if (!desc) return "N/A";
    return desc.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="container">
      <h1>5-Day Forecast for {location.name}</h1>
      {forecast.map(entry => {
        const dateObj = new Date(entry.date);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const isToday = dateObj.toDateString() === today.toDateString();
        const isTomorrow = dateObj.toDateString() === tomorrow.toDateString();

        let label = dateObj.toLocaleDateString();
        if (isToday) label = "Today";
        else if (isTomorrow) label = "Tomorrow";
        else label = dateObj.toLocaleDateString(undefined, { weekday: 'long' });

        return (
          <div key={entry.date}>
            <h3>{label}</h3>
            <div className="grid-container" style={{ display: 'flex', gap: '1rem' }}>
              {['Morning', 'Afternoon', 'Evening'].map((timeLabel, idx) => {
                const slot = idx === 0 ? entry.morning : idx === 1 ? entry.afternoon : entry.night;
                return slot.temp != null && (
                  <div className="grid-item" key={timeLabel} style={{ flex: 1 }}>
                    <div className="weatherCard">
                      <div className="timeOfDay">{timeLabel}</div>
                      <div className="currentTemp">
                        <span className="temp">{slot.temp}°</span>
                        <span className="location">{capitalizeDescription(slot.description)}</span>
                      </div>
                      <div className="currentWeather">
                        <span className="conditions">{getWeatherIcon(slot.description)}</span>
                        <div className="info">
                          <div className="rain">☔ {slot.precipitation ?? 0} mm</div>
                          <div className="wind">💨 {slot.wind ?? 0} m/s</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Weather;
