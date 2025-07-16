import React, { useEffect, useState } from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';

type Event = {
  id: string;
  name: string;
  date: string;
  venue: string;
  city: string;
  url: string;
};

// Mapping from preference key to Eventbrite query parameters
const EVENT_MAPPINGS: Record<string, {
  label: string;
  category: number;
  format?: number;
  keywords?: string;
  radius?: string;
}> = {
  // 🎵 Music
  live_music: { label: 'Live Music', category: 103, format: 6 },
  music_festivals: { label: 'Music Festivals', category: 103, format: 7 },
  dj_dance: { label: 'DJ / Dance Events', category: 103, format: 5, keywords: 'DJ OR dance OR club' },
  local_music: { label: 'Local Music Scene', category: 103, format: 6, radius: '25km' },

  // 🎭 Arts & Theatre
  theatre_performance: { label: 'Theatre & Performance', category: 105, keywords: 'theatre OR play OR drama' },
  comedy_entertainment: { label: 'Comedy & Entertainment', category: 105, format: 5, keywords: 'comedy OR stand-up OR improv' },
  art_exhibitions: { label: 'Art Exhibitions & Galleries', category: 105, keywords: 'exhibition OR gallery' },
  dance_movement: { label: 'Dance & Movement', category: 105, format: 6, keywords: 'dance OR ballet OR contemporary' },
  film_media: { label: 'Film & Media Events', category: 104, format: 9 },

  // 🏟️ Sports
  competitive_sports: { label: 'Competitive Sports', category: 108, format: 12 },
  fitness_wellness: { label: 'Fitness & Wellness', category: 107, format: 11 },
  running_cycling: { label: 'Running & Cycling', category: 108, format: 12, keywords: 'run OR cycle OR marathon' },
  outdoor_adventures: { label: 'Outdoor Adventures', category: 109, format: 11 },
  team_sports_social: { label: 'Team Sports & Social', category: 108, format: 4, keywords: 'football OR basketball' }
};

const EventsPage: React.FC = () => {
  const { preferences } = useUserPreferences();
  const city = preferences.location.name || 'London';

  const selectedKeys = [
    ...(preferences.eventPreferences?.musicCategories || []),
    ...(preferences.eventPreferences?.artsCategories || []),
    ...(preferences.eventPreferences?.sportsCategories || [])
  ];

  const [loading, setLoading] = useState(true);
  const [eventsByCategory, setEventsByCategory] = useState<Record<string, Event[]>>({});

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const results: Record<string, Event[]> = {};

      for (const key of selectedKeys) {
        const config = EVENT_MAPPINGS[key];
        if (!config) continue;

        const params = new URLSearchParams();
        params.set('city', city);
        params.set('category', String(config.category));
        if (config.format) params.set('format', String(config.format));
        if (config.keywords) params.set('keywords', config.keywords);
        if (config.radius) params.set('radius', config.radius);
        else params.set('radius', '100km'); // default

        try {
          const res = await fetch(`/api/events?${params.toString()}`);
          const json = await res.json();
          if (Array.isArray(json.events)) {
            results[key] = json.events;
          }
        } catch (err) {
          console.warn(`Failed to load events for ${key}`, err);
          results[key] = [];
        }
      }

      setEventsByCategory(results);
      setLoading(false);
    };

    if (selectedKeys.length > 0) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [city, selectedKeys]);

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Events around {city}</h1>
      <p style={{ color: '#6b7280', marginTop: 4 }}>Showing what's on from Eventbrite within 100km</p>

      {loading && <p>Loading events...</p>}
      {!loading && selectedKeys.length === 0 && (
        <p style={{ marginTop: 32 }}>No event types selected in your preferences. <br />You can choose your interests on the <strong>Interests</strong> page.</p>
      )}

      {!loading && selectedKeys.map(key => {
        const config = EVENT_MAPPINGS[key];
        const events = eventsByCategory[key] || [];

        return (
          <section key={key} style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>{config?.label}</h2>
            {events.length === 0 ? (
              <p style={{ marginTop: 8, fontStyle: 'italic' }}>No events found for this category.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
                {events.map(ev => (
                  <li key={ev.id} style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: 8
                  }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: 6 }}>{ev.name}</h3>
                    <p style={{ fontSize: 14, color: '#555' }}>
                      {new Date(ev.date).toLocaleDateString()} at {ev.venue}
                    </p>
                    <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#2563eb' }}>
                      View Event →
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </main>
  );
};

export default EventsPage;
