import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AutomatedData {
  species_code: string;
  scientific_name: string;
  name_en: string;
  environmental_preferences: any;
  data_quality: string;
  sources: any;
  raw_data: any;
}

async function mergeSpeciesHabitatData() {
  console.log('🔗 Merging Species Table Habitat Data\n');
  console.log('='.repeat(80));
  
  // 1. Load automated extraction results
  console.log('\n📂 Loading ENVIRONMENTAL_DATA_AUTOMATED.json...');
  const automatedPath = path.join(process.cwd(), 'ENVIRONMENTAL_DATA_AUTOMATED.json');
  const automatedData: AutomatedData[] = JSON.parse(fs.readFileSync(automatedPath, 'utf-8'));
  console.log(`✅ Loaded ${automatedData.length} species from automated extraction`);
  
  // 2. Get species table data
  console.log('\n📊 Fetching species table data...');
  const { data: speciesTable, error } = await supabase
    .from('species')
    .select('species_code, preferred_habitat, min_depth, max_depth')
    .not('preferred_habitat', 'is', null);
  
  if (error || !speciesTable) {
    console.error('❌ Error fetching species table:', error);
    return;
  }
  
  console.log(`✅ Found ${speciesTable.length} species with preferred_habitat data`);
  
  // Create lookup
  const habitatLookup = new Map<string, any>();
  speciesTable.forEach(sp => {
    habitatLookup.set(sp.species_code, {
      preferred_habitat: sp.preferred_habitat,
      min_depth: sp.min_depth,
      max_depth: sp.max_depth
    });
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('🔧 Merging Data...\n');
  
  let substrateFilledCount = 0;
  let depthRefinedCount = 0;
  let noChangeCount = 0;
  
  // 3. Merge data
  automatedData.forEach((species, idx) => {
    const habitatData = habitatLookup.get(species.species_code);
    
    if (!habitatData) {
      noChangeCount++;
      return;
    }
    
    const progress = `[${idx + 1}/${automatedData.length}]`;
    console.log(`${progress} ${species.name_en} (${species.species_code})`);
    
    let changes: string[] = [];
    
    // Merge substrate from preferred_habitat
    if (habitatData.preferred_habitat && Array.isArray(habitatData.preferred_habitat)) {
      const currentSubstrate = species.environmental_preferences.substrate || [];
      const newSubstrate = mapHabitatToSubstrate(habitatData.preferred_habitat);
      
      if (newSubstrate.length > 0) {
        // Merge and deduplicate
        const merged = [...new Set([...currentSubstrate, ...newSubstrate])];
        
        if (merged.length > currentSubstrate.length) {
          species.environmental_preferences.substrate = merged;
          changes.push(`Substrate: ${currentSubstrate.join(',')} → ${merged.join(',')}`);
          substrateFilledCount++;
          
          // Remove substrate from gaps if now filled
          species.environmental_preferences.gaps = species.environmental_preferences.gaps.filter(
            (g: string) => g !== 'substrate'
          );
        }
      }
    }
    
    // Refine depth if species table has better data
    if (habitatData.min_depth != null && habitatData.max_depth != null) {
      const currentDepth = species.environmental_preferences.depth;
      
      if (!currentDepth || !currentDepth.typical_min || !currentDepth.typical_max) {
        // Fill missing depth
        species.environmental_preferences.depth = {
          typical_min: habitatData.min_depth,
          typical_max: habitatData.max_depth,
          optimal_min: currentDepth?.optimal_min || null,
          optimal_max: currentDepth?.optimal_max || null,
          unit: 'meters',
          source: 'species_table'
        };
        changes.push(`Depth: Added ${habitatData.min_depth}-${habitatData.max_depth}m`);
        depthRefinedCount++;
        
        // Remove depth from gaps
        species.environmental_preferences.gaps = species.environmental_preferences.gaps.filter(
          (g: string) => g !== 'depth'
        );
      } else if (currentDepth.typical_min === 0 || currentDepth.typical_max === 0) {
        // Replace null/zero depths with species table data
        if (habitatData.min_depth > 0) {
          currentDepth.typical_min = habitatData.min_depth;
        }
        if (habitatData.max_depth > 0) {
          currentDepth.typical_max = habitatData.max_depth;
        }
        currentDepth.source = 'fishbase+species_table';
        changes.push(`Depth: Refined to ${currentDepth.typical_min}-${currentDepth.typical_max}m`);
        depthRefinedCount++;
      }
    }
    
    // Update data quality
    if (changes.length > 0) {
      const hasTemp = !species.environmental_preferences.gaps.includes('temperature');
      const hasSalinity = !species.environmental_preferences.gaps.includes('salinity');
      const hasDepth = !species.environmental_preferences.gaps.includes('depth');
      const hasSubstrate = !species.environmental_preferences.gaps.includes('substrate');
      
      if (hasTemp && hasSalinity && hasDepth && hasSubstrate) {
        species.data_quality = 'complete';
      } else if ((hasTemp && hasDepth) || (hasSalinity && hasDepth)) {
        species.data_quality = 'partial';
      } else {
        species.data_quality = 'poor';
      }
      
      species.sources.species_table = true;
      
      console.log(`  ✅ ${changes.join('; ')}`);
      console.log(`  📊 New quality: ${species.data_quality.toUpperCase()}`);
    } else {
      noChangeCount++;
    }
  });
  
  // 4. Save merged results
  console.log('\n' + '='.repeat(80));
  console.log('💾 Saving merged results...\n');
  
  const outputPath = path.join(process.cwd(), 'ENVIRONMENTAL_DATA_MERGED.json');
  fs.writeFileSync(outputPath, JSON.stringify(automatedData, null, 2));
  console.log(`✅ Saved: ${outputPath}`);
  
  // 5. Generate report
  generateReport(automatedData, substrateFilledCount, depthRefinedCount, noChangeCount);
}

function mapHabitatToSubstrate(habitatArray: string[]): string[] {
  const substrates: string[] = [];
  const combined = habitatArray.join(' ').toLowerCase();
  
  // Map habitat keywords to our substrate categories
  if (combined.includes('reef') || combined.includes('rock') || combined.includes('boulder') || combined.includes('wreck')) {
    substrates.push('rock');
  }
  if (combined.includes('sand') || combined.includes('surf') || combined.includes('bar') || combined.includes('bank') || combined.includes('flat')) {
    substrates.push('sand');
  }
  if (combined.includes('mud') || combined.includes('silt') || combined.includes('soft')) {
    substrates.push('mud');
  }
  if (combined.includes('weed') || combined.includes('kelp') || combined.includes('vegetation') || combined.includes('macrophyte') || combined.includes('algae')) {
    substrates.push('weed');
  }
  if (combined.includes('mixed') || combined.includes('gravel') || combined.includes('shell') || combined.includes('channel')) {
    substrates.push('mixed');
  }
  
  // Harbour/estuaries often mixed
  if (combined.includes('harbour') || combined.includes('estuary') || combined.includes('bay')) {
    if (substrates.length === 0) {
      substrates.push('mixed');
    }
  }
  
  return [...new Set(substrates)]; // Remove duplicates
}

function generateReport(data: AutomatedData[], substrateFilledCount: number, depthRefinedCount: number, noChangeCount: number) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 MERGE REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n✅ Total species: ${data.length}`);
  console.log(`   🔧 Substrate enhanced: ${substrateFilledCount}`);
  console.log(`   📏 Depth refined: ${depthRefinedCount}`);
  console.log(`   ➖ No changes: ${noChangeCount}`);
  
  // Recalculate quality distribution
  const qualityDist = {
    complete: data.filter(d => d.data_quality === 'complete').length,
    partial: data.filter(d => d.data_quality === 'partial').length,
    poor: data.filter(d => d.data_quality === 'poor').length
  };
  
  console.log(`\n📈 Data quality after merge:`);
  console.log(`   🟢 Complete profiles: ${qualityDist.complete} (${Math.round(qualityDist.complete/data.length*100)}%)`);
  console.log(`   🟡 Partial profiles: ${qualityDist.partial} (${Math.round(qualityDist.partial/data.length*100)}%)`);
  console.log(`   🔴 Poor/missing data: ${qualityDist.poor} (${Math.round(qualityDist.poor/data.length*100)}%)`);
  
  // Parameter coverage
  const tempCount = data.filter(d => !d.environmental_preferences.gaps.includes('temperature')).length;
  const salinityCount = data.filter(d => !d.environmental_preferences.gaps.includes('salinity')).length;
  const depthCount = data.filter(d => !d.environmental_preferences.gaps.includes('depth')).length;
  const substrateCount = data.filter(d => !d.environmental_preferences.gaps.includes('substrate')).length;
  
  console.log(`\n📊 Parameter coverage after merge:`);
  console.log(`   Temperature: ${tempCount}/${data.length} (${Math.round(tempCount/data.length*100)}%)`);
  console.log(`   Salinity: ${salinityCount}/${data.length} (${Math.round(salinityCount/data.length*100)}%)`);
  console.log(`   Depth: ${depthCount}/${data.length} (${Math.round(depthCount/data.length*100)}%)`);
  console.log(`   Substrate: ${substrateCount}/${data.length} (${Math.round(substrateCount/data.length*100)}%)`);
  
  const improvementSubstrate = substrateCount - 47; // Was 47/62 (76%)
  const improvementDepth = depthCount - 59; // Was 59/62 (95%)
  
  if (improvementSubstrate > 0 || improvementDepth > 0) {
    console.log(`\n🎉 Improvements from species table merge:`);
    if (improvementSubstrate > 0) {
      console.log(`   Substrate: +${improvementSubstrate} species (${Math.round(improvementSubstrate/data.length*100)}% improvement)`);
    }
    if (improvementDepth > 0) {
      console.log(`   Depth: +${improvementDepth} species (${Math.round(improvementDepth/data.length*100)}% improvement)`);
    }
  }
  
  // Species still needing manual review
  const needsReview = data.filter(d => d.environmental_preferences.gaps.length > 0);
  console.log(`\n📝 Manual review still needed: ${needsReview.length} species`);
  
  if (needsReview.length > 0 && needsReview.length <= 10) {
    console.log('\nSpecies requiring additional research:');
    needsReview.forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.name_en} (${r.species_code}) - gaps: ${r.environmental_preferences.gaps.join(', ')}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Merge complete!');
  console.log('📂 Next: Fill temperature gaps from OBIS data');
  console.log('📚 Then: Manual ICES research for Tier 1 species');
  console.log('='.repeat(80) + '\n');
  
  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    total_species: data.length,
    improvements: {
      substrate_filled: substrateFilledCount,
      depth_refined: depthRefinedCount,
      no_changes: noChangeCount
    },
    quality_after_merge: qualityDist,
    parameter_coverage: {
      temperature: tempCount,
      salinity: salinityCount,
      depth: depthCount,
      substrate: substrateCount
    },
    species_needing_review: needsReview.map(r => ({
      species_code: r.species_code,
      name_en: r.name_en,
      gaps: r.environmental_preferences.gaps
    }))
  };
  
  const summaryPath = path.join(process.cwd(), 'MERGE_SUMMARY.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`💾 Summary saved: ${summaryPath}\n`);
}

// Run merge
mergeSpeciesHabitatData()
  .then(() => {
    console.log('🎉 Merge process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
