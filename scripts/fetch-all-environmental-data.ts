import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FISHBASE_API = 'https://fishbase.ropensci.org';
const OBIS_API = 'https://api.obis.org';

interface SpeciesData {
  id: string;
  species_code: string;
  scientific_name: string;
  name_en: string;
}

interface EnvironmentalPreferences {
  temperature: {
    optimal_min?: number | null;
    optimal_max?: number | null;
    tolerance_min?: number | null;
    tolerance_max?: number | null;
    unit: string;
    inferred?: boolean;
  } | null;
  salinity: {
    optimal_min?: number | null;
    optimal_max?: number | null;
    tolerance_min?: number | null;
    tolerance_max?: number | null;
    unit: string;
    inferred?: boolean;
  } | null;
  depth: {
    typical_min?: number | null;
    typical_max?: number | null;
    optimal_min?: number | null;
    optimal_max?: number | null;
    unit: string;
  } | null;
  substrate: string[];
  gaps: string[];
}

interface ExtractionResult {
  species_code: string;
  scientific_name: string;
  name_en: string;
  environmental_preferences: EnvironmentalPreferences;
  data_quality: 'complete' | 'partial' | 'poor';
  sources: {
    fishbase: boolean;
    obis: boolean;
    manual_review_needed: boolean;
  };
  raw_data?: {
    fishbase?: any;
    obis?: any;
  };
}

async function fetchAllEnvironmentalData() {
  console.log('🔍 Starting Automated Environmental Data Extraction\n');
  console.log('='.repeat(80));
  
  // 1. Get all 62 species from database
  console.log('\n📊 Fetching species from database...');
  const { data: species, error } = await supabase
    .from('species')
    .select('id, species_code, scientific_name, name_en')
    .order('name_en');
  
  if (error || !species) {
    console.error('❌ Error fetching species:', error);
    return;
  }
  
  console.log(`✅ Found ${species.length} species\n`);
  console.log('='.repeat(80));
  
  const results: ExtractionResult[] = [];
  let successCount = 0;
  let partialCount = 0;
  let poorCount = 0;
  
  for (let i = 0; i < species.length; i++) {
    const sp = species[i];
    const progress = `[${i + 1}/${species.length}]`;
    
    console.log(`\n${progress} Processing: ${sp.name_en} (${sp.scientific_name})`);
    console.log('─'.repeat(80));
    
    try {
      // Phase 1: Try FishBase
      console.log('  🐟 Querying FishBase API...');
      const fishbaseData = await fetchFishBase(sp.scientific_name);
      
      if (fishbaseData) {
        console.log(`  ✅ FishBase: Found data (SpecCode: ${fishbaseData.specCode})`);
      } else {
        console.log('  ⚠️  FishBase: No data found');
      }
      
      // Phase 2: Try OBIS validation
      console.log('  🌊 Querying OBIS API...');
      const obisData = await fetchOBIS(sp.scientific_name);
      
      if (obisData && obisData.sample_size > 0) {
        console.log(`  ✅ OBIS: Found ${obisData.sample_size} observations`);
      } else {
        console.log('  ⚠️  OBIS: No observations found');
      }
      
      // Merge and validate
      const environmentalPreferences = mergeAndValidate(fishbaseData, obisData);
      const dataQuality = calculateQuality(environmentalPreferences);
      
      // Log quality
      const qualityEmoji = dataQuality === 'complete' ? '🟢' : dataQuality === 'partial' ? '🟡' : '🔴';
      console.log(`  ${qualityEmoji} Data Quality: ${dataQuality.toUpperCase()}`);
      
      if (environmentalPreferences.gaps.length > 0) {
        console.log(`  📝 Gaps: ${environmentalPreferences.gaps.join(', ')}`);
      }
      
      const result: ExtractionResult = {
        species_code: sp.species_code,
        scientific_name: sp.scientific_name,
        name_en: sp.name_en,
        environmental_preferences: environmentalPreferences,
        data_quality: dataQuality,
        sources: {
          fishbase: !!fishbaseData,
          obis: !!obisData && obisData.sample_size > 0,
          manual_review_needed: environmentalPreferences.gaps.length > 0
        },
        raw_data: {
          fishbase: fishbaseData,
          obis: obisData
        }
      };
      
      results.push(result);
      
      if (dataQuality === 'complete') successCount++;
      else if (dataQuality === 'partial') partialCount++;
      else poorCount++;
      
      // Rate limiting: 500ms between requests
      await sleep(500);
      
    } catch (error: any) {
      console.error(`  ❌ Error processing ${sp.name_en}:`, error.message);
      
      // Add placeholder result
      results.push({
        species_code: sp.species_code,
        scientific_name: sp.scientific_name,
        name_en: sp.name_en,
        environmental_preferences: {
          temperature: null,
          salinity: null,
          depth: null,
          substrate: [],
          gaps: ['temperature', 'salinity', 'depth', 'substrate']
        },
        data_quality: 'poor',
        sources: {
          fishbase: false,
          obis: false,
          manual_review_needed: true
        }
      });
      
      poorCount++;
    }
  }
  
  // Save results
  console.log('\n' + '='.repeat(80));
  console.log('💾 Saving results...\n');
  
  const outputPath = path.join(process.cwd(), 'ENVIRONMENTAL_DATA_AUTOMATED.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`✅ Saved: ${outputPath}`);
  
  // Generate summary report
  generateReport(results, successCount, partialCount, poorCount);
  
  return results;
}

async function fetchFishBase(scientificName: string) {
  const [genus, species] = scientificName.split(' ');
  
  if (!genus || !species) {
    return null;
  }
  
  try {
    // 1. Get species ID
    const speciesResp = await axios.get(`${FISHBASE_API}/species`, {
      params: { Genus: genus, Species: species },
      timeout: 10000
    });
    
    if (!speciesResp.data || speciesResp.data.length === 0) {
      return null;
    }
    
    const specCode = speciesResp.data[0].SpecCode;
    const speciesData = speciesResp.data[0];
    
    // 2. Get ecology data
    let ecologyData = null;
    try {
      const ecologyResp = await axios.get(`${FISHBASE_API}/ecology`, {
        params: { SpecCode: specCode },
        timeout: 10000
      });
      ecologyData = ecologyResp.data && ecologyResp.data.length > 0 ? ecologyResp.data[0] : null;
    } catch (ecologyError) {
      console.log('    ⚠️  Ecology endpoint failed, using species data only');
    }
    
    return {
      specCode,
      species: speciesData,
      ecology: ecologyData,
      source: 'fishbase'
    };
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.log('    ⚠️  FishBase API timeout or network error');
    }
    return null;
  }
}

async function fetchOBIS(scientificName: string) {
  try {
    const resp = await axios.get(`${OBIS_API}/occurrence`, {
      params: {
        scientificname: scientificName,
        fields: 'temperature,depth,salinity',
        size: 1000
      },
      timeout: 15000
    });
    
    if (!resp.data.results || resp.data.results.length === 0) {
      return null;
    }
    
    // Calculate percentiles for validation
    const temps = resp.data.results.map((r: any) => r.temperature).filter((t: any) => t != null && t > -5 && t < 40);
    const depths = resp.data.results.map((r: any) => r.depth ? Math.abs(r.depth) : null).filter((d: any) => d != null && d >= 0 && d < 10000);
    const salinities = resp.data.results.map((r: any) => r.salinity).filter((s: any) => s != null && s >= 0 && s <= 42);
    
    return {
      temperature: temps.length > 10 ? calculatePercentiles(temps) : null,
      depth: depths.length > 10 ? calculatePercentiles(depths) : null,
      salinity: salinities.length > 10 ? calculatePercentiles(salinities) : null,
      sample_size: resp.data.results.length,
      source: 'obis'
    };
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.log('    ⚠️  OBIS API timeout or network error');
    }
    return null;
  }
}

function mergeAndValidate(fishbaseData: any, obisData: any): EnvironmentalPreferences {
  const preferences: EnvironmentalPreferences = {
    temperature: null,
    salinity: null,
    depth: null,
    substrate: [],
    gaps: []
  };
  
  // === TEMPERATURE ===
  if (fishbaseData?.ecology) {
    const tempMin = fishbaseData.ecology.TempMin;
    const tempMax = fishbaseData.ecology.TempMax;
    
    if (tempMin != null && tempMax != null) {
      preferences.temperature = {
        tolerance_min: tempMin,
        tolerance_max: tempMax,
        optimal_min: obisData?.temperature?.p25 || null,
        optimal_max: obisData?.temperature?.p75 || null,
        unit: 'celsius'
      };
    }
  }
  
  // Fallback to OBIS if FishBase missing
  if (!preferences.temperature && obisData?.temperature) {
    preferences.temperature = {
      tolerance_min: Math.round(obisData.temperature.p10 * 10) / 10,
      tolerance_max: Math.round(obisData.temperature.p90 * 10) / 10,
      optimal_min: Math.round(obisData.temperature.p25 * 10) / 10,
      optimal_max: Math.round(obisData.temperature.p75 * 10) / 10,
      unit: 'celsius',
      inferred: true
    };
  }
  
  if (!preferences.temperature) {
    preferences.gaps.push('temperature');
  }
  
  // === DEPTH ===
  if (fishbaseData?.ecology) {
    const depthShallow = fishbaseData.ecology.DepthRangeShallow;
    const depthDeep = fishbaseData.ecology.DepthRangeDeep;
    const commonMin = fishbaseData.ecology.CommonDepthMin;
    const commonMax = fishbaseData.ecology.CommonDepthMax;
    
    if (depthShallow != null && depthDeep != null) {
      preferences.depth = {
        typical_min: depthShallow,
        typical_max: depthDeep,
        optimal_min: commonMin || obisData?.depth?.p25 || null,
        optimal_max: commonMax || obisData?.depth?.p75 || null,
        unit: 'meters'
      };
    }
  }
  
  // Fallback to OBIS
  if (!preferences.depth && obisData?.depth) {
    preferences.depth = {
      typical_min: Math.round(obisData.depth.p10),
      typical_max: Math.round(obisData.depth.p90),
      optimal_min: Math.round(obisData.depth.p25),
      optimal_max: Math.round(obisData.depth.p75),
      unit: 'meters'
    };
  }
  
  if (!preferences.depth) {
    preferences.gaps.push('depth');
  }
  
  // === SALINITY ===
  if (fishbaseData?.species) {
    const saltwater = fishbaseData.species.Saltwater === 1 || fishbaseData.species.Saltwater === -1;
    const brackish = fishbaseData.species.Brackish === 1 || fishbaseData.species.Brackish === -1;
    
    if (saltwater || brackish) {
      preferences.salinity = inferSalinityFromHabitat(
        { saltwater, brackish },
        obisData?.salinity
      );
    }
  }
  
  // Fallback to OBIS
  if (!preferences.salinity && obisData?.salinity) {
    preferences.salinity = {
      tolerance_min: Math.round(obisData.salinity.p10 * 10) / 10,
      tolerance_max: Math.round(obisData.salinity.p90 * 10) / 10,
      optimal_min: Math.round(obisData.salinity.p25 * 10) / 10,
      optimal_max: Math.round(obisData.salinity.p75 * 10) / 10,
      unit: 'psu',
      inferred: true
    };
  }
  
  if (!preferences.salinity) {
    preferences.gaps.push('salinity');
  }
  
  // === SUBSTRATE ===
  if (fishbaseData?.ecology) {
    const substrate = fishbaseData.ecology.Substrate;
    const habitat = fishbaseData.ecology.PrimaryHabitat;
    
    if (substrate || habitat) {
      preferences.substrate = parseSubstrate(substrate, habitat);
    }
  }
  
  if (preferences.substrate.length === 0) {
    preferences.gaps.push('substrate');
  }
  
  return preferences;
}

function inferSalinityFromHabitat(habitat: { saltwater: boolean; brackish: boolean }, obisData: any = null) {
  // Marine only: 30-38 PSU
  if (habitat.saltwater && !habitat.brackish) {
    return {
      optimal_min: obisData?.p25 ? Math.round(obisData.p25 * 10) / 10 : 32,
      optimal_max: obisData?.p75 ? Math.round(obisData.p75 * 10) / 10 : 35,
      tolerance_min: obisData?.p10 ? Math.round(obisData.p10 * 10) / 10 : 30,
      tolerance_max: obisData?.p90 ? Math.round(obisData.p90 * 10) / 10 : 38,
      unit: 'psu',
      inferred: true
    };
  }
  
  // Brackish tolerant: wider range
  if (habitat.brackish) {
    return {
      optimal_min: obisData?.p25 ? Math.round(obisData.p25 * 10) / 10 : 20,
      optimal_max: obisData?.p75 ? Math.round(obisData.p75 * 10) / 10 : 35,
      tolerance_min: obisData?.p10 ? Math.round(obisData.p10 * 10) / 10 : 5,
      tolerance_max: obisData?.p90 ? Math.round(obisData.p90 * 10) / 10 : 38,
      unit: 'psu',
      inferred: true
    };
  }
  
  return null;
}

function parseSubstrate(substrateString: string | null, habitatString: string | null): string[] {
  const substrates: string[] = [];
  const combined = `${substrateString || ''} ${habitatString || ''}`.toLowerCase();
  
  if (combined.includes('rock') || combined.includes('reef') || combined.includes('coral')) {
    substrates.push('rock');
  }
  if (combined.includes('sand')) {
    substrates.push('sand');
  }
  if (combined.includes('mud') || combined.includes('silt') || combined.includes('soft')) {
    substrates.push('mud');
  }
  if (combined.includes('weed') || combined.includes('vegetation') || combined.includes('algae') || combined.includes('kelp')) {
    substrates.push('weed');
  }
  if (combined.includes('gravel') || combined.includes('mixed') || combined.includes('shell')) {
    substrates.push('mixed');
  }
  
  // Add demersal/pelagic hints
  if (combined.includes('demersal') || combined.includes('benthic') || combined.includes('bottom')) {
    if (substrates.length === 0) substrates.push('mixed');
  }
  
  return [...new Set(substrates)]; // Remove duplicates
}

function calculatePercentiles(values: number[]) {
  if (values.length === 0) return null;
  
  const sorted = values.sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length * 0.10)];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  
  return { p10, p25, p50, p75, p90 };
}

function calculateQuality(preferences: EnvironmentalPreferences): 'complete' | 'partial' | 'poor' {
  const hasTemp = !preferences.gaps.includes('temperature');
  const hasSalinity = !preferences.gaps.includes('salinity');
  const hasDepth = !preferences.gaps.includes('depth');
  const hasSubstrate = !preferences.gaps.includes('substrate');
  
  const complete = hasTemp && hasSalinity && hasDepth && hasSubstrate;
  const partial = (hasTemp && hasDepth) || (hasSalinity && hasDepth);
  
  if (complete) return 'complete';
  if (partial) return 'partial';
  return 'poor';
}

function generateReport(results: ExtractionResult[], successCount: number, partialCount: number, poorCount: number) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 AUTOMATED EXTRACTION REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n✅ Total species processed: ${results.length}`);
  console.log(`   🟢 Complete profiles: ${successCount} (${Math.round(successCount/results.length*100)}%)`);
  console.log(`   🟡 Partial profiles: ${partialCount} (${Math.round(partialCount/results.length*100)}%)`);
  console.log(`   🔴 Poor/missing data: ${poorCount} (${Math.round(poorCount/results.length*100)}%)`);
  
  console.log(`\n📈 Data sources:`);
  const fishbaseCount = results.filter(r => r.sources.fishbase).length;
  const obisCount = results.filter(r => r.sources.obis).length;
  console.log(`   FishBase hits: ${fishbaseCount}/${results.length} (${Math.round(fishbaseCount/results.length*100)}%)`);
  console.log(`   OBIS hits: ${obisCount}/${results.length} (${Math.round(obisCount/results.length*100)}%)`);
  
  // Species needing manual review
  const needsReview = results.filter(r => r.sources.manual_review_needed);
  console.log(`\n📝 Manual review needed: ${needsReview.length} species`);
  
  if (needsReview.length > 0 && needsReview.length <= 15) {
    console.log('\nSpecies requiring manual research:');
    needsReview.forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.name_en} (${r.species_code}) - gaps: ${r.environmental_preferences.gaps.join(', ')}`);
    });
  }
  
  // Parameter coverage
  console.log('\n📊 Parameter coverage:');
  const tempCount = results.filter(r => !r.environmental_preferences.gaps.includes('temperature')).length;
  const salinityCount = results.filter(r => !r.environmental_preferences.gaps.includes('salinity')).length;
  const depthCount = results.filter(r => !r.environmental_preferences.gaps.includes('depth')).length;
  const substrateCount = results.filter(r => !r.environmental_preferences.gaps.includes('substrate')).length;
  
  console.log(`   Temperature: ${tempCount}/${results.length} (${Math.round(tempCount/results.length*100)}%)`);
  console.log(`   Salinity: ${salinityCount}/${results.length} (${Math.round(salinityCount/results.length*100)}%)`);
  console.log(`   Depth: ${depthCount}/${results.length} (${Math.round(depthCount/results.length*100)}%)`);
  console.log(`   Substrate: ${substrateCount}/${results.length} (${Math.round(substrateCount/results.length*100)}%)`);
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Automated extraction complete!');
  console.log('📂 Next: Review ENVIRONMENTAL_DATA_AUTOMATED.json');
  console.log('📚 Then: Manual ICES research for Tier 1 species');
  console.log('='.repeat(80));
  
  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    total_species: results.length,
    complete: successCount,
    partial: partialCount,
    poor: poorCount,
    fishbase_hits: fishbaseCount,
    obis_hits: obisCount,
    manual_review_needed: needsReview.length,
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
  
  const summaryPath = path.join(process.cwd(), 'ENVIRONMENTAL_DATA_EXTRACTION_SUMMARY.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n💾 Summary saved: ${summaryPath}\n`);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the extraction
fetchAllEnvironmentalData()
  .then(() => {
    console.log('🎉 Process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
