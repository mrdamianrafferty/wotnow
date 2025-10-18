import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import {
  getSpeciesName,
  getConfidence,
  getTempScore,
  getBioScore,
  findSpeciesByName,
  getSpeciesRank,
  getBiogeographicRegions
} from '../lib/utils/rpcResponseNormalizer';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestArea {
  name: string;
  rectangleCode: string;
  region: string;
  expectedSpecies?: string[];
  unexpectedSpecies?: string[];
}

const testAreas: TestArea[] = [
  // Atlantic (UK/Ireland) - 7 rectangles available
  {
    name: 'Atlantic - Cornwall/Ireland',
    rectangleCode: '39E1',
    region: 'Atlantic',
    expectedSpecies: ['European Bass', 'Mackerel', 'Pollack'],
    unexpectedSpecies: ['Bogue', 'White Seabream', 'Painted Comber']
  },
  {
    name: 'Atlantic - Celtic Sea',
    rectangleCode: '40F1',
    region: 'Atlantic',
    expectedSpecies: ['European Bass', 'Mackerel', 'Cod'],
    unexpectedSpecies: ['Bogue', 'Gilt-head Bream']
  },
  
  // Bay of Biscay - 84 rectangles available!
  {
    name: 'Bay of Biscay - Western',
    rectangleCode: '31C6',
    region: 'Bay of Biscay',
    expectedSpecies: ['European Bass', 'Mackerel', 'Pollack'],
    unexpectedSpecies: ['Bogue', 'Seabream']
  },
  {
    name: 'Bay of Biscay - Central',
    rectangleCode: '31E3',
    region: 'Bay of Biscay',
    expectedSpecies: ['European Bass', 'Hake', 'Mackerel'],
    unexpectedSpecies: ['Bogue', 'White Seabream']
  },
  {
    name: 'Bay of Biscay - Eastern',
    rectangleCode: '25E1',
    region: 'Bay of Biscay',
    expectedSpecies: ['European Bass', 'Mackerel'],
    unexpectedSpecies: ['Bogue', 'Salema']
  },
  
  // English Channel - 10 rectangles available
  {
    name: 'English Channel - French Coast',
    rectangleCode: '37M0',
    region: 'English Channel',
    expectedSpecies: ['Bass', 'Mackerel', 'Plaice'],
    unexpectedSpecies: ['Bogue', 'Red Mullet']
  },
  {
    name: 'English Channel - Mid Channel',
    rectangleCode: '37N0',
    region: 'English Channel',
    expectedSpecies: ['Bass', 'Cod', 'Sole'],
    unexpectedSpecies: ['Bogue', 'Seabream']
  },
  
  // IBI (Portugal) - 54 rectangles available
  {
    name: 'Portugal - Galician Coast',
    rectangleCode: '21D8',
    region: 'IBI',
    expectedSpecies: ['European Bass', 'Mackerel', 'Bogue'],
    unexpectedSpecies: ['Painted Comber'] // IBI can have some Med species
  },
  {
    name: 'Portugal - Northern Coast',
    rectangleCode: '22D6',
    region: 'IBI',
    expectedSpecies: ['Bass', 'Sardine', 'Mackerel'],
    unexpectedSpecies: []
  },
  {
    name: 'Portugal - Central Coast (Lisbon)',
    rectangleCode: '20C5',
    region: 'IBI',
    expectedSpecies: ['Bass', 'Seabream', 'Sardine'],
    unexpectedSpecies: []
  },
  
  // Mediterranean - 86 rectangles available!
  {
    name: 'Mediterranean - Spanish Coast',
    rectangleCode: '22L4',
    region: 'Mediterranean',
    expectedSpecies: ['Bogue', 'Red Mullet', 'Seabream'],
    unexpectedSpecies: [] // All Med species allowed
  },
  {
    name: 'Mediterranean - Catalonia',
    rectangleCode: '22M3',
    region: 'Mediterranean',
    expectedSpecies: ['Bogue', 'White Seabream', 'Red Mullet'],
    unexpectedSpecies: []
  },
  {
    name: 'Mediterranean - Balearic',
    rectangleCode: '22L8',
    region: 'Mediterranean',
    expectedSpecies: ['Bogue', 'Gilt-head Bream', 'Seabream'],
    unexpectedSpecies: []
  },
  
  // North Sea - 3 rectangles available
  {
    name: 'North Sea - Netherlands Coast',
    rectangleCode: '42P1',
    region: 'North Sea',
    expectedSpecies: ['Cod', 'Plaice', 'Whiting'],
    unexpectedSpecies: ['Bogue', 'Red Mullet', 'Seabream']
  },
  {
    name: 'North Sea - Dutch/German Border',
    rectangleCode: '43P1',
    region: 'North Sea',
    expectedSpecies: ['Cod', 'Herring', 'Plaice'],
    unexpectedSpecies: ['Bogue', 'Mediterranean species']
  }
];

async function testArea(area: TestArea) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📍 Testing: ${area.name}`);
  console.log(`   Rectangle: ${area.rectangleCode} | Region: ${area.region}`);
  console.log(`${'='.repeat(80)}`);

  try {
    // First check if we have environmental data for this rectangle
    const { data: envData, error: envError } = await supabase
      .from('findr_conditions_snapshots')
      .select('rectangle_code, captured_at, sea_temp_c')
      .eq('rectangle_code', area.rectangleCode)
      .order('captured_at', { ascending: false })
      .limit(1);

    if (envError) {
      console.error(`   ❌ Error checking environmental data:`, envError.message);
      return { area: area.name, status: 'error', error: envError.message };
    }

    if (!envData || envData.length === 0) {
      console.log(`   ⚠️  No environmental data available`);
      return { area: area.name, status: 'no_data', predictions: 0 };
    }

    const latestData = envData[0];
    console.log(`   ✅ Environmental data found:`);
    console.log(`      Latest: ${latestData.captured_at}`);
    console.log(`      Temp: ${latestData.sea_temp_c}°C`);

    // Call the enhanced RPC function
    const { data: predictions, error: rpcError } = await supabase.rpc(
      'get_environmental_predictions_enhanced',
      {
        target_rectangle: area.rectangleCode,
        target_date: new Date().toISOString().split('T')[0],
        user_lat: null,
        user_lon: null,
        substrate_type: null,
        depth_meters: null,
        current_wind_speed_ms: 5.0,
        current_pressure_hpa: 1013.0
      }
    );

    if (rpcError) {
      console.error(`   ❌ RPC Error:`, rpcError.message);
      return { area: area.name, status: 'rpc_error', error: rpcError.message };
    }

    if (!predictions || predictions.length === 0) {
      console.log(`   ⚠️  No predictions returned (RPC succeeded but no species matched)`);
      return { area: area.name, status: 'no_predictions', predictions: 0 };
    }

    console.log(`   ✅ Predictions: ${predictions.length} species`);
    
    // Show top 5 predictions
    console.log(`\n   Top 5 Species:`);
    predictions.slice(0, 5).forEach((pred: any, idx: number) => {
      const name = getSpeciesName(pred);
      const conf = getConfidence(pred);
      const temp = getTempScore(pred);
      const bio = getBioScore(pred);
      console.log(`      ${idx + 1}. ${name.padEnd(25)} - ${conf}% (Temp: ${temp}, Bio: ${bio})`);
    });

    // Check for expected species
    if (area.expectedSpecies && area.expectedSpecies.length > 0) {
      console.log(`\n   Expected Species Check:`);
      area.expectedSpecies.forEach(expectedName => {
        const found = findSpeciesByName(predictions, expectedName);
        if (found) {
          const rank = getSpeciesRank(predictions, expectedName);
          const conf = getConfidence(found);
          console.log(`      ✅ ${expectedName} - Found at rank #${rank} (${conf}%)`);
        } else {
          console.log(`      ❌ ${expectedName} - NOT FOUND`);
        }
      });
    }

    // Check for unexpected species (should NOT be present)
    if (area.unexpectedSpecies && area.unexpectedSpecies.length > 0) {
      console.log(`\n   Unexpected Species Check (should NOT be present):`);
      let foundUnexpected = false;
      area.unexpectedSpecies.forEach(unexpectedName => {
        const found = findSpeciesByName(predictions, unexpectedName);
        if (found) {
          const rank = getSpeciesRank(predictions, unexpectedName);
          const conf = getConfidence(found);
          console.log(`      ❌ ${unexpectedName} - INCORRECTLY PRESENT at rank #${rank} (${conf}%)`);
          foundUnexpected = true;
        } else {
          console.log(`      ✅ ${unexpectedName} - Correctly filtered out`);
        }
      });
      
      if (foundUnexpected) {
        return { area: area.name, status: 'filtering_error', predictions: predictions.length };
      }
    }

    // Show unique biogeographic regions in results
    const regions = new Set(predictions.flatMap((p: any) => getBiogeographicRegions(p)));
    console.log(`\n   Biogeographic Regions in Results: ${Array.from(regions).join(', ') || 'None returned (check RPC)'}`);

    return { 
      area: area.name, 
      status: 'success', 
      predictions: predictions.length,
      topSpecies: predictions.slice(0, 3).map((p: any) => getSpeciesName(p))
    };

  } catch (error: any) {
    console.error(`   ❌ Exception:`, error.message);
    return { area: area.name, status: 'exception', error: error.message };
  }
}

async function runAllTests() {
  console.log('🌊 EUROPEAN COASTLINES TEST - 15 DISTINCT AREAS');
  console.log('='.repeat(80));
  console.log(`Testing biogeographic filtering across European waters`);
  console.log(`Date: ${new Date().toISOString().split('T')[0]}`);
  console.log('='.repeat(80));

  const results = [];

  for (const area of testAreas) {
    const result = await testArea(area);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n\n');
  console.log('═'.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(80));

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error' || r.status === 'rpc_error' || r.status === 'exception').length;
  const noDataCount = results.filter(r => r.status === 'no_data').length;
  const noPredictionsCount = results.filter(r => r.status === 'no_predictions').length;
  const filteringErrorCount = results.filter(r => r.status === 'filtering_error').length;

  console.log(`\n📈 Results:`);
  console.log(`   ✅ Success: ${successCount}/${testAreas.length}`);
  console.log(`   ⚠️  No Data: ${noDataCount}/${testAreas.length}`);
  console.log(`   ⚠️  No Predictions: ${noPredictionsCount}/${testAreas.length}`);
  console.log(`   ❌ Filtering Errors: ${filteringErrorCount}/${testAreas.length}`);
  console.log(`   ❌ Technical Errors: ${errorCount}/${testAreas.length}`);

  if (successCount > 0) {
    console.log(`\n✅ Successful Areas:`);
    results
      .filter(r => r.status === 'success')
      .forEach(r => {
        console.log(`   • ${r.area}: ${r.predictions} predictions`);
        if (r.topSpecies) {
          console.log(`     Top species: ${r.topSpecies.join(', ')}`);
        }
      });
  }

  if (noDataCount > 0) {
    console.log(`\n⚠️  Areas Without Environmental Data:`);
    results
      .filter(r => r.status === 'no_data')
      .forEach(r => console.log(`   • ${r.area}`));
  }

  if (noPredictionsCount > 0) {
    console.log(`\n⚠️  Areas With Data But No Predictions:`);
    results
      .filter(r => r.status === 'no_predictions')
      .forEach(r => console.log(`   • ${r.area}`));
  }

  if (filteringErrorCount > 0) {
    console.log(`\n❌ Areas With Biogeographic Filtering Issues:`);
    results
      .filter(r => r.status === 'filtering_error')
      .forEach(r => console.log(`   • ${r.area}: Mediterranean species appearing outside range!`));
  }

  if (errorCount > 0) {
    console.log(`\n❌ Areas With Technical Errors:`);
    results
      .filter(r => r.status === 'error' || r.status === 'rpc_error' || r.status === 'exception')
      .forEach(r => console.log(`   • ${r.area}: ${r.error}`));
  }

  console.log('\n' + '═'.repeat(80));
  
  const overallStatus = filteringErrorCount === 0 && errorCount === 0 ? 'PASSED' : 'FAILED';
  const emoji = overallStatus === 'PASSED' ? '✅' : '❌';
  console.log(`${emoji} OVERALL TEST STATUS: ${overallStatus}`);
  console.log('═'.repeat(80));

  if (overallStatus === 'PASSED') {
    console.log(`\n🎉 Biogeographic filtering is working correctly across all tested areas!`);
  } else {
    console.log(`\n⚠️  Some areas have issues that need investigation.`);
  }

  process.exit(overallStatus === 'PASSED' ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
