// Example integration of PollenWarning component
// This shows how to add pollen warnings to existing weather displays

import React from 'react';
import PollenWarning from '../components/PollenWarning';
import '../styles/PollenWarning.css';

// Example 1: Add to a weather day card
function WeatherDayCard({ day }: { day: any }) {
  return (
    <div className="weather-day-card">
      <h3>{day.date}</h3>
      
      {/* Basic weather info */}
      <div className="weather-info">
        <span>Temperature: {day.temperature}°C</span>
        <span>Wind: {day.windSpeed} m/s</span>
        <span>Rain: {day.rain || 0} mm</span>
      </div>
      
      {/* Add pollen warning if levels are significant */}
      <PollenWarning pollen={day.pollen} mode="compact" />
      
      {/* Other weather details */}
    </div>
  );
}

// Example 2: Add to forecast grid
function ForecastGrid({ forecast }: { forecast: any[] }) {
  return (
    <div className="forecast-grid">
      {forecast.map(day => (
        <div key={day.date} className="forecast-card">
          <h4>{day.date}</h4>
          
          {/* Weather basics */}
          <div className="weather-basics">
            <span>{day.temperature}°C</span>
            <span>{day.description}</span>
          </div>
          
          {/* Compact pollen warning for cards */}
          <PollenWarning pollen={day.pollen} mode="compact" />
        </div>
      ))}
    </div>
  );
}

// Example 3: Dedicated health warnings section
function HealthWarnings({ day }: { day: any }) {
  return (
    <div className="health-warnings">
      <h3>Health & Safety</h3>
      
      {/* Full pollen warning */}
      <PollenWarning pollen={day.pollen} mode="full" />
      
      {/* Other health warnings could go here */}
      {day.uvIndexMax > 7 && (
        <div className="uv-warning">
          <span>⚠️ High UV: {day.uvIndexMax} - Use sun protection</span>
        </div>
      )}
      
      {day.air?.euAqiMax > 100 && (
        <div className="air-quality-warning">
          <span>⚠️ Poor air quality - Limit outdoor activities</span>
        </div>
      )}
    </div>
  );
}

// Example 4: Activity-specific integration
function ActivityCard({ activity, day }: { activity: string; day: any }) {
  // This would use the pollen advice from buildReasons in activityHelpers
  // The pollen warnings are now automatically included in activity recommendations
  
  return (
    <div className="activity-card">
      <h4>{activity}</h4>
      
      {/* Activity score and reasons would include pollen warnings */}
      <div className="activity-score">
        {/* Score calculation includes pollen impact */}
      </div>
      
      {/* Reasons would include pollen advice from getPollenAdviceForActivity */}
      <div className="activity-reasons">
        {/* buildReasons() now includes pollen considerations automatically */}
      </div>
    </div>
  );
}

export { WeatherDayCard, ForecastGrid, HealthWarnings, ActivityCard };
