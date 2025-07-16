import React, { useEffect, useState } from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';

const Venues: React.FC = () => {
  const { preferences, setPreferences } = useUserPreferences();
  const [inputLocation, setInputLocation] = useState(preferences.location?.name || '');
  const [message, setMessage] = useState('');
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [error, setError] = useState('');

  const [availableVenues, setAvailableVenues] = useState<string[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<string[]>(preferences.venues || []);
  const [suggestedLocation, setSuggestedLocation] = useState(preferences.location);

  // Update venues based on city
  const fetchVenues = async (city: string) => {
    setLoadingVenues(true);
    setError('');

    try {
      const res = await fetch(`/api/eventVenues?city=${encodeURIComponent(city)}&radius=50km`);
      const json = await res.json();
      if (Array.isArray(json.venues) && json.venues.length > 0) {
        const names = json.venues.map((v: any) => v.name);
        setAvailableVenues(names);
      } else {
        setAvailableVenues([]);
        setError('No venues found for this location.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch venue data.');
    } finally {
      setLoadingVenues(false);
    }
  };

  // Load initial city locations once
  useEffect(() => {
    if (suggestedLocation?.name) {
      setInputLocation(suggestedLocation.name);
      fetchVenues(suggestedLocation.name);
    }
  }, []);

  // Update selectedVenues when available ones change
  useEffect(() => {
    setSelectedVenues(prev =>
      prev.filter(v => availableVenues.includes(v))
    );
  }, [availableVenues]);

  const handleSave = async () => {
    try {
      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputLocation)}&limit=1&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_KEY}`
      );
      const geoData = await geoRes.json();
      const res = geoData[0];

      const updatedLocation = res?.lat && res?.lon
        ? {
            name: inputLocation,
            lat: res.lat,
            lon: res.lon,
            countryCode: res.country
          }
        : { name: inputLocation };

      setPreferences(prev => ({
        ...prev,
        location: updatedLocation,
        venues: selectedVenues
      }));

      setSuggestedLocation(updatedLocation);
      setMessage('Preferences saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save location:', error);
      setMessage('Failed to update location. Try again.');
    }
  };

  const toggleVenue = (name: string) => {
    setSelectedVenues(prev =>
      prev.includes(name)
        ? prev.filter(v => v !== name)
        : [...prev, name]
    );
  };

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: 20 }}>🎯 Favorite Venues</h1>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.1rem' }}>Your location</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            fetchVenues(inputLocation);
          }}
        >
          <input
            type="text"
            value={inputLocation}
            onChange={e => setInputLocation(e.target.value)}
            placeholder="Enter a city or town"
            style={{ padding: '0.5rem', fontSize: '1rem', width: '70%' }}
          />
          <button
            type="submit"
            style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
            disabled={loadingVenues}
          >
            {loadingVenues ? 'Searching...' : 'Update'}
          </button>
        </form>
        {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem' }}>Select your favorite venues</h2>
        {availableVenues.length === 0 ? (
          <p>No venues found. Try another location.</p>
        ) : (
          <div style={{ marginTop: 16 }}>
            <label>
              <input
                type="checkbox"
                checked={selectedVenues.length === availableVenues.length}
                onChange={e =>
                  setSelectedVenues(
                    e.target.checked ? [...availableVenues] : []
                  )
                }
              />{" "}
              Select All
            </label>

            <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
              {availableVenues.map((name) => (
                <li key={name} style={{ marginBottom: 8 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedVenues.includes(name)}
                      onChange={() => toggleVenue(name)}
                    />{" "}
                    {name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <button
        onClick={handleSave}
        style={{
          marginTop: 24,
          background: '#059669',
          color: 'white',
          fontWeight: 'bold',
          padding: '10px 20px',
          border: 'none',
          borderRadius: 6,
        }}
      >
        Save Preferences
      </button>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}
    </main>
  );
};

export default Venues;
