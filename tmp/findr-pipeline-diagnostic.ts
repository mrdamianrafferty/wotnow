// Comprehensive Findr Pipeline Diagnostic
// Tests: CMEMS data, Weather API, Species matching, Prediction generation

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STORMGLASS_SECRET_KEY = process.env.STORMGLASS_SECRET_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// Test rectangles representing different regions
const TEST_RECTANGLES = [
  { code: '31F1', region: 'English Channel', lat: 50.25, lon: -4.5 },
  { code: '28E5', region: 'Celtic Sea', lat: 51.75, lon: -8.5 },
  { code: '39F3', region: 'North Sea', lat: 54.75, lon: 3.5 },
];

async function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function test1_RectangleData() {
  log('\n=== TEST 1: Rectangle Data in Database ===');

  for (const rect of TEST_RECTANGLES) {
    const { data, error } = await supabase
      .from('ices_rectangles')
      .select('code, center_lat, center_lon, biogeographic_region')
      .eq('code', rect.code)
      .single();

    if (error || !data) {
      results.push({
        test: `Rectangle ${rect.code}`,
        status: 'FAIL',
        message: `Rectangle not found in database`,
        details: error
      });
    } else {
      results.push({
        test: `Rectangle ${rect.code}`,
        status: 'PASS',
        message: `Found in database (region: ${data.biogeographic_region})`,
        details: data
      });
    }
  }
}

async function test2_CMEMSDataCoverage() {
  log('\n=== TEST 2: CMEMS Data Coverage ===');

  for (const rect of TEST_RECTANGLES) {
    // Check findr_conditions_latest view
    const { data: latest, error: latestErr } = await supabase
      .from('findr_conditions_latest')
      .select('*')
      .eq('rectangle_code', rect.code)
      .maybeSingle();

    if (latestErr) {
      results.push({
        test: `CMEMS Data ${rect.code}`,
        status: 'FAIL',
        message: `Error querying findr_conditions_latest`,
        details: latestErr
      });
      continue;
    }

    if (!latest) {
      results.push({
        test: `CMEMS Data ${rect.code}`,
        status: 'FAIL',
        message: `No data in findr_conditions_latest`,
      });
      continue;
    }

    // Check data freshness and completeness
    const capturedAt = new Date(latest.captured_at);
    const ageHours = (Date.now() - capturedAt.getTime()) / (1000 * 60 * 60);

    const variables = {
      sea_temp_c: latest.sea_temp_c,
      water_temp_c: latest.water_temp_c,
      salinity_ppt: latest.salinity_ppt,
      water_clarity_kd490: latest.water_clarity_kd490,
      current_speed_ms: latest.current_speed_ms,
      current_direction_deg: latest.current_direction_deg,
      chlorophyll_mg_m3: latest.chlorophyll_mg_m3,
    };

    const availableVars = Object.entries(variables).filter(([_, v]) => v != null);
    const missingVars = Object.entries(variables).filter(([_, v]) => v == null).map(([k]) => k);

    let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
    let message = `${availableVars.length}/7 variables available, ${ageHours.toFixed(1)}h old`;

    if (ageHours > 48) {
      status = 'WARN';
      message += ` (Data is stale)`;
    }

    if (availableVars.length < 3) {
      status = 'FAIL';
      message += ` (Insufficient data)`;
    }

    results.push({
      test: `CMEMS Data ${rect.code}`,
      status,
      message,
      details: {
        capturedAt: latest.captured_at,
        ageHours: ageHours.toFixed(1),
        available: availableVars.map(([k]) => k),
        missing: missingVars,
        values: variables
      }
    });
  }
}

async function test3_WeatherAPI() {
  log('\n=== TEST 3: Weather API Access ===');

  for (const rect of TEST_RECTANGLES) {
    try {
      // Test OpenWeather API (used by /api/weather)
      const openWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${rect.lat}&lon=${rect.lon}&appid=${process.env.OPENWEATHER_SECRET_KEY}&units=metric`;
      const owResponse = await fetch(openWeatherUrl);

      if (!owResponse.ok) {
        results.push({
          test: `OpenWeather API ${rect.code}`,
          status: 'FAIL',
          message: `HTTP ${owResponse.status}: ${owResponse.statusText}`,
        });
      } else {
        const owData = await owResponse.json();
        results.push({
          test: `OpenWeather API ${rect.code}`,
          status: 'PASS',
          message: `Retrieved weather data (temp: ${owData.main?.temp}°C, wind: ${owData.wind?.speed}m/s)`,
          details: {
            temp: owData.main?.temp,
            windSpeed: owData.wind?.speed,
            pressure: owData.main?.pressure,
            humidity: owData.main?.humidity,
          }
        });
      }

      // Test Stormglass API (used by /api/marine)
      if (STORMGLASS_SECRET_KEY) {
        const sgUrl = `https://api.stormglass.io/v2/weather/point?lat=${rect.lat}&lng=${rect.lon}&params=waterTemperature,waveHeight,windSpeed`;
        const sgResponse = await fetch(sgUrl, {
          headers: { 'Authorization': STORMGLASS_SECRET_KEY }
        });

        if (!sgResponse.ok) {
          results.push({
            test: `Stormglass API ${rect.code}`,
            status: 'FAIL',
            message: `HTTP ${sgResponse.status}: ${sgResponse.statusText}`,
          });
        } else {
          const sgData = await sgResponse.json();
          const firstHour = sgData.hours?.[0];
          results.push({
            test: `Stormglass API ${rect.code}`,
            status: 'PASS',
            message: `Retrieved marine data (waterTemp: ${firstHour?.waterTemperature?.noaa}°C)`,
            details: firstHour
          });
        }
      }
    } catch (error) {
      results.push({
        test: `Weather API ${rect.code}`,
        status: 'FAIL',
        message: `Exception: ${error.message}`,
        details: error
      });
    }
  }
}

async function test4_SpeciesPreferences() {
  log('\n=== TEST 4: Species Environmental Preferences ===');

  // Get sample species and check their preferences
  const { data: species, error } = await supabase
    .from('species')
    .select('id, common_name_en, biogeographic_regions, environmental_preferences, guild')
    .limit(10);

  if (error || !species) {
    results.push({
      test: 'Species Preferences',
      status: 'FAIL',
      message: 'Failed to query species table',
      details: error
    });
    return;
  }

  let validCount = 0;
  let missingPrefsCount = 0;

  for (const sp of species) {
    const prefs = sp.environmental_preferences as any;

    if (!prefs) {
      missingPrefsCount++;
      continue;
    }

    const hasTemp = prefs.temperature?.min != null && prefs.temperature?.max != null;
    const hasDepth = prefs.depth?.min != null && prefs.depth?.max != null;
    const hasRegions = sp.biogeographic_regions && sp.biogeographic_regions.length > 0;

    if (hasTemp && hasDepth && hasRegions) {
      validCount++;
    }
  }

  const status = validCount >= species.length * 0.8 ? 'PASS' : 'WARN';

  results.push({
    test: 'Species Preferences',
    status,
    message: `${validCount}/${species.length} species have complete preferences`,
    details: {
      validCount,
      missingPrefsCount,
      sampleSpecies: species.slice(0, 3).map(s => ({
        name: s.common_name_en,
        guild: s.guild,
        regions: s.biogeographic_regions,
        prefs: s.environmental_preferences
      }))
    }
  });
}

async function test5_PredictionGeneration() {
  log('\n=== TEST 5: Prediction Generation via RPC ===');

  for (const rect of TEST_RECTANGLES) {
    try {
      const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
        target_rectangle: rect.code,
        limit_results: 100
      });

      if (error) {
        results.push({
          test: `Predictions ${rect.code}`,
          status: 'FAIL',
          message: `RPC error: ${error.message}`,
          details: error
        });
        continue;
      }

      if (!data || data.length === 0) {
        results.push({
          test: `Predictions ${rect.code}`,
          status: 'FAIL',
          message: `No predictions returned`,
        });
        continue;
      }

      // Analyze predictions
      const speciesCount = data.length;
      const avgConfidence = data.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / speciesCount;
      const withEnvironmental = data.filter(p => p.environmental_match_rationale).length;
      const withBiteScore = data.filter(p => p.bite_score != null).length;

      const status = speciesCount >= 20 ? 'PASS' : 'WARN';

      results.push({
        test: `Predictions ${rect.code}`,
        status,
        message: `${speciesCount} species, avg confidence: ${avgConfidence.toFixed(1)}%`,
        details: {
          speciesCount,
          avgConfidence: avgConfidence.toFixed(1),
          withEnvironmental,
          withBiteScore,
          topSpecies: data.slice(0, 5).map(p => ({
            name: p.common_name_en,
            confidence: p.confidence_score,
            bite: p.bite_score,
            guild: p.guild
          }))
        }
      });
    } catch (error) {
      results.push({
        test: `Predictions ${rect.code}`,
        status: 'FAIL',
        message: `Exception: ${error.message}`,
        details: error
      });
    }
  }
}

async function test6_EnvironmentalMatching() {
  log('\n=== TEST 6: Environmental Data Matching Logic ===');

  // Test one rectangle in detail
  const rect = TEST_RECTANGLES[0];

  // Get conditions
  const { data: conditions } = await supabase
    .from('findr_conditions_latest')
    .select('*')
    .eq('rectangle_code', rect.code)
    .single();

  if (!conditions) {
    results.push({
      test: 'Environmental Matching',
      status: 'FAIL',
      message: `No conditions found for ${rect.code}`,
    });
    return;
  }

  // Get a sample species with preferences
  const { data: species } = await supabase
    .from('species')
    .select('id, common_name_en, environmental_preferences, biogeographic_regions')
    .limit(1)
    .single();

  if (!species) {
    results.push({
      test: 'Environmental Matching',
      status: 'FAIL',
      message: 'No species found for testing',
    });
    return;
  }

  const prefs = species.environmental_preferences as any;

  // Check temperature matching
  let tempMatch = 'N/A';
  if (conditions.sea_temp_c != null && prefs?.temperature) {
    const temp = conditions.sea_temp_c;
    const { min, max, optimal_min, optimal_max } = prefs.temperature;

    if (temp >= min && temp <= max) {
      if (temp >= optimal_min && temp <= optimal_max) {
        tempMatch = 'OPTIMAL';
      } else {
        tempMatch = 'ACCEPTABLE';
      }
    } else {
      tempMatch = 'OUT_OF_RANGE';
    }
  }

  // Check salinity matching
  let salinityMatch = 'N/A';
  if (conditions.salinity_ppt != null && prefs?.salinity) {
    const salinity = conditions.salinity_ppt;
    const { min, max } = prefs.salinity;

    if (salinity >= min && salinity <= max) {
      salinityMatch = 'MATCH';
    } else {
      salinityMatch = 'OUT_OF_RANGE';
    }
  }

  const status = tempMatch !== 'OUT_OF_RANGE' && salinityMatch !== 'OUT_OF_RANGE' ? 'PASS' : 'WARN';

  results.push({
    test: 'Environmental Matching',
    status,
    message: `Temperature: ${tempMatch}, Salinity: ${salinityMatch}`,
    details: {
      species: species.common_name_en,
      conditions: {
        temp: conditions.sea_temp_c,
        salinity: conditions.salinity_ppt,
      },
      preferences: prefs,
      matches: {
        temperature: tempMatch,
        salinity: salinityMatch,
      }
    }
  });
}

async function test7_DataPipelineIntegrity() {
  log('\n=== TEST 7: Data Pipeline Integrity Checks ===');

  // Check for data consistency issues
  const checks = [];

  // Check 1: Rectangles without conditions
  const { count: rectCount } = await supabase
    .from('ices_rectangles')
    .select('*', { count: 'exact', head: true });

  const { count: condCount } = await supabase
    .from('findr_conditions_latest')
    .select('*', { count: 'exact', head: true });

  const coveragePercent = rectCount ? ((condCount || 0) / rectCount * 100).toFixed(1) : '0';

  checks.push({
    check: 'Rectangle Coverage',
    status: (condCount || 0) >= (rectCount || 0) * 0.9 ? 'PASS' : 'WARN',
    message: `${condCount}/${rectCount} rectangles have conditions (${coveragePercent}%)`,
  });

  // Check 2: Species without regions
  const { data: noRegionSpecies } = await supabase
    .from('species')
    .select('id, common_name_en')
    .or('biogeographic_regions.is.null,biogeographic_regions.eq.{}');

  checks.push({
    check: 'Species Biogeographic Regions',
    status: (noRegionSpecies?.length || 0) === 0 ? 'PASS' : 'WARN',
    message: `${noRegionSpecies?.length || 0} species missing biogeographic regions`,
    details: noRegionSpecies?.map(s => s.common_name_en)
  });

  // Check 3: Stale data in conditions
  const { data: staleData } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, captured_at')
    .lt('captured_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

  checks.push({
    check: 'Data Freshness',
    status: (staleData?.length || 0) === 0 ? 'PASS' : 'WARN',
    message: `${staleData?.length || 0} rectangles have data >72h old`,
    details: staleData?.map(d => `${d.rectangle_code}: ${d.captured_at}`)
  });

  checks.forEach(check => results.push({
    test: check.check,
    status: check.status,
    message: check.message,
    details: check.details
  }));
}

async function printResults() {
  log('\n\n╔══════════════════════════════════════════════════════════════╗');
  log('║       FINDR PIPELINE DIAGNOSTIC RESULTS                     ║');
  log('╚══════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`\n📊 SUMMARY: ${passed} PASS, ${warned} WARN, ${failed} FAIL (${total} tests)\n`);

  // Group by status
  ['FAIL', 'WARN', 'PASS'].forEach(status => {
    const items = results.filter(r => r.status === status);
    if (items.length === 0) return;

    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`\n${icon} ${status} (${items.length}):`);
    console.log('─'.repeat(60));

    items.forEach(item => {
      console.log(`\n  ${item.test}`);
      console.log(`  ${item.message}`);

      if (item.details && process.env.VERBOSE) {
        console.log(`  Details:`, JSON.stringify(item.details, null, 2));
      }
    });
  });

  // Overall health
  console.log('\n\n' + '═'.repeat(60));
  const healthScore = ((passed / total) * 100).toFixed(1);
  console.log(`\n🏥 PIPELINE HEALTH: ${healthScore}%`);

  if (failed > 0) {
    console.log('\n⚠️  CRITICAL: Pipeline has failing components that need attention');
  } else if (warned > 0) {
    console.log('\n⚠️  WARNING: Pipeline has components that need monitoring');
  } else {
    console.log('\n✅ EXCELLENT: All pipeline components functioning correctly');
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

async function main() {
  log('Starting Findr Pipeline Diagnostic...\n');

  try {
    await test1_RectangleData();
    await test2_CMEMSDataCoverage();
    await test3_WeatherAPI();
    await test4_SpeciesPreferences();
    await test5_PredictionGeneration();
    await test6_EnvironmentalMatching();
    await test7_DataPipelineIntegrity();

    await printResults();

    // Exit with appropriate code
    const failed = results.filter(r => r.status === 'FAIL').length;
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ DIAGNOSTIC FAILED:', error);
    process.exit(1);
  }
}

main();
