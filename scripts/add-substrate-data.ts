/**
 * Add substrate data for pelagic and benthic species based on angler knowledge
 */

import fs from 'fs';

// Substrate additions based on angler context
const substrateAdditions: Record<string, { preferred: string[], notes?: string }> = {
  'brs': {
    preferred: ['rock', 'mixed', 'sand'],
    notes: 'Spawning over reefs or rough ground; also patrols mixed patches for shellfish and worms.'
  },
  'gar': {
    preferred: ['mixed', 'sand'],
    notes: 'Pelagic near the surface but usually close to piers, headlands, and sandy bays.'
  },
  'her': {
    preferred: ['mixed', 'sand', 'mud'],
    notes: 'Open-water shoaler, spawning over coarse sand or gravel; feeds mid-water above soft ground.'
  },
  'jod': {
    preferred: ['mixed', 'rock'],
    notes: 'Hunts small fish over reefs, wrecks, or coarse sand edges — ambush predator needing structure.'
  },
  'lta': {
    preferred: ['mixed', 'pelagic'],
    notes: 'Offshore pelagic; inshore hunts around current lines above sandy bays and reefs.'
  },
  'mac': {
    preferred: ['pelagic', 'mixed', 'sand'],
    notes: 'Mid-water shoaler over sandy or mixed seabeds; not substrate-dependent but avoids turbid mud zones.'
  },
  'pil': {
    preferred: ['pelagic', 'mixed', 'sand', 'mud'],
    notes: 'Shoals above soft coastal ground and bays; common near sandy harbours.'
  },
  'spr': {
    preferred: ['pelagic', 'mixed', 'mud', 'sand'],
    notes: 'Feeds over soft ground in bays and estuaries; spawns near muddy seabeds.'
  },
  'cut': {
    preferred: ['sand', 'mixed', 'mud'],
    notes: 'Prefers sand and sand-mud flats for hunting and egg laying; moves to deeper mixed ground in summer.'
  },
  'oct': {
    preferred: ['rock', 'mixed', 'sand'],
    notes: 'Hides in rock holes and reefs; hunts across nearby sand or mixed patches.'
  },
  'sbg': {
    preferred: ['sand', 'mud', 'mixed'],
    notes: 'Coastal lagoons and seagrass beds over sand; juveniles in estuaries.'
  },
  'sai': {
    preferred: ['rock', 'mixed'],
    notes: 'Midwater over rocky ground and wrecks; follows depth contours.'
  },
  'sqc': {
    preferred: ['sand', 'mixed'],
    notes: 'Pelagic but spawns on sandy seabed; egg mops attached to substrate.'
  },
  'wra': {
    preferred: ['rock', 'weed'],
    notes: 'Generic wrasse habitat - rocky reefs with kelp and seaweed cover.'
  }
};

// Load the complete environmental data
const completeData = JSON.parse(
  fs.readFileSync('ENVIRONMENTAL_DATA_COMPLETE.json', 'utf-8')
);

let updatedCount = 0;

console.log('🪨 Adding Substrate Data for Pelagic & Benthic Species\n');
console.log('═'.repeat(80));
console.log('');

// Update substrate for each species
completeData.forEach((species: any) => {
  const code = species.species_code;
  const substrateData = substrateAdditions[code];
  
  if (substrateData) {
    // Get existing substrate if any
    const existingSubstrate = Array.isArray(species.environmental_preferences?.substrate)
      ? species.environmental_preferences.substrate
      : species.environmental_preferences?.substrate?.preferred || [];
    
    // Merge with new substrate data (prioritize new data)
    const mergedSubstrate = [...new Set([...substrateData.preferred, ...existingSubstrate])];
    
    // Update environmental preferences
    if (!species.environmental_preferences) {
      species.environmental_preferences = {};
    }
    
    // Handle both array and object formats
    if (Array.isArray(species.environmental_preferences.substrate)) {
      species.environmental_preferences.substrate = mergedSubstrate;
    } else {
      if (!species.environmental_preferences.substrate) {
        species.environmental_preferences.substrate = {};
      }
      species.environmental_preferences.substrate.preferred = mergedSubstrate;
    }
    
    // Add notes
    if (substrateData.notes) {
      if (!species.environmental_preferences.notes) {
        species.environmental_preferences.notes = {};
      }
      species.environmental_preferences.notes.substrate = substrateData.notes;
    }
    
    // Remove substrate from gaps if present
    if (species.environmental_preferences.gaps) {
      species.environmental_preferences.gaps = species.environmental_preferences.gaps.filter(
        (g: string) => g !== 'substrate'
      );
    }
    
    // Update data quality
    if (species.environmental_preferences.gaps?.length === 0 && species.data_quality === 'partial') {
      species.data_quality = 'complete';
    }
    
    // Update sources
    if (!species.sources) {
      species.sources = {};
    }
    species.sources['angler_substrate'] = true;
    
    updatedCount++;
    console.log(`✅ ${species.name_en.padEnd(35)} - Substrate: ${mergedSubstrate.join(', ')}`);
  }
});

// Save updated data
fs.writeFileSync(
  'ENVIRONMENTAL_DATA_COMPLETE.json',
  JSON.stringify(completeData, null, 2)
);

console.log('');
console.log('═'.repeat(80));
console.log('');
console.log(`✅ Updated ${updatedCount} species with substrate data`);
console.log('✅ Saved to: ENVIRONMENTAL_DATA_COMPLETE.json');
console.log('');

// Calculate final substrate coverage
const withSubstrate = completeData.filter((s: any) => {
  const substrate = s.environmental_preferences?.substrate;
  if (Array.isArray(substrate)) {
    return substrate.length > 0;
  }
  return substrate?.preferred?.length > 0;
}).length;

console.log(`📊 Final Substrate Coverage: ${withSubstrate}/62 (${Math.round(withSubstrate/62*100)}%)`);
console.log('');
