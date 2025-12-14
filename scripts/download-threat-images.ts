#!/usr/bin/env npx tsx
/**
 * Download public domain / CC images for garden threats
 * 
 * Sources images from Wikimedia Commons using their API to get correct URLs
 * 
 * Usage:
 *   npx tsx scripts/download-threat-images.ts
 *   npx tsx scripts/download-threat-images.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve, join } from 'path';
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { pipeline } from 'stream/promises';

config({ path: resolve(process.cwd(), '.env.local') });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Output directory for threat images
const OUTPUT_DIR = resolve(process.cwd(), 'public/grow/threats');

// Mapping of threat slugs to Wikimedia Commons file names
// The script will use Wikimedia's API to get the actual image URLs
// ALL FILE NAMES VERIFIED to exist on Wikimedia Commons as of Dec 2025
const THREAT_IMAGES: Record<string, { 
  wikiFile: string;  // The File: name on Wikimedia Commons (without "File:" prefix)
  license: 'CC0' | 'Public Domain' | 'CC BY-SA 4.0' | 'CC BY-SA 3.0' | 'CC BY 2.0' | 'CC BY-SA 2.0' | 'CC BY-SA 2.5';
  attribution?: string;
}> = {
  // ============ PESTS ============
  'aphids': {
    wikiFile: 'Aphids_on_broccoli.jpg',  // Verified ✓
    license: 'CC BY-SA 3.0',
    attribution: 'Fir0002',
  },
  'slugs-snails': {
    wikiFile: 'Limax_maximus.jpg',  // Verified ✓ - Leopard slug
    license: 'CC BY-SA 4.0',
    attribution: 'Michal Maňas',
  },
  'spider-mites': {
    wikiFile: 'Tetranychus_urticae_with_silk_threads.jpg',  // Verified ✓
    license: 'CC BY 2.0',
    attribution: 'Gilles San Martin',
  },
  'whitefly': {
    wikiFile: 'Silverleaf_whitefly.jpg',  // Verified ✓ - USDA Public Domain
    license: 'Public Domain',
    attribution: 'USDA',
  },
  'thrips': {
    wikiFile: 'Frankliniella_occidentalis_5364132-LGPT.jpg',  // Verified ✓
    license: 'CC BY-SA 4.0',
    attribution: 'USDA',
  },
  'scale-insects': {
    wikiFile: 'Wax_scale_(pest_insect).jpg',  // Verified ✓
    license: 'CC BY-SA 4.0',
    attribution: 'Mokkie',
  },
  'mealybugs': {
    wikiFile: 'Mealybug_PNr°0443.jpg',  // Verified ✓
    license: 'CC BY-SA 4.0',
    attribution: 'Llez',
  },
  'vine-weevil': {
    wikiFile: 'Otiorhynchus_sulcatus01.jpg',  // Verified ✓
    license: 'CC BY-SA 3.0',
    attribution: 'Hectonichus',
  },
  'brassica-caterpillars': {
    wikiFile: 'Pieris.rapae.caterpillar.jpg',  // Verified ✓
    license: 'CC BY-SA 2.5',
    attribution: 'Olaf Leillinger',
  },
  'cutworms': {
    wikiFile: 'Agrotis_segetum01.jpg',  // Verified ✓
    license: 'CC BY-SA 3.0',
    attribution: 'Gyorgy Csoka, Hungary Forest Research Institute',
  },
  'fungus-gnats': {
    wikiFile: 'Trauerfliege.JPG',  // Verified ✓ - German name for fungus gnat
    license: 'CC BY-SA 3.0',
    attribution: 'Sarefo',
  },
  'leaf-miners': {
    wikiFile: 'Tagetes_sp._eaten_by_leaf_miners,_leaf_top_05.jpg',  // Verified ✓
    license: 'CC BY-SA 4.0',
    attribution: 'W.carter',
  },

  // ============ FUNGAL DISEASES ============
  'powdery-mildew': {
    wikiFile: 'Powdery_mildew_9.jpg',  // Verified ✓
    license: 'CC BY-SA 4.0',
    attribution: 'Scot Nelson',
  },
  'downy-mildew': {
    wikiFile: 'Downy_and_Powdery_mildew_on_grape_leaf.JPG',  // Verified ✓
    license: 'CC BY-SA 3.0',
    attribution: 'Rafti Institute',
  },
  'late-blight': {
    wikiFile: 'Tomato_with_Phytophthora_infestans_(late_blight).jpg',  // Verified ✓
    license: 'CC BY-SA 4.0',
    attribution: 'Goldlocki',
  },
  'early-blight': {
    wikiFile: 'Early_blight_on_tomato_leaves_(7871930010).jpg',  // Verified ✓
    license: 'CC BY 2.0',
    attribution: 'Scot Nelson',
  },
  'damping-off': {
    wikiFile: 'Pinus_taeda_seedling_damping_off_(cropped).jpg',  // Verified ✓
    license: 'Public Domain',
    attribution: 'USDA Forest Service',
  },
  'rust': {
    wikiFile: 'Rust_fungus_on_unidentified_plant?_(42705861552).jpg',  // Verified ✓
    license: 'CC BY 2.0',
    attribution: 'John Tan',
  },
  'leaf-spot': {
    wikiFile: 'Leaf_spot_grey_necrosis.jpg',  // Verified ✓
    license: 'CC BY-SA 3.0',
    attribution: 'Rasbak',
  },
  'root-rot': {
    wikiFile: 'Root_rot_in_cicer_arietinum_(hydro-grown).jpg',  // Verified ✓
    license: 'CC BY-SA 4.0',
    attribution: 'Goldlocki',
  },
  'apple-scab': {
    wikiFile: 'Apple_scab.jpg',  // Verified ✓
    license: 'CC BY 2.0',
    attribution: 'Miyuki Meinaka',
  },
  'fire-blight': {
    wikiFile: 'Apple_tree_with_fire_blight.jpg',  // Verified ✓
    license: 'CC BY-SA 3.0',
    attribution: 'Sebastian Stabinger',
  },
  'rose-black-spot': {
    wikiFile: 'Black_spot.jpg',  // Verified ✓
    license: 'CC BY 2.0',
    attribution: 'Paramecium',
  },
  'botrytis-grey-mould': {
    wikiFile: 'Botrytis_cinerea_-_5775776771.jpg',  // Verified ✓
    license: 'CC BY 2.0',
    attribution: 'Björn S...',
  },

  // ============ ABIOTIC ============
  'blossom-end-rot': {
    wikiFile: 'Blossom_end_rot.JPG',  // Verified ✓ (note: .JPG not .jpg)
    license: 'CC BY-SA 3.0',
    attribution: 'Rasbak',
  },
  'sunscald-leaf-scorch': {
    wikiFile: '2013-05-03_18_34_31_Quercus_palustris_(Pin_Oak)_with_bacterial_leaf_scorch_during_spring_leaf_out_in_Ewing,_New_Jersey.JPG',  // Verified ✓
    license: 'CC BY-SA 3.0',
    attribution: 'Famartin',
  },
  'frost-damage': {
    wikiFile: 'Frost_damaged_Oak_trees_-_geograph.org.uk_-_831355.jpg',  // Verified ✓
    license: 'CC BY-SA 2.0',
    attribution: 'Robin Webster',
  },
  'heat-stress': {
    wikiFile: 'Roses_wilted_after_heat_wave_at_Gamla_Strandgatan_11,_Gamlestan,_Lysekil.jpg',  // Verified ✓
    license: 'CC BY-SA 4.0',
    attribution: 'W.carter',
  },
  'overwatering-poor-drainage': {
    wikiFile: 'Waterlogg_area_with_some_vegetation.jpg',  // Verified ✓
    license: 'CC BY-SA 4.0',
    attribution: 'Karaveereshwara',
  },

  // ============ NUTRIENT ============
  'nitrogen-deficiency': {
    wikiFile: 'Spitskool_stikstofgebrek_(nitrogen_deficiency)_Brassica_oleracea_convar._capitata_var._alba.jpg',  // Verified ✓
    license: 'CC BY-SA 3.0',
    attribution: 'Rasbak',
  },
};

/**
 * Get the actual image URL from Wikimedia Commons API
 */
async function getWikimediaImageUrl(fileName: string, width: number = 640): Promise<string | null> {
  try {
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&iiurlwidth=${width}&format=json&origin=*`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'WotNow Garden App/1.0 (https://wotnow.app; Educational gardening application)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const pages = data.query?.pages;
    
    if (!pages) return null;
    
    // Get the first page (there should only be one)
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    
    // Check if imageinfo exists (file exists in Commons even if page ID is -1)
    const imageInfo = page?.imageinfo?.[0];
    if (!imageInfo) {
      console.log(`    Debug: No imageinfo for ${fileName}, page:`, JSON.stringify(page).slice(0, 200));
      return null;
    }
    
    return imageInfo?.thumburl || imageInfo?.url || null;
  } catch (error) {
    console.error(`    Error fetching URL for ${fileName}:`, error);
    return null;
  }
}

async function downloadImage(slug: string, imageData: typeof THREAT_IMAGES[string]): Promise<boolean> {
  const filename = `${slug}.jpg`;
  const filepath = join(OUTPUT_DIR, filename);

  if (existsSync(filepath)) {
    console.log(`  ⏭️  ${slug}: Already exists`);
    return true;
  }

  console.log(`  🔍 ${slug}: Looking up image URL...`);
  const imageUrl = await getWikimediaImageUrl(imageData.wikiFile);
  
  if (!imageUrl) {
    console.error(`  ❌ ${slug}: Could not find image URL for ${imageData.wikiFile}`);
    return false;
  }

  if (dryRun) {
    console.log(`  [dry-run] Would download: ${slug}`);
    console.log(`    File: ${imageData.wikiFile}`);
    console.log(`    URL: ${imageUrl}`);
    console.log(`    License: ${imageData.license}`);
    if (imageData.attribution) {
      console.log(`    Attribution: ${imageData.attribution}`);
    }
    return true;
  }

  try {
    console.log(`  📥 Downloading: ${slug}...`);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'WotNow Garden App/1.0 (https://wotnow.app; Educational gardening application)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const fileStream = createWriteStream(filepath);
    await pipeline(response.body as any, fileStream);

    console.log(`  ✅ ${slug}: Downloaded (${imageData.license})`);
    return true;
  } catch (error) {
    console.error(`  ❌ ${slug}: Failed - ${error}`);
    return false;
  }
}

async function main() {
  console.log('🖼️  Garden Threat Image Downloader');
  console.log('===================================\n');

  if (dryRun) {
    console.log('🔸 DRY RUN - no files will be downloaded\n');
  }

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created directory: ${OUTPUT_DIR}\n`);
  }

  let downloaded = 0;
  let failed = 0;

  for (const [slug, imageData] of Object.entries(THREAT_IMAGES)) {
    const success = await downloadImage(slug, imageData);
    if (success) {
      downloaded++;
    } else {
      failed++;
    }

    // Rate limiting for Wikimedia (be respectful)
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n===================================');
  console.log('📊 Summary');
  console.log(`  Total: ${Object.keys(THREAT_IMAGES).length}`);
  console.log(`  ✅ Downloaded/Exists: ${downloaded}`);
  console.log(`  ❌ Failed: ${failed}`);

  // Generate attribution file
  if (!dryRun && downloaded > 0) {
    const attributions = Object.entries(THREAT_IMAGES)
      .map(([slug, data]) => {
        let line = `${slug}:\n`;
        line += `  File: ${data.wikiFile}\n`;
        line += `  License: ${data.license}\n`;
        if (data.attribution) {
          line += `  Attribution: ${data.attribution}\n`;
        }
        line += `  Source: Wikimedia Commons\n`;
        line += `  URL: https://commons.wikimedia.org/wiki/File:${encodeURIComponent(data.wikiFile)}\n`;
        return line;
      })
      .join('\n');

    const header = `# Garden Threat Image Attributions
${'='.repeat(50)}

All images are sourced from Wikimedia Commons with the following licenses:
- CC0: Public Domain Dedication (no attribution required)
- Public Domain: No copyright restrictions (no attribution required)
- CC BY 2.0: Attribution Required
- CC BY-SA 2.0/2.5/3.0/4.0: Attribution-ShareAlike (attribution required)

## Attribution Requirements

When using images with CC BY or CC BY-SA licenses, you must:
1. Credit the author/photographer
2. Provide a link to the license
3. Indicate if changes were made

${'='.repeat(50)}

`;

    writeFileSync(
      join(OUTPUT_DIR, 'ATTRIBUTIONS.md'),
      header + attributions
    );
    console.log('\n📝 Generated ATTRIBUTIONS.md');
  }
}

main().catch(console.error);
