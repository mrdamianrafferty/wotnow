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

/**
 * Displays propagation methods for a plant species with difficulty ratings.
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

  const easyMethods = sortedMethods.filter(m => m.difficulty === 'easy');
  const moderateMethods = sortedMethods.filter(m => m.difficulty === 'moderate');
  const advancedMethods = sortedMethods.filter(m => m.difficulty === 'advanced');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Scissors className="h-5 w-5 text-green-600" />
          How to Propagate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Recommended methods (easy) */}
        {easyMethods.length > 0 && (
          <div className="space-y-2">
            {easyMethods.map(({ method, icon, difficulty }) => (
              <div
                key={method}
                className="flex items-center justify-between p-2 rounded-lg bg-green-50"
              >
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-lg">{icon}</span>
                  <span className="font-medium text-sm">{method}</span>
                </div>
                <Badge
                  variant="outline"
                  className={difficultyColors[difficulty]}
                >
                  {difficultyLabels[difficulty]}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Moderate methods */}
        {moderateMethods.length > 0 && (
          <div className="space-y-2">
            {moderateMethods.map(({ method, icon, difficulty }) => (
              <div
                key={method}
                className="flex items-center justify-between p-2 rounded-lg bg-amber-50"
              >
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-600" />
                  <span className="text-lg">{icon}</span>
                  <span className="font-medium text-sm">{method}</span>
                </div>
                <Badge
                  variant="outline"
                  className={difficultyColors[difficulty]}
                >
                  {difficultyLabels[difficulty]}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Advanced methods */}
        {advancedMethods.length > 0 && (
          <div className="space-y-2">
            {advancedMethods.map(({ method, icon, difficulty }) => (
              <div
                key={method}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4 text-gray-400" />
                  <span className="text-lg">{icon}</span>
                  <span className="font-medium text-sm text-muted-foreground">{method}</span>
                </div>
                <Badge
                  variant="outline"
                  className={difficultyColors[difficulty]}
                >
                  {difficultyLabels[difficulty]}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Seeds info */}
        {species.seeds > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t">
            This plant produces viable seeds for propagation
          </p>
        )}
      </CardContent>
    </Card>
  );
}
