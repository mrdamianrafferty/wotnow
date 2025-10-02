import { activityTypes } from '../data/activityTypes';

const HIGH_WIND_KEYWORDS = ['windSpeed>', 'gust>', 'windRelative'];

const issues: Array<{ id: string; name: string; category: string }> = [];

for (const activity of activityTypes) {
  if (!activity.weatherSensitive) continue;

  const poorConditions = activity.poorConditions ?? [];
  const hasHighWindGuard = poorConditions.some(condition =>
    HIGH_WIND_KEYWORDS.some(keyword => condition.includes(keyword))
  );

  if (!hasHighWindGuard) {
    issues.push({ id: activity.id, name: activity.name, category: activity.category });
  }
}

if (!issues.length) {
  console.log('All weather-sensitive activities include high-wind safeguards in poorConditions.');
} else {
  console.log('Weather-sensitive activities missing high-wind safeguards:');
  for (const issue of issues) {
    console.log(` - ${issue.id} (${issue.name}, ${issue.category})`);
  }
}
