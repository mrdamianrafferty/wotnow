import * as duckdb from 'duckdb';

const db = new duckdb.Database(':memory:');

const endpoints = {
  species: 'https://data.source.coop/cboettig/fishbase/fb_parquet_2023-01/species.parquet',
  ecology: 'https://data.source.coop/cboettig/fishbase/fb_parquet_2023-01/ecology.parquet',
  habitats: 'https://data.source.coop/cboettig/fishbase/fb_parquet_2023-01/habitats.parquet',
  distribution: 'https://data.source.coop/cboettig/fishbase/fb_parquet_2023-01/distribution.parquet'
};

async function checkEndpoint(name: string, url: string): Promise<void> {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 ${name.toUpperCase()} TABLE`);
    console.log('='.repeat(80));
    
    // Get schema
    db.all(`DESCRIBE SELECT * FROM read_parquet('${url}') LIMIT 0;`, (err, schema) => {
      if (err) {
        console.error(`❌ Error reading ${name}:`, err.message);
        resolve();
        return;
      }
      
      console.log('\n🔍 Available columns:');
      schema?.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.column_type})`);
      });
      
      // Get sample data for Cod (SpecCode = 69)
      db.all(`
        SELECT *
        FROM read_parquet('${url}')
        WHERE SpecCode = 69
        LIMIT 1;
      `, (err2, rows) => {
        if (err2) {
          console.error(`❌ Error querying ${name}:`, err2.message);
          resolve();
          return;
        }
        
        if (rows && rows.length > 0) {
          console.log('\n✅ Sample data for Cod (SpecCode=69):');
          Object.entries(rows[0]).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              const displayValue = typeof value === 'string' && value.length > 50 
                ? value.substring(0, 50) + '...' 
                : value;
              console.log(`  ${key}: ${displayValue}`);
            }
          });
        } else {
          console.log('\n⚠️  No data found for Cod in this table');
        }
        
        resolve();
      });
    });
  });
}

async function run() {
  console.log('🦆 Checking FishBase Parquet Endpoints\n');
  console.log('Testing with Cod (Gadus morhua, SpecCode=69)\n');
  
  for (const [name, url] of Object.entries(endpoints)) {
    await checkEndpoint(name, url);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Endpoint check complete!\n');
  
  db.close();
  process.exit(0);
}

run();
