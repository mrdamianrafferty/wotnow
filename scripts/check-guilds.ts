/**
 * Check what guilds exist in the database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkGuilds() {
  const { data, error } = await supabase
    .from('species')
    .select('species_code, name_en, wind_weight, pressure_weight')
    .order('species_code');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\n📊 Found ${data.length} species with weather weights:\n`);
  
  // Show current weights
  const weightGroups = {
    'Default (0.5/0.5)': data.filter(s => s.wind_weight === 0.5 && s.pressure_weight === 0.5),
    'Custom weights': data.filter(s => s.wind_weight !== 0.5 || s.pressure_weight !== 0.5)
  };
  
  for (const [group, species] of Object.entries(weightGroups)) {
    if (species.length > 0) {
      console.log(`\n${group} (${species.length} species):`);
      species.slice(0, 10).forEach(s => {
        console.log(`  - ${s.name_en} (${s.species_code}): wind=${s.wind_weight}, pressure=${s.pressure_weight}`);
      });
      if (species.length > 10) {
        console.log(`  ... and ${species.length - 10} more`);
      }
    }
  }
}

checkGuilds();
