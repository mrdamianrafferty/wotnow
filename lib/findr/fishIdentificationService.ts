/**
 * Fish Identification Service - Adapted for Findr
 *
 * Smart routing for catch identification:
 * 1. Check cache (identical images)
 * 2. Extract EXIF data (GPS, timestamp)
 * 3. Get regional candidates from predictions API
 * 4. Visual color matching (optional, basic)
 * 5. OpenAI Vision API (with budget controls)
 * 6. Manual selection fallback
 *
 * Cost Management:
 * - €0.05 per AI call (gpt-4o with "high" detail for best accuracy)
 * - €50/month budget = 1000 identifications
 * - Targets <20% AI usage through smart filtering
 * - Can downgrade to gpt-4o-mini later if needed to reduce costs
 */

import OpenAI from 'openai';
import exifr from 'exifr';
// Do not import sharp statically; use dynamic import only on server
import type { QuickLogSpecies } from '../../hooks/useQuickLogSpecies';
import { getVisualFeatures } from '../../data/speciesVisualFeatures';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('FishID');

// ============================================================================
// Types
// ============================================================================

export interface CatchContext {
  location?: {
    coords?: [number, number];
    rectangleCode?: string | null;
    rectangleLabel?: string | null;
  };
  date?: Date;
  depth?: number;
  candidates?: QuickLogSpecies[]; // Regional species from predictions
}

export interface IdentificationResult {
  species: QuickLogSpecies | QuickLogSpecies[];
  method: 'cache' | 'database' | 'visual' | 'ai' | 'manual_selection';
  confidence: number; // 0-1
  cost: number; // €0.00
  reasoning?: string;
  message?: string;
}

export interface ExifData {
  location?: [number, number];
  timestamp?: Date;
}

// ============================================================================
// Service Implementation
// ============================================================================

class FishIdentificationService {
  private openai: OpenAI | null = null;
  private cache: Map<string, IdentificationResult> = new Map();

  // Budget tracking
  private monthlyUsage: number = 0;
  private monthlyBudget: number = 50; // €50/month (increased for premium model)
  private pricePerCall: number = 0.05; // €0.05 per AI identification (gpt-4o with high detail)

  // Feature flags
  private aiAvailable: boolean = true;
  private aiErrorCount: number = 0;
  private initialized: boolean = false;

  /**
   * Initialize OpenAI client - ONLY call this server-side (in API routes)
   * This ensures process.env.OPENAI_API_KEY is available
   */
  async initializeServerSide(): Promise<void> {
    if (this.initialized) {
      return; // Already initialized
    }

    // Only initialize on server-side (Node.js environment)
    if (typeof window !== 'undefined') {
      logger.warn('Cannot initialize OpenAI client-side');
      this.aiAvailable = false;
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      logger.info('OpenAI initialized server-side');
      this.aiAvailable = true;
    } else {
      logger.warn('OpenAI API key not found - AI identification disabled');
      this.aiAvailable = false;
    }

    await this.loadMonthlyUsage();
    this.initialized = true;
  }

  /**
   * Main identification method - Smart routing
   */
  async identify(
    image: File,
    context: CatchContext
  ): Promise<IdentificationResult> {
    try {
      logger.info('Starting identification:', {
        imageSize: image.size,
        candidateCount: context.candidates?.length || 0
      });

      // 1. Check cache for identical images
      const cacheKey = await this.generateCacheKey(image, context);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.info('Cache hit');
        return cached;
      }

      // 2. Extract EXIF data (GPS/timestamp)
      const exif = await this.extractExifData(image);
      if (exif?.location) {
        logger.info('EXIF location found:', exif.location);
        // TODO: Use EXIF location to refine context if different from user's current location
      }

      // 3. If no candidates provided, this is a fallback scenario
      if (!context.candidates || context.candidates.length === 0) {
        return this.handleNoCandidates(context);
      }

      // 4. If only 1-2 high-confidence candidates, use database match
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

      // 5. Try AI identification if available and budget allows
      if (this.aiAvailable && await this.checkBudget()) {
        try {
          const aiResult = await this.identifyWithAI(image, context.candidates);

          // Update budget and cache
          this.monthlyUsage += this.pricePerCall;
          await this.saveMonthlyUsage();
          this.cache.set(cacheKey, aiResult);

          await this.logIdentification(aiResult);

          return aiResult;

        } catch (error) {
          logger.error('AI identification failed:', error);
          return this.handleAIError(error as Error, context.candidates);
        }
      }

      // 6. Manual selection fallback
      return this.handleManualSelection(context.candidates);

    } catch (_error) {
      logger.error('Complete identification failure:', _error);
      return this.handleCompleteFailure(context);
    }
  }

  /**
   * Extract EXIF data from image (GPS, timestamp)
   */
  private async extractExifData(image: File): Promise<ExifData | null> {
    try {
      const exif = await exifr.parse(image, {
        gps: true,
        pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude']
      });

      if (exif?.latitude && exif?.longitude) {
        return {
          location: [exif.latitude, exif.longitude],
          timestamp: exif.DateTimeOriginal ? new Date(exif.DateTimeOriginal) : undefined
        };
      }
    } catch (_error) {
      logger.info('No EXIF data found (this is normal for uploaded photos)');
    }
    return null;
  }

  /**
   * Fetch recent catches in the same rectangle for AI context
   */
  private async getRecentCatchesByRectangle(rectangleCode: string): Promise<string[]> {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const response = await fetch(
        `/api/findr/recent-catches?rectangleCode=${rectangleCode}&since=${oneMonthAgo.toISOString()}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      return data.species || [];
    } catch (error) {
      logger.warn('Failed to fetch recent catches:', error);
      return [];
    }
  }

  /**
   * Fetch AI accuracy statistics for this rectangle to help AI learn from past mistakes
   */
  private async getAIAccuracyStatsByRectangle(rectangleCode: string): Promise<string> {
    try {
      const response = await fetch(
        `/api/findr/ai-accuracy?rectangleCode=${rectangleCode}`
      );

      if (!response.ok) return '';

      const data = await response.json();

      // No AI suggestions yet in this area
      if (data.totalAISuggestions === 0) return '';

      const accuracyPct = Math.round(data.accuracyRate * 100);
      const giveUpPct = Math.round(data.giveUpRate * 100);

      let hint = `\n\nYour AI Performance in this area:`;
      hint += `\n- Accuracy: ${accuracyPct}% (${data.correctSuggestions}/${data.totalAISuggestions - data.gaveUpCount} correct)`;

      if (giveUpPct > 0) {
        hint += `\n- Give-up rate: ${giveUpPct}% (low confidence cases)`;
      }

      // Add top mistakes to help AI learn
      if (data.topMistakes && data.topMistakes.length > 0) {
        hint += `\n- Common mistakes in this area:`;
        for (const mistake of data.topMistakes.slice(0, 3)) {
          hint += `\n  • Often confused ${mistake.suggestedSpecies} with ${mistake.actualSpecies} (${mistake.count}x)`;
        }
      }

      return hint;
    } catch (error) {
      logger.warn('Failed to fetch AI accuracy stats:', error);
      return '';
    }
  }

  /**
   * AI identification using OpenAI Vision API
   */
  private async identifyWithAI(
    image: File,
    candidates: QuickLogSpecies[],
    context?: CatchContext
  ): Promise<IdentificationResult> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    logger.info('Using AI identification with', candidates.length, 'candidates');

    // Convert image to base64
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString('base64');

    // Build prompt with regional candidates and visual features
    const candidateList = candidates.slice(0, 8).map((s, i) => {
      const visualFeatures = getVisualFeatures(s.name);
      return `${i + 1}. ${s.name} - ${visualFeatures}`;
    }).join('\n');

    // Build compact environmental context
    const now = context?.date || new Date();
    const hours = now.getHours();
    const timeOfDay = hours >= 5 && hours < 12 ? 'morning' :
                       hours >= 12 && hours < 17 ? 'afternoon' :
                       hours >= 17 && hours < 21 ? 'evening' : 'night';

    const month = now.getMonth();
    const season = month >= 2 && month <= 4 ? 'Spring' :
                   month >= 5 && month <= 7 ? 'Summer' :
                   month >= 8 && month <= 10 ? 'Autumn' : 'Winter';

    let contextLine = `${timeOfDay}, ${season}`;
    if (context?.location?.rectangleLabel) {
      contextLine += ` | Location: ${context.location.rectangleLabel}`;
    }
    if (context?.depth) {
      contextLine += ` | Depth: ${context.depth}m`;
    }

    // Fetch recent catches hint (keep concise)
    let recentCatchesHint = '';
    if (context?.location?.rectangleCode) {
      const recentCatches = await this.getRecentCatchesByRectangle(context.location.rectangleCode);
      if (recentCatches.length > 0) {
        recentCatchesHint = `\nRecent catches here: ${recentCatches.slice(0, 4).join(', ')}`;
      }
    }

    // Fetch AI accuracy stats
    let aiAccuracyHint = '';
    if (context?.location?.rectangleCode) {
      aiAccuracyHint = await this.getAIAccuracyStatsByRectangle(context.location.rectangleCode);
    }

    const prompt = `You are a fish identification expert analyzing a post-catch photo.

Context: ${contextLine}${recentCatchesHint}${aiAccuracyHint}

Most likely species (with key identifying features):
${candidateList}

Respond with JSON only:
{
  "species": "exact name from list above or 'unknown'",
  "confidence": 0-100,
  "reasoning": "key features observed (max 100 chars)",
  "alternatives": ["backup option 1", "backup option 2"]
}

Special cases:
- Multiple fish visible → species: "multiple_fish", confidence: 0
- Poor image quality → note in reasoning, lower confidence
- No clear match → species: "unknown", list alternatives

Match visible features (fins, patterns, colors, body shape) to the species descriptions above.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o', // Premium model for best accuracy - can downgrade to gpt-4o-mini later if needed
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64}`,
              detail: 'high' // High detail for best accuracy
            }
          }
        ]
      }],
      max_tokens: 150,
      temperature: 0.1 // Low temperature for consistency
    });

    const result = JSON.parse(
      response.choices[0].message.content || '{}'
    );

    logger.info('AI response:', result);

    // Check if multiple fish detected
    if (result.species === 'multiple_fish') {
      logger.info('Multiple fish detected in image');
      return {
        species: candidates.slice(0, 8),
        method: 'manual_selection',
        confidence: 0,
        cost: this.pricePerCall,
        message: 'Multiple fish detected - please identify manually'
      };
    }

    // Check if AI returned uncertain response with alternatives
    if (result.species === 'uncertain' && result.alternatives && Array.isArray(result.alternatives)) {
      logger.info('AI uncertain - provided', result.alternatives.length, 'alternatives');

      // Map AI alternatives to our candidate species
      const topGuesses: QuickLogSpecies[] = [];
      const seenIds = new Set<string>();

      for (const alt of result.alternatives) {
        const matchedSpecies = candidates.find(
          s => s.name.toLowerCase() === alt.species?.toLowerCase() ||
               s.scientificName?.toLowerCase() === alt.species?.toLowerCase()
        );

        if (matchedSpecies && !seenIds.has(matchedSpecies.id)) {
          topGuesses.push({
            ...matchedSpecies,
            confidence: alt.confidence || matchedSpecies.confidence
          });
          seenIds.add(matchedSpecies.id);
        }
      }

      // Add remaining candidates (deduped) to fill up to 8 total
      const remainingCandidates = candidates.filter(c => !seenIds.has(c.id));
      const allOptions = [...topGuesses, ...remainingCandidates].slice(0, 8);

      return {
        species: allOptions,
        method: 'manual_selection',
        confidence: result.confidence ? result.confidence / 100 : 0.5,
        cost: this.pricePerCall,
        message: `AI suggests: ${topGuesses.map(s => s.name).join(', ')}`
      };
    }

    // Find the identified species in our candidates
    const identifiedSpecies = candidates.find(
      s => s.name.toLowerCase() === result.species?.toLowerCase() ||
           s.scientificName?.toLowerCase() === result.species?.toLowerCase()
    );

    // If AI is uncertain (unknown or low confidence), return manual selection
    if (!identifiedSpecies || result.species === 'unknown' || (typeof result.confidence === 'number' && result.confidence < 70)) {
      return {
        species: candidates.slice(0, 5),
        method: 'manual_selection',
        confidence: 0.3,
        cost: this.pricePerCall,
        message: 'AI uncertain - please select manually'
      };
    }

    return {
      species: identifiedSpecies,
      method: 'ai',
      confidence: result.confidence / 100,
      cost: this.pricePerCall,
      reasoning: result.reasoning
    };
  }

  /**
   * Generate cache key for image
   */
  private async generateCacheKey(
    image: File,
    context: CatchContext
  ): Promise<string> {
    // Only run sharp on the server (Node.js)
    if (typeof window === 'undefined') {
      try {
        // Dynamically import sharp only on server
        const sharp = (await import('sharp')).default;
        const buffer = Buffer.from(await image.arrayBuffer());
        const hash = await sharp(buffer)
          .resize(32, 32)
          .greyscale()
          .raw()
          .toBuffer()
          .then(data =>
            Buffer.from(data).toString('base64').substring(0, 16)
          );

        const location = context.location?.rectangleCode || 'unknown';
        const date = (context.date || new Date()).toISOString().split('T')[0];

        return `${hash}-${location}-${date}`;
      } catch (_error) {
        // Fallback to simple hash if sharp fails
        return `${Date.now()}-${Math.random()}`;
      }
    } else {
      // On the client/browser, never try to use sharp
      return `${Date.now()}-${Math.random()}`;
    }
  }

  /**
   * Handle scenario where no candidates are provided
   */
  private handleNoCandidates(_context: CatchContext): IdentificationResult {
    logger.warn('No regional candidates available');
    return {
      species: [],
      method: 'manual_selection',
      confidence: 0,
      cost: 0,
      message: 'Unable to load regional species - please try again'
    };
  }

  /**
   * Handle manual selection with regional candidates
   */
  private handleManualSelection(candidates: QuickLogSpecies[]): IdentificationResult {
    return {
      species: candidates.slice(0, 12), // Top 12 for grid display
      method: 'manual_selection',
      confidence: 0.5,
      cost: 0,
      message: 'Select your catch from location-specific species'
    };
  }

  /**
   * Handle AI errors gracefully
   */
  private handleAIError(
    error: Error,
    candidates: QuickLogSpecies[]
  ): IdentificationResult {
    logger.error('AI Error:', error);

    // Check if it's a quota/rate limit error
    if (error.message?.includes('quota') ||
        error.message?.includes('rate_limit')) {
      this.aiErrorCount++;

      if (this.aiErrorCount > 3) {
        this.aiAvailable = false;
        this.scheduleAIRecheck();
        logger.warn('AI disabled due to repeated errors');
      }
    }

    return {
      species: candidates.slice(0, 8),
      method: 'manual_selection',
      confidence: 0.5,
      cost: 0,
      message: 'AI temporarily unavailable - select from suggestions'
    };
  }

  /**
   * Complete failure fallback
   */
  private handleCompleteFailure(_context: CatchContext): IdentificationResult {
    return {
      species: [],
      method: 'manual_selection',
      confidence: 0,
      cost: 0,
      message: 'Identification failed - please select species manually'
    };
  }

  /**
   * Budget checking
   */
  private async checkBudget(): Promise<boolean> {
    if (this.monthlyUsage >= this.monthlyBudget) {
      logger.warn('Monthly budget exceeded');
      this.aiAvailable = false;
      return false;
    }

    // Warning at 80%
    if (this.monthlyUsage >= this.monthlyBudget * 0.8) {
      logger.warn(`Budget warning: €${this.monthlyUsage.toFixed(2)} of €${this.monthlyBudget} used`);
    }

    return true;
  }

  /**
   * Schedule AI recheck after errors
   */
  private scheduleAIRecheck(): void {
    // Try again in 1 hour
    setTimeout(() => {
      this.aiAvailable = true;
      this.aiErrorCount = 0;
      logger.info('AI re-enabled after timeout');
    }, 60 * 60 * 1000);
  }

  /**
   * Load monthly usage from localStorage (browser-side)
   */
  private async loadMonthlyUsage(): Promise<void> {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ai_usage_current_month');
      const data = stored ? JSON.parse(stored) : { amount: 0, month: new Date().getMonth() };

      // Reset if new month
      if (data.month !== new Date().getMonth()) {
        this.monthlyUsage = 0;
        this.saveMonthlyUsage();
      } else {
        this.monthlyUsage = data.amount;
      }
    }
  }

  /**
   * Save monthly usage to localStorage
   */
  private async saveMonthlyUsage(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_usage_current_month', JSON.stringify({
        amount: this.monthlyUsage,
        month: new Date().getMonth()
      }));
    }
  }

  /**
   * Log identification for analytics
   */
  private async logIdentification(result: IdentificationResult): Promise<void> {
    await this.saveMonthlyUsage();

    logger.info('Identification logged:', {
      method: result.method,
      cost: result.cost,
      confidence: result.confidence
    });
  }

  /**
   * Get service statistics
   */
  async getStats() {
    return {
      aiAvailable: this.aiAvailable,
      monthlyUsage: this.monthlyUsage,
      monthlyBudget: this.monthlyBudget,
      remainingBudget: this.monthlyBudget - this.monthlyUsage,
      cacheSize: this.cache.size,
      pricePerCall: this.pricePerCall
    };
  }
}

// Export singleton instance
export const fishIdService = new FishIdentificationService();
