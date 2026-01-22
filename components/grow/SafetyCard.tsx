import React from 'react';
import { AlertTriangle, User, Dog, Pill, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { PlantSpecies } from '../../lib/grow/species';
import { formatToxicitySeverity, shouldShowSafetyWarning } from '../../lib/grow/formatters';

interface SafetyCardProps {
  species: PlantSpecies;
}

interface ToxicityRowProps {
  icon: React.ReactNode;
  label: string;
  level: number | null;
  effects?: string | null;
}

function ToxicityRow({ icon, label, level, effects }: ToxicityRowProps) {
  const severity = formatToxicitySeverity(level);

  return (
    <div className={`p-3 rounded-lg ${severity.bgClass}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{label}</span>
        </div>
        <Badge variant="outline" className={`${severity.textClass} border-current`}>
          {severity.icon} {severity.label}
        </Badge>
      </div>
      {effects && (
        <p className="text-xs text-muted-foreground mt-1 pl-6">
          {effects}
        </p>
      )}
    </div>
  );
}

/**
 * Displays safety information for a plant species.
 * Only shows if toxicity is moderate (≥2) or above per user preference.
 */
export function SafetyCard({ species }: SafetyCardProps) {
  const showWarning = shouldShowSafetyWarning(
    species.poisonousToHumans,
    species.poisonousToPets
  );

  // Don't render if no significant toxicity
  if (!showWarning) {
    return null;
  }

  const hasMedicinal = species.medicinal;
  const medicinalUse = species.medicinalUse;
  const medicinalMethod = species.medicinalMethod;

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Safety Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Human toxicity */}
        {(species.poisonousToHumans ?? 0) >= 2 && (
          <ToxicityRow
            icon={<User className="h-4 w-4 text-muted-foreground" />}
            label="Humans"
            level={species.poisonousToHumans}
            effects={species.poisonEffectsToHumans}
          />
        )}

        {/* Pet toxicity */}
        {(species.poisonousToPets ?? 0) >= 2 && (
          <ToxicityRow
            icon={<Dog className="h-4 w-4 text-muted-foreground" />}
            label="Pets"
            level={species.poisonousToPets}
            effects={species.poisonEffectsToPets}
          />
        )}

        {/* First aid advice if available */}
        {(species.poisonToHumansCure || species.poisonToPetsCure) && (
          <div className="p-3 rounded-lg bg-info/10 border border-info/20">
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-info mt-0.5" />
              <div>
                <p className="font-medium text-sm text-info">If ingested</p>
                {species.poisonToHumansCure && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Humans:</strong> {species.poisonToHumansCure}
                  </p>
                )}
                {species.poisonToPetsCure && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Pets:</strong> {species.poisonToPetsCure}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Medicinal properties (if any) */}
        {hasMedicinal && (medicinalUse || medicinalMethod) && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-start gap-2">
              <Pill className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-green-700">Medicinal Uses</p>
                {medicinalUse && (
                  <p className="text-xs text-muted-foreground mt-1">{medicinalUse}</p>
                )}
                {medicinalMethod && (
                  <p className="text-xs text-green-600 mt-1">
                    <strong>Method:</strong> {medicinalMethod}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* General warning */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Always wash hands after handling. Keep away from children and pets if toxic.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Compact safety alerts for use in other components.
 * Shows inline badges for thorny, invasive, or toxic plants.
 */
export function SafetyAlerts({ species }: { species: PlantSpecies }) {
  const alerts: { label: string; icon: string; color: string }[] = [];

  if (species.thorny) {
    alerts.push({ label: 'Thorny', icon: '🌵', color: 'bg-amber-100 text-amber-800' });
  }

  if (species.invasive) {
    alerts.push({ label: 'Invasive', icon: '⚠️', color: 'bg-orange-100 text-orange-800' });
  }

  if ((species.poisonousToHumans ?? 0) >= 2) {
    alerts.push({ label: 'Toxic to humans', icon: '☠️', color: 'bg-red-100 text-red-800' });
  }

  if ((species.poisonousToPets ?? 0) >= 2) {
    alerts.push({ label: 'Toxic to pets', icon: '🐾', color: 'bg-red-100 text-red-800' });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {alerts.map(({ label, icon, color }) => (
        <Badge key={label} className={`${color} text-xs gap-1`}>
          {icon} {label}
        </Badge>
      ))}
    </div>
  );
}
