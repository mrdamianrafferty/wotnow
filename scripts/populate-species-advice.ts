#!/usr/bin/env tsx
/**
 * Populate Supabase species table with hardcoded advice data
 *
 * This script reads the high-quality hardcoded advice from speciesAdviceData.json
 * and populates the database advice, conservation_status, fun_fact, and eating_quality fields.
 */

import speciesAdviceData from '../data/speciesAdviceData.json';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ContextData {
  regions: string;
  bestTime: string;
  tideSensitivity: string;
  favouriteBaits: string;
  naturalDiet: string;
  temperature: string;
  weather: string;
  distance: string;
  edibility: number | null;
  restrictions: string;
  authority: string;
}

interface AdviceEntry {
  name: string;
  normalized: string;
  contexts: {
    shore?: ContextData;
    boat?: ContextData;
  };
  conservation: string;
  funFact: string;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function convertContextToDbFormat(context: ContextData) {
  return {
    regions: context.regions,
    best_time: context.bestTime,
    tide_sensitivity: context.tideSensitivity,
    baits_diet: context.favouriteBaits,
    temperature_effect: context.temperature,
    weather_effect: context.weather,
    distance_depth: context.distance,
    restrictions: context.restrictions,
    authority: context.authority,
  };
}

async function main() {
  console.log('🐟 Populating species advice from hardcoded data...\n');

  const entries = speciesAdviceData as AdviceEntry[];
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const entry of entries) {
    const normalized = normalizeName(entry.normalized || entry.name);

    // Build advice JSONB object
    const advice: any = {};
    if (entry.contexts.shore) {
      advice.shore = convertContextToDbFormat(entry.contexts.shore);
    }
    if (entry.contexts.boat) {
      advice.boat = convertContextToDbFormat(entry.contexts.boat);
    }

    // Get eating quality from shore context (or boat if shore not available)
    const eatingQuality = entry.contexts.shore?.edibility ?? entry.contexts.boat?.edibility ?? null;

    try {
      // Find species by normalized name (try name_en match)
      const { data: species, error: fetchError } = await supabase
        .from('species')
        .select('id, species_code, name_en')
        .ilike('name_en', entry.name)
        .limit(1)
        .single();

      if (fetchError || !species) {
        // Try by normalized species_code
        const { data: speciesByCode, error: fetchError2 } = await supabase
          .from('species')
          .select('id, species_code, name_en')
          .eq('species_code', normalized)
          .limit(1)
          .single();

        if (fetchError2 || !speciesByCode) {
          console.log(`⚠️  Species not found: ${entry.name} (${normalized})`);
          notFound++;
          continue;
        }

        // Update species found by code (just update advice JSONB field)
        const { error: updateError } = await supabase
          .from('species')
          .update({
            advice,
          })
          .eq('id', speciesByCode.id);

        if (updateError) {
          console.error(`❌ Error updating ${entry.name}:`, updateError.message);
          errors++;
        } else {
          console.log(`✅ Updated: ${entry.name} (${speciesByCode.species_code})`);
          updated++;
        }
        continue;
      }

      // Update species (just update advice JSONB field)
      const { error: updateError } = await supabase
        .from('species')
        .update({
          advice,
        })
        .eq('id', species.id);

      if (updateError) {
        console.error(`❌ Error updating ${entry.name}:`, updateError.message);
        errors++;
      } else {
        console.log(`✅ Updated: ${entry.name} (${species.species_code})`);
        updated++;
      }
    } catch (err) {
      console.error(`❌ Unexpected error for ${entry.name}:`, err);
      errors++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Updated: ${updated}`);
  console.log(`⚠️  Not found: ${notFound}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📝 Total processed: ${entries.length}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
