#!/usr/bin/env npx tsx
/**
 * Update garden_threat table with local Wikimedia Commons images
 * 
 * This script:
 * 1. Updates card_json with local_image info for all threats with downloaded images
 * 2. Replaces Perenual images with Wikimedia Commons images
 * 3. Stores proper attribution information per Wikimedia's requirements
 * 
 * Usage:
 *   npx tsx scripts/update-threat-images.ts
 *   npx tsx scripts/update-threat-images.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Wikimedia Commons image data with proper attribution
// Per Wikimedia's requirements: Author, License, Link to original file
interface WikimediaImage {
  local_path: string;           // Path to local image file
  wikimedia_file: string;       // Original filename on Wikimedia Commons
  wikimedia_url: string;        // URL to Wikimedia Commons file page
  license: string;              // License type (CC BY-SA 3.0, Public Domain, etc.)
  license_url: string;          // URL to license
  author: string;               // Author/photographer name
  source: 'Wikimedia Commons';  // Always Wikimedia Commons
}

// License URLs per Wikimedia Commons standards
const LICENSE_URLS: Record<string, string> = {
  'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/',
  'Public Domain': 'https://en.wikipedia.org/wiki/Public_domain',
  'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
  'CC BY-SA 2.0': 'https://creativecommons.org/licenses/by-sa/2.0/',
  'CC BY-SA 2.5': 'https://creativecommons.org/licenses/by-sa/2.5/',
  'CC BY-SA 3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
};

// All downloaded threat images with full attribution info
const THREAT_IMAGES: Record<string, WikimediaImage> = {
  'aphids': {
    local_path: '/grow/threats/aphids.jpg',
    wikimedia_file: 'Aphids_on_broccoli.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Aphids_on_broccoli.jpg',
    license: 'CC BY-SA 3.0',
    license_url: LICENSE_URLS['CC BY-SA 3.0'],
    author: 'Fir0002',
    source: 'Wikimedia Commons',
  },
  'slugs-snails': {
    local_path: '/grow/threats/slugs-snails.jpg',
    wikimedia_file: 'Limax_maximus.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Limax_maximus.jpg',
    license: 'CC BY-SA 4.0',
    license_url: LICENSE_URLS['CC BY-SA 4.0'],
    author: 'Michal Maňas',
    source: 'Wikimedia Commons',
  },
  'spider-mites': {
    local_path: '/grow/threats/spider-mites.jpg',
    wikimedia_file: 'Tetranychus_urticae_with_silk_threads.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Tetranychus_urticae_with_silk_threads.jpg',
    license: 'CC BY 2.0',
    license_url: LICENSE_URLS['CC BY 2.0'],
    author: 'Gilles San Martin',
    source: 'Wikimedia Commons',
  },
  'whitefly': {
    local_path: '/grow/threats/whitefly.jpg',
    wikimedia_file: 'Silverleaf_whitefly.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Silverleaf_whitefly.jpg',
    license: 'Public Domain',
    license_url: LICENSE_URLS['Public Domain'],
    author: 'USDA',
    source: 'Wikimedia Commons',
  },
  'thrips': {
    local_path: '/grow/threats/thrips.jpg',
    wikimedia_file: 'Frankliniella_occidentalis_5364132-LGPT.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Frankliniella_occidentalis_5364132-LGPT.jpg',
    license: 'CC BY-SA 4.0',
    license_url: LICENSE_URLS['CC BY-SA 4.0'],
    author: 'USDA',
    source: 'Wikimedia Commons',
  },
  'scale-insects': {
    local_path: '/grow/threats/scale-insects.jpg',
    wikimedia_file: 'Wax_scale_(pest_insect).jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Wax_scale_(pest_insect).jpg',
    license: 'CC BY-SA 4.0',
    license_url: LICENSE_URLS['CC BY-SA 4.0'],
    author: 'Mokkie',
    source: 'Wikimedia Commons',
  },
  'mealybugs': {
    local_path: '/grow/threats/mealybugs.jpg',
    wikimedia_file: 'Mealybug_PNr°0443.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Mealybug_PNr%C2%B00443.jpg',
    license: 'CC BY-SA 4.0',
    license_url: LICENSE_URLS['CC BY-SA 4.0'],
    author: 'Llez',
    source: 'Wikimedia Commons',
  },
  'vine-weevil': {
    local_path: '/grow/threats/vine-weevil.jpg',
    wikimedia_file: 'Otiorhynchus_sulcatus01.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Otiorhynchus_sulcatus01.jpg',
    license: 'CC BY-SA 3.0',
    license_url: LICENSE_URLS['CC BY-SA 3.0'],
    author: 'Hectonichus',
    source: 'Wikimedia Commons',
  },
  'brassica-caterpillars': {
    local_path: '/grow/threats/brassica-caterpillars.jpg',
    wikimedia_file: 'Pieris.rapae.caterpillar.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Pieris.rapae.caterpillar.jpg',
    license: 'CC BY-SA 2.5',
    license_url: LICENSE_URLS['CC BY-SA 2.5'],
    author: 'Olaf Leillinger',
    source: 'Wikimedia Commons',
  },
  'cutworms': {
    local_path: '/grow/threats/cutworms.jpg',
    wikimedia_file: 'Agrotis_segetum01.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Agrotis_segetum01.jpg',
    license: 'CC BY-SA 3.0',
    license_url: LICENSE_URLS['CC BY-SA 3.0'],
    author: 'Gyorgy Csoka, Hungary Forest Research Institute',
    source: 'Wikimedia Commons',
  },
  'fungus-gnats': {
    local_path: '/grow/threats/fungus-gnats.jpg',
    wikimedia_file: 'Trauerfliege.JPG',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Trauerfliege.JPG',
    license: 'CC BY-SA 3.0',
    license_url: LICENSE_URLS['CC BY-SA 3.0'],
    author: 'Sarefo',
    source: 'Wikimedia Commons',
  },
  'leaf-miners': {
    local_path: '/grow/threats/leaf-miners.jpg',
    wikimedia_file: 'Tagetes_sp._eaten_by_leaf_miners,_leaf_top_05.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Tagetes_sp._eaten_by_leaf_miners,_leaf_top_05.jpg',
    license: 'CC BY-SA 4.0',
    license_url: LICENSE_URLS['CC BY-SA 4.0'],
    author: 'W.carter',
    source: 'Wikimedia Commons',
  },
  'powdery-mildew': {
    local_path: '/grow/threats/powdery-mildew.jpg',
    wikimedia_file: 'Powdery_mildew_9.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Powdery_mildew_9.jpg',
    license: 'CC BY-SA 4.0',
    license_url: LICENSE_URLS['CC BY-SA 4.0'],
    author: 'Scot Nelson',
    source: 'Wikimedia Commons',
  },
  'downy-mildew': {
    local_path: '/grow/threats/downy-mildew.jpg',
    wikimedia_file: 'Downy_and_Powdery_mildew_on_grape_leaf.JPG',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Downy_and_Powdery_mildew_on_grape_leaf.JPG',
    license: 'CC BY-SA 3.0',
    license_url: LICENSE_URLS['CC BY-SA 3.0'],
    author: 'Rafti Institute',
    source: 'Wikimedia Commons',
  },
  'late-blight': {
    local_path: '/grow/threats/late-blight.jpg',
    wikimedia_file: 'Tomato_with_Phytophthora_infestans_(late_blight).jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Tomato_with_Phytophthora_infestans_(late_blight).jpg',
    license: 'CC BY-SA 4.0',
    license_url: LICENSE_URLS['CC BY-SA 4.0'],
    author: 'Goldlocki',
    source: 'Wikimedia Commons',
  },
  'early-blight': {
    local_path: '/grow/threats/early-blight.jpg',
    wikimedia_file: 'Early_blight_on_tomato_leaves_(7871930010).jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Early_blight_on_tomato_leaves_(7871930010).jpg',
    license: 'CC BY 2.0',
    license_url: LICENSE_URLS['CC BY 2.0'],
    author: 'Scot Nelson',
    source: 'Wikimedia Commons',
  },
  'damping-off': {
    local_path: '/grow/threats/damping-off.jpg',
    wikimedia_file: 'Pinus_taeda_seedling_damping_off_(cropped).jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Pinus_taeda_seedling_damping_off_(cropped).jpg',
    license: 'Public Domain',
    license_url: LICENSE_URLS['Public Domain'],
    author: 'USDA Forest Service',
    source: 'Wikimedia Commons',
  },
  'rust': {
    local_path: '/grow/threats/rust.jpg',
    wikimedia_file: 'Rust_fungus_on_unidentified_plant?_(42705861552).jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Rust_fungus_on_unidentified_plant%3F_(42705861552).jpg',
    license: 'CC BY 2.0',
    license_url: LICENSE_URLS['CC BY 2.0'],
    author: 'John Tan',
    source: 'Wikimedia Commons',
  },
  'leaf-spot': {
    local_path: '/grow/threats/leaf-spot.jpg',
    wikimedia_file: 'Leaf_spot_grey_necrosis.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Leaf_spot_grey_necrosis.jpg',
    license: 'CC BY-SA 3.0',
    license_url: LICENSE_URLS['CC BY-SA 3.0'],
    author: 'Rasbak',
    source: 'Wikimedia Commons',
  },
  'root-rot': {
    local_path: '/grow/threats/root-rot.jpg',
    wikimedia_file: 'Root_rot_in_cicer_arietinum_(hydro-grown).jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Root_rot_in_cicer_arietinum_(hydro-grown).jpg',
    license: 'CC BY-SA 4.0',
    license_url: LICENSE_URLS['CC BY-SA 4.0'],
    author: 'Goldlocki',
    source: 'Wikimedia Commons',
  },
  'apple-scab': {
    local_path: '/grow/threats/apple-scab.jpg',
    wikimedia_file: 'Apple_scab.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Apple_scab.jpg',
    license: 'CC BY 2.0',
    license_url: LICENSE_URLS['CC BY 2.0'],
    author: 'Miyuki Meinaka',
    source: 'Wikimedia Commons',
  },
  'fire-blight': {
    local_path: '/grow/threats/fire-blight.jpg',
    wikimedia_file: 'Apple_tree_with_fire_blight.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Apple_tree_with_fire_blight.jpg',
    license: 'CC BY-SA 3.0',
    license_url: LICENSE_URLS['CC BY-SA 3.0'],
    author: 'Sebastian Stabinger',
    source: 'Wikimedia Commons',
  },
  'rose-black-spot': {
    local_path: '/grow/threats/rose-black-spot.jpg',
    wikimedia_file: 'Black_spot.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Black_spot.jpg',
    license: 'CC BY 2.0',
    license_url: LICENSE_URLS['CC BY 2.0'],
    author: 'Paramecium',
    source: 'Wikimedia Commons',
  },
  'botrytis-grey-mould': {
    local_path: '/grow/threats/botrytis-grey-mould.jpg',
    wikimedia_file: 'Botrytis_cinerea_-_5775776771.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Botrytis_cinerea_-_5775776771.jpg',
    license: 'CC BY 2.0',
    license_url: LICENSE_URLS['CC BY 2.0'],
    author: 'Björn S...',
    source: 'Wikimedia Commons',
  },
  'blossom-end-rot': {
    local_path: '/grow/threats/blossom-end-rot.jpg',
    wikimedia_file: 'Blossom_end_rot.JPG',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Blossom_end_rot.JPG',
    license: 'CC BY-SA 3.0',
    license_url: LICENSE_URLS['CC BY-SA 3.0'],
    author: 'Rasbak',
    source: 'Wikimedia Commons',
  },
  'sunscald-leaf-scorch': {
    local_path: '/grow/threats/sunscald-leaf-scorch.jpg',
    wikimedia_file: '2013-05-03_18_34_31_Quercus_palustris_(Pin_Oak)_with_bacterial_leaf_scorch_during_spring_leaf_out_in_Ewing,_New_Jersey.JPG',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:2013-05-03_18_34_31_Quercus_palustris_(Pin_Oak)_with_bacterial_leaf_scorch_during_spring_leaf_out_in_Ewing,_New_Jersey.JPG',
    license: 'CC BY-SA 3.0',
    license_url: LICENSE_URLS['CC BY-SA 3.0'],
    author: 'Famartin',
    source: 'Wikimedia Commons',
  },
  'frost-damage': {
    local_path: '/grow/threats/frost-damage.jpg',
    wikimedia_file: 'Frost_damaged_Oak_trees_-_geograph.org.uk_-_831355.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Frost_damaged_Oak_trees_-_geograph.org.uk_-_831355.jpg',
    license: 'CC BY-SA 2.0',
    license_url: LICENSE_URLS['CC BY-SA 2.0'],
    author: 'Robin Webster',
    source: 'Wikimedia Commons',
  },
  'heat-stress': {
    local_path: '/grow/threats/heat-stress.jpg',
    wikimedia_file: 'Roses_wilted_after_heat_wave_at_Gamla_Strandgatan_11,_Gamlestan,_Lysekil.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Roses_wilted_after_heat_wave_at_Gamla_Strandgatan_11,_Gamlestan,_Lysekil.jpg',
    license: 'CC BY-SA 4.0',
    license_url: LICENSE_URLS['CC BY-SA 4.0'],
    author: 'W.carter',
    source: 'Wikimedia Commons',
  },
  'overwatering-poor-drainage': {
    local_path: '/grow/threats/overwatering-poor-drainage.jpg',
    wikimedia_file: 'Waterlogg_area_with_some_vegetation.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Waterlogg_area_with_some_vegetation.jpg',
    license: 'CC BY-SA 4.0',
    license_url: LICENSE_URLS['CC BY-SA 4.0'],
    author: 'Karaveereshwara',
    source: 'Wikimedia Commons',
  },
  'nitrogen-deficiency': {
    local_path: '/grow/threats/nitrogen-deficiency.jpg',
    wikimedia_file: 'Spitskool_stikstofgebrek_(nitrogen_deficiency)_Brassica_oleracea_convar._capitata_var._alba.jpg',
    wikimedia_url: 'https://commons.wikimedia.org/wiki/File:Spitskool_stikstofgebrek_(nitrogen_deficiency)_Brassica_oleracea_convar._capitata_var._alba.jpg',
    license: 'CC BY-SA 3.0',
    license_url: LICENSE_URLS['CC BY-SA 3.0'],
    author: 'Rasbak',
    source: 'Wikimedia Commons',
  },
};

async function main() {
  console.log('🖼️  Update Threat Images in Database');
  console.log('=====================================\n');

  if (dryRun) {
    console.log('🔸 DRY RUN - no changes will be made\n');
  }

  // Get all threats from database
  const { data: threats, error } = await supabase
    .from('garden_threat')
    .select('id, slug, card_json');

  if (error) {
    console.error('Error fetching threats:', error);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;

  for (const threat of threats || []) {
    const slug = threat.slug;
    const wikiImage = THREAT_IMAGES[slug];

    if (!wikiImage) {
      console.log(`  ⏭️  ${slug}: No Wikimedia image available`);
      skipped++;
      continue;
    }

    // Verify local file exists
    const localPath = resolve(process.cwd(), 'public' + wikiImage.local_path);
    if (!existsSync(localPath)) {
      console.log(`  ❌ ${slug}: Local file not found: ${localPath}`);
      skipped++;
      continue;
    }

    // Build updated card_json with wikimedia_image
    const cardJson = threat.card_json || {};
    
    // Remove old Perenual images if present (we're replacing them)
    const hadPerenualImages = cardJson.images?.length > 0;
    
    // Set wikimedia_image with full attribution
    cardJson.wikimedia_image = wikiImage;
    
    // Remove old Perenual images array - we're using wikimedia_image now
    // Keep perenual_id and other enrichment data, just replace the image
    if (hadPerenualImages) {
      delete cardJson.images;
    }

    if (dryRun) {
      console.log(`  [dry-run] Would update: ${slug}`);
      console.log(`    Image: ${wikiImage.local_path}`);
      console.log(`    License: ${wikiImage.license}`);
      console.log(`    Author: ${wikiImage.author}`);
      if (hadPerenualImages) {
        console.log(`    (Replacing Perenual images)`);
      }
      updated++;
      continue;
    }

    // Update database
    const { error: updateError } = await supabase
      .from('garden_threat')
      .update({ card_json: cardJson })
      .eq('id', threat.id);

    if (updateError) {
      console.error(`  ❌ ${slug}: Update failed -`, updateError);
      continue;
    }

    console.log(`  ✅ ${slug}: Updated (${wikiImage.license})${hadPerenualImages ? ' [replaced Perenual]' : ''}`);
    updated++;
  }

  console.log('\n=====================================');
  console.log('📊 Summary');
  console.log(`  Total threats: ${threats?.length || 0}`);
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
}

main().catch(console.error);
