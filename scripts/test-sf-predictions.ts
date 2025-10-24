// Test San Francisco predictions
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function test() {
  console.log('Testing San Francisco (37.7°N, -122.4°W)...\n');

  const { data, error } = await supabase.rpc(
    'get_global_fishing_predictions',
    {
      user_lat: 37.7,
      user_lon: -122.4,
      target_date: '2025-10-24',
      p_lang: 'en',
    }
  );

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  const count = data ? data.length : 0;
  console.log(`✅ Returned ${count} predictions\n`);

  if (data && data.length > 0) {
    const first = data[0];
    console.log('First prediction details:');
    console.log(`  Species: ${first.name_en}`);
    console.log(`  Grid: ${first.grid_cell_id}`);
    console.log(`  Confidence: ${first.confidence}%`);
    console.log(`  Has Environmental Data: ${first.has_environmental_data}`);
    console.log(`  Data Source: ${first.data_source}`);
    console.log(`  Biogeographic Regions: ${first.biogeographic_regions}`);

    console.log('\n\nFirst 5 species:');
    data.slice(0, 5).forEach((p: any, i: number) => {
      console.log(`  ${i + 1}. ${p.name_en} - Confidence: ${p.confidence}%`);
    });
  }
}

test();
