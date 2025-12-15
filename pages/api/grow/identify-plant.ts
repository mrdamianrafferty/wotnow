import type { NextApiRequest, NextApiResponse } from 'next';
import { plantIdService, type PlantIdentificationResult, type PlantCandidate, type ThreatCandidate, getPlantIdProvider, getProviderConfig } from '@/lib/grow/plantIdentificationService';
import { getSupabaseServerClient } from '@/lib/supabase/serverClient';
import { getWikipediaImageLicense, getWikipediaArticleImageLicense, isWikimediaUrl, getWikipediaSummary, getWikipediaSummaryByScientificName } from '@/lib/grow/wikipediaLicense';
import formidable from 'formidable';
import fs from 'fs/promises';

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
          
          // Try the wikiUrl first if available
          if (result.species.wikiUrl) {
            wikiSummary = await getWikipediaSummary(result.species.wikiUrl);
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

    // TODO: Track usage for budget management (like fish ID)

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
