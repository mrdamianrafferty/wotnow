import type { ActivityType } from '../data/activities/types';

import * as team from '../data/activities/team';
import * as individual from '../data/activities/individual';
import * as watersports from '../data/activities/watersports';
import * as snow from '../data/activities/snow';
import * as ice from '../data/activities/ice';
import * as fishing from '../data/activities/fishing';
import * as cycling from '../data/activities/cycling';
import * as outdoor from '../data/activities/outdoor';
import * as nature from '../data/activities/nature';
import * as social from '../data/activities/social';
import * as wellness from '../data/activities/wellness';
import * as lifestyle from '../data/activities/lifestyle';

const moduleMap = {
  team,
  individual,
  watersports,
  snow,
  ice,
  fishing,
  cycling,
  outdoor,
  nature,
  social,
  wellness,
  lifestyle,
} satisfies Record<string, Record<string, unknown>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isActivity = (value: unknown): value is ActivityType =>
  isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';

function arraysFromModule(mod: Record<string, unknown>): ActivityType[][] {
  const out: ActivityType[][] = [];
  for (const value of Object.values(mod)) {
    if (Array.isArray(value) && value.every(isActivity)) {
      out.push(value as ActivityType[]);
    }
  }
  return out;
}

const dedupe = new Map<string, { activity: ActivityType; modules: string[] }>();

const report: Array<{ module: string; arrays: number; count: number }> = [];

for (const [moduleName, mod] of Object.entries(moduleMap)) {
  const arrays = arraysFromModule(mod);
  const flat = arrays.flat();

  report.push({ module: moduleName, arrays: arrays.length, count: flat.length });

  for (const activity of flat) {
    const existing = dedupe.get(activity.id);
    if (existing) {
      existing.modules.push(moduleName);
    } else {
      dedupe.set(activity.id, { activity, modules: [moduleName] });
    }
  }
}

const duplicates = Array.from(dedupe.values()).filter(entry => entry.modules.length > 1);

const total = report.reduce((sum, item) => sum + item.count, 0);

console.table(report);
console.log(`Total activities (including duplicates across modules): ${total}`);
console.log(`Unique activity ids: ${dedupe.size}`);

if (duplicates.length) {
  console.warn('Duplicate activity IDs found across modules:');
  for (const { activity, modules } of duplicates) {
    console.warn(` - ${activity.id} (${activity.name}) in modules: ${modules.join(', ')}`);
  }
} else {
  console.log('No duplicate activity IDs detected across modules.');
}
