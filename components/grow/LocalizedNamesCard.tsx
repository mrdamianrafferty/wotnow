import React, { useState } from 'react';
import { Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { PlantSpecies } from '../../lib/grow/species';
import { getAllLocalizedNames } from '../../lib/grow/formatters';

interface LocalizedNamesCardProps {
  species: PlantSpecies;
  defaultExpanded?: boolean;
}

/**
 * Displays plant names in multiple languages.
 * Collapsible by default to save space.
 */
export function LocalizedNamesCard({
  species,
  defaultExpanded = false,
}: LocalizedNamesCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Build the localized names from the species translations
  const localizedNames = getAllLocalizedNames({
    name_fr: species.translations.fr ?? null,
    name_es: species.translations.es ?? null,
    name_de: species.translations.de ?? null,
    name_it: species.translations.it ?? null,
    name_pt: species.translations.pt ?? null,
    name_nl: species.translations.nl ?? null,
    name_pl: species.translations.pl ?? null,
  });

  // Don't render if no translations available
  if (localizedNames.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Names in Other Languages
            <span className="text-xs text-muted-foreground font-normal">
              ({localizedNames.length})
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="divide-y divide-gray-100">
            {localizedNames.map(({ lang, name, flag }) => (
              <div
                key={lang}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{flag}</span>
                  <span className="text-sm text-muted-foreground">{lang}</span>
                </div>
                <span className="font-medium text-sm">{name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Compact inline display of available translations.
 */
export function LocalizedNameFlags({ species }: { species: PlantSpecies }) {
  const localizedNames = getAllLocalizedNames({
    name_fr: species.translations.fr ?? null,
    name_es: species.translations.es ?? null,
    name_de: species.translations.de ?? null,
    name_it: species.translations.it ?? null,
    name_pt: species.translations.pt ?? null,
    name_nl: species.translations.nl ?? null,
    name_pl: species.translations.pl ?? null,
  });

  if (localizedNames.length === 0) return null;

  return (
    <div className="flex items-center gap-1" title="Available in other languages">
      {localizedNames.slice(0, 5).map(({ flag, lang }) => (
        <span key={lang} className="text-sm" title={lang}>
          {flag}
        </span>
      ))}
      {localizedNames.length > 5 && (
        <span className="text-xs text-muted-foreground">
          +{localizedNames.length - 5}
        </span>
      )}
    </div>
  );
}
