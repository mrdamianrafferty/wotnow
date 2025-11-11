/**
 * Hugging Face Fish Identification Service
 * =========================================
 *
 * Free, self-hosted fish identification using Hugging Face models:
 * - jeemsterri/fish_classification (ViT-base, ~99% lab accuracy)
 * - Fish-Vista dataset (4,154 species coverage)
 *
 * Benefits vs OpenAI:
 * - Cost: $0/month vs $50/month (100% savings)
 * - Specialized: Trained specifically on fish images
 * - Fine-tunable: Can train on European species
 * - Privacy: Images never leave your infrastructure
 * - No rate limits: Only constrained by your compute
 *
 * Integration:
 * 1. Install: npm install @xenova/transformers
 * 2. Use in API route: await hfFishService.identify(imageFile, context)
 * 3. Returns: species matches mapped to Supabase species table
 */

import { createLogger } from '@/lib/utils/logger';
import type { QuickLogSpecies } from '@/hooks/useQuickLogSpecies';
import type { CatchContext, IdentificationResult } from './fishIdentificationService';

const logger = createLogger('HF-FishID');

// ============================================================================
// Types
// ============================================================================

interface HFPrediction {
  label: string;
  score: number;
}

interface HFModelOutput {
  predictions: HFPrediction[];
  inferenceTime: number;
  modelName: string;
}

// ============================================================================
// Hugging Face Fish Service
// ============================================================================

class HuggingFaceFishService {
  private pipeline: any = null;
  private initialized: boolean = false;
  private modelName: string = 'jeemsterri/fish_classification';

  // Performance tracking
  private totalInferences: number = 0;
  private totalInferenceTime: number = 0;

  /**
   * Initialize Hugging Face pipeline (server-side only)
   * Uses Transformers.js for Node.js environment
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('Hugging Face pipeline already initialized');
      return;
    }

    // Only initialize on server-side
    if (typeof window !== 'undefined') {
      logger.error('Cannot initialize Hugging Face pipeline client-side');
      throw new Error('Hugging Face service must be initialized server-side');
    }

    try {
      logger.info(`Initializing Hugging Face model: ${this.modelName}`);
      const startTime = Date.now();

      // Dynamic import of @xenova/transformers (Node.js only)
      const { pipeline } = await import('@xenova/transformers');

      // Load image classification pipeline
      // Model is cached locally after first download (~400MB)
      this.pipeline = await pipeline('image-classification', this.modelName);

      const loadTime = Date.now() - startTime;
      logger.info(`Model loaded successfully in ${loadTime}ms`);
      this.initialized = true;

    } catch (error) {
      logger.error('Failed to initialize Hugging Face model:', error);
      throw new Error('Hugging Face model initialization failed');
    }
  }

  /**
   * Identify fish species from image using Hugging Face model
   *
   * @param imageFile - Image file to classify
   * @param context - Catch context (location, candidates, etc.)
   * @returns Identification result with species matches
   */
  async identify(
    imageFile: File,
    context: CatchContext
  ): Promise<IdentificationResult> {
    if (!this.initialized || !this.pipeline) {
      await this.initialize();
    }

    try {
      logger.info('Running Hugging Face inference');

      // Convert File to buffer for processing
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Run inference
      const startTime = Date.now();
      const predictions = await this.pipeline(buffer, {
        topk: 10 // Get top 10 predictions for better matching
      });
      const inferenceTime = Date.now() - startTime;

      // Track performance
      this.totalInferences++;
      this.totalInferenceTime += inferenceTime;

      logger.info(`Inference completed in ${inferenceTime}ms`);
      logger.info(`Top prediction: ${predictions[0].label} (${(predictions[0].score * 100).toFixed(1)}%)`);

      // Map predictions to Supabase species
      const mappedResults = await this.mapToSupabaseSpecies(
        predictions,
        context.candidates || []
      );

      // Determine method and confidence
      const topScore = predictions[0].score;
      const method = this.determineMethod(topScore, mappedResults);

      // If we couldn't map to any candidates, return all HF predictions
      if (mappedResults.length === 0) {
        return {
          species: this.convertToQuickLogSpecies(predictions),
          method: 'manual_selection',
          confidence: topScore,
          cost: 0, // FREE!
          reasoning: `Hugging Face identified as "${predictions[0].label}" but couldn't match to regional candidates. Please verify manually.`,
          message: `Hugging Face model suggests "${predictions[0].label}" with ${(topScore * 100).toFixed(1)}% confidence. This species may not be in your regional predictions.`
        };
      }

      // Return best match
      const bestMatch = mappedResults[0];
      return {
        species: bestMatch,
        method,
        confidence: topScore,
        cost: 0, // FREE!
        reasoning: this.generateReasoning(predictions, bestMatch, inferenceTime),
        message: this.generateMessage(predictions, bestMatch, topScore)
      };

    } catch (error) {
      logger.error('Hugging Face inference failed:', error);

      // Graceful fallback
      return {
        species: context.candidates || [],
        method: 'manual_selection',
        confidence: 0,
        cost: 0,
        reasoning: 'Hugging Face inference failed',
        message: 'AI identification failed. Please select species manually.'
      };
    }
  }

  /**
   * Map Hugging Face predictions to Supabase species candidates
   *
   * Strategy:
   * 1. Exact match on common name
   * 2. Partial match on common name
   * 3. Scientific name matching (if available)
   * 4. Return all candidates if no match (for manual selection)
   */
  private async mapToSupabaseSpecies(
    predictions: HFPrediction[],
    candidates: QuickLogSpecies[]
  ): Promise<QuickLogSpecies[]> {
    if (candidates.length === 0) {
      logger.warn('No candidates provided for mapping');
      return [];
    }

    const matches: Array<{ species: QuickLogSpecies; score: number; matchType: string }> = [];

    for (const prediction of predictions) {
      const predictionLabel = prediction.label.toLowerCase();

      for (const candidate of candidates) {
        const commonName = candidate.name.toLowerCase();
        const scientificName = candidate.scientific_name?.toLowerCase() || '';

        // Exact match on common name
        if (commonName === predictionLabel) {
          matches.push({
            species: candidate,
            score: prediction.score * 1.0, // Full score for exact match
            matchType: 'exact'
          });
          continue;
        }

        // Partial match (e.g., "Atlantic cod" matches "cod")
        if (commonName.includes(predictionLabel) || predictionLabel.includes(commonName)) {
          matches.push({
            species: candidate,
            score: prediction.score * 0.8, // 80% score for partial match
            matchType: 'partial'
          });
          continue;
        }

        // Scientific name match
        if (scientificName && scientificName === predictionLabel) {
          matches.push({
            species: candidate,
            score: prediction.score * 1.0,
            matchType: 'scientific'
          });
        }
      }
    }

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    // Log matching results
    if (matches.length > 0) {
      logger.info(`Mapped ${matches.length} species from ${predictions.length} HF predictions`);
      logger.info(`Best match: ${matches[0].species.name} (${matches[0].matchType} match, score: ${(matches[0].score * 100).toFixed(1)}%)`);
    } else {
      logger.warn('No species matches found');
    }

    return matches.map(m => m.species);
  }

  /**
   * Convert raw HF predictions to QuickLogSpecies format
   * (Used when we can't map to regional candidates)
   */
  private convertToQuickLogSpecies(predictions: HFPrediction[]): QuickLogSpecies[] {
    return predictions.slice(0, 5).map((pred, idx) => ({
      id: `hf-${idx}`,
      name: pred.label,
      scientific_name: pred.label, // HF model may use scientific names
      confidence: pred.score,
      slug: pred.label.toLowerCase().replace(/\s+/g, '-'),
      // These fields would need to be populated from Supabase later
      bite_score: null,
      image_url: null,
      guild: null,
    }));
  }

  /**
   * Determine identification method based on confidence
   */
  private determineMethod(
    score: number,
    matches: QuickLogSpecies[]
  ): 'ai' | 'manual_selection' {
    if (matches.length === 0) return 'manual_selection';
    if (score >= 0.85) return 'ai'; // High confidence
    if (score >= 0.70) return 'ai'; // Moderate confidence
    return 'manual_selection'; // Low confidence - needs manual review
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    predictions: HFPrediction[],
    matchedSpecies: QuickLogSpecies,
    inferenceTime: number
  ): string {
    const topPrediction = predictions[0];
    const reasoning: string[] = [];

    reasoning.push(`Hugging Face model identified as "${topPrediction.label}" with ${(topPrediction.score * 100).toFixed(1)}% confidence`);
    reasoning.push(`Matched to "${matchedSpecies.name}" in regional species database`);
    reasoning.push(`Inference completed in ${inferenceTime}ms`);

    if (predictions.length > 1) {
      const alternatives = predictions.slice(1, 3).map(p =>
        `${p.label} (${(p.score * 100).toFixed(1)}%)`
      ).join(', ');
      reasoning.push(`Alternative suggestions: ${alternatives}`);
    }

    return reasoning.join('\n');
  }

  /**
   * Generate user-friendly message
   */
  private generateMessage(
    predictions: HFPrediction[],
    matchedSpecies: QuickLogSpecies,
    score: number
  ): string {
    if (score >= 0.85) {
      return `Looks like a ${matchedSpecies.name}! 🐟 (${(score * 100).toFixed(0)}% confident)`;
    } else if (score >= 0.70) {
      return `Probably a ${matchedSpecies.name}, but please verify the photo. (${(score * 100).toFixed(0)}% confident)`;
    } else {
      return `Best guess: ${matchedSpecies.name}, but confidence is low. Please review alternatives.`;
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      totalInferences: this.totalInferences,
      averageInferenceTime: this.totalInferences > 0
        ? Math.round(this.totalInferenceTime / this.totalInferences)
        : 0,
      modelName: this.modelName,
      costPerInference: 0, // FREE!
      totalCost: 0 // FREE!
    };
  }
}

// Export singleton instance
export const hfFishService = new HuggingFaceFishService();
