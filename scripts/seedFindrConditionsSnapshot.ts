#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { FALLBACK_CONDITIONS } from '../lib/findr/fallbackConditions';

const TABLE_NAME = 'findr_conditions_snapshots';

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

  const payload = FALLBACK_CONDITIONS;
  const capturedAt = new Date(payload.snapshot.capturedAt);

  const row = {
    rectangle_code: payload.rectangle.code,
    captured_at: capturedAt.toISOString(),
    sea_temp_c: payload.snapshot.marine.seaTemperatureC,
    chlorophyll_mg_m3: payload.snapshot.marine.chlorophyllMgM3,
    dissolved_oxygen_mg_l: payload.snapshot.marine.dissolvedOxygenMgL,
    salinity_psu: payload.snapshot.marine.salinityPsu,
    nitrate_umol_l: payload.snapshot.marine.nitrateUmolL,
    phosphate_umol_l: payload.snapshot.marine.phosphateUmolL,
    wave_height_m: payload.snapshot.marine.waveHeightM,
    wind_speed_kts: payload.snapshot.marine.windSpeedKts,
    wind_direction_deg: payload.snapshot.marine.windDirectionDeg,
    next_high_tide_iso: payload.snapshot.tides.nextHighIso,
    next_low_tide_iso: payload.snapshot.tides.nextLowIso,
    hourly_marine_json: payload.snapshot.hourly,
    daily_marine_json: payload.snapshot.daily,
    source: 'seed:fallback',
  } as const;

  const { error } = await client.from(TABLE_NAME).upsert(row, {
    onConflict: 'rectangle_code,captured_at',
  });

  if (error) {
    console.error('Failed to upsert fallback conditions snapshot', error);
    process.exit(1);
  }

  console.info(`Seeded ${TABLE_NAME} with fallback snapshot for rectangle ${payload.rectangle.code}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error seeding conditions snapshot', error);
    process.exit(1);
  });
}
