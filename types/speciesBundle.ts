/**
 * Auto-generated species bundle types
 * Generated: 2026-01-03T21:10:57.367Z
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
