import React from 'react';
import { Thermometer, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { PlantSpecies } from '../../lib/grow/species';
import { estimateHardinessZone, isZoneCompatible, zoneToMinTemp } from '../../lib/grow/formatters';

// RHS hardiness H1a–H7, ordered coldest-tolerant to warmest-only
const RHS_ZONES = ['H1a', 'H1b', 'H1c', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7'] as const;
type RhsZone = typeof RHS_ZONES[number];

const RHS_DESCRIPTIONS: Record<RhsZone, string> = {
  H1a: 'Heated glasshouse (>15°C)',
  H1b: 'Heated glasshouse (10–15°C)',
  H1c: 'Heated glasshouse (5–10°C)',
  H2: 'Cool/unheated glasshouse (1–5°C)',
  H3: 'Half-hardy: frost-free to –5°C',
  H4: 'Hardy: survives –10°C',
  H5: 'Hardy: survives –15°C',
  H6: 'Hardy: survives –20°C',
  H7: 'Very hardy: survives below –20°C',
};

// Rough USDA equivalents for secondary display
const RHS_TO_USDA_MIN: Record<RhsZone, number> = {
  H1a: 12, H1b: 11, H1c: 10, H2: 9, H3: 8, H4: 7, H5: 6, H6: 5, H7: 4,
};
const RHS_TO_USDA_MAX: Record<RhsZone, number> = {
  H1a: 13, H1b: 12, H1c: 11, H2: 10, H3: 9, H4: 8, H5: 7, H6: 6, H7: 5,
};

function rhsZoneIndex(zone: string): number {
  return RHS_ZONES.indexOf(zone as RhsZone);
}

function getRhsZoneColor(zone: RhsZone): string {
  const colors: Record<RhsZone, string> = {
    H1a: 'bg-red-600',
    H1b: 'bg-red-500',
    H1c: 'bg-orange-500',
    H2: 'bg-amber-400',
    H3: 'bg-yellow-400',
    H4: 'bg-lime-500',
    H5: 'bg-green-500',
    H6: 'bg-teal-500',
    H7: 'bg-blue-500',
  };
  return colors[zone] || 'bg-gray-300';
}

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

export function HardinessZoneBar({ species, userLat }: HardinessZoneBarProps) {
  const hasRhs = !!species.rhsHardinessMin;
  const hasUsda = species.hardinessMin !== null;

  if (!hasRhs && !hasUsda) return null;

  // RHS mode — primary display when data is present
  if (hasRhs) {
    const rhsMin = species.rhsHardinessMin as RhsZone;
    const rhsMax = (species.rhsHardinessMax ?? species.rhsHardinessMin) as RhsZone;
    const minIdx = rhsZoneIndex(rhsMin);
    const maxIdx = rhsZoneIndex(rhsMax);

    const usdaMin = RHS_TO_USDA_MIN[rhsMin];
    const usdaMax = RHS_TO_USDA_MAX[rhsMax];
    const usdaLabel = usdaMin === usdaMax ? `USDA ${usdaMin}` : `USDA ${usdaMin}–${usdaMax}`;
    const rhsLabel = rhsMin === rhsMax ? `RHS ${rhsMin}` : `RHS ${rhsMin}–${rhsMax}`;

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-red-500" />
            Hardiness Zones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>H1a (tender)</span>
              <span>H7 (very hardy)</span>
            </div>
            <div className="flex gap-px">
              {RHS_ZONES.map((zone, idx) => {
                const inRange = idx >= minIdx && idx <= maxIdx;
                return (
                  <div
                    key={zone}
                    className={`relative h-6 flex-1 rounded-sm transition-all ${
                      inRange ? getRhsZoneColor(zone) : 'bg-gray-100'
                    }`}
                    title={`${zone}: ${RHS_DESCRIPTIONS[zone]}`}
                  >
                    <span
                      className={`absolute inset-0 flex items-center justify-center text-[9px] font-medium ${
                        inRange ? 'text-white' : 'text-gray-400'
                      } hidden sm:flex`}
                    >
                      {zone}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-center">
            <Badge variant="secondary" className="text-xs">{rhsLabel}</Badge>
            <p className="text-xs text-muted-foreground mt-1">{usdaLabel} equivalent</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // USDA fallback — shown when RHS data not yet populated
  const minZone = species.hardinessMin!;
  const maxZone = species.hardinessMax ?? minZone;
  const userZone = userLat ? estimateHardinessZone(userLat) : null;
  const compatibility = userZone ? isZoneCompatible(userZone, minZone, maxZone) : null;
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
                  <span
                    className={`absolute inset-0 flex items-center justify-center text-[9px] font-medium ${
                      inRange ? 'text-white' : 'text-gray-400'
                    } hidden sm:flex`}
                  >
                    {zone}
                  </span>
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
        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            {minZone === maxZone ? `Zone ${minZone}` : `Zones ${minZone}-${maxZone}`}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            Minimum temperature: {zoneToMinTemp(minZone)}
          </p>
        </div>
        {compatibility && (
          <div
            className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
              compatibility.compatible ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {compatibility.compatible ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
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

export function HardinessZoneBadge({
  species,
  userLat,
}: {
  species: PlantSpecies;
  userLat?: number | null;
}) {
  // RHS mode — preferred when available
  if (species.rhsHardinessMin) {
    const rhsMin = species.rhsHardinessMin;
    const rhsMax = species.rhsHardinessMax ?? rhsMin;
    const label = rhsMin === rhsMax ? `RHS ${rhsMin}` : `RHS ${rhsMin}–${rhsMax}`;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
        <Thermometer className="h-3 w-3" />
        {label}
      </span>
    );
  }

  // USDA fallback
  if (species.hardinessMin === null) return null;

  const minZone = species.hardinessMin;
  const maxZone = species.hardinessMax ?? minZone;
  const userZone = userLat ? estimateHardinessZone(userLat) : null;
  const compatibility = userZone ? isZoneCompatible(userZone, minZone, maxZone) : null;
  const label = maxZone !== minZone ? `Zone ${minZone}–${maxZone}` : `Zone ${minZone}`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        compatibility?.compatible === false ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
      }`}
    >
      <Thermometer className="h-3 w-3" />
      {label}
      {compatibility?.compatible === false && <X className="h-3 w-3" />}
      {compatibility?.compatible === true && <Check className="h-3 w-3" />}
    </span>
  );
}
