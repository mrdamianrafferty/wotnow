import React, { useEffect, useState } from 'react';
import { activityTypes } from '../data/activityTypes';

const Calendar: React.FC = () => {
  const [calendar, setCalendar] = useState<any[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [dateTime, setDateTime] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    if (saved.length === 0) {
      const now = new Date();
      const dummy = [
        { activityName: 'Morning Run', dateTime: new Date(now.getTime() + 86400000).toISOString() },
        { activityName: 'Fly Fishing', dateTime: new Date(now.getTime() + 2 * 86400000).toISOString() },
      ];
      localStorage.setItem('calendarEvents', JSON.stringify(dummy));
      setCalendar(dummy);
    } else {
      setCalendar(saved);
    }
  }, []);

  const addEvent = () => {
    const updated = [...calendar, { activityName: newActivity, dateTime }];
    setCalendar(updated);
    localStorage.setItem('calendarEvents', JSON.stringify(updated));
    setNewActivity('');
    setDateTime('');
  };

  return (
    <div>
      <h2 className="text-xl mb-4">Your Calendar</h2>
      <ul>
        {calendar.map((event, idx) => (
          <li key={idx}>
            {event.activityName} – {new Date(event.dateTime).toLocaleString()}
          </li>
        ))}
      </ul>
      <h3 className="mt-4">Add New Activity</h3>
      <select value={newActivity} onChange={(e) => setNewActivity(e.target.value)} className="border p-2 mb-2 w-full">
        <option value="">Select Activity</option>
        {activityTypes.map((act) => (
          <option key={act.id} value={act.name}>{act.name}</option>
        ))}
      </select>
      <input
        type="datetime-local"
        value={dateTime}
        onChange={(e) => setDateTime(e.target.value)}
        className="border p-2 mb-2 w-full"
      />
      <button onClick={addEvent} className="bg-blue-500 text-white px-4 py-2">Add to Calendar</button>
    </div>
  );
};

export default Calendar;
