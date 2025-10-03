import React, { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TranslatedText } from '../../translation/TranslatedFishCard';
import {
  Leaf,
  Wind,
  FlaskConical,
  Droplet,
  Droplets,
  Waves,
  Sparkles,
  Hexagon,
  AlertCircle,
  Info,
} from 'lucide-react';
import WeatherStatCard from './WeatherStatCard';
import { formatRelativeTime } from '../../../lib/findr/weatherFormatting';
import {
  MARINE_BIO_INDICATOR_ORDER,
  MARINE_BIO_LEVEL_LABELS,
  type MarineBioIndicatorLevel,
  type MarineBioIndicatorState,
  type MarineBioIndicatorType,
} from '../../../utils/bioMarineLevels';

interface MarineBioIndicatorsCardProps {
  indicators?: MarineBioIndicatorState[];
  loading?: boolean;
  updatedAt?: string | null;
  error?: string | null;
  className?: string;
}

interface IndicatorConfig {
  icon: LucideIcon;
  label: string;
  colorClass: string;
}

const indicatorOrder = MARINE_BIO_INDICATOR_ORDER;

const indicatorConfigs: Record<MarineBioIndicatorType, IndicatorConfig> = {
  chlorophyll: {
    icon: Leaf,
    label: 'Chlorophyll',
    colorClass: 'text-green-600',
  },
  oxygen: {
    icon: Wind,
    label: 'Dissolved Oxygen',
    colorClass: 'text-sky-500',
  },
  nitrate: {
    icon: FlaskConical,
    label: 'Nitrate',
    colorClass: 'text-purple-600',
  },
  phosphate: {
    icon: Droplets,
    label: 'Phosphate',
    colorClass: 'text-indigo-600',
  },
  salinity: {
    icon: Hexagon,
    label: 'Salinity',
    colorClass: 'text-slate-500',
  },
  surfaceTemperature: {
    icon: Waves,
    label: 'Water Temperature',
    colorClass: 'text-orange-500',
  },
  phytoplankton: {
    icon: Sparkles,
    label: 'Phytoplankton',
    colorClass: 'text-emerald-600',
  },
};

const levelBadges: Record<MarineBioIndicatorLevel, string> = {
  very_low: 'badge-error',
  low: 'badge-warning',
  normal: 'badge-success',
  high: 'badge-info',
  very_high: 'badge-secondary',
};

const levelLabels = MARINE_BIO_LEVEL_LABELS;

const indicatorDescriptions: Record<MarineBioIndicatorType, Record<MarineBioIndicatorLevel, string>> = {
  chlorophyll: {
    very_low: 'Water is clear with little plankton – baitfish and predators scarce.',
    low: 'Below-average plankton – some baitfish, but patchy predator activity.',
    normal: 'Healthy plankton levels – food chain active, fair chance of finding fish.',
    high: 'Strong plankton bloom – baitfish abundant, predators likely nearby.',
    very_high: 'Excess bloom may reduce clarity – predators may hunt deeper or elsewhere.',
  },
  oxygen: {
    very_low: 'Dangerously low oxygen – fish stressed or absent; avoid these waters.',
    low: 'Below comfort level – fish sluggish, bites unlikely.',
    normal: 'Comfortable oxygen – normal fish activity.',
    high: 'Good oxygen – fish energetic, active feeding likely.',
    very_high: 'Very well-oxygenated – ideal for active predators chasing prey.',
  },
  nitrate: {
    very_low: 'Extremely nutrient-poor – weak plankton growth, limited baitfish.',
    low: 'Low nutrients – only light food chain activity.',
    normal: 'Balanced nutrients – stable food chain, fair fishing conditions.',
    high: 'Nutrient-rich – plankton blooms support baitfish and predators.',
    very_high: 'Excess nutrients – risk of algal bloom, fish may disperse.',
  },
  phosphate: {
    very_low: 'Water lacks nutrients – plankton and baitfish scarce.',
    low: 'Slight nutrient deficit – slower plankton growth.',
    normal: 'Balanced phosphate – normal productivity.',
    high: 'Nutrient-rich waters – good for plankton, baitfish and predators.',
    very_high: 'Too much phosphate – possible harmful blooms, mixed fishing results.',
  },
  salinity: {
    very_low: 'Freshened water – many marine fish stressed, estuary species more common.',
    low: 'Slightly diluted seawater – some species tolerate, others avoid.',
    normal: 'Stable salinity – good general fishing conditions.',
    high: 'Saltier than normal – offshore or Mediterranean species thrive.',
    very_high: 'Very saline – fewer species, only salt-tolerant fish remain.',
  },
  surfaceTemperature: {
    very_low: 'Too cold for most activity – only cold-water fish feed.',
    low: 'Chilly – some species active, most sluggish.',
    normal: 'Comfortable range – fish active and feeding normally.',
    high: 'Warm – good for warm-water species, but some fish rest during day.',
    very_high: 'Very hot surface – risk of low oxygen, fish go deeper or nocturnal.',
  },
  phytoplankton: {
    very_low: 'Minimal plankton – food chain weak, few fish around.',
    low: 'Low productivity – patchy fish presence.',
    normal: 'Balanced plankton – food web stable, good fishing potential.',
    high: 'Strong plankton – baitfish schools likely, predators nearby.',
    very_high: 'Over-bloom – possible cloudy water, predators may shift to clearer areas.',
  },
};

function MarineBioIndicatorCard({
  indicator,
  expanded,
  onToggle,
}: {
  indicator: MarineBioIndicatorState;
  expanded: boolean;
  onToggle: (type: MarineBioIndicatorType) => void;
}) {
  const config = indicatorConfigs[indicator.type];
  const Icon = config.icon;
  const description = indicatorDescriptions[indicator.type]?.[indicator.level];

  const valueText = useMemo(() => {
    if (typeof indicator.value === 'number' && Number.isFinite(indicator.value)) {
      return `${indicator.value.toFixed(1)}${indicator.unit ? ` ${indicator.unit}` : ''}`;
    }
    return null;
  }, [indicator.unit, indicator.value]);

  return (
    <button
      type="button"
      className="group relative flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 !bg-white hover:!bg-slate-50"
      onClick={() => onToggle(indicator.type)}
      aria-expanded={expanded}
    >
      <div className="flex items-start gap-3">
  <span className={`flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg shadow-sm ${config.colorClass} !bg-white`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-base-content"><TranslatedText text={config.label} /></span>
            <span className={`badge ${levelBadges[indicator.level]} badge-xs sm:badge-sm whitespace-nowrap`}>{levelLabels[indicator.level]}</span>
          </div>
          {valueText ? (
            <div className="text-xs font-medium text-base-content/70">
              {valueText}
            </div>
          ) : null}
        </div>
      </div>

      {description ? (
        expanded ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-base-content/70">
            <TranslatedText text={description} />
          </p>
        ) : (
          <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-base-content/40 transition-colors group-hover:text-base-content/60">
            <span className="h-1.5 w-1.5 rounded-full bg-base-content/30" />
            <span><TranslatedText text="Tap for fishing insight" /></span>
          </div>
        )
      ) : null}
    </button>
  );
}

export function MarineBioIndicatorsCard({
  indicators = [],
  loading = false,
  updatedAt,
  error,
  className = '',
}: MarineBioIndicatorsCardProps) {
  const [expandedType, setExpandedType] = useState<MarineBioIndicatorType | null>(null);
  const [relativeUpdated, setRelativeUpdated] = useState<string | null>(null);

  const orderedIndicators = useMemo(() => {
    if (!indicators.length) return [];
    const map = new Map<MarineBioIndicatorType, MarineBioIndicatorState>();
    indicators.forEach((item) => {
      map.set(item.type, item);
    });

    return indicatorOrder
      .map((type) => map.get(type))
      .filter((item): item is MarineBioIndicatorState => Boolean(item));
  }, [indicators]);

  useEffect(() => {
    if (!updatedAt) {
      setRelativeUpdated(null);
      return;
    }

    setRelativeUpdated(formatRelativeTime(updatedAt));

    const interval = window.setInterval(() => {
      setRelativeUpdated(formatRelativeTime(updatedAt));
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [updatedAt]);

  const handleToggle = (type: MarineBioIndicatorType) => {
    setExpandedType((prev) => (prev === type ? null : type));
  };

  const hasData = orderedIndicators.length > 0;

  return (
    <WeatherStatCard
      title={<TranslatedText text="Bio indicators" />}
      subtitle={<TranslatedText text="Nutrients, oxygen & plankton outlook" />}
      icon={<Droplet className="size-5 text-primary" />}
      badge={loading ? 'Updating…' : undefined}
      footer={!loading && relativeUpdated ? <TranslatedText text={`Updated ${relativeUpdated}`} /> : undefined}
      className={`!bg-white !border-slate-200 shadow-sm ${className}`}
    >
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`marine-bio-skeleton-${idx}`}
              className="h-[120px] rounded-2xl border border-slate-200 bg-white/70 animate-pulse"
            />
          ))}
        </div>
      ) : hasData ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {orderedIndicators.map((indicator) => (
            <MarineBioIndicatorCard
              key={indicator.type}
              indicator={indicator}
              expanded={expandedType === indicator.type}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : (
  <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-xs text-base-content/70">
          <Info className="size-4" />
          <span>Marine bio indicators will appear here once this location includes nutrient and plankton data.</span>
        </div>
      )}

      {!loading && error ? (
        <div className="alert alert-warning mt-4 text-xs">
          <AlertCircle className="size-4" />
          <div>{error}</div>
        </div>
      ) : null}
    </WeatherStatCard>
  );
}

export default MarineBioIndicatorsCard;
