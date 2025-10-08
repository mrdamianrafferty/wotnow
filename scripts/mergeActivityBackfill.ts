import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

type ObjById = Map<string, string>;

function extractObjects(tsSource: string): ObjById {
  const map = new Map<string, string>();
  const entryRegex = /({\s*id:\s*['"]([^'"]+)['"][\s\S]*?}\s*,?)/g;
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(tsSource))) {
    const obj = m[1].trim();
    const id = m[2];
    map.set(id, ensureTrailingComma(obj));
  }
  return map;
}

function ensureTrailingComma(block: string) {
  const trimmed = block.trim();
  return trimmed.endsWith(',') ? trimmed : trimmed + ',';
}

function findArrayBounds(source: string, anchor: string) {
  const anchorIdx = source.indexOf(anchor);
  if (anchorIdx === -1) throw new Error(`Could not find anchor: ${anchor}`);
  const eqIdx = source.indexOf('=', anchorIdx);
  if (eqIdx === -1) throw new Error('Could not find "=" for activityTypes initializer');
  const bracketStart = source.indexOf('[', eqIdx);
  if (bracketStart === -1) throw new Error('Could not find "[" after "="');
  let depth = 0;
  for (let i = bracketStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    if (depth === 0) {
      return { start: bracketStart, end: i };
    }
  }
  throw new Error('Unbalanced brackets in activityTypes array.');
}

function main() {
  const backfillPath = process.argv[2] || 'data/activityTypes.backfill.txt';
  const activityFile = 'data/activityTypes.ts';
  if (!existsSync(backfillPath)) {
    console.error(`Backfill file not found: ${backfillPath}`);
    process.exit(2);
  }
  const backfillSrc = readFileSync(backfillPath, 'utf8');
  const currentSrc = readFileSync(activityFile, 'utf8');

  // Backup
  copyFileSync(activityFile, activityFile + '.bak');

  // Extract objects
  const backfillObjs = extractObjects(backfillSrc);
  if (backfillObjs.size === 0) {
    console.error('No objects found in backfill file. Aborting.');
    process.exit(2);
  }

  // Extract existing objects and their order from the array region
  const { start, end } = findArrayBounds(currentSrc, 'export const activityTypes');
  const arrayContent = currentSrc.slice(start + 1, end); // inside [ ... ]
  const existingObjs = extractObjects(arrayContent);

  // Preserve existing order
  const existingOrder: string[] = [];
  const orderRegex = /{\s*id:\s*['"]([^'"]+)['"][\s\S]*?}\s*,?/g;
  let m: RegExpExecArray | null;
  while ((m = orderRegex.exec(arrayContent))) {
    existingOrder.push(m[1]);
  }

  // Merge: replace duplicates with backfill versions; append new at end (alphabetical)
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const id of existingOrder) {
    const obj = backfillObjs.get(id) ?? existingObjs.get(id);
    if (obj) {
      merged.push(obj);
      seen.add(id);
    }
  }

  const newIds = Array.from(backfillObjs.keys()).filter(id => !seen.has(id)).sort();
  for (const id of newIds) {
    merged.push(backfillObjs.get(id)!);
    seen.add(id);
  }

  const newArrayBody = '\n  ' + merged.join('\n  ') + '\n';
  const newSource =
    currentSrc.slice(0, start + 1) + // up to '['
    newArrayBody +
    currentSrc.slice(end); // from ']' onwards

  writeFileSync(activityFile, newSource, 'utf8');
  console.log(
    `Merged ${backfillObjs.size} backfill entries into ${activityFile}. ` +
    `Replaced ${existingOrder.filter(id => backfillObjs.has(id)).length} and added ${newIds.length}.`
  );
  console.log(`Backup written to ${activityFile}.bak`);
}

main();