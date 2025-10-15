/**
 * Shared type definitions for Findr catch enrichment workflow.
 * Consumed by hooks, API routes, and enrichment services.
 */

// EXIF GPS data extracted from photos
export interface ExifGPSData {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  timestamp: string | null;
  hasGPS: boolean;
  camera?: string;
}

// EMODnet bathymetry API response
export interface EMODnetBathymetryResponse {
  depthMeters: number | null;
  source: 'emodnet_wms' | 'emodnet_wfs';
  quality?: 'high' | 'medium' | 'low';
}

// EMODnet substrate API response
export interface EMODnetSubstrateResponse {
  category: string | null;
  description?: string | null;
  source: 'emodnet_geology';
}

// Final enriched catch data structure
export interface EnrichedCatchData {
  locationSource: 'exif_gps' | 'user_location' | 'rectangle_center' | 'fallback';
  finalLat: number | null;
  finalLon: number | null;
  depthAtLocationM: number | null;
  substrateType: string | null;
  isStructure: boolean | null;
  structureType: string | null;
  exif: ExifGPSData;
}

// Substrate types
export type SubstrateType = 'rock' | 'sand' | 'mud' | 'gravel' | 'mixed' | null;

// Data source indicators
export type DataSource = 'emodnet_bathymetry' | 'emodnet_geology' | 'user' | 'fallback';

// Confidence levels for data quality
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Coordinates {
  lat: number;
  lon: number;
  accuracyMeters?: number | null;
}

export type CatchLocationSource =
  | 'exif_gps'
  | 'user_location'
  | 'rectangle_center'
  | 'fallback';

export interface ExifMetadata {
  hasLocation: boolean;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  timestamp: string | null;
  cameraModel: string | null;
  raw?: Record<string, unknown>;
}

export interface BathymetrySample {
  depthMeters: number | null;
  source: 'emodnet_bathymetry' | 'unknown';
  quality?: 'high' | 'medium' | 'low' | null;
  distanceMeters?: number | null;
  raw?: Record<string, unknown>;
}

export interface SubstrateSample {
  category: string | null;
  description?: string | null;
  source: 'emodnet_geology' | 'unknown';
  raw?: Record<string, unknown>;
}

export interface LocationResolution {
  source: CatchLocationSource;
  lat: number | null;
  lon: number | null;
  accuracyMeters?: number | null;
  warnings?: string[];
}

export interface CatchEnrichmentResult {
  location: LocationResolution;
  exif: ExifMetadata;
  bathymetry: BathymetrySample | null;
  substrate: SubstrateSample | null;
  warnings: string[];
  debug?: Record<string, unknown>;
}

export interface CatchConditionsSnapshot {
  sunriseTime?: string | null;
  sunsetTime?: string | null;
  seaTempC?: number | null;
  waveHeightM?: number | null;
  windSpeedKts?: number | null;
  chlorophyllMgM3?: number | null;
  dissolvedOxygenMgL?: number | null;
  nitrateMmolM3?: number | null;
  phosphateMmolM3?: number | null;
  salinityPsu?: number | null;
  currentSpeedMs?: number | null;
  currentDirectionDeg?: number | null;
  tideState?: string | null;
  tideHeightM?: number | null;
  tideCoefficient?: number | null;
  moonPhaseName?: string | null;
  moonIlluminationPct?: number | null;
  barometricPressureHpa?: number | null;
  pressureTrend?: string | null;
  raw?: Record<string, unknown>;
}

export interface AstronomicalTiming {
  hoursAfterSunrise: number | null;
  hoursBeforeSunset: number | null;
  isGoldenHour: boolean | null;
  isNightTime: boolean | null;
}

export interface CatchLogInput {
  speciesId?: string | null;
  speciesCommonName: string;
  scientificName?: string | null;
  rectangleCode?: string | null;
  catchDate: string;
  catchTime?: string | null;
  quantity: number;
  sizeCategory?: 'small' | 'average' | 'large' | 'mixed' | 'trophy';
  weightKg?: number | null;
  lengthCm?: number | null;
  baitUsed?: string | null;
  tackleUsed?: string | null;
  method?: 'shore' | 'boat' | 'kayak' | 'unknown';
  habitatType?: string | null;
  depthRange?: 'shallow_water' | 'deep_water' | 'unknown';
  notes?: string | null;
  entryType?: 'quick' | 'detailed' | 'historical';
  sessionId?: string | null;
  photo?: File | Blob | null;
  userLocation?: Coordinates | null;
  rectangleCenter?: Coordinates | null;
  environmentalConditions?: Record<string, string | number | null>;
}

export interface CatchLogRequest {
  species_common_name: string;
  quantity: number;
  catch_date: string;
  catch_time?: string | null;
  species_id?: string | null;
  scientific_name?: string | null;
  rectangle_code?: string | null;
  size_category?: string | null;
  weight_kg?: number | null;
  length_cm?: number | null;
  bait_used?: string | null;
  tackle_used?: string | null;
  method?: string | null;
  habitat_type?: string | null;
  depth_range?: string | null;
  notes?: string | null;
  entry_type?: 'quick' | 'detailed' | 'historical';
  session_id?: string | null;
  environmental_conditions?: Record<string, string | number | null>;
  user_location?: Coordinates | null;
  rectangle_center?: Coordinates | null;
  weight_units?: 'kg' | 'lb';
  length_units?: 'cm' | 'in';
}

export interface LogCatchEnrichedResponse {
  success: boolean;
  catchId?: string | null;
  photoUrl?: string | null;
  photoStoragePath?: string | null;
  enrichment?: CatchEnrichmentResult;
  conditions?: CatchConditionsSnapshot | null;
  astronomy?: AstronomicalTiming | null;
  warnings?: string[];
  message?: string;
  points_earned?: number;
  catch?: Record<string, unknown>;
  error?: string;
}

export interface CatchLogResponse {
  success: boolean;
  message?: string;
  points_earned: number;
  enrichment: {
    has_exif_gps: boolean;
    depth_found: boolean;
    substrate_found: boolean;
    depth_meters: number | null;
    substrate: string | null;
  };
  catch: {
    id: string | null;
    depth_meters: number | null;
    substrate: string | null;
  };
  warnings: string[];
  raw: LogCatchEnrichedResponse;
}

export type CatchLoggerTelemetryEvent =
  | { type: 'auth_missing'; reason: 'no_token' | 'resolver_returned_null' | 'session_unavailable' }
  | { type: 'api_error'; status: number; message: string }
  | { type: 'network_error'; message: string };

export interface UseCatchLoggerOptions {
  onSuccess?: (response: CatchLogResponse) => void;
  onError?: (error: Error) => void;
  resolveAccessToken?: () => Promise<string | null>;
  onTelemetry?: (event: CatchLoggerTelemetryEvent) => void;
}
