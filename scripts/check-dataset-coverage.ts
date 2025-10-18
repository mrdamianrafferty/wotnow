#!/usr/bin/env tsx

/**
 * Check Dataset Date Coverage
 * 
 * Queries Copernicus datasets to find their actual temporal coverage
 * and identifies which datasets are up-to-date vs stale.
 * 
 * Usage:
 *   npx tsx scripts/check-dataset-coverage.ts --rectangle=28E5
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { getRegionalProducts } from '../lib/copernicus/regionRouterV2';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DatasetCoverage {
  datasetId: string;
  variable: string;
  quality: string;
  startDate: string | null;
  endDate: string | null;
  daysOld: number | null;
  status: 'current' | 'stale' | 'very_stale' | 'unknown';
}

/**
 * Get temporal coverage for a dataset
 */
function getDatasetCoverage(datasetId: string): { start: string | null; end: string | null } {
  try {
    console.log(`  Querying ${datasetId}...`);
    const output = execSync(
      `copernicusmarine describe --include-datasets --dataset-id ${datasetId}`,
      { encoding: 'utf-8', timeout: 30000, stdio: 'pipe' }
    );
    
    // Parse temporal coverage from output
    // Look for lines like:
    // temporal_extent_start: 1997-09-04T00:00:00Z
    // temporal_extent_end: 2025-10-10T00:00:00Z
    
    const startMatch = output.match(/temporal_extent_start[:\s]+(\d{4}-\d{2}-\d{2})/);
    const endMatch = output.match(/temporal_extent_end[:\s]+(\d{4}-\d{2}-\d{2})/);
    
    return {
      start: startMatch ? startMatch[1] : null,
      end: endMatch ? endMatch[1] : null
    };
  } catch (error) {
    console.log(`  ⚠️  Could not query dataset (may require auth)`);
    return { start: null, end: null };
  }
}

/**
 * Calculate days old from end date
 */
function calculateDaysOld(endDate: string | null): number | null {
  if (!endDate) return null;
  
  const end = new Date(endDate);
  const now = new Date();
  const diffMs = now.getTime() - end.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Determine status based on age
 */
function getStatus(daysOld: number | null): 'current' | 'stale' | 'very_stale' | 'unknown' {
  if (daysOld === null) return 'unknown';
  if (daysOld <= 2) return 'current';
  if (daysOld <= 7) return 'stale';
  return 'very_stale';
}

/**
 * Get status icon
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'current': return '✅';
    case 'stale': return '⚠️';
    case 'very_stale': return '❌';
    default: return '❓';
  }
}

/**
 * Main function
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              Copernicus Dataset Coverage Check                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  // Parse args
  const args = process.argv.slice(2);
  const rectangleArg = args.find(arg => arg.startsWith('--rectangle='));
  const rectangleCode = rectangleArg ? rectangleArg.split('=')[1] : '28E5';
  
  // Get rectangle
  const { data: rectangle } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, cmems_region')
    .eq('rectangle_code', rectangleCode)
    .single();
  
  if (!rectangle) {
    console.error(`❌ Rectangle ${rectangleCode} not found`);
    process.exit(1);
  }
  
  console.log(`Rectangle: ${rectangleCode} (${rectangle.cmems_region} region)`);
  console.log(`Location: ${rectangle.center_lat}°N, ${rectangle.center_lon}°E\n`);
  
  const variables = ['chlorophyll', 'clarity', 'temperature', 'salinity', 'nitrate', 'oxygen'] as const;
  const results: DatasetCoverage[] = [];
  
  console.log('Checking dataset coverage...\n');
  
  for (const variable of variables) {
    console.log(`\n📊 ${variable.toUpperCase()}`);
    console.log('─'.repeat(60));
    
    const products = getRegionalProducts(rectangle.cmems_region, variable as any);
    
    if (products.length === 0) {
      console.log('  No products configured for this region\n');
      continue;
    }
    
    for (const product of products) {
      const coverage = getDatasetCoverage(product.datasetId);
      const daysOld = calculateDaysOld(coverage.end);
      const status = getStatus(daysOld);
      
      results.push({
        datasetId: product.datasetId,
        variable: variable,
        quality: product.quality,
        startDate: coverage.start,
        endDate: coverage.end,
        daysOld: daysOld,
        status: status
      });
      
      const icon = getStatusIcon(status);
      const daysStr = daysOld !== null ? `${daysOld} days old` : 'unknown';
      
      console.log(`  ${icon} ${product.quality.toUpperCase()}`);
      console.log(`     Dataset: ${product.datasetId}`);
      console.log(`     Coverage: ${coverage.start || '?'} to ${coverage.end || '?'}`);
      console.log(`     Status: ${daysStr}`);
      console.log();
    }
  }
  
  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                           SUMMARY                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  const current = results.filter(r => r.status === 'current');
  const stale = results.filter(r => r.status === 'stale');
  const veryStale = results.filter(r => r.status === 'very_stale');
  const unknown = results.filter(r => r.status === 'unknown');
  
  console.log(`✅ Current (≤2 days old):     ${current.length}`);
  console.log(`⚠️  Stale (3-7 days old):     ${stale.length}`);
  console.log(`❌ Very Stale (>7 days old): ${veryStale.length}`);
  console.log(`❓ Unknown:                   ${unknown.length}`);
  console.log();
  
  if (veryStale.length > 0) {
    console.log('⚠️  VERY STALE DATASETS:');
    for (const ds of veryStale) {
      console.log(`   • ${ds.variable} (${ds.quality}): ${ds.daysOld} days old (ends ${ds.endDate})`);
    }
    console.log();
  }
  
  if (stale.length > 0) {
    console.log('⚠️  STALE DATASETS:');
    for (const ds of stale) {
      console.log(`   • ${ds.variable} (${ds.quality}): ${ds.daysOld} days old (ends ${ds.endDate})`);
    }
    console.log();
  }
  
  // Recommendations
  console.log('💡 RECOMMENDATIONS:\n');
  
  if (veryStale.length > 0) {
    const oldestDate = veryStale
      .map(r => r.endDate)
      .filter((d): d is string => d !== null)
      .sort()[0];
    
    console.log(`   Use --date=${oldestDate} or earlier for guaranteed success`);
    console.log(`   Or rely on automatic 7-day fallback (already built-in)\n`);
  }
  
  if (current.length > 0) {
    console.log(`   ✅ ${current.length} datasets are current - model data likely available`);
    console.log(`   Consider fetching model variables separately from satellite\n`);
  }
  
  console.log('   Strategy: Mixed-age ingestion');
  console.log(`   • Satellite data (chlorophyll, clarity): Use ${veryStale.length > 0 ? 'D-7' : 'D-2'}`);
  console.log(`   • Model data (temp, salinity, nutrients): Use ${current.length > 0 ? 'D-1' : 'D-2'}`);
  console.log();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
