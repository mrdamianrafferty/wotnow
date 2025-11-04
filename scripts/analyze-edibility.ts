#!/usr/bin/env tsx
/**
 * Analyze Edibility Data in Species Table
 *
 * Examines the current state of eating_quality ratings and identifies contradictions
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.cli') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function analyzeEdibility() {
  console.log('📊 Analyzing Edibility Data in Species Table\n');

  // Get all species with edibility data
  const { data, error } = await supabase
    .from('species')
    .select('id, name_en, scientific_name, eating_quality')
    .order('name_en');

  if (error) {
    console.error('❌ Error fetching species:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('❌ No species found');
    process.exit(1);
  }

  console.log(`✅ Found ${data.length} total species\n`);

  // Separate species with and without ratings
  const withEdibility = data.filter(s => s.eating_quality !== null && s.eating_quality !== undefined);
  const withoutEdibility = data.filter(s => s.eating_quality === null || s.eating_quality === undefined);

  console.log('📈 Coverage:');
  console.log(`  - Species with eating_quality: ${withEdibility.length} (${Math.round(withEdibility.length / data.length * 100)}%)`);
  console.log(`  - Species without eating_quality: ${withoutEdibility.length} (${Math.round(withoutEdibility.length / data.length * 100)}%)\n`);

  // Show rating distribution
  const ratingCounts: Record<number, number> = {};
  withEdibility.forEach(s => {
    const rating = Math.round(s.eating_quality);
    ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
  });

  console.log('📊 Rating Distribution (1-10):');
  for (let i = 1; i <= 10; i++) {
    const count = ratingCounts[i] || 0;
    const bar = '█'.repeat(Math.ceil(count / 2));
    const pct = withEdibility.length > 0 ? Math.round(count / withEdibility.length * 100) : 0;
    console.log(`  ${i}/10: ${bar} ${count} species (${pct}%)`);
  }

  // Show top rated species
  console.log('\n🌟 Top Rated Species (9-10/10):');
  const topRated = withEdibility
    .filter(s => s.eating_quality >= 9)
    .sort((a, b) => b.eating_quality - a.eating_quality)
    .slice(0, 15);

  if (topRated.length === 0) {
    console.log('  (None found)');
  } else {
    topRated.forEach(s => {
      console.log(`  - ${s.name_en}: ${s.eating_quality.toFixed(1)}/10`);
    });
  }

  // Show bottom rated species
  console.log('\n⚠️  Low Rated Species (1-3/10):');
  const lowRated = withEdibility
    .filter(s => s.eating_quality <= 3)
    .sort((a, b) => a.eating_quality - b.eating_quality)
    .slice(0, 15);

  if (lowRated.length === 0) {
    console.log('  (None found)');
  } else {
    lowRated.forEach(s => {
      console.log(`  - ${s.name_en}: ${s.eating_quality.toFixed(1)}/10`);
    });
  }

  // Show mid-range species
  console.log('\n➡️  Mid-Range Species (5-6/10):');
  const midRated = withEdibility
    .filter(s => s.eating_quality >= 5 && s.eating_quality <= 6)
    .slice(0, 10);

  if (midRated.length === 0) {
    console.log('  (None found)');
  } else {
    midRated.forEach(s => {
      console.log(`  - ${s.name_en}: ${s.eating_quality.toFixed(1)}/10`);
    });
  }

  // Show species without ratings
  console.log('\n❓ Species Without Eating Quality Ratings:');
  console.log(`  Total: ${withoutEdibility.length} species`);
  console.log('  Examples:');
  withoutEdibility.slice(0, 10).forEach(s => {
    console.log(`  - ${s.name_en}${s.scientific_name ? ` (${s.scientific_name})` : ''}`);
  });
  if (withoutEdibility.length > 10) {
    console.log(`  ... and ${withoutEdibility.length - 10} more\n`);
  }

  // Statistics
  const ratings = withEdibility.map(s => s.eating_quality);
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const sorted = [...ratings].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  console.log('\n📊 Statistics:');
  console.log(`  - Average rating: ${avg.toFixed(2)}/10`);
  console.log(`  - Median rating: ${median.toFixed(2)}/10`);
  console.log(`  - Lowest rating: ${Math.min(...ratings).toFixed(1)}/10`);
  console.log(`  - Highest rating: ${Math.max(...ratings).toFixed(1)}/10`);

  console.log('\n✅ Analysis complete\n');
}

analyzeEdibility()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  });
