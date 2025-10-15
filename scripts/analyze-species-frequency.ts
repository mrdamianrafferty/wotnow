import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeSpeciesFrequency() {
  console.log('🔍 Analyzing species_frequency table (Original ICES Data)\n');
  console.log('='.repeat(80));
  
  // Get total count
  const { count: totalCount } = await supabase
    .from('species_frequency')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total records: ${totalCount?.toLocaleString()}\n`);
  
  // Get sample records
  const { data: samples, error: samplesError } = await supabase
    .from('species_frequency')
    .select('*')
    .order('rectangle_id')
    .limit(5);
  
  if (samplesError) {
    console.error('Error:', samplesError);
    return;
  }
  
  console.log('📋 Sample records:\n');
  if (samples && samples.length > 0) {
    samples.forEach((record, i) => {
      console.log(`\nRecord ${i + 1}:`);
      console.log(JSON.stringify(record, null, 2));
    });
  }
  
  // Get unique species count
  const { data: allRecords } = await supabase
    .from('species_frequency')
    .select('species_id, rectangle_id, base_frequency, confidence_level, quarter, week_of_year, data_source');
  
  if (allRecords) {
    const uniqueSpecies = new Set(allRecords.map((r: any) => r.species_id));
    const uniqueRectangles = new Set(allRecords.map((r: any) => r.rectangle_id));
    
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 Summary Statistics:\n');
    console.log(`Total records: ${allRecords.length.toLocaleString()}`);
    console.log(`Unique species: ${uniqueSpecies.size}`);
    console.log(`Unique rectangles: ${uniqueRectangles.size}`);
    console.log(`Average records per species: ${(allRecords.length / uniqueSpecies.size).toFixed(1)}`);
    console.log(`Average records per rectangle: ${(allRecords.length / uniqueRectangles.size).toFixed(1)}`);
    
    // Species list
    console.log('\n\n🐟 Species IDs in dataset:');
    const sortedSpecies = Array.from(uniqueSpecies).sort();
    console.log(`First 20: ${sortedSpecies.slice(0, 20).join(', ')}`);
    
    // Analyze frequency distribution
    const frequencyDist: Record<string, number> = {};
    allRecords.forEach((r: any) => {
      const freq = r.base_frequency?.toFixed(2) || 'null';
      frequencyDist[freq] = (frequencyDist[freq] || 0) + 1;
    });
    
    console.log('\n\n📊 Frequency Distribution:');
    Object.entries(frequencyDist)
      .sort(([a], [b]) => {
        if (a === 'null') return 1;
        if (b === 'null') return -1;
        return parseFloat(b) - parseFloat(a);
      })
      .forEach(([freq, count]) => {
        const pct = ((count / allRecords.length) * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(count / 1000));
        console.log(`  ${freq.padEnd(10)} ${count.toString().padStart(6)} (${pct}%) ${bar}`);
      });
    
    // Sample high-frequency species/rectangle combinations
    console.log('\n\n🎯 High-Frequency Examples (base_frequency > 0.8):');
    const highFreq = allRecords
      .filter((r: any) => r.base_frequency && r.base_frequency > 0.8)
      .slice(0, 20);
    
    highFreq.forEach((r: any) => {
      const speciesId = r.species_id?.substring(0, 8) || 'unknown';
      const rectId = r.rectangle_id?.substring(0, 8) || 'unknown';
      console.log(`  Species ${speciesId}... in Rect ${rectId}... → ${r.base_frequency?.toFixed(3)}`);
    });
    
    // Check data source distribution
    const sourceDist: Record<string, number> = {};
    allRecords.forEach((r: any) => {
      const source = r.data_source || 'unknown';
      sourceDist[source] = (sourceDist[source] || 0) + 1;
    });
    
    console.log('\n\n🔍 Data Source Distribution:');
    Object.entries(sourceDist)
      .sort(([, a], [, b]) => b - a)
      .forEach(([source, count]) => {
        const pct = ((count / allRecords.length) * 100).toFixed(1);
        console.log(`  ${source.padEnd(20)} ${count.toString().padStart(6)} (${pct}%)`);
      });
    
    // Compare with DATRAS monthly_abundance
    console.log('\n\n' + '='.repeat(80));
    console.log('🔬 Comparison with DATRAS data:\n');
    
    const { count: datrasCount } = await supabase
      .from('species_monthly_abundance')
      .select('*', { count: 'exact', head: true });
    
    console.log(`species_frequency (ICES):    ${allRecords.length.toLocaleString()} records, ${uniqueSpecies.size} species, ${uniqueRectangles.size} rectangles`);
    console.log(`monthly_abundance (DATRAS):  ${datrasCount?.toLocaleString()} records (72 rectangles × 14 species)`);
    
    console.log('\n💡 Key Differences:');
    console.log('  - species_frequency: Broad coverage, frequency-based (0.0-1.0)');
    console.log('  - monthly_abundance: Limited to 14 species, all rectangles identical');
    console.log('  → species_frequency is the ORIGINAL, higher-quality ICES data!');
  }
  
  // Check table structure
  console.log('\n\n' + '='.repeat(80));
  console.log('📐 Table Structure:\n');
  
  if (samples && samples[0]) {
    console.log('Columns:');
    Object.keys(samples[0]).forEach(key => {
      const value = samples[0][key];
      const type = typeof value;
      const sample = value === null ? 'null' : JSON.stringify(value).substring(0, 50);
      console.log(`  - ${key.padEnd(20)} ${type.padEnd(10)} (e.g., ${sample})`);
    });
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('✅ Analysis complete!\n');
  console.log('🎯 Next Steps:');
  console.log('  1. Use species_frequency as PRIMARY data source (not DATRAS)');
  console.log('  2. Map frequency values to environmental suitability scores');
  console.log('  3. Cross-reference with Phase 1 regional gates');
  console.log('  4. Build predictions using frequency × environmental score');
}

analyzeSpeciesFrequency()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
