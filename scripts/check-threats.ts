#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: threats, count } = await supabase
    .from('garden_threats')
    .select('slug, common_name_en, threat_type, card_json', { count: 'exact' })
    .limit(15);

  console.log('Current threats count:', count);
  console.log('\nSample threats:');
  threats?.forEach(t => {
    const hasImage = !!(t.card_json as Record<string, unknown>)?.image_url;
    console.log(`  - ${t.common_name_en} | ${t.threat_type} | has image: ${hasImage}`);
  });

  // Check hosts
  const { data: hosts, count: hostCount } = await supabase
    .from('garden_threat_host')
    .select('threat_id, host_kind, host_key', { count: 'exact' })
    .limit(10);

  console.log('\nThreat-host links:', hostCount);
  hosts?.forEach(h => {
    console.log(`  - ${h.host_kind}: ${h.host_key}`);
  });
}

main().catch(console.error);
