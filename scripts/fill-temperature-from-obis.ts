import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

const OBIS_API = 'https://api.obis.org';

interface TemperatureData {
  p10: number;
  p25: number;
  p75: number;
  p90: number;
}

interface EnvironmentalPreferences {
  temperature?: {
    min: number;
    max: number;
    optimal_min?: number;
    optimal_max?: number;
  };
  salinity?: {
    min: number;
    max: number;
    preferred?: string;
  };
  depth?: {
    min: number;
    max: number;
    common_min?: number;
    common_max?: number;
  };
  substrate?: string[];
}

interface DataQuality {
  temperature: 'high' | 'medium' | 'low' | 'none';
  salinity: 'high' | 'medium' | 'low' | 'none';
  depth: 'high' | 'medium' | 'low' | 'none';
  substrate: 'high' | 'medium' | 'low' | 'none';
}

interface SpeciesData {
  species_id: string;
  common_name: string;
  scientific_name: string;
  environmental_preferences: EnvironmentalPreferences;
  data_quality: DataQuality;
  sources: {
    temperature: string[];
    salinity: string[];
    depth: string[];
    substrate: string[];
  };
  raw_data: {
    fishbase?: any;
    obis?: {
      observation_count: number;
      temperature?: TemperatureData;
      depth?: TemperatureData;
      salinity?: TemperatureData;
    };
    species_table?: any;
  };
}

interface OldSpeciesData {
  species_code: string;
  scientific_name: string;
  name_en: string;
  environmental_preferences: any;
  data_quality: string;
  sources: any;
  raw_data: any;
}

function calculatePercentiles(values: number[]): TemperatureData {
  const sorted = [...values].sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length * 0.10)];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  
  return { p10, p25, p75, p90 };
}

async function fetchOBISTemperature(scientificName: string) {
  try {
    console.log(`    🌊 Fetching from OBIS API...`);
    const resp = await axios.get(`${OBIS_API}/occurrence`, {
      params: {
        scientificname: scientificName,
        fields: 'temperature,depth,salinity',
        size: 1000
      },
      timeout: 15000
    });
    
    if (!resp.data.results || resp.data.results.length === 0) {
      console.log(`    ❌ No OBIS records found`);
      return null;
    }
    
    // Extract temperatures and filter out nulls and invalid values
    const temps = resp.data.results
      .map((r: any) => r.temperature)
      .filter((t: any) => t != null && t > -5 && t < 40);
    
    console.log(`    📊 Found ${resp.data.results.length} observations, ${temps.length} with temperature`);
    
    if (temps.length < 10) {
      console.log(`    ⚠️  Insufficient temperature data (need 10+, got ${temps.length})`);
      return null;
    }
    
    const percentiles = calculatePercentiles(temps);
    console.log(`    ✅ Temperature range: ${percentiles.p10.toFixed(1)}-${percentiles.p90.toFixed(1)}°C`);
    
    return {
      ...percentiles,
      observation_count: resp.data.results.length,
      temperature_count: temps.length
    };
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.log('    ⚠️  OBIS API timeout or network error');
    } else {
      console.log(`    ⚠️  OBIS API error: ${error.message}`);
    }
    return null;
  }
}

async function fillTemperatureFromOBIS() {
  console.log('\n🌡️ TEMPERATURE FILLING FROM OBIS OBSERVATIONS\n');
  console.log('='.repeat(80));

  // Load merged data
  const mergedPath = join(process.cwd(), 'ENVIRONMENTAL_DATA_MERGED.json');
  console.log(`\n📂 Loading: ${mergedPath}`);
  
  const speciesArray: OldSpeciesData[] = JSON.parse(readFileSync(mergedPath, 'utf-8'));
  console.log(`✅ Loaded ${speciesArray.length} species\n`);

  let temperatureFilled = 0;
  let temperatureAlreadyPresent = 0;
  let noOBISData = 0;
  let invalidOBISData = 0;

  const updates: string[] = [];

  // Process each species
  for (let i = 0; i < speciesArray.length; i++) {
    const species = speciesArray[i];
    const num = `[${i + 1}/${speciesArray.length}]`;
    
    console.log(`\n${num} ${species.name_en} (${species.scientific_name})`);
    
    // Check if temperature already exists
    if (species.environmental_preferences.temperature) {
      console.log(`  ✅ Temperature already present`);
      temperatureAlreadyPresent++;
      continue;
    }

    // Try to fetch fresh OBIS temperature data
    const obisTemp = await fetchOBISTemperature(species.scientific_name);
    
    if (!obisTemp) {
      noOBISData++;
      continue;
    }

    // Validate OBIS temperature data
    if (!obisTemp.p10 || !obisTemp.p25 || !obisTemp.p75 || !obisTemp.p90) {
      console.log(`  ⚠️  Invalid OBIS temperature data (missing percentiles)`);
      invalidOBISData++;
      continue;
    }

    // Check for reasonable temperature values (celsius range)
    if (obisTemp.p10 < -5 || obisTemp.p90 > 35) {
      console.log(`  ⚠️  Suspicious temperature range (${obisTemp.p10}-${obisTemp.p90}°C)`);
      invalidOBISData++;
      continue;
    }

    // Fill temperature from OBIS percentiles
    species.environmental_preferences.temperature = {
      min: Math.round(obisTemp.p10 * 10) / 10,
      max: Math.round(obisTemp.p90 * 10) / 10,
      optimal_min: Math.round(obisTemp.p25 * 10) / 10,
      optimal_max: Math.round(obisTemp.p75 * 10) / 10
    };

    // Update sources
    if (!species.sources.obis_temperature) {
      species.sources.obis_temperature = true;
    }

    // Remove temperature from gaps if present
    if (species.environmental_preferences.gaps) {
      species.environmental_preferences.gaps = species.environmental_preferences.gaps.filter((g: string) => g !== 'temperature');
    }

    // Update raw_data with the new OBIS temperature
    if (!species.raw_data.obis) {
      species.raw_data.obis = {};
    }
    species.raw_data.obis.temperature = {
      p10: obisTemp.p10,
      p25: obisTemp.p25,
      p75: obisTemp.p75,
      p90: obisTemp.p90
    };
    species.raw_data.obis.observation_count = obisTemp.observation_count;
    species.raw_data.obis.temperature_count = obisTemp.temperature_count;

    const updateMsg = `${species.name_en}: ${species.environmental_preferences.temperature.min}-${species.environmental_preferences.temperature.max}°C (optimal: ${species.environmental_preferences.temperature.optimal_min}-${species.environmental_preferences.temperature.optimal_max}°C) [${obisTemp.temperature_count}/${obisTemp.observation_count} obs]`;
    console.log(`  ✅ ${updateMsg}`);
    updates.push(updateMsg);
    temperatureFilled++;
    
    // Rate limiting - wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Update coverage stats
  const totalSpecies = speciesArray.length;
  const withTemp = speciesArray.filter(s => s.environmental_preferences.temperature).length;
  const withSalinity = speciesArray.filter(s => s.environmental_preferences.salinity).length;
  const withDepth = speciesArray.filter(s => s.environmental_preferences.depth).length;
  const withSubstrate = speciesArray.filter(s => s.environmental_preferences.substrate && s.environmental_preferences.substrate.length > 0).length;

  const coverage = {
    temperature: `${withTemp}/${totalSpecies} (${Math.round(withTemp / totalSpecies * 100)}%)`,
    salinity: `${withSalinity}/${totalSpecies} (${Math.round(withSalinity / totalSpecies * 100)}%)`,
    depth: `${withDepth}/${totalSpecies} (${Math.round(withDepth / totalSpecies * 100)}%)`,
    substrate: `${withSubstrate}/${totalSpecies} (${Math.round(withSubstrate / totalSpecies * 100)}%)`
  };

  // Save updated data
  const outputPath = join(process.cwd(), 'ENVIRONMENTAL_DATA_WITH_TEMPERATURE.json');
  writeFileSync(outputPath, JSON.stringify(speciesArray, null, 2));
  console.log(`\n✅ Saved to: ${outputPath}`);

  // Generate summary
  const summary = {
    generated_at: new Date().toISOString(),
    operation: 'fill_temperature_from_obis',
    results: {
      temperature_filled: temperatureFilled,
      temperature_already_present: temperatureAlreadyPresent,
      no_obis_data: noOBISData,
      invalid_obis_data: invalidOBISData,
      total_processed: totalSpecies
    },
    coverage_before: {
      temperature: '0/62 (0%)',
      salinity: withSalinity + '/' + totalSpecies,
      depth: withDepth + '/' + totalSpecies,
      substrate: withSubstrate + '/' + totalSpecies
    },
    coverage_after: coverage,
    updates: updates
  };

  const summaryPath = join(process.cwd(), 'TEMPERATURE_FILL_SUMMARY.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`✅ Summary saved to: ${summaryPath}`);

  // Print final report
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 FINAL REPORT\n');
  console.log(`Temperature filled:         ${temperatureFilled} species`);
  console.log(`Temperature already present: ${temperatureAlreadyPresent} species`);
  console.log(`No OBIS data:               ${noOBISData} species`);
  console.log(`Invalid OBIS data:          ${invalidOBISData} species`);
  console.log(`\n📈 COVERAGE AFTER TEMPERATURE FILL:\n`);
  console.log(`Temperature: ${coverage.temperature}`);
  console.log(`Salinity:    ${coverage.salinity}`);
  console.log(`Depth:       ${coverage.depth}`);
  console.log(`Substrate:   ${coverage.substrate}`);
  
  // Calculate overall completeness
  const completeProfiles = speciesArray.filter(s => 
    s.environmental_preferences.temperature &&
    s.environmental_preferences.salinity &&
    s.environmental_preferences.depth &&
    s.environmental_preferences.substrate &&
    s.environmental_preferences.substrate.length > 0
  ).length;
  
  console.log(`\n✅ Complete profiles: ${completeProfiles}/${totalSpecies} (${Math.round(completeProfiles / totalSpecies * 100)}%)`);
  console.log('\n' + '='.repeat(80));

  // List species still missing temperature
  const missingTemp = speciesArray.filter(s => !s.environmental_preferences.temperature);
  if (missingTemp.length > 0) {
    console.log(`\n⚠️ SPECIES STILL MISSING TEMPERATURE (${missingTemp.length}):\n`);
    missingTemp.forEach(s => {
      console.log(`  - ${s.name_en} (${s.scientific_name})`);
    });
  }

  console.log('\n✅ Temperature filling complete!\n');
}

// Run the script
fillTemperatureFromOBIS();

async function main() {
  try {
    await fillTemperatureFromOBIS();

  // Update coverage stats
  const totalSpecies = speciesArray.length;
  const withTemp = speciesArray.filter(s => s.environmental_preferences.temperature).length;
  const withSalinity = speciesArray.filter(s => s.environmental_preferences.salinity).length;
  const withDepth = speciesArray.filter(s => s.environmental_preferences.depth).length;
  const withSubstrate = speciesArray.filter(s => s.environmental_preferences.substrate && s.environmental_preferences.substrate.length > 0).length;

  const coverage = {
    temperature: `${withTemp}/${totalSpecies} (${Math.round(withTemp / totalSpecies * 100)}%)`,
    salinity: `${withSalinity}/${totalSpecies} (${Math.round(withSalinity / totalSpecies * 100)}%)`,
    depth: `${withDepth}/${totalSpecies} (${Math.round(withDepth / totalSpecies * 100)}%)`,
    substrate: `${withSubstrate}/${totalSpecies} (${Math.round(withSubstrate / totalSpecies * 100)}%)`
  };

  // Save updated data
  const outputPath = join(process.cwd(), 'ENVIRONMENTAL_DATA_WITH_TEMPERATURE.json');
  writeFileSync(outputPath, JSON.stringify(speciesArray, null, 2));
  console.log(`\n✅ Saved to: ${outputPath}`);

  // Generate summary
  const summary = {
    generated_at: new Date().toISOString(),
    operation: 'fill_temperature_from_obis',
    results: {
      temperature_filled: temperatureFilled,
      temperature_already_present: temperatureAlreadyPresent,
      no_obis_data: noOBISData,
      invalid_obis_data: invalidOBISData,
      total_processed: totalSpecies
    },
    coverage_before: {
      temperature: '0/62 (0%)',
      salinity: withSalinity + '/' + totalSpecies,
      depth: withDepth + '/' + totalSpecies,
      substrate: withSubstrate + '/' + totalSpecies
    },
    coverage_after: coverage,
    updates: updates
  };

  const summaryPath = join(process.cwd(), 'TEMPERATURE_FILL_SUMMARY.json');
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`✅ Summary saved to: ${summaryPath}`);

  // Print final report
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 FINAL REPORT\n');
  console.log(`Temperature filled:         ${temperatureFilled} species`);
  console.log(`Temperature already present: ${temperatureAlreadyPresent} species`);
  console.log(`No OBIS data:               ${noOBISData} species`);
  console.log(`Invalid OBIS data:          ${invalidOBISData} species`);
  console.log(`\n📈 COVERAGE AFTER TEMPERATURE FILL:\n`);
  console.log(`Temperature: ${coverage.temperature}`);
  console.log(`Salinity:    ${coverage.salinity}`);
  console.log(`Depth:       ${coverage.depth}`);
  console.log(`Substrate:   ${coverage.substrate}`);
  
  // Calculate overall completeness
  const completeProfiles = speciesArray.filter(s => 
    s.environmental_preferences.temperature &&
    s.environmental_preferences.salinity &&
    s.environmental_preferences.depth &&
    s.environmental_preferences.substrate &&
    s.environmental_preferences.substrate.length > 0
  ).length;
  
  console.log(`\n✅ Complete profiles: ${completeProfiles}/${totalSpecies} (${Math.round(completeProfiles / totalSpecies * 100)}%)`);
  console.log('\n' + '='.repeat(80));

  // List species still missing temperature
  const missingTemp = speciesArray.filter(s => !s.environmental_preferences.temperature);
  if (missingTemp.length > 0) {
    console.log(`\n⚠️ SPECIES STILL MISSING TEMPERATURE (${missingTemp.length}):\n`);
    missingTemp.forEach(s => {
      console.log(`  - ${s.name_en} (${s.scientific_name})`);
    });
  }

  console.log('\n✅ Temperature filling complete!\n');
}

// Run the script
fillTemperatureFromOBIS();
