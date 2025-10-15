import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// The 62 current species with their codes from the Oct 11 INSERT statement
const CURRENT_SPECIES_MAPPING: Record<string, { name: string; code: string; scientific: string }> = {
  '33dc4780-c4e1-4346-9b9b-bc475252b8a2': { name: 'Ballan Wrasse', code: 'wrb', scientific: 'Labrus bergylta' },
  '4b81f63b-655c-44b1-ac06-c2b13dd41b13': { name: 'Black Seabream', code: 'brs', scientific: 'Spondyliosoma cantharus' },
  'f863e87c-0883-4c07-a896-790bb3b37d16': { name: 'Brill', code: 'bll', scientific: 'Scophthalmus rhombus' },
  'dbe7a1c9-29f9-4620-b5dc-60376973a158': { name: 'Bull Huss', code: 'BUH', scientific: 'Scyliorhinus stellaris' },
  '39d25a22-dea4-41b1-8af0-c55e501b715c': { name: 'Cod (Coastal)', code: 'cod', scientific: 'Gadus morhua' },
  '80f9836a-acb6-4f89-b35d-44c94bb2f37c': { name: 'Comber', code: 'CMB', scientific: 'Serranus cabrilla' },
  '873477c5-2b2b-448a-a17c-f2c8bcf95c69': { name: 'Common Cuttlefish', code: 'cut', scientific: 'Sepia officinalis' },
  '8773301c-08ad-4177-a8a9-0f0e89f13b6d': { name: 'Common Ling', code: 'lin', scientific: 'Molva molva' },
  'b2e31ceb-aa7b-4f90-aedb-5a0b5e6edce3': { name: 'Common Octopus', code: 'oct', scientific: 'Octopus vulgaris' },
  '7f00612a-ce1c-4380-b227-2d0ec5bc715c': { name: 'Common Smoothhound', code: 'CSH', scientific: 'Mustelus mustelus' },
  '351d5194-8f72-4c7d-bdd9-cecd18691cca': { name: 'Common Squid', code: 'sqc', scientific: 'Loligo vulgaris' },
  'aa12f55e-c4fb-4be1-9011-d27e29e3b149': { name: 'Conger Eel', code: 'con', scientific: 'Conger conger' },
  '09c25d59-0180-41fa-a1e0-216a3acb8be4': { name: 'Corkwing Wrasse', code: 'WRK', scientific: 'Symphodus melops' },
  'd19bf161-8459-4ff7-8677-6be6f40ee2b4': { name: 'Cuckoo Wrasse', code: 'wrc', scientific: 'Labrus mixtus' },
  'c8d0c3f8-67a4-4722-9911-b96c64a288fb': { name: 'Dab', code: 'dab', scientific: 'Limanda limanda' },
  'fecf4bb2-f522-4484-b349-6af516ecf70d': { name: 'Dentex', code: 'dex', scientific: 'Dentex dentex' },
  'd93860a9-b51f-464e-b448-f31016783658': { name: 'Dover Sole', code: 'sol', scientific: 'Solea solea' },
  'e2047506-3a07-4b7b-887a-78678c790855': { name: 'Flathead Grey Mullet', code: 'fgm', scientific: 'Mugil cephalus' },
  '8f1bf333-53cd-46e8-823b-34bb120d81c9': { name: 'Flounder', code: 'fle', scientific: 'Platichthys flesus' },
  'de0e3718-6ff7-42cc-a446-af6198ebf9b6': { name: 'Garfish (Needlefish)', code: 'gar', scientific: 'Belone belone' },
  '8c6892ce-541b-4c87-a1a1-0a70ee95d6a7': { name: 'Gilthead Seabream', code: 'sbg', scientific: 'Gilthead Seabream' },
  '80bed2d4-d4be-4c67-a39c-b53071cfa116': { name: 'Goldsinny Wrasse', code: 'WRG', scientific: 'Ctenolabrus rupestris' },
  '956ae44a-17a7-4ba2-b122-9f7c4031d9c9': { name: 'Greater Amberjack', code: 'gaj', scientific: 'Seriola dumerili' },
  '1a6e5c1d-0966-4a1d-88ab-d9fadd11d91d': { name: 'Greater Weever', code: 'wee', scientific: 'Trachinus draco' },
  '926a1d0c-8452-4691-bb5c-d23f13934181': { name: 'Grey Gurnard', code: 'GGR', scientific: 'Eutrigla gurnardus' },
  'cdff3a7d-13c1-43ab-8b4c-026fea407846': { name: 'Grey Mullet', code: 'mug', scientific: 'Chelon labrosus' },
  'cdec14dc-1717-4c71-908c-8f4bdce40ba3': { name: 'Haddock', code: 'had', scientific: 'Melanogrammus aeglefinus' },
  'fb41c21b-d0c6-4630-9a03-43bcbcddc5bc': { name: 'Herring', code: 'her', scientific: 'Clupea harengus' },
  '8e08ef70-183e-42a3-a24d-55d248ca5fd2': { name: 'Horse Mackerel', code: 'hom', scientific: 'Trachurus trachurus' },
  'cfdb7cb9-093f-466c-b52f-7eb3ce4b2236': { name: 'John Dory', code: 'jod', scientific: 'Zeus faber' },
  '74a25287-ab66-41b2-bc6d-2807ce4d301f': { name: 'Little Tunny', code: 'lta', scientific: 'Euthynnus alletteratus' },
  '70083afd-7e2c-4ebf-aa3e-9ce079647c83': { name: 'Mackerel', code: 'mac', scientific: 'Scomber scombrus' },
  'de8827c0-ead9-485e-a96b-68d6fcb54b24': { name: 'Megrim', code: 'ldb', scientific: 'Lepidorhombus whiffiagonis' },
  '21387c4d-6310-4445-8c48-02718feaaabb': { name: 'Painted Comber', code: 'CMP', scientific: 'Serranus scriba' },
  '2bca1f9d-6511-4350-8306-c1bfbd799566': { name: 'Parrotfish', code: 'par', scientific: 'Sparisoma cretense' },
  '042f8eee-b819-4cdc-a913-508c41b4c7bb': { name: 'Picarel', code: 'PIC', scientific: 'Spicara smaris' },
  '7d5e3175-325e-4173-bf73-20cfa8149027': { name: 'Plaice', code: 'ple', scientific: 'Pleuronectes platessa' },
  'f9663a72-68d2-4978-ab35-1d1da19c154d': { name: 'Pollack', code: 'pol', scientific: 'Pollachius pollachius' },
  'e6c1fac9-8e11-4447-81a5-fea7306cb6df': { name: 'Red Gurnard', code: 'GUR', scientific: 'Chelidonichthys cuculus' },
  '649d843b-afcb-4c0f-b2a8-de537b76f9d7': { name: 'Red Mullet', code: 'mul', scientific: 'Mullus surmuletus' },
  '234cb9ab-030d-4191-9177-9e37846bcf9a': { name: 'Red Seabream', code: 'sbr', scientific: 'Pagellus bogaraveo' },
  'fa7ffbc6-334d-4f73-869c-cbb0179813e6': { name: 'Rock Cook', code: 'WRO', scientific: 'Centrolabrus exoletus' },
  '27210ffa-ce53-4417-8324-fae1cb6887e7': { name: 'Saithe (Pollachius virens)', code: 'pok', scientific: 'Pollachius virens' },
  '9a0fa366-c1be-4ef9-b0ca-fccece1e5ad4': { name: 'Saithe/Pollock', code: 'sai', scientific: 'Saithe/Pollock' },
  '47bdcecf-fe46-4d5e-a4b2-304820c56367': { name: 'Salema (Saupe)', code: 'SAL', scientific: 'Sarpa salpa' },
  '9862dffd-13e4-4e7e-a50d-93c4b4794c01': { name: 'Sand Eel', code: 'san', scientific: 'Ammodytes tobianus' },
  '29717253-1b65-4035-8e22-347696263934': { name: 'Sardine', code: 'pil', scientific: 'Sardina pilchardus' },
  'a4d859a8-31f5-4079-8d7b-435090a64ebc': { name: 'Sea Bass', code: 'bss', scientific: 'Dicentrarchus labrax' },
  '38f43103-d9be-4e48-8186-0c61070eb6a1': { name: 'Sea Bream (Dorada)', code: 'sba', scientific: 'Sparus aurata' },
  'acff734e-fc96-4fc3-b158-803bd4e9342e': { name: 'Sea Trout', code: 'trs', scientific: 'Salmo trutta' },
  'bb4f2007-01e3-40cc-8494-402ab42f1468': { name: 'Small-eyed Ray', code: 'RME', scientific: 'Raja microocellata' },
  'ed21d6cd-cf25-4e41-bcf2-cec413186df4': { name: 'Small-spotted Catshark', code: 'scy', scientific: 'Scyliorhinus canicula' },
  '8f333815-a1f5-4be4-a491-705e44c0a304': { name: 'Spotted Bass', code: 'bsp', scientific: 'Dicentrarchus punctatus' },
  'ee20edc8-ab67-4494-b083-f8a5702e4241': { name: 'Spotted Ray', code: 'RJM', scientific: 'Raja montagui' },
  '64768e97-9b31-4a15-977b-ba31d79f104b': { name: 'Sprat', code: 'spr', scientific: 'Sprattus sprattus' },
  '680e1bcb-8d4c-45a6-bd8a-fd95e14a75c9': { name: 'Starry Smoothhound', code: 'SSH', scientific: 'Mustelus asterias' },
  'bcefa338-ee77-4d40-8939-14e16e12c236': { name: 'Thornback Ray', code: 'rjc', scientific: 'Raja clavata' },
  '77553fff-3979-4f02-a16a-61f0a01c261f': { name: 'Tub Gurnard', code: 'gug', scientific: 'Chelidonichthys lucerna' },
  '52fee867-bd14-4cd2-8904-f368c9097c01': { name: 'Turbot (Small)', code: 'tur', scientific: 'Scophthalmus maximus' },
  'f55d6f7a-92d6-405c-a7b9-538229ac9a4b': { name: 'Undulate Ray', code: 'RUN', scientific: 'Raja undulata' },
  'ed70b779-68c8-4f71-a6c9-3a0454cd881b': { name: 'Whiting', code: 'whg', scientific: 'Merlangius merlangus' },
  '0c62a1c7-2c32-40e1-9250-12940c8cfca4': { name: 'Wrasse (various)', code: 'wra', scientific: 'Labridae spp.' },
};

async function buildRosettaStone() {
  console.log('🗿 BUILDING ROSETTA STONE: Old Species IDs → species_codes → New Species IDs\n');
  console.log('='.repeat(80));

  // Step 1: Get ALL unique old species_ids from species_frequency
  const { data: frequencyData } = await supabase
    .from('species_frequency')
    .select('species_id, optimal_temp_min, optimal_temp_max, optimal_wind_max')
    .limit(50000);

  if (!frequencyData) {
    console.error('❌ Could not fetch species_frequency');
    return;
  }

  // Group by species_id to get unique species with their environmental profiles
  const speciesProfiles = new Map<string, { temp_min: number; temp_max: number; wind_max: number; count: number }>();
  
  frequencyData.forEach(row => {
    if (!speciesProfiles.has(row.species_id)) {
      speciesProfiles.set(row.species_id, {
        temp_min: row.optimal_temp_min,
        temp_max: row.optimal_temp_max,
        wind_max: row.optimal_wind_max,
        count: 1,
      });
    } else {
      const existing = speciesProfiles.get(row.species_id)!;
      existing.count++;
    }
  });

  console.log(`\n📊 Found ${speciesProfiles.size} unique OLD species IDs in species_frequency\n`);

  // Step 2: Create Rosetta Stone by matching environmental profiles
  console.log('🔍 Attempting to match OLD species by environmental profiles...\n');
  
  const rosettaStone: Array<{
    old_species_id: string;
    temp_profile: string;
    wind_max: number;
    record_count: number;
    likely_code?: string;
    likely_name?: string;
    new_species_id?: string;
    confidence: 'high' | 'medium' | 'low';
    notes: string;
  }> = [];

  speciesProfiles.forEach((profile, oldId) => {
    const tempRange = `${profile.temp_min}-${profile.temp_max}°C`;
    
    // Try to guess species based on temperature profiles
    let guess: { code: string; name: string; new_id: string; confidence: 'high' | 'medium' | 'low'; notes: string } = { 
      code: '', name: '', new_id: '', confidence: 'low', notes: '' 
    };
    
    // Cold-water species (8-18°C)
    if (profile.temp_min === 8 && profile.temp_max === 18) {
      guess = {
        code: 'cod/had/whg',
        name: 'Cod/Haddock/Whiting (cold-water)',
        new_id: 'multiple',
        confidence: 'medium',
        notes: 'Cold North Sea species'
      };
    }
    // Temperate (15-26°C)
    else if (profile.temp_min === 15 && profile.temp_max === 26) {
      guess = {
        code: 'bss/mac/pol',
        name: 'Sea Bass/Mackerel/Pollack (temperate)',
        new_id: 'multiple',
        confidence: 'medium',
        notes: 'Temperate Atlantic species'
      };
    }
    // Warm-water (18-28°C)
    else if (profile.temp_min === 18 && profile.temp_max === 28) {
      guess = {
        code: 'sba/mul/brs',
        name: 'Sea Bream/Red Mullet/Black Seabream (warm)',
        new_id: 'multiple',
        confidence: 'medium',
        notes: 'Mediterranean/warm Atlantic'
      };
    }
    
    rosettaStone.push({
      old_species_id: oldId,
      temp_profile: tempRange,
      wind_max: profile.wind_max,
      record_count: profile.count,
      likely_code: guess.code,
      likely_name: guess.name,
      new_species_id: guess.new_id,
      confidence: guess.confidence,
      notes: guess.notes,
    });
  });

  // Sort by record count (most common species first)
  rosettaStone.sort((a, b) => b.record_count - a.record_count);

  console.log('📋 ROSETTA STONE (sorted by record count):\n');
  rosettaStone.forEach((entry, idx) => {
    console.log(`${idx + 1}. OLD ID: ${entry.old_species_id.substring(0, 8)}...`);
    console.log(`   Records: ${entry.record_count.toLocaleString()}`);
    console.log(`   Temp: ${entry.temp_profile}, Wind: ≤${entry.wind_max} knots`);
    console.log(`   Likely: ${entry.likely_name} (${entry.likely_code})`);
    console.log(`   Confidence: ${entry.confidence.toUpperCase()}`);
    console.log(`   Notes: ${entry.notes}\n`);
  });

  // Save to file
  fs.writeFileSync(
    'ROSETTA_STONE_SPECIES_MAPPING.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        old_species_count: speciesProfiles.size,
        current_species_count: Object.keys(CURRENT_SPECIES_MAPPING).length,
        approach: 'Environmental profile matching (temp/wind patterns)',
        confidence: 'MEDIUM - Educated guesses based on temperature preferences',
      },
      mappings: rosettaStone,
      current_species: CURRENT_SPECIES_MAPPING,
    }, null, 2)
  );

  console.log('\n💾 Rosetta Stone saved to ROSETTA_STONE_SPECIES_MAPPING.json');
  
  console.log('\n\n🎯 CONCLUSION:\n');
  console.log('='.repeat(80));
  console.log(`❌ We CANNOT definitively map the ${speciesProfiles.size} old species to current species`);
  console.log('   without the original species_code values or scientific names.');
  console.log('\n💡 BEST OPTION: Proceed with Option 1 (Manual Research)');
  console.log('   - Use Phase 1 regional gates (62 species complete)');
  console.log('   - Research environmental params from FishBase');
  console.log('   - Total work: 12-17 hours for complete system');
  console.log('   - Result: Clean, accurate, fully controlled data');
}

buildRosettaStone()
  .then(() => process.exit(0))
  .catch(console.error);
