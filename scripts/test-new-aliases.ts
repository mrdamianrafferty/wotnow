import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testNewAliases() {
  const testSearches = [
    'european seabass',
    'European Seabass',
    'seabass',
    'sea bass',
    'dorada',
    'sargo',
    'octopus',
    'mullet',
    'sardine',
    'corvina',
    'mero',
    'rascasse'
  ];

  console.log('🔍 Testing New Aliases\n');
  console.log('='.repeat(80));
  console.log('');

  for (const search of testSearches) {
    const { data, error } = await supabase
      .from('species_name_alias')
      .select('name_en_alias, scientific_name')
      .ilike('name_en_alias', search);
      
    if (error) {
      console.error(`Error searching for "${search}":`, error);
      continue;
    }
      
    if (data && data.length > 0) {
      const scientificNames = data.map(d => d.scientific_name);
      const { data: species } = await supabase
        .from('species')
        .select('name_en')
        .in('scientific_name', scientificNames);
        
      if (species && species.length > 0) {
        console.log(`✅ "${search}" → ${species.map(s => s.name_en).join(', ')}`);
      } else {
        console.log(`⚠️  "${search}" → Found alias but no species match`);
      }
    } else {
      console.log(`❌ "${search}" → NOT FOUND`);
    }
  }

  // Check total aliases count
  const { count } = await supabase
    .from('species_name_alias')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Total aliases in database: ${count}`);
  
  // Check European Bass specifically
  console.log('\n' + '='.repeat(80));
  console.log('📍 European Bass (Dicentrarchus labrax) - All Aliases:\n');
  
  const { data: bassAliases } = await supabase
    .from('species_name_alias')
    .select('name_en_alias')
    .eq('scientific_name', 'Dicentrarchus labrax')
    .order('name_en_alias');
    
  if (bassAliases) {
    bassAliases.forEach((a, idx) => {
      console.log(`   ${idx + 1}. ${a.name_en_alias}`);
    });
  }
}

testNewAliases();
