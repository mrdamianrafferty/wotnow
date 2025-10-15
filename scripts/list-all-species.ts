import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.development') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllSpecies() {
  const { data, error } = await supabase
    .from('species')
    .select('common_name_en, scientific_name, fishing_advice')
    .order('common_name_en');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Total species: ${data.length}\n`);
  console.log('=== ALL 64 SPECIES ===\n');
  
  // Group by regions for easier research planning
  const speciesByRegion: Record<string, string[]> = {
    'North Sea': [],
    'Baltic': [],
    'Norwegian Sea': [],
    'Portuguese Atlantic': [],
    'Mediterranean': [],
    'Multiple Regions': [],
    'No Region Data': []
  };
  
  data.forEach((species) => {
    const regions = species.fishing_advice?.regions || [];
    const name = `${species.common_name_en} (${species.scientific_name})`;
    
    if (regions.length === 0) {
      speciesByRegion['No Region Data'].push(name);
    } else if (regions.length > 2) {
      speciesByRegion['Multiple Regions'].push(name);
    } else if (regions.includes('North Sea')) {
      speciesByRegion['North Sea'].push(name);
    } else if (regions.includes('Baltic')) {
      speciesByRegion['Baltic'].push(name);
    } else if (regions.includes('Norwegian Sea') || regions.includes('North Atlantic')) {
      speciesByRegion['Norwegian Sea'].push(name);
    } else if (regions.includes('Portuguese Atlantic') || regions.includes('Bay of Biscay')) {
      speciesByRegion['Portuguese Atlantic'].push(name);
    } else if (regions.includes('Mediterranean')) {
      speciesByRegion['Mediterranean'].push(name);
    }
  });
  
  // Print by region
  Object.entries(speciesByRegion).forEach(([region, species]) => {
    if (species.length > 0) {
      console.log(`\n### ${region} (${species.length} species):`);
      species.forEach((name, idx) => {
        console.log(`${idx + 1}. ${name}`);
      });
    }
  });
  
  // Print full list with regions
  console.log('\n\n=== FULL LIST WITH REGIONS ===\n');
  data.forEach((species, idx) => {
    const regions = species.fishing_advice?.regions || [];
    console.log(`${idx + 1}. ${species.common_name_en} (${species.scientific_name})`);
    console.log(`   Regions: ${regions.join(', ') || 'None specified'}\n`);
  });
}

listAllSpecies().catch(console.error);
