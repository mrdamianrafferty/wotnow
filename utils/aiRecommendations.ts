// utils/aiRecommendations.ts
// Type-safe AI recommendation engine - Phase 1: Rule-based personalization
// Zero AI costs, works immediately with 3+ catches

import type {
  CatchEntry,
  UserProfile,
  SerializableUserProfile,
  SpeciesCatchHistory,
  BaitEffectiveness,
  BaseFishMatch,
  PersonalizedMatch,
  CurrentConditions,
  BaitRecommendation,
} from '../types/aiRecommendations';

const STORAGE_KEY = 'findr_user_profile_v1';

// ============================================================================
// USER PROFILE BUILDER
// ============================================================================

/**
 * Build user profile from catch history and favorites
 * Analyzes patterns in user's fishing success
 */
export function buildUserProfile(
  userId: string,
  catchHistory: CatchEntry[],
  favoriteSpecies: string[]
): UserProfile {
  const catchesBySpecies = new Map<string, SpeciesCatchHistory>();
  const successfulBaits = new Map<string, BaitEffectiveness>();
  const preferredLocations = new Map<string, number>();

  // Process each catch entry
  for (const catchEntry of catchHistory) {
    const speciesId = catchEntry.fishId;
    
    // Initialize species history if not exists
    if (!catchesBySpecies.has(speciesId)) {
      catchesBySpecies.set(speciesId, {
        speciesId,
        totalCatches: 0,
        successfulCatches: 0,
        successfulBaits: new Map<string, number>(),
        bestTimeOfDay: new Map<number, number>(),
        bestLocations: new Map<string, number>(),
      });
    }
    
    const speciesHistory = catchesBySpecies.get(speciesId);
    if (!speciesHistory) continue; // Type guard
    
    speciesHistory.totalCatches++;
    
    // Count as successful if not marked as blank
    const isSuccessful = !catchEntry.notes?.toLowerCase().includes('blank');
    if (isSuccessful) {
      speciesHistory.successfulCatches++;
    }
    
    // Track most recent catch
    const catchDate = new Date(catchEntry.date);
    if (!isNaN(catchDate.getTime())) {
      if (!speciesHistory.mostRecentCatch || catchDate > speciesHistory.mostRecentCatch) {
        speciesHistory.mostRecentCatch = catchDate;
        speciesHistory.bestConditions = catchEntry.marineBio;
      }
    }
    
    // Track successful baits
    if (catchEntry.bait && isSuccessful) {
      const currentCount = speciesHistory.successfulBaits.get(catchEntry.bait) || 0;
      speciesHistory.successfulBaits.set(catchEntry.bait, currentCount + 1);
      
      // Global bait tracking
      if (!successfulBaits.has(catchEntry.bait)) {
        successfulBaits.set(catchEntry.bait, {
          baitName: catchEntry.bait,
          totalUses: 0,
          successRate: 0,
          speciesSuccess: new Map<string, number>(),
        });
      }
      
      const baitStats = successfulBaits.get(catchEntry.bait);
      if (baitStats) {
        baitStats.totalUses++;
        const speciesCount = baitStats.speciesSuccess.get(speciesId) || 0;
        baitStats.speciesSuccess.set(speciesId, speciesCount + 1);
      }
    }
    
    // Track time patterns
    if (!isNaN(catchDate.getTime())) {
      const hour = catchDate.getHours();
      const currentCount = speciesHistory.bestTimeOfDay.get(hour) || 0;
      speciesHistory.bestTimeOfDay.set(hour, currentCount + 1);
    }
    
    // Track location effectiveness
    if (catchEntry.icesGrid && isSuccessful) {
      const locationCount = speciesHistory.bestLocations.get(catchEntry.icesGrid) || 0;
      speciesHistory.bestLocations.set(catchEntry.icesGrid, locationCount + 1);
      
      const globalLocationCount = preferredLocations.get(catchEntry.icesGrid) || 0;
      preferredLocations.set(catchEntry.icesGrid, globalLocationCount + 1);
    }
  }

  // Calculate bait success rates
  for (const [, bait] of successfulBaits) {
    const totalAttempts = catchHistory.filter(c => c.bait === bait.baitName).length;
    bait.successRate = totalAttempts > 0 ? bait.totalUses / totalAttempts : 0;
  }

  return {
    userId,
    totalCatches: catchHistory.length,
    catchesBySpecies,
    favoriteSpecies,
    preferredLocations,
    successfulBaits,
    timePatterns: [], // Could be calculated if needed
    lastUpdated: new Date(),
  };
}

// ============================================================================
// PERSONALIZATION ENGINE
// ============================================================================

/**
 * Apply AI personalization to scientific predictions
 * Combines scientific scoring (60%) with personal history (40%)
 */
export function personalizeRecommendations(
  baseSpecies: BaseFishMatch[],
  userProfile: UserProfile,
  currentConditions: CurrentConditions
): PersonalizedMatch[] {
  const currentHour = currentConditions.currentHour ?? new Date().getHours();
  const currentLocation = currentConditions.location;
  
  const personalized: PersonalizedMatch[] = baseSpecies.map(species => {
    const speciesHistory = userProfile.catchesBySpecies.get(species.id);
    const reasons: string[] = [];
    let personalScore = species.confidence || 50;
    
    // ========================================================================
    // BOOST 1: Catch History (max +25 points)
    // ========================================================================
    if (speciesHistory && speciesHistory.successfulCatches > 0) {
      const catchBonus = Math.min(speciesHistory.successfulCatches * 3, 25);
      personalScore += catchBonus;
      reasons.push(`You've caught ${speciesHistory.successfulCatches} before!`);
    }
    
    // Recent success boost
    if (speciesHistory?.mostRecentCatch) {
      const daysSince = Math.floor(
        (Date.now() - speciesHistory.mostRecentCatch.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < 7) {
        personalScore += 10;
        reasons.push('🔥 Hot right now - caught recently');
      } else if (daysSince < 30) {
        personalScore += 5;
        reasons.push('Caught recently');
      }
    }
    
    // ========================================================================
    // BOOST 2: Location Match (max +15 points)
    // ========================================================================
    if (currentLocation && speciesHistory) {
      const locationCatches = speciesHistory.bestLocations.get(currentLocation) || 0;
      if (locationCatches > 0) {
        const locationBonus = Math.min(locationCatches * 5, 15);
        personalScore += locationBonus;
        reasons.push(`✅ ${locationCatches} caught here before`);
      }
    }
    
    // ========================================================================
    // BOOST 3: Time of Day Match (max +15 points)
    // ========================================================================
    if (speciesHistory) {
      const catchesAtThisHour = speciesHistory.bestTimeOfDay.get(currentHour) || 0;
      if (catchesAtThisHour > 0) {
        const timeBonus = Math.min(catchesAtThisHour * 5, 15);
        personalScore += timeBonus;
        reasons.push('⏰ You\'ve succeeded at this time');
      }
      
      // Find best hour
      const bestHourEntry = Array.from(speciesHistory.bestTimeOfDay.entries())
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
      
      if (bestHourEntry && bestHourEntry[0] !== currentHour && (bestHourEntry[1] as number) > 2) {
        reasons.push(`Best time: ${formatHour(bestHourEntry[0] as number)}`);
      }
    }
    
    // ========================================================================
    // BOOST 4: Favorite Species (max +10 points)
    // ========================================================================
    if (userProfile.favoriteSpecies.includes(species.id)) {
      personalScore += 10;
      reasons.push('⭐ Your favorite');
    }
    
    // ========================================================================
    // BEST BAIT RECOMMENDATION
    // ========================================================================
    let recommendedBait = species.bestBait;
    if (speciesHistory && speciesHistory.successfulBaits.size > 0) {
      const bestBaitEntry = Array.from(speciesHistory.successfulBaits.entries())
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
      
      if (bestBaitEntry) {
        recommendedBait = bestBaitEntry[0] as string;
        reasons.push(`💡 Try ${bestBaitEntry[0]} (${bestBaitEntry[1]} successes)`);
      }
    }
    
    // ========================================================================
    // HOT RIGHT NOW CHECK
    // ========================================================================
    const isHotRightNow = Boolean(
      speciesHistory?.mostRecentCatch &&
      (Date.now() - speciesHistory.mostRecentCatch.getTime()) < (7 * 24 * 60 * 60 * 1000)
    );
    
    // Cap at 100 and round
    personalScore = Math.min(100, Math.round(personalScore));
    
    return {
      ...species,
      personalScore,
      personalizedReasons: reasons,
      recommendedBait,
      isHotRightNow,
    };
  });
  
  // Sort by personal score (descending)
  return personalized.sort((a, b) => (b.personalScore ?? 0) - (a.personalScore ?? 0));
}

// ============================================================================
// BAIT RECOMMENDATION
// ============================================================================

/**
 * Get smart bait recommendation for a specific species
 */
export function getSmartBaitRecommendation(
  speciesId: string,
  userProfile: UserProfile,
  fallbackBait = 'Live bait'
): BaitRecommendation {
  const speciesHistory = userProfile.catchesBySpecies.get(speciesId);
  
  if (!speciesHistory || speciesHistory.successfulBaits.size === 0) {
    return {
      bait: fallbackBait,
      reason: 'Recommended by experts',
    };
  }
  
  const sortedBaits = Array.from(speciesHistory.successfulBaits.entries())
    .sort((a, b) => (b[1] as number) - (a[1] as number));
  
  if (sortedBaits.length === 0) {
    return {
      bait: fallbackBait,
      reason: 'Recommended by experts',
    };
  }
  
  const [bestBait, successCount] = sortedBaits[0] as [string, number];
  const successRate = successCount / speciesHistory.totalCatches;
  
  return {
    bait: bestBait,
    reason: `Your best performer (${successCount}/${speciesHistory.totalCatches} catches)`,
    successRate,
  };
}

/**
 * Get best time of day advice for a species
 */
export function getBestTimeAdvice(
  speciesId: string,
  userProfile: UserProfile
): string | null {
  const speciesHistory = userProfile.catchesBySpecies.get(speciesId);
  
  if (!speciesHistory || speciesHistory.bestTimeOfDay.size === 0) {
    return null;
  }
  
  const sortedHours = Array.from(speciesHistory.bestTimeOfDay.entries())
    .sort((a, b) => (b[1] as number) - (a[1] as number));
  
  const [bestHour, catchCount] = sortedHours[0] as [number, number];
  
  if (catchCount < 2) return null; // Need at least 2 catches for pattern
  
  return `Best time: ${formatHour(bestHour)} (${catchCount} successful trips)`;
}

// ============================================================================
// STORAGE (Type-safe localStorage operations)
// ============================================================================

/**
 * Serialize Map to array for JSON storage
 */
function serializeMap<K, V>(map: Map<K, V>): Array<[K, V]> {
  return Array.from(map.entries());
}

/**
 * Deserialize array to Map
 */
function deserializeMap<K, V>(arr: Array<[K, V]>): Map<K, V> {
  return new Map(arr);
}

/**
 * Save user profile to localStorage with type safety
 */
export function saveUserProfile(profile: UserProfile): void {
  try {
    const serializable: SerializableUserProfile = {
      userId: profile.userId,
      totalCatches: profile.totalCatches,
      catchesBySpecies: serializeMap(profile.catchesBySpecies),
      favoriteSpecies: profile.favoriteSpecies,
      preferredLocations: serializeMap(profile.preferredLocations),
      successfulBaits: serializeMap(profile.successfulBaits).map(([key, val]) => [
        key,
        {
          baitName: val.baitName,
          totalUses: val.totalUses,
          successRate: val.successRate,
          speciesSuccess: serializeMap(val.speciesSuccess),
        } as BaitEffectiveness & { speciesSuccess: Array<[string, number]> },
      ]),
      timePatterns: profile.timePatterns,
      lastUpdated: profile.lastUpdated.toISOString(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.error('Failed to save user profile:', error);
  }
}

/**
 * Load user profile from localStorage with type safety
 */
export function loadUserProfile(): UserProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as SerializableUserProfile;
    
    // Reconstruct Maps with proper types
    const catchesBySpecies = deserializeMap(parsed.catchesBySpecies);
    
    const successfulBaits = new Map(
      parsed.successfulBaits.map(([key, val]: [string, BaitEffectiveness & { speciesSuccess: Array<[string, number]> }]) => [
        key,
        {
          baitName: val.baitName,
          totalUses: val.totalUses,
          successRate: val.successRate,
          speciesSuccess: deserializeMap(val.speciesSuccess),
        },
      ])
    );
    
    return {
      userId: parsed.userId,
      totalCatches: parsed.totalCatches,
      catchesBySpecies,
      favoriteSpecies: parsed.favoriteSpecies,
      preferredLocations: deserializeMap(parsed.preferredLocations),
      successfulBaits,
      timePatterns: parsed.timePatterns,
      lastUpdated: new Date(parsed.lastUpdated),
    };
  } catch (error) {
    console.error('Failed to load user profile:', error);
    return null;
  }
}

/**
 * Clear user profile from localStorage
 */
export function clearUserProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear user profile:', error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format hour in 12-hour format
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

/**
 * Get species code from scientific name
 * Used for matching with your existing species IDs
 */
export function getSpeciesCode(scientificName: string): string {
  const parts = scientificName.split(' ');
  if (parts.length >= 2) {
    return (parts[0].substring(0, 3) + parts[1].substring(0, 1)).toUpperCase();
  }
  return scientificName.substring(0, 4).toUpperCase();
}