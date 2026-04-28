/**
 * LocalSignalsCard Component
 *
 * Displays privacy-preserving, weather-based local signals for regional
 * gardening conditions. These are algorithmically generated from weather
 * data - no individual user data is exposed.
 *
 * Signal Categories:
 * - Pest Pressure: Conditions favor pest activity
 * - Disease Risk: Conditions favor disease spread
 * - Weather Damage: Extreme weather may damage plants
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Radio,
  AlertTriangle,
  Bug,
  Leaf,
  Snowflake,
  Wind,
  Thermometer,
  Droplets,
  Sun,
  ChevronDown,
  ChevronUp,
  Shield,
  Info,
  BellOff,
  X,
  Gauge,
  Snail,
  CloudRain,
  CloudFog,
  Droplet,
} from 'lucide-react';
import type {
  LocalSignal,
  SignalCategory,
  SignalSeverity,
  WeatherFactor,
} from '../../lib/grow/localSignals';

// =============================================================================
// TYPES
// =============================================================================

interface LocalSignalsCardProps {
  signals: LocalSignal[];
  onDismissSignal?: (signalId: string, expiresAt: string) => void;
  onMuteSignalType?: (signalType: string) => void;
  loading?: boolean;
  compact?: boolean;
}

// =============================================================================
// STYLING HELPERS
// =============================================================================

export const SEVERITY_COLORS: Record<SignalSeverity, { bg: string; border: string; text: string; badge: string }> = {
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-700',
  },
  moderate: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-700',
  },
  high: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-900',
    badge: 'bg-orange-100 text-orange-700',
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-700',
  },
};

const _CATEGORY_LABELS: Record<SignalCategory, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  pest_pressure: { label: 'Pest Pressure', icon: Bug },
  disease_risk: { label: 'Disease Risk', icon: Leaf },
  weather_damage: { label: 'Weather Damage', icon: AlertTriangle },
};

export function getSignalIcon(signalType: string): React.ComponentType<{ className?: string }> {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    // Pest pressure
    aphid_conditions: Bug,
    slug_activity: Snail,
    caterpillar_conditions: Bug,
    // Disease risk
    late_blight_risk: CloudRain,
    powdery_mildew_risk: CloudFog,
    botrytis_risk: Droplet,
    rust_risk: Leaf,
    // Weather damage
    frost_damage: Snowflake,
    wind_damage: Wind,
    heat_stress: Thermometer,
    drought_stress: Sun,
  };
  return icons[signalType] || AlertTriangle;
}

/**
 * Per-type alert theme: distinct border, icon color, and background
 * for instant visual recognition of each alert category.
 */
export interface AlertTheme {
  borderColor: string;
  bgColor: string;
  iconColor: string;
  accentColor: string;
}

export const ALERT_THEMES: Record<string, AlertTheme> = {
  // Pest pressure
  slug_activity: {
    borderColor: 'border-l-emerald-500',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    accentColor: 'text-emerald-900',
  },
  aphid_conditions: {
    borderColor: 'border-l-lime-500',
    bgColor: 'bg-lime-50',
    iconColor: 'text-lime-600',
    accentColor: 'text-lime-900',
  },
  caterpillar_conditions: {
    borderColor: 'border-l-yellow-500',
    bgColor: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    accentColor: 'text-yellow-900',
  },
  // Disease risk
  late_blight_risk: {
    borderColor: 'border-l-rose-500',
    bgColor: 'bg-rose-50',
    iconColor: 'text-rose-600',
    accentColor: 'text-rose-900',
  },
  powdery_mildew_risk: {
    borderColor: 'border-l-stone-400',
    bgColor: 'bg-stone-50',
    iconColor: 'text-stone-600',
    accentColor: 'text-stone-900',
  },
  botrytis_risk: {
    borderColor: 'border-l-slate-500',
    bgColor: 'bg-slate-50',
    iconColor: 'text-slate-600',
    accentColor: 'text-slate-900',
  },
  rust_risk: {
    borderColor: 'border-l-orange-500',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
    accentColor: 'text-orange-900',
  },
  // Weather damage
  frost_damage: {
    borderColor: 'border-l-cyan-500',
    bgColor: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    accentColor: 'text-cyan-900',
  },
  wind_damage: {
    borderColor: 'border-l-teal-500',
    bgColor: 'bg-teal-50',
    iconColor: 'text-teal-600',
    accentColor: 'text-teal-900',
  },
  heat_stress: {
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-500',
    accentColor: 'text-red-900',
  },
  drought_stress: {
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    accentColor: 'text-amber-900',
  },
  // Weather alert types (from weatherTaskEngine)
  frost: {
    borderColor: 'border-l-cyan-500',
    bgColor: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    accentColor: 'text-cyan-900',
  },
  heat: {
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-500',
    accentColor: 'text-red-900',
  },
  wind: {
    borderColor: 'border-l-teal-500',
    bgColor: 'bg-teal-50',
    iconColor: 'text-teal-600',
    accentColor: 'text-teal-900',
  },
  storm: {
    borderColor: 'border-l-indigo-500',
    bgColor: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    accentColor: 'text-indigo-900',
  },
  rain: {
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    accentColor: 'text-blue-900',
  },
  drought: {
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    accentColor: 'text-amber-900',
  },
  wind_desiccation: {
    borderColor: 'border-l-teal-500',
    bgColor: 'bg-teal-50',
    iconColor: 'text-teal-600',
    accentColor: 'text-teal-900',
  },
  slugs: {
    borderColor: 'border-l-emerald-500',
    bgColor: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    accentColor: 'text-emerald-900',
  },
  aphids: {
    borderColor: 'border-l-lime-500',
    bgColor: 'bg-lime-50',
    iconColor: 'text-lime-600',
    accentColor: 'text-lime-900',
  },
  late_blight: {
    borderColor: 'border-l-rose-500',
    bgColor: 'bg-rose-50',
    iconColor: 'text-rose-600',
    accentColor: 'text-rose-900',
  },
  powdery_mildew: {
    borderColor: 'border-l-stone-400',
    bgColor: 'bg-stone-50',
    iconColor: 'text-stone-600',
    accentColor: 'text-stone-900',
  },
  botrytis: {
    borderColor: 'border-l-slate-500',
    bgColor: 'bg-slate-50',
    iconColor: 'text-slate-600',
    accentColor: 'text-slate-900',
  },
};

const DEFAULT_THEME: AlertTheme = {
  borderColor: 'border-l-gray-400',
  bgColor: 'bg-gray-50',
  iconColor: 'text-gray-600',
  accentColor: 'text-gray-900',
};

export function getAlertTheme(type: string): AlertTheme {
  return ALERT_THEMES[type] || DEFAULT_THEME;
}

function getFactorIcon(factorName: string): React.ComponentType<{ className?: string }> {
  const name = factorName.toLowerCase();
  if (name.includes('temperature') || name.includes('temp')) return Thermometer;
  if (name.includes('wind')) return Wind;
  if (name.includes('rain') || name.includes('moisture')) return Droplets;
  if (name.includes('humidity')) return Droplets;
  if (name.includes('dry')) return Sun;
  return Gauge;
}

// =============================================================================
// SIGNAL ITEM COMPONENT
// =============================================================================

interface SignalItemProps {
  signal: LocalSignal;
  expanded: boolean;
  onExpand: () => void;
  onDismiss?: () => void;
  onMute?: () => void;
}

function SignalItem({ signal, expanded, onExpand, onDismiss, onMute }: SignalItemProps) {
  const colors = SEVERITY_COLORS[signal.severity];
  const theme = getAlertTheme(signal.type);
  const Icon = getSignalIcon(signal.type);
  const [showActions, setShowActions] = useState(false);

  return (
    <div className={`rounded-lg border border-l-4 ${theme.borderColor} ${theme.bgColor} overflow-hidden`}>
      {/* Header - always visible */}
      <button
        onClick={onExpand}
        className="w-full p-3 text-left flex items-start gap-3"
      >
        <div className={`p-2 rounded-full bg-white/70`}>
          <Icon className={`h-5 w-5 ${theme.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`font-medium text-sm ${colors.text}`}>{signal.title}</h4>
            <Badge className={`text-xs ${colors.badge}`}>{signal.severity}</Badge>
          </div>
          <p className={`text-xs ${colors.text} opacity-70 mt-0.5`}>
            {signal.confidence}% confidence
          </p>
        </div>
        {expanded ? (
          <ChevronUp className={`h-4 w-4 ${colors.text} flex-shrink-0`} />
        ) : (
          <ChevronDown className={`h-4 w-4 ${colors.text} flex-shrink-0`} />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Description */}
          <p className={`text-sm ${colors.text} opacity-90`}>{signal.description}</p>

          {/* Weather factors */}
          {signal.weatherFactors.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-xs font-medium text-muted-foreground">Contributing factors</h5>
              <div className="flex flex-wrap gap-2">
                {signal.weatherFactors.map((factor, idx) => (
                  <WeatherFactorBadge key={idx} factor={factor} />
                ))}
              </div>
            </div>
          )}

          {/* Advice */}
          <div className={`p-2 rounded bg-white/60`}>
            <p className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
              <Shield className="h-3 w-3" />
              Recommended action
            </p>
            <p className={`text-xs ${colors.text} opacity-80 mt-0.5`}>{signal.advice}</p>
          </div>

          {/* Affected plants */}
          {signal.affectedPlants.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1">Plants at risk</h5>
              <div className="flex flex-wrap gap-1">
                {signal.affectedPlants.map((plant, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs capitalize">
                    {plant}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Validity period */}
          <p className="text-xs text-muted-foreground">
            Valid: {formatDate(signal.validFrom)} - {formatDate(signal.validUntil)}
          </p>

          {/* Actions */}
          {(onDismiss || onMute) && (
            <div className="pt-2 border-t border-gray-200/50">
              {!showActions ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Signal options...
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  {onDismiss && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss();
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Dismiss for now
                    </button>
                  )}
                  {onMute && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMute();
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <BellOff className="h-3 w-3" />
                      Mute this type
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// WEATHER FACTOR BADGE
// =============================================================================

function WeatherFactorBadge({ factor }: { factor: WeatherFactor }) {
  const Icon = getFactorIcon(factor.name);
  const contributionColors = {
    favorable: 'bg-green-100 text-green-700 border-green-200',
    neutral: 'bg-gray-100 text-gray-600 border-gray-200',
    unfavorable: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${contributionColors[factor.contribution]}`}
    >
      <Icon className="h-3 w-3" />
      {factor.value}
      {factor.unit}
    </span>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

function groupSignalsByCategory(signals: LocalSignal[]): Record<SignalCategory, LocalSignal[]> {
  const grouped: Record<SignalCategory, LocalSignal[]> = {
    pest_pressure: [],
    disease_risk: [],
    weather_damage: [],
  };

  for (const signal of signals) {
    grouped[signal.category].push(signal);
  }

  return grouped;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LocalSignalsCard({
  signals,
  onDismissSignal,
  onMuteSignalType,
  loading = false,
  compact = false,
}: LocalSignalsCardProps) {
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-muted-foreground animate-pulse" />
            Local Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!signals || signals.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">All Clear</p>
              <p className="text-sm text-green-700">
                No local signals for your area right now. Weather conditions are favorable.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Count by severity
  const criticalCount = signals.filter((s) => s.severity === 'critical').length;
  const highCount = signals.filter((s) => s.severity === 'high').length;
  const moderateCount = signals.filter((s) => s.severity === 'moderate').length;

  // Group by category for display
  const grouped = groupSignalsByCategory(signals);

  // Determine visible signals
  const urgentSignals = signals.filter((s) => s.severity === 'critical' || s.severity === 'high');
  const otherSignals = signals.filter((s) => s.severity !== 'critical' && s.severity !== 'high');

  const visibleSignals = compact
    ? urgentSignals.slice(0, 2)
    : showAll
      ? signals
      : [...urgentSignals, ...otherSignals.slice(0, 1)];

  const hiddenCount = signals.length - visibleSignals.length;

  // Card border color based on highest severity
  const cardBorderClass =
    criticalCount > 0
      ? 'border-red-200'
      : highCount > 0
        ? 'border-orange-200'
        : moderateCount > 0
          ? 'border-amber-200'
          : '';

  return (
    <Card className={cardBorderClass}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio
              className={`h-5 w-5 ${criticalCount > 0 ? 'text-red-500' : highCount > 0 ? 'text-orange-500' : 'text-amber-500'}`}
            />
            Local Signals
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && <Badge variant="destructive">{criticalCount} Critical</Badge>}
            {highCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700">{highCount} High</Badge>
            )}
            {moderateCount > 0 && (
              <Badge variant="secondary">{moderateCount} Moderate</Badge>
            )}
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          Weather-based alerts for your area - no personal data used
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Compact view - just list signals */}
        {compact ? (
          visibleSignals.map((signal) => (
            <SignalItem
              key={signal.id}
              signal={signal}
              expanded={expandedSignalId === signal.id}
              onExpand={() =>
                setExpandedSignalId(expandedSignalId === signal.id ? null : signal.id)
              }
              onDismiss={
                onDismissSignal ? () => onDismissSignal(signal.id, signal.validUntil) : undefined
              }
              onMute={onMuteSignalType ? () => onMuteSignalType(signal.type) : undefined}
            />
          ))
        ) : (
          // Full view - group by category
          <>
            {/* Weather Damage signals first (most urgent) */}
            {grouped.weather_damage.filter((s) => visibleSignals.includes(s)).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Weather Damage Risk
                </h4>
                {grouped.weather_damage
                  .filter((s) => visibleSignals.includes(s))
                  .map((signal) => (
                    <SignalItem
                      key={signal.id}
                      signal={signal}
                      expanded={expandedSignalId === signal.id}
                      onExpand={() =>
                        setExpandedSignalId(expandedSignalId === signal.id ? null : signal.id)
                      }
                      onDismiss={
                        onDismissSignal
                          ? () => onDismissSignal(signal.id, signal.validUntil)
                          : undefined
                      }
                      onMute={onMuteSignalType ? () => onMuteSignalType(signal.type) : undefined}
                    />
                  ))}
              </div>
            )}

            {/* Disease Risk signals */}
            {grouped.disease_risk.filter((s) => visibleSignals.includes(s)).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Leaf className="h-3 w-3" />
                  Disease Risk
                </h4>
                {grouped.disease_risk
                  .filter((s) => visibleSignals.includes(s))
                  .map((signal) => (
                    <SignalItem
                      key={signal.id}
                      signal={signal}
                      expanded={expandedSignalId === signal.id}
                      onExpand={() =>
                        setExpandedSignalId(expandedSignalId === signal.id ? null : signal.id)
                      }
                      onDismiss={
                        onDismissSignal
                          ? () => onDismissSignal(signal.id, signal.validUntil)
                          : undefined
                      }
                      onMute={onMuteSignalType ? () => onMuteSignalType(signal.type) : undefined}
                    />
                  ))}
              </div>
            )}

            {/* Pest Pressure signals */}
            {grouped.pest_pressure.filter((s) => visibleSignals.includes(s)).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Bug className="h-3 w-3" />
                  Pest Pressure
                </h4>
                {grouped.pest_pressure
                  .filter((s) => visibleSignals.includes(s))
                  .map((signal) => (
                    <SignalItem
                      key={signal.id}
                      signal={signal}
                      expanded={expandedSignalId === signal.id}
                      onExpand={() =>
                        setExpandedSignalId(expandedSignalId === signal.id ? null : signal.id)
                      }
                      onDismiss={
                        onDismissSignal
                          ? () => onDismissSignal(signal.id, signal.validUntil)
                          : undefined
                      }
                      onMute={onMuteSignalType ? () => onMuteSignalType(signal.type) : undefined}
                    />
                  ))}
              </div>
            )}
          </>
        )}

        {/* Show more/less button */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show {hiddenCount} more signal{hiddenCount !== 1 ? 's' : ''}
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// COMPACT BANNER COMPONENT
// =============================================================================

export function LocalSignalsBanner({ signals }: { signals: LocalSignal[] }) {
  const urgentSignals = signals.filter((s) => s.severity === 'critical' || s.severity === 'high');

  if (urgentSignals.length === 0) return null;

  const signal = urgentSignals[0];
  const theme = getAlertTheme(signal.type);
  const Icon = getSignalIcon(signal.type);

  return (
    <div className={`rounded-lg border border-l-4 ${theme.borderColor} ${theme.bgColor} p-3 flex items-center gap-3`}>
      <div className="p-1.5 rounded-full bg-white/60">
        <Icon className={`h-5 w-5 ${theme.iconColor} flex-shrink-0`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${theme.accentColor} truncate`}>{signal.title}</p>
        <p className={`text-xs ${theme.accentColor} opacity-75 truncate`}>{signal.advice}</p>
      </div>
      {urgentSignals.length > 1 && (
        <Badge variant="destructive" className="flex-shrink-0">
          +{urgentSignals.length - 1}
        </Badge>
      )}
    </div>
  );
}
