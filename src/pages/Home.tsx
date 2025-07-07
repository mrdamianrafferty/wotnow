import React, { useState, useEffect } from 'react';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { ActivityType } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { WeatherCondition } from '../types/weatherTypes';

function getActivitySuitability(activity: ActivityType, weather: WeatherCondition | null): 'perfect' | 'good' | null {
  if (!weather) return null;
  // ... rest of your original suitability logic here ...
  return null;
}

function Home() {
  // Dummy fallback data for quick UI rendering
  const dummyForecast: WeatherForecastDay[] = [
    {
      date: '2024-06-10',
      tempMax: 20,
      tempMin: 12,
      condition: 'Sunny',
      icon: '01d',
    },
    {
      date: '2024-06-11',
      tempMax: 17,
      tempMin: 10,
      condition: 'Rain',
      icon: '09d',
    },
  ];
  const dummyActivities: ActivityType[] = [
    { name: 'Picnic', weatherTags: ['Sunny', 'Cloudy'] },
    { name: 'Museum', weatherTags: ['Rain', 'Cloudy'] },
    { name: 'Jogging', weatherTags: ['Sunny', 'Cloudy'] },
  ];
  const dummyInterests: string[] = ['Outdoors', 'Culture'];

  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>(dummyForecast);
  const [activities, setActivities] = useState<ActivityType[]>(dummyActivities);
  const [interests, setInterests] = useState<string[]>(dummyInterests);

  // Example data fetching / state setup could go here
  useEffect(() => {
    // TODO: Replace dummy data with actual fetch logic
  }, []);

  // Fallback UI if no forecast data
  if (!forecastByDay || forecastByDay.length === 0) {
    return (
      <div>
        <h2>No forecast data available.</h2>
        <p>Try again later or check your connection.</p>
      </div>
    );
  }

  return (
    <div>
      {forecastByDay.map((dayForecast) => {
        const weather = dayForecast;

        if (!weather) {
          console.warn(`⚠️ No weather data found for date ${dayForecast?.date}`);
        }

        // Only call getSuggestionsByDay if activities and forecast exist
        let suggestions = { perfect: [], good: [] };
        if (activities.length > 0 && weather) {
          suggestions = getSuggestionsByDay(activities, interests, weather);
        }

        console.log(`Suggestions for ${dayForecast?.date}`, suggestions);

        return (
          <div key={dayForecast.date}>
            <h2>{dayForecast.date}</h2>
            <div>
              {/* Render suggestions here */}
              <p>Perfect: {suggestions.perfect.length > 0
                ? suggestions.perfect.map((a: any) => a.name).join(', ')
                : 'None'}</p>
              <p>Good: {suggestions.good.length > 0
                ? suggestions.good.map((a: any) => a.name).join(', ')
                : 'None'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Home;
