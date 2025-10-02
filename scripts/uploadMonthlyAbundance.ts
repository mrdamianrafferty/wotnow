// scripts/uploadMonthlyAbundance.ts
// Run with: npx tsx scripts/uploadMonthlyAbundance.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface MonthlyData {
  [month: string]: number;
}

interface SpeciesData {
  [speciesId: string]: MonthlyData;
}

interface RectangleData {
  [rectangleCode: string]: SpeciesData;
}

// Month number to column name mapping
const MONTH_COLS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

async function uploadAbundanceData() {
  console.log('🐟 Starting monthly abundance data upload...\n');

  // Read the JSON file (datras-fetcher is inside the WotNow directory)
  const jsonPath = path.join(process.cwd(), 'datras-fetcher/datras-fetcher/catch_stats_output/monthly_abundance_by_rectangle.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    console.log('💡 Make sure the path is correct relative to your project root');
    process.exit(1);
  }

  console.log(`📂 Reading file: ${jsonPath}`);
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data: RectangleData = JSON.parse(rawData);

  // Transform data into array of records for Supabase
  const records: any[] = [];
  let rectangleCount = 0;
  let speciesCount = 0;

  for (const [rectangleCode, speciesData] of Object.entries(data)) {
    rectangleCount++;
    
    for (const [speciesId, monthlyData] of Object.entries(speciesData)) {
      speciesCount++;
      
      // Build record with monthly columns
      const record: any = {
        rectangle_code: rectangleCode,
        species_id: speciesId,
        data_source: 'DATRAS',
        last_updated: new Date().toISOString()
      };

      // Map month numbers (1-12) to column names (jan-dec)
      for (let monthNum = 1; monthNum <= 12; monthNum++) {
        const monthCol = MONTH_COLS[monthNum - 1];
        const abundance = monthlyData[monthNum.toString()] || 0;
        record[monthCol] = Math.round(abundance * 100) / 100; // Round to 2 decimal places
      }

      records.push(record);
    }
  }

  console.log(`\n📊 Data Summary:`);
  console.log(`   • Total rectangles: ${rectangleCount}`);
  console.log(`   • Total species entries: ${speciesCount}`);
  console.log(`   • Total records to insert: ${records.length}`);
  console.log(`   • Sample rectangles: ${Object.keys(data).slice(0, 5).join(', ')}`);

  // Upload in batches (Supabase has a limit)
  const BATCH_SIZE = 1000;
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);
  let successCount = 0;
  let errorCount = 0;

  console.log(`\n⬆️  Uploading in ${totalBatches} batches of ${BATCH_SIZE}...\n`);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    
    process.stdout.write(`   Batch ${batchNum}/${totalBatches} (${batch.length} records)... `);

    try {
      const { data, error } = await supabase
        .from('species_monthly_abundance')
        .upsert(batch, { 
          onConflict: 'rectangle_code,species_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.log(`❌ Error`);
        console.error(`      ${error.message}`);
        errorCount += batch.length;
      } else {
        console.log(`✅ Success`);
        successCount += batch.length;
      }
    } catch (err) {
      console.log(`❌ Exception`);
      console.error(`      ${err}`);
      errorCount += batch.length;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Upload Complete!`);
  console.log(`   • Successful: ${successCount} records`);
  console.log(`   • Errors: ${errorCount} records`);
  console.log(`${'='.repeat(50)}\n`);

  // Verify the upload
  console.log('🔍 Verifying upload...');
  const { count, error } = await supabase
    .from('species_monthly_abundance')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Error verifying:', error.message);
  } else {
    console.log(`✅ Total records in database: ${count}`);
  }

  // Show sample query
  console.log('\n📋 Sample query for your Asturias rectangles (42F8, 42F9):');
  const { data: sampleData, error: sampleError } = await supabase
    .from('species_monthly_abundance')
    .select('rectangle_code, species_id, jul, aug, sep')
    .in('rectangle_code', ['42F8', '42F9'])
    .limit(5);

  if (sampleError) {
    console.error('❌ Error:', sampleError.message);
  } else if (sampleData && sampleData.length > 0) {
    console.log('\nSample data (summer months):');
    console.table(sampleData);
  } else {
    console.log('⚠️  No data found for Asturias rectangles. Check if they exist in your JSON file.');
  }
}

// Run the upload
uploadAbundanceData()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });