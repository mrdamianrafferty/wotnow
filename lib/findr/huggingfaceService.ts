/**
 * HuggingFace Inference API Service - Adapted for Findr Fish Identification
 *
 * Uses HuggingFace's hosted Inference API for image classification
 * Zero bundle size (no model weights), all inference happens on HuggingFace servers
 *
 * Advantages over local inference:
 * - No bundle size issues (250MB limit)
 * - Serverless-friendly
 * - Lower latency (no model loading)
 * - Free tier available
 *
 * Cost: Free tier with 30,000 requests/month
 * After free tier: ~$0.001 per request (20x cheaper than OpenAI)
 */

import { createLogger } from '@/lib/utils/logger';
import type { CatchContext, IdentificationResult } from '@/lib/findr/fishIdentificationService';
import type { QuickLogSpecies } from '@/hooks/useQuickLogSpecies';

const logger = createLogger('HuggingFaceFishID');

// ============================================================================
// HuggingFace Inference API Types
// ============================================================================

interface HFInferenceResult {
  label: string;
  score: number; // 0-1 confidence
}

// ============================================================================
// Service Implementation
// ============================================================================

class HuggingFaceFishIdentificationService {
  private apiToken: string | null = null;
  private cache: Map<string, IdentificationResult> = new Map();

  // Model configuration - using a vision model suitable for fish identification
  private readonly modelId = 'google/vit-base-patch16-224'; // Vision Transformer model
  private readonly apiUrl = `https://api-inference.huggingface.co/models/${this.modelId}`;

  // Budget tracking (HF is much cheaper than OpenAI)
  private monthlyUsage: number = 0;
  private monthlyBudget: number = 10; // €10/month (HF is ~20x cheaper)
  private pricePerCall: number = 0.001; // ~€0.001 per request

  // Feature flags
  private aiAvailable: boolean = true;
  private aiErrorCount: number = 0;
  private initialized: boolean = false;

  /**
   * Initialize HuggingFace API client - ONLY call this server-side
   */
  async initializeServerSide(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Only initialize on server-side
    if (typeof window !== 'undefined') {
      logger.warn('Cannot initialize HuggingFace client-side');
      this.aiAvailable = false;
      return;
    }

    const apiToken = process.env.HUGGINGFACE_API_TOKEN;

    if (apiToken) {
      this.apiToken = apiToken;
      logger.info('HuggingFace Inference API initialized server-side');
      this.aiAvailable = true;
    } else {
      logger.warn('HuggingFace API token not found - AI identification disabled');
      this.aiAvailable = false;
    }

    await this.loadMonthlyUsage();
    this.initialized = true;
  }

  /**
   * Main identification method - matches OpenAI service interface
   */
  async identify(
    image: File,
    context: CatchContext
  ): Promise<IdentificationResult> {
    try {
      logger.info('Starting HF identification:', {
        imageSize: image.size,
        candidateCount: context.candidates?.length || 0
      });

      // 1. Check cache
      const cacheKey = await this.generateCacheKey(image, context);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info('Cache hit');
        return cached;
      }

      // 2. If no candidates, return manual selection
      if (!context.candidates || context.candidates.length === 0) {
        return this.handleNoCandidates(context);
      }

      // 3. If only 1 high-confidence candidate, use database match
      const highConfidenceCandidates = context.candidates.filter(c => c.confidence >= 75);
      if (highConfidenceCandidates.length === 1) {
        logger.info('Single high-confidence match - database');
        const result: IdentificationResult = {
          species: highConfidenceCandidates[0],
          method: 'database',
          confidence: highConfidenceCandidates[0].confidence / 100,
          cost: 0,
          message: 'High confidence match based on conditions'
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // 4. Use HuggingFace AI if available and within budget
      if (this.aiAvailable && this.isWithinBudget()) {
        const aiResult = await this.identifyWithAI(image, context.candidates);
        if (aiResult) {
          logger.info('AI identification successful');
          this.trackUsage();
          this.cache.set(cacheKey, aiResult);
          return aiResult;
        }
      }

      // 5. Fallback to manual selection
      return this.handleManualSelection(context.candidates);

    } catch (error) {
      logger.error('Identification error:', error);
      this.aiErrorCount++;

      // Disable AI temporarily if too many errors
      if (this.aiErrorCount > 5) {
        logger.warn('Too many AI errors - disabling temporarily');
        this.aiAvailable = false;
      }

      return this.handleManualSelection(context.candidates || []);
    }
  }

  /**
   * Call HuggingFace Inference API for image classification
   */
  private async identifyWithAI(
    image: File,
    candidates: QuickLogSpecies[]
  ): Promise<IdentificationResult | null> {
    if (!this.apiToken) {
      logger.warn('No API token available');
      return null;
    }

    try {
      // Convert File to ArrayBuffer
      const imageBuffer = await image.arrayBuffer();

      // Call HuggingFace Inference API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('HF API error:', { status: response.status, error: errorText });

        // If model is loading, wait and retry once
        if (response.status === 503) {
          logger.info('Model is loading, waiting 20s and retrying...');
          await new Promise(resolve => setTimeout(resolve, 20000));

          const retryResponse = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Content-Type': 'application/octet-stream',
            },
            body: imageBuffer,
          });

          if (!retryResponse.ok) {
            return null;
          }

          const retryResults: HFInferenceResult[] = await retryResponse.json();
          return this.matchResultsToCandidates(retryResults, candidates);
        }

        return null;
      }

      const results: HFInferenceResult[] = await response.json();
      logger.info('HF API response:', { resultCount: results.length, topScore: results[0]?.score });

      return this.matchResultsToCandidates(results, candidates);

    } catch (error) {
      logger.error('AI identification failed:', error);
      return null;
    }
  }

  /**
   * Match HuggingFace results to our candidate species
   */
  private matchResultsToCandidates(
    hfResults: HFInferenceResult[],
    candidates: QuickLogSpecies[]
  ): IdentificationResult {
    // Create a mapping of normalized names for fuzzy matching
    const candidateMap = new Map<string, QuickLogSpecies>();
    candidates.forEach(candidate => {
      const normalizedName = candidate.name.toLowerCase().replace(/[^a-z]/g, '');
      candidateMap.set(normalizedName, candidate);
    });

    // Try to match HF labels to our candidates
    for (const hfResult of hfResults) {
      const normalizedLabel = hfResult.label.toLowerCase().replace(/[^a-z]/g, '');

      // Check for exact match or substring match
      for (const [candidateName, candidate] of candidateMap.entries()) {
        if (normalizedLabel.includes(candidateName) || candidateName.includes(normalizedLabel)) {
          logger.info('Matched HF label to candidate:', {
            hfLabel: hfResult.label,
            candidate: candidate.name,
            confidence: hfResult.score
          });

          return {
            species: candidate,
            method: 'ai',
            confidence: hfResult.score,
            cost: this.pricePerCall,
            reasoning: `HuggingFace Vision Transformer matched: ${hfResult.label} (${Math.round(hfResult.score * 100)}% confidence)`
          };
        }
      }
    }

    // If no direct match, return top 3 candidates for manual selection
    logger.info('No direct match found, returning top candidates');
    return {
      species: candidates.slice(0, 3),
      method: 'manual_selection',
      confidence: 0,
      cost: this.pricePerCall,
      message: 'Please select the correct species from these possibilities',
      reasoning: `HuggingFace detected: ${hfResults.slice(0, 3).map(r => `${r.label} (${Math.round(r.score * 100)}%)`).join(', ')}`
    };
  }

  /**
   * Generate cache key from image and context
   */
  private async generateCacheKey(image: File, context: CatchContext): Promise<string> {
    try {
      // Use image size, name, and context as simple cache key
      // For production, could use image hash
      const contextKey = JSON.stringify({
        rectangle: context.location?.rectangleCode,
        date: context.date?.toISOString().split('T')[0],
        candidateCount: context.candidates?.length || 0
      });

      return `${image.size}_${image.name}_${contextKey}`;
    } catch {
      return `${Date.now()}_${Math.random()}`;
    }
  }

  /**
   * Handle case where no candidates are available
   */
  private handleNoCandidates(_context: CatchContext): IdentificationResult {
    logger.warn('No candidates provided');
    return {
      species: [],
      method: 'manual_selection',
      confidence: 0,
      cost: 0,
      message: 'Unable to identify - no regional species data available. Please select manually.'
    };
  }

  /**
   * Handle manual selection fallback
   */
  private handleManualSelection(candidates: QuickLogSpecies[]): IdentificationResult {
    logger.info('Returning manual selection');
    return {
      species: candidates.slice(0, 5),
      method: 'manual_selection',
      confidence: 0,
      cost: 0,
      message: 'Please select the correct species from these regional possibilities'
    };
  }

  /**
   * Budget management
   */
  private isWithinBudget(): boolean {
    return this.monthlyUsage < this.monthlyBudget;
  }

  private trackUsage(): void {
    this.monthlyUsage += this.pricePerCall;
    logger.info(`Monthly usage: €${this.monthlyUsage.toFixed(3)} / €${this.monthlyBudget}`);

    // TODO: Persist usage to database for accurate tracking across deployments
  }

  private async loadMonthlyUsage(): Promise<void> {
    // TODO: Load from database
    // For now, reset monthly (could integrate with Supabase)
    this.monthlyUsage = 0;
  }

  /**
   * Get current usage stats
   */
  public getUsageStats() {
    return {
      monthlyUsage: this.monthlyUsage,
      monthlyBudget: this.monthlyBudget,
      percentUsed: (this.monthlyUsage / this.monthlyBudget) * 100,
      pricePerCall: this.pricePerCall,
      aiAvailable: this.aiAvailable,
      errorCount: this.aiErrorCount
    };
  }
}

// Export singleton instance
export const hfFishIdService = new HuggingFaceFishIdentificationService();
export type { IdentificationResult };
