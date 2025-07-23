// src/utils/weekdayScoring.ts
export function applyWeekdayBoost(
  activity: ActivityType,
  today: string
): number {
  // Only boost for specific indoor social activities
  if (activity.id === 'going_to_pub' && today === 'Friday') return 1.2;
  if (activity.id === 'watch_a_movie' && today === 'Wednesday') return 1.1;
  return 1.0;
}
