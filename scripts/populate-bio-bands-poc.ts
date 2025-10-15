import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map numeric temperature to bio_level
function temperatureToBioLevels(tempCelsius: number): string {
  if (tempCelsius < 5) return 'very_low';
  if (tempCelsius < 10) return 'low';
  if (tempCelsius < 18) return 'normal';
  if (tempCelsius < 24) return 'high';
  return 'very_high';
}

// Map numeric salinity to bio_level
function salinityToBioLevels(salinityPSU: number): string {
  if (salinityPSU < 10) return 'very_low';   // Brackish (Baltic)
  if (salinityPSU < 25) return 'low';        // Low salinity
  if (salinityPSU < 36) return 'normal';     // Typical ocean (30-35)
  if (salinityPSU < 38) return 'high';       // High salinity (Med)
  return 'very_high';                        // Hypersaline
}

// Map numeric depth to bio_level
function depthToBioLevel(depthM: number): string {
  if (depthM < 10) return 'very_low';    // Shallow inshore
  if (depthM < 30) return 'low';         // Shallow coastal
  if (depthM < 100) return 'normal';     // Mid-depth
  if (depthM < 300) return 'high';       // Deep
  return 'very_high';                    // Very deep (commercial)
}

// POC species with complete environmental profiles
const POC_SPECIES_PROFILES = {
  'cod': {
    temperature: {
      optimal_min: 2, optimal_max: 10,
      tolerance_min: 0, tolerance_max: 18
    },
    salinity: {
      optimal_min: 30, optimal_max: 35,
      tolerance_min: 11, tolerance_max: 38  // 11 PSU is spawning minimum
    },
    depth: {
      optimal_min: 20, optimal_max: 150,
      tolerance_min: 10, tolerance_max: 300
    }
  },
  'had': {  // haddock
    temperature: {
      optimal_min: 4, optimal_max: 10,
      tolerance_min: 2, tolerance_max: 14
    },
    salinity: {
      optimal_min: 31, optimal_max: 36,
      tolerance_min: 31, tolerance_max: 38
    },
    depth: {
      optimal_min: 30, optimal_max: 120,
      tolerance_min: 10, tolerance_max: 300
    }
  },
  'her': {  // herring
    temperature: {
      optimal_min: 8, optimal_max: 14,
      tolerance_min: 4, tolerance_max: 18
    },
    salinity: {
      optimal_min: 25, optimal_max: 35,
      tolerance_min: 6, tolerance_max: 38  // Highly euryhaline!
    },
    depth: {
      optimal_min: 5, optimal_max: 80,
      tolerance_min: 0, tolerance_max: 200
    }
  },
  'ple': {  // plaice
    temperature: {
      optimal_min: 8, optimal_max: 14,
      tolerance_min: 4, tolerance_max: 18
    },
    salinity: {
      optimal_min: 30, optimal_max: 35,
      tolerance_min: 15, tolerance_max: 38
    },
    depth: {
      optimal_min: 2, optimal_max: 40,
      tolerance_min: 0, tolerance_max: 100
    }
  },
  'pol': {  // pollack
    temperature: {
      optimal_min: 10, optimal_max: 16,
      tolerance_min: 6, tolerance_max: 20
    },
    salinity: {
      optimal_min: 32, optimal_max: 36,
      tolerance_min: 30, tolerance_max: 38
    },
    depth: {
      optimal_min: 20, optimal_max: 100,
      tolerance_min: 5, tolerance_max: 200
    }
  },
  'bss': {  // sea bass
    temperature: {
      optimal_min: 13, optimal_max: 21,
      tolerance_min: 8, tolerance_max: 25
    },
    salinity: {
      optimal_min: 30, optimal_max: 38,
      tolerance_min: 15, tolerance_max: 40  // Euryhaline
    },
    depth: {
      optimal_min: 5, optimal_max: 40,
      tolerance_min: 2, tolerance_max: 80
    }
  },
  'sbg': {  // gilthead bream
    temperature: {
      optimal_min: 15, optimal_max: 24,
      tolerance_min: 10, tolerance_max: 28
    },
    salinity: {
      optimal_min: 35, optimal_max: 39,
      tolerance_min: 20, tolerance_max: 45
    },
    depth: {
      optimal_min: 2, optimal_max: 30,
      tolerance_min: 0, tolerance_max: 80
    }
  },
  'pil': {  // sardine
    temperature: {
      optimal_min: 14, optimal_max: 22,
      tolerance_min: 10, tolerance_max: 26
    },
    salinity: {
      optimal_min: 32, optimal_max: 38,
      tolerance_min: 30, tolerance_max: 40
    },
    depth: {
      optimal_min: 0, optimal_max: 40,
      tolerance_min: 0, tolerance_max: 120
    }
  },
  'enc': {  // anchovy (if exists, might be different code)
    temperature: {
      optimal_min: 14, optimal_max: 22,
      tolerance_min: 8, tolerance_max: 26
    },
    salinity: {
      optimal_min: 32, optimal_max: 38,
      tolerance_min: 15, tolerance_max: 40
    },
    depth: {
      optimal_min: 0, optimal_max: 40,
      tolerance_min: 0, tolerance_max: 150
    }
  },
  'mac': {  // mackerel
    temperature: {
      optimal_min: 10, optimal_max: 18,
      tolerance_min: 5, tolerance_max: 22
    },
    salinity: {
      optimal_min: 32, optimal_max: 37,
      tolerance_min: 30, tolerance_max: 40
    },
    depth: {
      optimal_min: 10, optimal_max: 80,
      tolerance_min: 5, tolerance_max: 200
    }
  },
  'tur': {  // turbot
    temperature: {
      optimal_min: 8, optimal_max: 16,
      tolerance_min: 4, tolerance_max: 20
    },
    salinity: {
      optimal_min: 30, optimal_max: 35,
      tolerance_min: 25, tolerance_max: 38
    },
    depth: {
      optimal_min: 10, optimal_max: 70,
      tolerance_min: 5, tolerance_max: 150
    }
  },
  'whg': {  // whiting
    temperature: {
      optimal_min: 6, optimal_max: 12,
      tolerance_min: 2, tolerance_max: 16
    },
    salinity: {
      optimal_min: 30, optimal_max: 35,
      tolerance_min: 28, tolerance_max: 38
    },
    depth: {
      optimal_min: 5, optimal_max: 50,
      tolerance_min: 2, tolerance_max: 200
    }
  },
  'sol': {  // dover sole
    temperature: {
      optimal_min: 10, optimal_max: 18,
      tolerance_min: 6, tolerance_max: 22
    },
    salinity: {
      optimal_min: 30, optimal_max: 35,
      tolerance_min: 20, tolerance_max: 38
    },
    depth: {
      optimal_min: 2, optimal_max: 40,
      tolerance_min: 0, tolerance_max: 100
    }
  }
};

function mapTemperatureRangeToBands(profile: any) {
  const allLevels = ['very_low', 'low', 'normal', 'high', 'very_high'];
  const happy: string[] = [];
  const unhappy: string[] = [];
  
  // Happy bands: within optimal range
  for (let temp = profile.optimal_min; temp <= profile.optimal_max; temp += 5) {
    const level = temperatureToBioLevels(temp);
    if (!happy.includes(level)) happy.push(level);
  }
  
  // Unhappy bands: outside tolerance range
  for (const level of allLevels) {
    const midpoint = {
      'very_low': 2.5,
      'low': 7.5,
      'normal': 14,
      'high': 21,
      'very_high': 26
    }[level] || 14;
    
    if (midpoint < profile.tolerance_min || midpoint > profile.tolerance_max) {
      unhappy.push(level);
    }
  }
  
  return { happy, unhappy };
}

function mapSalinityRangeToBands(profile: any) {
  const allLevels = ['very_low', 'low', 'normal', 'high', 'very_high'];
  const happy: string[] = [];
  const unhappy: string[] = [];
  
  // Happy bands: within optimal range
  for (let salinity = profile.optimal_min; salinity <= profile.optimal_max; salinity += 5) {
    const level = salinityToBioLevels(salinity);
    if (!happy.includes(level)) happy.push(level);
  }
  
  // Unhappy bands: outside tolerance range
  for (const level of allLevels) {
    const midpoint = {
      'very_low': 7,
      'low': 17,
      'normal': 32,
      'high': 37,
      'very_high': 40
    }[level] || 32;
    
    if (midpoint < profile.tolerance_min || midpoint > profile.tolerance_max) {
      unhappy.push(level);
    }
  }
  
  return { happy, unhappy };
}

function mapDepthRangeToBands(profile: any) {
  const allLevels = ['very_low', 'low', 'normal', 'high', 'very_high'];
  const happy: string[] = [];
  const unhappy: string[] = [];
  
  // Happy bands: within optimal range
  for (let depth = profile.optimal_min; depth <= Math.min(profile.optimal_max, 200); depth += 30) {
    const level = depthToBioLevel(depth);
    if (!happy.includes(level)) happy.push(level);
  }
  
  // Unhappy bands: outside tolerance range
  for (const level of allLevels) {
    const midpoint = {
      'very_low': 5,
      'low': 20,
      'normal': 65,
      'high': 200,
      'very_high': 400
    }[level] || 65;
    
    if (midpoint < profile.tolerance_min || midpoint > profile.tolerance_max) {
      unhappy.push(level);
    }
  }
  
  return { happy, unhappy };
}

async function populateBioBands() {
  console.log('🔄 Populating species_bio_bands table with POC species data\n');
  console.log('=' .repeat(80));
  
  // Get all species
  const { data: allSpecies, error: speciesError } = await supabase
    .from('species')
    .select('id, species_code, name_en');
  
  if (speciesError) {
    console.error('Error fetching species:', speciesError);
    return;
  }
  
  const speciesMap = new Map(allSpecies.map(s => [s.species_code, s]));
  
  let inserted = 0;
  let skipped = 0;
  
  for (const [speciesCode, profile] of Object.entries(POC_SPECIES_PROFILES)) {
    const species = speciesMap.get(speciesCode);
    
    if (!species) {
      console.log(`⚠️  Species code '${speciesCode}' not found in database, skipping...`);
      skipped++;
      continue;
    }
    
    console.log(`\n📋 ${species.name_en} (${speciesCode})`);
    console.log('-'.repeat(60));
    
    // Map temperature
    const tempBands = mapTemperatureRangeToBands(profile.temperature);
    console.log(`   Temperature:`);
    console.log(`     Happy: ${tempBands.happy.join(', ')}`);
    console.log(`     Unhappy: ${tempBands.unhappy.join(', ')}`);
    
    const { error: tempError } = await supabase
      .from('species_bio_bands')
      .upsert({
        species_id: species.id,
        parameter: 'surfaceTemperature',
        happy_bands: tempBands.happy,
        unhappy_bands: tempBands.unhappy
      }, {
        onConflict: 'species_id,parameter'
      });
    
    if (tempError) {
      console.error(`   ❌ Error inserting temperature:`, tempError);
    } else {
      inserted++;
    }
    
    // Map salinity
    const salinityBands = mapSalinityRangeToBands(profile.salinity);
    console.log(`   Salinity:`);
    console.log(`     Happy: ${salinityBands.happy.join(', ')}`);
    console.log(`     Unhappy: ${salinityBands.unhappy.join(', ')}`);
    
    const { error: salinityError } = await supabase
      .from('species_bio_bands')
      .upsert({
        species_id: species.id,
        parameter: 'salinity',
        happy_bands: salinityBands.happy,
        unhappy_bands: salinityBands.unhappy
      }, {
        onConflict: 'species_id,parameter'
      });
    
    if (salinityError) {
      console.error(`   ❌ Error inserting salinity:`, salinityError);
    } else {
      inserted++;
    }
    
    // Map depth
    const depthBands = mapDepthRangeToBands(profile.depth);
    console.log(`   Depth:`);
    console.log(`     Happy: ${depthBands.happy.join(', ')}`);
    console.log(`     Unhappy: ${depthBands.unhappy.join(', ')}`);
    
    const { error: depthError } = await supabase
      .from('species_bio_bands')
      .upsert({
        species_id: species.id,
        parameter: 'depth',
        happy_bands: depthBands.happy,
        unhappy_bands: depthBands.unhappy
      }, {
        onConflict: 'species_id,parameter'
      });
    
    if (depthError) {
      console.error(`   ❌ Error inserting depth:`, depthError);
    } else {
      inserted++;
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('📊 Summary:\n');
  console.log(`   Total POC species: ${Object.keys(POC_SPECIES_PROFILES).length}`);
  console.log(`   Records inserted/updated: ${inserted}`);
  console.log(`   Species skipped: ${skipped}`);
  
  // Verify what's in the table now
  const { data: allBands, error: bandsError } = await supabase
    .from('species_bio_bands')
    .select('species_id, parameter')
    .order('species_id');
  
  if (!bandsError && allBands) {
    const speciesCounts = new Map<string, number>();
    for (const band of allBands) {
      const count = speciesCounts.get(band.species_id) || 0;
      speciesCounts.set(band.species_id, count + 1);
    }
    
    console.log(`\n   Total records in species_bio_bands: ${allBands.length}`);
    console.log(`   Species with data: ${speciesCounts.size}`);
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('🎯 Next Steps:\n');
  console.log('1. Verify data in species_bio_bands table');
  console.log('2. Test scoring algorithm with sample rectangle');
  console.log('3. Add remaining 47 species (research + populate)');
  console.log('4. Add substrate parameter (rocky/sandy/mud preferences)');
  console.log('5. Build Phase 1 regional gates check function');
  console.log('6. Integrate into get_environmental_predictions RPC\n');
}

populateBioBands()
  .then(() => {
    console.log('✅ Bio bands population complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
