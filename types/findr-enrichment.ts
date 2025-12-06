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
  depthMeters?: number | null;
  depth_meters?: number | null; // Snake case alias
  source?: 'emodnet_wms' | 'emodnet_wfs';
  data_source?: string; // Additional source field
  quality?: 'high' | 'medium' | 'low';
  confidence?: string;
  query_time?: string;
  error?: string;
  cached?: boolean; // Whether result came from cache
  cache_age_hours?: number; // Age of cached data in hours
}

// EMODnet substrate API response
export interface EMODnetSubstrateResponse {
  category?: string | null;
  substrate?: string | null; // Substrate field
  description?: string | null;
  source?: 'emodnet_geology';
  data_source?: string; // Additional source field
  confidence?: string;
  query_time?: string;
  raw_classification?: string;
  error?: string;
  cached?: boolean; // Whether result came from cache
  cache_age_hours?: number; // Age of cached data in hours
}

// Final enriched catch data structure
export interface EnrichedCatchData {
  locationSource?: CatchLocationSource;
  finalLat?: number | null;
  finalLon?: number | null;
  depthAtLocationM?: number | null;
  substrateType?: string | null;
  isStructure?: boolean | null;
  structureType?: string | null;
  exif?: ExifGPSData;
  location?: LocationResolution | { latitude: number | null; longitude: number | null };
  bathymetry?: BathymetrySample | EMODnetBathymetryResponse | null;
  substrate?: SubstrateSample | EMODnetSubstrateResponse | null;
  enrichment_timestamp?: string;
}

// Substrate types
export type SubstrateType = 'rock' | 'sand' | 'mud' | 'gravel' | 'mixed' | 'unknown' | null;

// Data source indicators
export type DataSource = 'emodnet_bathymetry' | 'emodnet_geology' | 'user' | 'fallback';

// Confidence levels for data quality
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Coordinates {
  lat: number;
  lon: number;
  accuracyMeters?: number | null;
}

// Location source values match database constraint: CHECK (location_source IN ('gps', 'manual', 'rectangle'))
// 'gps' = EXIF GPS from photo (most accurate)
// 'manual' = User-supplied device GPS at submission time
// 'rectangle' = Approximate location from ICES rectangle center
export type CatchLocationSource =
  | 'gps'
  | 'manual'
  | 'rectangle';

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
  depth_meters?: number | null; // Snake case alias
  source: 'emodnet_bathymetry' | 'unknown';
  quality?: 'high' | 'medium' | 'low' | null;
  distanceMeters?: number | null;
  raw?: Record<string, unknown>;
}

export interface SubstrateSample {
  category: string | null;
  substrate?: string | null; // Alias for category
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
  location?: LocationResolution;
  exif?: ExifMetadata;
  bathymetry?: BathymetrySample | null;
  substrate?: SubstrateSample | string | null; // Allow string for simple substrate values
  warnings?: string[];
  debug?: Record<string, unknown>;
  enrichment_timestamp?: string;
  depth_meters?: number | null;
  has_exif_gps?: boolean;
  depth_found?: boolean;
  substrate_found?: boolean;
  conditions_found?: boolean;
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
  sizeCategory?: 'small' | 'average' | 'large' | 'mixed';
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
  // AI identification tracking
  aiSuggestedSpeciesId?: string | null;
  aiSuggestedSpeciesName?: string | null;
  aiConfidence?: number | null;
  aiMethod?: 'cache' | 'database' | 'visual' | 'ai' | 'manual_selection' | null;
  aiReasoning?: string | null;
  aiWasCorrected?: boolean;
  aiGaveUp?: boolean;
  identificationSource?: 'ai' | 'manual' | 'ai_corrected' | 'ai_gave_up' | null;
}

export interface CatchLogRequest {
  species_name: string; // API expects 'species_name', not 'species_common_name'
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
  is_blank_trip?: boolean | null; // Flag for days with no catches
  session_id?: string | null;
  environmental_conditions?: Record<string, string | number | null>;
  user_location?: Coordinates | null;
  rectangle_center?: Coordinates | null;
  weight_units?: 'kg' | 'lb';
  length_units?: 'cm' | 'in';
  // AI identification tracking
  ai_suggested_species_id?: string | null;
  ai_suggested_species_name?: string | null;
  ai_confidence?: number | null;
  ai_method?: string | null;
  ai_reasoning?: string | null;
  ai_was_corrected?: boolean;
  ai_gave_up?: boolean;
  identification_source?: string | null;
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
    conditions_found?: boolean;
    enrichment_timestamp?: string;
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
  | { type: 'auth_missing'; reason: 'no_token' | 'resolver_returned_null' | 'session_unavailable'; context?: string; anonymous?: boolean; visible?: boolean }
  | { type: 'auth_anonymous'; context?: string; anonymous?: boolean; userId?: string | null; provider?: string | null }
  | { type: 'api_error'; status: number; message: string; context?: string; visible?: boolean }
  | { type: 'network_error'; message: string; context?: string; visible?: boolean }
  | { type: 'error_visibility'; context?: string; visible?: boolean; surface?: string; message?: string };

export interface UseCatchLoggerOptions {
  onSuccess?: (response: CatchLogResponse) => void;
  onError?: (error: Error) => void;
  resolveAccessToken?: () => Promise<string | null>;
  onTelemetry?: (event: CatchLoggerTelemetryEvent) => void;
  telemetryContext?: string;
  errorSurface?: string;
}
