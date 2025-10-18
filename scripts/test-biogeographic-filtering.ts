import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function testBiogeographicFiltering() {
  console.log('Testing biogeographic filtering for 25E1 (Bay of Biscay - ATLANTIC)...\n');
  
  // Check rectangle region
  const { data: rect } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region')
    .eq('rectangle_code', '25E1')
    .single();
    
  console.log(`Rectangle: ${rect?.rectangle_code} -> ${rect?.region}\n`);
  
  // Test predictions
  const { data, error } = await supabase.rpc('get_environmental_predictions_basic', {
    target_rectangle: '25E1',
    target_date: '2025-10-18'
  });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`✅ Total predictions: ${data?.length || 0}\n`);
  console.log('Top 10 species:');
  
  const topSpecies = data?.slice(0, 10) || [];
  for (const pred of topSpecies) {
    // Get species regions
    const { data: speciesData } = await supabase
      .from('species')
      .select('biogeographic_regions')
      .eq('species_code', pred.species_code)
      .single();
      
    const regions = speciesData?.biogeographic_regions || [];
    const regionStr = regions.join(', ');
    
    console.log(`  ${pred.confidence}% - ${pred.name_en}`);
    console.log(`      Regions: ${regionStr || 'None set'}`);
  }
  
  // Check if Bogue is in the list
  const bogue = data?.find((p: any) => p.name_en === 'Bogue');
  if (bogue) {
    console.log(`\n⚠️  PROBLEM: Bogue still appearing (confidence: ${bogue.confidence}%)`);
    const { data: bogueRegions } = await supabase
      .from('species')
      .select('biogeographic_regions')
      .eq('name_en', 'Bogue')
      .single();
    console.log(`   Bogue regions: ${bogueRegions?.biogeographic_regions?.join(', ')}`);
  } else {
    console.log(`\n✅ SUCCESS: Bogue (Mediterranean species) NOT in Atlantic location predictions!`);
  }
}

testBiogeographicFiltering().catch(console.error);
