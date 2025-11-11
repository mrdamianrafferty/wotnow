import type { NextApiRequest, NextApiResponse } from 'next';
import { hfFishService } from '@/lib/findr/huggingfaceFishService';
import type { IdentificationResult } from '@/lib/findr/fishIdentificationService';
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
 * Hugging Face Fish Identification API Endpoint
 * ==============================================
 *
 * FREE alternative to OpenAI (saves $50/month)
 *
 * Accepts multipart/form-data with:
 * - image: File (the photo to identify)
 * - data: JSON string with candidates and context
 *
 * Returns:
 * - species: Identified species or list of candidates
 * - method: 'ai' or 'manual_selection'
 * - confidence: 0-1 confidence score
 * - cost: Always $0.00 (self-hosted)
 * - reasoning: Explanation of identification
 * - message: User-friendly message
 *
 * Performance:
 * - First request: ~3-5s (model loading)
 * - Subsequent requests: ~200-500ms (inference only)
 * - Model cached locally after first load (~400MB)
 *
 * Note: This endpoint uses @xenova/transformers (Transformers.js)
 * which runs ONNX models in Node.js. No GPU required.
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
    if (!Array.isArray(requestData.candidates)) {
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

    // Initialize Hugging Face service (cached after first call)
    console.log('[identify-fish-hf] Initializing Hugging Face model...');
    const initStart = Date.now();
    await hfFishService.initialize();
    const initTime = Date.now() - initStart;
    console.log(`[identify-fish-hf] Model ready in ${initTime}ms`);

    // Call Hugging Face identification service
    console.log('[identify-fish-hf] Processing identification with', requestData.candidates.length, 'candidates');
    const result = await hfFishService.identify(imageFileObject, context);

    // Log performance stats
    const stats = hfFishService.getStats();
    console.log('[identify-fish-hf] Stats:', stats);

    // Clean up temp file
    await fs.unlink(imageFile.filepath).catch(() => {
      // Ignore cleanup errors
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('[identify-fish-hf] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Identification failed',
      // Include error details in development only
      ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
    });
  }
}
