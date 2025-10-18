#!/usr/bin/env npx tsx

/**
 * Check what prediction data exists in Supabase for rectangle 28E5
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPredictionData() {
  const rectangleCode = '28E5';
  const predictionDate = '2025-10-18';

  console.log('\n🔍 Checking prediction data for:', { rectangleCode, predictionDate });
  console.log('='.repeat(80));

  // 1. Check if rectangle exists
  console.log('\n1️⃣ Checking ICES rectangle...');
  const { data: rectangle, error: rectError } = await supabase
    .from('ices_rectangles')
    .select('*')
    .eq('rectangle_code', rectangleCode)
    .single();

  if (rectError) {
    console.error('❌ Rectangle query failed:', rectError.message);
  } else if (!rectangle) {
    console.error('❌ Rectangle not found in database');
  } else {
    console.log('✅ Rectangle found:', {
      code: rectangle.rectangle_code,
      region: rectangle.region,
      center_lat: rectangle.center_lat,
      center_lon: rectangle.center_lon,
    });
  }

  // 2. Check catch log data
  console.log('\n2️⃣ Checking catch log data...');
  const { count: catchCount, error: catchError } = await supabase
    .from('catch_log')
    .select('*', { count: 'exact', head: true })
    .eq('rectangle_code', rectangleCode);

  if (catchError) {
    console.error('❌ Catch log query failed:', catchError.message);
  } else {
    console.log(`✅ Found ${catchCount || 0} catches in ${rectangleCode}`);
  }

  // 3. Check species table
  console.log('\n3️⃣ Checking species table...');
  const { count: speciesCount, error: speciesError } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true });

  if (speciesError) {
    console.error('❌ Species query failed:', speciesError.message);
  } else {
    console.log(`✅ Total species in database: ${speciesCount}`);
    
    // Get a few sample species
    const { data: sampleSpecies } = await supabase
      .from('species')
      .select('species_code, name_en, scientific_name')
      .limit(5);
    
    if (sampleSpecies && sampleSpecies.length > 0) {
      console.log('   Sample species:');
      sampleSpecies.forEach(s => {
        console.log(`   - ${s.name_en} (${s.species_code})`);
      });
    }
  }

  // 4. Check environmental preferences
  console.log('\n4️⃣ Checking environmental preferences...');
  const { count: envCount, error: envError } = await supabase
    .from('environmental_preferences')
    .select('*', { count: 'exact', head: true });

  if (envError) {
    console.error('❌ Environmental preferences query failed:', envError.message);
  } else {
    console.log(`✅ Species with environmental preferences: ${envCount}`);
  }

  // 5. Try calling the RPC function directly
  console.log('\n5️⃣ Calling RPC function...');
  const { data: predictions, error: rpcError } = await supabase.rpc(
    'get_environmental_predictions_basic',
    {
      target_rectangle: rectangleCode,
      target_date: predictionDate,
      current_wind_speed_ms: null,
      current_pressure_hpa: null,
    }
  );

  if (rpcError) {
    console.error('❌ RPC call failed:', {
      code: rpcError.code,
      message: rpcError.message,
      details: rpcError.details,
      hint: rpcError.hint,
    });
  } else {
    console.log(`✅ RPC returned ${predictions?.length || 0} predictions`);
    if (predictions && predictions.length > 0) {
      console.log('\n   Top 5 predictions:');
      predictions.slice(0, 5).forEach((p: any, i: number) => {
        console.log(`   ${i + 1}. ${p.species_common_name || p.species_code} - ${p.confidence_percent}%`);
      });
    } else {
      console.log('   ⚠️  No predictions returned - this is why the UI shows empty!');
    }
  }

  // 6. Check if function exists
  console.log('\n6️⃣ Checking if RPC function exists...');
  // Note: Function existence check would require admin privileges

  // 7. Try alternative query - check what rectangles DO have data
  console.log('\n7️⃣ Checking which rectangles have catch data...');
  const { count: totalCatches, error: rectDataError } = await supabase
    .from('catch_log')
    .select('*', { count: 'exact', head: true });

  if (rectDataError) {
    console.error('❌ Query failed:', rectDataError.message);
    console.log('   ⚠️  catch_log table may not exist or is not accessible');
  } else {
    console.log(`✅ Total catches in database: ${totalCatches || 0}`);
    
    if (totalCatches && totalCatches > 0) {
      // Get sample rectangles
      const { data: sampleCatches } = await supabase
        .from('catch_log')
        .select('rectangle_code, species_code')
        .limit(10);
        
      const uniqueRects = [...new Set(sampleCatches?.map(r => r.rectangle_code) || [])];
      console.log('   Sample rectangles with data:', uniqueRects.slice(0, 5));
      
      if (!uniqueRects.includes(rectangleCode)) {
        console.log(`\n   ⚠️  Rectangle ${rectangleCode} has NO catch log data!`);
        console.log('   💡 This is likely why predictions are empty.');
      } else {
        console.log(`\n   ✅ Rectangle ${rectangleCode} HAS catch data!`);
      }
    } else {
      console.log('   ⚠️  No catch data in entire database');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Analysis complete\n');
}

checkPredictionData().catch(console.error);
