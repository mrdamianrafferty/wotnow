/**
 * Generate Static Species Bundle
 *
 * Fetches all species data from Supabase and creates a static JSON bundle
 * that can be embedded in the app for offline use.
 *
 * Run: npx tsx scripts/generate-species-bundle.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SpeciesData {
  id: string;
  species_code: string;
  slug: string;
  scientific_name: string;
  name_en: string;
  name_fr?: string;
  name_es?: string;
  name_de?: string;
  name_it?: string;
  name_pt?: string;
  playful_bio_en?: string;
  fun_fact?: string;
  eating_quality?: number;
  conservation_status?: string;
  guild: string;
  min_depth?: number;
  max_depth?: number;
  temp_opt_c?: number;
  aliases?: string[];
  advice?: Record<string, unknown>;
  best_times?: string[];
  recommended_baits?: string[];
  species_badges?: string[];
}

async function generateSpeciesBundle() {
  console.log('Fetching species from Supabase...');

  const { data: species, error } = await supabase
    .from('species')
    .select(`
      id,
      species_code,
      slug,
      scientific_name,
      name_en,
      name_fr,
      name_es,
      name_de,
      name_it,
      name_pt,
      playful_bio_en,
      fun_fact,
      eating_quality,
      conservation_status,
      guild,
      min_depth,
      max_depth,
      temp_opt_c,
      aliases,
      advice,
      best_times,
      recommended_baits,
      species_badges
    `)
    .order('name_en');

  if (error) {
    console.error('Error fetching species:', error);
    process.exit(1);
  }

  if (!species || species.length === 0) {
    console.error('No species found');
    process.exit(1);
  }

  console.log(`Found ${species.length} species`);

  // Load advice data
  const adviceDataPath = path.join(process.cwd(), 'data', 'speciesAdviceData.json');
  let adviceData: Array<{
    name: string;
    normalized: string;
    contexts: Record<string, unknown>;
    conservation?: string;
    funFact?: string;
  }> = [];

  if (fs.existsSync(adviceDataPath)) {
    adviceData = JSON.parse(fs.readFileSync(adviceDataPath, 'utf-8'));
    console.log(`Loaded ${adviceData.length} advice entries`);
  }

  // Create advice lookup by slug
  const adviceLookup = new Map(adviceData.map(a => [a.normalized, a]));

  // Enrich species with advice data
  const enrichedSpecies = species.map((s: SpeciesData) => {
    const advice = adviceLookup.get(s.slug);
    return {
      ...s,
      // Add advice contexts if not already present
      adviceContexts: advice?.contexts || s.advice || null,
      // Add additional fun facts
      additionalFunFact: advice?.funFact || null,
      // Image URL for pre-caching
      imageUrl: `/PNGS/${s.slug}.webp`,
    };
  });

  // Create the bundle
  const bundle = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    count: enrichedSpecies.length,
    species: enrichedSpecies,
    // Create lookup maps for quick access
    byCode: Object.fromEntries(enrichedSpecies.map(s => [s.species_code, s])),
    bySlug: Object.fromEntries(enrichedSpecies.map(s => [s.slug, s])),
    // List of all image URLs for pre-caching
    imageUrls: enrichedSpecies.map(s => `/PNGS/${s.slug}.webp`),
    // Guild groupings
    byGuild: enrichedSpecies.reduce((acc, s) => {
      const guild = s.guild || 'unknown';
      if (!acc[guild]) acc[guild] = [];
      acc[guild].push(s.species_code);
      return acc;
    }, {} as Record<string, string[]>),
  };

  // Write the bundle
  const outputPath = path.join(process.cwd(), 'data', 'species-bundle.json');
  fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2));
  console.log(`Written to ${outputPath}`);

  // Also create a minified version for production
  const minifiedPath = path.join(process.cwd(), 'data', 'species-bundle.min.json');
  fs.writeFileSync(minifiedPath, JSON.stringify(bundle));

  const size = fs.statSync(outputPath).size;
  const minSize = fs.statSync(minifiedPath).size;
  console.log(`Bundle size: ${(size / 1024).toFixed(1)}KB (${(minSize / 1024).toFixed(1)}KB minified)`);

  // Create TypeScript types file
  const typesContent = `/**
 * Auto-generated species bundle types
 * Generated: ${new Date().toISOString()}
 */

export interface BundledSpecies {
  id: string;
  species_code: string;
  slug: string;
  scientific_name: string;
  name_en: string;
  name_fr?: string;
  name_es?: string;
  name_de?: string;
  name_it?: string;
  name_pt?: string;
  playful_bio_en?: string;
  fun_fact?: string;
  eating_quality?: number;
  conservation_status?: string;
  guild: string;
  min_depth?: number;
  max_depth?: number;
  temp_opt_c?: number;
  aliases?: string[];
  advice?: Record<string, unknown>;
  best_times?: string[];
  recommended_baits?: string[];
  species_badges?: string[];
  adviceContexts?: Record<string, unknown>;
  additionalFunFact?: string;
  imageUrl: string;
}

export interface SpeciesBundle {
  version: string;
  generatedAt: string;
  count: number;
  species: BundledSpecies[];
  byCode: Record<string, BundledSpecies>;
  bySlug: Record<string, BundledSpecies>;
  imageUrls: string[];
  byGuild: Record<string, string[]>;
}
`;

  const typesPath = path.join(process.cwd(), 'types', 'speciesBundle.ts');
  fs.writeFileSync(typesPath, typesContent);
  console.log(`Types written to ${typesPath}`);

  console.log('\nDone! Species bundle generated successfully.');
}

generateSpeciesBundle().catch(console.error);
