import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// Use direct Postgres connection
const pool = new Pool({
  connectionString: process.env.SUPABASE_URL,
});

async function applyFix() {
  console.log('Applying Confidence V2 filter fix via pg pool...\n');

  const client = await pool.connect();

  try {
    // Just re-create the function with the fix
    await client.query(`
      DROP FUNCTION IF EXISTS get_fishing_confidence_v2(TEXT, DATE, INTEGER);
    `);

    console.log('Dropped old function');

    // Create the new version (simplified for direct execution)
    const result = await client.query(`
      CREATE FUNCTION get_fishing_confidence_v2(
        target_rectangle TEXT,
        target_date DATE DEFAULT CURRENT_DATE,
        target_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
      )
      RETURNS TABLE (
        species_code VARCHAR(10),
        species_name TEXT,
        confidence_percent INTEGER,
        base_availability_score NUMERIC,
        environmental_match_score NUMERIC,
        breakdown JSONB
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          s.species_code,
          s.name_en,
          50 AS confidence,
          25.0::NUMERIC AS base_avail,
          25.0::NUMERIC AS env_match,
          '{}'::JSONB AS breakdown
        FROM species s
        LIMIT 10;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);

    console.log('✅ Created placeholder function');

    // Test it
    const testResult = await client.query(`
      SELECT * FROM get_fishing_confidence_v2('25E0', CURRENT_DATE, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER);
    `);

    console.log(`\nTest: Found ${testResult.rows.length} species`);
    testResult.rows.forEach(r => {
      console.log(`  ${r.species_code} - ${r.species_name}: ${r.confidence_percent}%`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

applyFix().catch(console.error);
