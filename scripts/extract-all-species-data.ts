import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SpeciesData {
  species_code: string;
  name_en: string;
  scientific_name: string;
  advice: any;
  playful_bio_en: string;
}

async function extractAllSpeciesData() {
  console.log('🔍 Extracting All Species Data from Database\n');
  console.log('=' .repeat(80));
  
  const { data: allSpecies, error } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name, advice, playful_bio_en')
    .order('name_en');
  
  if (error) {
    console.error('Error fetching species:', error);
    return;
  }
  
  console.log(`\nFound ${allSpecies.length} species in database\n`);
  
  // Species already in POC with full profiles
  const pocSpecies = [
    'cod', 'haddock', 'herring', 'plaice', 'pollack',
    'sea-bass', 'bream', 'sardine', 'anchovy', 'mackerel',
    'turbot', 'whiting', 'sole'
  ];
  
  // Categorize species
  const categorizedSpecies: {
    complete: SpeciesData[];
    hasRegions: SpeciesData[];
    needsResearch: SpeciesData[];
  } = {
    complete: [],
    hasRegions: [],
    needsResearch: []
  };
  
  for (const species of allSpecies) {
    const isInPOC = pocSpecies.some(p => 
      species.species_code?.toLowerCase().includes(p) || 
      species.name_en?.toLowerCase().includes(p)
    );
    
    if (isInPOC) {
      categorizedSpecies.complete.push(species);
    } else if (species.advice?.shore?.regions || species.advice?.boat?.regions) {
      categorizedSpecies.hasRegions.push(species);
    } else {
      categorizedSpecies.needsResearch.push(species);
    }
  }
  
  console.log('📊 Species Categorization:\n');
  console.log(`✅ Complete (in POC): ${categorizedSpecies.complete.length} species`);
  console.log(`🟡 Has Regions (needs temp/salinity/depth): ${categorizedSpecies.hasRegions.length} species`);
  console.log(`🔴 Needs Full Research: ${categorizedSpecies.needsResearch.length} species\n`);
  
  // Extract regional and depth data
  const speciesProfiles: any[] = [];
  
  console.log('=' .repeat(80));
  console.log('📝 Extracting Data from All Species:\n');
  
  for (const species of allSpecies) {
    const profile: any = {
      species_code: species.species_code,
      name_en: species.name_en,
      scientific_name: species.scientific_name,
      status: 'needs_research',
      regions: new Set<string>(),
      depth_hints: {
        shore: null,
        boat: null
      },
      temperature_hints: [],
      has_playful_bio: !!species.playful_bio_en
    };
    
    // Extract regions
    if (species.advice?.shore?.regions) {
      const regions = (species.advice.shore.regions as string).split(',').map(r => r.trim());
      regions.forEach(r => profile.regions.add(r));
    }
    if (species.advice?.boat?.regions) {
      const regions = (species.advice.boat.regions as string).split(',').map(r => r.trim());
      regions.forEach(r => profile.regions.add(r));
    }
    
    // Extract depth hints
    if (species.advice?.shore?.distance_depth) {
      profile.depth_hints.shore = species.advice.shore.distance_depth;
    }
    if (species.advice?.boat?.distance_depth) {
      profile.depth_hints.boat = species.advice.boat.distance_depth;
    }
    
    // Extract temperature hints
    if (species.advice?.shore?.temperature_effect) {
      profile.temperature_hints.push(species.advice.shore.temperature_effect);
    }
    if (species.advice?.boat?.temperature_effect) {
      profile.temperature_hints.push(species.advice.boat.temperature_effect);
    }
    
    // Determine status
    if (pocSpecies.some(p => 
      species.species_code?.toLowerCase().includes(p) || 
      species.name_en?.toLowerCase().includes(p)
    )) {
      profile.status = 'complete_in_poc';
    } else if (profile.regions.size > 0) {
      profile.status = 'has_regional_data';
    }
    
    profile.regions = Array.from(profile.regions);
    speciesProfiles.push(profile);
    
    // Print summary
    const statusIcon = 
      profile.status === 'complete_in_poc' ? '✅' :
      profile.status === 'has_regional_data' ? '🟡' : '🔴';
    
    console.log(`${statusIcon} ${species.name_en} (${species.scientific_name})`);
    if (profile.regions.length > 0) {
      console.log(`   Regions: ${profile.regions.join(', ')}`);
    }
    if (profile.depth_hints.shore) {
      console.log(`   Shore depth: ${profile.depth_hints.shore}`);
    }
    if (profile.depth_hints.boat) {
      console.log(`   Boat depth: ${profile.depth_hints.boat}`);
    }
    if (profile.temperature_hints.length > 0) {
      console.log(`   Temp hints: ${profile.temperature_hints[0].substring(0, 50)}...`);
    }
    console.log();
  }
  
  // Save to JSON file
  const outputData = {
    extracted_date: new Date().toISOString(),
    total_species: allSpecies.length,
    categorization: {
      complete_in_poc: categorizedSpecies.complete.length,
      has_regional_data: categorizedSpecies.hasRegions.length,
      needs_full_research: categorizedSpecies.needsResearch.length
    },
    species: speciesProfiles
  };
  
  const outputPath = 'SPECIES_ENVIRONMENTAL_DATA_EXTRACTION.json';
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  console.log('\n' + '=' .repeat(80));
  console.log(`✅ Data extracted and saved to ${outputPath}\n`);
  
  // Print summary table
  console.log('📋 Summary Table:\n');
  console.log('| Status | Count | Description |');
  console.log('|--------|-------|-------------|');
  console.log(`| ✅ Complete | ${categorizedSpecies.complete.length} | In POC with full environmental profiles |`);
  console.log(`| 🟡 Partial | ${categorizedSpecies.hasRegions.length} | Has regions, needs temp/salinity/depth |`);
  console.log(`| 🔴 Research | ${categorizedSpecies.needsResearch.length} | Needs full environmental research |`);
  console.log(`| **Total** | **${allSpecies.length}** | All species in database |`);
  
  // Create CSV template for data entry
  const csvHeaders = [
    'species_code',
    'name_en',
    'scientific_name',
    'status',
    'regions',
    'temp_optimal_min',
    'temp_optimal_max',
    'temp_tolerance_min',
    'temp_tolerance_max',
    'salinity_optimal_min',
    'salinity_optimal_max',
    'salinity_tolerance_min',
    'salinity_tolerance_max',
    'depth_optimal_min',
    'depth_optimal_max',
    'depth_tolerance_min',
    'depth_tolerance_max',
    'habitat_preferred',
    'spawning_months',
    'feeding_peak_months',
    'regional_gates',
    'shore_suitable',
    'boat_suitable',
    'notes'
  ];
  
  const csvRows = [csvHeaders.join(',')];
  
  for (const profile of speciesProfiles) {
    if (profile.status !== 'complete_in_poc') {
      csvRows.push([
        profile.species_code || '',
        `"${profile.name_en}"`,
        `"${profile.scientific_name}"`,
        profile.status,
        `"${profile.regions.join('; ')}"`,
        '', '', '', '', // temp
        '', '', '', '', // salinity
        '', '', '', '', // depth
        '', // habitat
        '', // spawning
        '', // feeding
        '', // gates
        '', // shore
        '', // boat
        `"${profile.depth_hints.shore || ''} | ${profile.depth_hints.boat || ''}"` // notes
      ].join(','));
    }
  }
  
  const csvPath = 'SPECIES_ENVIRONMENTAL_DATA_TEMPLATE.csv';
  fs.writeFileSync(csvPath, csvRows.join('\n'));
  
  console.log(`\n✅ CSV template created: ${csvPath}`);
  console.log('   Use this to populate environmental data for partial/research species\n');
  
  // Print species needing research (grouped by region hints)
  console.log('\n' + '=' .repeat(80));
  console.log('🔬 Species Needing Environmental Research (by region):\n');
  
  const byRegion: Record<string, string[]> = {};
  
  for (const profile of speciesProfiles) {
    if (profile.status === 'has_regional_data') {
      for (const region of profile.regions) {
        if (!byRegion[region]) byRegion[region] = [];
        byRegion[region].push(profile.name_en);
      }
    }
  }
  
  for (const [region, species] of Object.entries(byRegion).sort()) {
    console.log(`\n**${region}** (${species.length} species):`);
    console.log(`  ${species.join(', ')}`);
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('🎯 Next Steps:\n');
  console.log('1. Review SPECIES_ENVIRONMENTAL_DATA_EXTRACTION.json');
  console.log('2. Fill in SPECIES_ENVIRONMENTAL_DATA_TEMPLATE.csv with FishBase research');
  console.log('3. Priority: Focus on 🟡 species with regional data (quick wins)');
  console.log('4. Generate final JSONB profiles for all 64 species');
  console.log('5. Create migration and populate database\n');
}

extractAllSpeciesData()
  .then(() => {
    console.log('✅ Extraction complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
