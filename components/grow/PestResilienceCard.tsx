import React from 'react';
import { Bug, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { PlantSpecies } from '../../lib/grow/species';

interface PestResilienceCardProps {
  species: PlantSpecies;
}

const RESILIENCE_CONFIG: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  1: { label: 'Very vulnerable', color: 'bg-red-100 text-red-800 border-red-200', icon: <ShieldAlert className="h-4 w-4" /> },
  2: { label: 'Somewhat vulnerable', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <ShieldAlert className="h-4 w-4" /> },
  3: { label: 'Average', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Shield className="h-4 w-4" /> },
  4: { label: 'Good resilience', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <ShieldCheck className="h-4 w-4" /> },
  5: { label: 'Highly resilient', color: 'bg-green-100 text-green-800 border-green-200', icon: <ShieldCheck className="h-4 w-4" /> },
};

export function PestResilienceCard({ species }: PestResilienceCardProps) {
  const score = species.pestResilienceScore;
  if (score == null) return null;

  const config = RESILIENCE_CONFIG[score] ?? RESILIENCE_CONFIG[3];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bug className="h-5 w-5 text-muted-foreground" />
          Pest Resilience
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-2 w-6 rounded-full ${
                  i <= score ? 'bg-current' : 'bg-base-300'
                }`}
                style={i <= score ? { color: score >= 4 ? '#059669' : score >= 3 ? '#ca8a04' : '#dc2626' } : undefined}
              />
            ))}
          </div>
          <Badge variant="outline" className={`${config.color} gap-1`}>
            {config.icon} {score}/5 &mdash; {config.label}
          </Badge>
        </div>
        {species.pestResilienceNote && (
          <p className="text-sm text-muted-foreground">{species.pestResilienceNote}</p>
        )}
      </CardContent>
    </Card>
  );
}
