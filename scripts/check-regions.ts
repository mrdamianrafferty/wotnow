#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('region, rectangle_code, center_lat, center_lon')
    .order('region');
  
  if (error) {
    console.error(error);
    return;
  }
  
  const byRegion: Record<string, any[]> = {};
  data.forEach(r => {
    if (!byRegion[r.region]) byRegion[r.region] = [];
    byRegion[r.region].push(r);
  });
  
  console.log('\n📍 ICES Rectangles by Region:\n');
  console.log('=' .repeat(70));
  
  Object.entries(byRegion).forEach(([region, rects]) => {
    console.log(`\n${region}: ${rects.length} rectangles`);
    console.log(`  Sample: ${rects[0].rectangle_code} (${rects[0].center_lat}, ${rects[0].center_lon})`);
    if (rects.length > 1) {
      console.log(`  Last:   ${rects[rects.length-1].rectangle_code} (${rects[rects.length-1].center_lat}, ${rects[rects.length-1].center_lon})`);
    }
  });
  
  console.log('\n' + '='.repeat(70));
  console.log(`Total: ${data.length} rectangles across ${Object.keys(byRegion).length} regions\n`);
}

main().catch(console.error);
