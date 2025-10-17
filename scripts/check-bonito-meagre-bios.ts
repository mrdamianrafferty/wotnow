import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBios() {
  const { data, error } = await supabase
    .from('species')
    .select('species_code, name_en, playful_bio_en')
    .in('name_en', ['Atlantic Bonito', 'Meagre'])
    .order('name_en');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Results:');
  data?.forEach(row => {
    console.log(`\nSpecies: ${row.name_en}`);
    console.log(`Code: ${row.species_code}`);
    console.log(`Has playful_bio_en: ${!!row.playful_bio_en}`);
    if (row.playful_bio_en) {
      console.log(`Bio: ${row.playful_bio_en}`);
    } else {
      console.log('Bio: NULL');
    }
  });
}

checkBios().catch(console.error);
