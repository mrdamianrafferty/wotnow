import React, { useState, useEffect } from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';

const Venues: React.FC = () => {
  const { preferences, setPreferences } = useUserPreferences();
  const [location, setLocation] = useState(preferences.location?.name || '');
  const [selectedVenues, setSelectedVenues] = useState<string[]>(preferences.venues || []);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(preferences.genres || []);
  const [selectedSegment, setSelectedSegment] = useState(preferences.segment || '');
  const [message, setMessage] = useState('');

  type Venue = { id: string; name: string };
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [error, setError] = useState('');

  const availableGenres = [
    'Pop', 'Rock', 'Hip-Hop/Rap', 'Dance/Electronic', 'Jazz', 'Folk', 'Classical', 'Undefined'
  ];

  const availableSegments = ['Music', 'Sports', 'Arts & Theatre', 'Film', 'Miscellaneous'];

  const toggleSelection = (value: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(value)) {
      setter(list.filter(v => v !== value));
    } else {
      setter([...list, value]);
    }
  };

  const handleSave = () => {
    setPreferences({
      ...preferences,
      location: { name: location },
      venues: selectedVenues,
      genres: selectedGenres,
      segment: selectedSegment
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
      params.append('category', segmentToFetch || '');
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
  }, [preferences.location, preferences.segment, preferences.venues, preferences.genres]);


  // If availableVenues changes and some selectedVenues are not present, remove them
  useEffect(() => {
    setSelectedVenues(selectedVenues.filter(v =>
      availableVenues.some(av => av.name === v)
    ));
  }, [availableVenues]);

  return (
    <div className="venues-page">
      <h1>Set Your Gigs Preferences</h1>
      <div>
        <label>Location:</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter your city"
        />
        <button onClick={fetchVenuesForCity} disabled={loadingVenues}>
          {loadingVenues ? 'Loading…' : 'Update Venues'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div>
        <h2>Select Category</h2>
        <label style={{ marginRight: '10px' }}>
          <input
            type="radio"
            name="segment"
            value=""
            checked={selectedSegment === ''}
            onChange={() => setSelectedSegment('')}
          />
          All
        </label>
        {availableSegments.map(segment => (
          <label key={segment} style={{ marginRight: '10px' }}>
            <input
              type="radio"
              name="segment"
              value={segment}
              checked={selectedSegment === segment}
              onChange={() => setSelectedSegment(segment)}
            />
            {segment}
          </label>
        ))}
      </div>

      <div>
        <h2>Select Venues</h2>
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
        {availableVenues.length === 0 ? (
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
        )}
      </div>

      <div>
        <h2>Select Genres</h2>
        <label>
          <input
            type="checkbox"
            checked={selectedGenres.length === availableGenres.length}
            indeterminate={selectedGenres.length > 0 && selectedGenres.length < availableGenres.length ? 'true' : undefined}
            onChange={e => {
              if (e.target.checked) {
                setSelectedGenres(availableGenres);
              } else {
                setSelectedGenres([]);
              }
            }}
          />
          Select All
        </label>
        {availableGenres.map(genre => (
          <label key={genre}>
            <input
              type="checkbox"
              checked={selectedGenres.includes(genre)}
              onChange={() => toggleSelection(genre, selectedGenres, setSelectedGenres)}
            />
            {genre}
          </label>
        ))}
      </div>

      <button onClick={handleSave}>Save Preferences</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Venues;
