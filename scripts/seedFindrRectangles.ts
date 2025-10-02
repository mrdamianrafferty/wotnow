#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { FALLBACK_RECTANGLE_OPTIONS } from '../lib/findr/fallbackRectangles';

const TABLE_NAME = 'findr_rectangles';
const BATCH_SIZE = 100;

type UpsertRow = {
  rectangle_code: string;
  region: string;
  center_lat: number;
  center_lon: number;
  distance_to_shore_km?: number | null;
  is_coastal: boolean;
};

function chunk<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const rows: UpsertRow[] = FALLBACK_RECTANGLE_OPTIONS.map((option) => ({
    rectangle_code: option.code,
    region: option.region,
    center_lat: option.centerLat,
    center_lon: option.centerLon,
    distance_to_shore_km: option.distanceToShoreKm ?? null,
    is_coastal: true,
  }));

  let totalUpserted = 0;
  for (const batch of chunk(rows, BATCH_SIZE)) {
    const { error } = await client.from(TABLE_NAME).upsert(batch, {
      onConflict: 'rectangle_code',
    });

    if (error) {
      console.error(`Failed to upsert batch starting with ${batch[0]?.rectangle_code ?? 'unknown'}`, error);
      process.exit(1);
    }

    totalUpserted += batch.length;
    console.info(`Upserted ${batch.length} rectangles (running total ${totalUpserted})`);
  }

  console.info(`All done! ${totalUpserted} rectangles now stored in ${TABLE_NAME}.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error seeding rectangles', error);
    process.exit(1);
  });
}
