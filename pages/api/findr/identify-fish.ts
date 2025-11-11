import type { NextApiRequest, NextApiResponse } from 'next';
import { fishIdService, type IdentificationResult } from '@/lib/findr/fishIdentificationService';
import { hfFishIdService } from '@/lib/findr/huggingfaceService';
import { getFishIdProvider, getProviderConfig } from '@/lib/findr/fishIdProviderConfig';
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

/**
 * Fish identification API endpoint
 *
 * Accepts multipart/form-data with:
 * - image: File (the photo to identify)
 * - data: JSON string with candidates and context
 *
 * Returns:
 * - species: Identified species or list of candidates
 * - method: Identification method used
 * - confidence: 0-1 confidence score
 * - cost: Cost in euros
 * - reasoning: Explanation of identification
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IdentificationResult | { error: string }>
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

    // Convert Buffer to Uint8Array for Blob compatibility
    const uint8Array = new Uint8Array(imageBuffer);
    const imageBlob = new Blob([uint8Array], { type: imageFile.mimetype || 'image/jpeg' });

    // Convert to File object (polyfill for Node.js)
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

    // Get configured provider
    const provider = getFishIdProvider();
    const providerConfig = getProviderConfig(provider);
    console.log('[identify-fish] Using provider:', provider, '-', providerConfig.name);

    // Initialize and call appropriate AI service
    let result: IdentificationResult;
    const startTime = Date.now();

    if (provider === 'huggingface') {
      await hfFishIdService.initializeServerSide();
      console.log('[identify-fish] Processing with HuggingFace -', requestData.candidates.length, 'candidates');
      result = await hfFishIdService.identify(imageFileObject, context);
    } else {
      await fishIdService.initializeServerSide();
      console.log('[identify-fish] Processing with OpenAI -', requestData.candidates.length, 'candidates');
      result = await fishIdService.identify(imageFileObject, context);
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[identify-fish] Completed in ${latencyMs}ms using ${provider} (method: ${result.method}, cost: €${result.cost})`);

    // Clean up temp file
    await fs.unlink(imageFile.filepath).catch(() => {
      // Ignore cleanup errors
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('[identify-fish] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Identification failed',
      // Include error details in development only
      ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
    });
  }
}
