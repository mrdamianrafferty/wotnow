import React, { useState, useEffect } from 'react';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { ActivityType, activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { WeatherCondition } from '../types/weatherTypes';

function getWeatherIconClass(condition: string): string {
  switch (condition.toLowerCase()) {
    case 'sunny':
      return 'wi-day-sunny';
    case 'rain':
      return 'wi-rain';
    case 'cloudy':
      return 'wi-cloudy';
    case 'snow':
      return 'wi-snow';
    case 'thunderstorm':
      return 'wi-thunderstorm';
    case 'fog':
    case 'mist':
      return 'wi-fog';
    default:
      return 'wi-na';
  }
}

function Home() {
  const dummyForecast: WeatherForecastDay[] = [
    { date: '2024-06-10', tempMax: 20, tempMin: 12, condition: 'Sunny', icon: '01d' },
    { date: '2024-06-11', tempMax: 17, tempMin: 10, condition: 'Rain', icon: '09d' },
    { date: '2024-06-12', tempMax: 18, tempMin: 11, condition: 'Cloudy', icon: '03d' },
    { date: '2024-06-13', tempMax: 22, tempMin: 14, condition: 'Sunny', icon: '01d' },
    { date: '2024-06-14', tempMax: 16, tempMin: 9, condition: 'Rain', icon: '09d' },
  ];

  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>(dummyForecast);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
        const lat = 40.4168;
        const lon = -3.7038;
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        );
        const data = await response.json();

        const dailyForecast: WeatherForecastDay[] = data.list
          .filter((entry: any) => entry.dt_txt.includes('12:00:00'))
          .slice(0, 5)
          .map((entry: any) => ({
            date: entry.dt_txt.split(' ')[0],
            tempMax: Math.round(entry.main.temp_max),
            tempMin: Math.round(entry.main.temp_min),
            temperature: Math.round(entry.main.temp),
            condition: entry.weather[0].main,
            icon: entry.weather[0].icon,
            wind_speed: Math.round(entry.wind.speed * 3.6),
            rain: entry.rain?.['3h'] ? Math.round(entry.rain['3h']) : 0
          }));

        setForecastByDay(dailyForecast);
        setActivities(activityTypes);
        setInterests([
          'picnicking',
          'running',
          'fly_fishing_freshwater',
          'outdoor_gardening',
          'bbq'
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, []);

  if (!forecastByDay || forecastByDay.length === 0) {
    return (
      <section>
        <h2>No forecast data available.</h2>
        <p>Please try again later or check your connection.</p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="page-title">Welcome to WotNow</h1>
      <p className="page-instructions">Select a category or see what’s good today!</p>

      <section className="main-grid">
        {forecastByDay.map((dayForecast, index) => {
          const weather = {
            temperature: dayForecast.temperature ?? Math.round((dayForecast.tempMin + dayForecast.tempMax) / 2),
            precipitation: dayForecast.rain ?? 0,
            windSpeed: dayForecast.wind_speed ?? 0,
            water_temp: null
          };
          console.log('Weather for', dayForecast.date, weather);

          const filteredActivities = activities.filter(a => interests.includes(a.id));
          console.log('User selected interests:', interests);

          const suggestions = getSuggestionsByDay(
            filteredActivities,
            weather,
            interests
          );
          console.log('Suggestions for', dayForecast.date, suggestions);

          return (
            <article key={dayForecast.date} className="homepage-card">
              <header className="card-header">
                <h2>
                  {index === 0
                    ? 'Today'
                    : index === 1
                      ? 'Tomorrow'
                      : new Date(dayForecast.date).toLocaleDateString('en-GB', { weekday: 'long' })}
                </h2>
              </header>

              <div className="card-weather">
                <i
                  className={`wi ${getWeatherIconClass(dayForecast.condition)}`}
                  aria-hidden="true"
                  style={{ fontSize: '48px', marginBottom: '8px' }}
                ></i>
                <div>{dayForecast.condition}</div>
                <div>{dayForecast.tempMin}°C - {dayForecast.tempMax}°C</div>
              </div>

              <div className="card-suggestions">
                {suggestions.suggestions.length > 0 ? (
                  <p>
                    <strong>Suggestions:</strong>{' '}
                    {suggestions.suggestions
                      .slice(0, 5)
                      .map((a: ActivityType) => a.name)
                      .join(', ')}
                  </p>
                ) : (
                  <p>No suggestions match your current interests for this day. <a href="/interests">Add more interests</a> to get better suggestions!</p>
                )}

                {suggestions.message && (
                  <p className="suggestion-message">
                    {suggestions.message.replace(/<a.*<\/a>/, '')}
                    <a href="/interests">Add some indoor interests</a>.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

export default Home;
