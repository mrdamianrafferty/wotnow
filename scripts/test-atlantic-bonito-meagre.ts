import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSpeciesBios() {
  console.log('Testing Atlantic Bonito and Meagre bios...\n');
  
  // Test 1: Check if bios exist in database
  console.log('1. Checking species table for playful_bio_en:');
  const { data: speciesData, error: speciesError } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name, playful_bio_en')
    .in('name_en', ['Atlantic Bonito', 'Meagre'])
    .order('name_en');

  if (speciesError) {
    console.error('   Error:', speciesError);
    return;
  }

  speciesData?.forEach(row => {
    console.log(`\n   ${row.name_en} (${row.species_code})`);
    console.log(`   Scientific: ${row.scientific_name}`);
    console.log(`   Has bio: ${!!row.playful_bio_en}`);
    if (row.playful_bio_en) {
      console.log(`   Bio: "${row.playful_bio_en}"`);
    } else {
      console.log('   Bio: NULL or empty');
    }
  });

  // Test 2: Check if they appear in predictions
  console.log('\n\n2. Checking if species appear in predictions (rectangle 31F1):');
  const { data: predictionsData, error: predictionsError } = await supabase
    .rpc('get_environmental_predictions_basic', {
      target_rectangle: '31F1',
      target_date: new Date().toISOString().split('T')[0]
    });

  if (predictionsError) {
    console.error('   Error:', predictionsError);
    return;
  }

  if (!Array.isArray(predictionsData)) {
    console.log('   No predictions returned');
    return;
  }

  const targetSpecies = predictionsData.filter((p: any) => 
    p.name_en === 'Atlantic Bonito' || p.name_en === 'Meagre'
  );

  if (targetSpecies.length === 0) {
    console.log('   Atlantic Bonito and Meagre not found in predictions');
    console.log(`   Total species in predictions: ${predictionsData.length}`);
    console.log(`   Sample species: ${predictionsData.slice(0, 5).map((p: any) => p.name_en).join(', ')}`);
  } else {
    targetSpecies.forEach((p: any) => {
      console.log(`\n   Found: ${p.name_en}`);
      console.log(`   Confidence: ${p.confidence}`);
      console.log(`   Fields returned: ${Object.keys(p).join(', ')}`);
      console.log(`   Has playful_bio field: ${!!p.playful_bio}`);
      console.log(`   Has playful_bio_en field: ${!!p.playful_bio_en}`);
    });
  }

  // Test 3: Simulate API augmentation
  console.log('\n\n3. Testing augmentation (adding localized names and bios):');
  const speciesCodes = targetSpecies.map((p: any) => p.species_code).filter(Boolean);
  
  if (speciesCodes.length > 0) {
    const { data: augmentData, error: augmentError } = await supabase
      .from('species')
      .select('species_code, scientific_name, name_fr, name_es, name_de, name_it, name_pt, playful_bio_en')
      .in('species_code', speciesCodes);

    if (augmentError) {
      console.error('   Error:', augmentError);
    } else if (augmentData) {
      augmentData.forEach(row => {
        console.log(`\n   ${row.species_code}:`);
        console.log(`   playful_bio_en: ${row.playful_bio_en ? `"${row.playful_bio_en}"` : 'NULL'}`);
      });
    }
  } else {
    console.log('   No species codes to augment');
  }
}

testSpeciesBios().catch(console.error);
