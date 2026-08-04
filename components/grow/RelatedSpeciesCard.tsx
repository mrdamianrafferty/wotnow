import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPlantImage } from '@/lib/grow/plantImages';
import { Leaf } from 'lucide-react';

export type RelatedSpeciesEntry = {
  slug: string;
  name: string;
  scientificName: string | null;
  imageKey: string | null;
};

interface RelatedSpeciesCardProps {
  species: RelatedSpeciesEntry[];
  /** Path prefix for links, e.g. "/grow/species" or "/grow/fr/species" */
  basePath?: string;
  title?: string;
}

export function RelatedSpeciesCard({
  species,
  basePath = '/grow/species',
  title = 'Related plants',
}: RelatedSpeciesCardProps) {
  if (!species || species.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {species.map((entry) => {
            const image = entry.imageKey ? getPlantImage(entry.imageKey, 'medium') : null;
            return (
              <Link
                key={entry.slug}
                href={`${basePath}/${entry.slug}`}
                className="group flex flex-col rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative h-20 bg-emerald-50 flex items-center justify-center overflow-hidden">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={entry.name}
                      loading="lazy"
                      className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Leaf className="w-6 h-6 text-emerald-300" aria-hidden="true" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{entry.name}</p>
                  {entry.scientificName && (
                    <p className="text-[11px] text-muted-foreground italic line-clamp-1">{entry.scientificName}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
