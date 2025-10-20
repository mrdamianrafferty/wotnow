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
  HatGlasses,
  Ruler,
  Utensils,
  Fish,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import WeatherStatCard from './WeatherStatCard';
import { formatRelativeTime } from '../../../lib/findr/weatherFormatting';
import {
  MARINE_BIO_INDICATOR_ORDER,
  MARINE_BIO_LEVEL_LABELS,
  STEALTH_LEVEL_LABELS,
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
  tier: 'essential' | 'advanced';
}

const indicatorOrder = MARINE_BIO_INDICATOR_ORDER;

const indicatorConfigs: Record<MarineBioIndicatorType, IndicatorConfig> = {
  chlorophyll: {
    icon: Leaf,
    label: 'Chlorophyll',
    colorClass: 'text-green-600',
    tier: 'advanced',
  },
  oxygen: {
    icon: Wind,
    label: 'Dissolved Oxygen',
    colorClass: 'text-sky-500',
    tier: 'essential',
  },
  nitrate: {
    icon: FlaskConical,
    label: 'Nitrate',
    colorClass: 'text-purple-600',
    tier: 'advanced',
  },
  phosphate: {
    icon: Droplets,
    label: 'Phosphate',
    colorClass: 'text-indigo-600',
    tier: 'advanced',
  },
  stealth: {
    icon: HatGlasses,
    label: 'Stealth Mode',
    colorClass: 'text-amber-600',
    tier: 'essential',
  },
  salinity: {
    icon: Hexagon,
    label: 'Salinity',
    colorClass: 'text-slate-500',
    tier: 'advanced',
  },
  surfaceTemperature: {
    icon: Waves,
    label: 'Water Temperature',
    colorClass: 'text-orange-500',
    tier: 'essential',
  },
  phytoplankton: {
    icon: Sparkles,
    label: 'Phytoplankton',
    colorClass: 'text-emerald-600',
    tier: 'advanced',
  },
  targetDepth: {
    icon: Ruler,
    label: 'How Deep are the Fish?',
    colorClass: 'text-blue-600',
    tier: 'essential',
  },
  feedingPotential: {
    icon: Utensils,
    label: 'Feeding Potential',
    colorClass: 'text-rose-600',
    tier: 'essential',
  },
  baitfishActivity: {
    icon: Fish,
    label: 'Baitfish Activity',
    colorClass: 'text-cyan-600',
    tier: 'advanced',
  },
};

const levelBadges: Record<MarineBioIndicatorLevel, string> = {
  very_low: 'badge-error',
  low: 'badge-warning',
  normal: 'badge-success',
  high: 'badge-info',
  very_high: 'badge-secondary',
};

// Custom badge colors for Stealth Mode (inverted: good conditions = green, bad = red)
const stealthBadges: Record<MarineBioIndicatorLevel, string> = {
  very_low: 'badge-success',   // Loud and Proud = green (good for fishing)
  low: 'badge-success',        // Loud and Proud = green (good for fishing)
  normal: 'badge-warning',     // Blend In = yellow (moderate)
  high: 'badge-error',         // Ninja Mode = red (difficult conditions)
  very_high: 'badge-error',    // Ninja Mode = red (difficult conditions)
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
  stealth: {
    very_low: 'Loud and Proud – visibility\'s poor, they\'ll never notice. Fish can\'t see you well, so make noise, move freely, and try bold presentations. Perfect for experimenting.',
    low: 'Loud and Proud – visibility\'s poor, they\'ll never notice. Low light gives you the advantage. Be confident with your approach and presentation.',
    normal: 'Blend In – stay subtle, but not paranoid. Moderate light means fish are somewhat alert. Use natural colors and keep movement smooth, but no need to be overly cautious.',
    high: 'Ninja Mode – fish are spooky; keep quiet and invisible. High light makes fish wary. Use longer leaders (9-12ft), muted colors, slow movements, and careful positioning.',
    very_high: 'Ninja Mode – fish are spooky; keep quiet and invisible. Extreme light penetration. Fish extremely alert. Ultra-long leaders (12-15ft+), natural baits, minimal movement. Consider dawn/dusk.',
  },
  targetDepth: {
    very_low: 'Shallow zone – fish concentrated near surface or in first 5-10m. Target shallow structure.',
    low: 'Upper water column – fish holding at 10-15m. Good for light tackle and surface lures.',
    normal: 'Mid-water thermocline – clear depth structure at 15-25m where fish concentrate. Target this zone.',
    high: 'Deeper thermocline – fish holding at 25-40m. Need appropriate gear to reach the zone.',
    very_high: 'Deep or mixed water – fish may be scattered across depths or very deep (40m+). Try multiple depths or focus on structure.',
  },
  feedingPotential: {
    very_low: 'Sparse food chain – limited plankton and baitfish. Fish scattered and selective. Slow presentations, target known structure.',
    low: 'Below average productivity – some baitfish but not abundant. Fish may be cautious. Use realistic presentations.',
    normal: 'Moderate feeding activity – adequate food chain supports fair fishing. Standard tactics work well.',
    high: 'Rich ecosystem – abundant food chain. Fish actively feeding. Good variety of lures will work.',
    very_high: 'Excellent conditions – food chain thriving, competitive feeding. Fish aggressive and less selective. Prime fishing!',
  },
  baitfishActivity: {
    very_low: 'Minimal baitfish food – low zooplankton means scattered baitfish. Predators may be elsewhere or deeper.',
    low: 'Limited baitfish activity – some zooplankton present. Look for concentrated areas.',
    normal: 'Normal baitfish levels – typical zooplankton supports standard baitfish presence. Cover water to find fish.',
    high: 'Active baitfish – high zooplankton means plenty of baitfish food. Look for bird activity and predators nearby.',
    very_high: 'Excellent baitfish conditions – abundant zooplankton supports large baitfish schools. Prime predator hunting grounds.',
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
      // Round essential indicators to whole numbers for cleaner display
      const decimals = config.tier === 'essential' ? 0 : 1;
      return `${indicator.value.toFixed(decimals)}${indicator.unit ? ` ${indicator.unit}` : ''}`;
    }
    if (typeof indicator.value === 'string' && indicator.value.trim().length > 0) {
      return indicator.unit ? `${indicator.value} ${indicator.unit}` : indicator.value;
    }
    return null;
  }, [indicator.unit, indicator.value, config.tier]);

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
            <span className={`badge ${indicator.type === 'stealth' ? stealthBadges[indicator.level] : levelBadges[indicator.level]} badge-xs sm:badge-sm whitespace-nowrap`}>
              {indicator.type === 'stealth' ? STEALTH_LEVEL_LABELS[indicator.level] : levelLabels[indicator.level]}
            </span>
          </div>
          {valueText ? (
            <div className="text-xs font-medium text-base-content/70">
              {valueText}
            </div>
          ) : null}
          {indicator.hint && !valueText ? (
            <div className="text-[11px] uppercase tracking-wide text-base-content/50">{indicator.hint}</div>
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
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  // Split into essential and advanced tiers
  const essentialIndicators = useMemo(
    () => orderedIndicators.filter((ind) => indicatorConfigs[ind.type]?.tier === 'essential'),
    [orderedIndicators]
  );

  const advancedIndicators = useMemo(() => {
    const filtered = orderedIndicators.filter((ind) => indicatorConfigs[ind.type]?.tier === 'advanced');
    
    // Smart fallback: Show Chlorophyll if available, otherwise Phytoplankton
    // Never show both to avoid redundancy
    const hasChlorophyll = filtered.some((ind) => ind.type === 'chlorophyll');
    const hasPhytoplankton = filtered.some((ind) => ind.type === 'phytoplankton');
    
    if (hasChlorophyll && hasPhytoplankton) {
      // Prefer Chlorophyll, remove Phytoplankton
      return filtered.filter((ind) => ind.type !== 'phytoplankton');
    }
    
    return filtered;
  }, [orderedIndicators]);

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
      title={<TranslatedText text="The Inside Line" />}
      subtitle={<TranslatedText text="Today’s underwater intel briefing" />}
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
        <>
          {/* Essential Indicators */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {essentialIndicators.map((indicator) => (
              <MarineBioIndicatorCard
                key={indicator.type}
                indicator={indicator}
                expanded={expandedType === indicator.type}
                onToggle={handleToggle}
              />
            ))}
          </div>

          {/* Show More Toggle */}
          {advancedIndicators.length > 0 && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm w-full mt-4"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    <TranslatedText text="Show Fewer" />
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    <TranslatedText text={`Show More Indicators (${advancedIndicators.length})`} />
                  </>
                )}
              </button>

              {/* Advanced Indicators */}
              {showAdvanced && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 mt-3">
                  {advancedIndicators.map((indicator) => (
                    <MarineBioIndicatorCard
                      key={indicator.type}
                      indicator={indicator}
                      expanded={expandedType === indicator.type}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
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
