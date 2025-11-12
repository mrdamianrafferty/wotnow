import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Key tables we need to document
const KEY_TABLES = [
  'species',
  'ices_rectangles',
  'findr_conditions_latest',
  'moon_cache',
  'copernicus_data',
  'findr_prediction_sessions',
  'findr_prediction_impressions',
  'findr_catch_entries',
  'user_favourites',
  'user_location_preferences',
  'translation_cache',
];

async function extractSchema() {
  console.log('# Database Schema Reference\n');
  console.log('Generated:', new Date().toISOString());
  console.log('\n---\n');

  for (const tableName of KEY_TABLES) {
    console.log(`## Table: \`${tableName}\`\n`);

    // Query information_schema for column details
    const { data: columns, error } = await supabase
      .from('information_schema.columns' as any)
      .select('column_name, data_type, character_maximum_length, is_nullable, column_default, udt_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');

    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      continue;
    }

    if (!columns || columns.length === 0) {
      console.log('⚠️ Table not found or has no columns\n');
      continue;
    }

    console.log('| Column | Type | Length | Nullable | Default | UDT Name |');
    console.log('|--------|------|--------|----------|---------|----------|');

    for (const col of columns) {
      const length = col.character_maximum_length || '-';
      const nullable = col.is_nullable === 'YES' ? '✓' : '✗';
      const defaultVal = col.column_default ? `\`${col.column_default}\`` : '-';
      const udtName = col.udt_name !== col.data_type ? col.udt_name : '-';

      console.log(`| \`${col.column_name}\` | ${col.data_type} | ${length} | ${nullable} | ${defaultVal} | ${udtName} |`);
    }

    // Check for custom enum types
    const enumColumns = columns.filter(c => c.data_type === 'USER-DEFINED');
    if (enumColumns.length > 0) {
      console.log('\n**Custom Types:**');
      for (const col of enumColumns) {
        // Get enum values
        const { data: enumValues } = await supabase.rpc('get_enum_values' as any, { enum_name: col.udt_name }).catch(() => ({ data: null }));

        console.log(`- \`${col.column_name}\`: ENUM \`${col.udt_name}\``);
      }
    }

    console.log('\n---\n');
  }
}

extractSchema().catch(console.error);
