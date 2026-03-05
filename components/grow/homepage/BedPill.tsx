import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sprout } from 'lucide-react';
import { BED_COLOR_HEX, type SerializedBed } from '../../../lib/grow/server/beds';
import { getPlantImage } from '../../../lib/grow/plantImages';

interface BedPillProps {
  bed: SerializedBed;
}

const STATUS_DOT: Record<string, string> = {
  healthy: 'bg-green-500',
  approaching_harvest: 'bg-amber-500',
  ready_to_harvest: 'bg-yellow-400 animate-pulse',
  empty: 'bg-gray-300',
};

export function BedPill({ bed }: BedPillProps) {
  const stripe = BED_COLOR_HEX[bed.color] || '#6B7B8D';
  const dotClass = STATUS_DOT[bed.bedStatus ?? 'empty'] || STATUS_DOT.empty;

  // Get up to 3 species thumbnails
  const thumbnails = (bed.speciesSlugs ?? [])
    .slice(0, 3)
    .map(slug => ({ slug, src: getPlantImage(slug, 'emoji') }))
    .filter((t): t is { slug: string; src: string } => !!t.src);

  return (
    <Link
      href={`/grow/garden/beds/${bed.id}`}
      role="listitem"
      aria-label={`${bed.name} — ${bed.plantCount || 0} plants, ${bed.bedStatus?.replace(/_/g, ' ') || 'empty'}`}
      className="snap-start shrink-0 block w-[120px] rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-[3px]" style={{ backgroundColor: stripe }} />
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground truncate">{bed.name}</p>
          <span className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`} aria-hidden="true" />
        </div>
        <div className="flex items-center gap-1 mt-2">
          {thumbnails.length > 0 ? (
            <>
              {thumbnails.map(t => (
                <div key={t.slug} className="w-6 h-6 rounded-full bg-green-50 overflow-hidden shrink-0">
                  <Image src={t.src} alt="" width={24} height={24} className="object-cover w-full h-full" />
                </div>
              ))}
              {bed.plantCount > thumbnails.length && (
                <span className="text-[9px] text-muted-foreground ml-0.5">
                  +{bed.plantCount - thumbnails.length}
                </span>
              )}
            </>
          ) : bed.plantCount > 0 ? (
            <div className="flex items-center gap-1">
              <Sprout className="h-4 w-4 text-green-400" />
              <span className="text-[10px] text-muted-foreground">
                {bed.plantCount} plant{bed.plantCount !== 1 ? 's' : ''}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">Empty</span>
          )}
        </div>
      </div>
    </Link>
  );
}
