import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function extractSchema() {
  console.log('# Database Schema Extraction\n');

  // Query each table and examine the returned data
  const tables = {
    species: 'species',
    ices_rectangles: 'ices_rectangles',
    findr_conditions_latest: 'findr_conditions_latest',
    moon_cache: 'moon_cache',
    copernicus_data: 'copernicus_data',
    findr_prediction_sessions: 'findr_prediction_sessions',
    user_favourites: 'user_favourites',
  };

  for (const [name, table] of Object.entries(tables)) {
    console.log(`\n## ${name}\n`);

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log(`❌ Error: ${error.message}\n`);
      continue;
    }

    if (data) {
      console.log('Columns:', Object.keys(data).join(', '));
      console.log('\nSample data types:');
      for (const [key, value] of Object.entries(data)) {
        const type = value === null ? 'NULL' : typeof value;
        const sample = value === null ? 'null' : Array.isArray(value) ? `[${value.length} items]` : JSON.stringify(value).substring(0, 50);
        console.log(`  ${key}: ${type} (${sample})`);
      }
    } else {
      console.log('⚠️ No data in table\n');
    }
  }
}

extractSchema().catch(console.error);
