import React from 'react';
import { TreePine, Clock, CalendarCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { PlantSpecies } from '../../lib/grow/species';

interface CroppingTimelineCardProps {
  species: PlantSpecies;
}

export function CroppingTimelineCard({ species }: CroppingTimelineCardProps) {
  if (!species.croppingTimelineNote) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TreePine className="h-5 w-5 text-green-600" />
          Cropping Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(species.yearsToFirstCrop != null || species.yearsToFullProduction != null) && (
          <div className="flex gap-4">
            {species.yearsToFirstCrop != null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>
                  <span className="font-medium">First crop:</span>{' '}
                  ~{species.yearsToFirstCrop} {species.yearsToFirstCrop === 1 ? 'year' : 'years'}
                </span>
              </div>
            )}
            {species.yearsToFullProduction != null && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarCheck className="h-4 w-4 text-green-600" />
                <span>
                  <span className="font-medium">Full production:</span>{' '}
                  ~{species.yearsToFullProduction} {species.yearsToFullProduction === 1 ? 'year' : 'years'}
                </span>
              </div>
            )}
          </div>
        )}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {species.croppingTimelineNote}
        </p>
      </CardContent>
    </Card>
  );
}
