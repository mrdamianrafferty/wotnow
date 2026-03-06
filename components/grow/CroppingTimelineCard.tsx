import React from 'react';
import { Clock, CalendarCheck, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { PlantSpecies } from '../../lib/grow/species';

interface CroppingTimelineCardProps {
  species: PlantSpecies;
}

export function CroppingTimelineCard({ species }: CroppingTimelineCardProps) {
  if (!species.croppingTimelineNote) return null;

  const firstCrop = species.yearsToFirstCrop;
  const fullProd = species.yearsToFullProduction;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Cropping Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Year metrics */}
        {(firstCrop != null || fullProd != null) && (
          <div className="flex flex-col sm:flex-row gap-2">
            {firstCrop != null && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">First crop</span>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  ~{firstCrop} {firstCrop === 1 ? 'year' : 'years'}
                </Badge>
              </div>
            )}
            {fullProd != null && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200 flex-1">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Full production</span>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  ~{fullProd} {fullProd === 1 ? 'year' : 'years'}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Timeline bar */}
        {firstCrop != null && fullProd != null && fullProd > firstCrop && (
          <div className="space-y-1.5">
            <div className="relative h-2 bg-base-300 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-green-500"
                style={{ width: '100%' }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-amber-700"
                style={{ left: `${(firstCrop / fullProd) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Planted</span>
              <span>Year {firstCrop}</span>
              <span>Year {fullProd}</span>
            </div>
          </div>
        )}

        {/* Note */}
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {species.croppingTimelineNote}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Compact inline summary for use in dialogs and lists */
export function CroppingTimelineSummary({ species }: CroppingTimelineCardProps) {
  if (species.yearsToFirstCrop == null) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5 text-amber-500" />
      <span>
        First crop ~{species.yearsToFirstCrop} {species.yearsToFirstCrop === 1 ? 'year' : 'years'}
        {species.yearsToFullProduction != null && (
          <> &middot; Full production ~{species.yearsToFullProduction} years</>
        )}
      </span>
    </div>
  );
}
