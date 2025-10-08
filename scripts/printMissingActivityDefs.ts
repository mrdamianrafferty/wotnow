import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { activityTypes } from '../data/activityTypes';

function extractObjectsById(tsSource: string): Map<string, string> {
  const map = new Map<string, string>();
  const entryRegex = /({\s*id:\s*['"]([^'"]+)['"][\s\S]*?}\s*,)/g;
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(tsSource))) {
    const fullObjWithComma = m[1];
    const id = m[2];
    map.set(id, fullObjWithComma.trim());
  }
  return map;
}

function main() {
  const hash = process.argv[2];
  const outFile = process.argv[3]; // optional output path

  if (!hash) {
    console.error('Usage: tsx scripts/printMissingActivityDefs.ts <commit-ish> [output-file]');
    process.exit(2);
  }

  // Load historical file from git
  let oldSource = '';
  try {
    oldSource = execSync(`git show ${hash}:data/activityTypes.ts`, { encoding: 'utf8' });
  } catch {
    console.error(`Could not read data/activityTypes.ts at ${hash}. Is the path correct?`);
    process.exit(2);
  }

  const oldMap = extractObjectsById(oldSource);
  const currentIds = new Set(activityTypes.map(a => a.id));
  const missingIds = Array.from(oldMap.keys()).filter(id => !currentIds.has(id)).sort();

  if (missingIds.length === 0) {
    console.log('No missing activities. Nothing to backfill.');
    process.exit(0);
  }

  const header = `// Auto-generated backfill from ${hash}\n// Paste these object literals into data/activityTypes.ts inside the exported array.\n`;
  const body = missingIds.map(id => oldMap.get(id)).join('\n');
  const payload = `${header}\n${body}\n`;

  if (outFile) {
    const path = join(process.cwd(), outFile);
    writeFileSync(path, payload, { encoding: 'utf8' });
    console.log(`Wrote ${missingIds.length} missing ActivityType definitions to ${outFile}`);
  } else {
    console.log(payload);
  }
}

main();