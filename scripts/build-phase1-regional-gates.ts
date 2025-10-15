import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SpeciesData {
  species_code: string;
  name_en: string;
  scientific_name: string;
  advice: any;
}

interface RegionalGate {
  species_code: string;
  name_en: string;
  scientific_name: string;
  allowed_zones: string[];
  excluded_zones: string[];
  seasonal_restrictions: Record<string, any>;
  absolute_limits: {
    temperature_min_celsius?: number;
    temperature_max_celsius?: number;
    salinity_min_psu?: number;
    salinity_max_psu?: number;
  };
  notes: string[];
  data_sources: string[];
}

// Mapping of advice regions to biogeographic zones
const REGION_TO_BIOGEO_ZONE_MAP: Record<string, string[]> = {
  // North Atlantic zones
  'North Sea': ['north_sea'],
  'North Atlantic': ['north_atlantic', 'celtic_sea'],
  'Atlantic': ['north_atlantic', 'celtic_sea', 'english_channel', 'bay_of_biscay', 'iberian_atlantic'],
  'Norwegian waters': ['norwegian_sea', 'barents_sea'],
  'Norwegian Sea': ['norwegian_sea'],
  
  // Baltic
  'Baltic': ['baltic'],
  
  // Mediterranean & Southern
  'Mediterranean': ['mediterranean'],
  'Med': ['mediterranean'],
  'Southern Atlantic': ['iberian_atlantic', 'canary_current'],
  'Southern Atlantic (Iberia)': ['iberian_atlantic'],
  'Atlantic Iberia': ['iberian_atlantic'],
  'Bay of Biscay': ['bay_of_biscay'],
  
  // English Channel
  'English Channel': ['english_channel'],
  'Channel': ['english_channel'],
  
  // UK/Ireland specific
  'Celtic/North Sea': ['celtic_sea', 'north_sea'],
  'Atlantic fringes': ['celtic_sea', 'irish_sea'],
  'Wales/Channel/Atlantic surf beaches': ['english_channel', 'celtic_sea', 'irish_sea'],
  
  // Iberian specific
  'SE/SW Europe': ['iberian_atlantic', 'mediterranean'],
  'Iberia/France/UK': ['iberian_atlantic', 'bay_of_biscay', 'english_channel', 'celtic_sea'],
  
  // Broader regions
  'W Europe': ['celtic_sea', 'english_channel', 'bay_of_biscay'],
  'NE Atlantic': ['north_atlantic', 'norwegian_sea'],
  'UK/IE/FR/ES Atlantic coasts': ['celtic_sea', 'english_channel', 'bay_of_biscay', 'iberian_atlantic'],
  
  // Macaronesia
  'Macaronesia fringe': ['canary_current'],
  
  // Generic depth/habitat descriptions (keep species active in their known zones)
  'Inshore': [], // Will inherit from other regions mentioned
  'Offshore': [],
  'Coastal': [],
  'Nearshore': [],
};

// All known biogeographic zones in our system
const ALL_BIOGEO_ZONES = [
  'north_sea',
  'baltic',
  'norwegian_sea',
  'barents_sea',
  'north_atlantic',
  'celtic_sea',
  'irish_sea',
  'english_channel',
  'bay_of_biscay',
  'iberian_atlantic',
  'mediterranean',
  'black_sea',
  'canary_current',
];

// Expert corrections from POC (hard-coded known limits)
const EXPERT_GATES: Record<string, Partial<RegionalGate>> = {
  'cod': {
    excluded_zones: ['mediterranean', 'black_sea', 'canary_current'],
    absolute_limits: {
      temperature_max_celsius: 20,
      salinity_min_psu: 11, // Baltic spawning limit
    },
    notes: [
      'Cannot survive sustained temperatures above 20°C',
      'Baltic populations need ≥11 PSU salinity to successfully spawn',
      'Cold-water species, absent from Mediterranean'
    ]
  },
  'pollack': {
    excluded_zones: ['mediterranean', 'black_sea'],
    notes: [
      'Not present in Mediterranean (expert correction)',
      'Atlantic and North Sea species only'
    ]
  },
  'sea-bass': {
    seasonal_restrictions: {
      'north_sea': {
        allowed_months: [6, 7, 8, 9, 10],
        reason: 'Summer migrant, arrives with warming water (≥12-13°C)'
      }
    },
    absolute_limits: {
      temperature_min_celsius: 8,
      temperature_max_celsius: 25,
      salinity_min_psu: 15,
    },
    notes: [
      'Added to North Sea as summer-autumn migrant (expert correction)',
      'Euryhaline, can enter low-salinity estuaries but needs ≥15 PSU',
      'Active feeding requires ≥12-13°C'
    ]
  },
  'plaice': {
    notes: [
      'Present in Iberian Atlantic but rare (will apply dampener in Phase 2)',
      'Prefers colder North Sea/Atlantic waters'
    ]
  },
  'bream': {
    excluded_zones: ['north_sea', 'baltic', 'norwegian_sea', 'barents_sea', 'north_atlantic'],
    absolute_limits: {
      temperature_min_celsius: 10,
      salinity_min_psu: 20,
    },
    notes: [
      'Warm-water Mediterranean species',
      'Cannot tolerate cold North Sea/Baltic conditions',
      'High salinity preference (20+ PSU)'
    ]
  },
  'haddock': {
    excluded_zones: ['mediterranean', 'black_sea', 'canary_current'],
    absolute_limits: {
      temperature_max_celsius: 18,
      salinity_min_psu: 31,
    },
    notes: [
      'Cold-water North Atlantic species',
      'Optimal salinity ≥31-32 PSU (expert correction)',
      'Baltic salinity too low for haddock'
    ]
  },
  'herring': {
    seasonal_restrictions: {
      'norwegian_sea': {
        bonus_months: [6, 7, 8],
        bonus: 0.4,
        reason: 'Summer feeding aggregations'
      }
    },
    absolute_limits: {
      salinity_min_psu: 6,
    },
    notes: [
      'Highly euryhaline (6-38 PSU tolerance)',
      'One of few marine fish that can thrive in Baltic',
      'Norwegian Sea summer feeding bonus (expert correction)'
    ]
  },
  'mackerel': {
    notes: [
      'Wide-ranging pelagic species',
      'Mediterranean populations may be S. colias (chub mackerel) not S. scombrus',
      'Present in all Atlantic zones'
    ]
  },
  'sardine': {
    excluded_zones: ['north_sea', 'baltic', 'norwegian_sea', 'barents_sea'],
    absolute_limits: {
      temperature_min_celsius: 10,
    },
    notes: [
      'Warm-water species',
      'Rare/absent in cold North Sea/Baltic',
      'Thrives in Med and southern Atlantic'
    ]
  },
  'anchovy': {
    excluded_zones: ['baltic', 'norwegian_sea', 'barents_sea'],
    absolute_limits: {
      temperature_min_celsius: 8,
    },
    notes: [
      'Warm-temperate species',
      'Can tolerate down to 8°C but prefers warmer (expert correction)',
      'Absent from coldest northern waters'
    ]
  },
  'turbot': {
    excluded_zones: ['mediterranean'],
    notes: [
      'North Sea and Atlantic flatfish',
      'Rare in Mediterranean'
    ]
  },
  'whiting': {
    excluded_zones: ['mediterranean', 'black_sea'],
    absolute_limits: {
      temperature_max_celsius: 18,
    },
    notes: [
      'Cool-water species',
      'North Atlantic distribution',
      'Less active in warm water'
    ]
  },
  'sole': {
    notes: [
      'Temperate flatfish',
      'Present in Atlantic, North Sea, Mediterranean',
      'Prefers sandy/muddy substrates'
    ]
  }
};

function parseRegionsFromAdvice(species: SpeciesData): string[] {
  const regions = new Set<string>();
  
  if (species.advice?.shore?.regions) {
    const shoreRegions = species.advice.shore.regions.split(',').map((r: string) => r.trim());
    shoreRegions.forEach((r: string) => regions.add(r));
  }
  
  if (species.advice?.boat?.regions) {
    const boatRegions = species.advice.boat.regions.split(',').map((r: string) => r.trim());
    boatRegions.forEach((r: string) => regions.add(r));
  }
  
  return Array.from(regions);
}

function mapRegionsToBiogeographicZones(regions: string[]): string[] {
  const zones = new Set<string>();
  
  for (const region of regions) {
    // Try exact match
    if (REGION_TO_BIOGEO_ZONE_MAP[region]) {
      REGION_TO_BIOGEO_ZONE_MAP[region].forEach(z => zones.add(z));
      continue;
    }
    
    // Try partial matches
    const regionLower = region.toLowerCase();
    
    if (regionLower.includes('north sea')) zones.add('north_sea');
    if (regionLower.includes('baltic')) zones.add('baltic');
    if (regionLower.includes('norwegian')) zones.add('norwegian_sea');
    if (regionLower.includes('barents')) zones.add('barents_sea');
    if (regionLower.includes('atlantic') && regionLower.includes('north')) zones.add('north_atlantic');
    if (regionLower.includes('atlantic') && !regionLower.includes('mediterranean')) {
      zones.add('celtic_sea');
      zones.add('english_channel');
      zones.add('bay_of_biscay');
      zones.add('iberian_atlantic');
    }
    if (regionLower.includes('celtic')) zones.add('celtic_sea');
    if (regionLower.includes('irish')) zones.add('irish_sea');
    if (regionLower.includes('channel')) zones.add('english_channel');
    if (regionLower.includes('biscay')) zones.add('bay_of_biscay');
    if (regionLower.includes('iberia') || regionLower.includes('spain') || regionLower.includes('portugal')) {
      zones.add('iberian_atlantic');
    }
    if (regionLower.includes('mediterranean') || regionLower.includes('med')) zones.add('mediterranean');
    if (regionLower.includes('black sea')) zones.add('black_sea');
  }
  
  return Array.from(zones);
}

function inferExcludedZones(allowedZones: string[], species: SpeciesData): string[] {
  const excluded: string[] = [];
  const allowed = new Set(allowedZones);
  
  // Temperature-based exclusions (infer from regions)
  const hasColdWaterZones = allowedZones.some(z => 
    ['north_sea', 'baltic', 'norwegian_sea', 'barents_sea', 'north_atlantic'].includes(z)
  );
  const hasWarmWaterZones = allowedZones.some(z => 
    ['mediterranean', 'canary_current'].includes(z)
  );
  
  // If species is only in cold zones, likely excluded from warm zones
  if (hasColdWaterZones && !hasWarmWaterZones) {
    if (!allowed.has('mediterranean')) excluded.push('mediterranean');
    if (!allowed.has('black_sea')) excluded.push('black_sea');
  }
  
  // If species is only in warm zones, likely excluded from cold zones
  if (hasWarmWaterZones && !hasColdWaterZones) {
    if (!allowed.has('baltic')) excluded.push('baltic');
    if (!allowed.has('norwegian_sea')) excluded.push('norwegian_sea');
    if (!allowed.has('barents_sea')) excluded.push('barents_sea');
  }
  
  return excluded;
}

function extractTemperatureHints(species: SpeciesData): { min?: number; max?: number } {
  const hints: { min?: number; max?: number } = {};
  
  const tempTexts: string[] = [];
  if (species.advice?.shore?.temperature_effect) {
    tempTexts.push(species.advice.shore.temperature_effect.toLowerCase());
  }
  if (species.advice?.boat?.temperature_effect) {
    tempTexts.push(species.advice.boat.temperature_effect.toLowerCase());
  }
  
  const fullText = tempTexts.join(' ');
  
  // Look for explicit temperature mentions
  const tempMatch = fullText.match(/(\d+)[°\s]*c/i);
  if (tempMatch) {
    const temp = parseInt(tempMatch[1]);
    if (fullText.includes('above') || fullText.includes('>')) {
      hints.min = temp;
    } else if (fullText.includes('below') || fullText.includes('<')) {
      hints.max = temp;
    }
  }
  
  // Infer from descriptive text
  if (fullText.includes('cold') || fullText.includes('cool')) {
    hints.max = hints.max || 18;
  }
  if (fullText.includes('warm') || fullText.includes('heat')) {
    hints.min = hints.min || 10;
  }
  
  return hints;
}

async function buildPhase1Gates() {
  console.log('🚪 Building Phase 1 Regional Biogeographic Gates\n');
  console.log('=' .repeat(80));
  
  const { data: allSpecies, error } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name, advice')
    .order('name_en');
  
  if (error) {
    console.error('Error fetching species:', error);
    return;
  }
  
  console.log(`\nProcessing ${allSpecies.length} species...\n`);
  
  const regionalGates: RegionalGate[] = [];
  
  for (const species of allSpecies) {
    console.log(`\n📋 ${species.name_en} (${species.species_code})`);
    console.log('-'.repeat(60));
    
    // Parse regions from advice
    const adviceRegions = parseRegionsFromAdvice(species);
    console.log(`   Advice regions: ${adviceRegions.join(', ') || 'NONE'}`);
    
    // Map to biogeographic zones
    const mappedZones = mapRegionsToBiogeographicZones(adviceRegions);
    console.log(`   Mapped zones: ${mappedZones.join(', ') || 'NONE'}`);
    
    // Apply expert corrections if available
    const expertGate = EXPERT_GATES[species.species_code];
    const allowedZones = expertGate?.allowed_zones || mappedZones;
    const explicitExcluded = expertGate?.excluded_zones || [];
    
    // Infer additional excluded zones
    const inferredExcluded = inferExcludedZones(allowedZones, species);
    const excludedZones = [...new Set([...explicitExcluded, ...inferredExcluded])];
    
    // Extract temperature hints
    const tempHints = extractTemperatureHints(species);
    
    // Build gate object
    const gate: RegionalGate = {
      species_code: species.species_code,
      name_en: species.name_en,
      scientific_name: species.scientific_name,
      allowed_zones: allowedZones.length > 0 ? allowedZones : ['NEEDS_RESEARCH'],
      excluded_zones: excludedZones,
      seasonal_restrictions: expertGate?.seasonal_restrictions || {},
      absolute_limits: {
        ...tempHints,
        ...expertGate?.absolute_limits,
      },
      notes: expertGate?.notes || [],
      data_sources: ['advice.regions', 'expert_corrections'],
    };
    
    // Add source note
    if (allowedZones.length === 0) {
      gate.notes.push('⚠️ No regional data found - needs research');
    }
    if (expertGate) {
      gate.notes.push('✅ Expert corrections applied');
    }
    
    regionalGates.push(gate);
    
    // Print summary
    console.log(`   ✅ Allowed: ${gate.allowed_zones.join(', ')}`);
    if (gate.excluded_zones.length > 0) {
      console.log(`   ❌ Excluded: ${gate.excluded_zones.join(', ')}`);
    }
    if (Object.keys(gate.seasonal_restrictions).length > 0) {
      console.log(`   📅 Seasonal restrictions: ${JSON.stringify(gate.seasonal_restrictions)}`);
    }
    if (Object.keys(gate.absolute_limits).length > 0) {
      console.log(`   🌡️ Absolute limits: ${JSON.stringify(gate.absolute_limits)}`);
    }
  }
  
  // Save to JSON
  const outputData = {
    created_date: new Date().toISOString(),
    total_species: allSpecies.length,
    metadata: {
      all_biogeographic_zones: ALL_BIOGEO_ZONES,
      zone_descriptions: {
        north_sea: 'North Sea (temperate, 30-35 PSU)',
        baltic: 'Baltic Sea (brackish, 6-20 PSU)',
        norwegian_sea: 'Norwegian Sea (cold, 30-35 PSU)',
        barents_sea: 'Barents Sea (very cold, 30-35 PSU)',
        north_atlantic: 'North Atlantic (cool-temperate, 32-36 PSU)',
        celtic_sea: 'Celtic Sea (temperate, 32-36 PSU)',
        irish_sea: 'Irish Sea (temperate, 32-35 PSU)',
        english_channel: 'English Channel (temperate, 32-35 PSU)',
        bay_of_biscay: 'Bay of Biscay (temperate, 32-36 PSU)',
        iberian_atlantic: 'Iberian Atlantic (warm-temperate, 32-37 PSU)',
        mediterranean: 'Mediterranean Sea (warm, 36-39 PSU)',
        black_sea: 'Black Sea (brackish, 17-18 PSU)',
        canary_current: 'Canary Current (subtropical, 35-37 PSU)',
      }
    },
    regional_gates: regionalGates,
  };
  
  const outputPath = 'SPECIES_PHASE1_REGIONAL_GATES.json';
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  console.log('\n' + '=' .repeat(80));
  console.log(`✅ Phase 1 gates saved to ${outputPath}\n`);
  
  // Print statistics
  const withData = regionalGates.filter(g => !g.allowed_zones.includes('NEEDS_RESEARCH'));
  const needsResearch = regionalGates.filter(g => g.allowed_zones.includes('NEEDS_RESEARCH'));
  const withExclusions = regionalGates.filter(g => g.excluded_zones.length > 0);
  const withSeasonalRestrictions = regionalGates.filter(g => 
    Object.keys(g.seasonal_restrictions).length > 0
  );
  const withAbsoluteLimits = regionalGates.filter(g => 
    Object.keys(g.absolute_limits).length > 0
  );
  
  console.log('📊 Statistics:\n');
  console.log(`   Total species: ${allSpecies.length}`);
  console.log(`   ✅ With regional data: ${withData.length}`);
  console.log(`   🔴 Needs research: ${needsResearch.length}`);
  console.log(`   ❌ With exclusions: ${withExclusions.length}`);
  console.log(`   📅 With seasonal restrictions: ${withSeasonalRestrictions.length}`);
  console.log(`   🌡️ With absolute limits: ${withAbsoluteLimits.length}`);
  
  // Zone coverage analysis
  console.log('\n📍 Zone Coverage Analysis:\n');
  const zoneCounts: Record<string, number> = {};
  ALL_BIOGEO_ZONES.forEach(z => zoneCounts[z] = 0);
  
  for (const gate of regionalGates) {
    gate.allowed_zones.forEach(z => {
      if (z !== 'NEEDS_RESEARCH') {
        zoneCounts[z] = (zoneCounts[z] || 0) + 1;
      }
    });
  }
  
  const sortedZones = Object.entries(zoneCounts)
    .sort(([, a], [, b]) => b - a);
  
  for (const [zone, count] of sortedZones) {
    const bar = '█'.repeat(Math.floor(count / 3));
    console.log(`   ${zone.padEnd(20)} ${count.toString().padStart(3)} ${bar}`);
  }
  
  // Species needing research
  if (needsResearch.length > 0) {
    console.log('\n⚠️ Species needing regional research:\n');
    needsResearch.forEach(g => {
      console.log(`   - ${g.name_en} (${g.species_code})`);
    });
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('🎯 Next Steps:\n');
  console.log('1. Review SPECIES_PHASE1_REGIONAL_GATES.json');
  console.log('2. Verify regional mappings are accurate');
  console.log('3. Add missing absolute limits (temp/salinity) for species');
  console.log('4. Research species marked as NEEDS_RESEARCH');
  console.log('5. Proceed to Phase 2 environmental parameter research\n');
}

buildPhase1Gates()
  .then(() => {
    console.log('✅ Phase 1 gate building complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
