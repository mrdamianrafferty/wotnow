#!/usr/bin/env node
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'speciesImageMap.ts');
if (!fs.existsSync(file)) {
  console.error('speciesImageMap.ts not found at', file);
  process.exit(1);
}

const src = fs.readFileSync(file, 'utf8');
const regex = /slug:\s*'([^']+)'\s*,\s*image:\s*'([^']+)'/g;
let outSql = 'BEGIN;\n';
let m;
while ((m = regex.exec(src))) {
  const slug = m[1].replace(/'/g, "''");
  const img = m[2];
  outSql += `UPDATE public.species SET image_url='https://www.godaisy.io${img}' WHERE slug='${slug}' AND (image_url IS NULL OR image_url='');\n`;
}
outSql += 'COMMIT;\n';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const outDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = process.env.OUT_SQL_FILE || path.join(outDir, 'sync-species-images.sql');

if (!apply) {
  fs.writeFileSync(outPath, outSql, 'utf8');
  console.log('Wrote SQL to', outPath);
  console.log('\nPreview the SQL and when ready run:');
  console.log('  export DATABASE_URL="<your db>"');
  console.log('  node scripts/sync-species-images.cjs --apply');
  process.exit(0);
}

try {
  const psql = process.env.PSQL_PATH || '/opt/homebrew/opt/libpq/bin/psql';
  const db = process.env.DATABASE_URL;
  if (!db) {
    console.error('DATABASE_URL not set. Export it before running.');
    process.exit(2);
  }
  cp.execFileSync(psql, [db, '-v', 'ON_ERROR_STOP=1'], { input: outSql, stdio: 'inherit' });
  console.log('\nSync complete.');
} catch (err) {
  console.error(err && err.message ? err.message : err);
  process.exit(3);
}
