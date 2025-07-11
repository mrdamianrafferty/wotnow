import React, { useState } from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';

const Home: React.FC = () => {
  const { preferences, setPreferences } = useUserPreferences();
  const location = preferences.location;
  const [inputLocation, setInputLocation] = useState(location?.name || '');

  const handleSaveLocation = async () => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputLocation)}&limit=1&appid=${import.meta.env.VITE_OPENWEATHER_KEY}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setPreferences({ ...preferences, location: { name: inputLocation, lat, lon } });
      } else {
        setPreferences({ ...preferences, location: { name: inputLocation } });
      }
    } catch {
      setPreferences({ ...preferences, location: { name: inputLocation } });
    }
  };

  return (
    <>
      <header className="home-header">
        <h1>WotNow</h1>
        <p>
          Current location: <strong>{location?.name || 'No location set'}</strong>
        </p>
        <div className="location-input">
          <input
            type="text"
            value={inputLocation}
            onChange={e => setInputLocation(e.target.value)}
            placeholder="Enter city name"
          />
          <button onClick={handleSaveLocation}>Save</button>
        </div>
      </header>
      {/* Rest of the Home component */}
    </>
  );
};

export default Home;
