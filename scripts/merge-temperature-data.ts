import fs from 'fs';

// Species code mapping for mismatches between MERGED and LOOKUP files
const speciesCodeMap: Record<string, string> = {
  // MERGED code → LOOKUP code
  'CSH': 'smo',     // Common Smoothhound
  'wrc': 'WRU',     // Cuckoo Wrasse
  'mug': 'mul',     // Grey Mullet
  'sqc': 'sqd',     // Common Squid
  'rjc': 'RJC',     // Thornback Ray (case)
  'RUN': 'RJU',     // Undulate Ray
  'SSH': 'SHO',     // Starry Smoothhound
  'pok': 'sai',     // Saithe
  'san': 'sae',     // Sand Eel
  'lta': 'fry',     // Little Tunny
  'sba': 'sbg',     // Sea Bream (Dorada) → Gilthead Seabream (DUPLICATE - same species Sparus aurata)
  'wra': 'WRA',     // Wrasse (various) - case mismatch
};

// Load the three data sources
const fishbaseScraped = JSON.parse(fs.readFileSync('ENVIRONMENTAL_DATA_FISHBASE_SCRAPED.json', 'utf8')) as any[];
const manualTemperature = JSON.parse(fs.readFileSync('TEMPERATURE_MANUAL_LOOKUP.json', 'utf8')) as any[];
const mergedData = JSON.parse(fs.readFileSync('ENVIRONMENTAL_DATA_MERGED.json', 'utf8')) as any[];

console.log('🔄 Merging Temperature Data...\n');
console.log('📋 Species Code Mapping:');
Object.entries(speciesCodeMap).forEach(([merged, lookup]) => {
  console.log(`   ${merged} → ${lookup}`);
});
console.log('');

// Create lookup maps with code mapping support
const fishbaseMap = new Map();
fishbaseScraped.forEach((item: any) => {
  fishbaseMap.set(item.species_code, item);
  // Also add reverse mapping if this code is in our map
  const reverseKey = Object.entries(speciesCodeMap).find(([_, v]) => v === item.species_code)?.[0];
  if (reverseKey) {
    fishbaseMap.set(reverseKey, item);
  }
});

const manualMap = new Map();
manualTemperature.forEach((item: any) => {
  manualMap.set(item.species_code, item);
  // Also add reverse mapping if this code is in our map
  const reverseKey = Object.entries(speciesCodeMap).find(([_, v]) => v === item.species_code)?.[0];
  if (reverseKey) {
    manualMap.set(reverseKey, item);
  }
});

let updatedCount = 0;
let fishbaseSourceCount = 0;
let manualSourceCount = 0;
let substrateEnhanced = 0;

// Update merged data with temperature info
mergedData.forEach((species: any) => {
  const code = species.species_code;
  
  // Try direct match first, then mapped code
  const mappedCode = speciesCodeMap[code] || code;
  const fishbaseData = fishbaseMap.get(code) || fishbaseMap.get(mappedCode);
  const manualData = manualMap.get(code) || manualMap.get(mappedCode);

  // Priority: FishBase scraped (more reliable) > Manual research
  let temperatureSource = null;
  let temperatureData = null;

  if (fishbaseData && fishbaseData.temperature) {
    temperatureData = fishbaseData.temperature;
    temperatureSource = 'fishbase_web_scrape';
    fishbaseSourceCount++;
  } else if (manualData && manualData.temperature) {
    temperatureData = manualData.temperature;
    temperatureSource = 'manual_research_ices';
    manualSourceCount++;
  }

  if (temperatureData) {
    // Add to environmental_preferences
    if (!species.environmental_preferences) {
      species.environmental_preferences = {};
    }

    // Handle both FishBase format (min/max) and Manual format (tolerance_min/tolerance_max)
    species.environmental_preferences.temperature = {
      tolerance_min: temperatureData.tolerance_min ?? temperatureData.min,
      tolerance_max: temperatureData.tolerance_max ?? temperatureData.max,
      optimal_min: temperatureData.optimal_min,
      optimal_max: temperatureData.optimal_max,
      mean: temperatureData.mean,
      unit: 'celsius',
      source: temperatureData.source || temperatureSource
    };

    // Update sources array
    if (!species.sources) {
      species.sources = {};
    }
    if (temperatureSource && !species.sources[temperatureSource]) {
      species.sources[temperatureSource] = true;
    }

    // Add notes if from manual research
    if (temperatureData.notes) {
      if (!species.environmental_preferences.notes) {
        species.environmental_preferences.notes = {};
      }
      species.environmental_preferences.notes.temperature = temperatureData.notes;
    }

    // Update raw_data section
    if (!species.raw_data) {
      species.raw_data = {};
    }
    species.raw_data.temperature_source = temperatureSource;
    species.raw_data.temperature_data = temperatureData;

    // Remove temperature from gaps if present
    if (species.environmental_preferences.gaps) {
      species.environmental_preferences.gaps = species.environmental_preferences.gaps.filter(
        (g: string) => g !== 'temperature'
      );
    }

    // Update data quality
    if (species.data_quality === 'partial' && species.environmental_preferences.gaps?.length === 0) {
      species.data_quality = 'complete';
    }

    updatedCount++;
    const tempMin = temperatureData.tolerance_min ?? temperatureData.min;
    const tempMax = temperatureData.tolerance_max ?? temperatureData.max;
    const optimalInfo = temperatureData.optimal_min ? 
      ` (optimal ${temperatureData.optimal_min}-${temperatureData.optimal_max}°C)` : '';
    console.log(`✅ ${species.name_en.padEnd(30)} - Temp: ${tempMin}-${tempMax}°C${optimalInfo} (${temperatureSource})`);
  } else {
    console.log(`❌ ${species.name_en.padEnd(30)} - NO TEMPERATURE DATA`);
  }

  // Also enhance substrate from FishBase ecology scrape if available
  if (fishbaseData && fishbaseData.substrate && fishbaseData.substrate.length > 0) {
    const existingSubstrate = species.environmental_preferences?.substrate?.preferred || [];
    const newSubstrate = [...new Set([...existingSubstrate, ...fishbaseData.substrate])];
    
    if (newSubstrate.length > existingSubstrate.length) {
      if (!species.environmental_preferences) {
        species.environmental_preferences = {};
      }
      if (!species.environmental_preferences.substrate) {
        species.environmental_preferences.substrate = {};
      }
      species.environmental_preferences.substrate.preferred = newSubstrate;
      
      if (!species.sources) {
        species.sources = {};
      }
      if (!species.sources['fishbase_ecology_web_scrape']) {
        species.sources['fishbase_ecology_web_scrape'] = true;
      }
      
      substrateEnhanced++;
    }
  }

  // Update data_quality scores
  if (species.data_quality) {
    // Temperature completeness
    if (temperatureData) {
      species.data_quality.temperature_completeness = 100;
      species.data_quality.has_optimal_range = !!(temperatureData.optimal_min && temperatureData.optimal_max);
    }

    // Update overall score
    const scores = [
      species.data_quality.temperature_completeness || 0,
      species.data_quality.salinity_completeness || 0,
      species.data_quality.depth_completeness || 0,
      species.data_quality.substrate_completeness || 0
    ];
    species.data_quality.overall_completeness = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
});

// Write updated data
fs.writeFileSync(
  'ENVIRONMENTAL_DATA_COMPLETE.json',
  JSON.stringify(mergedData, null, 2)
);

console.log('\n' + '='.repeat(80));
console.log('📊 MERGE SUMMARY');
console.log('='.repeat(80));
console.log(`Total Species: ${mergedData.length}`);
console.log(`Temperature Data Added: ${updatedCount}/${mergedData.length} (${Math.round(updatedCount/mergedData.length*100)}%)`);
console.log(`  - From FishBase Scrape: ${fishbaseSourceCount}`);
console.log(`  - From Manual Research: ${manualSourceCount}`);
console.log(`Substrate Enhanced: ${substrateEnhanced} species`);
console.log('\n✅ Saved to: ENVIRONMENTAL_DATA_COMPLETE.json');

// Calculate final coverage stats
let tempCount = 0;
let salCount = 0;
let depthCount = 0;
let substrateCount = 0;

mergedData.forEach((species: any) => {
  if (species.environmental_preferences?.temperature) tempCount++;
  if (species.environmental_preferences?.salinity) salCount++;
  if (species.environmental_preferences?.depth) depthCount++;
  if (species.environmental_preferences?.substrate?.preferred?.length > 0) substrateCount++;
});

console.log('\n📈 FINAL COVERAGE:');
console.log(`Temperature: ${tempCount}/${mergedData.length} (${Math.round(tempCount/mergedData.length*100)}%)`);
console.log(`Salinity: ${salCount}/${mergedData.length} (${Math.round(salCount/mergedData.length*100)}%)`);
console.log(`Depth: ${depthCount}/${mergedData.length} (${Math.round(depthCount/mergedData.length*100)}%)`);
console.log(`Substrate: ${substrateCount}/${mergedData.length} (${Math.round(substrateCount/mergedData.length*100)}%)`);

// Identify any species still missing temperature
const missingTemp = mergedData.filter((s: any) => !s.environmental_preferences?.temperature);
if (missingTemp.length > 0) {
  console.log(`\n⚠️  Species still missing temperature (${missingTemp.length}):`);
  missingTemp.forEach((s: any) => {
    console.log(`   - ${s.name_en} (${s.species_code})`);
  });
}
