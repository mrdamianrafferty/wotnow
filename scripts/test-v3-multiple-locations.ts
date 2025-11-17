import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ConfidenceResult {
  species_code: string;
  species_name: string;
  confidence_percent: number;
  seasonal_phase: string;
  seasonal_weight: number;
  availability_multiplier: number;
  seasonality_source: string | null;
}

// Test locations across Europe
const TEST_LOCATIONS = [
  { code: '31F2', name: 'English Channel (IBI)', region: 'Iberia-Biscay-Ireland' },
  { code: '28E5', name: 'North Sea (NWS)', region: 'Northwest Shelf' },
  { code: '37I0', name: 'Mediterranean (MED)', region: 'Mediterranean' },
  { code: '21C6', name: 'Celtic Sea (NWS)', region: 'Northwest Shelf' },
  { code: '39F3', name: 'Bay of Biscay (IBI)', region: 'Iberia-Biscay-Ireland' },
];

async function testLocation(rectangleCode: string, locationName: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📍 ${locationName} (${rectangleCode})`);
  console.log('='.repeat(80));

  const { data, error } = await supabase.rpc('get_fishing_confidence_v3', {
    target_rectangle: rectangleCode,
    target_date: '2025-11-17',
    target_month: 11
  });

  if (error) {
    console.error(`❌ Error for ${rectangleCode}:`, error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No species data available');
    return;
  }

  const results = data as ConfidenceResult[];

  // Stats
  const withSeasonality = results.filter(r => r.seasonal_phase !== 'no_data');
  const peakSpecies = results.filter(r => r.seasonal_phase === 'peak');
  const goodSpecies = results.filter(r => r.seasonal_phase === 'good');
  const offSeasonSpecies = results.filter(r => r.seasonal_phase === 'off');

  console.log(`\n📊 Summary:`);
  console.log(`   Total species: ${results.length}`);
  console.log(`   With seasonality data: ${withSeasonality.length} (${Math.round(withSeasonality.length/results.length*100)}%)`);
  console.log(`   Peak season: ${peakSpecies.length}`);
  console.log(`   Good season: ${goodSpecies.length}`);
  console.log(`   Off season: ${offSeasonSpecies.length}`);

  // Top 10 species overall
  console.log(`\n🏆 Top 10 Species (by confidence):`);
  results.slice(0, 10).forEach((r, i) => {
    const phaseEmoji = {
      peak: '🔥',
      good: '✅',
      possible: '🟡',
      off: '❄️',
      no_data: '⚪'
    }[r.seasonal_phase] || '❓';

    console.log(`   ${i+1}. ${r.species_code} - ${r.species_name}`);
    console.log(`      Confidence: ${r.confidence_percent}% | Phase: ${phaseEmoji} ${r.seasonal_phase} (×${r.seasonal_weight})`);
  });

  // Show best in-season species
  if (peakSpecies.length > 0) {
    console.log(`\n🔥 Peak Season Species (top 5):`);
    peakSpecies.slice(0, 5).forEach((r, i) => {
      console.log(`   ${i+1}. ${r.species_code} - ${r.species_name} (${r.confidence_percent}%)`);
    });
  }

  // Show species that are currently off-season
  if (offSeasonSpecies.length > 0) {
    console.log(`\n❄️  Off-Season Species (confidence reduced to 0):`);
    offSeasonSpecies.slice(0, 3).forEach((r, i) => {
      console.log(`   - ${r.species_code} - ${r.species_name}`);
    });
  }
}

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  Confidence V3 - Multi-Location Regional Seasonality Test                    ║');
  console.log('║  Testing regional seasonality across diverse European fishing zones          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n🗓️  Testing for: November 2025`);

  for (const location of TEST_LOCATIONS) {
    await testLocation(location.code, location.name);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Multi-location test complete!');
  console.log('='.repeat(80));
}

runTests().catch(console.error);
