import type { NextApiRequest, NextApiResponse } from 'next';
import { plantIdService, type PlantIdentificationResult, type PlantCandidate, type ThreatCandidate, getPlantIdProvider, getProviderConfig } from '@/lib/grow/plantIdentificationService';
import { getSupabaseServerClient } from '@/lib/supabase/serverClient';
import { getWikipediaImageLicense, getWikipediaArticleImageLicense, isWikimediaUrl, getWikipediaSummary, getWikipediaSummaryByScientificName } from '@/lib/grow/wikipediaLicense';
import { createClient } from '@supabase/supabase-js';
import { getTierLimits, type GrowSubscriptionTier } from '@/lib/grow/subscription';
import { checkRateLimit, RateLimitError } from '@/lib/utils/rate-limiter';
import formidable from 'formidable';
import fs from 'fs/promises';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Disable bodyParser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

interface IdentifyPlantRequest {
  mode: 'plant' | 'pest';
  context?: {
    climateZone?: string;
    month?: number;
    userPlants?: string[]; // Names of plants in user's garden
  };
  // Provider override for testing
  provider?: 'openai' | 'plantid';
}

/**
 * Plant & Pest Identification API endpoint
 *
 * Accepts multipart/form-data with:
 * - image: File (the photo to identify)
 * - data: JSON string with mode and context
 *
 * Query params:
 * - provider: 'openai' | 'plantid' (optional override)
 *
 * Returns:
 * - PlantIdentificationResult with species/diagnosis, confidence, cost
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlantIdentificationResult | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Rate limiting: 5 requests per minute (strict) - before formidable parsing
  try {
    await checkRateLimit(req, { maxRequests: 5, windowMs: 60 * 1000 });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return res.status(429).json({ error: error.message, retryAfter: error.retryAfter } as { error: string });
    }
    throw error;
  }

  try {
    // Parse multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    // Extract image file
    const imageFile = files.image?.[0];
    if (!imageFile) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Extract request data
    const dataString = fields.data?.[0];
    if (!dataString) {
      return res.status(400).json({ error: 'No data provided' });
    }

    let requestData: IdentifyPlantRequest;
    try {
      requestData = JSON.parse(dataString);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON in data field' });
    }

    // Validate mode
    if (!requestData.mode || !['plant', 'pest'].includes(requestData.mode)) {
      return res.status(400).json({ error: 'Mode must be "plant" or "pest"' });
    }

    // =========================================================================
    // USAGE TRACKING - Check subscription tier and limits
    // =========================================================================
    const authHeader = req.headers.authorization;
    let userId: string | null = null;
    let userTier: GrowSubscriptionTier = 'seed';

    // Create service client for usage tracking
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Extract user from auth token if provided
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabaseClient = getSupabaseServerClient();
      const { data: { user } } = await supabaseClient.auth.getUser(token);

      if (user) {
        userId = user.id;

        // Get user's subscription tier
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('grow_subscription_tier')
          .eq('id', userId)
          .single();

        if (profile?.grow_subscription_tier) {
          userTier = profile.grow_subscription_tier as GrowSubscriptionTier;
        }
      }
    }

    // Get tier limits
    const limits = getTierLimits(userTier);
    const usageType = requestData.mode === 'plant' ? 'plant_id' : 'pest_disease';
    const limitKey = requestData.mode === 'plant' ? 'plantIdCalls' : 'pestDiseaseCalls';
    const usageLimit = limits[limitKey];

    // Check current usage if user is authenticated and has a limit
    if (userId && usageLimit !== -1) {
      const { data: currentUsage } = await serviceClient.rpc('grow_get_current_usage', {
        p_user_id: userId,
      });

      const currentCount = requestData.mode === 'plant'
        ? (currentUsage?.plant_id_calls || 0)
        : (currentUsage?.pest_disease_calls || 0);

      if (currentCount >= usageLimit) {
        console.log(`[identify-plant] Usage limit reached for user ${userId}: ${currentCount}/${usageLimit} ${usageType} calls`);
        return res.status(429).json({
          error: 'Usage limit reached',
          message: `You've used all ${usageLimit} ${requestData.mode === 'plant' ? 'plant identification' : 'pest diagnosis'} calls this month. Upgrade for more.`,
          currentUsage: currentCount,
          limit: usageLimit,
          tier: userTier,
          upgradeUrl: '/grow/premium',
        } as { error: string });
      }
    }

    // Read image file
    const imageBuffer = await fs.readFile(imageFile.filepath);

    // Get provider (from request, query param, or env)
    const provider = 
      requestData.provider || 
      (req.query.provider as 'openai' | 'plantid') || 
      getPlantIdProvider();
    
    const providerConfig = getProviderConfig(provider);
    console.log('[identify-plant] Using provider:', provider, '-', providerConfig.name);

    // For now, don't pre-populate candidates from database
    // The AI models work well without explicit candidate lists
    // If needed, candidates can be passed from the client
    const plantCandidates: PlantCandidate[] = [];
    const threatCandidates: ThreatCandidate[] = [];

    // Build context for identification
    const context = {
      mode: requestData.mode,
      climateZone: requestData.context?.climateZone,
      month: requestData.context?.month || new Date().getMonth() + 1,
      plantCandidates,
      threatCandidates,
      userPlants: requestData.context?.userPlants,
    };

    // Initialize and call identification service
    await plantIdService.initializeServerSide();

    const startTime = Date.now();
    console.log(`[identify-plant] Processing ${requestData.mode} with ${provider}`, {
      plantCandidates: plantCandidates.length,
      threatCandidates: threatCandidates.length,
    });

    const result = await plantIdService.identify(imageBuffer, context, provider);

    const latencyMs = Date.now() - startTime;
    console.log(`[identify-plant] Completed in ${latencyMs}ms using ${provider} (method: ${result.method}, cost: €${result.cost})`);

    // Clean up temp file
    await fs.unlink(imageFile.filepath).catch(() => {
      // Ignore cleanup errors
    });

    // Look up the species in our database to get the canonical slug
    if (result.success && result.mode === 'plant' && result.species) {
      const slug = await lookupSpeciesSlug(
        result.species.scientificName,
        result.species.name,
        result.species.commonNames
      );
      if (slug) {
        result.species.slug = slug;
        result.notInDatabase = false;
        console.log(`[identify-plant] Matched to species slug: ${slug}`);
      } else {
        // Species not in our database - mark it and fetch Wikipedia info
        result.notInDatabase = true;
        console.log(`[identify-plant] Species not in database: ${result.species.scientificName || result.species.name}`);
        
        // Fetch Wikipedia summary for the species
        try {
          let wikiSummary = null;
          
          // The wikiUrl from Plant.id might be an object with language keys, not a string
          // e.g., { en: "https://...", fr: "https://...", global: "https://..." }
          let wikiUrlString: string | null = null;
          if (result.species.wikiUrl) {
            if (typeof result.species.wikiUrl === 'string') {
              wikiUrlString = result.species.wikiUrl;
            } else if (typeof result.species.wikiUrl === 'object') {
              const urlObj = result.species.wikiUrl as Record<string, string | null>;
              // Prefer English, then other languages, skip 'global' (GBIF) links
              wikiUrlString = urlObj.en || urlObj.de || urlObj.fr || urlObj.es || urlObj.it || urlObj.pt || urlObj.nl || null;
            }
          }
          
          // Try the wikiUrl first if available
          if (wikiUrlString) {
            wikiSummary = await getWikipediaSummary(wikiUrlString);
          }
          
          // If no wikiUrl or failed, try by scientific name
          if (!wikiSummary && result.species.scientificName) {
            wikiSummary = await getWikipediaSummaryByScientificName(result.species.scientificName);
          }
          
          if (wikiSummary) {
            result.species.wikiDescription = wikiSummary.extract;
            result.species.wikiUrl = wikiSummary.pageUrl;
            result.species.wikiAttribution = wikiSummary.attribution;
            result.species.wikiLanguage = wikiSummary.language;
            
            // Use Wikipedia's thumbnail/image if we don't have one already
            if (!result.species.wikiImageUrl && wikiSummary.thumbnailUrl) {
              result.species.wikiImageUrl = wikiSummary.thumbnailUrl;
            }
            if (!result.species.wikiImageUrl && wikiSummary.originalImageUrl) {
              result.species.wikiImageUrl = wikiSummary.originalImageUrl;
            }
            
            console.log(`[identify-plant] Wikipedia summary fetched (${wikiSummary.language}): ${wikiSummary.extract?.substring(0, 100)}...`);
          }
        } catch (wikiError) {
          console.warn('[identify-plant] Failed to fetch Wikipedia summary:', wikiError);
        }
        
        // Try to get Wikipedia image license info (for proper attribution)
        if (result.species.wikiImageUrl || result.species.imageUrl) {
          try {
            let licenseInfo;
            
            // Check the wiki image we just found
            if (result.species.wikiImageUrl && isWikimediaUrl(result.species.wikiImageUrl)) {
              licenseInfo = await getWikipediaImageLicense(result.species.wikiImageUrl);
            }
            // Or the original image URL from identification
            else if (result.species.imageUrl && isWikimediaUrl(result.species.imageUrl)) {
              licenseInfo = await getWikipediaImageLicense(result.species.imageUrl);
            } 
            // Otherwise try to get the main image from the Wikipedia article
            else if (result.species.wikiUrl) {
              licenseInfo = await getWikipediaArticleImageLicense(result.species.wikiUrl);
            }
            
            if (licenseInfo && !licenseInfo.error) {
              // Update image URL if we got a better one
              if (!result.species.wikiImageUrl) {
                result.species.wikiImageUrl = licenseInfo.thumbnailUrl || licenseInfo.imageUrl || undefined;
              }
              result.species.wikiImageLicense = licenseInfo.licenseShortName || undefined;
              result.species.wikiImageAllowed = licenseInfo.isAllowed;
              result.species.wikiImageAttribution = licenseInfo.attribution || undefined;
              console.log(`[identify-plant] Wikipedia image license: ${licenseInfo.licenseShortName} (allowed: ${licenseInfo.isAllowed})`);
            }
          } catch (licenseError) {
            console.warn('[identify-plant] Failed to fetch Wikipedia image license:', licenseError);
          }
        }
      }
    }

    // For pest/disease identification, augment with our threat library and log for curation
    if (result.success && result.mode === 'pest' && result.diagnosis) {
      const threatAugmentation = await augmentAndLogThreatIdentification(
        result,
        provider,
        requestData.context
      );
      
      // Set whether threat is in our library
      result.threatInLibrary = threatAugmentation.matched;
      
      // Merge library data if we found a match
      if (threatAugmentation.matched) {
        result.diagnosis.slug = threatAugmentation.slug;
        
        // Add scientific name if we have it
        if (threatAugmentation.scientificName) {
          result.diagnosis.scientificName = threatAugmentation.scientificName;
        }
        
        // Add library description and recognition for richer UI
        if (threatAugmentation.description) {
          result.threatDescription = threatAugmentation.description;
        }
        if (threatAugmentation.recognition) {
          result.threatRecognition = threatAugmentation.recognition;
        }
        
        // Add threat metadata
        result.threatType = threatAugmentation.threatType;
        result.threatSeverity = threatAugmentation.severityDefault;
        result.threatContagious = threatAugmentation.contagious;
        
        // Add rich treatment data from our library
        if (threatAugmentation.libraryTreatment?.length) {
          result.treatment = [
            ...(threatAugmentation.libraryTreatment || []),
            ...(result.treatment || []).filter(t => 
              !threatAugmentation.libraryTreatment?.some(lt => 
                lt.toLowerCase().includes(t.toLowerCase().slice(0, 20))
              )
            ),
          ];
        }
        if (threatAugmentation.libraryPrevention?.length) {
          result.prevention = [
            ...(threatAugmentation.libraryPrevention || []),
            ...(result.prevention || []).filter(p => 
              !threatAugmentation.libraryPrevention?.some(lp => 
                lp.toLowerCase().includes(p.toLowerCase().slice(0, 20))
              )
            ),
          ];
        }
        // Add image from our library if available
        if (threatAugmentation.imageUrl) {
          result.threatImageUrl = threatAugmentation.imageUrl;
        }
        console.log(`[identify-plant] Augmented with threat library: ${threatAugmentation.slug}`);
      }
    }

    // =========================================================================
    // INCREMENT USAGE - Track successful identification
    // =========================================================================
    if (userId && result.success) {
      try {
        const { data: usageResult, error: usageError } = await serviceClient.rpc('grow_increment_usage', {
          p_user_id: userId,
          p_usage_type: usageType,
          p_increment: 1,
        });

        if (usageError) {
          console.warn('[identify-plant] Failed to increment usage:', usageError);
        } else {
          console.log(`[identify-plant] Usage incremented for ${userId}: ${usageType} = ${usageResult?.current_count}`);
        }
      } catch (usageErr) {
        console.warn('[identify-plant] Error tracking usage:', usageErr);
        // Don't fail the request - usage tracking is not critical
      }
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('[identify-plant] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Identification failed',
      // Include error details in development only
      ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
    } as { error: string });
  }
}

/**
 * Look up a species in our database by scientific name, common name, or aliases
 * Returns the canonical slug if found, null otherwise
 */
async function lookupSpeciesSlug(
  scientificName?: string,
  commonName?: string,
  commonNames?: string[]
): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  
  // Try scientific name first (most reliable)
  if (scientificName) {
    // Exact match
    let { data } = await supabase
      .from('plant_species')
      .select('slug')
      .ilike('scientific_name', scientificName)
      .limit(1)
      .single();
    
    if (data?.slug) return data.slug;
    
    // Partial match (e.g., "Daucus carota" matches "Daucus carota subsp. sativus")
    ({ data } = await supabase
      .from('plant_species')
      .select('slug')
      .ilike('scientific_name', `${scientificName}%`)
      .limit(1)
      .single());
    
    if (data?.slug) return data.slug;
  }
  
  // Try common name
  if (commonName) {
    const { data } = await supabase
      .from('plant_species')
      .select('slug')
      .ilike('name', commonName)
      .limit(1)
      .single();
    
    if (data?.slug) return data.slug;
  }
  
  // Try each common name variant
  if (commonNames && commonNames.length > 0) {
    for (const name of commonNames) {
      const { data } = await supabase
        .from('plant_species')
        .select('slug')
        .ilike('name', name)
        .limit(1)
        .single();
      
      if (data?.slug) return data.slug;
    }
  }
  
  return null;
}

interface ThreatAugmentationResult {
  matched: boolean;
  slug?: string;
  matchConfidence: 'exact' | 'fuzzy' | 'none';
  libraryTreatment?: string[];
  libraryPrevention?: string[];
  imageUrl?: string;
  // Additional library data
  description?: string;
  recognition?: string;
  threatType?: string;
  severityDefault?: number;
  contagious?: boolean;
  scientificName?: string;
}

/**
 * Look up identified threat in our library and log for future curation
 */
async function augmentAndLogThreatIdentification(
  result: PlantIdentificationResult,
  provider: string,
  context?: {
    climateZone?: string;
    month?: number;
    userPlants?: string[];
  }
): Promise<ThreatAugmentationResult> {
  const supabase = getSupabaseServerClient();
  const diagnosis = result.diagnosis!;
  
  let matchedThreat: {
    id: string;
    slug: string;
    description: string | null;
    recognition: string | null;
    threat_type: string;
    severity_default: number;
    contagious: boolean;
    scientific_name: string | null;
    card_json: {
      treatment_pesticide_free?: string[];
      prevention_bullets?: string[];
      recognition_bullets?: string[];
      wikimedia_image?: { local_path?: string };
    } | null;
  } | null = null;
  let matchConfidence: 'exact' | 'fuzzy' | 'none' = 'none';
  
  // Try exact match on common_name_en
  const { data: exactMatch } = await supabase
    .from('garden_threat')
    .select('id, slug, description, recognition, threat_type, severity_default, contagious, scientific_name, card_json')
    .ilike('common_name_en', diagnosis.name)
    .limit(1)
    .single();
  
  if (exactMatch) {
    matchedThreat = exactMatch;
    matchConfidence = 'exact';
  } else {
    // Try fuzzy match - search for partial matches
    const searchTerms = diagnosis.name.toLowerCase().split(/\s+/);
    for (const term of searchTerms) {
      if (term.length < 3) continue; // Skip short words
      
      const { data: fuzzyMatch } = await supabase
        .from('garden_threat')
        .select('id, slug, description, recognition, threat_type, severity_default, contagious, scientific_name, card_json')
        .or(`common_name_en.ilike.%${term}%,scientific_name.ilike.%${term}%`)
        .limit(1)
        .single();
      
      if (fuzzyMatch) {
        matchedThreat = fuzzyMatch;
        matchConfidence = 'fuzzy';
        break;
      }
    }
  }
  
  // Log the identification for future curation (fire and forget)
  logThreatIdentification(
    result,
    provider,
    matchedThreat?.id || null,
    matchConfidence,
    context
  ).catch(err => console.warn('[identify-plant] Failed to log threat identification:', err));
  
  if (!matchedThreat) {
    return { matched: false, matchConfidence: 'none' };
  }
  
  // Extract treatment and prevention from card_json
  const cardJson = matchedThreat.card_json;
  const libraryTreatment = cardJson?.treatment_pesticide_free || [];
  const libraryPrevention = cardJson?.prevention_bullets || [];
  const imageUrl = cardJson?.wikimedia_image?.local_path 
    ? cardJson.wikimedia_image.local_path 
    : undefined;
  
  return {
    matched: true,
    slug: matchedThreat.slug,
    matchConfidence,
    libraryTreatment,
    libraryPrevention,
    imageUrl,
    // Additional library data for richer UI
    description: matchedThreat.description || undefined,
    recognition: matchedThreat.recognition || undefined,
    threatType: matchedThreat.threat_type,
    severityDefault: matchedThreat.severity_default,
    contagious: matchedThreat.contagious,
    scientificName: matchedThreat.scientific_name || undefined,
  };
}

/**
 * Log threat identification for future library curation
 */
async function logThreatIdentification(
  result: PlantIdentificationResult,
  provider: string,
  matchedThreatId: string | null,
  matchConfidence: 'exact' | 'fuzzy' | 'none',
  context?: {
    climateZone?: string;
    month?: number;
    userPlants?: string[];
  }
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const diagnosis = result.diagnosis!;
  
  await supabase
    .from('threat_identification_log')
    .insert({
      identified_name: diagnosis.name,
      scientific_name: null, // Could extract from AI response if available
      threat_type: diagnosis.type,
      confidence: result.confidence,
      provider,
      raw_response: {
        diagnosis,
        reasoning: result.reasoning,
        alternatives: result.alternatives,
        isHealthy: result.isHealthy,
        healthProbability: result.healthProbability,
      },
      matched_threat_id: matchedThreatId,
      match_confidence: matchConfidence,
      user_plants: context?.userPlants || [],
      climate_zone: context?.climateZone,
      month: context?.month,
      ai_treatment: result.treatment,
      ai_prevention: result.prevention,
      ai_reasoning: result.reasoning,
      curation_status: matchConfidence === 'none' ? 'pending' : 'matched',
    });
  
  console.log(`[identify-plant] Logged threat identification: ${diagnosis.name} (match: ${matchConfidence})`);
}
