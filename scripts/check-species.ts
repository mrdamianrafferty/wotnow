#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Check total species
  const { count: totalCount } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true });

  console.log(`Total species: ${totalCount}`);

  // Check species with name_en
  const { count: withNameEn } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true })
    .not('name_en', 'is', null);

  console.log(`Species with name_en: ${withNameEn}`);

  // Check species without name_en
  const { count: withoutNameEn } = await supabase
    .from('species')
    .select('*', { count: 'exact', head: true })
    .is('name_en', null);

  console.log(`Species without name_en: ${withoutNameEn}`);

  // Sample of species
  const { data: sample } = await supabase
    .from('species')
    .select('name_en, scientific_name')
    .limit(3);

  console.log('\nSample species:');
  sample?.forEach(s => console.log(`  - ${s.name_en} (${s.scientific_name})`));
}

check().catch(console.error);
