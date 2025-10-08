import { activityTypes } from '../data/activityTypes';

const stubs = activityTypes.filter(activity => {
  if (!activity.weatherSensitive) return false;

  const buckets = [
    activity.poorConditions,
    activity.fairConditions,
    activity.goodConditions,
    activity.perfectConditions,
  ];

  const hasAnyConditions = buckets.some(list => Array.isArray(list) && list.length > 0);

  return !hasAnyConditions;
});

if (stubs.length === 0) {
  console.log('No weather-sensitive activities lacking condition arrays.');
} else {
  console.log('Activities flagged as stubs (weatherSensitive=true but missing condition arrays):');
  for (const activity of stubs) {
    console.log(` - ${activity.id} (${activity.name}) [category: ${activity.category}]`);
  }
}
