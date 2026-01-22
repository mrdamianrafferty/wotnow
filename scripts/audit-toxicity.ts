/**
 * Audits plant_species toxicity data for suspicious defaults.
 *
 * Run with: npx tsx --env-file=.env.local scripts/audit-toxicity.ts
 *
 * Flags:
 * - Plants marked safe (0) that are commonly known to be toxic
 * - Plants with toxicity data that should be reviewed
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Known toxic plants that should NOT have 0 toxicity
// This list is curated from common knowledge - expand as needed
const KNOWN_TOXIC_TO_HUMANS: string[] = [
  // Highly toxic
  'foxglove',
  'digitalis',
  'hemlock',
  'monkshood',
  'aconitum',
  'oleander',
  'castor',
  'ricinus',
  'belladonna',
  'nightshade',
  'datura',
  'angels-trumpet',
  'water-hemlock',
  'lily-of-the-valley',
  'yew',
  'taxus',
  'laburnum',
  'golden-chain',
  // Moderately toxic
  'rhubarb', // leaves toxic
  'tomato', // leaves/stems toxic
  'potato', // green parts toxic
  'daffodil',
  'narcissus',
  'tulip', // bulbs toxic
  'hyacinth',
  'iris',
  'wisteria',
  'rhododendron',
  'azalea',
  'hydrangea',
  'holly',
  'mistletoe',
  'poinsettia',
  'elderberry', // raw berries/leaves toxic
  'privet',
];

const KNOWN_TOXIC_TO_PETS: string[] = [
  // Highly toxic to cats/dogs
  'lily', // especially cats
  'tulip',
  'daffodil',
  'narcissus',
  'azalea',
  'rhododendron',
  'oleander',
  'sago-palm',
  'cycad',
  'yew',
  'foxglove',
  'autumn-crocus',
  'colchicum',
  'cyclamen',
  'kalanchoe',
  'amaryllis',
  'chrysanthemum',
  'english-ivy',
  'ivy',
  'hedera',
  'pothos',
  'philodendron',
  'dieffenbachia',
  'peace-lily',
  'spathiphyllum',
  'aloe',
  'onion',
  'garlic',
  'chive',
  'leek',
  'grape',
  'raisin',
  'avocado',
  'macadamia',
  'chocolate', // not a plant but often searched
  'xylitol',
  'tomato', // green parts
  'potato', // green parts
  'rhubarb',
];

interface PlantToxicity {
  slug: string;
  name: string;
  poisonous_to_humans: number | null;
  poisonous_to_pets: number | null;
  poison_effects_to_humans: string | null;
  poison_effects_to_pets: string | null;
}

function matchesKnownToxic(slug: string, name: string, knownList: string[]): boolean {
  const slugLower = slug.toLowerCase();
  const nameLower = name.toLowerCase();

  return knownList.some(toxic => {
    const toxicLower = toxic.toLowerCase();
    return (
      slugLower.includes(toxicLower) ||
      nameLower.includes(toxicLower) ||
      slugLower === toxicLower ||
      nameLower === toxicLower
    );
  });
}

async function main() {
  console.log('=== Plant Toxicity Audit ===\n');

  // Fetch all plants with toxicity data
  const { data: plants, error } = await supabase
    .from('plant_species')
    .select('slug, name, poisonous_to_humans, poisonous_to_pets, poison_effects_to_humans, poison_effects_to_pets')
    .order('name');

  if (error) {
    console.error('Error fetching plants:', error.message);
    process.exit(1);
  }

  if (!plants) {
    console.log('No plants found.');
    return;
  }

  console.log(`Checking ${plants.length} plants...\n`);

  // Track issues
  const humansSuspicious: PlantToxicity[] = [];
  const petsSuspicious: PlantToxicity[] = [];
  const hasHumanToxicity: PlantToxicity[] = [];
  const hasPetToxicity: PlantToxicity[] = [];

  for (const plant of plants as PlantToxicity[]) {
    // Check for suspicious "safe" ratings
    const humanSafe = plant.poisonous_to_humans === 0 || plant.poisonous_to_humans === null;
    const petSafe = plant.poisonous_to_pets === 0 || plant.poisonous_to_pets === null;

    if (humanSafe && matchesKnownToxic(plant.slug, plant.name, KNOWN_TOXIC_TO_HUMANS)) {
      humansSuspicious.push(plant);
    }

    if (petSafe && matchesKnownToxic(plant.slug, plant.name, KNOWN_TOXIC_TO_PETS)) {
      petsSuspicious.push(plant);
    }

    // Track plants with toxicity data
    if (plant.poisonous_to_humans && plant.poisonous_to_humans >= 1) {
      hasHumanToxicity.push(plant);
    }

    if (plant.poisonous_to_pets && plant.poisonous_to_pets >= 1) {
      hasPetToxicity.push(plant);
    }
  }

  // Report findings
  console.log('=== SUSPICIOUS: Marked Safe but Known Toxic ===\n');

  if (humansSuspicious.length > 0) {
    console.log(`🚨 HUMANS - ${humansSuspicious.length} plants may need review:`);
    for (const plant of humansSuspicious) {
      console.log(`   - ${plant.name} (${plant.slug})`);
      console.log(`     Current: poisonous_to_humans = ${plant.poisonous_to_humans ?? 'null'}`);
    }
    console.log('');
  } else {
    console.log('✅ No suspicious human toxicity gaps found.\n');
  }

  if (petsSuspicious.length > 0) {
    console.log(`🚨 PETS - ${petsSuspicious.length} plants may need review:`);
    for (const plant of petsSuspicious) {
      console.log(`   - ${plant.name} (${plant.slug})`);
      console.log(`     Current: poisonous_to_pets = ${plant.poisonous_to_pets ?? 'null'}`);
    }
    console.log('');
  } else {
    console.log('✅ No suspicious pet toxicity gaps found.\n');
  }

  // Statistics
  console.log('=== CURRENT TOXICITY DATA COVERAGE ===\n');
  console.log(`Total plants: ${plants.length}`);
  console.log(`Plants with human toxicity data (≥1): ${hasHumanToxicity.length}`);
  console.log(`Plants with pet toxicity data (≥1): ${hasPetToxicity.length}`);
  console.log('');

  // Show plants with high toxicity for verification
  const highHumanToxicity = hasHumanToxicity.filter(p => (p.poisonous_to_humans ?? 0) >= 3);
  const highPetToxicity = hasPetToxicity.filter(p => (p.poisonous_to_pets ?? 0) >= 3);

  if (highHumanToxicity.length > 0) {
    console.log(`=== HIGH TOXICITY TO HUMANS (≥3) - ${highHumanToxicity.length} plants ===`);
    for (const plant of highHumanToxicity) {
      console.log(`   - ${plant.name}: ${plant.poisonous_to_humans}/5`);
      if (plant.poison_effects_to_humans) {
        console.log(`     Effects: ${plant.poison_effects_to_humans.substring(0, 80)}...`);
      }
    }
    console.log('');
  }

  if (highPetToxicity.length > 0) {
    console.log(`=== HIGH TOXICITY TO PETS (≥3) - ${highPetToxicity.length} plants ===`);
    for (const plant of highPetToxicity) {
      console.log(`   - ${plant.name}: ${plant.poisonous_to_pets}/5`);
      if (plant.poison_effects_to_pets) {
        console.log(`     Effects: ${plant.poison_effects_to_pets.substring(0, 80)}...`);
      }
    }
    console.log('');
  }

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`Suspicious (may need toxicity data added): ${humansSuspicious.length + petsSuspicious.length}`);
  console.log(`Currently tracking toxicity: ${hasHumanToxicity.length} (humans), ${hasPetToxicity.length} (pets)`);

  if (humansSuspicious.length > 0 || petsSuspicious.length > 0) {
    console.log('\n⚠️  Review suspicious plants above and update toxicity ratings if needed.');
    console.log('   Use Supabase dashboard or create a migration to fix.');
  }
}

main().catch(console.error);
