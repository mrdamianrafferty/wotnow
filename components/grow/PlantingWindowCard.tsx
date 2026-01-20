/**
 * PlantingWindowCard Component
 *
 * Shows planting windows based on soil temperature.
 * Displays which plants can be sown now vs those that need warmer soil.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Sprout,
  Thermometer,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { type PlantingWindow } from '../../hooks/useWeatherTasks';

interface PlantingWindowCardProps {
  plantingWindows: PlantingWindow[];
  currentSoilTemp: number;
}

function getPlantingStatus(window: PlantingWindow) {
  if (window.canPlantNow) {
    return {
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      badge: 'default' as const,
      badgeText: 'Ready',
    };
  }
  if (window.daysUntilReady && window.daysUntilReady <= 7) {
    return {
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badge: 'secondary' as const,
      badgeText: `${window.daysUntilReady}d`,
    };
  }
  return {
    icon: XCircle,
    color: 'text-gray-400',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badge: 'outline' as const,
    badgeText: 'Wait',
  };
}

function formatPlantName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function PlantingWindowCard({ plantingWindows, currentSoilTemp }: PlantingWindowCardProps) {
  if (!plantingWindows || plantingWindows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-green-500" />
            Planting Windows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Sprout className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Add plants to your garden to see planting windows</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const readyToPlant = plantingWindows.filter(w => w.canPlantNow);
  const waitingToPlant = plantingWindows.filter(w => !w.canPlantNow);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-green-500" />
            Planting Windows
          </div>
          <div className="flex items-center gap-2 text-sm font-normal">
            <Thermometer className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Soil:</span>
            <span className="font-medium">{Math.round(currentSoilTemp)}°C</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ready to plant section */}
        {readyToPlant.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-green-700 uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Ready to Sow ({readyToPlant.length})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {readyToPlant.map((window, idx) => {
                const status = getPlantingStatus(window);
                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 ${status.bg} ${status.border}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {formatPlantName(window.plantSlug)}
                      </span>
                      <Badge variant={status.badge} className="text-xs">
                        {status.badgeText}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Needs {window.soilTempRequired}°C (now {Math.round(window.currentSoilTemp)}°C)
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Waiting section */}
        {waitingToPlant.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Waiting for Warmer Soil ({waitingToPlant.length})
            </p>
            <div className="space-y-2">
              {waitingToPlant.slice(0, 5).map((window, idx) => {
                const status = getPlantingStatus(window);
                const StatusIcon = status.icon;
                const tempDiff = window.soilTempRequired - window.currentSoilTemp;

                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 ${status.bg} ${status.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <StatusIcon className={`h-5 w-5 ${status.color} mt-0.5`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {formatPlantName(window.plantSlug)}
                          </span>
                          <Badge variant={status.badge} className="text-xs">
                            {window.daysUntilReady ? `~${window.daysUntilReady}d` : 'Wait'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {window.reason}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3 text-blue-500" />
                            <span>Now: {Math.round(window.currentSoilTemp)}°C</span>
                          </div>
                          <span className="text-muted-foreground">→</span>
                          <div className="flex items-center gap-1">
                            <Thermometer className="h-3 w-3 text-orange-500" />
                            <span>Needs: {window.soilTempRequired}°C</span>
                          </div>
                          <span className="text-muted-foreground">(+{tempDiff.toFixed(0)}°C)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {waitingToPlant.length > 5 && (
                <p className="text-xs text-center text-muted-foreground">
                  +{waitingToPlant.length - 5} more plants waiting
                </p>
              )}
            </div>
          </div>
        )}

        {/* Soil temperature insight */}
        <div className="rounded-lg bg-muted/30 p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Thermometer className="h-4 w-4" />
            <span className="font-medium">Soil Temperature Guide</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>&lt;10°C: Hardy crops only</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>10-15°C: Most vegetables</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>15-20°C: Warm season crops</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>&gt;20°C: Heat-loving plants</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
