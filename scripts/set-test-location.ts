#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false }}
);

async function setLocation() {
  // Get your user ID
  const { data: userData } = await supabase.auth.admin.listUsers();
  const user = userData.users.find(u => u.email === 'damian@flyglobalmusic.com');

  if (!user) {
    console.log('❌ User not found');
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (${user.id})`);

  // Set Cork Harbor (31E8) as test location using correct schema
  const { error } = await supabase
    .from('user_location_preferences')
    .upsert({
      user_id: user.id,
      preferred_rectangles: ['31E8'],
      home_region: '31E8',
      home_place_name: 'Cork Harbor (Test)',
      home_coordinates: { lat: 51.85, lon: -8.28 },
      location_source: 'manual',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('✅ Location set to Cork Harbor (ICES rectangle 31E8)');
    console.log('✅ Now run: npx tsx scripts/diagnose-notifications.ts');
  }
}

setLocation();
