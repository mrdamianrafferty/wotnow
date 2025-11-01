/**
 * Check Mullet Species Setup
 * Verifies that Thin-lipped grey mullet and Golden grey mullet are properly configured
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMulletSpecies() {
  console.log('🔍 Checking Mullet species setup...\n');

  const searchTerms = [
    'Thin-lipped grey mullet',
    'Golden grey mullet',
    'Thin-lipped Gray Mullet',
    'Golden Gray Mullet',
    'Grey Mullet',
    'Gray Mullet'
  ];

  for (const term of searchTerms) {
    const { data, error } = await supabase
      .from('species')
      .select('id, species_code, name_en, slug, scientific_name')
      .ilike('name_en', `%${term}%`)
      .limit(5);

    if (error) {
      console.log(`❌ Error searching for "${term}":`, error);
    } else if (data && data.length > 0) {
      console.log(`✅ Found matches for "${term}":`);
      for (const species of data) {
        console.log(`   - ${species.name_en}`);
        console.log(`     Code: ${species.species_code}`);
        console.log(`     Slug: ${species.slug}`);
        console.log(`     Scientific: ${species.scientific_name || 'N/A'}`);

        // Check if image exists (webp format in /public/webp/)
        const imagePathWebp = path.join(process.cwd(), 'public', 'webp', `${species.slug}.webp`);
        const imagePathMobile = path.join(process.cwd(), 'public', 'webp', `${species.slug}-mobile.webp`);
        const imagePathThumb = path.join(process.cwd(), 'public', 'webp', `${species.slug}-thumb.webp`);

        const webpExists = fs.existsSync(imagePathWebp);
        const mobileExists = fs.existsSync(imagePathMobile);
        const thumbExists = fs.existsSync(imagePathThumb);

        console.log(`     Image (full): ${webpExists ? '✅ EXISTS' : '❌ MISSING'} (${species.slug}.webp)`);
        console.log(`     Image (mobile): ${mobileExists ? '✅ EXISTS' : '❌ MISSING'} (${species.slug}-mobile.webp)`);
        console.log(`     Image (thumb): ${thumbExists ? '✅ EXISTS' : '❌ MISSING'} (${species.slug}-thumb.webp)`);
        console.log('');
      }
    } else {
      console.log(`❌ No results for "${term}"\n`);
    }
  }
}

checkMulletSpecies()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
