'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
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

  // Read rectangle from URL query param if present
  const rectangleFromUrl = typeof router.query.rectangle === 'string' ? router.query.rectangle : null;
  
  // Sync URL rectangle to selectedCode
  useEffect(() => {
    if (rectangleFromUrl && rectangleFromUrl !== selectedCode) {
      console.log('[Conditions] Syncing rectangle from URL:', rectangleFromUrl);
      setSelectedCode(rectangleFromUrl);
      setManualCode(''); // Clear manual input when changing location
    }
  }, [rectangleFromUrl, selectedCode, setSelectedCode, setManualCode]);

  const manualNormalized = useMemo(() => normalizeRectangleCode(manualCode), [manualCode]);
  const activeRectangle = manualNormalized ?? (selectedCode || null);
  const activeOption = useMemo<RectangleOption | null>(
    () => rectangleOptions.find((option) => option.code === (manualNormalized ?? selectedCode)) ?? null,
    [manualNormalized, rectangleOptions, selectedCode]
  );

  useEffect(() => {
    if (selectedCode || manualNormalized) return;
    if (rectangleOptions.length === 0) return;
    setSelectedCode(rectangleOptions[0].code);
  }, [manualNormalized, rectangleOptions, selectedCode, setSelectedCode]);
  useEffect(() => {
    if (!selectedCode || manualNormalized) return;
    if (rectangleOptions.some((option) => option.code === selectedCode)) return;
    if (rectangleOptions.length === 0) return;
    setSelectedCode(rectangleOptions[0].code);
  }, [manualNormalized, rectangleOptions, selectedCode, setSelectedCode]);

  const manualInvalid = manualCode.trim().length > 0 && !manualNormalized;

  const handleSelectOption = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedCode(event.target.value);
      setManualCode('');
    },
    [setManualCode, setSelectedCode]
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
                selectedCode={selectedCode}
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
