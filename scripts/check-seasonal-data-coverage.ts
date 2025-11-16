import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSeasonalDataCoverage() {
  console.log('SPECIES_AVAILABILITY_BY_GRID - Seasonal Data Coverage');
  console.log('═'.repeat(70));
  console.log('');

  // Get table schema
  const { data: schemaData } = await supabase
    .from('species_availability_by_grid')
    .select('*')
    .limit(1);

  if (schemaData && schemaData[0]) {
    console.log('Table columns:', Object.keys(schemaData[0]).join(', '));
    console.log('');
  }

  // Count total rows
  const { count: totalCount } = await supabase
    .from('species_availability_by_grid')
    .select('*', { count: 'exact', head: true });

  console.log(`Total rows: ${totalCount}`);
  console.log('');

  // Count distinct species
  const { data: allSpecies } = await supabase
    .from('species_availability_by_grid')
    .select('species_code');

  const uniqueSpecies = new Set(allSpecies?.map(r => r.species_code));
  console.log(`Unique species codes: ${uniqueSpecies.size}`);
  console.log('');

  // Check for common fishing species
  console.log('COMMON FISHING SPECIES COVERAGE:');
  console.log('─'.repeat(70));

  const commonSpecies = [
    { code: 'MAC', name: 'Mackerel' },
    { code: 'BSS', name: 'Bass' },
    { code: 'COD', name: 'Cod' },
    { code: 'POL', name: 'Pollack' },
    { code: 'WHG', name: 'Whiting' },
    { code: 'PLE', name: 'Plaice' },
    { code: 'HER', name: 'Herring' },
    { code: 'SOL', name: 'Sole' },
    { code: 'FLE', name: 'Flounder' },
    { code: 'DAB', name: 'Dab' },
  ];

  for (const sp of commonSpecies) {
    const { data } = await supabase
      .from('species_availability_by_grid')
      .select('species_code, best_months, cell_id')
      .eq('species_code', sp.code)
      .limit(3);

    if (data && data.length > 0) {
      console.log(`${sp.code} (${sp.name}): ✅ ${data.length} cells`);
      console.log(`  Sample: best_months = [${data[0].best_months?.join(', ') || 'null'}]`);
      console.log(`  Cell: ${data[0].cell_id}`);
    } else {
      console.log(`${sp.code} (${sp.name}): ❌ NOT FOUND`);
    }
  }

  console.log('');
  console.log('SAMPLE DATA ROWS:');
  console.log('─'.repeat(70));

  const { data: sampleData } = await supabase
    .from('species_availability_by_grid')
    .select('*')
    .not('best_months', 'is', null)
    .limit(5);

  if (sampleData) {
    sampleData.forEach(row => {
      console.log(JSON.stringify(row, null, 2));
    });
  }

  console.log('');
  console.log('BEST_MONTHS STATISTICS:');
  console.log('─'.repeat(70));

  // Count rows with null best_months
  const { count: nullCount } = await supabase
    .from('species_availability_by_grid')
    .select('*', { count: 'exact', head: true })
    .is('best_months', null);

  const { count: notNullCount } = await supabase
    .from('species_availability_by_grid')
    .select('*', { count: 'exact', head: true })
    .not('best_months', 'is', null);

  console.log(`Rows with best_months: ${notNullCount}`);
  console.log(`Rows without best_months: ${nullCount}`);
  console.log(`Coverage: ${((notNullCount! / totalCount!) * 100).toFixed(1)}%`);
}

checkSeasonalDataCoverage().catch(console.error);
