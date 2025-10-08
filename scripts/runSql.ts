#!/usr/bin/env tsx
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import process from 'process';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
dotenv.config();

async function main() {
  const [fileArg] = process.argv.slice(2);
  if (!fileArg) {
    console.error('Usage: tsx scripts/runSql.ts <path-to-sql>');
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(absolutePath)) {
    console.error(`SQL file not found: ${absolutePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(absolutePath, 'utf-8');
  if (!sql.trim()) {
    console.error('SQL file is empty.');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
  }

  const endpoint = new URL('/postgres/v1/query', supabaseUrl).toString();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Supabase query failed (${response.status}): ${text}`);
    process.exit(1);
  }

  const data = await response.json();
  console.info('Supabase query executed successfully.');
  if (data?.length) {
    console.info(JSON.stringify(data, null, 2));
  }
}

main().catch((error) => {
  console.error('Unexpected error while running SQL', error);
  process.exit(1);
});
