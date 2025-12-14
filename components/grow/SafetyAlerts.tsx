import React from 'react';
import { AlertTriangle, Dog, Baby } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { PlantSpecies } from '../../lib/grow/species';

interface SafetyAlertsProps {
  species: Pick<PlantSpecies, 'poisonousToHumans' | 'poisonousToPets' | 'thorny' | 'invasive'>;
  compact?: boolean;
}

/**
 * Displays safety warnings for toxic, thorny, or invasive plants.
 * Uses destructive badges for critical warnings (toxicity) and outline for informational (thorny/invasive).
 */
export function SafetyAlerts({ species, compact = false }: SafetyAlertsProps) {
  const hasPetToxicity = species.poisonousToPets > 0;
  const hasHumanToxicity = species.poisonousToHumans > 0;
  const hasSafetyData = hasPetToxicity || hasHumanToxicity || species.thorny || species.invasive;

  if (!hasSafetyData) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {hasPetToxicity && (
          <Badge variant="destructive" className="gap-1 text-xs">
            <Dog className="h-3 w-3" />
            Pet toxic
          </Badge>
        )}
        {hasHumanToxicity && (
          <Badge variant="destructive" className="gap-1 text-xs">
            <Baby className="h-3 w-3" />
            Toxic
          </Badge>
        )}
        {species.thorny && (
          <Badge variant="outline" className="gap-1 text-xs text-amber-700 border-amber-300">
            🌵 Thorny
          </Badge>
        )}
        {species.invasive && (
          <Badge variant="outline" className="gap-1 text-xs text-orange-700 border-orange-300">
            ⚠️ Invasive
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
      <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
        <AlertTriangle className="h-4 w-4" />
        Safety Information
      </div>
      <div className="flex flex-wrap gap-2">
        {hasPetToxicity && (
          <Badge variant="destructive" className="gap-1">
            <Dog className="h-3 w-3" />
            Toxic to pets
          </Badge>
        )}
        {hasHumanToxicity && (
          <Badge variant="destructive" className="gap-1">
            <Baby className="h-3 w-3" />
            Toxic to humans
          </Badge>
        )}
        {species.thorny && (
          <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-50">
            🌵 Has thorns
          </Badge>
        )}
        {species.invasive && (
          <Badge variant="outline" className="gap-1 text-orange-700 border-orange-300 bg-orange-50">
            ⚠️ Potentially invasive
          </Badge>
        )}
      </div>
    </div>
  );
}
