import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map regions from fishing_advice to ICES rectangle prefixes
const REGION_TO_RECTANGLES: Record<string, string[]> = {
  'North Sea': ['38', '39', '40', '41', '42', '43'],
  'Baltic': ['24', '25', '28', '29', '30'],
  'North Atlantic': ['44', '45', '46', '47', '08', '09', '20', '21', '22', '23'],
  'Atlantic': ['20', '21', '22', '23', '26', '27', '32', '33', '34', '35'],
  'Mediterranean': ['51', '52', '53', '54', '55'],
  'Norwegian waters': ['44', '45', '46', '47', '08', '09'],
  'Celtic Sea': ['32', '33', '34', '35'],
  'Iberia': ['20', '21', '22', '23'],
  'Bay of Biscay': ['26', '27', '28'],
};

// The 14 DATRAS species we found
const DATRAS_SPECIES = [
  'anchovy', 'bream', 'cod', 'haddock', 'hake', 
  'herring', 'mackerel', 'plaice', 'pollack', 
  'sardine', 'sea-bass', 'sole', 'turbot', 'whiting'
];

async function analyzeDATRASValidCombinations() {
  console.log('🔍 Analyzing DATRAS Data Against Species Regional Data\n');
  console.log('=' .repeat(80));
  
  // Get all species with their regional data
  const { data: allSpecies, error: speciesError } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name, advice')
    .limit(100);
  
  if (speciesError) {
    console.error('Error fetching species:', speciesError);
    return;
  }
  
  console.log(`\nFound ${allSpecies.length} species in database\n`);
  
  // Extract regional information for DATRAS species
  const datrasSpeciesWithRegions: Record<string, { name: string, regions: string[] }> = {};
  
  for (const species of allSpecies) {
    if (!DATRAS_SPECIES.some(d => 
      species.species_code?.toLowerCase().includes(d) || 
      species.name_en?.toLowerCase().includes(d)
    )) {
      continue; // Not a DATRAS species
    }
    
    const regions: Set<string> = new Set();
    
    // Extract regions from advice
    if (species.advice) {
      const advice = species.advice as any;
      
      // Check shore advice
      if (advice.shore?.regions) {
        const regionStr = advice.shore.regions as string;
        regions.add(regionStr);
      }
      
      // Check boat advice
      if (advice.boat?.regions) {
        const regionStr = advice.boat.regions as string;
        regions.add(regionStr);
      }
    }
    
    const speciesKey = DATRAS_SPECIES.find(d => 
      species.species_code?.toLowerCase().includes(d) || 
      species.name_en?.toLowerCase().includes(d)
    )!;
    
    datrasSpeciesWithRegions[speciesKey] = {
      name: species.name_en || species.species_code || 'Unknown',
      regions: Array.from(regions)
    };
  }
  
  console.log('📊 DATRAS Species with Regional Data:\n');
  for (const [key, data] of Object.entries(datrasSpeciesWithRegions)) {
    console.log(`${data.name} (${key}):`);
    console.log(`  Regions: ${data.regions.join(' | ')}`);
    console.log();
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Testing Valid DATRAS Combinations\n');
  
  // Get sample of DATRAS rectangles
  const { data: datrasRects, error: rectError } = await supabase
    .from('species_monthly_abundance')
    .select('rectangle_code')
    .limit(100);
  
  if (rectError) {
    console.error('Error:', rectError);
    return;
  }
  
  const uniqueRectangles = [...new Set(datrasRects.map(r => r.rectangle_code))];
  
  // Test each rectangle against species regions
  const validCombinations: Array<{rect: string, species: string[], region: string}> = [];
  const invalidCombinations: Array<{rect: string, wrongSpecies: string[], region: string}> = [];
  
  for (const rectCode of uniqueRectangles.slice(0, 10)) { // Test first 10
    const prefix = rectCode.substring(0, 2);
    
    // Determine rectangle region
    let rectRegion = 'Unknown';
    for (const [region, prefixes] of Object.entries(REGION_TO_RECTANGLES)) {
      if (prefixes.includes(prefix)) {
        rectRegion = region;
        break;
      }
    }
    
    // Check which DATRAS species are valid for this region
    const validSpecies: string[] = [];
    const invalidSpecies: string[] = [];
    
    for (const [speciesKey, speciesData] of Object.entries(datrasSpeciesWithRegions)) {
      const regionMatch = speciesData.regions.some(r => {
        // Fuzzy match region names
        const regionLower = r.toLowerCase();
        const rectRegionLower = rectRegion.toLowerCase();
        
        return regionLower.includes(rectRegionLower) || 
               rectRegionLower.includes(regionLower.split(',')[0].trim());
      });
      
      if (regionMatch) {
        validSpecies.push(speciesKey);
      } else {
        invalidSpecies.push(speciesKey);
      }
    }
    
    const accuracy = (validSpecies.length / 14) * 100;
    const badge = accuracy > 60 ? '🟢' : accuracy > 30 ? '🟡' : '🔴';
    
    console.log(`${badge} Rectangle ${rectCode} (${rectRegion}):`);
    console.log(`   Valid species (${validSpecies.length}/14): ${validSpecies.join(', ')}`);
    console.log(`   Invalid species (${invalidSpecies.length}/14): ${invalidSpecies.slice(0, 5).join(', ')}${invalidSpecies.length > 5 ? '...' : ''}`);
    console.log(`   Regional accuracy: ${accuracy.toFixed(0)}%\n`);
    
    if (accuracy > 60) {
      validCombinations.push({ rect: rectCode, species: validSpecies, region: rectRegion });
    } else {
      invalidCombinations.push({ rect: rectCode, wrongSpecies: invalidSpecies, region: rectRegion });
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 Summary:\n');
  
  console.log(`✅ Rectangles with >60% valid species: ${validCombinations.length}`);
  if (validCombinations.length > 0) {
    console.log('   Sample valid rectangles:');
    validCombinations.slice(0, 3).forEach(c => {
      console.log(`   - ${c.rect} (${c.region}): ${c.species.length} valid species`);
    });
  }
  
  console.log(`\n❌ Rectangles with <60% valid species: ${invalidCombinations.length}`);
  if (invalidCombinations.length > 0) {
    console.log('   Sample invalid rectangles:');
    invalidCombinations.slice(0, 3).forEach(c => {
      console.log(`   - ${c.rect} (${c.region}): ${c.wrongSpecies.length} misplaced species`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('💡 Recommendations:\n');
  
  if (validCombinations.length > invalidCombinations.length) {
    console.log('✅ DATRAS data IS SALVAGEABLE!');
    console.log('   Strategy: Filter species_monthly_abundance by species regional validity');
    console.log('   Approach:');
    console.log('   1. Keep DATRAS records where species region matches rectangle region');
    console.log('   2. Discard records where species is outside its known range');
    console.log('   3. Use filtered DATRAS + environmental fallback for missing combos\n');
  } else {
    console.log('❌ DATRAS data NOT SALVAGEABLE');
    console.log('   Reason: Too few valid species/rectangle combinations');
    console.log('   Recommendation: Use environmental matching exclusively\n');
  }
  
  // Check if we have regional data for all 14 DATRAS species
  const speciesWithRegions = Object.keys(datrasSpeciesWithRegions).length;
  console.log(`\n📝 Regional Data Coverage: ${speciesWithRegions}/14 DATRAS species have region info`);
  
  if (speciesWithRegions < 14) {
    console.log(`⚠️  Missing regional data for ${14 - speciesWithRegions} species`);
    console.log('   Need to populate fishing_advice.regions for all 14 DATRAS species');
  }
}

analyzeDATRASValidCombinations()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
