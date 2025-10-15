import fs from 'fs';

// Load the three data sources
const fishbaseScraped = JSON.parse(fs.readFileSync('ENVIRONMENTAL_DATA_FISHBASE_SCRAPED.json', 'utf8')) as any[];
const manualTemperature = JSON.parse(fs.readFileSync('TEMPERATURE_MANUAL_LOOKUP.json', 'utf8')) as any[];
const mergedData = JSON.parse(fs.readFileSync('ENVIRONMENTAL_DATA_MERGED.json', 'utf8')) as any[];

console.log('🔍 TEMPERATURE DATA MERGE PREVIEW\n');
console.log('='.repeat(100));

// Create lookup maps
const fishbaseMap = new Map();
fishbaseScraped.forEach((item: any) => {
  fishbaseMap.set(item.species_code, item);
});

const manualMap = new Map();
manualTemperature.forEach((item: any) => {
  manualMap.set(item.species_code, item);
});

// Sample species to preview (mix of different sources)
const sampleCodes = ['cod', 'mac', 'bss', 'wrb', 'had', 'pol', 'pla', 'her', 'fle', 'dab'];

sampleCodes.forEach(code => {
  const species = mergedData.find((s: any) => s.species_code === code);
  if (!species) return;

  const fishbaseData = fishbaseMap.get(code);
  const manualData = manualMap.get(code);

  console.log(`\n📍 ${species.name_en.toUpperCase()} (${species.scientific_name})`);
  console.log('─'.repeat(100));
  
  console.log('\n📦 CURRENT DATA (ENVIRONMENTAL_DATA_MERGED.json):');
  console.log(`   Temperature: ${species.environmental_preferences?.temperature ? 
    `${species.environmental_preferences.temperature.tolerance_min}-${species.environmental_preferences.temperature.tolerance_max}°C` : 
    '❌ MISSING'}`);
  console.log(`   Salinity: ${species.environmental_preferences?.salinity ? 
    `${species.environmental_preferences.salinity.min}-${species.environmental_preferences.salinity.max} ppt` : 
    '❌ MISSING'}`);
  console.log(`   Depth: ${species.environmental_preferences?.depth ? 
    `${species.environmental_preferences.depth.min}-${species.environmental_preferences.depth.max}m` : 
    '❌ MISSING'}`);
  console.log(`   Substrate: ${species.environmental_preferences?.substrate?.preferred?.join(', ') || '❌ MISSING'}`);

  console.log('\n🌐 FISHBASE WEB SCRAPE:');
  if (fishbaseData?.temperature) {
    console.log(`   ✅ Temperature: ${fishbaseData.temperature.tolerance_min}-${fishbaseData.temperature.tolerance_max}°C`);
    if (fishbaseData.temperature.optimal_min) {
      console.log(`      Optimal: ${fishbaseData.temperature.optimal_min}-${fishbaseData.temperature.optimal_max}°C`);
    }
    if (fishbaseData.temperature.mean) {
      console.log(`      Mean: ${fishbaseData.temperature.mean}°C`);
    }
  } else {
    console.log(`   ❌ No temperature data`);
  }
  if (fishbaseData?.substrate && fishbaseData.substrate.length > 0) {
    console.log(`   ✅ Substrate: ${fishbaseData.substrate.join(', ')}`);
  }

  console.log('\n📚 MANUAL RESEARCH (ICES/Marine Biology):');
  if (manualData?.temperature) {
    console.log(`   ✅ Temperature: ${manualData.temperature.tolerance_min}-${manualData.temperature.tolerance_max}°C`);
    if (manualData.temperature.optimal_min) {
      console.log(`      Optimal: ${manualData.temperature.optimal_min}-${manualData.temperature.optimal_max}°C (mean: ${manualData.temperature.mean}°C)`);
    }
    console.log(`   📖 Source: ${manualData.temperature.source}`);
    console.log(`   📝 Notes: ${manualData.temperature.notes}`);
  } else {
    console.log(`   ❌ No temperature data`);
  }

  console.log('\n➡️  WILL USE:');
  if (fishbaseData?.temperature) {
    console.log(`   🎯 FishBase Web Scrape (priority source)`);
    console.log(`   Temperature: ${fishbaseData.temperature.tolerance_min}-${fishbaseData.temperature.tolerance_max}°C`);
  } else if (manualData?.temperature) {
    console.log(`   🎯 Manual Research (fallback)`);
    console.log(`   Temperature: ${manualData.temperature.tolerance_min}-${manualData.temperature.tolerance_max}°C`);
    console.log(`   Optimal: ${manualData.temperature.optimal_min}-${manualData.temperature.optimal_max}°C`);
  } else {
    console.log(`   ⚠️  NO TEMPERATURE DATA AVAILABLE`);
  }

  console.log('\n' + '='.repeat(100));
});

// Summary statistics
console.log('\n\n📊 OVERALL STATISTICS:\n');

let fishbaseCount = 0;
let manualCount = 0;
let totalCount = 0;

mergedData.forEach((species: any) => {
  const code = species.species_code;
  const fishbaseData = fishbaseMap.get(code);
  const manualData = manualMap.get(code);

  if (fishbaseData?.temperature) {
    fishbaseCount++;
    totalCount++;
  } else if (manualData?.temperature) {
    manualCount++;
    totalCount++;
  }
});

console.log(`Total Species: ${mergedData.length}`);
console.log(`Temperature Coverage After Merge: ${totalCount}/${mergedData.length} (${Math.round(totalCount/mergedData.length*100)}%)`);
console.log(`  - From FishBase Scrape: ${fishbaseCount} (${Math.round(fishbaseCount/mergedData.length*100)}%)`);
console.log(`  - From Manual Research: ${manualCount} (${Math.round(manualCount/mergedData.length*100)}%)`);
console.log(`\nCoverage Breakdown:`);
console.log(`  🌐 FishBase Web: ${fishbaseCount} species`);
console.log(`  📚 ICES/Manual: ${manualCount} species`);
console.log(`  ❌ Still Missing: ${mergedData.length - totalCount} species\n`);

if (mergedData.length - totalCount > 0) {
  const missing = mergedData
    .filter((s: any) => {
      const fishbaseData = fishbaseMap.get(s.species_code);
      const manualData = manualMap.get(s.species_code);
      return !fishbaseData?.temperature && !manualData?.temperature;
    })
    .map((s: any) => s.name_en);
  
  console.log(`⚠️  Species still missing temperature:\n   ${missing.join(', ')}\n`);
}
