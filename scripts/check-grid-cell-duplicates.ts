#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate grid cell mappings...\n');

  const { data } = await supabase
    .from('grid_025deg_ices_xref')
    .select('cell_id, rectangle_code');

  if (!data) {
    console.error('No data found');
    return;
  }

  // Count how many rectangles map to each grid cell
  const cellCounts = new Map<string, number>();
  const cellRectangles = new Map<string, string[]>();

  data.forEach(row => {
    const count = cellCounts.get(row.cell_id) || 0;
    cellCounts.set(row.cell_id, count + 1);

    const rects = cellRectangles.get(row.cell_id) || [];
    rects.push(row.rectangle_code);
    cellRectangles.set(row.cell_id, rects);
  });

  const duplicates = Array.from(cellCounts.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  console.log(`Total grid cells: ${cellCounts.size}`);
  console.log(`Grid cells with multiple ICES rectangles: ${duplicates.length}\n`);

  if (duplicates.length > 0) {
    console.log('Top 10 grid cells with most rectangles:');
    duplicates.slice(0, 10).forEach(([cell_id, count]) => {
      const rects = cellRectangles.get(cell_id)!.join(', ');
      console.log(`  ${cell_id}: ${count} rectangles (${rects})`);
    });
  }
}

checkDuplicates();
