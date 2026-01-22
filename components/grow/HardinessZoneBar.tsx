import React from 'react';
import { Thermometer, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { PlantSpecies } from '../../lib/grow/species';
import { estimateHardinessZone, isZoneCompatible, zoneToMinTemp } from '../../lib/grow/formatters';

interface HardinessZoneBarProps {
  species: PlantSpecies;
  userLat?: number | null;
  userLon?: number | null;
}

// USDA zones range from 1-13
const ZONE_MIN = 1;
const ZONE_MAX = 13;

function getZoneColor(zone: number): string {
  // Color gradient from cold (blue) to hot (red)
  const colors: Record<number, string> = {
    1: 'bg-indigo-600',
    2: 'bg-indigo-500',
    3: 'bg-blue-500',
    4: 'bg-blue-400',
    5: 'bg-cyan-500',
    6: 'bg-teal-500',
    7: 'bg-green-500',
    8: 'bg-lime-500',
    9: 'bg-yellow-500',
    10: 'bg-amber-500',
    11: 'bg-orange-500',
    12: 'bg-red-500',
    13: 'bg-red-600',
  };
  return colors[zone] || 'bg-gray-300';
}

/**
 * Visual USDA hardiness zone range indicator.
 * Highlights the plant's growing range on a 1-13 zone scale.
 * Automatically calculates user's zone from latitude if provided.
 */
export function HardinessZoneBar({ species, userLat }: HardinessZoneBarProps) {
  // Don't render if no hardiness data
  if (species.hardinessMin === null) {
    return null;
  }

  const minZone = species.hardinessMin;
  const maxZone = species.hardinessMax ?? minZone;

  // Calculate user's zone from latitude
  const userZone = userLat ? estimateHardinessZone(userLat) : null;
  const compatibility = userZone
    ? isZoneCompatible(userZone, minZone, maxZone)
    : null;

  const zones = Array.from({ length: ZONE_MAX - ZONE_MIN + 1 }, (_, i) => ZONE_MIN + i);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-red-500" />
          Hardiness Zones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zone bar visualization */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Cold</span>
            <span>Warm</span>
          </div>
          <div className="flex gap-px">
            {zones.map((zone) => {
              const inRange = zone >= minZone && zone <= maxZone;
              const isUserZone = zone === userZone;

              return (
                <div
                  key={zone}
                  className={`relative h-6 flex-1 rounded-sm transition-all ${
                    inRange ? getZoneColor(zone) : 'bg-gray-100'
                  } ${isUserZone ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                  title={`Zone ${zone}: ${zoneToMinTemp(zone)} minimum${isUserZone ? ' (Your zone)' : ''}`}
                >
                  {/* Zone number */}
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-[9px] font-medium ${
                      inRange ? 'text-white' : 'text-gray-400'
                    } hidden sm:flex`}
                  >
                    {zone}
                  </span>
                  {/* User zone indicator */}
                  {isUserZone && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="text-[9px] font-bold text-primary">You</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>1</span>
            <span className="hidden sm:block">7</span>
            <span>13</span>
          </div>
        </div>

        {/* Zone range label */}
        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            {minZone === maxZone ? `Zone ${minZone}` : `Zones ${minZone}-${maxZone}`}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            Minimum temperature: {zoneToMinTemp(minZone)}
          </p>
        </div>

        {/* User compatibility */}
        {compatibility && (
          <div
            className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
              compatibility.compatible
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {compatibility.compatible ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{compatibility.message}</span>
          </div>
        )}

        {!userZone && (
          <p className="text-xs text-muted-foreground text-center">
            Set your location to see zone compatibility
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact zone badge for use in other components.
 */
export function HardinessZoneBadge({
  species,
  userLat,
}: {
  species: PlantSpecies;
  userLat?: number | null;
}) {
  if (species.hardinessMin === null) return null;

  const minZone = species.hardinessMin;
  const maxZone = species.hardinessMax ?? minZone;
  const userZone = userLat ? estimateHardinessZone(userLat) : null;
  const compatibility = userZone
    ? isZoneCompatible(userZone, minZone, maxZone)
    : null;

  const label = maxZone !== minZone
    ? `Zone ${minZone}-${maxZone}`
    : `Zone ${minZone}`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        compatibility?.compatible === false
          ? 'bg-red-100 text-red-700'
          : 'bg-blue-100 text-blue-700'
      }`}
    >
      <Thermometer className="h-3 w-3" />
      {label}
      {compatibility?.compatible === false && <X className="h-3 w-3" />}
      {compatibility?.compatible === true && <Check className="h-3 w-3" />}
    </span>
  );
}
