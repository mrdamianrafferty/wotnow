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

interface FactItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string | null;
  valueColor?: string;
}

function FactItem({ icon, label, value, subValue, valueColor }: FactItemProps) {
  return (
    <div className="flex items-start gap-2 p-2">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`font-medium text-sm leading-tight ${valueColor || 'text-foreground'}`}>{value}</p>
        {subValue && (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{subValue}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Displays quick facts about a plant species including dimensions,
 * growth rate, care level, watering, and hardiness zone.
 * Uses a 2-column grid layout for compact display.
 */
export function QuickFactsCard({ species, userLat, userLon: _userLon }: QuickFactsCardProps) {
  // Prefer our curated numeric columns; fall back to Perenual JSON
  const perenualDims = formatDimensions(species.dimensions as Dimension[] | null);
  const dimensions = {
    height: species.averageHeightCm
      ? species.maximumHeightCm && species.maximumHeightCm !== species.averageHeightCm
        ? `${(species.averageHeightCm / 100).toFixed(1)}-${(species.maximumHeightCm / 100).toFixed(1)}m`
        : `${(species.averageHeightCm / 100).toFixed(1)}m`
      : perenualDims.height,
    spread: species.averageSpreadCm
      ? species.maximumSpreadCm && species.maximumSpreadCm !== species.averageSpreadCm
        ? `${(species.averageSpreadCm / 100).toFixed(1)}-${(species.maximumSpreadCm / 100).toFixed(1)}m`
        : `${(species.averageSpreadCm / 100).toFixed(1)}m`
      : perenualDims.spread,
  };
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

  // Build array of facts to display
  const facts: FactItemProps[] = [];

  if (dimensions.height) {
    facts.push({
      icon: <Ruler className="h-4 w-4 text-green-600" />,
      label: 'Height',
      value: dimensions.height,
    });
  }

  if (dimensions.spread) {
    facts.push({
      icon: <ArrowUpDown className="h-4 w-4 text-green-600" />,
      label: 'Spread',
      value: dimensions.spread,
    });
  }

  if (growthRate) {
    facts.push({
      icon: <TrendingUp className="h-4 w-4 text-green-600" />,
      label: 'Growth',
      value: `${growthRate.icon} ${growthRate.label}`,
      subValue: growthRate.description,
    });
  }

  if (careLevel) {
    facts.push({
      icon: <Wrench className="h-4 w-4 text-green-600" />,
      label: 'Care Level',
      value: `${careLevel.icon} ${careLevel.label}`,
      subValue: careLevel.description,
      valueColor: careLevel.color,
    });
  } else if (maintenance) {
    facts.push({
      icon: <Wrench className="h-4 w-4 text-green-600" />,
      label: 'Maintenance',
      value: maintenance.label,
      subValue: maintenance.description,
    });
  }

  if (watering) {
    facts.push({
      icon: <Droplets className="h-4 w-4 text-blue-500" />,
      label: 'Water',
      value: `${watering.icon} ${watering.frequency}`,
      subValue: watering.schedule,
    });
  }

  if (species.hardinessMin !== null) {
    facts.push({
      icon: <Thermometer className="h-4 w-4 text-red-500" />,
      label: 'Hardiness',
      value: species.hardinessMax && species.hardinessMax !== species.hardinessMin
        ? `Zone ${species.hardinessMin}-${species.hardinessMax}`
        : `Zone ${species.hardinessMin}`,
      subValue: zoneCompat?.message,
      valueColor: zoneCompat?.compatible === false ? 'text-error' : undefined,
    });
  }

  if (facts.length === 0) {
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
        <div className="grid grid-cols-2 gap-1">
          {facts.map((fact, index) => (
            <FactItem key={index} {...fact} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
