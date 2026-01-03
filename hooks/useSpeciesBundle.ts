/**
 * React hook for accessing the species bundle
 *
 * Provides offline-first access to species data with automatic
 * image pre-caching in the background.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { BundledSpecies } from '@/types/speciesBundle';
import {
  loadSpeciesBundle,
  getAllSpecies,
  getSpeciesByCode,
  getSpeciesBySlug,
  getSpeciesByGuild,
  searchSpecies,
  preCacheSpeciesImages,
  isBundleLoaded,
  getBundleMetadata,
} from '@/lib/findr/speciesBundle';

interface UseSpeciesBundleReturn {
  // State
  loading: boolean;
  error: string | null;
  ready: boolean;

  // Species data
  species: BundledSpecies[];
  speciesCount: number;

  // Lookup functions
  getByCode: (code: string) => BundledSpecies | null;
  getBySlug: (slug: string) => BundledSpecies | null;
  getByGuild: (guild: string) => BundledSpecies[];
  search: (query: string) => BundledSpecies[];

  // Image caching
  imageCacheProgress: number; // 0-100
  imageCacheComplete: boolean;
  startImageCache: () => Promise<void>;

  // Metadata
  bundleVersion: string | null;
  bundleDate: string | null;
}

const IMAGE_CACHE_KEY = 'findr_species_images_cached';

function getImageCacheStatus(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const cached = localStorage.getItem(IMAGE_CACHE_KEY);
  if (!cached) return false;

  try {
    const { date } = JSON.parse(cached);
    // Valid for 7 days
    const cacheAge = Date.now() - new Date(date).getTime();
    return cacheAge < 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function setImageCacheStatus(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify({
    date: new Date().toISOString(),
  }));
}

export function useSpeciesBundle(): UseSpeciesBundleReturn {
  const [loading, setLoading] = useState(!isBundleLoaded());
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(isBundleLoaded());
  const [species, setSpecies] = useState<BundledSpecies[]>(getAllSpecies());
  const [imageCacheProgress, setImageCacheProgress] = useState(0);
  const [imageCacheComplete, setImageCacheComplete] = useState(getImageCacheStatus());

  // Load bundle on mount
  useEffect(() => {
    if (isBundleLoaded()) {
      setReady(true);
      setSpecies(getAllSpecies());
      return;
    }

    let mounted = true;

    loadSpeciesBundle()
      .then((bundle) => {
        if (!mounted) return;
        setSpecies(bundle.species);
        setReady(true);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load species bundle');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const startImageCache = useCallback(async () => {
    if (imageCacheComplete) return;

    try {
      await preCacheSpeciesImages((loaded, total) => {
        setImageCacheProgress(Math.round((loaded / total) * 100));
      });
      setImageCacheComplete(true);
      setImageCacheStatus();
    } catch (err) {
      console.error('[useSpeciesBundle] Image caching failed:', err);
    }
  }, [imageCacheComplete]);

  // Auto-start image caching when bundle is ready and not already cached
  useEffect(() => {
    if (!ready || imageCacheComplete) return;

    // Start image caching in background after a short delay
    const timeout = setTimeout(() => {
      startImageCache();
    }, 3000); // Wait 3s after bundle loads to not compete with initial page load

    return () => clearTimeout(timeout);
  }, [ready, imageCacheComplete, startImageCache]);

  const getByCode = useCallback((code: string) => getSpeciesByCode(code), []);
  const getBySlug = useCallback((slug: string) => getSpeciesBySlug(slug), []);
  const getByGuild = useCallback((guild: string) => getSpeciesByGuild(guild), []);
  const search = useCallback((query: string) => searchSpecies(query), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- ready triggers metadata refresh
  const metadata = useMemo(() => getBundleMetadata(), [ready]);

  return {
    loading,
    error,
    ready,
    species,
    speciesCount: species.length,
    getByCode,
    getBySlug,
    getByGuild,
    search,
    imageCacheProgress,
    imageCacheComplete,
    startImageCache,
    bundleVersion: metadata?.version || null,
    bundleDate: metadata?.generatedAt || null,
  };
}

export default useSpeciesBundle;
