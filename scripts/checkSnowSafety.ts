import { activityTypes } from '../data/activityTypes';

const SKIP_IDS = new Set<string>();

const issues: Array<{
  id: string;
  name: string;
  category: string;
  missing: string[];
}> = [];

for (const activity of activityTypes) {
  if (!activity.weatherSensitive) continue;
  if (SKIP_IDS.has(activity.id)) continue;

  const poorConditions = activity.poorConditions ?? [];
  const hasSnowDepth = poorConditions.some(condition => condition.includes('snowDepthCm'));
  const hasSnowfall = poorConditions.some(condition => condition.includes('snowfallRateMmH'));

  const missing: string[] = [];
  if (!hasSnowDepth) missing.push('snowDepthCm');
  if (!hasSnowfall) missing.push('snowfallRateMmH');

  if (missing.length) {
    issues.push({
      id: activity.id,
      name: activity.name,
      category: activity.category,
      missing
    });
  }
}

if (!issues.length) {
  console.log('All weather-sensitive activities include snowDepthCm and snowfallRateMmH in poorConditions.');
} else {
  console.log('Weather-sensitive activities missing snow safeguards:');
  for (const issue of issues) {
    console.log(
      ` - ${issue.id} (${issue.name}, ${issue.category}): missing ${issue.missing.join(', ')}`
    );
  }
}
