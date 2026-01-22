import React from 'react';
import { Ruler, ArrowUpDown, TrendingUp, Wrench, Droplets, Thermometer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { PlantSpecies } from '../../lib/grow/species';
import {
  formatDimensions,
  formatGrowthRate,
  formatCareLevel,
  formatMaintenance,
  formatWatering,
  isZoneCompatible,
  estimateHardinessZone,
  type Dimension,
} from '../../lib/grow/formatters';

interface QuickFactsCardProps {
  species: PlantSpecies;
  userLat?: number | null;
  userLon?: number | null;
}

interface FactRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string | null;
  valueColor?: string;
}

function FactRow({ icon, label, value, subValue, valueColor }: FactRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`font-medium text-sm ${valueColor || 'text-foreground'}`}>{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Displays quick facts about a plant species including dimensions,
 * growth rate, care level, watering, and hardiness zone.
 */
export function QuickFactsCard({ species, userLat, userLon: _userLon }: QuickFactsCardProps) {
  // Parse dimensions from Perenual data
  const dimensions = formatDimensions(species.dimensions as Dimension[] | null);
  const growthRate = formatGrowthRate(species.growthRate);
  const careLevel = formatCareLevel(species.careLevel);
  const maintenance = formatMaintenance(species.maintenance);
  const watering = formatWatering(
    species.watering,
    species.wateringBenchmark as { value?: string | null; unit?: string } | null
  );

  // Calculate hardiness zone compatibility
  const userZone = userLat ? estimateHardinessZone(userLat) : null;
  const zoneCompat = userZone
    ? isZoneCompatible(userZone, species.hardinessMin, species.hardinessMax)
    : null;

  // Check if we have any data to display
  const hasData = dimensions.height || dimensions.spread || growthRate ||
    careLevel || maintenance || watering || species.hardinessMin;

  if (!hasData) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">📋</span>
          Quick Facts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-gray-100">
          {/* Height */}
          {dimensions.height && (
            <FactRow
              icon={<Ruler className="h-4 w-4 text-green-600" />}
              label="Height"
              value={dimensions.height}
            />
          )}

          {/* Spread */}
          {dimensions.spread && (
            <FactRow
              icon={<ArrowUpDown className="h-4 w-4 text-green-600" />}
              label="Spread"
              value={dimensions.spread}
            />
          )}

          {/* Growth Rate */}
          {growthRate && (
            <FactRow
              icon={<TrendingUp className="h-4 w-4 text-green-600" />}
              label="Growth"
              value={`${growthRate.icon} ${growthRate.label}`}
              subValue={growthRate.description}
            />
          )}

          {/* Care Level */}
          {careLevel && (
            <FactRow
              icon={<Wrench className="h-4 w-4 text-green-600" />}
              label="Care Level"
              value={`${careLevel.icon} ${careLevel.label}`}
              subValue={careLevel.description}
              valueColor={careLevel.color}
            />
          )}

          {/* Maintenance */}
          {maintenance && !careLevel && (
            <FactRow
              icon={<Wrench className="h-4 w-4 text-green-600" />}
              label="Maintenance"
              value={maintenance.label}
              subValue={maintenance.description}
            />
          )}

          {/* Watering */}
          {watering && (
            <FactRow
              icon={<Droplets className="h-4 w-4 text-blue-500" />}
              label="Water"
              value={`${watering.icon} ${watering.frequency}`}
              subValue={watering.schedule}
            />
          )}

          {/* Hardiness Zone */}
          {species.hardinessMin !== null && (
            <FactRow
              icon={<Thermometer className="h-4 w-4 text-red-500" />}
              label="Hardiness"
              value={species.hardinessMax && species.hardinessMax !== species.hardinessMin
                ? `Zone ${species.hardinessMin}-${species.hardinessMax}`
                : `Zone ${species.hardinessMin}`
              }
              subValue={zoneCompat?.message}
              valueColor={zoneCompat?.compatible === false ? 'text-error' : undefined}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
