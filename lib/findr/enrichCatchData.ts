// lib/findr/enrichCatchData.ts
// Environmental enrichment service for catch logging

import ExifReader from 'exifreader';
import type {
  ExifGPSData,
  EMODnetBathymetryResponse,
  EMODnetSubstrateResponse,
  EnrichedCatchData,
  SubstrateType,
} from '../../types/findr-enrichment';

type ExifPrimitive = string | number | boolean | Array<string | number | boolean> | undefined | null;

interface ExifTag {
  description?: ExifPrimitive;
  value?: ExifPrimitive;
  [key: string]: unknown;
}

const coerceFirstString = (value: ExifPrimitive | unknown): string | null => {
  if (value == null) return null;

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalized = coerceFirstString(entry);
      if (normalized) return normalized;
    }
    return null;
  }

  return null;
};

const readDescription = (tag: ExifTag | undefined): string | null => {
  if (!tag) return null;
  return coerceFirstString(tag.description ?? tag);
};

const readValue = (tag: ExifTag | undefined): string | null => {
  if (!tag) return null;
  return coerceFirstString(tag.value ?? tag);
};

/**
 * Extract GPS coordinates from photo EXIF data
 */
export function extractExifGPS(photoBuffer: Buffer): ExifGPSData {
  try {
    const tags = ExifReader.load(photoBuffer) as unknown as Record<string, ExifTag>;
    
    // Check if GPS data exists
    const hasGPSData = Boolean(tags.GPSLatitude && tags.GPSLongitude);
    
    if (!hasGPSData) {
      return {
        latitude: null,
        longitude: null,
        altitude: null,
        timestamp: null,
        hasGPS: false,
      };
    }

    // Extract latitude
    const latDMS = readDescription(tags.GPSLatitude);
    const latRefRaw = readValue(tags.GPSLatitudeRef);
    const latRef = latRefRaw ? latRefRaw.charAt(0).toUpperCase() : null;
    const latitude = latDMS && latRef
      ? convertDMSToDD(latDMS, latRef)
      : null;

    // Extract longitude
    const lonDMS = readDescription(tags.GPSLongitude);
    const lonRefRaw = readValue(tags.GPSLongitudeRef);
    const lonRef = lonRefRaw ? lonRefRaw.charAt(0).toUpperCase() : null;
    const longitude = lonDMS && lonRef
      ? convertDMSToDD(lonDMS, lonRef)
      : null;

    // Extract altitude (if available)
    const altitudeRaw = readDescription(tags.GPSAltitude);
    const parsedAltitude =
      altitudeRaw != null ? Number.parseFloat(altitudeRaw) : Number.NaN;
    const altitude = Number.isFinite(parsedAltitude) ? parsedAltitude : null;

    // Extract timestamp (if available)
    const timestamp =
      readDescription(tags.DateTime) ??
      readDescription(tags.DateTimeOriginal) ??
      null;

    // Extract camera info (optional)
    const make = readDescription(tags.Make);
    const model = readDescription(tags.Model);
    const cameraParts = [make, model].filter(
      (part): part is string => typeof part === 'string' && part.length > 0
    );
    const camera = cameraParts.length > 0 ? cameraParts.join(' ') : undefined;

    const hasGPS = latitude != null && longitude != null;

    return {
      latitude,
      longitude,
      altitude,
      timestamp,
      hasGPS,
      camera,
    };
  } catch (error) {
    console.error('Error extracting EXIF data:', error);
    return {
      latitude: null,
      longitude: null,
      altitude: null,
      timestamp: null,
      hasGPS: false,
    };
  }
}

/**
 * Convert DMS (Degrees, Minutes, Seconds) to Decimal Degrees
 */
function convertDMSToDD(dms: string, ref: string): number | null {
  // Parse DMS string like "43° 32' 41.64" N"
  const parts = dms.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"/);
  
  if (!parts) return null;
  
  const degrees = parseFloat(parts[1]);
  const minutes = parseFloat(parts[2]);
  const seconds = parseFloat(parts[3]);
  
  let dd = degrees + minutes / 60 + seconds / 3600;
  
  // Apply hemisphere (S and W are negative)
  if (ref === 'S' || ref === 'W') {
    dd = -dd;
  }
  
  return dd;
}

/**
 * Query EMODnet for bathymetry data
 */
export async function queryEMODnetBathymetry(
  latitude: number,
  longitude: number
): Promise<EMODnetBathymetryResponse> {
  try {
    // EMODnet Web Coverage Service (WCS) endpoint
    const baseUrl = 'https://ows.emodnet-bathymetry.eu/wcs';
    
    const params = new URLSearchParams({
      service: 'WCS',
      version: '1.0.0',
      request: 'GetCoverage',
      coverage: 'emodnet:mean_atlas_land',
      crs: 'EPSG:4326',
      bbox: `${longitude - 0.001},${latitude - 0.001},${longitude + 0.001},${latitude + 0.001}`,
      width: '1',
      height: '1',
      format: 'application/json',
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`EMODnet API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract depth value (EMODnet returns negative values for depth)
    const depthValue = data.value?.[0] || data.values?.[0]?.[0];
    const depth = depthValue ? Math.abs(depthValue) : null;

    return {
      depth_meters: depth,
      data_source: 'emodnet',
      confidence: depth ? 'high' : 'low',
      query_time: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error querying EMODnet bathymetry:', error);
    return {
      depth_meters: null,
      data_source: 'emodnet',
      confidence: 'low',
      query_time: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Query EMODnet for substrate/seabed data
 */
export async function queryEMODnetSubstrate(
  latitude: number,
  longitude: number
): Promise<EMODnetSubstrateResponse> {
  try {
    // EMODnet Seabed Habitats WFS endpoint
    const baseUrl = 'https://ows.emodnet-seabedhabitats.eu/emodnet_view/wfs';
    
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'emodnet_view:folk_7classes',
      outputFormat: 'application/json',
      srsName: 'EPSG:4326',
      bbox: `${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01},EPSG:4326`,
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`EMODnet substrate API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract substrate from features
    const feature = data.features?.[0];
    const substrateRaw = feature?.properties?.folk_7clas || 
                        feature?.properties?.substrate || 
                        'unknown';

    // Map to our substrate types
    const substrate = mapSubstrateType(substrateRaw);

    return {
      substrate,
      data_source: 'emodnet',
      confidence: feature ? 'high' : 'low',
      query_time: new Date().toISOString(),
      raw_classification: substrateRaw,
    };
  } catch (error) {
    console.error('Error querying EMODnet substrate:', error);
    return {
      substrate: 'unknown',
      data_source: 'emodnet',
      confidence: 'low',
      query_time: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Map EMODnet substrate classification to our types
 */
function mapSubstrateType(raw: string | null): SubstrateType {
  if (!raw) return 'unknown';
  
  const normalized = raw.toLowerCase();
  
  if (normalized.includes('rock') || normalized.includes('bedrock')) {
    return 'rock';
  }
  if (normalized.includes('sand')) {
    return 'sand';
  }
  if (normalized.includes('mud') || normalized.includes('silt')) {
    return 'mud';
  }
  if (normalized.includes('gravel') || normalized.includes('pebble')) {
    return 'gravel';
  }
  if (normalized.includes('mixed') || normalized.includes('heterogeneous')) {
    return 'mixed';
  }
  
  return 'unknown';
}

/**
 * Main enrichment orchestration function
 * Takes catch data and enriches it with environmental data
 */
export async function enrichCatchData(
  catchData: {
    latitude: number | null;
    longitude: number | null;
    exifData?: ExifGPSData;
  }
): Promise<EnrichedCatchData> {
  const enriched: EnrichedCatchData = {
    location: {
      latitude: catchData.latitude,
      longitude: catchData.longitude,
    },
    bathymetry: null,
    substrate: null,
    enrichment_timestamp: new Date().toISOString(),
  };

  // Only proceed if we have coordinates
  if (!catchData.latitude || !catchData.longitude) {
    return enriched;
  }

  // Query bathymetry
  enriched.bathymetry = await queryEMODnetBathymetry(
    catchData.latitude,
    catchData.longitude
  );

  // Query substrate
  enriched.substrate = await queryEMODnetSubstrate(
    catchData.latitude,
    catchData.longitude
  );

  return enriched;
}
