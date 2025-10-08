import { execSync } from 'node:child_process';
import { activityTypes } from '../data/activityTypes';

type Entry = { id: string; category?: string; secondaryCategory?: string };

function extractEntries(tsSource: string): Map<string, Entry> {
  const map = new Map<string, Entry>();
  // Match one activity object ending with "},"
  const entryRegex = /{\s*id:\s*['"]([^'"]+)['"]([\s\S]*?)}\s*,/g;
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(tsSource))) {
    const id = m[1];
    const block = m[2];
    const cat = /category:\s*['"]([^'"]+)['"]/.exec(block)?.[1];
    const sec = /secondaryCategory:\s*['"]([^'"]+)['"]/.exec(block)?.[1];
    map.set(id, { id, category: cat, secondaryCategory: sec });
  }
  return map;
}

function main() {
  const hash = process.argv[2];
  if (!hash) {
    console.error('Usage: tsx scripts/compareActivities.ts <commit-ish>');
    process.exit(2);
  }

  // Load historical file from git
  let oldSource = '';
  try {
    oldSource = execSync(`git show ${hash}:data/activityTypes.ts`, { encoding: 'utf8' });
  } catch (e) {
    console.error(`Could not read data/activityTypes.ts at ${hash}. Is the path correct?`);
    process.exit(2);
  }

  const oldMap = extractEntries(oldSource);
  const newMap = new Map(activityTypes.map(a => [a.id, { id: a.id, category: a.category, secondaryCategory: a.secondaryCategory }]));

  const oldIds = new Set(oldMap.keys());
  const newIds = new Set(newMap.keys());

  const added = [...newIds].filter(x => !oldIds.has(x)).sort();
  const removed = [...oldIds].filter(x => !newIds.has(x)).sort();
  const common = [...newIds].filter(x => oldIds.has(x)).sort();

  const changedCat: Entry[] = [];
  const changedSec: Entry[] = [];

  for (const id of common) {
    const o = oldMap.get(id)!;
    const n = newMap.get(id)!;
    if (o.category !== n.category) changedCat.push({ id, category: `${o.category} → ${n.category}` });
    if (o.secondaryCategory !== n.secondaryCategory) changedSec.push({ id, secondaryCategory: `${o.secondaryCategory} → ${n.secondaryCategory}` });
  }

  console.log(`Compare activities vs ${hash}`);
  console.log(`Old count: ${oldIds.size}`);
  console.log(`New count: ${newIds.size}\n`);

  console.log(`Added (${added.length}):`, added);
  console.log(`Removed (${removed.length}):`, removed);

  console.log(`\nCategory changes (${changedCat.length}):`);
  changedCat.slice(0, 200).forEach(e => console.log(` - ${e.id}: ${e.category}`));

  console.log(`\nSecondary category changes (${changedSec.length}):`);
  changedSec.slice(0, 200).forEach(e => console.log(` - ${e.id}: ${e.secondaryCategory}`));
}

main();