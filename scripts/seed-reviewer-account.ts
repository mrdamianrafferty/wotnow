/**
 * Seed an App Store reviewer account for Grow Daisy.
 *
 * Creates reviewer@godaisy.io, copies the current user's plants,
 * sets location to Palo Alto, and marks onboarding complete.
 *
 * Usage: npx tsx scripts/seed-reviewer-account.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const REVIEWER_EMAIL = 'reviewer@godaisy.io';
const REVIEWER_PASSWORD = '4ppstoreReview';

// Palo Alto, CA
const PALO_ALTO = { lat: 37.4419, lon: -122.143 };
const PALO_ALTO_NAME = 'Palo Alto, California, USA';

async function main() {
  // 1. Find the owner's user ID (user with the most plants)
  console.log('Finding your user ID...');
  const { data: allPlants } = await supabase
    .from('grow_user_plants')
    .select('user_id');

  if (!allPlants?.length) {
    console.error('No plants found in grow_user_plants. Cannot determine source user.');
    process.exit(1);
  }

  const counts: Record<string, number> = {};
  for (const p of allPlants) {
    counts[p.user_id] = (counts[p.user_id] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const sourceUserId = sorted[0][0];
  console.log(`Source user ID: ${sourceUserId} (${sorted[0][1]} plants)`);

  // 2. Check if reviewer account already exists
  console.log(`\nChecking for existing reviewer account (${REVIEWER_EMAIL})...`);
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingReviewer = existingUsers?.users?.find(u => u.email === REVIEWER_EMAIL);

  let reviewerUserId: string;

  if (existingReviewer) {
    console.log(`Reviewer account already exists: ${existingReviewer.id}`);
    reviewerUserId = existingReviewer.id;

    // Update password in case it changed
    await supabase.auth.admin.updateUserById(reviewerUserId, {
      password: REVIEWER_PASSWORD,
    });
    console.log('Updated password');

    // Clear existing plants so we get a fresh copy
    const { error: delErr } = await supabase
      .from('grow_user_plants')
      .delete()
      .eq('user_id', reviewerUserId);
    if (delErr) console.warn('Warning: could not clear old plants:', delErr.message);
    else console.log('Cleared existing reviewer plants');
  } else {
    // 3. Create the reviewer account
    // First, pre-create the profile to avoid trigger issues
    console.log(`Creating reviewer account: ${REVIEWER_EMAIL}`);

    // Try admin.createUser
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: REVIEWER_EMAIL,
      password: REVIEWER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'App Reviewer', name: 'App Reviewer' },
    });

    if (authError) {
      console.error('admin.createUser failed:', authError.message, authError.status);

      // The trigger might be failing. Try creating via Supabase Auth REST API directly
      console.log('Trying direct REST API...');
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          email: REVIEWER_EMAIL,
          password: REVIEWER_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: 'App Reviewer', name: 'App Reviewer' },
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        console.error('REST API also failed:', res.status, JSON.stringify(body, null, 2));

        // Last resort: check Supabase dashboard logs
        console.error('\nThe database trigger `handle_new_user` is likely failing.');
        console.error('Check Supabase Dashboard > Database > Logs for the exact error.');
        console.error('You may need to create the account manually in the Supabase Auth dashboard.');
        process.exit(1);
      }

      reviewerUserId = body.id;
      console.log(`Created reviewer user via REST: ${reviewerUserId}`);
    } else {
      reviewerUserId = authData.user!.id;
      console.log(`Created reviewer user: ${reviewerUserId}`);
    }
  }

  // 4. Ensure profile exists (in case trigger failed silently)
  console.log('\nEnsuring profile exists...');
  const { error: profileUpsertErr } = await supabase
    .from('profiles')
    .upsert({
      id: reviewerUserId,
      email: REVIEWER_EMAIL,
      name: 'App Reviewer',
      grow_onboarding_completed: true,
      grow_onboarding_completed_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (profileUpsertErr) {
    console.warn('Profile upsert warning:', profileUpsertErr.message);
  } else {
    console.log('Profile ready, onboarding marked complete');
  }

  // 5. Fetch source user's plants
  console.log(`\nFetching plants from source user...`);
  const { data: sourcePlants, error: plantErr } = await supabase
    .from('grow_user_plants')
    .select('*')
    .eq('user_id', sourceUserId);

  if (plantErr) {
    console.error('Failed to fetch plants:', plantErr.message);
    process.exit(1);
  }

  console.log(`Found ${sourcePlants?.length ?? 0} plants to copy`);

  // 6. Copy plants to reviewer account
  if (sourcePlants?.length) {
    const plantInserts = sourcePlants.map(plant => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, user_id, created_at, updated_at, ...rest } = plant;
      return {
        ...rest,
        user_id: reviewerUserId,
      };
    });

    const { data: inserted, error: insertErr } = await supabase
      .from('grow_user_plants')
      .insert(plantInserts)
      .select('id, name');

    if (insertErr) {
      console.error('Failed to insert plants:', insertErr.message);
    } else {
      console.log(`Copied ${inserted?.length} plants:`);
      inserted?.forEach(p => console.log(`  - ${p.name}`));
    }
  }

  // 7. Set location to Palo Alto
  console.log(`\nSetting location to ${PALO_ALTO_NAME}...`);
  const { error: locErr } = await supabase
    .from('user_location_preferences')
    .upsert({
      user_id: reviewerUserId,
      home_coordinates: PALO_ALTO,
      home_place_name: PALO_ALTO_NAME,
      home_location_name: PALO_ALTO_NAME,
      location_source: 'manual',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (locErr) {
    console.error('Failed to set location:', locErr.message);
  } else {
    console.log('Location set successfully');
  }

  // 8. Summary
  console.log('\n========================================');
  console.log('REVIEWER ACCOUNT READY');
  console.log('========================================');
  console.log(`Email:    ${REVIEWER_EMAIL}`);
  console.log(`Password: ${REVIEWER_PASSWORD}`);
  console.log(`User ID:  ${reviewerUserId}`);
  console.log(`Location: ${PALO_ALTO_NAME} (${PALO_ALTO.lat}, ${PALO_ALTO.lon})`);
  console.log(`Plants:   ${sourcePlants?.length ?? 0} copied`);
  console.log('========================================');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
