import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function testFinalPredictions() {
  console.log('Testing final predictions flow for 25E1 (Bay of Biscay)...\n');
  
  const { data, error } = await supabase.rpc('get_environmental_predictions_basic', {
    target_rectangle: '25E1',
    target_date: '2025-10-18'
  });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️  No predictions returned');
    console.log('\nPossible reasons:');
    console.log('  1. biogeographic_regions not populated (run the SQL update)');
    console.log('  2. Filter too strict');
    console.log('  3. No environmental data for this rectangle');
    return;
  }
  
  console.log(`✅ Total predictions: ${data.length}\n`);
  console.log('Top 10 species (ordered by confidence):');
  
  const top10 = data.slice(0, 10);
  top10.forEach((pred: any, idx: number) => {
    console.log(`  ${idx + 1}. ${pred.confidence}% - ${pred.name_en}`);
  });
  
  // Verify they're in descending order
  const isOrdered = top10.every((pred: any, idx: number) => {
    if (idx === 0) return true;
    return pred.confidence <= top10[idx - 1].confidence;
  });
  
  console.log(`\n${isOrdered ? '✅' : '❌'} Predictions are ${isOrdered ? '' : 'NOT '}correctly ordered by confidence (descending)`);
  
  // Check if any Mediterranean-only species appear
  const bogue = data.find((p: any) => p.name_en === 'Bogue');
  console.log(`\n${bogue ? '⚠️  Bogue (Med species) found' : '✅ Bogue (Med species) correctly filtered out'}`);
}

testFinalPredictions().catch(console.error);
