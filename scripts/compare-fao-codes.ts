#!/usr/bin/env tsx
/**
 * Compare current species codes with official FAO 3-alpha codes
 * Helps decide whether to replace or add as separate column
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// FAO codes from your SQL file
const faoCodeMap: Record<string, string> = {
  '042f8eee-b819-4cdc-a913-508c41b4c7bb': 'SPC',
  '09c25d59-0180-41fa-a1e0-216a3acb8be4': 'YFM',
  '0bf0af5d-191b-45af-85c5-8052e39a8b37': 'YRS',
  '17cd29de-54a6-448d-b447-4a34e4cffba1': 'RPG',
  '1a6e5c1d-0966-4a1d-88ab-d9fadd11d91d': 'WEG',
  '21387c4d-6310-4445-8c48-02718feaaabb': 'SRK',
  '22ddf8bc-c323-4cc4-8b64-7e7ffa48a3bd': 'CTB',
  '234cb9ab-030d-4191-9177-9e37846bcf9a': 'SBR',
  '2440c4ab-8ac5-4a2f-bb93-3f7c016db0e2': 'VMA',
  '27210ffa-ce53-4417-8324-fae1cb6887e7': 'POK',
  '29717253-1b65-4035-8e22-347696263934': 'PIL',
  '2bca1f9d-6511-4350-8306-c1bfbd799566': 'PRR',
  '33dc4780-c4e1-4346-9b9b-bc475252b8a2': 'USB',
  '351d5194-8f72-4c7d-bdd9-cecd18691cca': 'SQR',
  '38f43103-d9be-4e48-8186-0c61070eb6a1': 'SBG',
  '395e9d85-9660-4b5c-9015-0dbcd37ce194': 'HMM',
  '39d25a22-dea4-41b1-8af0-c55e501b715c': 'COD',
  '413a7363-c51e-46e0-8b71-a48054dcae1d': 'BON',
  '47bdcecf-fe46-4d5e-a4b2-304820c56367': 'SLM',
  '4b81f63b-655c-44b1-ac06-c2b13dd41b13': 'BRB',
  '52fee867-bd14-4cd2-8904-f368c9097c01': 'TUR',
  '64768e97-9b31-4a15-977b-ba31d79f104b': 'SPR',
  '649d843b-afcb-4c0f-b2a8-de537b76f9d7': 'MUR',
  '6584ac8d-15a1-43bd-a3b3-8d45bc482814': 'BLU',
  '680e1bcb-8d4c-45a6-bd8a-fd95e14a75c9': 'SDS',
  '70083afd-7e2c-4ebf-aa3e-9ce079647c83': 'MAC',
  '74a25287-ab66-41b2-bc6d-2807ce4d301f': 'LTA',
  '77553fff-3979-4f02-a16a-61f0a01c261f': 'GUU',
  '7d5e3175-325e-4173-bf73-20cfa8149027': 'PLE',
  '7f00612a-ce1c-4380-b227-2d0ec5bc715c': 'SMD',
  '80bed2d4-d4be-4c67-a39c-b53071cfa116': 'TBR',
  '80f9836a-acb6-4f89-b35d-44c94bb2f37c': 'CBR',
  '873477c5-2b2b-448a-a17c-f2c8bcf95c69': 'CTC',
  '8773301c-08ad-4177-a8a9-0f0e89f13b6d': 'LIN',
  '8c694860-f6d6-4ab1-a0b5-3a482f4afb6a': 'MGR',
  '8dacb86b-5b01-4391-b1b6-e0a35188c0d6': 'RSE',
  '8e08ef70-183e-42a3-a24d-55d248ca5fd2': 'HOM',
  '8f1bf333-53cd-46e8-823b-34bb120d81c9': 'FLE',
  '8f333815-a1f5-4be4-a491-705e44c0a304': 'SPU',
  '904940ce-5da7-40ea-af74-389716e180ef': 'GPW',
  '926a1d0c-8452-4691-bb5c-d23f13934181': 'GUG',
  '956ae44a-17a7-4ba2-b122-9f7c4031d9c9': 'AMB',
  '9862dffd-13e4-4e7e-a50d-93c4b4794c01': 'ABZ',
  'a4d859a8-31f5-4079-8d7b-435090a64ebc': 'BSS',
  'aa12f55e-c4fb-4be1-9011-d27e29e3b149': 'COE',
  'acff734e-fc96-4fc3-b158-803bd4e9342e': 'TRS',
  'b2e31ceb-aa7b-4f90-aedb-5a0b5e6edce3': 'OCC',
  'bb4f2007-01e3-40cc-8494-402ab42f1468': 'RJE',
  'bcefa338-ee77-4d40-8939-14e16e12c236': 'RJC',
  'c2e84f33-060e-4240-8ff4-126691676371': 'GPD',
  'c3688abd-716a-4c15-8023-dbb22191f07a': 'LEE',
  'c8d0c3f8-67a4-4722-9911-b96c64a288fb': 'DAB',
  'cdec14dc-1717-4c71-908c-8f4bdce40ba3': 'HAD',
  'cdff3a7d-13c1-43ab-8b4c-026fea407846': 'MLR',
  'cfdb7cb9-093f-466c-b52f-7eb3ce4b2236': 'JOD',
  'd19bf161-8459-4ff7-8677-6be6f40ee2b4': 'USI',
  'd405f530-839c-4a1f-9eb8-1aab0737c6e0': 'PAC',
  'd93860a9-b51f-464e-b448-f31016783658': 'SOL',
  'dbe7a1c9-29f9-4620-b5dc-60376973a158': 'SYT',
  'de0e3718-6ff7-42cc-a446-af6198ebf9b6': 'GAR',
  'de8827c0-ead9-485e-a96b-68d6fcb54b24': 'MEG',
  'e2047506-3a07-4b7b-887a-78678c790855': 'MUF',
  'e6564b80-fb7c-4920-b852-3f7d224e340a': 'BVV',
  'e6c1fac9-8e11-4447-81a5-fea7306cb6df': 'GUR',
  'ed21d6cd-cf25-4e41-bcf2-cec413186df4': 'SYC',
  'ed70b779-68c8-4f71-a6c9-3a0454cd881b': 'WHG',
  'ee20edc8-ab67-4494-b083-f8a5702e4241': 'RJM',
  'ee694f1d-353f-421b-846f-fda1b83dedf6': 'BOG',
  'f0d5a23f-6688-4bb7-a071-073eec8b65c6': 'SWA',
  'f55d6f7a-92d6-405c-a7b9-538229ac9a4b': 'RJU',
  'f863e87c-0883-4c07-a896-790bb3b37d16': 'BLL',
  'f9663a72-68d2-4978-ab35-1d1da19c154d': 'POL',
  'fa7ffbc6-334d-4f73-869c-cbb0179813e6': 'ENX',
  'fb41c21b-d0c6-4630-9a03-43bcbcddc5bc': 'HER',
  'fecf4bb2-f522-4484-b349-6af516ecf70d': 'DEC',
};

async function compareCode() {
  console.log('🔍 Comparing Current Codes vs FAO 3-Alpha Codes\n');
  console.log('='.repeat(80));

  const { data: species, error } = await supabase
    .from('species')
    .select('id, species_code, name_en')
    .order('species_code');

  if (error) {
    console.error('❌ Error fetching species:', error);
    process.exit(1);
  }

  const matches: string[] = [];
  const differences: Array<{ name: string; current: string; fao: string }> = [];
  const noFaoCode: string[] = [];

  species?.forEach(s => {
    const faoCode = faoCodeMap[s.id];
    
    if (!faoCode) {
      noFaoCode.push(`${s.name_en} (${s.species_code})`);
      return;
    }

    if (s.species_code === faoCode) {
      matches.push(`${s.species_code} - ${s.name_en}`);
    } else {
      differences.push({
        name: s.name_en,
        current: s.species_code,
        fao: faoCode
      });
    }
  });

  console.log('\n✅ EXACT MATCHES (Current code = FAO code):');
  console.log(`Total: ${matches.length}\n`);
  matches.slice(0, 10).forEach(m => console.log(`  ${m}`));
  if (matches.length > 10) {
    console.log(`  ... and ${matches.length - 10} more`);
  }

  console.log('\n');
  console.log('=' .repeat(80));
  console.log('\n⚠️  DIFFERENCES (Current code ≠ FAO code):');
  console.log(`Total: ${differences.length}\n`);
  
  if (differences.length > 0) {
    console.log('Current Code → FAO Code | Species Name');
    console.log('-'.repeat(80));
    differences.forEach(d => {
      console.log(`${d.current.padEnd(12)} → ${d.fao.padEnd(12)} | ${d.name}`);
    });
  }

  if (noFaoCode.length > 0) {
    console.log('\n');
    console.log('=' .repeat(80));
    console.log('\n❓ NO FAO CODE PROVIDED:');
    console.log(`Total: ${noFaoCode.length}\n`);
    noFaoCode.forEach(s => console.log(`  ${s}`));
  }

  console.log('\n');
  console.log('=' .repeat(80));
  console.log('\n📊 SUMMARY:\n');
  console.log(`  Total species: ${species?.length || 0}`);
  console.log(`  Exact matches: ${matches.length} (${Math.round(matches.length / (species?.length || 1) * 100)}%)`);
  console.log(`  Differences: ${differences.length} (${Math.round(differences.length / (species?.length || 1) * 100)}%)`);
  console.log(`  No FAO code: ${noFaoCode.length}`);

  console.log('\n');
  console.log('=' .repeat(80));
  console.log('\n💡 RECOMMENDATION:\n');
  
  if (differences.length === 0) {
    console.log('  ✅ All codes match FAO standards!');
    console.log('  → Add FAO codes as separate column for future-proofing');
    console.log('  → Keep current species_code as-is (already correct)');
  } else if (differences.length < 10) {
    console.log('  ⚠️  Minor differences detected');
    console.log('  → Option A: Add FAO as separate column (safer, maintains current system)');
    console.log('  → Option B: Update species_code to match FAO (breaking change)');
  } else {
    console.log('  ⚠️  Significant differences detected');
    console.log('  → STRONGLY RECOMMEND: Add FAO as separate column');
    console.log('  → Keep species_code as your internal identifier');
    console.log('  → Use fao_3alpha_code_unique for official FAO lookups');
    console.log('\n  Benefits:');
    console.log('    • No breaking changes to existing code');
    console.log('    • Both codes available for different purposes');
    console.log('    • Can reference FAO data easily');
    console.log('    • Your codes may be more user-friendly');
  }

  console.log('\n');
}

compareCode();
