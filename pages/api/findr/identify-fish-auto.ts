import type { NextApiRequest, NextApiResponse } from 'next';
import { getFishIdProvider } from '@/lib/findr/fishIdProviderConfig';
import { fishIdService, type IdentificationResult as OpenAIResult } from '@/lib/findr/fishIdentificationService';
import { hfFishIdService, type IdentificationResult as HFResult } from '@/lib/findr/huggingfaceFishService';
import { logIdentificationMetrics, extractSpeciesInfo } from '@/lib/findr/fishIdentificationMetrics';
import type { QuickLogSpecies } from '@/hooks/useQuickLogSpecies';
import formidable from 'formidable';
import fs from 'fs/promises';

// Disable bodyParser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

interface IdentifyRequest {
  candidates: QuickLogSpecies[];
  context?: {
    location?: {
      coords?: [number, number];
      rectangleCode?: string | null;
      rectangleLabel?: string | null;
    };
    date?: string;
    depth?: number;
  };
}

type IdentificationResult = OpenAIResult | HFResult;

/**
 * Automatic Provider Selection Endpoint
 *
 * Routes to OpenAI or Hugging Face based on FISH_ID_PROVIDER env var
 * - FISH_ID_PROVIDER=openai (default): Uses OpenAI GPT-4o
 * - FISH_ID_PROVIDER=huggingface: Uses Hugging Face ViT local model
 *
 * This allows easy A/B testing and rollback without code changes
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IdentificationResult | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const startTime = Date.now();
  const provider = getFishIdProvider();

  console.log(`[identify-fish-auto] Using provider: ${provider}`);

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

    let requestData: IdentifyRequest;
    try {
      requestData = JSON.parse(dataString);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON in data field' });
    }

    // Validate candidates
    if (!Array.isArray(requestData.candidates) || requestData.candidates.length === 0) {
      return res.status(400).json({ error: 'Candidates array required' });
    }

    // Read image file and convert to File object
    const imageBuffer = await fs.readFile(imageFile.filepath);
    const uint8Array = new Uint8Array(imageBuffer);
    const imageBlob = new Blob([uint8Array], { type: imageFile.mimetype || 'image/jpeg' });
    const imageFileObject = new File([imageBlob], imageFile.originalFilename || 'catch.jpg', {
      type: imageFile.mimetype || 'image/jpeg',
    });

    // Build context
    const context = {
      location: requestData.context?.location,
      date: requestData.context?.date ? new Date(requestData.context.date) : new Date(),
      depth: requestData.context?.depth,
      candidates: requestData.candidates,
    };

    // Route to appropriate provider
    let result: IdentificationResult;

    if (provider === 'huggingface') {
      // Use Hugging Face
      await hfFishIdService.initializeServerSide();
      console.log('[identify-fish-auto] Processing with Hugging Face');
      result = await hfFishIdService.identify(imageFileObject, context);
    } else {
      // Use OpenAI (default)
      await fishIdService.initializeServerSide();
      console.log('[identify-fish-auto] Processing with OpenAI');
      result = await fishIdService.identify(imageFileObject, context);
    }

    // Calculate latency
    const latencyMs = Date.now() - startTime;

    // Log metrics (async, don't wait)
    const { speciesId, speciesName } = extractSpeciesInfo(result);
    logIdentificationMetrics({
      provider,
      rectangleCode: requestData.context?.location?.rectangleCode || null,
      latencyMs,
      costEur: result.cost,
      method: result.method,
      confidence: result.confidence,
      suggestedSpeciesId: speciesId,
      suggestedSpeciesName: speciesName,
      numCandidates: requestData.candidates.length,
    }).catch(err => console.error('[identify-fish-auto] Failed to log metrics:', err));

    // Clean up temp file
    await fs.unlink(imageFile.filepath).catch(() => {
      // Ignore cleanup errors
    });

    console.log(`[identify-fish-auto] Completed with ${provider} in ${latencyMs}ms`);
    return res.status(200).json(result);

  } catch (error) {
    console.error('[identify-fish-auto] Error:', error);

    const totalTime = Date.now() - startTime;
    console.log(`[identify-fish-auto] Failed after ${totalTime}ms`);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Identification failed',
      // Include error details in development only
      ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
    });
  }
}
