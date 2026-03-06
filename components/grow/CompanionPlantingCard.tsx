import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sprout, ShieldAlert, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { PlantSpecies } from '../../lib/grow/species';

interface CompanionPlantingCardProps {
  species: PlantSpecies;
}

/** Fallback: convert a slug like "onion-bulb" to "Onion bulb" */
function slugToLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
}

/** Fetch common names for a list of slugs via lightweight API */
function useCompanionNames(slugs: string[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = slugs.sort().join(',');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    fetch('/api/grow/species/names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.names) setNames(data.names);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return names;
}

function CompanionChip({ slug, name, good }: { slug: string; name: string; good: boolean }) {
  return (
    <Link
      href={`/grow/species/${slug}`}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        good
          ? 'bg-green-50 text-green-800 border border-green-200 hover:bg-green-100'
          : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
      }`}
    >
      {name}
    </Link>
  );
}

export function CompanionPlantingCard({ species }: CompanionPlantingCardProps) {
  const hasGood = species.companionsWith?.length > 0;
  const hasBad = species.companionsAvoid?.length > 0;

  const allSlugs = [
    ...(hasGood ? species.companionsWith : []),
    ...(hasBad ? species.companionsAvoid : []),
  ];
  const nameMap = useCompanionNames(allSlugs);

  if (!hasGood && !hasBad) return null;

  const getName = (slug: string) => nameMap[slug] || slugToLabel(slug);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          Companion Planting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasGood && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Sprout className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-800 uppercase tracking-wide">
                Grows well with
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {species.companionsWith.map(slug => (
                <CompanionChip key={slug} slug={slug} name={getName(slug)} good />
              ))}
            </div>
          </div>
        )}

        {hasBad && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-800 uppercase tracking-wide">
                Keep apart from
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {species.companionsAvoid.map(slug => (
                <CompanionChip key={slug} slug={slug} name={getName(slug)} good={false} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Compact inline summary for use in dialogs and lists */
export function CompanionPlantingSummary({ species }: CompanionPlantingCardProps) {
  const slugs = species.companionsWith?.slice(0, 3) ?? [];
  const nameMap = useCompanionNames(slugs);
  const getName = (slug: string) => nameMap[slug] || slugToLabel(slug);

  if (!species.companionsWith?.length) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Users className="h-3.5 w-3.5 text-green-600" />
      <span>
        Grows well with {slugs.map(getName).join(', ')}
        {species.companionsWith.length > 3 && ` +${species.companionsWith.length - 3} more`}
      </span>
    </div>
  );
}
