import type { NextApiRequest, NextApiResponse } from 'next';
import { plantIdService, type PlantIdentificationResult, type PlantCandidate, type ThreatCandidate, getPlantIdProvider, getProviderConfig } from '@/lib/grow/plantIdentificationService';
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
