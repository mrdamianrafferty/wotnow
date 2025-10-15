import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as duckdb from 'duckdb';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OBIS_API = 'https://api.obis.org';

// FishBase Parquet URLs
const FISHBASE_SPECIES_URL = 'https://data.source.coop/cboettig/fishbase/fb_parquet_2023-01/species.parquet';
const FISHBASE_ECOLOGY_URL = 'https://data.source.coop/cboettig/fishbase/fb_parquet_2023-01/ecology.parquet';

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
    source?: string;
  } | null;
  salinity: {
    optimal_min?: number | null;
    optimal_max?: number | null;
    tolerance_min?: number | null;
    tolerance_max?: number | null;
    unit: string;
    inferred?: boolean;
    source?: string;
  } | null;
  depth: {
    typical_min?: number | null;
    typical_max?: number | null;
    optimal_min?: number | null;
    optimal_max?: number | null;
    unit: string;
    source?: string;
  } | null;
  substrate: string[];
  habitat?: string | null;
  climate?: string | null;
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
  console.log('🔍 Starting Automated Environmental Data Extraction (DuckDB + OBIS)\n');
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
  
  // 2. Initialize DuckDB and query FishBase Parquet files
  console.log('🦆 Initializing DuckDB and loading FishBase Parquet data...');
  const fishbaseData = await queryFishBaseParquet(species);
  console.log(`✅ FishBase data loaded for ${Object.keys(fishbaseData).length} species\n`);
  
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
      // Get FishBase data from pre-loaded cache
      const fbData = fishbaseData[sp.scientific_name.toLowerCase()];
      
      if (fbData) {
        console.log(`  ✅ FishBase: Found data`);
        console.log(`     Depth: ${fbData.DepthRangeShallow || '?'}-${fbData.DepthRangeDeep || '?'}m`);
        console.log(`     Habitat: ${fbData.DemersPelag || 'unknown'}`);
        console.log(`     Salinity: ${fbData.Saltwater ? 'marine' : ''}${fbData.Brack ? '+brackish' : ''}${fbData.Fresh ? '+fresh' : ''}`);
      } else {
        console.log('  ⚠️  FishBase: No data found');
      }
      
      // Query OBIS for validation
      console.log('  🌊 Querying OBIS API...');
      const obisData = await fetchOBIS(sp.scientific_name);
      
      if (obisData && obisData.sample_size > 0) {
        console.log(`  ✅ OBIS: Found ${obisData.sample_size} observations`);
      } else {
        console.log('  ⚠️  OBIS: No observations found');
      }
      
      // Merge and validate
      const environmentalPreferences = mergeAndValidate(fbData, obisData);
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
          fishbase: !!fbData,
          obis: !!obisData && obisData.sample_size > 0,
          manual_review_needed: environmentalPreferences.gaps.length > 0
        },
        raw_data: {
          fishbase: fbData,
          obis: obisData
        }
      };
      
      results.push(result);
      
      if (dataQuality === 'complete') successCount++;
      else if (dataQuality === 'partial') partialCount++;
      else poorCount++;
      
      // Small delay for OBIS API
      await sleep(300);
      
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

async function queryFishBaseParquet(species: SpeciesData[]): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const db = new duckdb.Database(':memory:');
    
    // Build WHERE clause for all our species
    const whereClause = species
      .map(sp => {
        const [genus, speciesName] = sp.scientific_name.split(' ');
        return `(Genus = '${genus}' AND Species = '${speciesName}')`;
      })
      .join(' OR ');
    
    // Query species data with SpecCodes
    db.all(`
      SELECT 
        SpecCode,
        LOWER(Genus || ' ' || Species) as scientific_name_lower,
        DepthRangeShallow,
        DepthRangeDeep,
        DepthRangeComShallow,
        DepthRangeComDeep,
        Fresh,
        Brack,
        Saltwater,
        DemersPelag
      FROM read_parquet('${FISHBASE_SPECIES_URL}')
      WHERE ${whereClause};
    `, (err, speciesRows) => {
      if (err) {
        console.error('❌ DuckDB species query error:', err);
        db.close();
        reject(err);
        return;
      }
      
      if (!speciesRows || speciesRows.length === 0) {
        console.log('⚠️  No species found in FishBase');
        db.close();
        resolve({});
        return;
      }
      
      // Get the SpecCodes we found
      const specCodes = speciesRows.map((row: any) => row.SpecCode).join(', ');
      
      // Now query ecology data for substrate information
      db.all(`
        SELECT 
          SpecCode,
          Rocky, Sand, Mud, Gravel, Silt,
          SoftBottom, HardBottom,
          CoralReefs, SeaGrassBeds, Macrophyte,
          Demersal, Pelagic, Benthic
        FROM read_parquet('${FISHBASE_ECOLOGY_URL}')
        WHERE SpecCode IN (${specCodes});
      `, (err2, ecologyRows) => {
        if (err2) {
          console.error('❌ DuckDB ecology query error:', err2);
          db.close();
          reject(err2);
          return;
        }
        
        // Merge species and ecology data
        const lookup: Record<string, any> = {};
        
        speciesRows.forEach((speciesRow: any) => {
          const ecology = ecologyRows?.find((e: any) => e.SpecCode === speciesRow.SpecCode);
          
          // Combine data
          lookup[speciesRow.scientific_name_lower] = {
            ...speciesRow,
            ecology: ecology || null
          };
        });
        
        db.close();
        resolve(lookup);
      });
    });
  });
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
    habitat: null,
    climate: null,
    gaps: []
  };
  
  // === TEMPERATURE ===
  // FishBase Parquet doesn't have temperature fields - use OBIS only
  if (obisData?.temperature) {
    preferences.temperature = {
      tolerance_min: Math.round(obisData.temperature.p10 * 10) / 10,
      tolerance_max: Math.round(obisData.temperature.p90 * 10) / 10,
      optimal_min: Math.round(obisData.temperature.p25 * 10) / 10,
      optimal_max: Math.round(obisData.temperature.p75 * 10) / 10,
      unit: 'celsius',
      source: 'obis'
    };
  }
  
  if (!preferences.temperature) {
    preferences.gaps.push('temperature');
  }
  
  // === DEPTH ===
  // Use SPECIES table fields: DepthRangeShallow, DepthRangeDeep, DepthRangeComShallow, DepthRangeComDeep
  if (fishbaseData?.DepthRangeShallow != null || fishbaseData?.DepthRangeDeep != null) {
    preferences.depth = {
      typical_min: fishbaseData.DepthRangeShallow ?? 0,
      typical_max: fishbaseData.DepthRangeDeep ?? 0,
      optimal_min: fishbaseData.DepthRangeComShallow || obisData?.depth?.p25 || null,
      optimal_max: fishbaseData.DepthRangeComDeep || obisData?.depth?.p75 || null,
      unit: 'meters',
      source: 'fishbase'
    };
  } else if (obisData?.depth) {
    preferences.depth = {
      typical_min: Math.round(obisData.depth.p10),
      typical_max: Math.round(obisData.depth.p90),
      optimal_min: Math.round(obisData.depth.p25),
      optimal_max: Math.round(obisData.depth.p75),
      unit: 'meters',
      source: 'obis'
    };
  }
  
  if (!preferences.depth) {
    preferences.gaps.push('depth');
  }
  
  // === SALINITY ===
  // Use SPECIES table flags: Fresh, Brack, Saltwater (more precise than ecology.Salinity text)
  if (fishbaseData?.Saltwater || fishbaseData?.Brack || fishbaseData?.Fresh) {
    const saltwater = fishbaseData.Saltwater === 1 || fishbaseData.Saltwater === -1;
    const brackish = fishbaseData.Brack === 1 || fishbaseData.Brack === -1;
    const freshwater = fishbaseData.Fresh === 1 || fishbaseData.Fresh === -1;
    
    preferences.salinity = inferSalinityFromFlags(
      { saltwater, brackish, freshwater },
      obisData?.salinity
    );
  } else if (obisData?.salinity) {
    preferences.salinity = {
      tolerance_min: Math.round(obisData.salinity.p10 * 10) / 10,
      tolerance_max: Math.round(obisData.salinity.p90 * 10) / 10,
      optimal_min: Math.round(obisData.salinity.p25 * 10) / 10,
      optimal_max: Math.round(obisData.salinity.p75 * 10) / 10,
      unit: 'psu',
      source: 'obis'
    };
  }
  
  if (!preferences.salinity) {
    preferences.gaps.push('salinity');
  }
  
  // === SUBSTRATE & HABITAT ===
  if (fishbaseData?.ecology) {
    const ecology = fishbaseData.ecology;
    const substrates: string[] = [];
    
    // Check ecology table flags (-1 means yes, 0 means no)
    if (ecology.Rocky === -1 || ecology.HardBottom === -1) {
      substrates.push('rock');
    }
    if (ecology.Sand === -1) {
      substrates.push('sand');
    }
    if (ecology.Mud === -1 || ecology.Silt === -1) {
      substrates.push('mud');
    }
    if (ecology.Gravel === -1) {
      substrates.push('mixed');
    }
    if (ecology.SeaGrassBeds === -1 || ecology.Macrophyte === -1) {
      substrates.push('weed');
    }
    if (ecology.CoralReefs === -1) {
      substrates.push('rock'); // Coral reefs are rocky
    }
    
    // If soft/hard bottom but no specifics
    if (substrates.length === 0) {
      if (ecology.SoftBottom === -1) {
        substrates.push('mixed');
      }
      if (ecology.HardBottom === -1) {
        substrates.push('rock');
      }
    }
    
    preferences.substrate = [...new Set(substrates)]; // Remove duplicates
  }
  
  // Fallback to habitat type if no ecology data
  if (preferences.substrate.length === 0 && fishbaseData?.DemersPelag) {
    preferences.habitat = fishbaseData.DemersPelag;
    preferences.substrate = parseHabitatToSubstrate(fishbaseData.DemersPelag);
  }
  
  // Add climate info if available (from ecology table first, then species table)
  if (fishbaseData?.ecology?.Climate) {
    preferences.climate = fishbaseData.Climate;
  }
  
  if (preferences.substrate.length === 0) {
    preferences.gaps.push('substrate');
  }
  
  return preferences;
}

function inferSalinityFromFlags(habitat: { saltwater: boolean; brackish: boolean; freshwater: boolean }, obisData: any = null) {
  // Freshwater only
  if (habitat.freshwater && !habitat.saltwater && !habitat.brackish) {
    return {
      optimal_min: 0,
      optimal_max: 0.5,
      tolerance_min: 0,
      tolerance_max: 5,
      unit: 'psu',
      inferred: true,
      source: 'fishbase'
    };
  }
  
  // Brackish tolerant (euryhaline)
  if (habitat.brackish) {
    return {
      optimal_min: obisData?.p25 ? Math.round(obisData.p25 * 10) / 10 : 20,
      optimal_max: obisData?.p75 ? Math.round(obisData.p75 * 10) / 10 : 35,
      tolerance_min: obisData?.p10 ? Math.round(obisData.p10 * 10) / 10 : 5,
      tolerance_max: obisData?.p90 ? Math.round(obisData.p90 * 10) / 10 : 38,
      unit: 'psu',
      inferred: true,
      source: 'fishbase+obis'
    };
  }
  
  // Marine/saltwater only
  if (habitat.saltwater) {
    return {
      optimal_min: obisData?.p25 ? Math.round(obisData.p25 * 10) / 10 : 32,
      optimal_max: obisData?.p75 ? Math.round(obisData.p75 * 10) / 10 : 35,
      tolerance_min: obisData?.p10 ? Math.round(obisData.p10 * 10) / 10 : 30,
      tolerance_max: obisData?.p90 ? Math.round(obisData.p90 * 10) / 10 : 38,
      unit: 'psu',
      inferred: true,
      source: 'fishbase+obis'
    };
  }
  
  return null;
}

function inferSalinityFromString(salinityStr: string, obisData: any = null) {
  // FishBase uses: "freshwater", "brackish", "marine", or "full"
  if (salinityStr.includes('fresh')) {
    return {
      optimal_min: 0,
      optimal_max: 0.5,
      tolerance_min: 0,
      tolerance_max: 5,
      unit: 'psu',
      inferred: true,
      source: 'fishbase'
    };
  }
  
  if (salinityStr.includes('brackish')) {
    return {
      optimal_min: obisData?.p25 || 10,
      optimal_max: obisData?.p75 || 25,
      tolerance_min: obisData?.p10 || 5,
      tolerance_max: obisData?.p90 || 35,
      unit: 'psu',
      inferred: true,
      source: 'fishbase+obis'
    };
  }
  
  // Marine or full salinity
  return {
    optimal_min: obisData?.p25 || 32,
    optimal_max: obisData?.p75 || 35,
    tolerance_min: obisData?.p10 || 30,
    tolerance_max: obisData?.p90 || 38,
    unit: 'psu',
    inferred: true,
    source: 'fishbase+obis'
  };
}

function parseHabitatToSubstrate(habitat: string): string[] {
  const substrates: string[] = [];
  const lower = String(habitat || '').toLowerCase();
  
  // Demersal = bottom-dwelling (needs substrate)
  if (lower.includes('demersal') || lower.includes('benthic')) {
    substrates.push('mixed'); // Default for bottom dwellers
  }
  
  // Reef-associated
  if (lower.includes('reef')) {
    substrates.push('rock');
  }
  
  // Pelagic = open water (no substrate association)
  if (lower.includes('pelagic')) {
    // Pelagic species don't have substrate preferences
    return [];
  }
  
  // Benthopelagic = both bottom and midwater
  if (lower.includes('benthopelagic')) {
    substrates.push('mixed');
  }
  
  return [...new Set(substrates)];
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
  console.log('📊 AUTOMATED EXTRACTION REPORT (DuckDB + OBIS)');
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
    method: 'duckdb_parquet + obis_api',
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
