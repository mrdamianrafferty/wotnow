import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBioBandsRelationship() {
  console.log('🔍 Analyzing species_bio_bands vs environmental_preferences\n');
  console.log('='.repeat(80));
  
  // Check current bio_bands data
  const { data: bioBands, error } = await supabase
    .from('species_bio_bands')
    .select('*')
    .limit(50);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`\n📊 Current species_bio_bands: ${bioBands?.length || 0} records\n`);
  
  if (bioBands && bioBands.length > 0) {
    // Group by parameter
    const byParam = new Map<string, number>();
    bioBands.forEach(row => {
      byParam.set(row.parameter, (byParam.get(row.parameter) || 0) + 1);
    });
    
    console.log('Parameters currently stored:');
    byParam.forEach((count, param) => {
      console.log(`  - ${param}: ${count} species`);
    });
    
    console.log('\n📋 Sample records:\n');
    bioBands.slice(0, 3).forEach((row, idx) => {
      console.log(`${idx + 1}. Parameter: ${row.parameter}`);
      console.log(`   Happy bands: ${JSON.stringify(row.happy_bands)}`);
      console.log(`   Unhappy bands: ${JSON.stringify(row.unhappy_bands)}\n`);
    });
  } else {
    console.log('⚠️  Table is EMPTY - needs population');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🎯 RECOMMENDATION: Use BOTH systems (complementary)\n');
  console.log('='.repeat(80));
  
  console.log('\n📦 species_bio_bands (EXISTING - Qualitative Bands)');
  console.log('─'.repeat(80));
  console.log('Purpose: Marine chemistry & biological indicators');
  console.log('Format: happy_bands[], unhappy_bands[] using bio_level enum');
  console.log('Best for:');
  console.log('  - chlorophyll (phytoplankton productivity)');
  console.log('  - nitrate, phosphate (nutrient levels)');
  console.log('  - oxygen (dissolved oxygen)');
  console.log('  - phytoplankton (algae biomass)');
  console.log('\nWhy qualitative bands work here:');
  console.log('  - Scientific consensus on "high" vs "low" chlorophyll');
  console.log('  - Biological thresholds (e.g., oxygen <4mg/L = hypoxic)');
  console.log('  - Already mapped to CMEMs data (very_low, low, normal, high, very_high)');
  
  console.log('\n\n🆕 environmental_preferences (PROPOSED - Quantitative Ranges)');
  console.log('─'.repeat(80));
  console.log('Purpose: Physical habitat requirements');
  console.log('Format: JSONB with numeric ranges');
  console.log('Best for:');
  console.log('  - temperature (optimal_min/max, tolerance_min/max in °C)');
  console.log('  - salinity (optimal_min/max, tolerance_min/max in PSU)');
  console.log('  - depth (optimal_min/max, typical_min/max in meters)');
  console.log('  - substrate (array: [sand, rock, mud, weed, mixed])');
  console.log('\nWhy quantitative ranges work here:');
  console.log('  - Precise FishBase data available (e.g., Cod 2-18°C)');
  console.log('  - Need exact ranges for Phase 2 scoring');
  console.log('  - Substrate is categorical (not a band)');
  console.log('  - Depth can vary wildly (shore 0-20m vs boat 0-600m)');
  
  console.log('\n\n⚙️  Phase 2 Scoring Algorithm (HYBRID)');
  console.log('─'.repeat(80));
  console.log('1. Physical parameters (70% weight) from environmental_preferences:');
  console.log('   - Temperature match: 35% (numeric range scoring)');
  console.log('   - Salinity match: 25% (numeric range scoring)');
  console.log('   - Depth match: 20% (numeric range scoring)');
  console.log('   - Substrate match: 20% (categorical match)');
  console.log('\n2. Chemical/biological factors (30% weight) from species_bio_bands:');
  console.log('   - Chlorophyll: 10% (qualitative band match)');
  console.log('   - Oxygen: 10% (qualitative band match)');
  console.log('   - Nutrient balance: 10% (nitrate + phosphate band match)');
  
  console.log('\n\n📝 Example: Cod (Gadus morhua)');
  console.log('─'.repeat(80));
  console.log('\nenvironmental_preferences (species table JSONB):');
  console.log(JSON.stringify({
    temperature: {
      optimal_min: 2,
      optimal_max: 10,
      tolerance_min: 0,
      tolerance_max: 18,
      unit: 'celsius'
    },
    salinity: {
      optimal_min: 30,
      optimal_max: 35,
      tolerance_min: 11,
      tolerance_max: 38,
      unit: 'psu'
    },
    depth: {
      optimal_min: 20,
      optimal_max: 200,
      typical_min: 5,
      typical_max: 600,
      unit: 'meters'
    },
    substrate: ['rock', 'sand', 'mixed']
  }, null, 2));
  
  console.log('\nspecies_bio_bands records:');
  console.log('  (species_id, "chlorophyll", ["low", "normal"], ["very_high"])');
  console.log('  (species_id, "oxygen", ["normal", "high"], ["very_low"])');
  console.log('  (species_id, "nitrate", ["low", "normal"], ["very_high"])');
  
  console.log('\n\n✅ NEXT STEPS');
  console.log('─'.repeat(80));
  console.log('1. Create environmental_preferences JSONB column (ALTER TABLE species)');
  console.log('2. Research physical parameters for 62 species (temp, salinity, depth, substrate)');
  console.log('3. Populate environmental_preferences via migration');
  console.log('4. Keep species_bio_bands for chemical/biological indicators');
  console.log('5. Update RPC function to query BOTH tables for hybrid scoring');
  console.log('6. Phase 1 gates already use advice.regions (no change needed)');
  
  console.log('\n\n💡 KEY INSIGHT');
  console.log('─'.repeat(80));
  console.log('These are NOT duplicate systems - they serve different purposes:');
  console.log('  - bio_bands = "Is the WATER QUALITY suitable?" (qualitative chemistry)');
  console.log('  - environmental_preferences = "Is this the RIGHT HABITAT?" (quantitative physics)');
  console.log('\nBoth contribute to overall suitability score!');
  console.log('='.repeat(80));
  
  // Save recommendation
  const report = {
    timestamp: new Date().toISOString(),
    current_bio_bands_records: bioBands?.length || 0,
    recommendation: 'USE_BOTH_COMPLEMENTARY',
    rationale: {
      bio_bands: 'Marine chemistry & biological indicators (qualitative bands)',
      environmental_preferences: 'Physical habitat requirements (quantitative ranges)'
    },
    architecture: {
      bio_bands: {
        table: 'species_bio_bands',
        format: 'happy_bands[], unhappy_bands[] (bio_level enum)',
        parameters: ['chlorophyll', 'nitrate', 'oxygen', 'phosphate', 'phytoplankton'],
        weight_in_phase2: '30%'
      },
      environmental_preferences: {
        table: 'species (new JSONB column)',
        format: 'numeric ranges + categorical arrays',
        parameters: ['temperature', 'salinity', 'depth', 'substrate'],
        weight_in_phase2: '70%'
      }
    },
    next_steps: [
      'ALTER TABLE species ADD environmental_preferences JSONB',
      'Research 62 species physical params (12-17 hours)',
      'Create migration to populate environmental_preferences',
      'Update RPC to query both tables',
      'Validate hybrid scoring algorithm'
    ]
  };
  
  const outputPath = path.join(process.cwd(), 'BIO_BANDS_VS_ENVIRONMENTAL_PREFS_DECISION.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Full analysis saved to: BIO_BANDS_VS_ENVIRONMENTAL_PREFS_DECISION.json`);
}

checkBioBandsRelationship()
  .then(() => process.exit(0))
  .catch(console.error);
