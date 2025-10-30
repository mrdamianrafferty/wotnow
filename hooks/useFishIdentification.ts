/**
 * Fish Identification Hook - React integration
 *
 * Simplified hook that integrates the AI service with React state
 * Works with existing useQuickLogSpecies for regional candidates
 */

import { useState, useCallback, useEffect } from 'react';
import { fishIdService, type IdentificationResult, type CatchContext } from '../lib/findr/fishIdentificationService';
import type { QuickLogSpecies } from './useQuickLogSpecies';

interface UseFishIdentificationOptions {
  onSuccess?: (result: IdentificationResult) => void;
  onError?: (error: Error) => void;
}

interface UseFishIdentificationReturn {
  // State
  isIdentifying: boolean;
  result: IdentificationResult | null;
  error: Error | null;
  stats: {
    aiAvailable: boolean;
    monthlyUsage: number;
    remainingBudget: number;
    pricePerCall: number;
  } | null;

  // Actions
  identify: (image: File, candidates: QuickLogSpecies[], context?: Partial<CatchContext>) => Promise<void>;
  reset: () => void;
}

export function useFishIdentification(
  options: UseFishIdentificationOptions = {}
): UseFishIdentificationReturn {
  const { onSuccess, onError } = options;

  // State
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<{
    aiAvailable: boolean;
    monthlyUsage: number;
    remainingBudget: number;
    pricePerCall: number;
    monthlyBudget?: number;
    cacheSize?: number;
  } | null>(null);

  // Load service stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const serviceStats = await fishIdService.getStats();
      setStats(serviceStats);
    } catch (err) {
      console.error('[useFishID] Failed to load stats:', err);
    }
  };

  /**
   * Main identification function
   */
  const identify = useCallback(async (
    image: File,
    candidates: QuickLogSpecies[],
    context: Partial<CatchContext> = {}
  ) => {
    setIsIdentifying(true);
    setError(null);

    try {
      console.log('[useFishID] Starting identification with', candidates.length, 'candidates');

      // Build context with candidates
      const fullContext: CatchContext = {
        location: context.location,
        date: context.date || new Date(),
        depth: context.depth,
        candidates
      };

      // Call identification service
      const identificationResult = await fishIdService.identify(image, fullContext);

      setResult(identificationResult);

      // Reload stats to show updated usage
      await loadStats();

      // Call success callback
      onSuccess?.(identificationResult);

    } catch (err) {
      const error = err as Error;
      console.error('[useFishID] Identification failed:', error);
      setError(error);
      onError?.(error);

      // Set fallback result
      setResult({
        species: candidates.slice(0, 8),
        method: 'manual_selection',
        confidence: 0,
        cost: 0,
        message: 'Identification failed - please select manually'
      });
    } finally {
      setIsIdentifying(false);
    }
  }, [onSuccess, onError]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsIdentifying(false);
  }, []);

  return {
    // State
    isIdentifying,
    result,
    error,
    stats,

    // Actions
    identify,
    reset
  };
}

/**
 * Hook for monitoring AI service health
 */
export function useFishIdServiceHealth() {
  const [health, setHealth] = useState({
    status: 'unknown' as 'healthy' | 'degraded' | 'offline' | 'unknown',
    aiEnabled: false,
    budgetRemaining: 0,
    monthlyUsage: 0,
    cacheSize: 0
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const stats = await fishIdService.getStats();

        let status: 'healthy' | 'degraded' | 'offline' = 'healthy';

        if (!stats.aiAvailable) {
          status = stats.remainingBudget > 0 ? 'degraded' : 'offline';
        }

        setHealth({
          status,
          aiEnabled: stats.aiAvailable,
          budgetRemaining: stats.remainingBudget,
          monthlyUsage: stats.monthlyUsage,
          cacheSize: stats.cacheSize
        });
      } catch (_error) {
        setHealth(prev => ({ ...prev, status: 'unknown' }));
      }
    };

    // Check immediately
    checkHealth();

    // Check every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return health;
}
