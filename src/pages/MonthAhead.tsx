import React from 'react';
import { useUserPreferences } from '../context/UserPreferencesContext';

const Calendar: React.FC = () => {
  const { preferences } = useUserPreferences();
  const scheduled = preferences.scheduledActivities || [];

  // ...rest of the component logic using 'scheduled' instead of any undefined array
};

export default MonthAhead;