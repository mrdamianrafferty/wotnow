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
    // Extract and verify user from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[log-catch-enriched] Missing authorization header');
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    // Initialize Supabase client for auth verification
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user session with Supabase
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.warn('[log-catch-enriched] Auth verification failed:', authError?.message);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const userId = user.id; // Extract user ID from verified token
    console.log('[log-catch-enriched] Starting form parsing for user:', userId);

    // Parse form data - wrap in try-catch to catch formidable errors
    let fields, files;
    try {
      const parsed = await parseForm(req);
      fields = parsed.fields;
      files = parsed.files;
      console.log('[log-catch-enriched] Form parsed successfully');
    } catch (parseError) {
      console.error('[log-catch-enriched] Form parsing failed:', parseError);
      throw new Error(`Failed to parse form data: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Extract required fields
    const speciesName = getFieldValue(fields.species_name);
    const quantity = getNumberValue(fields.quantity);
    const catchDate = getFieldValue(fields.catch_date);

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

    // Use the authenticated Supabase client for database operations
    const supabase = supabaseAuth;

    const warnings: string[] = [];

    // Handle photo upload and EXIF extraction
    let photoUrl: string | null = null;
    let _photoThumbnailUrl: string | null = null; // Generated on-demand via Supabase transform API
    let exifGPS = {
      latitude: null as number | null,
      longitude: null as number | null,
      altitude: null as number | null,
      timestamp: null as string | null,
      hasGPS: false,
    };
    let locationSource: CatchLocationSource = 'rectangle';

    const photoFile = files.photo as FormidableFile | FormidableFile[] | undefined;

    let photoStoragePath: string | null = null;

    if (photoFile) {
      const file = Array.isArray(photoFile) ? photoFile[0] : photoFile;

      // Step 1: Extract EXIF GPS data and timestamp from original photo (for enrichment)
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
    let enrichedData;
    try {
      enrichedData = await enrichCatchData({
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
    } catch (enrichError) {
      console.error('[log-catch-enriched] Enrichment failed, continuing without environmental data:', enrichError);
      warnings.push('Environmental data enrichment failed; catch logged without depth/substrate data.');
      // Create empty enrichment result to allow catch logging to continue
      enrichedData = {
        bathymetry: null,
        substrate: null,
        enrichment_timestamp: new Date().toISOString(),
      };
    }

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

    // Determine the best timestamp to use for caught_at:
    // Priority 1: EXIF timestamp from photo (for accurate historical catches)
    // Priority 2: Current time with form date (for catches logged right now)
    // Priority 3: Form date at midnight (fallback)
    let finalCaughtAt: string;

    if (exifGPS.timestamp) {
      // Use EXIF timestamp if available
      try {
        // Parse EXIF timestamp (format: "2020:09:01 14:23:45")
        const exifDate = exifGPS.timestamp.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
        const parsedDate = new Date(exifDate);
        if (!isNaN(parsedDate.getTime())) {
          finalCaughtAt = parsedDate.toISOString();
          console.info('[log-catch-enriched] Using EXIF timestamp for caught_at:', finalCaughtAt);
        } else {
          throw new Error('Invalid EXIF timestamp');
        }
      } catch (error) {
        console.warn('[log-catch-enriched] Failed to parse EXIF timestamp:', error);
        // Fall back to current time with form date
        const now = new Date();
        const formDateObj = new Date(catchDate);
        formDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        finalCaughtAt = formDateObj.toISOString();
        console.info('[log-catch-enriched] Using current time with form date:', finalCaughtAt);
      }
    } else {
      // No EXIF timestamp - use current time combined with form date
      const now = new Date();
      const formDateObj = new Date(catchDate);

      // If the form date is today, use current time exactly
      const today = new Date();
      if (formDateObj.toDateString() === today.toDateString()) {
        finalCaughtAt = now.toISOString();
        console.info('[log-catch-enriched] Using current time (catch logged today):', finalCaughtAt);
      } else {
        // Historical catch without EXIF - use noon on the selected date
        formDateObj.setHours(12, 0, 0, 0);
        finalCaughtAt = formDateObj.toISOString();
        console.info('[log-catch-enriched] Using noon for historical date:', finalCaughtAt);
      }
    }

    const catchEntry: Record<string, unknown> = {
      user_id: userId,
      species_id: speciesId || 'UNKNOWN', // Required field - use UNKNOWN if not provided
      species_common_name: speciesName,
      scientific_name: scientificName,
      quantity,
      caught_at: finalCaughtAt, // Database column is 'caught_at' - EXIF timestamp or form date
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
      // GPS-derived bathymetry data (separate from user-reported data)
      gps_depth_meters: enrichedData.bathymetry?.depth_meters ?? null,
      gps_substrate: enrichedData.substrate?.substrate ?? null,
      gps_data_source:
        (enrichedData.bathymetry && typeof enrichedData.bathymetry === 'object' && 'data_source' in enrichedData.bathymetry && typeof (enrichedData.bathymetry as { data_source?: string }).data_source === 'string'
          ? (enrichedData.bathymetry as { data_source?: string }).data_source
          : undefined)
        || (enrichedData.substrate && typeof enrichedData.substrate === 'object' && 'data_source' in enrichedData.substrate && typeof (enrichedData.substrate as { data_source?: string }).data_source === 'string'
          ? (enrichedData.substrate as { data_source?: string }).data_source
          : undefined)
        || 'emodnet',
      gps_data_cached_at: enrichedData.enrichment_timestamp ? new Date(enrichedData.enrichment_timestamp) : null,
      gps_data_confidence:
        (enrichedData.bathymetry && typeof enrichedData.bathymetry === 'object' && 'confidence' in enrichedData.bathymetry && typeof (enrichedData.bathymetry as { confidence?: string }).confidence === 'string'
          ? (enrichedData.bathymetry as { confidence?: string }).confidence
          : undefined)
        || (enrichedData.substrate && typeof enrichedData.substrate === 'object' && 'confidence' in enrichedData.substrate && typeof (enrichedData.substrate as { confidence?: string }).confidence === 'string'
          ? (enrichedData.substrate as { confidence?: string }).confidence
          : undefined)
        || null,
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
      try {
        await supabase.rpc('increment_user_points', {
          p_user_id: userId,
          p_points: pointsEarned,
        });
      } catch (pointsError) {
        // Points system not yet implemented - log warning but don't fail the request
        console.warn('[log-catch-enriched] Points update failed (function may not exist):', pointsError);
      }
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
    console.error('[log-catch-enriched] CRITICAL ERROR:', error);
    console.error('[log-catch-enriched] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[log-catch-enriched] Error details:', {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
