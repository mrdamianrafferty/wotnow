import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const s = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function backfillSlugs() {
  // Get all plants without species_slug
  const { data: plants, error: plantsError } = await s
    .from('grow_user_plants')
    .select('id, name, type, species_slug')
    .is('species_slug', null);

  if (plantsError) {
    console.error('Plants error:', plantsError);
    return;
  }

  // Get all species
  const { data: species, error: speciesError } = await s
    .from('plant_species')
    .select('slug, name');

  if (speciesError) {
    console.error('Species error:', speciesError);
    return;
  }

  // Build name -> slug map (lowercase)
  const nameToSlug = new Map<string, string>();
  const slugSet = new Set<string>();
  for (const sp of species) {
    if (sp.name) {
      nameToSlug.set(sp.name.toLowerCase().trim(), sp.slug);
    }
    slugSet.add(sp.slug);
  }

  // Find matches
  const updates: { id: string; name: string; slug: string }[] = [];
  const noMatch: { name: string; type: string }[] = [];

  for (const plant of plants) {
    if (!plant.name) continue;
    const normalizedName = plant.name.toLowerCase().trim();

    let matchedSlug: string | undefined;

    // Direct match by name
    matchedSlug = nameToSlug.get(normalizedName);

    // Check if plant name matches a slug directly (e.g., "Pepper" -> "pepper" slug)
    if (!matchedSlug && slugSet.has(normalizedName)) {
      matchedSlug = normalizedName;
    }

    // Try extracting base name (e.g., "Tomato (slicer)" -> "tomato")
    if (!matchedSlug) {
      const baseName = normalizedName.split(/[\s(\/]/)[0].trim();
      if (baseName !== normalizedName) {
        matchedSlug = nameToSlug.get(baseName);
        // Also check if slug exists directly
        if (!matchedSlug && slugSet.has(baseName)) {
          matchedSlug = baseName;
        }
      }
    }

    // Try with fruit- prefix for fruit trees
    if (!matchedSlug && (plant.type === 'fruit-tree' || plant.type === 'fruit')) {
      const fruitSlug = `fruit-${normalizedName}`;
      if (slugSet.has(fruitSlug)) {
        matchedSlug = fruitSlug;
      }
      // Try base name with fruit- prefix
      if (!matchedSlug) {
        const baseName = normalizedName.split(/[\s(\/]/)[0].trim();
        const fruitBaseSlug = `fruit-${baseName}`;
        if (slugSet.has(fruitBaseSlug)) {
          matchedSlug = fruitBaseSlug;
        }
      }
    }

    // Try with herb- prefix
    if (!matchedSlug && (plant.type === 'herb' || plant.type === 'ornamental')) {
      const herbSlug = `herb-${normalizedName}`;
      if (slugSet.has(herbSlug)) {
        matchedSlug = herbSlug;
      }
    }

    // Try with tree- prefix
    if (!matchedSlug && plant.type === 'tree') {
      const treeSlug = `tree-${normalizedName}`;
      if (slugSet.has(treeSlug)) {
        matchedSlug = treeSlug;
      }
    }

    if (matchedSlug) {
      updates.push({ id: plant.id, name: plant.name, slug: matchedSlug });
    } else {
      noMatch.push({ name: plant.name, type: plant.type || 'unknown' });
    }
  }

  console.log('\n=== Plants that CAN be matched ===');
  console.log(JSON.stringify(updates, null, 2));

  console.log('\n=== Plants with NO match ===');
  console.log(JSON.stringify(noMatch, null, 2));

  console.log('\nMatches:', updates.length, '| No match:', noMatch.length);

  // Ask for confirmation before updating
  if (process.argv.includes('--update')) {
    console.log('\n=== Updating database ===');
    for (const upd of updates) {
      const { error } = await s
        .from('grow_user_plants')
        .update({ species_slug: upd.slug })
        .eq('id', upd.id);

      if (error) {
        console.error(`Failed to update ${upd.name}:`, error.message);
      } else {
        console.log(`✅ Updated ${upd.name} -> ${upd.slug}`);
      }
    }
    console.log('\nDone!');
  } else {
    console.log('\nRun with --update to apply changes');
  }
}

backfillSlugs();
