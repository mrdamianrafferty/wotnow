// types/aiRecommendations.ts
// Type-safe definitions for AI recommendation engine

/**
 * Catch entry from user's fishing log
 */
export interface CatchEntry {
  id: string;
  fishId: string;
  fishName: string;
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  icesGrid: string;
  date: string;
  bait: string;
  marineBio: Record<string, number>;
  weatherSummary: string;
  notes?: string;
}

/**
 * Species-specific catch history
 */
export interface SpeciesCatchHistory {
  speciesId: string;
  totalCatches: number;
  successfulCatches: number;
  mostRecentCatch?: Date;
  bestConditions?: Record<string, number>;
  successfulBaits: Map<string, number>;
  bestTimeOfDay: Map<number, number>;
  bestLocations: Map<string, number>;
}

/**
 * Bait effectiveness tracking
 */
export interface BaitEffectiveness {
  baitName: string;
  totalUses: number;
  successRate: number;
  speciesSuccess: Map<string, number>;
}

/**
 * Time pattern analysis
 */
export interface TimePattern {
  hourOfDay: number;
  dayOfWeek: number;
  successRate: number;
  catchCount: number;
}

/**
 * User's fishing profile for personalization
 */
export interface UserProfile {
  userId: string;
  totalCatches: number;
  catchesBySpecies: Map<string, SpeciesCatchHistory>;
  favoriteSpecies: string[];
  preferredLocations: Map<string, number>;
  successfulBaits: Map<string, BaitEffectiveness>;
  timePatterns: TimePattern[];
  lastUpdated: Date;
}

/**
 * Serializable version of UserProfile for localStorage
 * Maps converted to arrays for JSON compatibility
 */
export interface SerializableUserProfile {
  userId: string;
  totalCatches: number;
  catchesBySpecies: Array<[string, SpeciesCatchHistory]>;
  favoriteSpecies: string[];
  preferredLocations: Array<[string, number]>;
  successfulBaits: Array<[string, BaitEffectiveness & { speciesSuccess: Array<[string, number]> }]>;
  timePatterns: TimePattern[];
  lastUpdated: string;
}

/**
 * Base fish match from scientific predictions
 */
export interface BaseFishMatch {
  id: string;
  commonName: string;
  scientificName: string;
  confidence: number;
  bestBait?: string;
  bioScore?: number;
  seasonScore?: number;
}

/**
 * Enhanced match with AI personalization
 */
export interface PersonalizedMatch extends BaseFishMatch {
  personalScore?: number;
  personalizedReasons: string[];
  recommendedBait?: string;
  bestTimeAdvice?: string;
  locationAdvice?: string;
  isHotRightNow: boolean;
}

/**
 * Current conditions for scoring
 */
export interface CurrentConditions {
  location?: string;
  marineBio?: Record<string, number>;
  currentHour?: number;
}

/**
 * Bait recommendation result
 */
export interface BaitRecommendation {
  bait: string;
  reason: string;
  successRate?: number;
}