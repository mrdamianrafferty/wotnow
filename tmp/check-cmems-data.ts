// Check CMEMS data availability for rectangle 31F1
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
  // Check findr_conditions_latest for 31F1
  const { data: conditions, error: condError } = await supabase
    .from('findr_conditions_latest')
    .select('*')
    .eq('rectangle_code', '31F1')
    .maybeSingle();

  console.log('\n=== findr_conditions_latest for 31F1 ===');
  if (condError) {
    console.error('Error:', condError);
  } else if (!conditions) {
    console.log('❌ No data found');
  } else {
    console.log('✅ Found data:');
    console.log({
      rectangle_code: conditions.rectangle_code,
      sea_temp_c: conditions.sea_temp_c,
      salinity_psu: conditions.salinity_psu,
      kd490: conditions.kd490,
      eastward_velocity: conditions.eastward_velocity,
      northward_velocity: conditions.northward_velocity,
      fetched_at: conditions.fetched_at,
      data_date: conditions.data_date,
    });
  }

  // Check copernicus_data for 31F1
  const { data: copernicus, error: copError } = await supabase
    .from('copernicus_data')
    .select('*')
    .eq('rectangle_code', '31F1')
    .order('data_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('\n=== copernicus_data for 31F1 (latest) ===');
  if (copError) {
    console.error('Error:', copError);
  } else if (!copernicus) {
    console.log('❌ No data found');
  } else {
    console.log('✅ Found data:');
    console.log({
      rectangle_code: copernicus.rectangle_code,
      temperature_c: copernicus.temperature_c,
      salinity_psu: copernicus.salinity_psu,
      kd490: copernicus.kd490,
      uo: copernicus.uo,
      vo: copernicus.vo,
      fetched_at: copernicus.fetched_at,
      data_date: copernicus.data_date,
    });
  }
}

checkData().catch(console.error);
