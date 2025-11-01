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
 * - €0.01 per AI call (gpt-4-vision with "low" detail)
 * - €10/month budget = 1000 identifications
 * - Targets <20% AI usage through smart filtering
 */

import OpenAI from 'openai';
import exifr from 'exifr';
// Do not import sharp statically; use dynamic import only on server
import type { QuickLogSpecies } from '../../hooks/useQuickLogSpecies';

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
  private monthlyBudget: number = 10; // €10/month
  private pricePerCall: number = 0.01; // €0.01 per AI identification

  // Feature flags
  private aiAvailable: boolean = true;
  private aiErrorCount: number = 0;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize OpenAI client if API key is available
   */
  private async initialize() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      console.log('[FishID] OpenAI initialized');
    } else {
      console.warn('[FishID] OpenAI API key not found - AI identification disabled');
      this.aiAvailable = false;
    }

    await this.loadMonthlyUsage();
  }

  /**
   * Main identification method - Smart routing
   */
  async identify(
    image: File,
    context: CatchContext
  ): Promise<IdentificationResult> {
    try {
      console.log('[FishID] Starting identification:', {
        imageSize: image.size,
        candidateCount: context.candidates?.length || 0
      });

      // 1. Check cache for identical images
      const cacheKey = await this.generateCacheKey(image, context);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('[FishID] Cache hit');
        return cached;
      }

      // 2. Extract EXIF data (GPS/timestamp)
      const exif = await this.extractExifData(image);
      if (exif?.location) {
        console.log('[FishID] EXIF location found:', exif.location);
        // TODO: Use EXIF location to refine context if different from user's current location
      }

      // 3. If no candidates provided, this is a fallback scenario
      if (!context.candidates || context.candidates.length === 0) {
        return this.handleNoCandidates(context);
      }

      // 4. If only 1-2 high-confidence candidates, use database match
      const highConfidenceCandidates = context.candidates.filter(c => c.confidence >= 75);
      if (highConfidenceCandidates.length === 1) {
        console.log('[FishID] Single high-confidence match - database');
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
          console.error('[FishID] AI identification failed:', error);
          return this.handleAIError(error as Error, context.candidates);
        }
      }

      // 6. Manual selection fallback
      return this.handleManualSelection(context.candidates);

    } catch (_error) {
      console.error('[FishID] Complete identification failure:', _error);
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
      console.log('[FishID] No EXIF data found (this is normal for uploaded photos)');
    }
    return null;
  }

  /**
   * AI identification using OpenAI Vision API
   */
  private async identifyWithAI(
    image: File,
    candidates: QuickLogSpecies[]
  ): Promise<IdentificationResult> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    console.log('[FishID] Using AI identification with', candidates.length, 'candidates');

    // Convert image to base64
    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString('base64');

    // Build prompt with regional candidates
    const candidateList = candidates.slice(0, 8).map((s, i) =>
      `${i + 1}. ${s.name}${s.scientificName ? ` (${s.scientificName})` : ''} - ${Math.round(s.confidence)}% likely in this location`
    ).join('\n');

    const prompt = `You are a fish identification expert. Analyze this photo of a caught fish.

IMPORTANT: If you see multiple different fish species in the image, respond with:
{
  "species": "multiple_fish",
  "confidence": 0,
  "reasoning": "Multiple fish detected in image"
}

The most likely species based on location and current conditions:
${candidateList}

Otherwise, respond with JSON only in this exact format:
{
  "species": "exact name from the list above or 'unknown'",
  "confidence": 0-100,
  "reasoning": "brief explanation of identifying features (max 100 chars)"
}

Focus on: body shape, color patterns, fin structure, size relative to environment.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini', // Updated from deprecated gpt-4-vision-preview - faster, cheaper, better vision
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64}`,
              detail: 'low' // Cost optimization
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

    console.log('[FishID] AI response:', result);

    // Check if multiple fish detected
    if (result.species === 'multiple_fish') {
      console.log('[FishID] Multiple fish detected in image');
      return {
        species: candidates.slice(0, 8),
        method: 'manual_selection',
        confidence: 0,
        cost: this.pricePerCall,
        message: 'Multiple fish detected - please identify manually'
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
    console.warn('[FishID] No regional candidates available');
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
    console.error('[FishID] AI Error:', error);

    // Check if it's a quota/rate limit error
    if (error.message?.includes('quota') ||
        error.message?.includes('rate_limit')) {
      this.aiErrorCount++;

      if (this.aiErrorCount > 3) {
        this.aiAvailable = false;
        this.scheduleAIRecheck();
        console.warn('[FishID] AI disabled due to repeated errors');
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
      console.warn('[FishID] Monthly budget exceeded');
      this.aiAvailable = false;
      return false;
    }

    // Warning at 80%
    if (this.monthlyUsage >= this.monthlyBudget * 0.8) {
      console.warn(`[FishID] Budget warning: €${this.monthlyUsage.toFixed(2)} of €${this.monthlyBudget} used`);
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
      console.log('[FishID] AI re-enabled after timeout');
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

    console.log('[FishID] Identification logged:', {
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
