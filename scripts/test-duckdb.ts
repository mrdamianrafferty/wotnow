import * as duckdb from 'duckdb';

const db = new duckdb.Database(':memory:');

console.log('🦆 Testing DuckDB Parquet query...\n');

const FISHBASE_SPECIES_URL = 'https://data.source.coop/cboettig/fishbase/fb_parquet_2023-01/species.parquet';

db.all(`
  SELECT COUNT(*) as count
  FROM read_parquet('${FISHBASE_SPECIES_URL}')
  LIMIT 1;
`, (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } else {
    console.log('✅ Success! FishBase species count:', rows[0].count);
    console.log('\nTesting specific species lookup...\n');
    
    db.all(`
      SELECT Genus || ' ' || Species AS scientific_name, SpecCode
      FROM read_parquet('${FISHBASE_SPECIES_URL}')
      WHERE Genus = 'Gadus' AND Species = 'morhua';
    `, (err2, rows2) => {
      if (err2) {
        console.error('❌ Error:', err2);
      } else {
        console.log('✅ Found Cod:', rows2);
      }
      db.close();
      process.exit(0);
    });
  }
});
