import React, { useState, useEffect } from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';

const Venues: React.FC = () => {
  const { preferences, setPreferences } = useUserPreferences();
  const [location, setLocation] = useState(preferences.location?.name || '');
  const [selectedVenues, setSelectedVenues] = useState<string[]>(preferences.venues || []);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(preferences.genres || []);
  const [selectedSegment, setSelectedSegment] = useState(preferences.segment || 'Music');
  const [message, setMessage] = useState('');

  type Venue = { id: string; name: string };
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [error, setError] = useState('');

  const availableGenres = [
    'Pop', 'Rock', 'Hip-Hop/Rap', 'Dance/Electronic', 'Jazz', 'Folk', 'Classical', 'Undefined'
  ];

  const availableSegments = ['All', 'Music', 'Sports', 'Arts & Theatre'];

  const toggleSelection = (value: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(value)) {
      setter(list.filter(v => v !== value));
    } else {
      setter([...list, value]);
    }
  };

  // UPDATED: handleSave with geocoding
  const handleSave = async () => {
    let updatedLocation = { name: location };
    try {
      const geoResp = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_KEY}`
      );
      const geoData = await geoResp.json();
      if (geoData[0] && geoData[0].lat && geoData[0].lon) {
        updatedLocation = {
          name: location,
          lat: geoData[0].lat,
          lon: geoData[0].lon,
        };
      }
    } catch (err) {
      // keep just the city name if geocoding fails
    }
    setPreferences({
      ...preferences,
      location: updatedLocation,
      venues: selectedVenues,
      genres: selectedGenres,
      segment: selectedSegment,
    });
    setMessage('Preferences saved!');
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchVenuesForCity = async (cityOverride?: string, segmentOverride?: string) => {
    const cityToFetch = typeof cityOverride === 'string' ? cityOverride : location;
    const segmentToFetch = typeof segmentOverride === 'string' ? segmentOverride : selectedSegment;

    if (!cityToFetch.trim() || cityToFetch.trim().toLowerCase() === 'current location') {
      setError('Please enter a valid city name.');
      return;
    }

    setLoadingVenues(true);
    setError('');
    try {
      const params = new URLSearchParams({ city: cityToFetch });
      if (segmentToFetch && segmentToFetch !== 'All') {
        params.append('category', segmentToFetch);
      }
      const res = await fetch(`/api/getVenues?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (data.venues) {
        setAvailableVenues(data.venues.map((v: any) => ({ id: v.id, name: v.name })));
      } else {
        setAvailableVenues([]);
        setError(data.error || 'No venues found.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch venues.');
    } finally {
      setLoadingVenues(false);
    }
  };

  useEffect(() => {
    if (preferences.location?.name) {
      setLocation(preferences.location.name);
    }
    if (preferences.segment) {
      setSelectedSegment(preferences.segment);
    }
    if (preferences.venues) {
      setSelectedVenues(preferences.venues);
    }
    if (preferences.genres) {
      setSelectedGenres(preferences.genres);
    }
  }, [preferences]);

  useEffect(() => {
    setSelectedVenues(selectedVenues.filter(v =>
      availableVenues.some(av => av.name === v)
    ));
  }, [availableVenues]);

  return (
    <div className="venues-page">
      <h1>Where do you go for a good time?</h1>
      <div>
        <label>City or Town: </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter your city"
        />
        <button onClick={() => fetchVenuesForCity()} disabled={loadingVenues}>
          {loadingVenues ? 'Loading…' : 'Update Venues'}
        </button>
      </div>

      <div>
        <h2>Keep an eye on your favourite venues</h2>
        <label>
          <input
            type="checkbox"
            checked={availableVenues.length > 0 && selectedVenues.length === availableVenues.length}
            indeterminate={selectedVenues.length > 0 && selectedVenues.length < availableVenues.length ? 'true' : undefined}
            onChange={e => {
              if (e.target.checked) {
                setSelectedVenues(availableVenues.map(v => v.name));
              } else {
                setSelectedVenues([]);
              }
            }}
          />
          Select All
        </label>
        {loadingVenues ? <p>Loading venues…</p> : error ? <p style={{ color: 'red' }}>{error}</p> : (
          availableVenues.length === 0 ? (
            <p>No venues available. Enter a location.</p>
          ) : (
            availableVenues.map(venue => (
              <label key={venue.id}>
                <input
                  type="checkbox"
                  checked={selectedVenues.includes(venue.name)}
                  onChange={() => toggleSelection(venue.name, selectedVenues, setSelectedVenues)}
                />
                {venue.name}
              </label>
            ))
          )
        )}
      </div>

      <button onClick={handleSave}>Save Preferences</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Venues;
