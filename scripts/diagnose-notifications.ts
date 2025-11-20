#!/usr/bin/env tsx
/**
 * Diagnostic script to check why notifications aren't working
 *
 * Checks:
 * 1. User has notification preferences enabled
 * 2. User has favorites with notifications enabled
 * 3. User has location set
 * 4. Predictions exist for that location
 * 5. Any species crossing threshold
 * 6. Notification log (were any sent?)
 * 7. Email configuration (Resend API key)
 * 8. Cron job execution logs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function diagnose() {
  console.log('🔍 NOTIFICATION SYSTEM DIAGNOSTIC');
  console.log('='.repeat(60));

  // Check 1: Configuration
  console.log('\n1️⃣  CONFIGURATION CHECK');
  console.log('-'.repeat(60));

  console.log(`SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`RESEND_API_KEY: ${RESEND_API_KEY ? '✅ Set' : '❌ Missing'}`);

  if (!RESEND_API_KEY) {
    console.log('⚠️  WARNING: No Resend API key - emails cannot be sent!');
  }

  // Check 2: Users with notifications enabled
  console.log('\n2️⃣  USERS WITH NOTIFICATIONS ENABLED');
  console.log('-'.repeat(60));

  const { data: prefs, error: prefsError } = await supabase
    .from('user_notification_preferences')
    .select('user_id, hot_bite_alerts_enabled, daily_email_enabled')
    .or('hot_bite_alerts_enabled.eq.true,daily_email_enabled.eq.true');

  if (prefsError) {
    console.error('❌ Error:', prefsError.message);
  } else if (!prefs || prefs.length === 0) {
    console.log('❌ No users have notifications enabled!');
    console.log('   → Users need to favorite species and enable notifications');
  } else {
    console.log(`✅ Found ${prefs.length} user(s) with notifications enabled:`);
    for (const pref of prefs) {
      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(pref.user_id);
      const email = userData?.user?.email || 'unknown';

      console.log(`   • ${email}`);
      console.log(`     - Hot bite alerts: ${pref.hot_bite_alerts_enabled ? '✅' : '❌'}`);
      console.log(`     - Daily email: ${pref.daily_email_enabled ? '✅' : '❌'}`);
    }
  }

  // Check 3: Favorites with notifications enabled
  console.log('\n3️⃣  FAVORITES WITH NOTIFICATIONS ENABLED');
  console.log('-'.repeat(60));

  const { data: favs, error: favsError } = await supabase
    .from('user_favourites')
    .select('user_id, species_id, notifications_enabled')
    .eq('notifications_enabled', true);

  if (favsError) {
    console.error('❌ Error:', favsError.message);
  } else if (!favs || favs.length === 0) {
    console.log('❌ No favorites have notifications enabled!');
  } else {
    console.log(`✅ Found ${favs.length} favorite(s) with notifications enabled`);

    // Group by user
    const byUser = new Map<string, string[]>();
    for (const fav of favs) {
      const existing = byUser.get(fav.user_id) || [];
      existing.push(fav.species_id);
      byUser.set(fav.user_id, existing);
    }

    for (const [userId, species] of byUser) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email || 'unknown';
      console.log(`   • ${email}: ${species.join(', ')}`);
    }
  }

  // Check 4: User locations
  console.log('\n4️⃣  USER LOCATIONS');
  console.log('-'.repeat(60));

  if (prefs && prefs.length > 0) {
    for (const pref of prefs) {
      const { data: userData } = await supabase.auth.admin.getUserById(pref.user_id);
      const email = userData?.user?.email || 'unknown';

      const { data: location } = await supabase
        .from('user_location_preferences')
        .select('preferred_rectangles, home_region')
        .eq('user_id', pref.user_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      const rectangleCode = location?.preferred_rectangles?.[0] || location?.home_region;

      if (!rectangleCode) {
        console.log(`   ❌ ${email}: No location set`);
      } else {
        console.log(`   ✅ ${email}: ${rectangleCode}`);
      }
    }
  }

  // Check 5: Recent predictions
  console.log('\n5️⃣  RECENT PREDICTIONS');
  console.log('-'.repeat(60));

  const { data: sessions, error: sessionsError } = await supabase
    .from('findr_prediction_sessions')
    .select('rectangle_code, prediction_date, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(10);

  if (sessionsError) {
    console.error('❌ Error:', sessionsError.message);
  } else if (!sessions || sessions.length === 0) {
    console.log('❌ No prediction cache found!');
    console.log('   → Predictions API may not be working');
  } else {
    console.log(`✅ Found ${sessions.length} recent prediction sessions:`);
    for (const session of sessions.slice(0, 5)) {
      const age = Math.round((Date.now() - new Date(session.fetched_at).getTime()) / 1000 / 60);
      console.log(`   • ${session.rectangle_code} - ${session.prediction_date} (${age} min ago)`);
    }
  }

  // Check 6: Check for high confidence species (would trigger notifications)
  console.log('\n6️⃣  HIGH CONFIDENCE SPECIES (85%+)');
  console.log('-'.repeat(60));

  if (prefs && prefs.length > 0) {
    for (const pref of prefs) {
      const { data: userData } = await supabase.auth.admin.getUserById(pref.user_id);
      const email = userData?.user?.email || 'unknown';

      const { data: location } = await supabase
        .from('user_location_preferences')
        .select('preferred_rectangles, home_region')
        .eq('user_id', pref.user_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      const rectangleCode = location?.preferred_rectangles?.[0] || location?.home_region;

      if (!rectangleCode) {
        console.log(`   ⚠️  ${email}: No location to check`);
        continue;
      }

      // Get predictions
      const today = new Date().toISOString().split('T')[0];
      const { data: predictions, error: predError } = await supabase.rpc('get_fishing_predictions', {
        rectangle_code_input: rectangleCode,
        prediction_date_input: today,
        user_language: 'en'
      });

      if (predError) {
        console.log(`   ❌ ${email}: Error fetching predictions - ${predError.message}`);
        continue;
      }

      if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
        console.log(`   ⚠️  ${email}: No predictions for ${rectangleCode}`);
        continue;
      }

      // Find high confidence species
      const highConfidence = predictions.filter((p: any) => p.confidence >= 85);

      if (highConfidence.length === 0) {
        console.log(`   ℹ️  ${email}: No species above 85% threshold`);
        console.log(`      Best: ${predictions[0].species_code} at ${predictions[0].confidence}%`);
      } else {
        console.log(`   🔥 ${email}: ${highConfidence.length} species above 85%!`);
        for (const species of highConfidence.slice(0, 5)) {
          console.log(`      • ${species.species_code}: ${species.confidence}%`);
        }
      }
    }
  }

  // Check 7: Notification log
  console.log('\n7️⃣  NOTIFICATION LOG (Last 7 days)');
  console.log('-'.repeat(60));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: logs, error: logsError } = await supabase
    .from('notification_log')
    .select('sent_at, notification_type, channel, user_id')
    .gte('sent_at', sevenDaysAgo)
    .order('sent_at', { ascending: false })
    .limit(20);

  if (logsError) {
    console.error('❌ Error:', logsError.message);
  } else if (!logs || logs.length === 0) {
    console.log('❌ No notifications have been sent in the last 7 days!');
    console.log('   → This confirms notifications are NOT working');
  } else {
    console.log(`✅ Found ${logs.length} notification(s) sent:`);
    for (const log of logs.slice(0, 10)) {
      const { data: userData } = await supabase.auth.admin.getUserById(log.user_id);
      const email = userData?.user?.email || 'unknown';
      const time = new Date(log.sent_at).toLocaleString();
      console.log(`   • ${time} - ${log.notification_type} via ${log.channel} to ${email}`);
    }
  }

  // Check 8: Push tokens
  console.log('\n8️⃣  PUSH NOTIFICATION TOKENS');
  console.log('-'.repeat(60));

  const { data: tokens, error: tokensError } = await supabase
    .from('user_push_tokens')
    .select('user_id, platform');

  if (tokensError) {
    console.error('❌ Error:', tokensError.message);
  } else if (!tokens || tokens.length === 0) {
    console.log('ℹ️  No push tokens registered (expected - no mobile app yet)');
  } else {
    console.log(`✅ Found ${tokens.length} push token(s):`);
    for (const token of tokens) {
      const { data: userData } = await supabase.auth.admin.getUserById(token.user_id);
      const email = userData?.user?.email || 'unknown';
      console.log(`   • ${email} (${token.platform})`);
    }
  }

  // Summary
  console.log('\n📊 SUMMARY');
  console.log('='.repeat(60));

  const issues: string[] = [];
  const warnings: string[] = [];

  if (!RESEND_API_KEY) issues.push('No Resend API key configured');
  if (!prefs || prefs.length === 0) issues.push('No users have notifications enabled');
  if (!favs || favs.length === 0) issues.push('No favorites have notifications enabled');
  if (!logs || logs.length === 0) warnings.push('No notifications sent in last 7 days');
  if (!sessions || sessions.length === 0) issues.push('No prediction cache found');

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ Everything looks configured correctly!');
    console.log('   → Check Vercel logs for cron execution');
    console.log('   → Check Resend dashboard for email delivery');
  } else {
    if (issues.length > 0) {
      console.log('❌ CRITICAL ISSUES FOUND:');
      issues.forEach(issue => console.log(`   • ${issue}`));
    }
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach(warning => console.log(`   • ${warning}`));
    }
  }

  console.log('\n💡 NEXT STEPS:');
  if (!RESEND_API_KEY) {
    console.log('   1. Set RESEND_API_KEY in Vercel environment variables');
  }
  if (!prefs || prefs.length === 0) {
    console.log('   1. Sign up and enable notifications in app');
    console.log('   2. Favorite some species');
  }
  if (!logs || logs.length === 0) {
    console.log('   1. Check Vercel cron logs: /api/cron/check-notifications');
    console.log('   2. Manually trigger cron to test');
    console.log('   3. Check for errors in Vercel logs');
  }

  console.log('\n');
}

diagnose().catch(console.error);
