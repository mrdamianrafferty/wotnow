/**
 * Generate comprehensive CSV audit of all species data
 * Combines: Environmental (temp, salinity, depth, substrate), Bio bands, Location data
 */

import * as fs from 'fs';
import * as path from 'path';

interface SpeciesData {
  species_code: string;
  scientific_name: string;
  name_en: string;
  // Environmental
  temp_min?: number;
  temp_max?: number;
  temp_optimal_min?: number;
  temp_optimal_max?: number;
  temp_mean?: number;
  temp_source?: string;
  salinity_min?: number;
  salinity_max?: number;
  salinity_source?: string;
  depth_min?: number;
  depth_max?: number;
  depth_source?: string;
  substrate?: string;
  substrate_source?: string;
  // Bio bands
  bio_band_uk?: string;
  bio_band_med?: string;
  bio_band_nordic?: string;
  // Location
  regional_gates?: string;
  // Notes
  temp_notes?: string;
  data_completeness?: number;
}

// Load all data sources
const environmentalMerged = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'ENVIRONMENTAL_DATA_COMPLETE.json'), 'utf-8')
);

const fishbaseScrape = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'ENVIRONMENTAL_DATA_FISHBASE_SCRAPED.json'), 'utf-8')
);

const manualTemperature = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'TEMPERATURE_MANUAL_LOOKUP.json'), 'utf-8')
);

// Try to load bio bands if it exists
let bioBands: any[] = [];
try {
  bioBands = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'BIO_BANDS_LOOKUP.json'), 'utf-8')
  );
} catch (e) {
  console.log('⚠️  BIO_BANDS_LOOKUP.json not found, will skip bio band data');
}

// Build comprehensive dataset
const allSpecies: SpeciesData[] = environmentalMerged.map((species: any) => {
  const speciesCode = species.species_code;
  
  // Find in other sources
  const scraped = fishbaseScrape.find((s: any) => s.species_code === speciesCode);
  const manual = manualTemperature.find((s: any) => s.species_code === speciesCode);
  const bio = bioBands.find((s: any) => s.species_code === speciesCode);
  
  // Temperature - use from environmental_preferences (already merged)
  let tempData: any = {};
  if (species.environmental_preferences?.temperature) {
    const temp = species.environmental_preferences.temperature;
    tempData = {
      temp_min: temp.tolerance_min,
      temp_max: temp.tolerance_max,
      temp_optimal_min: temp.optimal_min,
      temp_optimal_max: temp.optimal_max,
      temp_mean: temp.mean,
      temp_source: temp.source,
      temp_notes: species.environmental_preferences.notes?.temperature,
    };
  }
  
  // Substrate - use from environmental_preferences
  let substrate = '';
  let substrateSource = '';
  if (species.environmental_preferences?.substrate) {
    if (Array.isArray(species.environmental_preferences.substrate)) {
      substrate = species.environmental_preferences.substrate.join(', ');
    } else if (species.environmental_preferences.substrate.preferred) {
      substrate = species.environmental_preferences.substrate.preferred.join(', ');
    }
    substrateSource = 'environmental_preferences';
  }
  
  // Calculate completeness score
  let completeness = 0;
  if (tempData.temp_min !== undefined) completeness += 25;
  if (species.environmental_preferences?.salinity?.optimal_min !== undefined) completeness += 25;
  if (species.environmental_preferences?.depth?.typical_min !== undefined) completeness += 25;
  if (substrate) completeness += 25;
  
  return {
    species_code: speciesCode,
    scientific_name: species.scientific_name || manual?.scientific_name || '',
    name_en: species.name_en || manual?.name_en || '',
    
    // Environmental
    temp_min: tempData.temp_min,
    temp_max: tempData.temp_max,
    temp_optimal_min: tempData.temp_optimal_min,
    temp_optimal_max: tempData.temp_optimal_max,
    temp_mean: tempData.temp_mean,
    temp_source: tempData.temp_source,
    temp_notes: tempData.temp_notes,
    
    salinity_min: species.environmental_preferences?.salinity?.tolerance_min,
    salinity_max: species.environmental_preferences?.salinity?.tolerance_max,
    salinity_source: species.environmental_preferences?.salinity?.source,
    
    depth_min: species.environmental_preferences?.depth?.typical_min,
    depth_max: species.environmental_preferences?.depth?.typical_max,
    depth_source: species.environmental_preferences?.depth?.source,
    
    substrate: substrate,
    substrate_source: substrateSource,
    
    // Bio bands
    bio_band_uk: bio?.bio_band_uk,
    bio_band_med: bio?.bio_band_med,
    bio_band_nordic: bio?.bio_band_nordic,
    
    // Regional gates (derived from bio bands)
    regional_gates: bio ? 
      [bio.bio_band_uk, bio.bio_band_med, bio.bio_band_nordic]
        .filter(b => b && b !== 'absent')
        .join(', ') 
      : '',
    
    data_completeness: completeness,
  };
});

// Sort by completeness (desc) then name
allSpecies.sort((a, b) => {
  if ((b.data_completeness || 0) !== (a.data_completeness || 0)) {
    return (b.data_completeness || 0) - (a.data_completeness || 0);
  }
  return (a.name_en || '').localeCompare(b.name_en || '');
});

// Generate CSV
const csvHeaders = [
  'Species Code',
  'Scientific Name',
  'English Name',
  'Completeness %',
  
  // Temperature
  'Temp Min (°C)',
  'Temp Max (°C)',
  'Temp Optimal Min',
  'Temp Optimal Max',
  'Temp Mean',
  'Temp Source',
  
  // Salinity
  'Salinity Min (ppt)',
  'Salinity Max (ppt)',
  'Salinity Source',
  
  // Depth
  'Depth Min (m)',
  'Depth Max (m)',
  'Depth Source',
  
  // Substrate
  'Substrate Types',
  'Substrate Source',
  
  // Bio Bands
  'Bio Band UK',
  'Bio Band Med',
  'Bio Band Nordic',
  'Regional Gates',
  
  // Notes
  'Temperature Notes',
];

function escapeCSV(value: any): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const csvRows = [
  csvHeaders.join(','),
  ...allSpecies.map(s => [
    escapeCSV(s.species_code),
    escapeCSV(s.scientific_name),
    escapeCSV(s.name_en),
    escapeCSV(s.data_completeness),
    
    escapeCSV(s.temp_min),
    escapeCSV(s.temp_max),
    escapeCSV(s.temp_optimal_min),
    escapeCSV(s.temp_optimal_max),
    escapeCSV(s.temp_mean),
    escapeCSV(s.temp_source),
    
    escapeCSV(s.salinity_min),
    escapeCSV(s.salinity_max),
    escapeCSV(s.salinity_source),
    
    escapeCSV(s.depth_min),
    escapeCSV(s.depth_max),
    escapeCSV(s.depth_source),
    
    escapeCSV(s.substrate),
    escapeCSV(s.substrate_source),
    
    escapeCSV(s.bio_band_uk),
    escapeCSV(s.bio_band_med),
    escapeCSV(s.bio_band_nordic),
    escapeCSV(s.regional_gates),
    
    escapeCSV(s.temp_notes),
  ].join(',')),
];

const csvContent = csvRows.join('\n');

// Write CSV
fs.writeFileSync('SPECIES_DATA_AUDIT.csv', csvContent);

// Generate summary report
console.log('\n📊 SPECIES DATA AUDIT - COMPREHENSIVE SUMMARY\n');
console.log('═'.repeat(80));

// Completeness breakdown
const complete100 = allSpecies.filter(s => s.data_completeness === 100).length;
const complete75 = allSpecies.filter(s => s.data_completeness === 75).length;
const complete50 = allSpecies.filter(s => s.data_completeness === 50).length;
const complete25 = allSpecies.filter(s => s.data_completeness === 25).length;
const complete0 = allSpecies.filter(s => s.data_completeness === 0).length;

console.log('\n🎯 DATA COMPLETENESS BREAKDOWN:');
console.log(`   100% Complete: ${complete100}/62 species (${Math.round(complete100/62*100)}%)`);
console.log(`    75% Complete: ${complete75}/62 species (${Math.round(complete75/62*100)}%)`);
console.log(`    50% Complete: ${complete50}/62 species (${Math.round(complete50/62*100)}%)`);
console.log(`    25% Complete: ${complete25}/62 species (${Math.round(complete25/62*100)}%)`);
console.log(`     0% Complete: ${complete0}/62 species (${Math.round(complete0/62*100)}%)`);

// Field-by-field coverage
const withTemp = allSpecies.filter(s => s.temp_min !== undefined).length;
const withSalinity = allSpecies.filter(s => s.salinity_min !== undefined).length;
const withDepth = allSpecies.filter(s => s.depth_min !== undefined).length;
const withSubstrate = allSpecies.filter(s => s.substrate).length;
const withBio = allSpecies.filter(s => s.bio_band_uk).length;

console.log('\n📈 FIELD-BY-FIELD COVERAGE:');
console.log(`   Temperature: ${withTemp}/62 (${Math.round(withTemp/62*100)}%)`);
console.log(`   Salinity:    ${withSalinity}/62 (${Math.round(withSalinity/62*100)}%)`);
console.log(`   Depth:       ${withDepth}/62 (${Math.round(withDepth/62*100)}%)`);
console.log(`   Substrate:   ${withSubstrate}/62 (${Math.round(withSubstrate/62*100)}%)`);
console.log(`   Bio Bands:   ${withBio}/62 (${Math.round(withBio/62*100)}%)`);

// Temperature source breakdown
const tempSources = allSpecies
  .filter(s => s.temp_source)
  .reduce((acc: any, s) => {
    const source = s.temp_source || 'Unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

console.log('\n🌡️  TEMPERATURE DATA SOURCES:');
Object.entries(tempSources)
  .sort(([,a]: any, [,b]: any) => b - a)
  .forEach(([source, count]) => {
    console.log(`   ${source}: ${count} species`);
  });

// Species with optimal temperature data
const withOptimal = allSpecies.filter(s => s.temp_optimal_min !== undefined).length;
console.log(`\n   With Optimal Ranges: ${withOptimal}/62 (${Math.round(withOptimal/62*100)}%)`);

// Missing critical data
const missingTemp = allSpecies.filter(s => s.temp_min === undefined);
const missingSalinity = allSpecies.filter(s => s.salinity_min === undefined);
const missingSubstrate = allSpecies.filter(s => !s.substrate);

console.log('\n❌ CRITICAL GAPS:');
if (missingTemp.length > 0) {
  console.log(`\n   Missing Temperature (${missingTemp.length} species):`);
  missingTemp.slice(0, 10).forEach(s => {
    console.log(`      - ${s.name_en} (${s.species_code})`);
  });
  if (missingTemp.length > 10) {
    console.log(`      ... and ${missingTemp.length - 10} more`);
  }
}

if (missingSalinity.length > 0) {
  console.log(`\n   Missing Salinity (${missingSalinity.length} species):`);
  missingSalinity.forEach(s => {
    console.log(`      - ${s.name_en} (${s.species_code})`);
  });
}

if (missingSubstrate.length > 0) {
  console.log(`\n   Missing Substrate (${missingSubstrate.length} species):`);
  missingSubstrate.slice(0, 10).forEach(s => {
    console.log(`      - ${s.name_en} (${s.species_code})`);
  });
  if (missingSubstrate.length > 10) {
    console.log(`      ... and ${missingSubstrate.length - 10} more`);
  }
}

// Top 10 most complete species
console.log('\n✅ TOP 10 MOST COMPLETE SPECIES:');
allSpecies.slice(0, 10).forEach((s, i) => {
  console.log(`   ${i + 1}. ${s.name_en} (${s.species_code}) - ${s.data_completeness}% complete`);
  if (s.temp_min !== undefined) {
    console.log(`      🌡️  Temp: ${s.temp_min}-${s.temp_max}°C ${s.temp_optimal_min ? `(optimal ${s.temp_optimal_min}-${s.temp_optimal_max}°C)` : ''}`);
  }
  if (s.salinity_min !== undefined) {
    console.log(`      🌊 Salinity: ${s.salinity_min}-${s.salinity_max} ppt`);
  }
  if (s.depth_min !== undefined) {
    console.log(`      📏 Depth: ${s.depth_min}-${s.depth_max}m`);
  }
  if (s.substrate) {
    console.log(`      🪨 Substrate: ${s.substrate}`);
  }
});

console.log('\n═'.repeat(80));
console.log('\n✅ CSV generated: SPECIES_DATA_AUDIT.csv');
console.log('   Open in Excel/Numbers to review all species data\n');

// Generate a separate issues report
const issues: string[] = [];

allSpecies.forEach(s => {
  // Check for data quality issues
  if (s.temp_min !== undefined && s.temp_max !== undefined) {
    if (s.temp_min > s.temp_max) {
      issues.push(`⚠️  ${s.name_en}: Temp min (${s.temp_min}) > max (${s.temp_max})`);
    }
    if (s.temp_optimal_min !== undefined && s.temp_optimal_max !== undefined) {
      if (s.temp_optimal_min < s.temp_min || s.temp_optimal_max > s.temp_max) {
        issues.push(`⚠️  ${s.name_en}: Optimal range outside tolerance range`);
      }
    }
  }
  
  if (s.salinity_min !== undefined && s.salinity_max !== undefined) {
    if (s.salinity_min > s.salinity_max) {
      issues.push(`⚠️  ${s.name_en}: Salinity min > max`);
    }
  }
  
  if (s.depth_min !== undefined && s.depth_max !== undefined) {
    if (s.depth_min > s.depth_max) {
      issues.push(`⚠️  ${s.name_en}: Depth min > max`);
    }
  }
  
  // Check for missing critical data
  if ((s.data_completeness || 0) < 50) {
    issues.push(`📊 ${s.name_en}: Only ${s.data_completeness}% complete`);
  }
});

if (issues.length > 0) {
  console.log('\n⚠️  DATA QUALITY ISSUES DETECTED:\n');
  issues.forEach(issue => console.log(`   ${issue}`));
  console.log('');
}
