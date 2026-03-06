import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import Link from 'next/link';
import { X, ChevronDown, ChevronRight, Snowflake, Thermometer, Wind, CloudLightning, CloudRain, Sun, AlertTriangle, Snail, Bug } from 'lucide-react';
import { getSignalIcon, getAlertTheme } from '../LocalSignalsCard';
import type { AlertTheme } from '../LocalSignalsCard';
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
    // Weather engine types
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

/** Category-specific entrance animation */
function getEntranceVariant(alertType: string) {
  if (['frost_damage', 'frost'].includes(alertType)) {
    return { initial: { opacity: 0, y: -12, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 } };
  }
  if (['wind_damage', 'wind', 'wind_desiccation', 'storm'].includes(alertType)) {
    return { initial: { opacity: 0, x: -16 }, animate: { opacity: 1, x: 0 } };
  }
  if (['heat_stress', 'heat', 'drought_stress', 'drought'].includes(alertType)) {
    return { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } };
  }
  // Default: slide down
  return { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 } };
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

  // Filter to high/critical signals
  const urgentSignals = signals.filter(
    s => (s.severity === 'high' || s.severity === 'critical') && !dismissed.has(s.id)
  );

  // Filter to critical weather alerts, dedup against signals by title
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

  if (items.length === 0) return null;

  const handleDismiss = useCallback((item: UrgentItem) => {
    setDismissed(prev => new Set(prev).add(item.id));
    if (item.source === 'signal' && item.expiresAt && onDismissSignal) {
      onDismissSignal(item.id, item.expiresAt);
    }
  }, [onDismissSignal]);

  const primary = items[0];
  const remaining = items.slice(1);
  const primaryEntrance = getEntranceVariant(primary.alertType);

  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      className="space-y-2"
      initial={primaryEntrance.initial}
      animate={primaryEntrance.animate}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <SwipeableAlertCard
        item={primary}
        onDismiss={() => handleDismiss(primary)}
      />

      {remaining.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground opacity-70 hover:opacity-100 ml-1"
        >
          <ChevronDown size={12} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
          +{remaining.length} more {remaining.length === 1 ? 'alert' : 'alerts'}
        </button>
      )}

      <AnimatePresence>
        {expanded && remaining.map((item, i) => {
          const entrance = getEntranceVariant(item.alertType);
          return (
            <motion.div
              key={item.id}
              initial={entrance.initial}
              animate={entrance.animate}
              exit={{ opacity: 0, x: 80 }}
              transition={{ duration: 0.25, delay: i * 0.06 }}
            >
              <SwipeableAlertCard
                item={item}
                onDismiss={() => handleDismiss(item)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

/** Swipe-to-dismiss wrapper */
function SwipeableAlertCard({
  item,
  onDismiss,
}: {
  item: UrgentItem;
  onDismiss: () => void;
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-120, 0, 120], [0.3, 1, 0.3]);
  const theme = getAlertTheme(item.alertType);
  const Icon = item.icon;
  const guidanceSlug = getGuidanceSlug(item.alertType);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onDismiss();
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.4}
      onDragEnd={handleDragEnd}
      style={{ x, opacity }}
      className="touch-pan-y"
    >
      <div className={`rounded-xl border border-l-4 ${theme.borderColor} ${theme.bgColor} p-3`}>
        <div className="flex items-start gap-3">
          {/* Animated icon */}
          <motion.div
            className="p-1.5 rounded-full bg-white/60"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
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
      </div>
    </motion.div>
  );
}
