import React from 'react';
import { Bug, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { PlantSpecies } from '../../lib/grow/species';
import { formatAttracts } from '../../lib/grow/formatters';

interface WildlifeCardProps {
  species: PlantSpecies;
}

/**
 * Displays wildlife attraction and pest susceptibility information.
 */
export function WildlifeCard({ species }: WildlifeCardProps) {
  const attractsData = formatAttracts(species.attracts);
  const hasPests = species.pestSusceptibility.length > 0;

  // Check if we have any data to display
  if (attractsData.length === 0 && !hasPests) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">🦋</span>
          Wildlife & Garden Ecology
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wildlife Attraction */}
        {attractsData.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bug className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Attracts</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attractsData.map(({ name, icon }) => (
                <Badge
                  key={name}
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 gap-1"
                >
                  {icon} {name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Great for supporting local pollinators and wildlife
            </p>
          </div>
        )}

        {/* Pest Susceptibility */}
        {hasPests && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">Pest Susceptibility</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {species.pestSusceptibility.map((pest) => (
                <Badge
                  key={pest}
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200"
                >
                  {pest.charAt(0).toUpperCase() + pest.slice(1)}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Monitor for these pests and treat early if spotted
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact wildlife badges for use in other components.
 */
export function WildlifeAttractionBadges({ species }: { species: PlantSpecies }) {
  const attractsData = formatAttracts(species.attracts);

  if (attractsData.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {attractsData.slice(0, 3).map(({ name, icon }) => (
        <Badge
          key={name}
          variant="outline"
          className="bg-green-50 text-green-700 text-xs gap-0.5"
        >
          {icon} {name}
        </Badge>
      ))}
      {attractsData.length > 3 && (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 text-xs">
          +{attractsData.length - 3} more
        </Badge>
      )}
    </div>
  );
}
