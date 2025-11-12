// Final Comprehensive Findr Pipeline Diagnostic
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENWEATHER_KEY = process.env.OPENWEATHER_SECRET_KEY;
const STORMGLASS_KEY = process.env.STORMGLASS_SECRET_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TEST_RECTANGLES = ['31F2', '26C7', '38W5'];  // Known working rectangles

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  FINDR PIPELINE COMPREHENSIVE DIAGNOSTIC REPORT               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log(`Database: ${SUPABASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const report = {
    cmems: [],
    weather: [],
    predictions: [],
    dataIntegrity: [],
  };

  // TEST 1: CMEMS Data Coverage
  console.log('\n1️⃣  CMEMS DATA INGESTION & RETRIEVAL');
  console.log('─'.repeat(60));

  for (const rectCode of TEST_RECTANGLES) {
    const { data: conditions } = await supabase
      .from('findr_conditions_latest')
      .select('*')
      .eq('rectangle_code', rectCode)
      .maybeSingle();

    if (!conditions) {
      console.log(`\n   ⚠️  ${rectCode}: No conditions data`);
      report.cmems.push({ rect: rectCode, status: 'no_data' });
      continue;
    }

    const ageHours = (Date.now() - new Date(conditions.captured_at).getTime()) / (1000 * 60 * 60);
    const vars = {
      temp: conditions.sea_temp_c,
      salinity: conditions.salinity_psu,
      chlorophyll: conditions.chlorophyll_mg_m3,
      clarity: conditions.water_clarity_kd490,
      current: conditions.current_speed_ms,
    };

    const available = Object.entries(vars).filter(([_, v]) => v != null);
    const icon = available.length >= 3 ? '✅' : '⚠️';
    const freshness = ageHours < 48 ? 'FRESH' : ageHours < 168 ? 'AGING' : 'STALE';

    console.log(`\n   ${icon} ${rectCode}:`);
    console.log(`      Variables: ${available.length}/5 available`);
    console.log(`      Age: ${ageHours.toFixed(1)}h (${freshness})`);
    available.forEach(([key, val]) => {
      const unit = key === 'temp' ? '°C' : key === 'salinity' ? 'psu' : key === 'chlorophyll' ? 'mg/m³' : key === 'current' ? 'm/s' : '';
      console.log(`      - ${key}: ${val}${unit}`);
    });

    report.cmems.push({
      rect: rectCode,
      status: 'success',
      variablesAvailable: available.length,
      ageHours: ageHours.toFixed(1),
      freshness
    });
  }

  // TEST 2: Weather API Connectivity
  console.log('\n\n2️⃣  WEATHER API DATA RETRIEVAL');
  console.log('─'.repeat(60));

  const { data: testRect } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon')
    .eq('rectangle_code', TEST_RECTANGLES[0])
    .single();

  if (testRect && OPENWEATHER_KEY) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${testRect.center_lat}&lon=${testRect.center_lon}&appid=${OPENWEATHER_KEY}&units=metric`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        console.log(`\n   ✅ OpenWeather API: Working`);
        console.log(`      Temperature: ${data.main?.temp}°C`);
        console.log(`      Wind: ${data.wind?.speed} m/s`);
        console.log(`      Pressure: ${data.main?.pressure} hPa`);
        report.weather.push({ api: 'OpenWeather', status: 'success', data: { temp: data.main?.temp, wind: data.wind?.speed } });
      } else {
        console.log(`\n   ❌ OpenWeather API: ${data.message || 'Failed'}`);
        report.weather.push({ api: 'OpenWeather', status: 'failed', error: data.message });
      }
    } catch (error) {
      console.log(`\n   ❌ OpenWeather API: ${error.message}`);
      report.weather.push({ api: 'OpenWeather', status: 'error', error: error.message });
    }
  } else {
    console.log(`\n   ⚠️  OpenWeather API: ${!OPENWEATHER_KEY ? 'Not configured' : 'No test rectangle'}`);
  }

  if (testRect && STORMGLASS_KEY) {
    try {
      const url = `https://api.stormglass.io/v2/weather/point?lat=${testRect.center_lat}&lng=${testRect.center_lon}&params=waterTemperature`;
      const res = await fetch(url, { headers: { 'Authorization': STORMGLASS_KEY } });
      const data = await res.json();

      if (res.ok && data.hours) {
        const temp = data.hours[0]?.waterTemperature?.noaa;
        console.log(`\n   ✅ Stormglass API: Working`);
        console.log(`      Water Temperature: ${temp}°C`);
        report.weather.push({ api: 'Stormglass', status: 'success', data: { waterTemp: temp } });
      } else {
        console.log(`\n   ❌ Stormglass API: Failed`);
        report.weather.push({ api: 'Stormglass', status: 'failed' });
      }
    } catch (error) {
      console.log(`\n   ❌ Stormglass API: ${error.message}`);
      report.weather.push({ api: 'Stormglass', status: 'error', error: error.message });
    }
  }

  // TEST 3: Prediction Generation
  console.log('\n\n3️⃣  PREDICTION GENERATION & SPECIES MATCHING');
  console.log('─'.repeat(60));

  for (const rectCode of TEST_RECTANGLES) {
    const { data: predictions, error } = await supabase
      .rpc('get_environmental_predictions_enhanced', {
        target_rectangle: rectCode,
        target_date: new Date().toISOString().split('T')[0]
      }) as { data: any[], error: any };

    if (error) {
      console.log(`\n   ❌ ${rectCode}: RPC Error - ${error.message}`);
      report.predictions.push({ rect: rectCode, status: 'failed', error: error.message });
      continue;
    }

    const count = predictions?.length || 0;
    const avgConf = count > 0 ? (predictions.reduce((s, p) => s + (p.confidence_percent || 0), 0) / count).toFixed(1) : '0';
    const icon = count >= 20 ? '✅' : count > 0 ? '⚠️' : '❌';

    console.log(`\n   ${icon} ${rectCode}:`);
    console.log(`      Species: ${count} predictions generated`);
    console.log(`      Avg Confidence: ${avgConf}%`);

    if (count > 0) {
      console.log(`      Top 3:`);
      predictions.slice(0, 3).forEach((p, i) => {
        console.log(`        ${i + 1}. ${p.species_common_name}: ${p.confidence_percent}%`);
      });
    }

    report.predictions.push({
      rect: rectCode,
      status: 'success',
      speciesCount: count,
      avgConfidence: avgConf
    });
  }

  // TEST 4: Data Integrity
  console.log('\n\n4️⃣  DATA PIPELINE INTEGRITY');
  console.log('─'.repeat(60));

  // Total rectangles vs with conditions
  const { count: totalRects } = await supabase.from('ices_rectangles').select('*', { count: 'exact', head: true });
  const { count: withConds } = await supabase.from('findr_conditions_latest').select('*', { count: 'exact', head: true });
  const coverage = totalRects ? ((withConds || 0) / totalRects * 100).toFixed(1) : '0';

  console.log(`\n   ${Number(coverage) > 50 ? '✅' : '⚠️'} Rectangle Coverage: ${withConds}/${totalRects} (${coverage}%)`);
  report.dataIntegrity.push({ metric: 'rectangleCoverage', value: coverage });

  // Species with preferences
  const { count: totalSpecies } = await supabase.from('species').select('*', { count: 'exact', head: true });
  const { count: withPrefs } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true })
    .not('environmental_preferences', 'is', null);

  const prefPercent = totalSpecies ? ((withPrefs || 0) / totalSpecies * 100).toFixed(1) : '0';
  console.log(`\n   ${Number(prefPercent) > 80 ? '✅' : '⚠️'} Species with Preferences: ${withPrefs}/${totalSpecies} (${prefPercent}%)`);
  report.dataIntegrity.push({ metric: 'speciesPreferences', value: prefPercent });

  // Stale data check
  const { data: staleData } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code')
    .lt('captured_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString());

  const staleCount = staleData?.length || 0;
  console.log(`\n   ${staleCount === 0 ? '✅' : staleCount < 20 ? '⚠️' : '❌'} Data Freshness: ${staleCount} rectangles >72h old`);
  report.dataIntegrity.push({ metric: 'staleness', value: staleCount });

  // SUMMARY
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('DIAGNOSTIC SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const cmemsPassing = report.cmems.filter(r => r.status === 'success' && r.variablesAvailable >= 3).length;
  const weatherPassing = report.weather.filter(r => r.status === 'success').length;
  const predictionsPassing = report.predictions.filter(r => r.status === 'success' && r.speciesCount >= 20).length;

  console.log(`✅ CMEMS Data: ${cmemsPassing}/${report.cmems.length} rectangles passing`);
  console.log(`✅ Weather APIs: ${weatherPassing}/${report.weather.length} APIs operational`);
  console.log(`✅ Predictions: ${predictionsPassing}/${report.predictions.length} rectangles generating 20+ species`);
  console.log(`✅ Coverage: ${coverage}% of rectangles have conditions data`);
  console.log(`✅ Stale Data: ${staleCount} rectangles need refresh\n`);

  const overallHealth = (
    ((cmemsPassing / report.cmems.length) * 0.3) +
    ((weatherPassing / report.weather.length) * 0.2) +
    ((predictionsPassing / report.predictions.length) * 0.4) +
    ((Number(coverage) / 100) * 0.1)
  ) * 100;

  console.log(`\n🏥 OVERALL PIPELINE HEALTH: ${overallHealth.toFixed(1)}%`);

  if (overallHealth >= 80) {
    console.log('✅ EXCELLENT - Pipeline is fully operational\n');
  } else if (overallHealth >= 60) {
    console.log('⚠️  GOOD - Minor issues need attention\n');
  } else if (overallHealth >= 40) {
    console.log('⚠️  FAIR - Significant issues impacting performance\n');
  } else {
    console.log('❌ POOR - Critical issues require immediate attention\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
