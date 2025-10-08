import { AlertTriangle, Eye, EyeOff, MapPin } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import dynamic from 'next/dynamic';
import type { ConditionsSource } from '../../hooks/useFindrConditions';
import type { FallbackConditionPayload } from '../../lib/findr/fallbackConditions';
import { useFindrEnvironmentalSignals } from '../../hooks/useFindrEnvironmentalSignals';
import WindSummaryCard from './weather/WindSummaryCard';
import WaveSummaryCard from './weather/WaveSummaryCard';
import TideSummaryCard from './weather/TideSummaryCard';
import EnvironmentalSummaryCard from './weather/EnvironmentalSummaryCard';
import MarineBioIndicatorsCard from './weather/MarineBioIndicatorsCard';
import HourlyMarineCarousel from './weather/HourlyMarineCarousel';
import DailyMarineCarousel from './weather/DailyMarineCarousel';
import NextFewDaysCard from '../weather-cards/NextFewDaysCard';
import { buildMarineBioIndicators } from '../../utils/bioMarineLevels';
import type { MarineHourlyPoint, TideEvent } from '../../types/weather';
import { TranslatedText } from '../translation/TranslatedFishCard';

const ConditionsMap = dynamic(() => import('./ConditionsMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-base-200/40 rounded-xl animate-pulse border border-base-200">
      <div className="aspect-video flex items-center justify-center text-base-content/60"><TranslatedText text="Loading map..." /></div>
    </div>
  ),
});

interface ConditionsDashboardProps {
  data: FallbackConditionPayload;
  loading: boolean;
  error: string | null;
  source: ConditionsSource;
  onRetry?: () => void;
  rectangleCode?: string | null;
}

interface FishingSpot {
  id: string;
  lat: number;
  lon: number;
  status: 'hot' | 'ok' | 'poor';
  species?: string[];
  depth?: number;
}

interface MapLocation {
  lat: number;
  lon: number;
  name: string;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unknown';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    // Use UTC to avoid hydration mismatches
    const day = date.getUTCDate();
    const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${day} ${month}, ${hours}:${minutes}`;
  } catch (error) {
    console.warn('Failed to format datetime', { value, error });
    return value;
  }
}

const _sourceBadgeStyles: Record<ConditionsSource, string> = {
  supabase: 'badge-success',
  fallback: 'badge-warning',
};

const DEFAULT_MAP_LOCATION: MapLocation = {
  lat: 43.48,
  lon: -5.27,
  name: 'Asturias Coast',
};

const KTS_TO_MS = 0.514444;
const HOUR_MS = 60 * 60 * 1000;

const toFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const normaliseHourlyIso = (raw: unknown, baseUtc: Date, index: number): string => {
  if (typeof raw === 'string') {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    const hhmmMatch = raw.match(/^(\d{1,2}):(\d{2})/);
    if (hhmmMatch) {
      const [, hh, mm] = hhmmMatch;
      const guess = new Date(baseUtc.getTime());
      guess.setUTCHours(Number.parseInt(hh, 10), Number.parseInt(mm, 10), 0, 0);
      const dayOffset = Math.floor(index / 24);
      guess.setUTCDate(guess.getUTCDate() + dayOffset);
      return guess.toISOString();
    }
  } else if (typeof raw === 'number') {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const fallback = new Date(baseUtc.getTime() + index * HOUR_MS);
  return fallback.toISOString();
};

type NextFewDaysCardProps = ComponentProps<typeof NextFewDaysCard>;

export const ConditionsDashboard: React.FC<ConditionsDashboardProps> = ({
  data,
  loading,
  error,
  source: _source,
  onRetry,
  rectangleCode,
}) => {
  const [showMap, setShowMap] = useState(true);
  const [_capturedDisplay, setCapturedDisplay] = useState('—');
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (loading) {
      setCapturedDisplay('—');
      return;
    }
    // Only format time on client to avoid hydration mismatch
    if (isClient) {
      setCapturedDisplay(formatDateTime(data.snapshot.capturedAt));
    }
  }, [data.snapshot.capturedAt, loading, isClient]);

  const marine = data.snapshot.marine;
  const marineBio = data.snapshot.marineBio;
  const hourly = useMemo(() => data.snapshot.hourly.slice(0, 12), [data.snapshot.hourly]);
  const daily = useMemo(() => data.snapshot.daily.slice(0, 7), [data.snapshot.daily]);
  const tideExtrema = useMemo(() => {
    const heights = data.snapshot.hourly
      .map((entry) => entry.tideMeters)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    if (heights.length === 0) {
      return { max: null, min: null } as const;
    }

    return {
      max: Math.max(...heights),
      min: Math.min(...heights),
    } as const;
  }, [data.snapshot.hourly]);

  const tideEvents = useMemo<TideEvent[]>(() => {
    const events: TideEvent[] = [];
    if (data.snapshot.tides.nextHighIso) {
      events.push({ timeISO: data.snapshot.tides.nextHighIso, type: 'HIGH' });
    }
    if (data.snapshot.tides.nextLowIso) {
      events.push({ timeISO: data.snapshot.tides.nextLowIso, type: 'LOW' });
    }
    return events;
  }, [data.snapshot.tides.nextHighIso, data.snapshot.tides.nextLowIso]);

  const nextFewDaysDaily = useMemo<NextFewDaysCardProps['daily']>(() => {
    const entries = data.snapshot.daily || [];
    if (!entries.length) return [];
    const captured = new Date(data.snapshot.capturedAt);
    const baseUtc = Number.isNaN(captured.getTime())
      ? new Date()
      : new Date(Date.UTC(captured.getUTCFullYear(), captured.getUTCMonth(), captured.getUTCDate()));

    return entries.map((entry, index) => {
      const seaTemp = toFiniteNumber(entry.seaTemperatureC);
      const windKts = toFiniteNumber(entry.windSpeedKts);
      return {
        dateISO: new Date(baseUtc.getTime() + index * 24 * HOUR_MS).toISOString(),
        icon: undefined,
        minC: seaTemp,
        maxC: seaTemp,
        pop: undefined,
        precipMM: undefined,
        summary: entry.summary,
        windMS: windKts !== undefined ? windKts * KTS_TO_MS : undefined,
        windDeg: undefined,
        uvi: undefined,
      };
    });
  }, [data.snapshot.daily, data.snapshot.capturedAt]);

  const marineHourlyForCard = useMemo<MarineHourlyPoint[]>(() => {
    const entries = data.snapshot.hourly || [];
    if (!entries.length) return [];
    const captured = new Date(data.snapshot.capturedAt);
    const baseUtc = Number.isNaN(captured.getTime())
      ? new Date()
      : new Date(Date.UTC(captured.getUTCFullYear(), captured.getUTCMonth(), captured.getUTCDate()));

    return entries.map((entry, index) => {
      const rawTime = (entry as { timeISO?: string; time?: string }).timeISO ?? (entry as { time?: string }).time;
      const timeISO = normaliseHourlyIso(rawTime, baseUtc, index);
      const waveHeight = toFiniteNumber(entry.waveHeightM);
      return {
        timeISO,
        waveM: waveHeight ?? null,
        waterTempC: toFiniteNumber(entry.seaTemperatureC) ?? null,
        windKts: toFiniteNumber(entry.windSpeedKts),
      } as MarineHourlyPoint;
    });
  }, [data.snapshot.hourly, data.snapshot.capturedAt]);

  const mapLocation = useMemo<MapLocation>(() => {
    const { centerLat, centerLon, name } = data.rectangle;
    if (Number.isFinite(centerLat) && Number.isFinite(centerLon)) {
      return {
        lat: centerLat,
        lon: centerLon,
        name: name ?? 'Fishing area',
      };
    }
    return DEFAULT_MAP_LOCATION;
  }, [data.rectangle]);

  const environmentalSignals = useFindrEnvironmentalSignals(
    Number.isFinite(data.rectangle.centerLat) ? data.rectangle.centerLat : null,
    Number.isFinite(data.rectangle.centerLon) ? data.rectangle.centerLon : null
  );

  const {
    waveHeightM,
    seaTemperatureC,
    windSpeedKts,
    chlorophyllMgM3,
    dissolvedOxygenMgL,
    nitrateUmolL,
    phosphateUmolL,
    salinityPsu,
  } = marine;

  const marineBioIndicators = useMemo(
    () =>
      buildMarineBioIndicators({
        chlorophyll: marineBio?.chlorophyllAvg ?? chlorophyllMgM3,
        oxygen: marineBio?.dissolvedOxygenAvg ?? dissolvedOxygenMgL,
        nitrate: marineBio?.nitrateAvg ?? nitrateUmolL,
        phosphate: marineBio?.phosphateAvg ?? phosphateUmolL,
        salinity: marineBio?.salinityAvg ?? salinityPsu,
        surfaceTemperature: marineBio?.seaSurfaceTemperatureAvg ?? seaTemperatureC,
        phytoplankton: marineBio?.phytoplanktonAvg ?? null,
      }),
    [
      marineBio,
      chlorophyllMgM3,
      dissolvedOxygenMgL,
      nitrateUmolL,
      phosphateUmolL,
      salinityPsu,
      seaTemperatureC,
    ]
  );

  const fishingSpots = useMemo<FishingSpot[]>(() => {
    const evaluateSpot = (modifier: number): FishingSpot['status'] => {
      let score = 50;

      if (waveHeightM >= 0.5 && waveHeightM <= 2) score += 20;
      else if (waveHeightM > 3) score -= 20;

      if (seaTemperatureC >= 14 && seaTemperatureC <= 18) score += 20;
      else if (seaTemperatureC < 10 || seaTemperatureC > 22) score -= 15;

      if (windSpeedKts < 15) score += 15;
      else if (windSpeedKts > 25) score -= 20;

      score += modifier;

      if (score >= 70) return 'hot';
      if (score >= 50) return 'ok';
      return 'poor';
    };

    return [
      {
        id: '1',
        lat: mapLocation.lat + 0.02,
        lon: mapLocation.lon + 0.05,
        status: evaluateSpot(10),
        species: ['Sea Bass', 'Mackerel'],
        depth: 25,
      },
      {
        id: '2',
        lat: mapLocation.lat - 0.01,
        lon: mapLocation.lon + 0.08,
        status: evaluateSpot(15),
        species: ['Tuna', 'Bonito'],
        depth: 45,
      },
      {
        id: '3',
        lat: mapLocation.lat + 0.05,
        lon: mapLocation.lon - 0.02,
        status: evaluateSpot(-5),
        species: ['Sardine'],
        depth: 15,
      },
      {
        id: '4',
        lat: mapLocation.lat - 0.03,
        lon: mapLocation.lon - 0.05,
        status: evaluateSpot(5),
        species: ['Sea Bream'],
        depth: 35,
      },
    ];
  }, [mapLocation, waveHeightM, seaTemperatureC, windSpeedKts]);

  return (
    <section className="space-y-6">
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold"><TranslatedText text="Conditions for" /> {data.rectangle.name}</h1>
              
            </div>
            
          </div>

          {error ? (
            <div className="alert alert-warning mt-4">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold text-sm"><TranslatedText text="Live conditions unavailable" /></h3>
                <p className="text-sm">{error}</p>
              </div>
              {onRetry ? (
                <button className="btn btn-sm" onClick={onRetry} type="button">
                  <TranslatedText text="Try again" />
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="divider" />

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" /> <TranslatedText text="Fishing Area Map" />
            </h2>
            <button className="btn btn-sm btn-outline" onClick={() => setShowMap((value) => !value)} type="button">
              {showMap ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showMap ? <TranslatedText text="Hide Map" /> : <TranslatedText text="Show Map" />}
            </button>
          </div>

          {showMap ? (
            <div className="bg-base-200/40 rounded-xl border border-base-200 overflow-hidden">
              <ConditionsMap
                centerLocation={{ lat: mapLocation.lat, lon: mapLocation.lon }}
                fishingSpots={fishingSpots}
                showDepthContours
                showICESRectangle
                className="h-80"
                rectangleCode={rectangleCode ?? undefined}
              />

              <div className="p-4 bg-base-200/20 border-t border-base-200">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  <div>
                    <span className="font-medium"><TranslatedText text="Active spots:" /></span>{' '}
                    {fishingSpots.filter((spot) => spot.status === 'hot').length} <TranslatedText text="hot" />,{' '}
                    {fishingSpots.filter((spot) => spot.status === 'ok').length} <TranslatedText text="ok" />
                  </div>
                  <div>
                    <span className="font-medium"><TranslatedText text="Area:" /></span> {data.rectangle.name}
                  </div>
                  <div>
                    <span className="font-medium"><TranslatedText text="Coordinates:" /></span>{' '}
                    {mapLocation.lat.toFixed(2)}°N, {Math.abs(mapLocation.lon).toFixed(2)}°
                    {mapLocation.lon >= 0 ? 'E' : 'W'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[260px] w-full items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-200/40 text-sm text-base-content/60">
              <TranslatedText text="Map view loads once area metadata is available." />
            </div>
          )}

          <div className="divider" />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <WindSummaryCard
              speedKts={marine.windSpeedKts}
              directionDeg={marine.windDirectionDeg}
              updatedAt={data.snapshot.capturedAt}
            />
            <WaveSummaryCard
              waveHeightM={marine.waveHeightM}
              chlorophyllMgM3={marine.chlorophyllMgM3}
              updatedAt={data.snapshot.capturedAt}
            />
            <TideSummaryCard
              nextHighIso={data.snapshot.tides.nextHighIso}
              nextLowIso={data.snapshot.tides.nextLowIso}
              lastTideHeight={tideExtrema.max}
              upcomingTideHeight={tideExtrema.min}
            />
            <EnvironmentalSummaryCard
              pollen={environmentalSignals.pollen}
              airQuality={environmentalSignals.airQuality}
              uvIndex={environmentalSignals.uvIndex}
              loading={environmentalSignals.loading}
              error={environmentalSignals.error}
              updatedAt={environmentalSignals.updatedAt}
              onRetry={environmentalSignals.reload}
            />
            <MarineBioIndicatorsCard
              indicators={marineBioIndicators}
              loading={loading}
              updatedAt={data.snapshot.capturedAt}
              className="md:col-span-2 xl:col-span-3"
            />
          </div>

          <div className="mt-4">
            {nextFewDaysDaily.length > 0 ? (
              <NextFewDaysCard
                daily={nextFewDaysDaily}
                marineHourly={marineHourlyForCard}
                tide={tideEvents}
                isMarine
              />
            ) : (
              <div className="card bg-base-200/40 border border-base-200 shadow-sm">
                <div className="card-body text-sm text-base-content/70">
                  <TranslatedText text="Daily marine outlooks are still generating for this rectangle. Fresh ingestions will surface once available." />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {hourly.length > 0 ? (
              <HourlyMarineCarousel entries={hourly} />
            ) : (
              <div className="card bg-base-200/40 border border-base-200 shadow-sm">
                <div className="card-body text-sm text-base-content/70">
                  <TranslatedText text="Hourly marine data unavailable for this rectangle. Live ingestions will populate rolling conditions here." />
                </div>
              </div>
            )}
            {daily.length > 0 ? (
              <DailyMarineCarousel entries={daily} />
            ) : (
              <div className="card bg-base-200/40 border border-base-200 shadow-sm">
                <div className="card-body text-sm text-base-content/70">
                  <TranslatedText text="Daily marine summaries are still generating. Check back once the conditions pipeline completes its 7-day forecast window." />
                </div>
              </div>
            )}
          </div>

          {rectangleCode ? null : (
            <div className="alert alert-info mt-6">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold text-sm"><TranslatedText text="Select a fishing rectangle" /></h3>
                <p className="text-sm"><TranslatedText text="Pick an ICES rectangle in the panel below to request fresh conditions from the live API." /></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ConditionsDashboard;