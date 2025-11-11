/**
 * Fish Identification Metrics Logger
 * Tracks performance and accuracy for OpenAI vs Hugging Face providers
 */

import { createClient } from '../supabase/server';
import { createLogger } from '@/lib/utils/logger';
import type { IdentificationResult } from './fishIdentificationService';

const logger = createLogger('FishID-Metrics');

export interface MetricsLogData {
  provider: 'openai' | 'huggingface';
  userId?: string | null;
  rectangleCode?: string | null;
  latencyMs: number;
  costEur: number;
  method: string;
  confidence: number;
  suggestedSpeciesId?: string | null;
  suggestedSpeciesName?: string | null;
  numCandidates: number;
  errorOccurred?: boolean;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log fish identification metrics to database
 */
export async function logIdentificationMetrics(data: MetricsLogData): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('fish_identification_metrics').insert({
      provider: data.provider,
      user_id: data.userId || null,
      rectangle_code: data.rectangleCode || null,
      latency_ms: data.latencyMs,
      cost_eur: data.costEur,
      method: data.method,
      confidence: data.confidence,
      suggested_species_id: data.suggestedSpeciesId || null,
      suggested_species_name: data.suggestedSpeciesName || null,
      num_candidates: data.numCandidates,
      error_occurred: data.errorOccurred || false,
      error_message: data.errorMessage || null,
      metadata: data.metadata || {},
    });

    if (error) {
      logger.error('Failed to log metrics:', error);
    } else {
      logger.info('Metrics logged successfully:', {
        provider: data.provider,
        method: data.method,
        latencyMs: data.latencyMs,
      });
    }
  } catch (error) {
    logger.error('Error logging metrics:', error);
    // Don't throw - metrics logging should not break the main flow
  }
}

/**
 * Helper to extract species info from identification result
 */
export function extractSpeciesInfo(result: IdentificationResult): {
  speciesId?: string | null;
  speciesName?: string | null;
} {
  if (Array.isArray(result.species)) {
    // Multiple species returned - log first one
    const first = result.species[0];
    return {
      speciesId: first?.id || null,
      speciesName: first?.name || null,
    };
  } else if (result.species) {
    // Single species
    return {
      speciesId: result.species.id || null,
      speciesName: result.species.name || null,
    };
  }

  return {
    speciesId: null,
    speciesName: null,
  };
}

/**
 * Get provider comparison stats from the database view
 */
export async function getProviderComparisonStats(days: number = 30): Promise<unknown> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('fish_identification_provider_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(days);

    if (error) {
      logger.error('Failed to fetch provider stats:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error fetching provider stats:', error);
    return null;
  }
}
