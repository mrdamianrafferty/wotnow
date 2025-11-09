import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Correct taxon IDs extracted from inat_ids_update.sql
const CORRECT_TAXON_IDS: Record<string, number> = {
  'Spicara smaris': 118712,
  'Symphodus melops': 113533,
  'Sphyraena sphyraena': 47255,
  'Pagrus pagrus': 108196,
  'Trachinus draco': 118652,
  'Serranus scriba': 118674,
  'Diplodus vulgaris': 118667,
  'Pagellus bogaraveo': 118657,
  'Scomber colias': 69841,
  'Pollachius virens': 228496,
  'Sardina pilchardus': 118600,
  'Sparisoma cretense': 112860,
  'Labrus bergylta': 103911,
  'Loligo vulgaris': 324558,
  'Sparus aurata': 1494783,
  'Trachurus mediterraneus': 118694,
  'Gadus morhua': 63740,
  'Sarda sarda': 56940,
  'Sarpa salpa': 118663,
  'Spondyliosoma cantharus': 118655,
  'Scophthalmus maximus': 416585,
  'Sprattus sprattus': 324532,
  'Mullus surmuletus': 118619,
  'Pomatomus saltatrix': 50984,
  'Mustelus asterias': 106253,
  'Scomber scombrus': 118678,
  'Euthynnus alletteratus': 120614,
  'Chelidonichthys lucerna': 118628,
  'Pleuronectes platessa': 47523,
  'Mustelus mustelus': 56050,
  'Ctenolabrus rupestris': 98753,
  'Serranus cabrilla': 118675,
  'Sepia officinalis': 151429,
  'Molva molva': 125291,
  'Argyrosomus regius': 118679,
  'Scorpaena scrofa': 84861,
  'Trachurus trachurus': 118695,
  'Platichthys flesus': 109631,
  'Dicentrarchus punctatus': 118616,
  'Epinephelus aeneus': 68118,
  'Eutrigla gurnardus': 118720,
  'Seriola dumerili': 51549,
  'Ammodytes tobianus': 367966,
  'Dicentrarchus labrax': 99269,
  'Conger conger': 118589,
  'Salmo trutta': 47518,
  'Octopus vulgaris': 49315,
  'Merlangius merlangus': 430553,
  'Raja microocellata': 118645,
  'Raja clavata': 118637,
  'Epinephelus marginatus': 118682,
  'Lichia amia': 118680,
  'Limanda limanda': 118712,
  'Melanogrammus aeglefinus': 430554,
  'Chelon labrosus': 80656,
  'Zeus faber': 62883,
  'Oblada melanura': 118665,
  'Labrus mixtus': 118648,
  'Pagellus erythrinus': 51979,
  'Solea solea': 118641,
  'Scyliorhinus stellaris': 56050,
  'Belone belone': 48127,
  'Lepidorhombus whiffiagonis': 430552,
  'Mugil cephalus': 51942,
  'Sphyraena viridensis': 47255,
  'Chelidonichthys cuculus': 118627,
  'Scyliorhinus canicula': 47866,
  'Raja montagui': 118636,
  'Boops boops': 48008,
  'Diplodus sargus': 51999,
  'Raja undulata': 118640,
  'Scophthalmus rhombus': 47750,
  'Pollachius pollachius': 47667,
  'Centrolabrus exoletus': 113534,
  'Clupea harengus': 47383,
  'Dentex dentex': 51988,
};

function slugifyScientificName(name: string): string {
  return name.trim().replace(/\s+/g, '-');
}

async function rebuildUrls() {
  console.log('\n=== Rebuilding iNaturalist URLs ===\n');

  let updatedCount = 0;
  let errorCount = 0;

  for (const [scientificName, taxonId] of Object.entries(CORRECT_TAXON_IDS)) {
    const slug = slugifyScientificName(scientificName);
    const correctUrl = `https://www.inaturalist.org/taxa/${taxonId}-${slug}`;

    try {
      const { error } = await supabase
        .from('species')
        .update({ inaturalist_url: correctUrl })
        .eq('scientific_name', scientificName);

      if (error) {
        console.error(`❌ Error updating ${scientificName}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Updated ${scientificName}`);
        console.log(`   ${correctUrl}`);
        updatedCount++;
      }
    } catch (err) {
      console.error(`❌ Exception updating ${scientificName}:`, err);
      errorCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total: ${Object.keys(CORRECT_TAXON_IDS).length}`);
}

rebuildUrls().catch(console.error);
