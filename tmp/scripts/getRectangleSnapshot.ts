#!/usr/bin/env tsx
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type HourlyEntry = {
  time?: string;
  waveHeightM?: number | null;
  windSpeedKts?: number | null;
  seaTemperatureC?: number | null;
  tideMeters?: number | null;
};

type DailyEntry = {
  label?: string;
  dateLabel?: string;
  waveHeightM?: number | null;
  seaTemperatureC?: number | null;
  windSpeedKts?: number | null;
  fishingScore?: number | null;
  summary?: string;
};

interface SnapshotRow {
  rectangle_code?: string;
  captured_at?: string;
  source?: string;
  sea_temp_c?: number | null;
  wave_height_m?: number | null;
  wind_speed_kts?: number | null;
  wind_direction_deg?: number | null;
  chlorophyll_mg_m3?: number | null;
  dissolved_oxygen_mg_l?: number | null;
  salinity_psu?: number | null;
  nitrate_umol_l?: number | null;
  phosphate_umol_l?: number | null;
  next_high_tide_iso?: string | null;
  next_low_tide_iso?: string | null;
  hourly_marine_json?: HourlyEntry[] | null;
  daily_marine_json?: DailyEntry[] | null;
}

function sanitizeCode(raw: string | undefined): string {
  if (!raw) return '21D8';
  return raw.trim().toUpperCase();
}

async function fetchLatestSnapshot(rectangleCode: string): Promise<SnapshotRow | null> {
  const { data, error } = await client
    .from('findr_conditions_latest')
    .select('*')
    .eq('rectangle_code', rectangleCode)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (data) return data;

  const { data: fallbackData, error: fallbackError } = await client
    .from('findr_conditions_snapshots')
    .select('*')
    .eq('rectangle_code', rectangleCode)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError) {
    throw fallbackError;
  }

  return fallbackData;
}

function printSnapshot(snapshot: SnapshotRow | null, rectangleCode: string) {
  if (!snapshot) {
    console.log(`No snapshot found for rectangle ${rectangleCode}.`);
    return;
  }

  const {
    captured_at,
    source,
    sea_temp_c,
    wave_height_m,
    wind_speed_kts,
    wind_direction_deg,
    chlorophyll_mg_m3,
    dissolved_oxygen_mg_l,
    salinity_psu,
    nitrate_umol_l,
    phosphate_umol_l,
    next_high_tide_iso,
    next_low_tide_iso,
    hourly_marine_json,
    daily_marine_json,
  } = snapshot;

  console.log(`Snapshot for rectangle ${rectangleCode}`);
  console.log('Captured at:', captured_at);
  console.log('Source:', source);
  console.log('Sea temp °C:', sea_temp_c ?? '—');
  console.log('Wave height m:', wave_height_m ?? '—');
  console.log('Wind speed kts:', wind_speed_kts ?? '—');
  console.log('Wind direction °:', wind_direction_deg ?? '—');
  console.log('Chlorophyll mg/m³:', chlorophyll_mg_m3 ?? '—');
  console.log('Dissolved oxygen mg/L:', dissolved_oxygen_mg_l ?? '—');
  console.log('Salinity PSU:', salinity_psu ?? '—');
  console.log('Nitrate µmol/L:', nitrate_umol_l ?? '—');
  console.log('Phosphate µmol/L:', phosphate_umol_l ?? '—');
  console.log('Next high tide:', next_high_tide_iso ?? '—');
  console.log('Next low tide:', next_low_tide_iso ?? '—');

  console.log('\nHourly marine sample (first 6 entries):');
  const hourlyEntries = Array.isArray(hourly_marine_json) ? hourly_marine_json.slice(0, 6) : [];
  console.table(hourlyEntries);

  console.log('\nDaily marine summary:');
  console.table(Array.isArray(daily_marine_json) ? daily_marine_json : []);
}

async function main() {
  const rectangleCode = sanitizeCode(process.argv[2]);
  try {
    const snapshot = await fetchLatestSnapshot(rectangleCode);
    printSnapshot(snapshot, rectangleCode);
  } catch (error) {
    console.error('Failed to fetch snapshot:', error);
    process.exit(1);
  }
}

main();
