// pages/api/findr/log-catch-enriched.ts
// API endpoint for logging catches with automatic environmental enrichment

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { type File as FormidableFile } from 'formidable';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { extractExifGPS, enrichCatchData } from '@/lib/findr/enrichCatchData';
import { calculateDataQualityScore, calculateCatchPoints } from '@/lib/findr/dataQuality';
import type {
  CatchLogRequest,
  CatchLogResponse,
  CatchEnrichmentResult,
  SubstrateType,
  LogCatchEnrichedResponse,
  CatchLocationSource,
} from '@/types/findr-enrichment';

// Disable Next.js body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const SUBSTRATE_TYPES: ReadonlySet<string> = new Set([
  'rock',
  'sand',
  'mud',
  'gravel',
  'mixed',
  'unknown',
]);

const isSubstrateType = (value: string | null): value is SubstrateType =>
  Boolean(value && SUBSTRATE_TYPES.has(value));

const _normalizeSubstrate = (value: string | null): SubstrateType | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isSubstrateType(normalized) ? (normalized as SubstrateType) : null;
};

/**
 * Parse FormData from multipart request
 */
async function parseForm(req: NextApiRequest): Promise<{
  fields: formidable.Fields;
  files: formidable.Files;
}> {
  const form = formidable({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

/**
 * Extract string value from formidable field
 */
function getFieldValue(field: string | string[] | undefined): string | null {
  if (Array.isArray(field)) return field[0] || null;
  return field || null;
}

/**
 * Extract number value from formidable field
 */
function getNumberValue(field: string | string[] | undefined): number | null {
  const value = getFieldValue(field);
  if (!value) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Main API handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CatchLogResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const { fields, files } = await parseForm(req);

    // Extract required fields
    const speciesName = getFieldValue(fields.species_name);
    const quantity = getNumberValue(fields.quantity);
    const catchDate = getFieldValue(fields.catch_date);
    const userId = getFieldValue(fields.user_id);

    // Validate required fields
    if (!speciesName || !quantity || !catchDate) {
      return res.status(400).json({
        error: 'Missing required fields: species_name, quantity, catch_date',
      });
    }

    // Extract optional fields
    const entryType = (getFieldValue(fields.entry_type) || 'detailed') as CatchLogRequest['entry_type'];
    const rectangleCode = getFieldValue(fields.rectangle_code);
    const notes = getFieldValue(fields.notes);
    const sizeCategory = getFieldValue(fields.size_category) as CatchLogRequest['size_category'] | null;
    const weatherConditions = getFieldValue(fields.weather_conditions);
    const iceNumber = getFieldValue(fields.ice_number);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const warnings: string[] = [];

    if (!userId) {
      console.warn('[log-catch-enriched] Catch submitted without user_id. Treating as anonymous.');
      warnings.push('Catch logged without authenticated user context.');
    }

    // Handle photo upload and EXIF extraction
    let photoUrl: string | null = null;
    let photoThumbnailUrl: string | null = null;
    let exifGPS = {
      latitude: null as number | null,
      longitude: null as number | null,
      hasGPS: false,
    };
    let locationSource: CatchLocationSource = 'rectangle_center';

    const photoFile = files.photo as FormidableFile | FormidableFile[] | undefined;
    
    let photoStoragePath: string | null = null;

    if (photoFile) {
      const file = Array.isArray(photoFile) ? photoFile[0] : photoFile;
      
      // Extract EXIF GPS data
      const photoBuffer = fs.readFileSync(file.filepath);
      exifGPS = extractExifGPS(photoBuffer);

      if (exifGPS.hasGPS) {
        locationSource = 'exif_gps';
      }

      const safeUserId = userId || 'anonymous';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const originalName = file.originalFilename ?? 'catch-photo.jpg';
      const extension = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '.jpg';
      const storagePath = `${safeUserId}/${timestamp}${extension}`;

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('catch-photos')
        .upload(storagePath, photoBuffer, {
          contentType: file.mimetype || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('[log-catch-enriched] Failed to upload photo to storage:', uploadError);
        warnings.push('Photo upload failed; the image will not be available in insights.');
      } else if (uploadData) {
        photoStoragePath = uploadData.path;
        const { data: publicUrlData } = supabase
          .storage
          .from('catch-photos')
          .getPublicUrl(storagePath);

        photoUrl = publicUrlData.publicUrl ?? null;

        const { data: thumbnailData } = supabase
          .storage
          .from('catch-photos')
          .getPublicUrl(storagePath, {
            transform: {
              width: 320,
              height: 320,
              resize: 'cover',
              quality: 80,
            },
          });

        photoThumbnailUrl = thumbnailData.publicUrl ?? null;

        // Note: photoThumbnailUrl is for future use in UI optimization
        void photoThumbnailUrl;
      }
    } else {
      warnings.push('No photo provided; some enrichment signals may be unavailable.');
    }

    // Fallback to user location if provided and no EXIF GPS
    let finalLatitude = exifGPS.latitude;
    let finalLongitude = exifGPS.longitude;

    if (!exifGPS.hasGPS) {
      const userLat = getNumberValue(fields.user_latitude);
      const userLon = getNumberValue(fields.user_longitude);
      
      if (userLat && userLon) {
        finalLatitude = userLat;
        finalLongitude = userLon;
        locationSource = 'user_location';
      }
    }

    if (!exifGPS.hasGPS) {
      if (locationSource === 'rectangle_center') {
        warnings.push('Precise location unavailable; using ICES rectangle centre.');
      } else if (locationSource === 'user_location') {
        warnings.push('Using user-supplied coordinates (no photo GPS available).');
      }
    }

    // Enrich catch data with environmental data
    const enrichedData = await enrichCatchData({
      latitude: finalLatitude,
      longitude: finalLongitude,
      exifData: {
        latitude: exifGPS.latitude,
        longitude: exifGPS.longitude,
        altitude: null,
        timestamp: null,
        hasGPS: exifGPS.hasGPS,
      },
    });

    // Prepare catch entry data
    const hasUserLocation = locationSource === 'user_location';
    const hasNotes = Boolean(notes && notes.trim().length > 0);
    const hasEnvironmentalConditions =
      Boolean(weatherConditions && typeof weatherConditions === 'string' && weatherConditions.trim() !== '' && weatherConditions.trim() !== '{}');

    const dataQualityScore = calculateDataQualityScore({
      hasPhoto: !!photoUrl,
      hasGPS: exifGPS.hasGPS,
      hasUserLocation,
      hasDepth: !!enrichedData.bathymetry?.depth_meters,
      hasSubstrate: !!enrichedData.substrate?.substrate && enrichedData.substrate.substrate !== 'unknown',
      hasNotes,
      hasEnvironmentalData: hasEnvironmentalConditions,
      entryType,
    });

    const catchEntry: Record<string, unknown> = {
      user_id: userId,
      species_name: speciesName,
      quantity,
      catch_date: catchDate,
      entry_type: entryType,
      rectangle_code: rectangleCode,
      location_source: locationSource,
      latitude: finalLatitude,
      longitude: finalLongitude,
      depth_meters: enrichedData.bathymetry?.depth_meters || null,
      substrate: enrichedData.substrate?.substrate || null,
      photo_url: photoUrl,
      notes: notes,
      size_category: sizeCategory,
      weather_conditions: weatherConditions,
      ice_number: iceNumber,
      data_quality_score: dataQualityScore,
    };

    // Insert into database
    const { data: insertedCatch, error: insertError } = await supabase
      .from('findr_catches')
      .insert([catchEntry])
      .select()
      .single();

    if (insertError) {
      throw new Error(`Database error: ${insertError.message}`);
    }

    // Calculate points earned
    const pointsEarned = calculateCatchPoints({
      hasPhoto: !!photoUrl,
      hasGPS: exifGPS.hasGPS,
      hasUserLocation,
      entryType,
      dataQualityScore,
    });

    // Update user points (if user_id provided)
    if (userId) {
      await supabase.rpc('increment_user_points', {
        p_user_id: userId,
        p_points: pointsEarned,
      });
    }

    // Prepare enrichment status
    const enrichmentStatus: CatchEnrichmentResult = {
      has_exif_gps: exifGPS.hasGPS,
      depth_found: !!enrichedData.bathymetry?.depth_meters,
      substrate_found: !!enrichedData.substrate?.substrate && 
                      enrichedData.substrate.substrate !== 'unknown',
      conditions_found: hasEnvironmentalConditions,
      enrichment_timestamp: enrichedData.enrichment_timestamp,
      depth_meters: enrichedData.bathymetry?.depth_meters ?? null,
      substrate: enrichedData.substrate?.substrate ?? null,
    };

    if (finalLatitude && finalLongitude) {
      if (!enrichedData.bathymetry?.depth_meters) {
        warnings.push('Bathymetry depth unavailable for supplied coordinates.');
      }
      if (!enrichedData.substrate?.substrate || enrichedData.substrate.substrate === 'unknown') {
        warnings.push('Substrate classification unavailable for supplied coordinates.');
      }
    }

    const rawResponse: LogCatchEnrichedResponse = {
      success: true,
      catchId: insertedCatch?.id ?? null,
      photoUrl,
      photoStoragePath,
      enrichment: enrichmentStatus,
      warnings,
      message: 'Catch logged successfully',
      points_earned: pointsEarned,
      catch: insertedCatch ?? undefined,
    };

    // Return success response
    const response: CatchLogResponse = {
      success: true,
      message: 'Catch logged successfully',
      catch: {
        id: insertedCatch?.id ?? null,
        depth_meters: enrichedData.bathymetry?.depth_meters ?? null,
        substrate: enrichedData.substrate?.substrate ?? null,
      },
      enrichment: {
        has_exif_gps: exifGPS.hasGPS,
        depth_found: !!enrichedData.bathymetry?.depth_meters,
        substrate_found: !!enrichedData.substrate?.substrate && enrichedData.substrate.substrate !== 'unknown',
        conditions_found: hasEnvironmentalConditions,
        enrichment_timestamp: enrichedData.enrichment_timestamp,
        depth_meters: enrichedData.bathymetry?.depth_meters ?? null,
        substrate: enrichedData.substrate?.substrate ?? null,
      },
      points_earned: pointsEarned,
      warnings,
      raw: rawResponse,
    };

    console.info('[log-catch-enriched] Catch stored', {
      userId: userId ?? 'anonymous',
      locationSource,
      hasPhoto: !!photoUrl,
      hasGPS: exifGPS.hasGPS,
      dataQualityScore,
      pointsEarned,
      warningsCount: warnings.length,
    });

    return res.status(201).json(response);
  } catch (error) {
    console.error('Error logging catch:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
