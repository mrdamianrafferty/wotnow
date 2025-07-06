import React from 'react';
import { Link } from 'react-router-dom';
import { useUserPreferences } from '../context/UserPreferencesContext';

const Home: React.FC = () => {
  const { preferences } = useUserPreferences();
  const { location, scheduledActivities } = preferences;

  return (
    <div>
      <nav>
        <ul className="flex space-x-4">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/interests">Interests</Link></li>
          <li><Link to="/next-few-days">Next Few Days</Link></li>
          <li><Link to="/location">Location</Link></li>
        </ul>
      </nav>

      <section className="mt-6 space-y-4">
        <h1 className="text-2xl font-bold">Welcome to WotNow</h1>

        <div>
          <strong>Location:</strong> {location || 'Not set yet'}{' '}
          <Link to="/location" className="underline text-blue-600">Change location</Link>
        </div>

        <div>
          <strong>Current Weather:</strong> 🌤️ 72°F, Partly Cloudy
        </div>

        <div>
          <h2 className="text-xl font-semibold">Your Upcoming Activities</h2>
          {(scheduledActivities || []).length > 0 ? (
            <ul className="list-disc list-inside">
              {scheduledActivities.map(({ id, name, time }) => (
                <li key={id}>
                  {name} at {time}
                </li>
              ))}
            </ul>
          ) : (
            <p>No activities scheduled.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;