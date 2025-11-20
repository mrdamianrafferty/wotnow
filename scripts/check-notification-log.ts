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

async function check() {
  console.log('📊 Checking notification log...\n');

  // Get last 5 notification log entries
  const { data: logs, error } = await supabase
    .from('notification_log')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log('❌ No entries in notification_log table');
    return;
  }

  console.log('✅ Found', logs.length, 'recent notification(s):\n');

  for (const log of logs) {
    const time = new Date(log.sent_at).toLocaleString();
    console.log('📧', time);
    console.log('   Type:', log.notification_type);
    console.log('   Channel:', log.channel);
    console.log('   User ID:', log.user_id);
    if (log.species_id) console.log('   Species ID:', log.species_id);
    if (log.confidence_at_send) console.log('   Confidence:', log.confidence_at_send + '%');
    if (log.notification_data) {
      console.log('   Data:', JSON.stringify(log.notification_data, null, 2));
    }
    console.log('');
  }
}

check().catch(console.error);
