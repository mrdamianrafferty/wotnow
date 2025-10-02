import React, { useMemo } from 'react';
import { Trees, Cloud, Sun, GaugeCircle, Leaf, AlertCircle, RefreshCcw } from 'lucide-react';
import EnvironmentalIndicators from '../../EnvironmentalIndicators';
import WeatherStatCard from './WeatherStatCard';
import { TranslatedText } from '../../translation/TranslatedFishCard';
import {
  assessPollenConditions,
  getPollenLevelDescription,
  PollenLevel,
  type PollenSummary,
} from '../../../utils/pollenUtils';
import {
  type AirQualitySummary,
  AirQualityLevel,
  getAirQualityLevel,
  getAirQualityLevelDescription,
} from '../../../utils/airQualityUtils';
import { formatRelativeTime } from '../../../lib/findr/weatherFormatting';

interface EnvironmentalSummaryCardProps {
  pollen?: PollenSummary;
  airQuality?: AirQualitySummary;
  uvIndex?: number | null;
  snowDepthCm?: number;
  snowfallRateMmH?: number;
  loading?: boolean;
  error?: string | null;
  updatedAt?: string | null;
  onRetry?: () => void;
}

type SummaryTone = 'badge-ghost' | 'badge-info' | 'badge-success' | 'badge-warning' | 'badge-error';

interface SummaryItem {
  key: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: SummaryTone;
}

function toneForPollen(level: PollenLevel): SummaryTone {
  switch (level) {
    case PollenLevel.NONE:
      return 'badge-ghost';
    case PollenLevel.LOW:
      return 'badge-success';
    case PollenLevel.MODERATE:
      return 'badge-info';
    case PollenLevel.HIGH:
      return 'badge-warning';
    default:
      return 'badge-error';
  }
}

function toneForAirQuality(level: AirQualityLevel): SummaryTone {
  switch (level) {
    case AirQualityLevel.NONE:
      return 'badge-ghost';
    case AirQualityLevel.GOOD:
      return 'badge-success';
    case AirQualityLevel.MODERATE:
      return 'badge-info';
    case AirQualityLevel.UNHEALTHY_SENSITIVE:
      return 'badge-warning';
    default:
      return 'badge-error';
  }
}

function classifyUvIndex(index?: number | null): { label: string; tone: SummaryTone } {
  if (typeof index !== 'number' || Number.isNaN(index)) {
    return { label: 'No data', tone: 'badge-ghost' };
  }

  if (index < 3) return { label: `Low (${index.toFixed(0)})`, tone: 'badge-success' };
  if (index < 6) return { label: `Moderate (${index.toFixed(0)})`, tone: 'badge-info' };
  if (index < 8) return { label: `High (${index.toFixed(0)})`, tone: 'badge-warning' };
  if (index < 11) return { label: `Very High (${index.toFixed(0)})`, tone: 'badge-error' };
  return { label: `Extreme (${index.toFixed(0)})`, tone: 'badge-error' };
}

export function EnvironmentalSummaryCard({
  pollen,
  airQuality,
  uvIndex,
  snowDepthCm,
  snowfallRateMmH,
  loading = false,
  error,
  updatedAt,
  onRetry,
}: EnvironmentalSummaryCardProps) {
  const pollenAssessment = useMemo(() => (pollen ? assessPollenConditions(pollen) : null), [pollen]);
  const pollenLevel = pollenAssessment?.overall ?? PollenLevel.NONE;
  const pollenLabel = pollenAssessment ? getPollenLevelDescription(pollenAssessment.overall) : null;
  const hasPollenData = Boolean(pollen && Object.values(pollen).some((value) => value != null && value > 0));

  const airQualityLevel = useMemo(() => getAirQualityLevel(airQuality?.overall), [airQuality?.overall]);
  const airQualityLabel = airQuality ? getAirQualityLevelDescription(airQualityLevel) : null;
  const airQualityValue = typeof airQuality?.overall === 'number' && Number.isFinite(airQuality.overall)
    ? Math.round(airQuality.overall)
    : null;
  const hasAirQualityData = Boolean(airQualityValue !== null);

  const hasUvData = typeof uvIndex === 'number' && Number.isFinite(uvIndex);
  const uvSummary = classifyUvIndex(uvIndex ?? undefined);

  const summaryItems = useMemo<SummaryItem[]>(() => {
    const items: SummaryItem[] = [];

    if (hasPollenData && pollenLabel) {
      items.push({
        key: 'pollen',
        label: 'Pollen',
        value: pollenLabel,
        icon: <Leaf className="size-3.5" />,
        tone: toneForPollen(pollenLevel),
      });
    }

    if (hasAirQualityData && airQualityLabel) {
      const valueText = airQualityValue != null ? `${airQualityLabel} (${airQualityValue})` : airQualityLabel;
      items.push({
        key: 'air-quality',
        label: 'AQI',
        value: valueText,
        icon: <GaugeCircle className="size-3.5" />,
        tone: toneForAirQuality(airQualityLevel),
      });
    }

    if (hasUvData) {
      items.push({
        key: 'uv',
        label: 'UV',
        value: uvSummary.label,
        icon: <Sun className="size-3.5" />,
        tone: uvSummary.tone,
      });
    }

    return items;
  }, [hasPollenData, pollenLabel, pollenLevel, hasAirQualityData, airQualityLabel, airQualityValue, airQualityLevel, hasUvData, uvSummary]);

  const hasSnowData = typeof snowDepthCm === 'number' || typeof snowfallRateMmH === 'number';
  const hasDetailData = summaryItems.length > 0 || hasSnowData;
  const updatedRelative = updatedAt ? formatRelativeTime(updatedAt) : null;

  return (
    <WeatherStatCard
      title={<TranslatedText text="What's that in the air?" />}
      subtitle={<TranslatedText text="Pollen, air quality & UV risk" />}
      icon={<Trees className="size-5" />}
      badge={loading ? "Loading…" : undefined}
      footer={!loading && updatedRelative ? `Updated ${updatedRelative}` : undefined}
    >
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 rounded bg-base-300/60 animate-pulse" />
          <div className="h-3 rounded bg-base-300/40 animate-pulse" />
          <div className="h-3 rounded bg-base-300/30 animate-pulse" />
        </div>
      ) : hasDetailData ? (
        <div className="space-y-3">
          {summaryItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {summaryItems.map((item) => (
                <span key={item.key} className={`badge ${item.tone} gap-1 py-2 px-3 text-xs font-medium`}>
                  {item.icon}
                  <span><TranslatedText text={item.label} /> · <TranslatedText text={item.value} /></span>
                </span>
              ))}
            </div>
          ) : null}

          <EnvironmentalIndicators
            pollen={pollen}
            airQuality={airQuality}
            snowDepthCm={snowDepthCm}
            snowfallRateMmH={snowfallRateMmH}
            mode="full"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-xs text-base-content/70">
          <div className="flex items-center gap-2">
            <Cloud className="size-4" />
            <span>All clear — no notable environmental issues detected.</span>
          </div>
          {error ? (
            <div className="flex items-center gap-2 text-error">
              <AlertCircle className="size-4" />
              <span>{error}</span>
              {onRetry ? (
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={onRetry}
                >
                  <RefreshCcw className="size-3" /> Retry
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {!loading && error && hasDetailData ? (
        <div className="alert alert-warning mt-3 text-xs">
          <AlertCircle className="size-4" />
          <span>{error}</span>
          {onRetry ? (
            <button type="button" className="btn btn-ghost btn-xs" onClick={onRetry}>
              <RefreshCcw className="size-3" /> Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </WeatherStatCard>
  );
}

export default EnvironmentalSummaryCard;
