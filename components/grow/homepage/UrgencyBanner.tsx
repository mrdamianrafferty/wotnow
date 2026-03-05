import React, { useState } from 'react';
import { X, ChevronDown, Snowflake, Thermometer, Wind, CloudLightning, CloudRain, Sun, AlertTriangle } from 'lucide-react';
import { SEVERITY_COLORS, getSignalIcon } from '../LocalSignalsCard';
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
    })),
    ...urgentAlerts.map(a => ({
      id: `weather-${a.type}-${a.forecastDate}`,
      title: a.title,
      description: a.suggestedAction || a.message,
      severity: 'critical' as const,
      icon: WEATHER_ALERT_ICONS[a.type] || AlertTriangle,
      source: 'weather' as const,
    })),
  ];

  if (items.length === 0) return null;

  const primary = items[0];
  const remaining = items.slice(1);
  const colors = SEVERITY_COLORS[primary.severity];
  const PrimaryIcon = primary.icon;

  const handleDismiss = (item: UrgentItem) => {
    setDismissed(prev => new Set(prev).add(item.id));
    if (item.source === 'signal' && item.expiresAt && onDismissSignal) {
      onDismissSignal(item.id, item.expiresAt);
    }
  };

  return (
    <div role="alert" aria-live="assertive" className="space-y-2">
      <div className={`rounded-xl border p-3 ${colors.bg} ${colors.border}`}>
        <div className="flex items-start gap-3">
          <PrimaryIcon className={`mt-0.5 h-5 w-5 shrink-0 ${colors.text}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${colors.text}`}>{primary.title}</p>
            <p className={`text-xs mt-0.5 ${colors.text} opacity-80`}>{primary.description}</p>
          </div>
          <button
            onClick={() => handleDismiss(primary)}
            className={`shrink-0 p-1 rounded-md hover:bg-black/5 ${colors.text}`}
            aria-label="Dismiss alert"
          >
            <X size={14} />
          </button>
        </div>

        {remaining.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`mt-2 flex items-center gap-1 text-xs font-medium ${colors.text} opacity-70 hover:opacity-100`}
          >
            <ChevronDown size={12} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
            +{remaining.length} more {remaining.length === 1 ? 'alert' : 'alerts'}
          </button>
        )}
      </div>

      {expanded && remaining.map(item => {
        const itemColors = SEVERITY_COLORS[item.severity];
        const ItemIcon = item.icon;
        return (
          <div key={item.id} className={`rounded-xl border p-3 ${itemColors.bg} ${itemColors.border}`}>
            <div className="flex items-start gap-3">
              <ItemIcon className={`mt-0.5 h-5 w-5 shrink-0 ${itemColors.text}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${itemColors.text}`}>{item.title}</p>
                <p className={`text-xs mt-0.5 ${itemColors.text} opacity-80`}>{item.description}</p>
              </div>
              <button
                onClick={() => handleDismiss(item)}
                className={`shrink-0 p-1 rounded-md hover:bg-black/5 ${itemColors.text}`}
                aria-label="Dismiss alert"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
