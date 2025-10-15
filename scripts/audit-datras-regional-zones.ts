import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define biogeographic zones and expected species
const BIOGEOGRAPHIC_ZONES = {
  north_atlantic: {
    prefixes: ['20', '21', '22', '23', '26', '27', '28'], // Iberian, Biscay
    expected_species: ['hake', 'sardine', 'anchovy', 'sea-bass', 'bream'],
    region_name: 'North Atlantic / Iberian Coast'
  },
  celtic_sea: {
    prefixes: ['32', '33', '34', '35'],
    expected_species: ['haddock', 'whiting', 'plaice', 'sole', 'cod'],
    region_name: 'Celtic Sea'
  },
  north_sea: {
    prefixes: ['38', '39', '40', '41', '42', '43'],
    expected_species: ['cod', 'haddock', 'whiting', 'plaice', 'sole', 'herring'],
    region_name: 'North Sea'
  },
  western_baltic: {
    prefixes: ['24', '25'],
    expected_species: ['herring', 'sprat', 'cod'],
    region_name: 'Western Baltic'
  },
  eastern_baltic: {
    prefixes: ['28', '29', '30'],
    expected_species: ['herring', 'sprat', 'flounder'], // Low salinity fauna
    region_name: 'Eastern Baltic (DATRAS likely wrong here)'
  },
  norwegian_sea: {
    prefixes: ['44', '45', '46', '47', '08', '09'],
    expected_species: ['cod', 'haddock', 'mackerel'],
    region_name: 'Norwegian / North Atlantic'
  }
};

async function auditDATRASRegionalAccuracy() {
  console.log('🔍 Auditing DATRAS Regional Accuracy\n');
  console.log('=' .repeat(80));
  
  // Get all rectangles with DATRAS data
  const { data: rectanglesWithData, error: rectError } = await supabase
    .from('species_monthly_abundance')
    .select('rectangle_code')
    .limit(1000);
  
  if (rectError) {
    console.error('Error fetching rectangles:', rectError);
    return;
  }
  
  const uniqueRectangles = [...new Set(rectanglesWithData.map(r => r.rectangle_code))];
  console.log(`\nFound ${uniqueRectangles.length} unique rectangles with DATRAS data\n`);
  
  // Group rectangles by biogeographic zone
  const zoneStats: Record<string, { rectangles: string[], zones: string[] }> = {};
  
  for (const rectCode of uniqueRectangles) {
    const prefix = rectCode.substring(0, 2);
    
    for (const [zoneName, zoneData] of Object.entries(BIOGEOGRAPHIC_ZONES)) {
      if (zoneData.prefixes.includes(prefix)) {
        if (!zoneStats[zoneName]) {
          zoneStats[zoneName] = { rectangles: [], zones: [zoneData.region_name] };
        }
        zoneStats[zoneName].rectangles.push(rectCode);
      }
    }
  }
  
  console.log('📊 Rectangle Distribution by Biogeographic Zone:\n');
  for (const [zoneName, stats] of Object.entries(zoneStats)) {
    const zoneData = BIOGEOGRAPHIC_ZONES[zoneName as keyof typeof BIOGEOGRAPHIC_ZONES];
    console.log(`${zoneData.region_name}:`);
    console.log(`  Rectangles: ${stats.rectangles.length}`);
    console.log(`  Samples: ${stats.rectangles.slice(0, 5).join(', ')}${stats.rectangles.length > 5 ? '...' : ''}`);
    console.log(`  Expected species: ${zoneData.expected_species.join(', ')}\n`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Testing Sample Rectangles for Regional Accuracy\n');
  
  // Test one rectangle from each zone
  const testCases = [
    { code: '21D8', expected_zone: 'north_atlantic', expected: ['hake', 'sardine', 'anchovy'] },
    { code: '20C5', expected_zone: 'north_atlantic', expected: ['hake', 'sardine'] },
    { code: '38F5', expected_zone: 'north_sea', expected: ['cod', 'haddock', 'plaice'] },
    { code: '39G5', expected_zone: 'north_sea', expected: ['cod', 'whiting'] },
    { code: '32E5', expected_zone: 'celtic_sea', expected: ['haddock', 'sole'] },
  ];
  
  for (const testCase of testCases) {
    // Get species for this rectangle
    const { data: speciesData, error: speciesError } = await supabase
      .from('species_monthly_abundance')
      .select('species_id, rectangle_code')
      .eq('rectangle_code', testCase.code);
    
    if (speciesError) {
      console.error(`Error for ${testCase.code}:`, speciesError);
      continue;
    }
    
    if (!speciesData || speciesData.length === 0) {
      console.log(`❌ ${testCase.code} (${testCase.expected_zone}): NO DATA\n`);
      continue;
    }
    
    const speciesIds = speciesData.map(s => s.species_id);
    
    // Calculate match percentage
    const matches = speciesIds.filter(id => testCase.expected.includes(id.toLowerCase()));
    const matchPct = (matches.length / speciesIds.length) * 100;
    
    const badge = matchPct > 60 ? '🟢' : matchPct > 30 ? '🟡' : '🔴';
    
    console.log(`${badge} Rectangle ${testCase.code} (${testCase.expected_zone}):`);
    console.log(`   Species count: ${speciesIds.length}`);
    console.log(`   Species: ${speciesIds.join(', ')}`);
    console.log(`   Expected: ${testCase.expected.join(', ')}`);
    console.log(`   Regional match: ${matchPct.toFixed(0)}%`);
    console.log(`   Verdict: ${matchPct > 60 ? 'VALID for DATRAS' : matchPct > 30 ? 'QUESTIONABLE' : 'INVALID - use environmental'}\n`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 Recommendations:\n');
  
  console.log('✅ VALID DATRAS ZONES (use survey data):');
  console.log('   - North Atlantic (20*, 21*, 22*, 23*)');
  console.log('   - Bay of Biscay (26*, 27*, 28*)');
  console.log('   - Celtic Sea (32*, 33*, 34*, 35*)');
  console.log('   - North Sea (38*, 39*, 40*, 41*, 42*, 43*)\n');
  
  console.log('⚠️  QUESTIONABLE ZONES (validate case-by-case):');
  console.log('   - Western Baltic (24*, 25*) - check salinity tolerance');
  console.log('   - Norwegian Sea (44*, 45*) - limited species overlap\n');
  
  console.log('❌ INVALID DATRAS ZONES (use environmental model):');
  console.log('   - Eastern Baltic (28*, 29*, 30*) - wrong salinity regime');
  console.log('   - Mediterranean (51*, 52*, 53*) - completely different fauna');
  console.log('   - Arctic (54*, 55*) - different temperature regime');
  console.log('   - Any rectangle not covered by DATRAS surveys\n');
}

auditDATRASRegionalAccuracy()
  .then(() => {
    console.log('✅ Audit complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
