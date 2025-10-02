import { activityTypes } from '../data/activityTypes';
import { MARINE_ACTIVITY_IDS } from '../data/activityConstants';

function hasKeyword(conditions: string[] | undefined, keywords: string[]): boolean {
  if (!conditions) return false;
  return conditions.some(condition => keywords.some(keyword => condition.includes(keyword)));
}

const issues: Array<{ id: string; name: string; waves: boolean; wind: boolean; visibility: boolean }> = [];

for (const id of MARINE_ACTIVITY_IDS) {
  const activity = activityTypes.find(item => item.id === id);
  if (!activity) {
    console.warn(`Activity ${id} not found in catalogue.`);
    continue;
  }

  const poorConditions = activity.poorConditions ?? [];
  const waves = hasKeyword(poorConditions, ['waveHeight', 'swell', 'seaState']);
  const wind = hasKeyword(poorConditions, ['windSpeed', 'gust', 'windRelative']);
  const visibility = hasKeyword(poorConditions, ['visibility', 'fog']);

  if (!waves || !wind || !visibility) {
    issues.push({ id: activity.id, name: activity.name, waves, wind, visibility });
  }
}

if (!issues.length) {
  console.log('All marine activities include wave, wind, and visibility warnings in poorConditions.');
} else {
  console.log('Marine activities missing specific safety warnings:');
  for (const issue of issues) {
    const missing: string[] = [];
    if (!issue.waves) missing.push('waves');
    if (!issue.wind) missing.push('wind');
    if (!issue.visibility) missing.push('visibility');
    console.log(` - ${issue.id} (${issue.name}): missing ${missing.join(', ')}`);
  }
}
