import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useReducedMotion, PanInfo, type TargetAndTransition, type Transition } from 'framer-motion';
import Link from 'next/link';
import { X, ChevronDown, ChevronRight, Snowflake, Thermometer, Wind, CloudLightning, CloudRain, Sun, AlertTriangle, Snail, Bug } from 'lucide-react';
import { getSignalIcon, getAlertTheme } from '../LocalSignalsCard';
import type { LocalSignal } from '../../../lib/grow/localSignals';
import type { WeatherAlert } from '../../../hooks/useWeatherTasks';

const WEATHER_ALERT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  frost: Snowflake,
  heat: Thermometer,
  wind: Wind,
  storm: CloudLightning,
  rain: CloudRain,
  drought: Sun,
  wind_desiccation: Wind,
  slugs: Snail,
  aphids: Bug,
};

/** Classify alert type into a motion category */
function getAlertCategory(alertType: string): 'frost' | 'wind' | 'heat' | 'pest' | 'disease' | 'default' {
  if (['frost_damage', 'frost'].includes(alertType)) return 'frost';
  if (['wind_damage', 'wind', 'wind_desiccation', 'storm'].includes(alertType)) return 'wind';
  if (['heat_stress', 'heat', 'drought_stress', 'drought'].includes(alertType)) return 'heat';
  if (['slug_activity', 'slugs', 'aphid_conditions', 'aphids', 'caterpillar_conditions'].includes(alertType)) return 'pest';
  if (['late_blight_risk', 'late_blight', 'powdery_mildew_risk', 'powdery_mildew', 'botrytis_risk', 'botrytis', 'rust_risk', 'rust'].includes(alertType)) return 'disease';
  return 'default';
}

/** Category-specific entrance animation */
function getEntranceVariant(alertType: string) {
  const cat = getAlertCategory(alertType);
  switch (cat) {
    case 'frost':
      // Crystallise into view
      return { initial: { opacity: 0, scale: 0.92, filter: 'blur(4px)' }, animate: { opacity: 1, scale: 1, filter: 'blur(0px)' } };
    case 'wind':
      // Blow in from the side
      return { initial: { opacity: 0, x: -24 }, animate: { opacity: 1, x: 0 } };
    case 'heat':
      // Swell into view
      return { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } };
    case 'pest':
      // Creep up from below
      return { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };
    case 'disease':
      // Spread outward from centre
      return { initial: { opacity: 0, scale: 0.9, filter: 'blur(2px)' }, animate: { opacity: 1, scale: 1, filter: 'blur(0px)' } };
    default:
      return { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 } };
  }
}

/** Category-specific exit animation */
function getExitVariant(alertType: string) {
  const cat = getAlertCategory(alertType);
  switch (cat) {
    case 'frost':
      // Soften and fade
      return { opacity: 0, scale: 0.95, filter: 'blur(6px)' };
    case 'wind':
      // Blow off-screen
      return { opacity: 0, x: 200 };
    case 'heat':
      // Fade and shrink
      return { opacity: 0, scale: 0.9 };
    case 'pest':
      // Slide down and away
      return { opacity: 0, y: 24 };
    case 'disease':
      // Fade and blur away
      return { opacity: 0, scale: 0.92, filter: 'blur(4px)' };
    default:
      return { opacity: 0, x: 80 };
  }
}

/** Map alert types to guidance page slugs */
function getGuidanceSlug(alertType: string): string | null {
  const map: Record<string, string> = {
    slug_activity: 'slug_activity',
    aphid_conditions: 'aphid_conditions',
    caterpillar_conditions: 'caterpillar_conditions',
    late_blight_risk: 'late_blight_risk',
    powdery_mildew_risk: 'powdery_mildew_risk',
    botrytis_risk: 'botrytis_risk',
    rust_risk: 'rust_risk',
    frost_damage: 'frost_damage',
    wind_damage: 'wind_damage',
    heat_stress: 'heat_stress',
    drought_stress: 'drought_stress',
    frost: 'frost_damage',
    heat: 'heat_stress',
    wind: 'wind_damage',
    drought: 'drought_stress',
    slugs: 'slug_activity',
    aphids: 'aphid_conditions',
    late_blight: 'late_blight_risk',
    powdery_mildew: 'powdery_mildew_risk',
    botrytis: 'botrytis_risk',
    wind_desiccation: 'wind_damage',
    storm: 'wind_damage',
    rain: 'late_blight_risk',
  };
  return map[alertType] || null;
}

/** Per-type idle Framer Motion animation for the card wrapper */
function getIdleAnimation(alertType: string): { animate: TargetAndTransition; transition: Transition } | null {
  const cat = getAlertCategory(alertType);
  switch (cat) {
    case 'frost':
      return {
        animate: { boxShadow: ['inset 0 0 0 0 rgba(147,197,253,0)', 'inset 0 0 20px 4px rgba(147,197,253,0.25)', 'inset 0 0 0 0 rgba(147,197,253,0)'] },
        transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'wind':
      return {
        animate: { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] },
        transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'heat':
      return {
        animate: { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] },
        transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'pest':
      return {
        animate: { backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] },
        transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'disease':
      return {
        animate: { boxShadow: ['inset 0 0 0 0 rgba(120,113,108,0)', 'inset 0 0 20px 4px rgba(120,113,108,0.2)', 'inset 0 0 0 0 rgba(120,113,108,0)'] },
        transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
      };
    default:
      return null;
  }
}

/** Inline style for gradient-based idle animations (wind/heat/pest) */
function getIdleStyle(alertType: string): React.CSSProperties | undefined {
  const cat = getAlertCategory(alertType);
  switch (cat) {
    case 'wind':
      return { backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.12) 25%, transparent 50%, rgba(148,163,184,0.12) 75%, transparent 100%)' };
    case 'heat':
      return { backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(251,146,60,0.15) 30%, transparent 50%, rgba(251,146,60,0.15) 70%, transparent 100%)' };
    case 'pest':
      return { backgroundSize: '200% 200%', backgroundImage: 'linear-gradient(135deg, transparent 0%, rgba(101,163,13,0.12) 25%, transparent 50%, rgba(101,163,13,0.12) 75%, transparent 100%)' };
    default:
      return undefined;
  }
}

interface UrgencyBannerProps {
  signals: LocalSignal[];
  weatherAlerts: WeatherAlert[];
  onDismissSignal?: (signalId: string, expiresAt: string) => void;
}

type UrgentItem = {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'critical';
  icon: React.ComponentType<{ className?: string }>;
  source: 'signal' | 'weather';
  expiresAt?: string;
  alertType: string;
};

export function UrgencyBanner({ signals, weatherAlerts, onDismissSignal }: UrgencyBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const prefersReduced = useReducedMotion();

  const urgentSignals = signals.filter(
    s => (s.severity === 'high' || s.severity === 'critical') && !dismissed.has(s.id)
  );

  const signalTitles = new Set(urgentSignals.map(s => s.title.toLowerCase()));
  const urgentAlerts = weatherAlerts.filter(
    a => a.severity === 'critical' && !signalTitles.has(a.title.toLowerCase())
  );

  const items: UrgentItem[] = [
    ...urgentSignals.map(s => ({
      id: s.id,
      title: s.title,
      description: s.advice,
      severity: s.severity as 'high' | 'critical',
      icon: getSignalIcon(s.type),
      source: 'signal' as const,
      expiresAt: s.validUntil,
      alertType: s.type,
    })),
    ...urgentAlerts.map(a => ({
      id: `weather-${a.type}-${a.forecastDate}`,
      title: a.title,
      description: a.suggestedAction || a.message,
      severity: 'critical' as const,
      icon: WEATHER_ALERT_ICONS[a.type] || AlertTriangle,
      source: 'weather' as const,
      alertType: a.type,
    })),
  ];

  const handleDismiss = useCallback((item: UrgentItem) => {
    setDismissed(prev => new Set(prev).add(item.id));
    if (item.source === 'signal' && item.expiresAt && onDismissSignal) {
      onDismissSignal(item.id, item.expiresAt);
    }
  }, [onDismissSignal]);

  if (items.length === 0) return null;

  const primary = items[0];
  const remaining = items.slice(1);
  const primaryEntrance = getEntranceVariant(primary.alertType);
  const noMotion = { initial: {}, animate: {} };

  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      className="space-y-2"
      initial={prefersReduced ? noMotion.initial : primaryEntrance.initial}
      animate={prefersReduced ? noMotion.animate : primaryEntrance.animate}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <SwipeableAlertCard
        item={primary}
        onDismiss={() => handleDismiss(primary)}
        reducedMotion={!!prefersReduced}
      />

      {/* Stacked "+N more" with depth shadows */}
      {remaining.length > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="relative w-full"
        >
          {/* Stacked shadow layers */}
          {remaining.length >= 2 && (
            <div className="absolute inset-x-3 top-1 h-4 rounded-xl bg-black/[0.03] border border-black/[0.04]" />
          )}
          {remaining.length >= 1 && (
            <div className="absolute inset-x-1.5 top-0.5 h-4 rounded-xl bg-black/[0.05] border border-black/[0.06]" />
          )}
          <div className="relative flex items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground opacity-70 hover:opacity-100 transition-opacity">
            <ChevronDown size={12} />
            +{remaining.length} more {remaining.length === 1 ? 'alert' : 'alerts'}
          </div>
        </button>
      )}

      {/* Collapse button when expanded */}
      {remaining.length > 0 && expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground opacity-70 hover:opacity-100 ml-1"
        >
          <ChevronDown size={12} className="rotate-180 transition-transform" />
          Collapse
        </button>
      )}

      <AnimatePresence>
        {expanded && remaining.map((item, i) => {
          const entrance = getEntranceVariant(item.alertType);
          const exit = getExitVariant(item.alertType);
          return (
            <motion.div
              key={item.id}
              initial={prefersReduced ? {} : entrance.initial}
              animate={prefersReduced ? {} : entrance.animate}
              exit={prefersReduced ? { opacity: 0 } : exit}
              transition={{ duration: 0.3, delay: prefersReduced ? 0 : i * 0.06 }}
            >
              <SwipeableAlertCard
                item={item}
                onDismiss={() => handleDismiss(item)}
                reducedMotion={!!prefersReduced}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

/** Swipe-to-dismiss wrapper with per-type idle animation */
function SwipeableAlertCard({
  item,
  onDismiss,
  reducedMotion,
}: {
  item: UrgentItem;
  onDismiss: () => void;
  reducedMotion: boolean;
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-120, 0, 120], [0.3, 1, 0.3]);
  const theme = getAlertTheme(item.alertType);
  const Icon = item.icon;
  const guidanceSlug = getGuidanceSlug(item.alertType);
  const idleAnim = reducedMotion ? null : getIdleAnimation(item.alertType);
  const idleStyle = reducedMotion ? undefined : getIdleStyle(item.alertType);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onDismiss();
    }
  };

  return (
    <motion.div
      drag={reducedMotion ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.4}
      onDragEnd={handleDragEnd}
      style={reducedMotion ? undefined : { x, opacity }}
      className="touch-pan-y"
    >
      <motion.div
        className={`rounded-xl border border-l-4 ${theme.borderColor} ${theme.bgColor} p-3`}
        style={idleStyle}
        animate={idleAnim?.animate}
        transition={idleAnim?.transition}
      >
        <div className="flex items-start gap-3">
          {/* Animated icon — gentle breathe, respects reduced motion */}
          <motion.div
            className="p-1.5 rounded-full bg-white/60"
            animate={reducedMotion ? undefined : { scale: [1, 1.15, 1] }}
            transition={reducedMotion ? undefined : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon className={`h-5 w-5 shrink-0 ${theme.iconColor}`} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${theme.accentColor}`}>{item.title}</p>
            <p className={`text-xs mt-0.5 ${theme.accentColor} opacity-75`}>{item.description}</p>
            {guidanceSlug && (
              <Link
                href={`/grow/guidance/${guidanceSlug}`}
                className={`inline-flex items-center gap-0.5 text-xs font-medium mt-1.5 ${theme.iconColor} hover:underline`}
              >
                Learn more
                <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <button
            onClick={onDismiss}
            className={`shrink-0 p-1 rounded-md hover:bg-black/5 ${theme.accentColor} opacity-50 hover:opacity-100`}
            aria-label="Dismiss alert"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
