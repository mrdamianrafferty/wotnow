#!/usr/bin/env tsx
/**
 * End-to-end test for notification system
 *
 * This test:
 * 1. Adds a species with high confidence (WHG/Whiting @ 100%) to user's favorites
 * 2. Triggers the cron job
 * 3. Checks if email was sent
 * 4. Verifies notification_log entry
 * 5. Cleans up test data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false }}
);

const TEST_USER_EMAIL = 'damian@flyglobalmusic.com';
const TEST_SPECIES_CODE = 'WHG'; // Whiting - 100% confidence in Cork Harbor

async function test() {
  console.log('🧪 NOTIFICATION SYSTEM END-TO-END TEST');
  console.log('='.repeat(60));

  // Step 1: Get user ID
  console.log('\n1️⃣  Finding user...');
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === TEST_USER_EMAIL);

  if (!user) {
    console.error('❌ User not found:', TEST_USER_EMAIL);
    process.exit(1);
  }

  console.log('✅ Found user:', user.email, `(${user.id})`);

  // Step 2: Get WHG species ID
  console.log('\n2️⃣  Finding Whiting (WHG) species...');
  const { data: species, error: speciesError } = await supabase
    .from('species')
    .select('id, species_code, name_en')
    .eq('species_code', TEST_SPECIES_CODE)
    .single();

  if (speciesError || !species) {
    console.error('❌ Error finding species:', speciesError?.message);
    process.exit(1);
  }

  console.log('✅ Found species:', species.name_en, `(${species.species_code})`);

  // Step 3: Check if already favorited
  console.log('\n3️⃣  Checking existing favorites...');
  const { data: existingFav } = await supabase
    .from('user_favourites')
    .select('id, notifications_enabled')
    .eq('user_id', user.id)
    .eq('species_id', species.id)
    .single();

  let testFavId: string;
  let wasAlreadyFavorited = false;

  if (existingFav) {
    console.log('ℹ️  Already favorited, will use existing entry');
    testFavId = existingFav.id;
    wasAlreadyFavorited = true;

    // Ensure notifications are enabled
    await supabase
      .from('user_favourites')
      .update({
        notifications_enabled: true,
        notification_threshold: 85,
        notification_channels: { push: true, email: true, sms: false }
      })
      .eq('id', testFavId);
  } else {
    // Add as favorite with notifications enabled
    console.log('➕ Adding as favorite with notifications enabled...');
    const { data: newFav, error: favError } = await supabase
      .from('user_favourites')
      .insert({
        user_id: user.id,
        species_id: species.id,
        notifications_enabled: true,
        notification_threshold: 85,
        notification_channels: { push: true, email: true, sms: false },
        notes: 'TEST FAVORITE - Auto-created by test script'
      })
      .select('id')
      .single();

    if (favError || !newFav) {
      console.error('❌ Error adding favorite:', favError?.message);
      process.exit(1);
    }

    testFavId = newFav.id;
    console.log('✅ Added favorite:', testFavId);
  }

  // Step 4: Clear recent notification log to allow fresh send
  console.log('\n4️⃣  Clearing recent notification log...');
  const { error: deleteError } = await supabase
    .from('notification_log')
    .delete()
    .eq('user_id', user.id)
    .eq('species_id', species.id);

  if (deleteError) {
    console.warn('⚠️  Could not clear log:', deleteError.message);
  } else {
    console.log('✅ Cleared recent notifications');
  }

  // Step 5: Trigger cron job
  console.log('\n5️⃣  Triggering notification cron job...');
  const CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret-local';
  const BASE_URL = 'http://localhost:3000';

  try {
    const response = await fetch(`${BASE_URL}/api/cron/check-notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });

    const data = await response.json();
    console.log('📨 Cron response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error triggering cron:', error);
    console.log('⚠️  Make sure dev server is running on port 3002');
    process.exit(1);
  }

  // Step 6: Wait a bit for processing
  console.log('\n⏳ Waiting 2 seconds for processing...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 7: Check notification log
  console.log('\n6️⃣  Checking notification log...');
  const { data: logs, error: logError } = await supabase
    .from('notification_log')
    .select('*')
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(5);

  if (logError) {
    console.error('❌ Error checking log:', logError.message);
  } else if (!logs || logs.length === 0) {
    console.log('❌ No notifications logged!');
    console.log('   This might mean:');
    console.log('   1. Confidence threshold not met (need 85%+)');
    console.log('   2. Email sending failed');
    console.log('   3. Cron job hit an error');
  } else {
    console.log('✅ Found', logs.length, 'notification(s):');
    for (const log of logs) {
      const time = new Date(log.sent_at).toLocaleString();
      console.log(`   • ${time} - ${log.notification_type} via ${log.channel}`);
      if (log.confidence_at_send) {
        console.log(`     Confidence: ${log.confidence_at_send}%`);
      }
    }
  }

  // Step 8: Cleanup (optional)
  console.log('\n7️⃣  Cleanup...');

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>(resolve => {
    if (wasAlreadyFavorited) {
      console.log('ℹ️  Species was already favorited, keeping it');
      resolve('n');
    } else {
      rl.question('Remove test favorite? (y/N): ', resolve);
    }
  });
  rl.close();

  if (answer.toLowerCase() === 'y' && !wasAlreadyFavorited) {
    await supabase
      .from('user_favourites')
      .delete()
      .eq('id', testFavId);
    console.log('✅ Removed test favorite');
  } else {
    console.log('ℹ️  Keeping test favorite');
  }

  console.log('\n✅ TEST COMPLETE');
  console.log('\n📧 Check your email inbox for notification!');
  console.log('📊 Check Resend dashboard: https://resend.com/emails');
}

test().catch(console.error);
