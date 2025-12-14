/**
 * Plant & Pest Identification Service for Grow Daisy
 *
 * Supports two providers with a toggle for A/B testing:
 * 1. OpenAI Vision (gpt-4o) - Reuses existing infrastructure
 * 2. Plant.id / Plant.health (Kindwise) - Purpose-built specialist API
 *
 * Cost Management:
 * - OpenAI: ~€0.05 per identification (gpt-4o with high detail)
 * - Plant.id: €0.05 per credit (1 credit = 1 identification)
 * - Combined health check: 2 credits
 */

import OpenAI from 'openai';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('PlantID');

// ============================================================================
// Types
// ============================================================================

export type PlantIdProvider = 'openai' | 'plantid';

export interface PlantCandidate {
  slug: string;
  name: string;
  scientificName?: string;
  type?: string; // Vegetable, Herb, Tree, etc.
}

export interface ThreatCandidate {
  slug: string;
  commonName: string;
  scientificName?: string;
  threatType: string; // pest, disease, deficiency
}

export interface IdentificationContext {
  mode: 'plant' | 'pest';
  climateZone?: string;
  month?: number;
  plantCandidates?: PlantCandidate[];
  threatCandidates?: ThreatCandidate[];
  userPlants?: string[]; // Names of plants user has in garden
}

export interface PlantIdentificationResult {
  success: boolean;
  provider: PlantIdProvider;
  mode: 'plant' | 'pest';
  
  // For plant identification
  species?: {
    name: string;
    scientificName?: string;
    slug?: string;
    commonNames?: string[];
  };
  
  // For pest/disease identification
  diagnosis?: {
    name: string;
    slug?: string;
    type: 'pest' | 'disease' | 'deficiency' | 'abiotic' | 'unknown';
    affectedPart?: string;
    severity?: 'mild' | 'moderate' | 'severe';
  };
  
  // Common fields
  confidence: number; // 0-1
  reasoning?: string;
  alternatives?: Array<{ name: string; confidence: number }>;
  
  // Health assessment (plant.health only)
  isHealthy?: boolean;
  healthProbability?: number;
  
  // Treatment/care info (if available)
  treatment?: string[];
  prevention?: string[];
  
  // Cost tracking
  cost: number; // in euros
  method: 'ai' | 'database' | 'cache';
  
  // Error handling
  error?: string;
}

export interface PlantIdApiResponse {
  result: {
    is_plant: { binary: boolean; probability: number };
    classification: {
      suggestions: Array<{
        id: string;
        name: string;
        probability: number;
        details?: {
          common_names?: string[];
          taxonomy?: { genus?: string; family?: string };
          description?: { value: string };
          url?: string;
        };
      }>;
    };
  };
  status: string;
}

export interface PlantHealthApiResponse {
  result: {
    is_healthy: { binary: boolean; probability: number };
    disease?: {
      suggestions: Array<{
        id: string;
        name: string;
        probability: number;
        details?: {
          local_name?: string;
          description?: string;
          treatment?: { biological?: string[]; chemical?: string[]; prevention?: string[] };
          cause?: string;
        };
      }>;
    };
  };
  status: string;
}

// ============================================================================
// Configuration
// ============================================================================

const PROVIDER_CONFIG = {
  openai: {
    name: 'OpenAI Vision (GPT-4o)',
    pricePerCall: 0.05, // €0.05 for high-detail image
    model: 'gpt-4o',
    detail: 'high' as const,
  },
  plantid: {
    name: 'Plant.id / Plant.health (Kindwise)',
    pricePerCall: 0.05, // €0.05 per credit
    pricePerHealthCall: 0.10, // €0.10 for combined plant+health
    baseUrl: 'https://plant.id/api/v3',
  },
};

/**
 * Get the current provider from environment or default
 */
export function getPlantIdProvider(): PlantIdProvider {
  const envProvider = process.env.PLANT_ID_PROVIDER?.toLowerCase();
  if (envProvider === 'plantid' || envProvider === 'plant.id') {
    return 'plantid';
  }
  return 'openai'; // Default to OpenAI since we already have it
}

export function getProviderConfig(provider: PlantIdProvider) {
  return PROVIDER_CONFIG[provider];
}

// ============================================================================
// Service Implementation
// ============================================================================

class PlantIdentificationService {
  private openai: OpenAI | null = null;
  private plantIdApiKey: string | null = null;
  private initialized: boolean = false;

  /**
   * Initialize clients - ONLY call server-side
   */
  async initializeServerSide(): Promise<void> {
    if (typeof window !== 'undefined') {
      logger.warn('Cannot initialize client-side');
      return;
    }

    // Always re-check API keys (in case env vars were added after initial load)
    // Initialize OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && !this.openai) {
      this.openai = new OpenAI({ apiKey: openaiKey });
      logger.info('OpenAI initialized');
    }

    // Initialize Plant.id - always re-check in case key was added
    const plantIdKey = process.env.PLANT_ID_API_KEY;
    if (plantIdKey) {
      this.plantIdApiKey = plantIdKey;
      logger.info('Plant.id API key found');
    } else {
      logger.warn('Plant.id API key not found in environment');
    }

    this.initialized = true;
  }

  /**
   * Main identification method
   * @param image - Image as a Buffer
   */
  async identify(
    image: Buffer,
    context: IdentificationContext,
    provider?: PlantIdProvider
  ): Promise<PlantIdentificationResult> {
    const selectedProvider = provider || getPlantIdProvider();
    
    logger.info('Starting identification:', {
      mode: context.mode,
      provider: selectedProvider,
      candidateCount: context.mode === 'plant' 
        ? context.plantCandidates?.length 
        : context.threatCandidates?.length,
    });

    try {
      if (selectedProvider === 'plantid') {
        return await this.identifyWithPlantId(image, context);
      } else {
        return await this.identifyWithOpenAI(image, context);
      }
    } catch (error) {
      logger.error('Identification failed:', error);
      return {
        success: false,
        provider: selectedProvider,
        mode: context.mode,
        confidence: 0,
        cost: 0,
        method: 'ai',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // OpenAI Vision Provider
  // ============================================================================

  private async identifyWithOpenAI(
    image: Buffer,
    context: IdentificationContext
  ): Promise<PlantIdentificationResult> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const config = PROVIDER_CONFIG.openai;
    
    // Convert image buffer to base64
    const base64Image = image.toString('base64');

    const prompt = context.mode === 'plant'
      ? this.buildPlantIdentificationPrompt(context)
      : this.buildPestIdentificationPrompt(context);

    const response = await this.openai.chat.completions.create({
      model: config.model,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: config.detail,
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (context.mode === 'plant') {
        return {
          success: true,
          provider: 'openai',
          mode: 'plant',
          species: {
            name: parsed.species || parsed.name || 'Unknown',
            scientificName: parsed.scientific_name,
            commonNames: parsed.common_names,
          },
          confidence: (parsed.confidence || 0) / 100,
          reasoning: parsed.reasoning,
          alternatives: parsed.alternatives?.map((a: string | { name: string; confidence: number }) => 
            typeof a === 'string' ? { name: a, confidence: 0.5 } : a
          ),
          cost: config.pricePerCall,
          method: 'ai',
        };
      } else {
        return {
          success: true,
          provider: 'openai',
          mode: 'pest',
          diagnosis: {
            name: parsed.diagnosis || parsed.name || 'Unknown',
            slug: parsed.slug,
            type: parsed.type || 'unknown',
            affectedPart: parsed.affected_part,
            severity: parsed.severity,
          },
          confidence: (parsed.confidence || 0) / 100,
          reasoning: parsed.reasoning,
          alternatives: parsed.alternatives?.map((a: string | { name: string; confidence: number }) => 
            typeof a === 'string' ? { name: a, confidence: 0.5 } : a
          ),
          treatment: parsed.treatment,
          prevention: parsed.prevention,
          cost: config.pricePerCall,
          method: 'ai',
        };
      }
    } catch (_parseError) {
      logger.error('Failed to parse OpenAI response:', content);
      return {
        success: false,
        provider: 'openai',
        mode: context.mode,
        confidence: 0,
        cost: config.pricePerCall, // Still charged even on parse failure
        method: 'ai',
        error: 'Failed to parse AI response',
        reasoning: content.slice(0, 500),
      };
    }
  }

  private buildPlantIdentificationPrompt(context: IdentificationContext): string {
    const month = context.month || new Date().getMonth() + 1;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    let prompt = `You are an expert botanist and horticulturist identifying a garden plant.

Context:
- Month: ${monthNames[month - 1]}
- Climate zone: ${context.climateZone || 'temperate'}
`;

    if (context.plantCandidates && context.plantCandidates.length > 0) {
      prompt += `
Most likely species from user's region (with type):
${context.plantCandidates.slice(0, 20).map(p => 
  `- ${p.name}${p.scientificName ? ` (${p.scientificName})` : ''} [${p.type || 'Plant'}]`
).join('\n')}
`;
    }

    if (context.userPlants && context.userPlants.length > 0) {
      prompt += `
Plants already in user's garden: ${context.userPlants.join(', ')}
`;
    }

    prompt += `
Analyze the photo and identify the plant. Respond with JSON only:
{
  "species": "common name (prefer from list if matches)",
  "scientific_name": "Latin binomial",
  "confidence": 0-100,
  "reasoning": "key visual features observed (max 150 chars)",
  "alternatives": ["backup option 1", "backup option 2"]
}

Special cases:
- Multiple plants visible → identify the main subject
- Poor image quality → lower confidence, note in reasoning
- No clear match → species: "Unknown", list alternatives
`;

    return prompt;
  }

  private buildPestIdentificationPrompt(context: IdentificationContext): string {
    const month = context.month || new Date().getMonth() + 1;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    let prompt = `You are an expert plant pathologist diagnosing garden problems.

Context:
- Month: ${monthNames[month - 1]}
- Climate zone: ${context.climateZone || 'temperate'}
`;

    if (context.threatCandidates && context.threatCandidates.length > 0) {
      prompt += `
Common threats in this region:
${context.threatCandidates.slice(0, 25).map(t => 
  `- ${t.commonName}${t.scientificName ? ` (${t.scientificName})` : ''} [${t.threatType}]`
).join('\n')}
`;
    }

    if (context.userPlants && context.userPlants.length > 0) {
      prompt += `
Plants in user's garden (potential hosts): ${context.userPlants.join(', ')}
`;
    }

    prompt += `
Analyze the photo and diagnose the problem. Respond with JSON only:
{
  "diagnosis": "name of pest, disease, or condition (prefer from threat list)",
  "type": "pest|disease|deficiency|abiotic",
  "confidence": 0-100,
  "affected_part": "leaf|stem|root|fruit|flower|whole_plant",
  "severity": "mild|moderate|severe",
  "reasoning": "visible symptoms observed (max 150 chars)",
  "alternatives": ["backup diagnosis 1", "backup diagnosis 2"],
  "treatment": ["treatment step 1", "treatment step 2"],
  "prevention": ["prevention tip 1", "prevention tip 2"]
}

Special cases:
- Healthy plant → diagnosis: "Healthy", type: "abiotic", confidence: high
- Multiple issues → identify the primary concern
- Unclear symptoms → lower confidence, suggest lab testing in reasoning
`;

    return prompt;
  }

  // ============================================================================
  // Plant.id / Plant.health Provider
  // ============================================================================

  private async identifyWithPlantId(
    image: Buffer,
    context: IdentificationContext
  ): Promise<PlantIdentificationResult> {
    if (!this.plantIdApiKey) {
      throw new Error('Plant.id API key not configured');
    }

    const config = PROVIDER_CONFIG.plantid;
    
    // Convert image buffer to base64
    const base64Image = image.toString('base64');

    if (context.mode === 'plant') {
      return await this.callPlantIdApi(base64Image, context, config);
    } else {
      return await this.callPlantHealthApi(base64Image, context, config);
    }
  }

  private async callPlantIdApi(
    base64Image: string,
    context: IdentificationContext,
    config: typeof PROVIDER_CONFIG.plantid
  ): Promise<PlantIdentificationResult> {
    const response = await fetch(`${config.baseUrl}/identification`, {
      method: 'POST',
      headers: {
        'Api-Key': this.plantIdApiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [`data:image/jpeg;base64,${base64Image}`],
        // Request classification including cultivars (e.g., "Tomato 'Roma'")
        classification_level: 'all',
        // Language for common names and descriptions
        language: 'en',
        // Only request details we actually use (saves bandwidth, same credit cost)
        // Note: similar_images costs extra and we don't display them
        details: ['common_names', 'taxonomy', 'url', 'watering', 'edible_parts', 'propagation_methods'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Plant.id API key is invalid or expired');
      } else if (response.status === 402 || errorText.includes('credits')) {
        throw new Error('Plant.id account has no credits remaining. Purchase credits at admin.kindwise.com');
      }
      throw new Error(`Plant.id API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as PlantIdApiResponse;

    if (!data.result?.classification?.suggestions?.length) {
      return {
        success: false,
        provider: 'plantid',
        mode: 'plant',
        confidence: 0,
        cost: config.pricePerCall,
        method: 'ai',
        error: 'No plant identified',
      };
    }

    const top = data.result.classification.suggestions[0];
    const alternatives = data.result.classification.suggestions.slice(1, 4);

    return {
      success: true,
      provider: 'plantid',
      mode: 'plant',
      species: {
        name: top.details?.common_names?.[0] || top.name,
        scientificName: top.name,
        commonNames: top.details?.common_names,
      },
      confidence: top.probability,
      reasoning: top.details?.description?.value?.slice(0, 200),
      alternatives: alternatives.map(a => ({
        name: a.details?.common_names?.[0] || a.name,
        confidence: a.probability,
      })),
      cost: config.pricePerCall,
      method: 'ai',
    };
  }

  private async callPlantHealthApi(
    base64Image: string,
    context: IdentificationContext,
    config: typeof PROVIDER_CONFIG.plantid
  ): Promise<PlantIdentificationResult> {
    const response = await fetch(`${config.baseUrl}/health_assessment`, {
      method: 'POST',
      headers: {
        'Api-Key': this.plantIdApiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [`data:image/jpeg;base64,${base64Image}`],
        // Language for disease names and treatment info
        language: 'en',
        // Request treatment details (biological, chemical, prevention)
        // Note: similar_images costs extra and we don't display them
        details: ['local_name', 'cause', 'treatment', 'classification'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Plant.id API key is invalid or expired');
      } else if (response.status === 402 || errorText.includes('credits')) {
        throw new Error('Plant.id account has no credits remaining. Purchase credits at admin.kindwise.com');
      }
      throw new Error(`Plant.health API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as PlantHealthApiResponse;

    const isHealthy = data.result?.is_healthy?.binary ?? true;
    const healthProb = data.result?.is_healthy?.probability ?? 1;

    if (isHealthy || !data.result?.disease?.suggestions?.length) {
      return {
        success: true,
        provider: 'plantid',
        mode: 'pest',
        isHealthy: true,
        healthProbability: healthProb,
        diagnosis: {
          name: 'Healthy',
          type: 'abiotic',
        },
        confidence: healthProb,
        reasoning: 'No disease or pest detected',
        cost: config.pricePerCall,
        method: 'ai',
      };
    }

    const top = data.result.disease.suggestions[0];
    const alternatives = data.result.disease.suggestions.slice(1, 4);

    // Map disease type
    let diagnosisType: 'pest' | 'disease' | 'deficiency' | 'abiotic' | 'unknown' = 'disease';
    const nameLower = top.name.toLowerCase();
    if (nameLower.includes('aphid') || nameLower.includes('mite') || nameLower.includes('beetle') || 
        nameLower.includes('caterpillar') || nameLower.includes('slug') || nameLower.includes('snail')) {
      diagnosisType = 'pest';
    } else if (nameLower.includes('deficiency') || nameLower.includes('nutrient')) {
      diagnosisType = 'deficiency';
    } else if (nameLower.includes('sunburn') || nameLower.includes('frost') || nameLower.includes('drought')) {
      diagnosisType = 'abiotic';
    }

    return {
      success: true,
      provider: 'plantid',
      mode: 'pest',
      isHealthy: false,
      healthProbability: 1 - healthProb,
      diagnosis: {
        name: top.details?.local_name || top.name,
        type: diagnosisType,
      },
      confidence: top.probability,
      reasoning: top.details?.description?.slice(0, 200) || top.details?.cause,
      alternatives: alternatives.map(a => ({
        name: a.details?.local_name || a.name,
        confidence: a.probability,
      })),
      treatment: [
        ...(top.details?.treatment?.biological || []),
        ...(top.details?.treatment?.chemical || []),
      ].slice(0, 5),
      prevention: top.details?.treatment?.prevention?.slice(0, 3),
      cost: config.pricePerCall,
      method: 'ai',
    };
  }
}

// Export singleton instance
export const plantIdService = new PlantIdentificationService();
