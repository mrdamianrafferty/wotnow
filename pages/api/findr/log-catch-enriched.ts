// pages/api/findr/log-catch-enriched.ts
// API endpoint for logging catches with automatic environmental enrichment

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { type File as FormidableFile } from 'formidable';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import sharp from 'sharp';
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
    const scientificName = getFieldValue(fields.scientific_name);
    const speciesId = getFieldValue(fields.species_id);
    const notes = getFieldValue(fields.notes);
    const sizeCategory = getFieldValue(fields.size_category) as CatchLogRequest['size_category'] | null;
    const weatherConditions = getFieldValue(fields.weather_conditions);
    const iceNumber = getFieldValue(fields.ice_number);
    const baitUsed = getFieldValue(fields.bait_used);
    const habitatType = getFieldValue(fields.habitat_type);
    const method = getFieldValue(fields.method);
    const depthRange = getFieldValue(fields.depth_range);

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
    let _photoThumbnailUrl: string | null = null; // Generated on-demand via Supabase transform API
    let exifGPS = {
      latitude: null as number | null,
      longitude: null as number | null,
      hasGPS: false,
    };
    let locationSource: CatchLocationSource = 'rectangle';

    const photoFile = files.photo as FormidableFile | FormidableFile[] | undefined;
    
    let photoStoragePath: string | null = null;

    if (photoFile) {
      const file = Array.isArray(photoFile) ? photoFile[0] : photoFile;

      // Step 1: Extract EXIF GPS data from original photo (for enrichment)
      const originalBuffer = fs.readFileSync(file.filepath);
      exifGPS = extractExifGPS(originalBuffer);

      if (exifGPS.hasGPS) {
        locationSource = 'gps'; // EXIF GPS from photo
      }

      // Step 2: Process photo - strip EXIF, optimize for mobile, auto-rotate
      const processedBuffer = await sharp(originalBuffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(800, 800, {
          fit: 'inside', // Maintain aspect ratio, max 800px on longest side
          withoutEnlargement: true, // Don't upscale smaller images
        })
        .jpeg({
          quality: 85, // High quality, good compression
          progressive: true, // Progressive JPEG for faster loading
          mozjpeg: true, // Use mozjpeg for better compression
        })
        .toBuffer();
      // Note: Re-encoding to JPEG automatically strips ALL EXIF data

      const safeUserId = userId || 'anonymous';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const storagePath = `${safeUserId}/${timestamp}.jpg`; // Always .jpg after processing

      // Step 3: Upload privacy-safe, optimized photo
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('catch-photos')
        .upload(storagePath, processedBuffer, {
          contentType: 'image/jpeg',
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

        _photoThumbnailUrl = thumbnailData.publicUrl ?? null;
      }
    } else {
      warnings.push('No photo provided; some enrichment signals may be unavailable.');
    }

    // Location Priority: EXIF GPS > User Location > Rectangle Center
    // 1. EXIF GPS is MOST ACCURATE - taken at exact moment/location of catch
    // 2. User Location is LESS ACCURATE - device GPS at form submission (might be later/elsewhere)
    // 3. Rectangle Center is APPROXIMATE - general area only

    let finalLatitude = exifGPS.latitude;
    let finalLongitude = exifGPS.longitude;

    // Priority 1: EXIF GPS from photo (already set above if hasGPS === true)
    if (exifGPS.hasGPS) {
      console.info('[log-catch-enriched] Using EXIF GPS from photo for accurate location');
    }
    // Priority 2: User location from device GPS (fallback if no photo GPS)
    else {
      const userLat = getNumberValue(fields.user_latitude);
      const userLon = getNumberValue(fields.user_longitude);

      if (userLat && userLon) {
        finalLatitude = userLat;
        finalLongitude = userLon;
        locationSource = 'manual'; // User-supplied GPS from device
        console.info('[log-catch-enriched] Using user-supplied GPS (no photo GPS available)');
        warnings.push('Using device GPS location (no photo GPS available).');
      }
      // Priority 3: Rectangle center (approximate location fallback)
      else {
        // TODO: Look up rectangle center coordinates from rectangleCode
        // For now, we'll use null coordinates and rely on rectangleCode for general area
        finalLatitude = null;
        finalLongitude = null;
        locationSource = 'rectangle';
        console.warn('[log-catch-enriched] No precise GPS available, using rectangle code only');
        warnings.push('No GPS data available; location approximated from fishing area.');
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
    const hasUserLocation = locationSource === 'manual';
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
      species_id: speciesId || 'UNKNOWN', // Required field - use UNKNOWN if not provided
      species_common_name: speciesName,
      scientific_name: scientificName,
      quantity,
      caught_at: catchDate, // Database column is 'caught_at'
      rectangle_code: rectangleCode,
      location_source: locationSource,
      gps_latitude: finalLatitude, // Database column is 'gps_latitude'
      gps_longitude: finalLongitude, // Database column is 'gps_longitude'
      photo_urls: photoUrl ? [photoUrl] : null,
      notes: notes,
      size_category: sizeCategory,
      bait_used: baitUsed,
      habitat_type: habitatType,
      method: method,
      depth_range: depthRange,
      // Store enrichment data in environmental_conditions JSONB
      environmental_conditions: {
        ...(typeof weatherConditions === 'string' && weatherConditions !== '' ? JSON.parse(weatherConditions) : {}),
        depth_meters: enrichedData.bathymetry?.depth_meters || null,
        substrate: enrichedData.substrate?.substrate || null,
        entry_type: entryType,
        ice_number: iceNumber,
        data_quality_score: dataQualityScore,
      },
    };

    // Insert into database
    const { data: insertedCatch, error: insertError } = await supabase
      .from('findr_catch_entries')
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
