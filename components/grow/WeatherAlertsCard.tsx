/**
 * WeatherAlertsCard Component
 *
 * Displays weather-based alerts including frost, heat, wind,
 * and pest/disease risks based on current conditions.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  AlertTriangle,
  Snowflake,
  Thermometer,
  Wind,
  CloudLightning,
  Bug,
  CloudFog,
  Droplets,
  Sun,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import { type WeatherAlert, getAlertColor, categorizeAlerts } from '../../hooks/useWeatherTasks';

interface WeatherAlertsCardProps {
  alerts: WeatherAlert[];
  compact?: boolean;
}

function getAlertIconComponent(type: string) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    frost: Snowflake,
    heat: Thermometer,
    wind: Wind,
    wind_desiccation: Wind,
    storm: CloudLightning,
    late_blight: Bug,
    powdery_mildew: CloudFog,
    botrytis: CloudFog,
    aphids: Bug,
    slugs: Bug,
    drought: Sun,
    rain: Droplets,
  };
  return icons[type] || AlertTriangle;
}

function AlertItem({ alert, expanded }: { alert: WeatherAlert; expanded: boolean }) {
  const colors = getAlertColor(alert.severity);
  const Icon = getAlertIconComponent(alert.type);

  return (
    <div className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${colors.bg}`}>
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`font-medium text-sm ${colors.text}`}>{alert.title}</h4>
            <Badge
              variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {alert.severity}
            </Badge>
          </div>
          {expanded && (
            <>
              <p className={`text-sm mt-1 ${colors.text} opacity-90`}>{alert.message}</p>
              <div className={`mt-2 p-2 rounded ${alert.severity === 'critical' ? 'bg-red-100' : 'bg-white/50'}`}>
                <p className="text-xs font-medium flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Action:
                </p>
                <p className={`text-xs ${colors.text} opacity-80 mt-0.5`}>{alert.suggestedAction}</p>
              </div>
              {alert.affectedPlantIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {alert.affectedPlantIds.length} plant{alert.affectedPlantIds.length !== 1 ? 's' : ''} affected
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function WeatherAlertsCard({ alerts, compact = false }: WeatherAlertsCardProps) {
  const [showAll, setShowAll] = React.useState(false);

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">All Clear</p>
              <p className="text-sm text-green-700">No weather or pest/disease alerts for your garden right now.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { weather, pestDisease } = categorizeAlerts(alerts);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  // Show critical alerts always, others based on showAll
  const visibleAlerts = compact
    ? criticalAlerts.slice(0, 2)
    : showAll
      ? alerts
      : [...criticalAlerts, ...warningAlerts.slice(0, 2)];

  const hiddenCount = alerts.length - visibleAlerts.length;

  return (
    <Card className={criticalAlerts.length > 0 ? 'border-red-200' : warningAlerts.length > 0 ? 'border-amber-200' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${criticalAlerts.length > 0 ? 'text-red-500' : 'text-amber-500'}`} />
            Weather & Garden Alerts
          </div>
          <div className="flex items-center gap-2">
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive">{criticalAlerts.length} Critical</Badge>
            )}
            {warningAlerts.length > 0 && (
              <Badge variant="secondary">{warningAlerts.length} Warning</Badge>
            )}
            {infoAlerts.length > 0 && (
              <Badge variant="outline">{infoAlerts.length} Info</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Weather Alerts Section */}
        {weather.length > 0 && !compact && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weather Alerts</h4>
            {weather.filter(a => visibleAlerts.includes(a)).map((alert, idx) => (
              <AlertItem key={`weather-${idx}`} alert={alert} expanded={!compact} />
            ))}
          </div>
        )}

        {/* Pest/Disease Alerts Section */}
        {pestDisease.length > 0 && !compact && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pest & Disease Risks</h4>
            {pestDisease.filter(a => visibleAlerts.includes(a)).map((alert, idx) => (
              <AlertItem key={`pest-${idx}`} alert={alert} expanded={!compact} />
            ))}
          </div>
        )}

        {/* Compact view - just show all in order */}
        {compact && visibleAlerts.map((alert, idx) => (
          <AlertItem key={`compact-${idx}`} alert={alert} expanded={false} />
        ))}

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
                Show {hiddenCount} more alert{hiddenCount !== 1 ? 's' : ''}
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact alert banner for Homepage
 */
export function AlertBanner({ alerts }: { alerts: WeatherAlert[] }) {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  if (criticalAlerts.length === 0) return null;

  const alert = criticalAlerts[0];
  const colors = getAlertColor(alert.severity);
  const Icon = getAlertIconComponent(alert.type);

  return (
    <div className={`rounded-lg border p-3 ${colors.bg} ${colors.border} flex items-center gap-3`}>
      <Icon className={`h-5 w-5 ${colors.icon} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${colors.text} truncate`}>{alert.title}</p>
        <p className={`text-xs ${colors.text} opacity-80 truncate`}>{alert.suggestedAction}</p>
      </div>
      {criticalAlerts.length > 1 && (
        <Badge variant="destructive" className="flex-shrink-0">+{criticalAlerts.length - 1}</Badge>
      )}
    </div>
  );
}
