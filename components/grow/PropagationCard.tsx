import React from 'react';
import { Scissors, Check, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { PlantSpecies } from '../../lib/grow/species';
import { formatPropagation } from '../../lib/grow/formatters';

interface PropagationCardProps {
  species: PlantSpecies;
}

const difficultyColors = {
  easy: 'bg-green-100 text-green-700 border-green-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  advanced: 'bg-red-100 text-red-700 border-red-200',
};

const difficultyLabels = {
  easy: 'Easy',
  moderate: 'Moderate',
  advanced: 'Advanced',
};

interface MethodItemProps {
  method: string;
  icon: string;
  difficulty: 'easy' | 'moderate' | 'advanced';
}

function MethodItem({ method, icon, difficulty }: MethodItemProps) {
  const bgColors = {
    easy: 'bg-green-50',
    moderate: 'bg-amber-50',
    advanced: 'bg-gray-50',
  };

  const iconColors = {
    easy: 'text-green-600',
    moderate: 'text-amber-600',
    advanced: 'text-gray-400',
  };

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${bgColors[difficulty]}`}>
      <div className="flex items-center gap-1.5">
        {difficulty === 'advanced' ? (
          <Circle className={`h-3 w-3 ${iconColors[difficulty]}`} />
        ) : (
          <Check className={`h-3 w-3 ${iconColors[difficulty]}`} />
        )}
        <span className="text-sm">{icon}</span>
        <span className={`font-medium text-xs ${difficulty === 'advanced' ? 'text-muted-foreground' : ''}`}>
          {method}
        </span>
      </div>
      <Badge
        variant="outline"
        className={`${difficultyColors[difficulty]} text-[10px] px-1.5 py-0`}
      >
        {difficultyLabels[difficulty]}
      </Badge>
    </div>
  );
}

/**
 * Displays propagation methods for a plant species with difficulty ratings.
 * Uses a 2-column grid layout for compact display.
 */
export function PropagationCard({ species }: PropagationCardProps) {
  const propagationMethods = formatPropagation(species.propagation);

  // Check if we have any data to display
  if (propagationMethods.length === 0) {
    return null;
  }

  // Sort by difficulty (easy first)
  const sortedMethods = [...propagationMethods].sort((a, b) => {
    const order = { easy: 0, moderate: 1, advanced: 2 };
    return order[a.difficulty] - order[b.difficulty];
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Scissors className="h-5 w-5 text-green-600" />
          How to Propagate
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-1">
          {sortedMethods.map(({ method, icon, difficulty }) => (
            <MethodItem key={method} method={method} icon={icon} difficulty={difficulty} />
          ))}
        </div>
        {/* Seeds info */}
        {species.seeds > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2 mt-2 border-t">
            This plant produces viable seeds for propagation
          </p>
        )}
      </CardContent>
    </Card>
  );
}
