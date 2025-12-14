#!/usr/bin/env npx tsx
/**
 * Perenual Pest/Disease Sync Script
 * 
 * Enriches garden_threat table with data from Perenual's pest-disease API:
 * - Images (multiple sizes)
 * - Descriptions (additional details)
 * - Solutions (treatment info)
 * - Host plants (which plants are affected)
 * 
 * Usage:
 *   npx tsx scripts/sync-perenual-threats.ts                # Sync all threats
 *   npx tsx scripts/sync-perenual-threats.ts --force        # Re-sync all threats
 *   npx tsx scripts/sync-perenual-threats.ts --slug=aphids  # Sync single threat
 *   npx tsx scripts/sync-perenual-threats.ts --dry-run      # Preview without writing
 *   npx tsx scripts/sync-perenual-threats.ts --list         # List all Perenual pests
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import {
  getAllPestDiseases,
  findMatchingPestDisease,
  type PerenualPestDisease,
  type PerenualPestDiseaseImage,
  type PerenualPestDiseaseSection,
} from '../lib/grow/perenualApi';

// ============ Configuration ============

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!process.env.PERENUAL_API_KEY) {
  console.error('Missing PERENUAL_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============ Types ============

interface OurThreat {
  id: string;
  slug: string;
  common_name_en: string;
  scientific_name: string | null;
  card_json: ThreatCardJson;
}

interface ThreatCardJson {
  where_on_plant?: string[];
  confirmation_tips?: string[];
  prevention_bullets?: string[];
  recognition_bullets?: string[];
  treatment_pesticide_free?: string[];
  when_to_escalate_bullets?: string[];
  // Perenual enrichment
  perenual_id?: number;
  perenual_synced_at?: string;
  perenual_match_confidence?: string;
  images?: PerenualPestDiseaseImage[];
  perenual_description?: PerenualPestDiseaseSection[];
  perenual_solution?: PerenualPestDiseaseSection[];
  perenual_hosts?: string[];
  perenual_family?: string;
  perenual_other_names?: string[];
}

interface SyncStats {
  total: number;
  matched: number;
  unmatched: number;
  errors: number;
  skipped: number;
}

// ============ CLI Arguments ============

const args = process.argv.slice(2);
const forceResync = args.includes('--force');
const dryRun = args.includes('--dry-run');
const listOnly = args.includes('--list');
const singleSlug = args.find(a => a.startsWith('--slug='))?.split('=')[1];
const verbose = args.includes('--verbose') || args.includes('-v');

// ============ Helpers ============

function printPerenualEntry(entry: PerenualPestDisease) {
  console.log(`  [${entry.id}] ${entry.common_name}`);
  if (entry.scientific_name) {
    console.log(`      Scientific: ${entry.scientific_name}`);
  }
  if (entry.family) {
    console.log(`      Family: ${entry.family}`);
  }
  if (entry.host?.length) {
    console.log(`      Hosts: ${entry.host.slice(0, 5).join(', ')}${entry.host.length > 5 ? '...' : ''}`);
  }
  if (entry.images?.length) {
    console.log(`      Images: ${entry.images.length}`);
  }
}

// ============ Main Sync Logic ============

async function fetchOurThreats(): Promise<OurThreat[]> {
  let query = supabase
    .from('garden_threat')
    .select('id, slug, common_name_en, scientific_name, card_json');

  if (singleSlug) {
    query = query.eq('slug', singleSlug);
  } else if (!forceResync) {
    // Only fetch threats not yet synced (no perenual_id in card_json)
    // Can't easily filter on JSONB, so we'll filter in JS
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch threats: ${error.message}`);
  }

  if (!forceResync && !singleSlug) {
    // Filter out already synced
    return (data || []).filter(t => !t.card_json?.perenual_id);
  }

  return data || [];
}

async function syncThreat(
  threat: OurThreat,
  stats: SyncStats
): Promise<void> {
  console.log(`\n🔍 Matching: ${threat.common_name_en}`);

  try {
    // Try different search strategies
    let match: PerenualPestDisease | null = null;
    let confidence: string = 'none';
    
    // Strategy 1: Full name
    const result1 = await findMatchingPestDisease(
      threat.common_name_en,
      threat.scientific_name || undefined
    );
    
    if (result1.match && result1.confidence !== 'none') {
      match = result1.match;
      confidence = result1.confidence;
    }
    
    // Strategy 2: Try simplified name (remove parenthetical text)
    if (!match) {
      const simpleName = threat.common_name_en.replace(/\s*\([^)]*\)/g, '').trim();
      if (simpleName !== threat.common_name_en) {
        const result2 = await findMatchingPestDisease(simpleName);
        if (result2.match && result2.confidence !== 'none' && 
            ['exact', 'high'].includes(result2.confidence)) {
          match = result2.match;
          confidence = result2.confidence;
        }
      }
    }
    
    // Strategy 3: Try first word(s) only for compound names
    if (!match) {
      const words = threat.common_name_en.split(/\s+/);
      if (words.length > 1) {
        // Try first 1-2 words
        for (const tryWords of [words.slice(0, 2).join(' '), words[0]]) {
          if (tryWords.length >= 4) {
            const result3 = await findMatchingPestDisease(tryWords);
            if (result3.match && result3.confidence === 'exact') {
              match = result3.match;
              confidence = 'high'; // Downgrade since we simplified
              break;
            }
          }
        }
      }
    }

    if (!match) {
      console.log(`   ⚠️  No match found`);
      stats.unmatched++;
      return;
    }

    console.log(`   ✓ Matched: "${match.common_name}" (confidence: ${confidence})`);
    if (match.images?.length) {
      console.log(`   📷 ${match.images.length} image(s)`);
    }
    if (match.host?.length) {
      console.log(`   🌱 Hosts: ${match.host.slice(0, 3).join(', ')}${match.host.length > 3 ? '...' : ''}`);
    }

    if (dryRun) {
      console.log(`   [dry-run] Would update card_json with Perenual data`);
      stats.matched++;
      return;
    }

    // Build enriched card_json
    const enrichedCardJson: ThreatCardJson = {
      ...threat.card_json,
      perenual_id: match.id,
      perenual_synced_at: new Date().toISOString(),
      perenual_match_confidence: confidence,
      images: match.images || undefined,
      perenual_description: match.description || undefined,
      perenual_solution: match.solution || undefined,
      perenual_hosts: match.host || undefined,
      perenual_family: match.family || undefined,
      perenual_other_names: match.other_name || undefined,
    };

    // Update the threat
    const { error } = await supabase
      .from('garden_threat')
      .update({
        card_json: enrichedCardJson,
        updated_at: new Date().toISOString(),
      })
      .eq('id', threat.id);

    if (error) {
      throw new Error(`Failed to update threat: ${error.message}`);
    }

    console.log(`   ✅ Updated card_json`);
    stats.matched++;
  } catch (err) {
    console.error(`   ❌ Error:`, err);
    stats.errors++;
  }
}

async function listPerenualPestDiseases() {
  console.log('📋 Fetching all Perenual pest/disease entries...\n');
  
  const all = await getAllPestDiseases();
  
  console.log(`Found ${all.length} pest/disease entries:\n`);
  
  // Group by first letter
  const byLetter = new Map<string, PerenualPestDisease[]>();
  for (const entry of all) {
    const letter = entry.common_name[0].toUpperCase();
    if (!byLetter.has(letter)) {
      byLetter.set(letter, []);
    }
    byLetter.get(letter)!.push(entry);
  }
  
  for (const [letter, entries] of [...byLetter].sort()) {
    console.log(`\n=== ${letter} (${entries.length}) ===`);
    for (const entry of entries) {
      printPerenualEntry(entry);
    }
  }
  
  // Summary
  const withImages = all.filter(e => e.images?.length).length;
  const withHosts = all.filter(e => e.host?.length).length;
  const withSolutions = all.filter(e => e.solution?.length).length;
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total entries: ${all.length}`);
  console.log(`   With images: ${withImages} (${Math.round(withImages / all.length * 100)}%)`);
  console.log(`   With hosts: ${withHosts} (${Math.round(withHosts / all.length * 100)}%)`);
  console.log(`   With solutions: ${withSolutions} (${Math.round(withSolutions / all.length * 100)}%)`);
}

async function main() {
  console.log('🌿 Perenual Pest/Disease Sync');
  console.log('==============================');
  
  if (dryRun) {
    console.log('🔸 DRY RUN - no changes will be made\n');
  }
  
  if (listOnly) {
    await listPerenualPestDiseases();
    return;
  }
  
  // Fetch our threats
  console.log('\n📥 Fetching garden threats...');
  const threats = await fetchOurThreats();
  console.log(`   Found ${threats.length} threat(s) to sync`);
  
  if (threats.length === 0) {
    console.log('\n✅ All threats already synced! Use --force to re-sync.');
    return;
  }
  
  const stats: SyncStats = {
    total: threats.length,
    matched: 0,
    unmatched: 0,
    errors: 0,
    skipped: 0,
  };
  
  // Sync each threat
  for (const threat of threats) {
    await syncThreat(threat, stats);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Print summary
  console.log('\n==============================');
  console.log('📊 Sync Summary');
  console.log('==============================');
  console.log(`   Total processed: ${stats.total}`);
  console.log(`   ✅ Matched: ${stats.matched}`);
  console.log(`   ⚠️  Unmatched: ${stats.unmatched}`);
  console.log(`   ❌ Errors: ${stats.errors}`);
  
  if (dryRun) {
    console.log('\n🔸 DRY RUN complete - no changes were made');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
