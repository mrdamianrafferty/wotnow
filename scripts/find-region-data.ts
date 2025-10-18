import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function findRegionData() {
  // Get all column names
  const { data: sample } = await supabase
    .from('species')
    .select('*')
    .eq('name_en', 'Bogue')
    .single();
    
  const allColumns = Object.keys(sample || {});
  console.log('All species table columns:');
  console.log(allColumns.sort().join(', '));
  
  // Check for habitat, distribution, or location related columns
  const relevantColumns = allColumns.filter(col => 
    col.toLowerCase().includes('habitat') ||
    col.toLowerCase().includes('distrib') ||
    col.toLowerCase().includes('location') ||
    col.toLowerCase().includes('fao') ||
    col.toLowerCase().includes('geo')
  );
  
  console.log('\n\nHabitat/Distribution columns:', relevantColumns);
  
  if (relevantColumns.length > 0) {
    console.log('\n\nBogue data for these columns:');
    relevantColumns.forEach(col => {
      console.log(`  ${col}:`, sample?.[col]);
    });
  }
  
  // Check if there are any related tables
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .like('table_name', '%region%')
    .or('table_name.like.%distribution%,table_name.like.%habitat%');
    
  console.log('\n\nRegion/distribution related tables:', tables?.map(t => t.table_name));
}

findRegionData().catch(console.error);
