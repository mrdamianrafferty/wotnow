import React, { useState } from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';

const Location: React.FC = () => {
  const { preferences, setPreferences } = useUserPreferences();
  const [inputLocation, setInputLocation] = useState(preferences.location.name || '');

  const API_KEY = import.meta.env.VITE_OPENWEATHER_KEY;

  const handleSave = async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputLocation)}&limit=1&appid=${API_KEY}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setPreferences({ ...preferences, location: { name: inputLocation, lat, lon } });
      } else {
        // If no results, save just the name without lat/lon
        setPreferences({ ...preferences, location: { name: inputLocation } });
      }
    } catch (error) {
      // On error, save just the name without lat/lon
      setPreferences({ ...preferences, location: { name: inputLocation } });
    }
  };

  return (
    <div>
      <h1>Select Your Location</h1>
      <input
        type="text"
        value={inputLocation}
        onChange={e => setInputLocation(e.target.value)}
        placeholder="Enter city name"
      />
      <button onClick={handleSave}>Save</button>
      {preferences.location.name && (
        <p>
          Saved location: <strong>{preferences.location.name}</strong>
        </p>
      )}
    </div>
  );
};

export default Location;
