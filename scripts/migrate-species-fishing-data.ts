#!/usr/bin/env tsx
/**
 * Migrate Species Fishing Data - Phase 1
 *
 * Populates the new structured fields in the species table from speciesAdviceData.json:
 * - recommended_baits: TEXT[] (matches COMMON_BAITS from baitHabitatOptions.ts)
 * - preferred_habitats: TEXT[] (matches HABITAT_OPTIONS)
 * - effective_techniques: TEXT[] (matches fishing_techniques.code)
 * - best_times: TEXT[] (dawn, dusk, night, flooding_tide, etc.)
 *
 * Run: npm run env:sync && npm run migrate:species-data
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.cli
config({ path: path.join(process.cwd(), '.env.cli') });

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.error('Run: npm run env:sync first to sync .env.local to .env.cli');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Load JSON data
const jsonPath = path.join(process.cwd(), 'data', 'speciesAdviceData.json');
const speciesAdviceData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// Mapping from JSON bait names to COMMON_BAITS values (without emojis)
const BAIT_MAPPING: Record<string, string> = {
  // Worms category
  'lugworm': 'Worms',
  'ragworm': 'Worms',
  'worms': 'Worms',
  'lug': 'Worms',
  'rag': 'Worms',
  'sandworm': 'Worms',
  'bloodworm': 'Worms',

  // Crab category
  'crab': 'Crab',
  'peeler crab': 'Crab',
  'soft crab': 'Crab',
  'hermit crab': 'Crab',

  // Squid category
  'squid': 'Squid',

  // Fish baits category
  'fish strips': 'Fish baits',
  'mackerel': 'Fish baits',
  'sandeel': 'Fish baits',
  'herring': 'Fish baits',
  'sprat': 'Fish baits',
  'pilchard': 'Fish baits',
  'fish': 'Fish baits',
  'sandeels': 'Fish baits',
  'joey': 'Fish baits',

  // Shellfish category
  'shellfish': 'Shellfish',
  'mussel': 'Shellfish',
  'razor clam': 'Shellfish',
  'clam': 'Shellfish',
  'cockle': 'Shellfish',
  'limpet': 'Shellfish',

  // Prawns category
  'prawn': 'Prawns',
  'prawns': 'Prawns',
  'shrimp': 'Prawns',

  // Bread category
  'bread': 'Bread',

  // Feather rigs category
  'feather rigs': 'Feather rigs',
  'feathers': 'Feather rigs',
  'hokkai': 'Feather rigs',

  // Spinners category
  'spinners': 'Spinners',
  'spoons': 'Spinners',

  // Soft plastics category
  'soft plastics': 'Soft plastics',
  'soft lures': 'Soft plastics',
  'jelly worms': 'Soft plastics',
  'shads': 'Soft plastics',

  // Egis category
  'egis': 'Egis',
  'egi': 'Egis',
  'squid jigs': 'Egis',

  // Surface lures category
  'surface lures': 'Surface lures',
  'poppers': 'Surface lures',
  'stick baits': 'Surface lures',

  // Artificial baits category
  'artificial baits': 'Artificial baits',
  'plastics': 'Artificial baits',
  'lures': 'Artificial baits',
};

// Keywords to detect habitats from description text
const HABITAT_KEYWORDS: Record<string, string[]> = {
  'rocky_shore': ['rock', 'rocks', 'rocky', 'boulder', 'cliff', 'headland', 'kelp', 'reef', 'gully'],
  'sandy_beach': ['sand', 'sandy', 'beach', 'surf'],
  'pier_harbor': ['pier', 'harbor', 'harbour', 'jetty', 'marina', 'dock', 'quay'],
  'estuary': ['estuary', 'river mouth', 'tidal creek', 'brackish'],
  'shallow_water': ['shallow', 'inshore', 'nearshore', '0–5 m', '5–10 m', '2–15 m'],
  'deep_water': ['deep', 'offshore', '20–50m', '50+ m', '30+ m'],
  'wreck_reef': ['wreck', 'wrecks', 'reef', 'reefs', 'artificial reef', 'structure'],
  'open_sea': ['open sea', 'pelagic', 'blue water', 'oceanic'],
};

// Keywords to detect techniques from description text
const TECHNIQUE_KEYWORDS: Record<string, string[]> = {
  'bottom_fishing': ['bottom', 'ledger', 'ledgering', 'groundbait', 'paternoster'],
  'float_fishing': ['float', 'floats', 'sliding float', 'waggler'],
  'spinning': ['spin', 'spinning', 'lure', 'lures', 'casting', 'hard lures', 'plugs'],
  'trolling': ['troll', 'trolling'],
  'jigging': ['jig', 'jigging', 'vertical jig', 'speed jig', 'slow-pitch'],
  'drifting': ['drift', 'drifting', 'live bait'],
  'fly_fishing': ['fly', 'fly fishing', 'fly-fishing'],
  'surfcasting': ['surf', 'surfcasting', 'surf casting', 'beach casting'],
  'feathering': ['feather', 'feathering', 'hokkai'],
  'pier_fishing': ['pier fishing'],
  'chumming': ['chum', 'chumming', 'ground-bait', 'berley'],
};

// Keywords to detect best times from text
const TIME_KEYWORDS: Record<string, string[]> = {
  'dawn': ['dawn', 'sunrise', 'early morning', 'first light'],
  'dusk': ['dusk', 'sunset', 'twilight', 'last light'],
  'night': ['night', 'nocturnal', 'after dark', 'darkness'],
  'day': ['day', 'daylight', 'daytime'],
  'flooding_tide': ['flood', 'flooding', 'incoming', 'rising tide'],
  'ebbing_tide': ['ebb', 'ebbing', 'outgoing', 'falling tide'],
  'slack_water': ['slack', 'slack water', 'turn of tide'],
  'spring_tides': ['spring tide', 'big tide', 'spring tides'],
  'neap_tides': ['neap', 'neap tide', 'small tide'],
};

function extractBaits(favouriteBaits: string): string[] {
  if (!favouriteBaits) return [];

  const baitsSet = new Set<string>();
  const rawBaits = favouriteBaits.toLowerCase().split(/[,;/]/).map(b => b.trim());

  for (const rawBait of rawBaits) {
    // Try exact match first
    if (BAIT_MAPPING[rawBait]) {
      baitsSet.add(BAIT_MAPPING[rawBait]);
      continue;
    }

    // Try substring matching
    for (const [key, value] of Object.entries(BAIT_MAPPING)) {
      if (rawBait.includes(key) || key.includes(rawBait)) {
        baitsSet.add(value);
        break;
      }
    }
  }

  return Array.from(baitsSet);
}

function extractHabitats(distance: string, regions?: string): string[] {
  const text = `${distance || ''} ${regions || ''}`.toLowerCase();
  const habitatsSet = new Set<string>();

  for (const [habitat, keywords] of Object.entries(HABITAT_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      habitatsSet.add(habitat);
    }
  }

  return Array.from(habitatsSet);
}

function extractTechniques(description: string, favouriteBaits: string): string[] {
  const text = `${description || ''} ${favouriteBaits || ''}`.toLowerCase();
  const techniquesSet = new Set<string>();

  for (const [technique, keywords] of Object.entries(TECHNIQUE_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      techniquesSet.add(technique);
    }
  }

  return Array.from(techniquesSet);
}

function extractBestTimes(bestTime: string, tideSensitivity: string): string[] {
  const text = `${bestTime || ''} ${tideSensitivity || ''}`.toLowerCase();
  const timesSet = new Set<string>();

  for (const [time, keywords] of Object.entries(TIME_KEYWORDS)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      timesSet.add(time);
    }
  }

  return Array.from(timesSet);
}

async function migrateSpeciesData() {
  console.log('🔄 Migrating species fishing data from JSON to database...\n');
  console.log(`Processing ${speciesAdviceData.length} species from speciesAdviceData.json\n`);

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (const species of speciesAdviceData) {
    const shoreAdvice = species.contexts?.shore;
    const boatAdvice = species.contexts?.boat;

    // Skip if no data
    if (!shoreAdvice && !boatAdvice) {
      console.log(`⏭️  Skipping ${species.name} - no shore or boat context`);
      skippedCount++;
      continue;
    }

    // Extract baits from both contexts
    const shoreBaits = extractBaits(shoreAdvice?.favouriteBaits || '');
    const boatBaits = extractBaits(boatAdvice?.favouriteBaits || '');
    const baits = Array.from(new Set([...shoreBaits, ...boatBaits]));

    // Extract habitats from description and regions
    const shoreHabitats = extractHabitats(
      shoreAdvice?.distance || '',
      shoreAdvice?.regions || ''
    );
    const boatHabitats = extractHabitats(
      boatAdvice?.distance || '',
      boatAdvice?.regions || ''
    );
    const habitats = Array.from(new Set([...shoreHabitats, ...boatHabitats]));

    // Extract techniques from description and baits
    const shoreTechniques = extractTechniques(
      shoreAdvice?.distance || '',
      shoreAdvice?.favouriteBaits || ''
    );
    const boatTechniques = extractTechniques(
      boatAdvice?.distance || '',
      boatAdvice?.favouriteBaits || ''
    );
    const techniques = Array.from(new Set([...shoreTechniques, ...boatTechniques]));

    // Extract best times from bestTime and tideSensitivity
    const shoreTimes = extractBestTimes(
      shoreAdvice?.bestTime || '',
      shoreAdvice?.tideSensitivity || ''
    );
    const boatTimes = extractBestTimes(
      boatAdvice?.bestTime || '',
      boatAdvice?.tideSensitivity || ''
    );
    const times = Array.from(new Set([...shoreTimes, ...boatTimes]));

    // Update database
    const { error } = await supabase
      .from('species')
      .update({
        recommended_baits: baits.length > 0 ? baits : null,
        preferred_habitats: habitats.length > 0 ? habitats : null,
        effective_techniques: techniques.length > 0 ? techniques : null,
        best_times: times.length > 0 ? times : null,
        content_last_reviewed: new Date().toISOString(),
        content_reviewed_by: 'migration-script-phase1'
      })
      .eq('name_en', species.name);

    if (error) {
      console.error(`❌ Failed to update ${species.name}:`, error.message);
      failCount++;
    } else {
      console.log(`✅ Updated ${species.name}`);
      console.log(`   Baits: [${baits.join(', ')}]`);
      console.log(`   Habitats: [${habitats.join(', ')}]`);
      console.log(`   Techniques: [${techniques.join(', ')}]`);
      console.log(`   Times: [${times.join(', ')}]`);
      console.log('');
      successCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Migration complete!');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount} species`);
  console.log(`❌ Failed: ${failCount} species`);
  console.log(`⏭️  Skipped: ${skippedCount} species`);
  console.log('='.repeat(60));

  // Validation query
  console.log('\n📊 Running validation query...\n');

  const { data: validationData, error: validationError } = await supabase
    .from('species')
    .select('name_en, recommended_baits, preferred_habitats, effective_techniques, best_times')
    .not('recommended_baits', 'is', null)
    .limit(5);

  if (validationError) {
    console.error('❌ Validation query failed:', validationError);
  } else {
    console.log('Sample of populated species:');
    console.log(JSON.stringify(validationData, null, 2));
  }

  // Count statistics
  const { count: totalCount } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true });

  const { count: baitsCount } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true })
    .not('recommended_baits', 'is', null);

  const { count: habitatsCount } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true })
    .not('preferred_habitats', 'is', null);

  const { count: techniquesCount } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true })
    .not('effective_techniques', 'is', null);

  console.log('\n' + '='.repeat(60));
  console.log('📈 Coverage Statistics:');
  console.log('='.repeat(60));
  console.log(`Total species: ${totalCount}`);
  console.log(`Species with baits: ${baitsCount} (${Math.round((baitsCount! / totalCount!) * 100)}%)`);
  console.log(`Species with habitats: ${habitatsCount} (${Math.round((habitatsCount! / totalCount!) * 100)}%)`);
  console.log(`Species with techniques: ${techniquesCount} (${Math.round((techniquesCount! / totalCount!) * 100)}%)`);
  console.log('='.repeat(60));
}

// Run migration
migrateSpeciesData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
