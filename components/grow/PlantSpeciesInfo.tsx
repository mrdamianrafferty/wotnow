import React from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  Shovel,
  Ruler,
  Thermometer,
  Sprout,
  Leaf,
  Flower2,
  TreeDeciduous,
  Shrub,
  ChevronDown,
  ChevronUp,
  Bird,
  Bug,
} from 'lucide-react';
import type { PlantSpecies } from '../../lib/grow/species';
import { SafetyAlerts } from './SafetyAlerts';
import { WateringScale } from './WateringScale';
import { HardinessZoneBar } from './HardinessZoneBar';
import { SeasonalTimeline } from './SeasonalTimeline';
import { CareGuideCard } from './CareGuideCard';
import { Badge } from '../ui/badge';

interface PlantSpeciesInfoProps {
  species: PlantSpecies | null;
  isLoading?: boolean;
  compact?: boolean;
}

const SUN_ICONS: Record<string, React.ReactNode> = {
  'full sun': <Sun className="h-4 w-4 text-amber-500" />,
  'full': <Sun className="h-4 w-4 text-amber-500" />,
  'partial shade': <CloudSun className="h-4 w-4 text-amber-400" />,
  'partial sun': <CloudSun className="h-4 w-4 text-amber-400" />,
  'part shade': <CloudSun className="h-4 w-4 text-amber-400" />,
  'full shade': <Cloud className="h-4 w-4 text-gray-400" />,
  'shade': <Cloud className="h-4 w-4 text-gray-400" />,
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  vegetable: <Sprout className="h-4 w-4 text-green-600" />,
  vegetables: <Sprout className="h-4 w-4 text-green-600" />,
  herb: <Leaf className="h-4 w-4 text-green-500" />,
  herbs: <Leaf className="h-4 w-4 text-green-500" />,
  fruit: <Flower2 className="h-4 w-4 text-red-500" />,
  fruits: <Flower2 className="h-4 w-4 text-red-500" />,
  flower: <Flower2 className="h-4 w-4 text-pink-500" />,
  flowers: <Flower2 className="h-4 w-4 text-pink-500" />,
  tree: <TreeDeciduous className="h-4 w-4 text-green-700" />,
  trees: <TreeDeciduous className="h-4 w-4 text-green-700" />,
  shrub: <Shrub className="h-4 w-4 text-green-600" />,
  shrubs: <Shrub className="h-4 w-4 text-green-600" />,
  vine: <Leaf className="h-4 w-4 text-green-500" />,
  vines: <Leaf className="h-4 w-4 text-green-500" />,
};

function getSunIcon(sunRequirements: string | null): React.ReactNode {
  if (!sunRequirements) return <Sun className="h-4 w-4 text-gray-300" />;
  const key = sunRequirements.toLowerCase();
  return SUN_ICONS[key] ?? <Sun className="h-4 w-4 text-amber-400" />;
}

function getCategoryIcon(category: string | null): React.ReactNode {
  if (!category) return <Sprout className="h-4 w-4 text-gray-400" />;
  const key = category.toLowerCase();
  return CATEGORY_ICONS[key] ?? <Sprout className="h-4 w-4 text-green-500" />;
}

function formatSunRequirements(value: string | null): string {
  if (!value) return 'Unknown';
  return value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatSoilType(value: string | null): string {
  if (!value) return 'Any soil';
  return value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatPlantSize(value: string | null): string {
  if (!value) return 'Varies';
  return value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatZoneRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return 'All zones';
  if (min === null) return `Up to zone ${max}`;
  if (max === null) return `Zone ${min}+`;
  if (min === max) return `Zone ${min}`;
  return `Zones ${min}-${max}`;
}

function hasEnrichedData(species: PlantSpecies): boolean {
  return !!(
    species.poisonousToHumans > 0 ||
    species.poisonousToPets > 0 ||
    species.thorny ||
    species.invasive ||
    species.watering ||
    species.hardinessMin !== null ||
    species.harvestSeason ||
    species.floweringSeason ||
    (species.careGuides && species.careGuides.length > 0)
  );
}

function WildlifeAttractors({ species }: { species: PlantSpecies }) {
  const attractors: { icon: React.ReactNode; label: string }[] = [];
  const attracts = species.attracts || [];
  
  // Check the attracts array for wildlife types
  if (attracts.some(a => a.toLowerCase().includes('bird'))) {
    attractors.push({ icon: <Bird className="h-3 w-3" />, label: 'Birds' });
  }
  if (attracts.some(a => a.toLowerCase().includes('butterfl'))) {
    attractors.push({ icon: '🦋', label: 'Butterflies' });
  }
  if (attracts.some(a => a.toLowerCase().includes('bee') || a.toLowerCase().includes('pollinator'))) {
    attractors.push({ icon: <Bug className="h-3 w-3" />, label: 'Pollinators' });
  }
  
  if (attractors.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1">
      {attractors.map(({ icon, label }) => (
        <Badge key={label} variant="outline" className="gap-1 text-xs text-green-700 border-green-200 bg-green-50">
          {typeof icon === 'string' ? icon : icon} {label}
        </Badge>
      ))}
    </div>
  );
}

export function PlantSpeciesInfo({ species, isLoading, compact = false }: PlantSpeciesInfoProps) {
  const [expanded, setExpanded] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex gap-3 text-xs text-muted-foreground animate-pulse">
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-4 w-14 bg-gray-200 rounded" />
      </div>
    );
  }

  // Show nothing if no species data - the API may not have info for this plant
  if (!species) {
    return null;
  }

  // Check if we have any meaningful care data to show
  const hasData = species.sunRequirements || species.soilType || species.plantSize || 
    species.usdaZoneMin !== null || species.usdaZoneMax !== null;
  
  if (!hasData) {
    return null;
  }

  // Compact mode - single row of icons with tooltips
  if (compact) {
    return (
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1" title={`Sun: ${formatSunRequirements(species.sunRequirements)}`}>
          {getSunIcon(species.sunRequirements)}
          <span className="hidden sm:inline">{formatSunRequirements(species.sunRequirements)}</span>
        </div>
        <div className="flex items-center gap-1" title={`Soil: ${formatSoilType(species.soilType)}`}>
          <Shovel className="h-4 w-4 text-amber-700" />
          <span className="hidden sm:inline">{formatSoilType(species.soilType)}</span>
        </div>
        <div className="flex items-center gap-1" title={`Size: ${formatPlantSize(species.plantSize)}`}>
          <Ruler className="h-4 w-4 text-blue-500" />
          <span className="hidden sm:inline">{formatPlantSize(species.plantSize)}</span>
        </div>
        <div className="flex items-center gap-1" title={formatZoneRange(species.usdaZoneMin, species.usdaZoneMax)}>
          <Thermometer className="h-4 w-4 text-red-400" />
          <span className="hidden sm:inline">{formatZoneRange(species.usdaZoneMin, species.usdaZoneMax)}</span>
        </div>
      </div>
    );
  }

  // Full mode - expandable details
  return (
    <div className="border-t border-gray-100 pt-3 mt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {getCategoryIcon(species.category)}
        <span className="font-medium">Plant Care Info</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 ml-auto" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-auto" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Safety alerts at the top if there are any */}
          <SafetyAlerts species={species} />
          
          {/* Basic care grid - existing info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
              {getSunIcon(species.sunRequirements)}
              <div>
                <p className="text-xs text-muted-foreground">Light</p>
                <p className="font-medium text-amber-800">{formatSunRequirements(species.sunRequirements)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
              <Shovel className="h-4 w-4 text-amber-700" />
              <div>
                <p className="text-xs text-muted-foreground">Soil</p>
                <p className="font-medium text-amber-800">{formatSoilType(species.soilType)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
              <Ruler className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Size</p>
                <p className="font-medium text-blue-800">{formatPlantSize(species.plantSize)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
              <Thermometer className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-xs text-muted-foreground">Hardiness</p>
                <p className="font-medium text-red-800">{formatZoneRange(species.usdaZoneMin, species.usdaZoneMax)}</p>
              </div>
            </div>
          </div>

          {/* Enriched Perenual data sections */}
          {hasEnrichedData(species) && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <WateringScale species={species} />
              <HardinessZoneBar species={species} />
              <SeasonalTimeline species={species} />
              <WildlifeAttractors species={species} />
              <CareGuideCard species={species} maxSections={3} />
            </div>
          )}

          {species.scientificName && (
            <div className="text-xs text-muted-foreground italic text-center pt-2">
              {species.scientificName}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
