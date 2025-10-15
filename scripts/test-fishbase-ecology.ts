import * as duckdb from 'duckdb';

const db = new duckdb.Database(':memory:');

console.log('🔍 Checking FishBase ecology schema for Cod...\n');

const FISHBASE_ECOLOGY_URL = 'https://data.source.coop/cboettig/fishbase/fb_parquet_2023-01/ecology.parquet';

db.all(`
  SELECT *
  FROM read_parquet('${FISHBASE_ECOLOGY_URL}')
  WHERE SpecCode = 69
  LIMIT 1;
`, (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
  
  if (rows && rows.length > 0) {
    console.log('✅ Cod ecology data found!\n');
    console.log('Available fields:');
    Object.keys(rows[0]).forEach(key => {
      const value = rows[0][key];
      if (value !== null) {
        console.log(`  ${key}: ${value}`);
      }
    });
  } else {
    console.log('❌ No ecology data for Cod');
  }
  
  db.close();
  process.exit(0);
});
