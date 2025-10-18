import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBiteScoreFavourites() {
  console.log('🎣 TESTING BITE SCORE ON FAVOURITES\n');
  console.log('='.repeat(80) + '\n');

  // Get a sample of user favourites
  const { data: favourites, error: favError } = await supabase
    .from('user_favourites')
    .select(`
      id,
      user_id,
      species_id,
      added_at,
      species:species_id (
        species_code,
        name_en,
        scientific_name,
        temp_opt_c,
        temp_weight,
        biogeographic_regions
      )
    `)
    .limit(10);

  if (favError) {
    console.error('❌ Error fetching favourites:', favError);
    return;
  }

  console.log(`📊 Found ${favourites?.length || 0} favourite species entries\n`);

  if (!favourites || favourites.length === 0) {
    console.log('⚠️  No favourites found. Let me create a test favourite...\n');
    
    // Check if we have a test user
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (users && users.length > 0) {
      const testUserId = users[0].id;
      
      // Add a test favourite (Sea Bass)
      const { data: newFav, error: insertError } = await supabase
        .from('user_favourites')
        .insert({
          user_id: testUserId,
          species_id: 'bss'
        })
        .select(`
          id,
          user_id,
          species_id,
          added_at,
          species:species_id (
            species_code,
            name_en,
            scientific_name,
            temp_opt_c,
            temp_weight,
            biogeographic_regions
          )
        `)
        .single();
      
      if (insertError) {
        console.error('❌ Error creating test favourite:', insertError);
        return;
      }
      
      console.log('✅ Created test favourite for Sea Bass\n');
      favourites.push(newFav);
    } else {
      console.log('❌ No users found to create test favourite');
      return;
    }
  }

  // Test with a specific location (Galician Coast)
  const testLat = 42.5;
  const testLon = -8.9;
  const testRectangle = '21D8';

  console.log('📍 Test Location:');
  console.log(`   Coordinates: ${testLat}°N, ${testLon}°W`);
  console.log(`   ICES Rectangle: ${testRectangle}`);
  console.log(`   Region: Galician Coast (Atlantic)\n`);
  console.log('─'.repeat(80) + '\n');

  // Get environmental conditions for this location
  const { data: conditions, error: condError } = await supabase
    .from('findr_conditions_snapshots')
    .select('*')
    .eq('rectangle_code', testRectangle)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  if (condError || !conditions) {
    console.error('❌ Error fetching conditions:', condError);
    console.log('⚠️  No environmental data available for this location\n');
  } else {
    console.log('🌊 Current Environmental Conditions:\n');
    console.log(`   Sea Temp: ${conditions.sea_surface_temp?.toFixed(1) || 'N/A'}°C`);
    console.log(`   Air Temp: ${conditions.air_temp?.toFixed(1) || 'N/A'}°C`);
    console.log(`   Wind Speed: ${conditions.wind_speed?.toFixed(1) || 'N/A'} m/s`);
    console.log(`   Wave Height: ${conditions.wave_height?.toFixed(2) || 'N/A'} m`);
    console.log(`   Salinity: ${conditions.salinity?.toFixed(1) || 'N/A'} PSU`);
    console.log(`   Chlorophyll: ${conditions.chlorophyll?.toFixed(3) || 'N/A'} mg/m³`);
    console.log(`   Oxygen: ${conditions.oxygen?.toFixed(1) || 'N/A'} mmol/m³`);
    console.log(`   pH: ${conditions.ph?.toFixed(2) || 'N/A'}`);
    console.log(`   Clarity: ${conditions.clarity_category || 'N/A'}`);
    console.log(`   Snapshot: ${new Date(conditions.snapshot_date).toLocaleString()}\n`);
    console.log('─'.repeat(80) + '\n');
  }

  // Now call the RPC function with favourite species
  console.log('🎯 TESTING BITE SCORE PREDICTIONS\n');
  console.log('Testing with user favourites...\n');

  const testDate = new Date().toISOString().split('T')[0];
  
  const { data: predictions, error: rpcError } = await supabase
    .rpc('get_environmental_predictions_enhanced', {
      target_rectangle: testRectangle,
      target_date: testDate,
      user_lat: testLat,
      user_lon: testLon,
      depth_meters: 10
    });

  if (rpcError) {
    console.error('❌ RPC Error:', rpcError);
    return;
  }

  console.log(`📊 Received ${predictions?.length || 0} predictions\n`);

  if (!predictions || predictions.length === 0) {
    console.log('⚠️  No predictions returned\n');
    return;
  }

  // Analyze the predictions
  console.log('🔍 BITE SCORE ANALYSIS\n');
  console.log('─'.repeat(80) + '\n');

  // Check favourite species in predictions
  const favouriteSpeciesCodes = favourites
    .map(f => {
      const species = f.species as any;
      return species ? (Array.isArray(species) ? species[0]?.species_code : species.species_code) : f.species_id;
    })
    .filter((code: string | undefined): code is string => !!code);
  const favouritePredictions = predictions.filter((p: any) => 
    favouriteSpeciesCodes.includes(p.species_code)
  );

  console.log(`✅ Favourite species in predictions: ${favouritePredictions.length}/${favourites.length}\n`);

  // Analyze each prediction
  for (const pred of predictions.slice(0, 15)) {
    const isFavourite = favouriteSpeciesCodes.includes(pred.species_code);
    const marker = isFavourite ? '⭐' : '  ';
    
    console.log(`${marker} ${pred.name_en || pred.species_name} (${pred.species_code})`);
    console.log(`   Scientific: ${pred.scientific_name || 'N/A'}`);
    console.log(`   Total Confidence: ${(pred.confidence || pred.confidence_score || 0).toFixed(1)}%`);
    console.log(`   Temperature Score: ${(pred.temp_score || pred.temperature_score || 0).toFixed(1)}`);
    console.log(`   Bio Score: ${(pred.bio_band_score || pred.bio_score || 0).toFixed(1)}`);
    console.log(`   Bite Score: ${pred.bite_score !== undefined ? pred.bite_score.toFixed(1) : 'N/A'}`);
    
    // Check what data is available
    const hasTemp = pred.temp_score !== undefined && pred.temp_score > 0;
    const hasBio = pred.bio_band_score !== undefined || pred.bio_score !== undefined;
    const hasBite = pred.bite_score !== undefined;
    
    console.log(`   Data Available: Temp ${hasTemp ? '✅' : '❌'} | Bio ${hasBio ? '✅' : '❌'} | Bite ${hasBite ? '✅' : '❌'}`);
    
    // Check biogeographic match
    if (pred.biogeographic_regions) {
      const regions = Array.isArray(pred.biogeographic_regions) 
        ? pred.biogeographic_regions 
        : [pred.biogeographic_regions];
      const hasAtlantic = regions.some((r: any) => 
        r && (r.toLowerCase().includes('atlantic') || r.toLowerCase().includes('north sea') || r.toLowerCase().includes('bay of biscay'))
      );
      console.log(`   Biogeographic: ${regions.join(', ')} ${hasAtlantic ? '✅' : '⚠️'}`);
    }
    
    console.log();
  }

  // Summary statistics
  console.log('─'.repeat(80) + '\n');
  console.log('📈 SUMMARY STATISTICS\n');
  
  const withBiteScore = predictions.filter((p: any) => p.bite_score !== undefined && p.bite_score !== null);
  const withTempScore = predictions.filter((p: any) => (p.temp_score || 0) > 0);
  const withBioScore = predictions.filter((p: any) => (p.bio_band_score || p.bio_score || 0) > 0);
  const withConfidence = predictions.filter((p: any) => (p.confidence || p.confidence_score || 0) > 0);
  
  console.log(`Total Predictions: ${predictions.length}`);
  console.log(`With Bite Score: ${withBiteScore.length} (${(withBiteScore.length/predictions.length*100).toFixed(1)}%)`);
  console.log(`With Temp Score: ${withTempScore.length} (${(withTempScore.length/predictions.length*100).toFixed(1)}%)`);
  console.log(`With Bio Score: ${withBioScore.length} (${(withBioScore.length/predictions.length*100).toFixed(1)}%)`);
  console.log(`With Confidence: ${withConfidence.length} (${(withConfidence.length/predictions.length*100).toFixed(1)}%)`);
  
  if (withBiteScore.length > 0) {
    const avgBite = withBiteScore.reduce((sum: number, p: any) => sum + (p.bite_score || 0), 0) / withBiteScore.length;
    const maxBite = Math.max(...withBiteScore.map((p: any) => p.bite_score || 0));
    const minBite = Math.min(...withBiteScore.map((p: any) => p.bite_score || 0));
    
    console.log(`\nBite Score Range: ${minBite.toFixed(1)} - ${maxBite.toFixed(1)}`);
    console.log(`Average Bite Score: ${avgBite.toFixed(1)}`);
  }

  // Check for issues
  console.log('\n─'.repeat(80) + '\n');
  console.log('🔧 ISSUE DETECTION\n');
  
  const issues: string[] = [];
  
  if (withBiteScore.length === 0) {
    issues.push('❌ CRITICAL: No predictions have bite scores');
  }
  
  if (withTempScore.length === 0) {
    issues.push('❌ CRITICAL: No predictions have temperature scores');
  }
  
  if (withBioScore.length === 0) {
    issues.push('⚠️  WARNING: No predictions have bio scores');
  }
  
  if (favouritePredictions.length === 0) {
    issues.push('⚠️  WARNING: No favourite species found in predictions');
  }
  
  const missingBiteScore = predictions.filter((p: any) => 
    p.bite_score === undefined || p.bite_score === null
  );
  
  if (missingBiteScore.length > 0 && missingBiteScore.length < predictions.length) {
    issues.push(`⚠️  WARNING: ${missingBiteScore.length}/${predictions.length} predictions missing bite score`);
  }
  
  if (issues.length > 0) {
    console.log('Issues found:\n');
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('✅ All checks passed! Bite scoring is working correctly.\n');
  }
  
  // Check species data completeness
  console.log('\n─'.repeat(80) + '\n');
  console.log('📋 SPECIES DATA COMPLETENESS CHECK\n');
  
  const { data: allSpecies } = await supabase
    .from('species')
    .select('species_code, name_en, temp_opt_c, temp_weight, biogeographic_regions');
  
  if (allSpecies) {
    const withTempRange = allSpecies.filter((s: any) => s.temp_opt_c !== null && Array.isArray(s.temp_opt_c) && s.temp_opt_c.length === 2);
    const withTempWeight = allSpecies.filter((s: any) => s.temp_weight !== null);
    const withBioRegions = allSpecies.filter((s: any) => s.biogeographic_regions !== null);
    
    console.log(`Total Species: ${allSpecies.length}`);
    console.log(`With Temp Range: ${withTempRange.length} (${(withTempRange.length/allSpecies.length*100).toFixed(1)}%)`);
    console.log(`With Temp Weight: ${withTempWeight.length} (${(withTempWeight.length/allSpecies.length*100).toFixed(1)}%)`);
    console.log(`With Bio Regions: ${withBioRegions.length} (${(withBioRegions.length/allSpecies.length*100).toFixed(1)}%)`);
    
    // Check favourite species specifically
    if (favourites.length > 0) {
      console.log('\nFavourite Species Data:');
      for (const fav of favourites) {
        const species = fav.species as any;
        if (species) {
          const speciesData = Array.isArray(species) ? species[0] : species;
          console.log(`\n   ${speciesData.name_en} (${speciesData.species_code}):`);
          const tempRange = speciesData.temp_opt_c;
          const tempRangeStr = (tempRange && Array.isArray(tempRange) && tempRange.length === 2) 
            ? `${tempRange[0]}°C - ${tempRange[1]}°C` 
            : 'N/A';
          console.log(`     Temp Range: ${tempRangeStr}`);
          console.log(`     Temp Weight: ${speciesData.temp_weight !== null ? speciesData.temp_weight : 'N/A'}`);
          console.log(`     Bio Regions: ${speciesData.biogeographic_regions || 'N/A'}`);
          
          const complete = tempRange && Array.isArray(tempRange) && tempRange.length === 2 && 
                          speciesData.temp_weight !== null &&
                          speciesData.biogeographic_regions !== null;
          console.log(`     Status: ${complete ? '✅ Complete' : '⚠️  Incomplete'}`);
        }
      }
    }
  }
}

testBiteScoreFavourites().then(() => {
  console.log('\n✅ Test complete\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
