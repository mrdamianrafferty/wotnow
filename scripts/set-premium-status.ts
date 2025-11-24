/**
 * Manually set a user's premium status for testing
 *
 * Usage: npx tsx scripts/set-premium-status.ts <user-email>
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables!');
  console.error('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const userEmail = process.argv[2];
const action = process.argv[3] || 'premium'; // 'premium' or 'free'

if (!userEmail) {
  console.error('Usage: npx tsx scripts/set-premium-status.ts <user-email> [premium|free]');
  console.error('Example: npx tsx scripts/set-premium-status.ts user@example.com premium');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Find user by email
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error('Error fetching users:', usersError);
    process.exit(1);
  }

  const user = users.find((u) => u.email === userEmail);

  if (!user) {
    console.error(`User not found: ${userEmail}`);
    console.error('Available users:');
    users.forEach((u) => console.error(`  - ${u.email}`));
    process.exit(1);
  }

  console.log(`Found user: ${user.email} (${user.id})`);

  // Update subscription status
  const isPremium = action === 'premium';
  const now = new Date().toISOString();
  const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_status: isPremium ? 'premium' : 'free',
      payment_platform: 'web',
      subscription_start_date: isPremium ? now : null,
      subscription_end_date: isPremium ? oneMonthFromNow : null,
      trial_ends_at: isPremium ? sevenDaysFromNow : null,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating profile:', updateError);
    process.exit(1);
  }

  console.log(`✅ Success! User set to: ${isPremium ? 'PREMIUM (with 7-day trial)' : 'FREE'}`);

  if (isPremium) {
    console.log(`   Trial ends: ${new Date(sevenDaysFromNow).toLocaleString()}`);
    console.log(`   Subscription ends: ${new Date(oneMonthFromNow).toLocaleString()}`);
  }

  console.log('\nNow refresh your browser to see the changes!');
}

main();
