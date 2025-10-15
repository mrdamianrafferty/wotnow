import axios from 'axios';
import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface SpeciesEnvironmentalData {
  species_code: string;
  scientific_name: string;
  name_en: string;
  temperature: {
    tolerance_min: number | null;
    tolerance_max: number | null;
    optimal_min: number | null;
    optimal_max: number | null;
    mean: number | null;
    unit: string;
    source: string;
    notes?: string;
  } | null;
  substrate: string[];
  substrate_source: string | null;
}

async function scrapeFishBaseTemperature(scientificName: string): Promise<any> {
  try {
    const url = `https://www.fishbase.se/summary/${scientificName.replace(' ', '-')}.html`;
    console.log(`  Fetching summary: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const text = $('body').text();
    
    // Extract temperature ranges from text
    let tempRange = null;
    let preferredTemp = null;
    let spawningTemp = null;
    
    // Look for "Temperate; 0°C - 15°C" pattern
    const tempRangeMatch = text.match(/Temperate[;\s]+(-?\d+)°C\s*-\s*(-?\d+)°C/i) ||
                          text.match(/Tropical[;\s]+(-?\d+)°C\s*-\s*(-?\d+)°C/i) ||
                          text.match(/Subtropical[;\s]+(-?\d+)°C\s*-\s*(-?\d+)°C/i);
    
    if (tempRangeMatch) {
      tempRange = {
        min: parseFloat(tempRangeMatch[1]),
        max: parseFloat(tempRangeMatch[2])
      };
    }
    
    // Look for "Preferred temperature"
    const prefTempMatch = text.match(/Preferred temperature[^\d]+(-?\d+\.?\d*)\s*-\s*(-?\d+\.?\d*)[^\d]+mean\s+(-?\d+\.?\d*)/i);
    if (prefTempMatch) {
      preferredTemp = {
        min: parseFloat(prefTempMatch[1]),
        max: parseFloat(prefTempMatch[2]),
        mean: parseFloat(prefTempMatch[3])
      };
    }
    
    // Look for spawning temperature
    const spawnTempMatch = text.match(/spawning[^\d]+(-?\d+)[-–]\s*°?C[^\d]*[-–]\s*(-?\d+)\s*°C/i) ||
                          text.match(/spawn[^\d]+(-?\d+)[-–](\d+)\s*°C/i);
    if (spawnTempMatch) {
      spawningTemp = {
        min: parseFloat(spawnTempMatch[1]),
        max: parseFloat(spawnTempMatch[2])
      };
    }
    
    return {
      tempRange,
      preferredTemp,
      spawningTemp
    };
    
  } catch (error: any) {
    console.log(`  ⚠️  Error: ${error.message}`);
    return null;
  }
}

async function scrapeFishBaseEcology(scientificName: string): Promise<string[]> {
  try {
    const [genus, species] = scientificName.split(' ');
    const url = `https://www.fishbase.se/Ecology/FishEcologySummary.php?GenusName=${genus}&SpeciesName=${species}`;
    console.log(`  Fetching ecology: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const text = $('body').text().toLowerCase();
    
    const substrates: string[] = [];
    
    // Parse substrate information from ecology page
    if (text.includes('rocky') || text.includes('hard bottom')) {
      substrates.push('rock');
    }
    if (text.includes('sand')) {
      substrates.push('sand');
    }
    if (text.includes('mud')) {
      substrates.push('mud');
    }
    if (text.includes('gravel')) {
      substrates.push('mixed');
    }
    if (text.includes('sea grass') || text.includes('seagrass') || text.includes('algae') || text.includes('seaweed')) {
      substrates.push('weed');
    }
    
    return [...new Set(substrates)]; // Remove duplicates
    
  } catch (error: any) {
    console.log(`  ⚠️  Ecology error: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🌡️  Scraping FishBase for Temperature Data\n');
  console.log('='.repeat(80));
  
  // Load species list
  const mergedData = JSON.parse(
    readFileSync(join(process.cwd(), 'ENVIRONMENTAL_DATA_MERGED.json'), 'utf-8')
  );
  
  console.log(`\n📊 Processing ${mergedData.length} species...\n`);
  
  const results: SpeciesEnvironmentalData[] = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < mergedData.length; i++) {
    const sp = mergedData[i];
    const progress = `[${i + 1}/${mergedData.length}]`;
    
    console.log(`${progress} ${sp.name_en} (${sp.scientific_name})`);
    
    //  Scrape temperature data
    const fbData = await scrapeFishBaseTemperature(sp.scientific_name);
    
    // Scrape substrate data from ecology page
    const substrateData = await scrapeFishBaseEcology(sp.scientific_name);
    
    // Combine temperature data intelligently
    let temperatureResult = null;
    if (fbData && (fbData.tempRange || fbData.preferredTemp)) {
      const tolerance_min = fbData.tempRange?.min ?? fbData.preferredTemp?.min ?? null;
      const tolerance_max = fbData.tempRange?.max ?? fbData.preferredTemp?.max ?? null;
      const optimal_min = fbData.preferredTemp?.min ?? fbData.spawningTemp?.min ?? null;
      const optimal_max = fbData.preferredTemp?.max ?? fbData.spawningTemp?.max ?? null;
      const mean = fbData.preferredTemp?.mean ?? null;
      
      temperatureResult = {
        tolerance_min,
        tolerance_max,
        optimal_min,
        optimal_max,
        mean,
        unit: 'celsius',
        source: 'fishbase_web_scrape',
        notes: fbData.spawningTemp ? 'includes_spawning_temp' : undefined
      };
    }
    
    // Merge with existing substrate data from merged file
    const existingSubstrates = sp.environmental_preferences?.substrate || [];
    const combinedSubstrates = [...new Set([...existingSubstrates, ...substrateData])];
    
    results.push({
      species_code: sp.species_code,
      scientific_name: sp.scientific_name,
      name_en: sp.name_en,
      temperature: temperatureResult,
      substrate: combinedSubstrates,
      substrate_source: substrateData.length > 0 ? 'fishbase_ecology_web_scrape' : null
    });
    
    if (temperatureResult) {
      console.log(`  ✅ Temp: ${temperatureResult.tolerance_min}-${temperatureResult.tolerance_max}°C` + 
                 (temperatureResult.mean ? ` (mean: ${temperatureResult.mean}°C)` : ''));
      successCount++;
    } else {
      console.log(`  ❌ No temperature data`);
      failCount++;
    }
    
    if (substrateData.length > 0) {
      console.log(`  ✅ Substrate: ${substrateData.join(', ')}`);
    }
    
    // Rate limiting - 3 seconds between requests to be polite
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Save results
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY:\n');
  console.log(`✅ Success: ${successCount}/${mergedData.length} (${Math.round(successCount/mergedData.length*100)}%)`);
  console.log(`❌ Failed: ${failCount}/${mergedData.length}`);
  
  // Save with both temperature and substrate
  const outputPath = join(process.cwd(), 'ENVIRONMENTAL_DATA_FISHBASE_SCRAPED.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Saved: ${outputPath}`);
  
  // Show species needing manual research
  const missing = results.filter(r => r.temperature === null);
  if (missing.length > 0) {
    console.log(`\n❌ Species needing manual temperature research (${missing.length}):`);
    missing.forEach(sp => console.log(`   - ${sp.name_en}`));
  }
  
  // Show substrate improvements
  const substrateAdded = results.filter(r => r.substrate_source !== null);
  console.log(`\n✅ Species with substrate data from FishBase: ${substrateAdded.length}`);
}

main().catch(console.error);
