'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { MapPin, MoonStar } from 'lucide-react';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { SettingsForm } from '../../components/findr/SettingsForm';
import { TranslatedText } from '../../components/translation/TranslatedFishCard';
import {
  FALLBACK_RECTANGLE_OPTIONS,
  useFindrRectangleOptions,
  type RectangleOption,
} from '../../hooks/useFindrRectangleOptions';
import { usePersistentFindrSettings } from '../../hooks/usePersistentFindrSettings';
import { normalizeRectangleCode } from '../../lib/findr/rectangle';
import { getTodayIso } from '../../lib/date/today';
import ConditionsDashboard from '../../components/findr/ConditionsDashboard';
import { useFindrConditions } from '../../hooks/useFindrConditions';
import MoonWidget from '../../components/findr/MoonWidget';
import { useUnifiedLocation } from '../../context/UnifiedLocationContext';

const FindrConditionsRoute: React.FC = () => {
  const router = useRouter();
  
  const {
    options: rectangleOptions,
    loading: rectangleOptionsLoading,
    error: rectangleOptionsError,
    isFallback: rectangleOptionsUsingFallback,
  } = useFindrRectangleOptions(FALLBACK_RECTANGLE_OPTIONS);

  const {
    selectedCode,
    setSelectedCode,
    manualCode,
    setManualCode,
    predictionDate,
    setPredictionDate,
    language,
    setLanguage,
  } = usePersistentFindrSettings({ predictionDate: getTodayIso(), language: 'en' });

  const { location, updateLocation, loading: locationLoading } = useUnifiedLocation();
  const locationRectangle = location?.rectangleCode ?? null;
  const hasAppliedDefault = useRef(false);

  const rectangleFromUrl = typeof router.query.rectangle === 'string' ? router.query.rectangle : null;

  const manualNormalized = useMemo(() => normalizeRectangleCode(manualCode), [manualCode]);
  const activeRectangle = manualNormalized ?? locationRectangle ?? (selectedCode || null);
  const activeOption = useMemo<RectangleOption | null>(
    () => {
      const code = manualNormalized ?? locationRectangle ?? selectedCode ?? null;
      if (!code) return null;
      return rectangleOptions.find((option) => option.code === code) ?? null;
    },
    [manualNormalized, locationRectangle, rectangleOptions, selectedCode]
  );

  useEffect(() => {
    if (locationLoading) return;
    if (manualNormalized) return;
    if (!locationRectangle) return;
    if (selectedCode === locationRectangle) return;
    setSelectedCode(locationRectangle);
  }, [locationRectangle, locationLoading, manualNormalized, selectedCode, setSelectedCode]);

  useEffect(() => {
    if (locationLoading) return;
    if (manualNormalized) return;
    if (locationRectangle) return;
    if (rectangleOptions.length === 0) return;
    if (hasAppliedDefault.current) return;
    const fallbackOption = rectangleOptions[0];
    hasAppliedDefault.current = true;
    void updateLocation({
      coordinates: { lat: fallbackOption.centerLat, lon: fallbackOption.centerLon },
      rectangleCode: fallbackOption.code,
      rectangleRegion: fallbackOption.region,
      rectangleLabel: `${fallbackOption.code} - ${fallbackOption.region}`,
      source: 'manual',
    });
    setSelectedCode(fallbackOption.code);
  }, [manualNormalized, locationLoading, locationRectangle, rectangleOptions, setSelectedCode, updateLocation]);

  useEffect(() => {
    if (locationLoading) return;
    if (!router.isReady) return;
    if (manualNormalized) return;
    if (!rectangleFromUrl) return;
    if (rectangleFromUrl === locationRectangle) return;
    const rectangle = rectangleOptions.find(option => option.code === rectangleFromUrl);
    if (!rectangle) return;
    void updateLocation({
      coordinates: { lat: rectangle.centerLat, lon: rectangle.centerLon },
      rectangleCode: rectangle.code,
      rectangleRegion: rectangle.region,
      rectangleLabel: `${rectangle.code} - ${rectangle.region}`,
      source: location?.source ?? 'manual',
    });
    setSelectedCode(rectangle.code);
  }, [rectangleFromUrl, locationLoading, manualNormalized, locationRectangle, rectangleOptions, router.isReady, location?.source, setSelectedCode, updateLocation]);

  useEffect(() => {
    if (locationLoading) return;
    if (!router.isReady) return;
    if (manualNormalized) return;
    if (!locationRectangle) return;
    const current = typeof router.query.rectangle === 'string' ? router.query.rectangle : null;
    if (current === locationRectangle) return;
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, rectangle: locationRectangle },
      },
      undefined,
      { shallow: true }
    );
  }, [locationRectangle, locationLoading, manualNormalized, router]);

  useEffect(() => {
    if (locationLoading) return;
    if (!locationRectangle) return;
    if (!manualNormalized) return;
    if (manualNormalized === locationRectangle) return;
    setManualCode('');
  }, [locationRectangle, locationLoading, manualNormalized, setManualCode]);

  const manualInvalid = manualCode.trim().length > 0 && !manualNormalized;

  const handleSelectOption = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextCode = event.target.value;
      setSelectedCode(nextCode);
      setManualCode('');
      const rectangle = rectangleOptions.find(r => r.code === nextCode);
      if (rectangle) {
        await updateLocation({
          coordinates: { lat: rectangle.centerLat, lon: rectangle.centerLon },
          rectangleCode: rectangle.code,
          rectangleRegion: rectangle.region,
          rectangleLabel: `${rectangle.code} - ${rectangle.region}`,
          source: 'manual',
        });
      }
    },
    [rectangleOptions, setManualCode, setSelectedCode, updateLocation]
  );

  const handleManualCodeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setManualCode(event.target.value.toUpperCase());
    },
    [setManualCode]
  );

  const handleDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPredictionDate(event.target.value);
    },
    [setPredictionDate]
  );

  const handleLanguageChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setLanguage(event.target.value);
    },
    [setLanguage]
  );

  const handleSetToday = useCallback(() => {
    setPredictionDate(getTodayIso());
  }, [setPredictionDate]);

  const noop = useCallback(() => {}, []);
  const conditions = useFindrConditions(activeRectangle);

  const moonCoords = useMemo(() => {
    const optionLat = typeof activeOption?.centerLat === 'number' ? activeOption.centerLat : undefined;
    const optionLon = typeof activeOption?.centerLon === 'number' ? activeOption.centerLon : undefined;
    const fallbackLat = typeof conditions.data?.rectangle?.centerLat === 'number' ? conditions.data.rectangle.centerLat : undefined;
    const fallbackLon = typeof conditions.data?.rectangle?.centerLon === 'number' ? conditions.data.rectangle.centerLon : undefined;

    const latCandidate = optionLat ?? fallbackLat;
    const lonCandidate = optionLon ?? fallbackLon;

    if (
      typeof latCandidate === 'number' &&
      Number.isFinite(latCandidate) &&
      typeof lonCandidate === 'number' &&
      Number.isFinite(lonCandidate)
    ) {
      return { lat: latCandidate, lon: lonCandidate };
    }

    return null;
  }, [
    activeOption?.centerLat,
    activeOption?.centerLon,
    conditions.data?.rectangle?.centerLat,
    conditions.data?.rectangle?.centerLon,
  ]);

  const formattedLastUpdated = useMemo(() => {
    if (!conditions.data?.snapshot?.capturedAt) return null;
    try {
      const parsed = new Date(conditions.data.snapshot.capturedAt);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed.toLocaleString();
    } catch {
      return null;
    }
  }, [conditions.data?.snapshot?.capturedAt]);

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

  const selectedForForm = selectedCode || locationRectangle || '';

  return (
    <>
      <Head>
        <title>findr conditions</title>
      </Head>
      <main className="min-h-screen bg-base-200 pb-16">
        {/* Navigation component handles responsive display internally */}
        <FindrNavigation />

        {/* Content container */}
        <div className="sm:mx-auto px-0 pt-2 sm:px-4 sm:pt-6 md:px-6 lg:max-w-6xl">
          <div className="space-y-10">
            <ConditionsDashboard
            data={conditions.data}
            loading={conditions.loading}
            error={conditions.error}
            source={conditions.source}
            onRetry={conditions.reload}
            rectangleCode={activeRectangle ?? undefined}
          />
          {moonCoords ? (
            <section className="card bg-base-100 shadow-lg">
              <div className="card-body space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <MoonStar size={20} /> <TranslatedText text="Moon" />
                    </h2>
                    <p className="text-sm text-base-content/60">
                    
                    </p>
                  </div>
                  <span className="badge badge-ghost text-xs">beta</span>
                </div>
                <div className="-mx-3 sm:-mx-4 md:mx-0">
                  <MoonWidget lat={moonCoords.lat} lon={moonCoords.lon} />
                </div>
              </div>
            </section>
          ) : null}
          <section className="card bg-base-100 shadow-lg">
            <div className="card-body space-y-5">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MapPin size={20} /> <TranslatedText text={`Fishing area  ${activeOption ? ` • ${activeOption.region}` : manualNormalized ? ' • ' : ''} (${activeRectangle})`} />
                </h2>
                
              </div>
              <SettingsForm
                rectangleOptions={rectangleOptions}
                optionsLoading={rectangleOptionsLoading}
                optionsError={rectangleOptionsError}
                usingFallback={rectangleOptionsUsingFallback}
                selectedCode={selectedForForm}
                manualCode={manualCode}
                manualNormalized={manualNormalized}
                manualInvalid={manualInvalid}
                predictionDate={predictionDate}
                language={language}
                loading={conditions.loading}
                deckResetDisabled={true}
                activeOption={activeOption}
                activeRectangle={activeRectangle}
                formattedLastUpdated={formattedLastUpdated}
                totalPredictions={0}
                onSelectOption={handleSelectOption}
                onManualCodeChange={handleManualCodeChange}
                onDateChange={handleDateChange}
                onSetToday={handleSetToday}
                onLanguageChange={handleLanguageChange}
                onReload={conditions.reload}
                onResetDeck={noop}
                showDeckTools={false}
              />
            </div>
          </section>
          </div>
        </div>
      </main>
    </>
  );
};

export default FindrConditionsRoute;
