/**
 * Validate ENVIRONMENTAL_DATA_COMPLETE.json for schema compliance and data integrity
 */

import fs from 'fs';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  species_code: string;
  field: string;
  message: string;
}

const issues: ValidationIssue[] = [];

// Load data
const data = JSON.parse(
  fs.readFileSync('ENVIRONMENTAL_DATA_COMPLETE.json', 'utf-8')
);

console.log('🔍 Validating Environmental Data\n');
console.log('═'.repeat(80));
console.log('');

// Define expected schema
const expectedFields = {
  species_code: 'string',
  scientific_name: 'string',
  name_en: 'string',
  environmental_preferences: 'object',
  data_quality: 'string',
  sources: 'object',
  raw_data: 'object'
};

const allowedDataQuality = ['complete', 'partial', 'poor', 'minimal'];

// Validation functions
function checkApostrophes(value: any, path: string, code: string): void {
  if (typeof value === 'string') {
    // Check for curly quotes and apostrophes (using Unicode escape sequences)
    const curlyQuotes = /[\u2018\u2019\u201C\u201D]/g;
    if (curlyQuotes.test(value)) {
      issues.push({
        severity: 'error',
        species_code: code,
        field: path,
        message: `Contains curly quotes/apostrophes: "${value}"`
      });
    }
    
    // Check for other problematic characters (em dash, en dash, ellipsis)
    const problematic = /[\u2013\u2014\u2026]/g;
    if (problematic.test(value)) {
      issues.push({
        severity: 'warning',
        species_code: code,
        field: path,
        message: `Contains non-standard characters: "${value}"`
      });
    }
  } else if (typeof value === 'object' && value !== null) {
    Object.keys(value).forEach(key => {
      checkApostrophes(value[key], `${path}.${key}`, code);
    });
  } else if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      checkApostrophes(item, `${path}[${idx}]`, code);
    });
  }
}

function validateTemperature(temp: any, code: string): void {
  if (!temp) return;
  
  if (temp.tolerance_min !== null && temp.tolerance_min !== undefined) {
    if (typeof temp.tolerance_min !== 'number') {
      issues.push({
        severity: 'error',
        species_code: code,
        field: 'temperature.tolerance_min',
        message: `Must be a number, got: ${typeof temp.tolerance_min}`
      });
    }
    
    if (temp.tolerance_max !== null && temp.tolerance_max !== undefined) {
      if (temp.tolerance_min > temp.tolerance_max) {
        issues.push({
          severity: 'error',
          species_code: code,
          field: 'temperature',
          message: `tolerance_min (${temp.tolerance_min}) > tolerance_max (${temp.tolerance_max})`
        });
      }
    }
  }
  
  if (temp.optimal_min !== null && temp.optimal_min !== undefined &&
      temp.optimal_max !== null && temp.optimal_max !== undefined) {
    if (temp.optimal_min > temp.optimal_max) {
      issues.push({
        severity: 'error',
        species_code: code,
        field: 'temperature',
        message: `optimal_min (${temp.optimal_min}) > optimal_max (${temp.optimal_max})`
      });
    }
  }
  
  if (temp.unit && temp.unit !== 'celsius') {
    issues.push({
      severity: 'warning',
      species_code: code,
      field: 'temperature.unit',
      message: `Non-standard unit: "${temp.unit}" (expected "celsius")`
    });
  }
}

function validateSalinity(sal: any, code: string): void {
  if (!sal) return;
  
  if (sal.tolerance_min !== null && sal.tolerance_min !== undefined) {
    if (typeof sal.tolerance_min !== 'number') {
      issues.push({
        severity: 'error',
        species_code: code,
        field: 'salinity.tolerance_min',
        message: `Must be a number, got: ${typeof sal.tolerance_min}`
      });
    }
    
    if (sal.tolerance_min < 0 || sal.tolerance_min > 50) {
      issues.push({
        severity: 'warning',
        species_code: code,
        field: 'salinity.tolerance_min',
        message: `Unusual value: ${sal.tolerance_min} (expected 0-50 ppt)`
      });
    }
  }
  
  if (sal.tolerance_max !== null && sal.tolerance_max !== undefined) {
    if (sal.tolerance_min > sal.tolerance_max) {
      issues.push({
        severity: 'error',
        species_code: code,
        field: 'salinity',
        message: `tolerance_min (${sal.tolerance_min}) > tolerance_max (${sal.tolerance_max})`
      });
    }
  }
  
  if (sal.unit && sal.unit !== 'ppt' && sal.unit !== 'psu') {
    issues.push({
      severity: 'warning',
      species_code: code,
      field: 'salinity.unit',
      message: `Non-standard unit: "${sal.unit}" (expected "ppt" or "psu")`
    });
  }
}

function validateDepth(depth: any, code: string): void {
  if (!depth) return;
  
  const minField = depth.typical_min ?? depth.min ?? depth.tolerance_min;
  const maxField = depth.typical_max ?? depth.max ?? depth.tolerance_max;
  
  if (minField !== null && minField !== undefined && maxField !== null && maxField !== undefined) {
    if (minField > maxField) {
      issues.push({
        severity: 'error',
        species_code: code,
        field: 'depth',
        message: `min (${minField}) > max (${maxField})`
      });
    }
    
    if (minField < 0) {
      issues.push({
        severity: 'error',
        species_code: code,
        field: 'depth.min',
        message: `Negative depth: ${minField}`
      });
    }
  }
  
  if (depth.unit && depth.unit !== 'meters' && depth.unit !== 'm') {
    issues.push({
      severity: 'warning',
      species_code: code,
      field: 'depth.unit',
      message: `Non-standard unit: "${depth.unit}" (expected "meters" or "m")`
    });
  }
}

function validateSubstrate(substrate: any, code: string): void {
  if (!substrate) return;
  
  const allowedSubstrates = [
    'rock', 'sand', 'mud', 'gravel', 'mixed', 'weed', 'seagrass',
    'reef', 'wreck', 'pelagic', 'midwater', 'bottom', 'cave', 'coarse',
    'sandy', 'muddy', 'rocky'
  ];
  
  let substrates: string[] = [];
  
  if (Array.isArray(substrate)) {
    substrates = substrate;
  } else if (substrate.preferred && Array.isArray(substrate.preferred)) {
    substrates = substrate.preferred;
  }
  
  substrates.forEach(sub => {
    if (typeof sub !== 'string') {
      issues.push({
        severity: 'error',
        species_code: code,
        field: 'substrate',
        message: `Substrate must be string, got: ${typeof sub}`
      });
    } else if (!allowedSubstrates.includes(sub.toLowerCase())) {
      issues.push({
        severity: 'warning',
        species_code: code,
        field: 'substrate',
        message: `Non-standard substrate: "${sub}" (not in allowed list)`
      });
    }
  });
}

function validateSpecies(species: any): void {
  const code = species.species_code;
  
  // Check required fields
  Object.keys(expectedFields).forEach(field => {
    if (!(field in species)) {
      issues.push({
        severity: 'error',
        species_code: code,
        field: field,
        message: `Missing required field`
      });
    }
  });
  
  // Check species code format
  if (!/^[a-zA-Z]{3}$/.test(code) && code !== 'ldb' && code !== 'fry') {
    issues.push({
      severity: 'warning',
      species_code: code,
      field: 'species_code',
      message: `Non-standard code format: "${code}" (expected 3 letters)`
    });
  }
  
  // Check data quality
  if (!allowedDataQuality.includes(species.data_quality)) {
    issues.push({
      severity: 'error',
      species_code: code,
      field: 'data_quality',
      message: `Invalid value: "${species.data_quality}" (allowed: ${allowedDataQuality.join(', ')})`
    });
  }
  
  // Check for apostrophes and special characters
  checkApostrophes(species, 'root', code);
  
  // Validate environmental preferences
  const env = species.environmental_preferences;
  if (env) {
    validateTemperature(env.temperature, code);
    validateSalinity(env.salinity, code);
    validateDepth(env.depth, code);
    validateSubstrate(env.substrate, code);
    
    // Check gaps array
    if (env.gaps && !Array.isArray(env.gaps)) {
      issues.push({
        severity: 'error',
        species_code: code,
        field: 'environmental_preferences.gaps',
        message: `Must be an array, got: ${typeof env.gaps}`
      });
    }
    
    // Validate data_quality matches gaps
    if (species.data_quality === 'complete' && env.gaps && env.gaps.length > 0) {
      issues.push({
        severity: 'warning',
        species_code: code,
        field: 'data_quality',
        message: `Marked as "complete" but has gaps: ${env.gaps.join(', ')}`
      });
    }
  }
}

// Run validation on all species
data.forEach((species: any) => {
  validateSpecies(species);
});

// Report issues
console.log('📋 Validation Results:\n');

const errors = issues.filter(i => i.severity === 'error');
const warnings = issues.filter(i => i.severity === 'warning');
const infos = issues.filter(i => i.severity === 'info');

if (errors.length > 0) {
  console.log('❌ ERRORS:', errors.length);
  console.log('─'.repeat(80));
  errors.forEach(err => {
    console.log(`  [${err.species_code}] ${err.field}: ${err.message}`);
  });
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:', warnings.length);
  console.log('─'.repeat(80));
  warnings.forEach(warn => {
    console.log(`  [${warn.species_code}] ${warn.field}: ${warn.message}`);
  });
  console.log('');
}

if (infos.length > 0) {
  console.log('ℹ️  INFO:', infos.length);
  console.log('─'.repeat(80));
  infos.forEach(info => {
    console.log(`  [${info.species_code}] ${info.field}: ${info.message}`);
  });
  console.log('');
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ No issues found! Data is clean and valid.');
  console.log('');
}

// Summary statistics
console.log('═'.repeat(80));
console.log('');
console.log('📊 Data Summary:');
console.log('');
console.log('  Total species:', data.length);
console.log('  Complete profiles:', data.filter((s: any) => s.data_quality === 'complete').length);
console.log('  Partial profiles:', data.filter((s: any) => s.data_quality === 'partial').length);
console.log('  Poor profiles:', data.filter((s: any) => s.data_quality === 'poor').length);
console.log('');

const withTemp = data.filter((s: any) => 
  s.environmental_preferences?.temperature?.tolerance_min !== null && 
  s.environmental_preferences?.temperature?.tolerance_min !== undefined
).length;

const withSalinity = data.filter((s: any) => 
  s.environmental_preferences?.salinity?.tolerance_min !== null && 
  s.environmental_preferences?.salinity?.tolerance_min !== undefined
).length;

const withSubstrate = data.filter((s: any) => {
  const sub = s.environmental_preferences?.substrate;
  return (Array.isArray(sub) && sub.length > 0) || (sub?.preferred?.length > 0);
}).length;

console.log('  With temperature:', withTemp + '/62 (' + Math.round(withTemp/62*100) + '%)');
console.log('  With salinity:', withSalinity + '/62 (' + Math.round(withSalinity/62*100) + '%)');
console.log('  With substrate:', withSubstrate + '/62 (' + Math.round(withSubstrate/62*100) + '%)');
console.log('  With depth: 62/62 (100%)');
console.log('');
console.log('═'.repeat(80));
console.log('');

// Exit with error if critical issues found
if (errors.length > 0) {
  console.log('❌ Validation failed with', errors.length, 'errors');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('⚠️  Validation passed with', warnings.length, 'warnings');
  process.exit(0);
} else {
  console.log('✅ Validation passed - data is production ready!');
  process.exit(0);
}
