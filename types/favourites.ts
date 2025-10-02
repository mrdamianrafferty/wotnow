/**
 * Favourites System - TypeScript Interfaces
 * 
 * Core types for the species tracking and notification system
 */

// ============================================================================
// SPECIES & BIOLOGY
// ============================================================================

/**
 * Core species information from reference data
 */
export interface Species {
  id: string;                    // e.g., "cod", "bass", "mackerel"
  commonName: string;             // "Atlantic Cod"
  scientificName?: string;        // "Gadus morhua"
  imageUrl?: string;              // Species photo
  primaryHabitat: string[];       // ["reef", "wreck", "open water"]
  seasonalPeaks: number[];        // Months [5,6,7,8] for May-Aug peak
  minDepth?: number;              // Meters
  maxDepth?: number;              // Meters
  description?: string;           // Brief species info
  topBaits?: string[];           // ["lugworm", "ragworm", "mackerel strip"]
}

/**
 * A species that the user is actively tracking
 * Combines species data with user preferences and live conditions
 */
export interface TrackedSpecies {
  species: Species;
  isFavourite: boolean;
  confidenceScore: number;        // 0-100, live calculation
  notificationsEnabled: boolean;
  addedAt: Date;
  
  // Live condition summary
  currentConditions?: {
    temperature: number;          // °C
    windSpeed: number;            // mph
    waveHeight: number;           // m
    tidePhase: string;            // "rising", "high", "falling", "low"
    timeToNextTide: number;       // minutes
    moonPhase: string;            // "new", "waxing", "full", "waning"
  };
  
  // Why this score right now?
  reasonCodes: string[];          // ["seasonal_peak", "optimal_tide", "good_moon"]
  
  // User's history with this species
  userStats?: {
    totalCaught: number;
    lastCaughtDate?: Date;
    bestWeight?: number;
    bestLength?: number;
    favoriteMethod?: FishingMethod;
    favoriteLocation?: string;    // ICES square or named location
  };
}

/**
 * Fishing method/technique
 */
export interface FishingMethod {
  id: string;                     // "bottom-fishing", "jigging", "trolling"
  name: string;                   // "Bottom Fishing"
  icon?: string;                  // Lucide icon name
}

// ============================================================================
// USER FAVOURITES & PREFERENCES
// ============================================================================

/**
 * Database record for user's tracked species
 * Maps to Supabase `user_favourites` table
 */
export interface UserFavourite {
  id: string;                     // UUID
  userId: string;                 // Supabase auth user ID
  speciesId: string;              // References species.id
  notificationsEnabled: boolean;
  alertThreshold?: number;        // Only alert when confidence >= this
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification preferences per species
 */
export interface NotificationPreferences {
  speciesId: string;
  enabled: boolean;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  threshold: number;              // 0-100, alert when confidence crosses this
  quietHours?: {
    start: string;                // "22:00"
    end: string;                  // "07:00"
  };
  maxPerDay: number;              // Rate limiting
}

// ============================================================================
// LOCATION & REGIONAL DATA
// ============================================================================

/**
 * Species common to a specific ICES region
 */
export interface RegionalSpecies {
  icesSquare: string;             // "31F2"
  species: Species[];
  popularity: Record<string, number>; // speciesId -> catch count last 30 days
}

/**
 * Community-curated local favourite
 */
export interface LocalFavorite {
  speciesId: string;
  icesSquare: string;
  catchCount: number;             // Last 30 days
  avgWeight?: number;
  avgLength?: number;
  popularMethods: FishingMethod[];
  popularBaits: string[];
}

// ============================================================================
// USER CATCH HISTORY
// ============================================================================

/**
 * Simplified catch record for favourites context
 * Full data lives in findr_catch_entries
 */
export interface UserCatch {
  id: string;
  userId: string;
  speciesId: string;
  caughtAt: Date;
  weight?: number;
  length?: number;
  method?: FishingMethod;
  location?: string;
  icesSquare?: string;
  
  // Conditions at time of catch
  conditions?: {
    temperature?: number;
    windSpeed?: number;
    waveHeight?: number;
    tidePhase?: string;
    moonPhase?: string;
  };
}

// ============================================================================
// SMART SUGGESTIONS
// ============================================================================

/**
 * Intelligent species suggestion categories
 */
export type SuggestionCategory = 
  | "youve-caught"        // Species in your catch log
  | "hot-right-now"       // High confidence scores currently
  | "local-favorites"     // Popular in your region
  | "seasonal-peak"       // In prime season now
  | "all-regional";       // All species in your ICES square

/**
 * A suggested species to track
 */
export interface SpeciesSuggestion {
  species: Species;
  category: SuggestionCategory;
  confidenceScore?: number;       // Current score if available
  reason: string;                 // Human-readable explanation
  userHasCaught: boolean;
  userCatchCount?: number;
  regionalPopularity?: number;    // 0-100 percentile
}

// ============================================================================
// UI STATE
// ============================================================================

/**
 * User's current view state
 */
export interface UserState {
  hasTrackedSpecies: boolean;
  currentView: "selection" | "dashboard";
  icesSquare?: string;            // User's current/default location
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Confidence score bands for UI grouping
 */
export type ConfidenceBand = "active" | "good" | "waiting";

export function getConfidenceBand(score: number): ConfidenceBand {
  if (score >= 85) return "active";
  if (score >= 60) return "good";
  return "waiting";
}

/**
 * Status display configuration
 */
export interface StatusConfig {
  band: ConfidenceBand;
  label: string;
  icon: string;              // Lucide icon name
  color: string;             // Tailwind class
  description: string;
}

export const STATUS_CONFIGS: Record<ConfidenceBand, StatusConfig> = {
  active: {
    band: "active",
    label: "Active Now",
    icon: "target",
    color: "text-success",
    description: "Excellent conditions - go fishing!"
  },
  good: {
    band: "good",
    label: "Good Conditions",
    icon: "thumbs-up",
    color: "text-info",
    description: "Decent chance - worth a trip"
  },
  waiting: {
    band: "waiting",
    label: "Unlikely",
    icon: "clock",
    color: "text-warning",
    description: "Feeling lucky today?"
  }
};

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface FavouritesResponse {
  favourites: TrackedSpecies[];
  regionInfo?: {
    icesSquare: string;
    totalSpecies: number;
  };
}

export interface SuggestionsResponse {
  suggestions: {
    youveCaught: SpeciesSuggestion[];
    hotRightNow: SpeciesSuggestion[];
    localFavorites: SpeciesSuggestion[];
    seasonalPeak: SpeciesSuggestion[];
    allRegional: SpeciesSuggestion[];
  };
}

export interface RegionalSpeciesResponse {
  icesSquare: string;
  species: Species[];
  popularity: Record<string, number>;
}
