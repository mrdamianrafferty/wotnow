/**
 * Check EXIF Timestamps in Recent Catches
 *
 * Verifies what timestamp data is actually being extracted from photos
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExifTimestamps() {
  console.log('🔍 Checking EXIF timestamps in recent catches...\n');

  // Get recent catches with photos
  const { data: catches, error } = await supabase
    .from('findr_catch_entries')
    .select('id, species_common_name, caught_at, photo_urls, gps_latitude, gps_longitude')
    .not('photo_urls', 'is', null)
    .order('caught_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching catches:', error);
    return;
  }

  if (!catches || catches.length === 0) {
    console.log('No catches with photos found');
    return;
  }

  console.log(`Found ${catches.length} recent catches with photos:\n`);

  for (const catchEntry of catches) {
    const caughtAt = new Date(catchEntry.caught_at);

    console.log(`Catch ID: ${catchEntry.id}`);
    console.log(`  Species: ${catchEntry.species_common_name}`);
    console.log(`  Caught At: ${catchEntry.caught_at}`);
    console.log(`  Date: ${caughtAt.toLocaleDateString()}`);
    console.log(`  Time: ${caughtAt.toLocaleTimeString()}`);
    console.log(`  Has GPS: ${catchEntry.gps_latitude ? 'Yes' : 'No'}`);
    console.log(`  Photo URLs: ${catchEntry.photo_urls ? 'Yes' : 'No'}`);

    // Check if time is midnight (00:00:00) or close to it
    const hours = caughtAt.getUTCHours();
    const minutes = caughtAt.getUTCMinutes();
    const seconds = caughtAt.getUTCSeconds();

    if (hours === 0 && minutes === 0 && seconds === 0) {
      console.log(`  ⚠️  WARNING: Time is exactly midnight (likely no EXIF time)`);
    } else if (hours === 1 && minutes === 0) {
      console.log(`  ⚠️  WARNING: Time is 01:00 (possibly default/timezone issue)`);
    } else if (hours === 13 && minutes === 0) {
      console.log(`  ⚠️  WARNING: Time is 13:00 (possibly default/timezone issue)`);
    } else {
      console.log(`  ✅ Time looks realistic (${hours}:${minutes}:${seconds} UTC)`);
    }

    console.log('');
  }
}

checkExifTimestamps()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
