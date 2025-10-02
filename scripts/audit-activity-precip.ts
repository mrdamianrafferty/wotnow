/*
 Audit precipitation/snow logic across activities.
 - Report activities where goodConditions allow rain (>0) or omit precipitation
 - Report activities where perfectConditions allow rain (>0)
 - Report non-snow activities where good/perfect include explicit snow-related conditions
*/

import { activityTypes } from '../data/activityTypes';

function isWaterSport(activity: any): boolean {
  return activity.secondaryCategory === 'Water Sports';
}
function isSnowSport(activity: any): boolean {
  return activity.secondaryCategory === 'Snow Sports';
}

function getConds(arr?: string[]): string[] {
  return Array.isArray(arr) ? arr : [];
}

function extractPrecipConds(conditions: string[]): string[] {
  return conditions.filter((c) => /\bprecipitation\b/i.test(c));
}

// Determine if a single precipitation condition allows measurable rain (> ~0.9mm)
function condAllowsRain(precipCond: string): boolean {
  const c = precipCond.replace(/\s+/g, '').toLowerCase();
  // exact zero
  if (c === 'precipitation=0' || c === 'precipitation==0') return false;

  // < or <=
  const lt = c.match(/^precipitation<(=)?([0-9]*\.?[0-9]+)/);
  if (lt) {
    const val = parseFloat(lt[2]);
    return !(val < 1); // if <1 then treat as effectively no rain
  }

  // range =a..b
  const range = c.match(/^precipitation=([0-9]*\.?[0-9]+)\.\.([0-9]*\.?[0-9]+)/);
  if (range) {
    const min = parseFloat(range[1]);
    const max = parseFloat(range[2]);
    // if both bounds are <1, treat as effectively dry
    return !(max < 1 && min >= 0);
  }

  // > or >= always allows rain
  if (/^precipitation>(=)?/.test(c)) return true;

  // = some positive value
  const eq = c.match(/^precipitation=([0-9]*\.?[0-9]+)/);
  if (eq) {
    const val = parseFloat(eq[1]);
    return val > 0.9; // treat ~1mm or more as rain-allowing
  }

  // Unknown forms -> assume allows rain, be conservative
  return true;
}

function anyAllowsRain(precipConds: string[]): boolean {
  return precipConds.some(condAllowsRain);
}

function hasSnowConditions(conditions: string[]): boolean {
  return conditions.some((c) => /\b(snow|snowdepth|freshsnow|snowfall)\b/i.test(c));
}

function formatActivity(a: any): string {
  return `${a.name} [${a.id}] (${a.category}${a.secondaryCategory ? ' / ' + a.secondaryCategory : ''})`;
}

const reportLines: string[] = [];
reportLines.push('Activity precipitation/snow audit report');
reportLines.push('');

for (const a of activityTypes) {
  // Only audit weather-sensitive outdoor-ish activities; skip clearly indoor ones
  if (!a.weatherSensitive) continue;

  const good = getConds(a.goodConditions);
  const perfect = getConds(a.perfectConditions);

  const goodPrecip = extractPrecipConds(good);
  const perfectPrecip = extractPrecipConds(perfect);

  const goodMissingPrecip = good.length > 0 && goodPrecip.length === 0;
  const perfectMissingPrecip = perfect.length > 0 && perfectPrecip.length === 0;

  const goodAllows = goodPrecip.length > 0 && anyAllowsRain(goodPrecip);
  const perfectAllows = perfectPrecip.length > 0 && anyAllowsRain(perfectPrecip);

  const nonSnowActivity = !isSnowSport(a);
  const snowFlags = (nonSnowActivity && (hasSnowConditions(good) || hasSnowConditions(perfect)));

  const needsReport = goodMissingPrecip || goodAllows || perfectAllows || snowFlags;
  if (!needsReport) continue;

  const lines: string[] = [];
  lines.push(`- ${formatActivity(a)}`);
  if (goodMissingPrecip) lines.push('  - goodConditions: missing precipitation');
  if (goodAllows) lines.push(`  - goodConditions: allows rain via ${JSON.stringify(goodPrecip)}`);
  if (perfectAllows) lines.push(`  - perfectConditions: allows rain via ${JSON.stringify(perfectPrecip)}`);
  if (snowFlags) lines.push('  - includes snow-related conditions in good/perfect (non-snow activity)');

  // Skip water sports from rain warnings if desired, but we still include them in the report as a reference
  reportLines.push(...lines);
}

// Summary
const totalAudited = activityTypes.filter((a) => a.weatherSensitive).length;
const totalReported = reportLines.filter((l) => l.startsWith('- ')).length;
reportLines.unshift(`Total audited activities: ${totalAudited}`);
reportLines.unshift(`Total flagged activities: ${totalReported}`);

console.log(reportLines.join('\n'));
