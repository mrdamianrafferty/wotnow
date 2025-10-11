/**
 * Shared type definitions for Findr catch enrichment workflow.
 * Consumed by hooks, API routes, and enrichment services.
 */

export interface Coordinates {
  lat: number;
  lon: number;
  accuracyMeters?: number | null;
}

export interface ExifGPSData {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  timestamp: string | null;
  hasGPS: boolean;
  camera?: string;
}

export type DataSource = 'emodnet' | 'fallback';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type SubstrateType = 'rock' | 'sand' | 'mud' | 'gravel' | 'mixed' | 'unknown';

export interface EMODnetBathymetryResponse {
  depth_meters: number | null;
  data_source: DataSource;
  confidence: ConfidenceLevel;
  query_time: string;
  error?: string;
}

export interface EMODnetSubstrateResponse {
  substrate: SubstrateType;
  data_source: DataSource;
  confidence: ConfidenceLevel;
  query_time: string;
  raw_classification?: string;
  error?: string;
}

export interface EnrichedCatchData {
  location: {
    latitude: number | null;
    longitude: number | null;
  };
  bathymetry: EMODnetBathymetryResponse | null;
  substrate: EMODnetSubstrateResponse | null;
  enrichment_timestamp: string;
}

export type CatchLocationSource =
  | 'exif_gps'
  | 'user_location'
  | 'rectangle_center'
  | 'fallback';

export type LocationSource = CatchLocationSource;

export interface CatchEnrichmentResult {
  has_exif_gps: boolean;
  depth_found: boolean;
  substrate_found: boolean;
  conditions_found: boolean;
  enrichment_timestamp: string;
  depth_meters: number | null;
  substrate: string | null;
  warnings?: string[];
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
  substrate?: string | null;
  depth_meters?: number | null;
}

export interface LogCatchEnrichedResponse {
  success: boolean;
  catchId?: string | null;
  photoUrl?: string | null;
  photoThumbnailUrl?: string | null;
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

export interface EnrichmentStatus {
  has_exif_gps: boolean;
  depth_found: boolean;
  substrate_found: boolean;
  conditions_found: boolean;
  enrichment_timestamp: string;
}

export interface CatchEntry {
  id: string;
  user_id: string | null;
  species_name: string;
  quantity: number;
  catch_date: string;
  entry_type: CatchLogRequest['entry_type'];
  rectangle_code: string | null;
  location_source: LocationSource;
  latitude: number | null;
  longitude: number | null;
  depth_meters: number | null;
  substrate: string | null;
  photo_url: string | null;
  notes: string | null;
  size_category: CatchLogRequest['size_category'] | null;
  weather_conditions: string | null;
  ice_number: string | null;
  data_quality_score: number;
  created_at: string;
  updated_at: string;
}

export interface CatchLogResponse {
  success: boolean;
  message?: string;
  points_earned: number;
  enrichment: CatchEnrichmentResult;
  catch: {
    id: string | null;
    depth_meters: number | null;
    substrate: string | null;
  };
  warnings: string[];
  raw: LogCatchEnrichedResponse;
}

export type CatchLoggerTelemetryEvent =
  | {
      type: 'auth_missing';
      reason: 'no_token' | 'resolver_returned_null' | 'session_unavailable';
      anonymous?: boolean;
      context?: string;
    }
  | {
      type: 'auth_anonymous';
      context?: string;
      userId?: string | null;
      provider?: string | null;
    }
  | {
      type: 'api_error';
      status: number;
      message: string;
      visible?: boolean;
      context?: string;
    }
  | {
      type: 'network_error';
      message: string;
      visible?: boolean;
      context?: string;
    }
  | {
      type: 'error_visibility';
      surface: 'toast' | 'inline' | 'silent' | 'unknown';
      visible: boolean;
      message: string;
      context?: string;
    };

export interface UseCatchLoggerOptions {
  onSuccess?: (response: CatchLogResponse) => void;
  onError?: (error: Error) => void;
  resolveAccessToken?: () => Promise<string | null>;
  onTelemetry?: (event: CatchLoggerTelemetryEvent) => void;
  telemetryContext?: string;
  errorSurface?: 'toast' | 'inline' | 'silent' | 'unknown';
}
