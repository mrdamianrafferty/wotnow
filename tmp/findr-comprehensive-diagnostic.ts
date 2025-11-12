// Comprehensive Findr Pipeline Diagnostic - Full Test Suite
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENWEATHER_KEY = process.env.OPENWEATHER_SECRET_KEY;
const STORMGLASS_KEY = process.env.STORMGLASS_SECRET_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TestResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// Get actual rectangles from database
async function getTestRectangles() {
  const { data } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, copernicus_region')
    .not('copernicus_region', 'is', null)
    .limit(5);

  return data || [];
}

async function testCMEMSDataIngestion() {
  console.log('\n\n═══ TEST 1: CMEMS Data Ingestion & Retrieval ═══\n');

  const rectangles = await getTestRectangles();

  for (const rect of rectangles) {
    const { data: conditions, error } = await supabase
      .from('findr_conditions_latest')
      .select('*')
      .eq('rectangle_code', rect.rectangle_code)
      .maybeSingle();

    if (error) {
      results.push({
        category: 'CMEMS Data',
        test: `Rectangle ${rect.rectangle_code}`,
        status: 'FAIL',
        message: `Query error: ${error.message}`,
        details: error
      });
      continue;
    }

    if (!conditions) {
      results.push({
        category: 'CMEMS Data',
        test: `Rectangle ${rect.rectangle_code}`,
        status: 'WARN',
        message: 'No conditions data available',
      });
      continue;
    }

    const ageHours = (Date.now() - new Date(conditions.captured_at).getTime()) / (1000 * 60 * 60);
    const variables = {
      temp: conditions.sea_temp_c,
      salinity: conditions.salinity_psu,
      chlorophyll: conditions.chlorophyll_mg_m3,
      clarity: conditions.water_clarity_kd490,
      current: conditions.current_speed_ms,
    };

    const availableCount = Object.values(variables).filter(v => v != null).length;
    let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';

    if (ageHours > 72) status = 'WARN';
    if (availableCount < 3) status = 'FAIL';

    results.push({
      category: 'CMEMS Data',
      test: `Rectangle ${rect.rectangle_code}`,
      status,
      message: `${availableCount}/5 variables, ${ageHours.toFixed(1)}h old`,
      details: { variables, captured_at: conditions.captured_at }
    });
  }
}

async function testWeatherAPIs() {
  console.log('\n\n═══ TEST 2: Weather API Data Retrieval ===\n');

  const rectangles = await getTestRectangles();
  const testRect = rectangles[0];

  if (!testRect) {
    results.push({
      category: 'Weather API',
      test: 'OpenWeather API',
      status: 'FAIL',
      message: 'No test rectangle available',
    });
    return;
  }

  // Test OpenWeather
  if (OPENWEATHER_KEY) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${testRect.center_lat}&lon=${testRect.center_lon}&appid=${OPENWEATHER_KEY}&units=metric`;
      const response = await fetch(url);

      if (!response.ok) {
        results.push({
          category: 'Weather API',
          test: 'OpenWeather API',
          status: 'FAIL',
          message: `HTTP ${response.status}: ${response.statusText}`,
        });
      } else {
        const data = await response.json();
        results.push({
          category: 'Weather API',
          test: 'OpenWeather API',
          status: 'PASS',
          message: `Retrieved: ${data.main?.temp}°C, wind ${data.wind?.speed}m/s`,
          details: data
        });
      }
    } catch (error) {
      results.push({
        category: 'Weather API',
        test: 'OpenWeather API',
        status: 'FAIL',
        message: `Exception: ${error.message}`,
      });
    }
  } else {
    results.push({
      category: 'Weather API',
      test: 'OpenWeather API',
      status: 'WARN',
      message: 'API key not configured',
    });
  }

  // Test Stormglass
  if (STORMGLASS_KEY) {
    try {
      const url = `https://api.stormglass.io/v2/weather/point?lat=${testRect.center_lat}&lng=${testRect.center_lon}&params=waterTemperature,waveHeight`;
      const response = await fetch(url, {
        headers: { 'Authorization': STORMGLASS_KEY }
      });

      if (!response.ok) {
        results.push({
          category: 'Weather API',
          test: 'Stormglass API',
          status: 'FAIL',
          message: `HTTP ${response.status}: ${response.statusText}`,
        });
      } else {
        const data = await response.json();
        const firstHour = data.hours?.[0];
        results.push({
          category: 'Weather API',
          test: 'Stormglass API',
          status: 'PASS',
          message: `Retrieved: waterTemp ${firstHour?.waterTemperature?.noaa}°C`,
          details: firstHour
        });
      }
    } catch (error) {
      results.push({
        category: 'Weather API',
        test: 'Stormglass API',
        status: 'FAIL',
        message: `Exception: ${error.message}`,
      });
    }
  } else {
    results.push({
      category: 'Weather API',
      test: 'Stormglass API',
      status: 'WARN',
      message: 'API key not configured',
    });
  }
}

async function testEnvironmentalMatching() {
  console.log('\n\n═══ TEST 3: Environmental Data Matching to Species Preferences ===\n');

  // Get a rectangle with conditions
  const { data: conditions } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, sea_temp_c, salinity_psu')
    .not('sea_temp_c', 'is', null)
    .limit(1)
    .single();

  if (!conditions) {
    results.push({
      category: 'Environmental Matching',
      test: 'Species Match Test',
      status: 'FAIL',
      message: 'No conditions data available for testing',
    });
    return;
  }

  // Get species with preferences
  const { data: species } = await supabase
    .from('species')
    .select('id, name_en, environmental_preferences, biogeographic_regions, guild')
    .not('environmental_preferences', 'is', null)
    .limit(10);

  if (!species || species.length === 0) {
    results.push({
      category: 'Environmental Matching',
      test: 'Species Match Test',
      status: 'FAIL',
      message: 'No species with preferences found',
    });
    return;
  }

  let matchCount = 0;
  let totalChecked = 0;

  for (const sp of species) {
    const prefs = sp.environmental_preferences as any;

    if (!prefs?.temperature) continue;

    totalChecked++;

    const temp = conditions.sea_temp_c;
    const { min, max } = prefs.temperature;

    if (temp >= min && temp <= max) {
      matchCount++;
    }
  }

  const matchPercent = totalChecked > 0 ? ((matchCount / totalChecked) * 100).toFixed(1) : '0';
  const status = matchCount > 0 ? 'PASS' : 'WARN';

  results.push({
    category: 'Environmental Matching',
    test: 'Species Match Test',
    status,
    message: `${matchCount}/${totalChecked} species match temp range (${matchPercent}%)`,
    details: {
      conditions: { temp: conditions.sea_temp_c, salinity: conditions.salinity_psu },
      matchCount,
      totalChecked
    }
  });
}

async function testPredictionGeneration() {
  console.log('\n\n═══ TEST 4: Prediction Generation for All Species ===\n');

  const rectangles = await getTestRectangles();

  for (const rect of rectangles.slice(0, 3)) { // Test first 3
    const { data: predictions, error } = await supabase
      .rpc('get_environmental_predictions_enhanced', {
        target_rectangle: rect.rectangle_code,
        target_date: new Date().toISOString().split('T')[0]
      }) as { data: any[], error: any };

    if (error) {
      results.push({
        category: 'Prediction Generation',
        test: `Rectangle ${rect.rectangle_code}`,
        status: 'FAIL',
        message: `RPC error: ${error.message}`,
        details: error
      });
      continue;
    }

    const count = predictions?.length || 0;
    const avgConfidence = count > 0
      ? (predictions.reduce((sum, p) => sum + (p.confidence_percent || 0), 0) / count).toFixed(1)
      : '0';

    const status = count >= 20 ? 'PASS' : count > 0 ? 'WARN' : 'FAIL';

    results.push({
      category: 'Prediction Generation',
      test: `Rectangle ${rect.rectangle_code}`,
      status,
      message: `${count} species, avg confidence: ${avgConfidence}%`,
      details: {
        count,
        avgConfidence,
        topSpecies: predictions?.slice(0, 3).map(p => ({
          name: p.species_common_name,
          confidence: p.confidence_percent
        }))
      }
    });
  }
}

async function testDataPipelineIntegrity() {
  console.log('\n\n═══ TEST 5: Data Pipeline Integrity ===\n');

  // Test 1: Rectangle coverage
  const { count: totalRects } = await supabase
    .from('ices_rectangles')
    .select('*', { count: 'exact', head: true });

  const { count: rectsWithConds } = await supabase
    .from('findr_conditions_latest')
    .select('*', { count: 'exact', head: true });

  const coverage = totalRects ? ((rectsWithConds || 0) / totalRects * 100).toFixed(1) : '0';
  const coverageStatus = (rectsWithConds || 0) >= (totalRects || 0) * 0.6 ? 'PASS' : 'WARN';

  results.push({
    category: 'Data Pipeline',
    test: 'Rectangle Coverage',
    status: coverageStatus,
    message: `${rectsWithConds}/${totalRects} rectangles (${coverage}%)`,
  });

  // Test 2: Species without biogeographic regions
  const { data: noRegionSpecies } = await supabase
    .from('species')
    .select('id, name_en')
    .or('biogeographic_regions.is.null,biogeographic_regions.eq.{}');

  results.push({
    category: 'Data Pipeline',
    test: 'Species Biogeographic Regions',
    status: (noRegionSpecies?.length || 0) === 0 ? 'PASS' : 'WARN',
    message: `${noRegionSpecies?.length || 0} species missing regions`,
  });

  // Test 3: Stale data
  const { data: staleData } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, captured_at')
    .lt('captured_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

  const staleCount = staleData?.length || 0;
  const staleStatus = staleCount === 0 ? 'PASS' : staleCount < 10 ? 'WARN' : 'FAIL';

  results.push({
    category: 'Data Pipeline',
    test: 'Data Freshness',
    status: staleStatus,
    message: `${staleCount} rectangles with data >72h old`,
  });
}

function printResults() {
  console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║       FINDR PIPELINE COMPREHENSIVE DIAGNOSTIC                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`\n📊 SUMMARY: ${passed} PASS, ${warned} WARN, ${failed} FAIL (${total} tests)\n`);

  // Group by category
  const categories = [...new Set(results.map(r => r.category))];

  categories.forEach(category => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${category}`);
    console.log('='.repeat(60));

    const categoryResults = results.filter(r => r.category === category);

    ['FAIL', 'WARN', 'PASS'].forEach(status => {
      const items = categoryResults.filter(r => r.status === status);
      if (items.length === 0) return;

      const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';

      items.forEach(item => {
        console.log(`\n${icon} ${item.test}`);
        console.log(`   ${item.message}`);

        if (item.details && process.env.VERBOSE === 'true') {
          console.log(`   Details:`, JSON.stringify(item.details, null, 2));
        }
      });
    });
  });

  // Overall health
  const healthScore = ((passed / total) * 100).toFixed(1);
  console.log('\n\n' + '═'.repeat(60));
  console.log(`\n🏥 OVERALL PIPELINE HEALTH: ${healthScore}%`);

  if (failed > 0) {
    console.log('\n⚠️  CRITICAL: Pipeline has failing components');
  } else if (warned > 0) {
    console.log('\n⚠️  WARNING: Some components need attention');
  } else {
    console.log('\n✅ EXCELLENT: All components functioning correctly');
  }

  console.log('\n' + '═'.repeat(60) + '\n');

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

async function main() {
  console.log('🚀 Starting Comprehensive Findr Pipeline Diagnostic...\n');
  console.log(`Database: ${SUPABASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    await testCMEMSDataIngestion();
    await testWeatherAPIs();
    await testEnvironmentalMatching();
    await testPredictionGeneration();
    await testDataPipelineIntegrity();

    printResults();
  } catch (error) {
    console.error('\n❌ DIAGNOSTIC FAILED:', error);
    process.exit(1);
  }
}

main();
