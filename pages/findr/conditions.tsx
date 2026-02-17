'use client';

import React, { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import SEO from '../../components/SEO';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { FishingAreaInfo } from '../../components/findr/FishingAreaInfo';
import {
  FALLBACK_RECTANGLE_OPTIONS,
  useFindrRectangleOptions,
  type RectangleOption,
} from '../../hooks/useFindrRectangleOptions';
import { useFindrConditions } from '../../hooks/useFindrConditions';
import { useUnifiedLocation } from '../../context/UnifiedLocationContext';
import { useMigrateFindrSettings } from '../../hooks/useMigrateFindrSettings';

// Code-split ConditionsDashboard - likely contains charts/visualizations
const ConditionsDashboard = dynamic(
  () => import('../../components/findr/ConditionsDashboard'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }
);

const FindrConditionsRoute: React.FC = () => {
  const router = useRouter();

  // Migrate old findrSettings localStorage to UnifiedLocationContext
  useMigrateFindrSettings();

  const {
    options: rectangleOptions,
    loading: _rectangleOptionsLoading,
    error: _rectangleOptionsError,
    isFallback: rectangleOptionsUsingFallback,
  } = useFindrRectangleOptions(FALLBACK_RECTANGLE_OPTIONS);

  const { location: legacyLocation, coastalLocation, findrLocation, updateLocationBySlot, loading: locationLoading } = useUnifiedLocation();

  // Use findrLocation first, then fall back to coastal/legacy
  const contextLocation = findrLocation ?? coastalLocation ?? legacyLocation;
  const locationRectangle = contextLocation?.rectangleCode ?? null;
  const hasLocation = Boolean(contextLocation?.lat && contextLocation?.lon);

  const rectangleFromUrl = typeof router.query.rectangle === 'string' ? router.query.rectangle : null;

  // Single source of truth priority:
  // 1. Location from UnifiedLocationContext (findrLocation → coastalLocation → legacyLocation)
  //    - For European: use rectangleCode
  //    - For Worldwide: rectangleCode will be null (use lat/lon)
  const activeRectangle = locationRectangle;

  const activeOption = useMemo<RectangleOption | null>(
    () => {
      const code = activeRectangle;
      if (!code) return null;
      return rectangleOptions.find((option) => option.code === code) ?? null;
    },
    [activeRectangle, rectangleOptions]
  );

  // Sync URL to match active rectangle (for sharing/bookmarking)
  // Add rectangle param for ICES locations, remove it for worldwide locations
  useEffect(() => {
    if (!router.isReady) return;

    const current = typeof router.query.rectangle === 'string' ? router.query.rectangle : null;

    if (activeRectangle) {
      // Have ICES rectangle - ensure URL has it
      if (current === activeRectangle) return;
      console.log('[Conditions] Syncing URL to activeRectangle:', { from: current, to: activeRectangle });
      router.replace(
        {
          pathname: router.pathname,
          query: { ...router.query, rectangle: activeRectangle },
        },
        undefined,
        { shallow: true }
      );
    } else if (current !== null) {
      // No rectangle (worldwide location) but URL has one - remove it
      console.log('[Conditions] Removing rectangle param for worldwide location');
      const { rectangle: _rectangle, ...restQuery } = router.query;
      router.replace(
        {
          pathname: router.pathname,
          query: restQuery,
        },
        undefined,
        { shallow: true }
      );
    }
  }, [activeRectangle, router]);

  // Only update context from URL if:
  // - We don't have a location in context yet
  // - URL has a rectangle parameter
  useEffect(() => {
    if (locationLoading) return;
    if (hasLocation) return; // Already have location (coordinates), don't override
    if (!router.isReady) return;
    if (!rectangleFromUrl) return;
    
    const rectangle = rectangleOptions.find(option => option.code === rectangleFromUrl);
    if (!rectangle) return;

    console.log('[Conditions] Initializing context from URL:', rectangleFromUrl);
    void updateLocationBySlot({
      slot: 'findr',
      coordinates: { lat: rectangle.centerLat, lon: rectangle.centerLon },
      rectangleCode: rectangle.code,
      rectangleRegion: rectangle.region,
      name: `${rectangle.code} - ${rectangle.region}`,
      source: 'manual',
      makeActive: true,
    });
  }, [rectangleFromUrl, locationLoading, hasLocation, rectangleOptions, router.isReady, updateLocationBySlot]);

  // Pass user's precise coordinates for accurate weather data (4dp precision)
  const userCoords = contextLocation?.lat && contextLocation?.lon
    ? { lat: contextLocation.lat, lon: contextLocation.lon }
    : null;
  const conditions = useFindrConditions(activeRectangle, userCoords);

  // Debug: Log when activeRectangle changes
  useEffect(() => {
    console.log('[Conditions] Active rectangle changed:', {
      activeRectangle,
      locationRectangle,
      findrLocationCode: findrLocation?.rectangleCode,
      coastalLocationCode: coastalLocation?.rectangleCode,
      source: contextLocation?.source,
    });
  }, [activeRectangle, locationRectangle, findrLocation, coastalLocation, contextLocation]);

  useEffect(() => {
    if (!rectangleOptionsUsingFallback) return;
    console.info('[Findr Conditions] Using fallback ICES rectangle options. Swap in Supabase catalogue.', {
      fallbackCount: FALLBACK_RECTANGLE_OPTIONS.length,
      sampleCodes: FALLBACK_RECTANGLE_OPTIONS.slice(0, 3).map((option) => option.code),
    });
  }, [rectangleOptionsUsingFallback]);

  useEffect(() => {
    console.info('[Findr Conditions] Conditions source', {
      source: conditions.source,
      rectangle: activeRectangle,
    });
  }, [activeRectangle, conditions.source]);

  return (
    <>
      <SEO
        title="Conditions - findr"
        description="View detailed environmental conditions including water temperature, salinity, oxygen levels, and water clarity for your fishing area."
        url="https://fishfindr.eu/findr/conditions"
      />
      <main className="min-h-screen bg-base-200 pb-16">
        {/* Navigation component handles responsive display internally */}
        <FindrNavigation />

        {/* Content container - reduced padding/margins, removed unnecessary wrappers */}
        <div className="px-1 pt-2 sm:px-2 md:px-4 lg:max-w-6xl mx-auto">
          <ConditionsDashboard
            data={conditions.data}
            loading={conditions.loading}
            error={conditions.error}
            source={conditions.source}
            onRetry={conditions.reload}
            rectangleCode={activeRectangle ?? undefined}
          />
          {/* Fishing Area Information */}
          <div className="mt-6">
            <FishingAreaInfo
              activeOption={activeOption}
              activeRectangle={activeRectangle}
              rectangleRegion={conditions.data?.rectangle?.name}
            />
          </div>
        </div>
      </main>
    </>
  );
};

export default FindrConditionsRoute;

// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}
