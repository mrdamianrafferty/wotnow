#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('⚠️  Missing required environment variables.');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment or in a .env file at the project root.');
    console.error('\nExample (macOS / Linux):');
    console.error('  SUPABASE_URL="https://xyz.supabase.co" SUPABASE_SERVICE_ROLE_KEY="service_role_key" npx tsx scripts/check-data-coverage.ts');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false } });

  try {
    const { count: totalCount } = await supabase
      .from('grid_conditions_latest')
      .select('*', { count: 'exact', head: true });

    const { count: noaaCount } = await supabase
      .from('grid_conditions_latest')
      .select('*', { count: 'exact', head: true })
      .contains('sources', ['ncdcOisst21Agg_LonPM180.sst']);

    const { count: mockCount } = await supabase
      .from('grid_conditions_latest')
      .select('*', { count: 'exact', head: true })
      .contains('sources', ['MOCK_DATA_FOR_TESTING']);

    console.log('📊 Data Coverage Summary:');
    const total = typeof totalCount === 'number' ? totalCount : 0;
    const noaa = typeof noaaCount === 'number' ? noaaCount : 0;
    const mock = typeof mockCount === 'number' ? mockCount : 0;
    const pct = (total / 65884) * 100;
    const realPct = (noaa + mock) === 0 ? 0 : ((noaa / (noaa + mock)) * 100);

    console.log(`  Total grids with data: ${total} / 65,884 (${pct.toFixed(2)}%)`);
    console.log(`  Real NOAA grids: ${noaa}`);
    console.log(`  Mock data grids: ${mock}`);
    console.log(`  Real data coverage: ${realPct.toFixed(1)}%`);
  } catch (err: any) {
    console.error('Error querying Supabase:', err.message || err);
    process.exit(2);
  }
}

void main();
