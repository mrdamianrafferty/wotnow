import React from 'react';
import { Thermometer } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { PlantSpecies } from '../../lib/grow/species';

interface HardinessZoneBarProps {
  species: Pick<PlantSpecies, 'hardinessMin' | 'hardinessMax'>;
  userZone?: number;
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
 * Optionally shows if the user's zone falls within the range.
 */
export function HardinessZoneBar({ species, userZone }: HardinessZoneBarProps) {
  const { hardinessMin, hardinessMax } = species;
  
  if (hardinessMin === null || hardinessMin === undefined) {
    return null;
  }

  const minZone = hardinessMin;
  const maxZone = hardinessMax ?? hardinessMin;
  const userInRange = userZone !== undefined && userZone >= minZone && userZone <= maxZone;

  const zones = Array.from({ length: ZONE_MAX - ZONE_MIN + 1 }, (_, i) => ZONE_MIN + i);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Thermometer className="h-4 w-4 text-orange-500" />
          Hardiness Zones
        </div>
        <Badge variant="secondary" className="text-xs">
          {minZone === maxZone ? `Zone ${minZone}` : `Zones ${minZone}-${maxZone}`}
        </Badge>
      </div>
      
      {/* Zone bar visualization */}
      <div className="flex gap-px">
        {zones.map((zone) => {
          const inRange = zone >= minZone && zone <= maxZone;
          const isUserZone = zone === userZone;
          
          return (
            <div
              key={zone}
              className={`relative h-4 flex-1 rounded-sm transition-all ${
                inRange ? getZoneColor(zone) : 'bg-gray-100'
              } ${isUserZone ? 'ring-2 ring-offset-1 ring-black' : ''}`}
              title={`Zone ${zone}${isUserZone ? ' (Your zone)' : ''}`}
            >
              {/* Show zone numbers on larger screens */}
              <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-medium ${
                inRange ? 'text-white' : 'text-gray-400'
              } hidden sm:flex`}>
                {zone}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex justify-between text-[10px] text-gray-500 px-1">
        <span>Coldest (1)</span>
        <span>Warmest (13)</span>
      </div>
      
      {/* User zone indicator */}
      {userZone !== undefined && (
        <p className={`text-xs ${userInRange ? 'text-green-600' : 'text-amber-600'}`}>
          {userInRange 
            ? `✓ Your zone (${userZone}) is suitable for this plant`
            : `⚠ Your zone (${userZone}) may not be ideal`}
        </p>
      )}
    </div>
  );
}
