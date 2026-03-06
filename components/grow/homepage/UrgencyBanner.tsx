import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Snowflake, Thermometer, Wind, CloudLightning, CloudRain, Sun, AlertTriangle, Snail, Bug } from 'lucide-react';
import { SEVERITY_COLORS, getSignalIcon, getAlertTheme } from '../LocalSignalsCard';
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

  const primary = items[0];
  const remaining = items.slice(1);
  const theme = getAlertTheme(primary.alertType);
  const PrimaryIcon = primary.icon;

  const handleDismiss = (item: UrgentItem) => {
    setDismissed(prev => new Set(prev).add(item.id));
    if (item.source === 'signal' && item.expiresAt && onDismissSignal) {
      onDismissSignal(item.id, item.expiresAt);
    }
  };

  return (
    <motion.div
      role="alert"
      aria-live="assertive"
      className="space-y-2"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <AlertCard
        item={primary}
        theme={theme}
        Icon={PrimaryIcon}
        onDismiss={() => handleDismiss(primary)}
      />

      {remaining.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1 text-xs font-medium ${theme.accentColor} opacity-70 hover:opacity-100 ml-1`}
        >
          <ChevronDown size={12} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
          +{remaining.length} more {remaining.length === 1 ? 'alert' : 'alerts'}
        </button>
      )}

      <AnimatePresence>
        {expanded && remaining.map((item, i) => {
          const itemTheme = getAlertTheme(item.alertType);
          const ItemIcon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              <AlertCard
                item={item}
                theme={itemTheme}
                Icon={ItemIcon}
                onDismiss={() => handleDismiss(item)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

function AlertCard({
  item,
  theme,
  Icon,
  onDismiss,
}: {
  item: UrgentItem;
  theme: AlertTheme;
  Icon: React.ComponentType<{ className?: string }>;
  onDismiss: () => void;
}) {
  return (
    <div className={`rounded-xl border border-l-4 ${theme.borderColor} ${theme.bgColor} p-3`}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-full bg-white/60">
          <Icon className={`h-5 w-5 shrink-0 ${theme.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${theme.accentColor}`}>{item.title}</p>
          <p className={`text-xs mt-0.5 ${theme.accentColor} opacity-75`}>{item.description}</p>
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
  );
}
