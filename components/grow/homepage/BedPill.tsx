import React from 'react';
import Link from 'next/link';
import { BED_COLOR_HEX, type SerializedBed } from '../../../lib/grow/server/beds';

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

  return (
    <Link
      href={`/grow/garden/beds/${bed.id}`}
      role="listitem"
      aria-label={`${bed.name} — ${bed.plantCount || 0} plants, ${bed.bedStatus?.replace(/_/g, ' ') || 'empty'}`}
      className="snap-start shrink-0 block w-[120px] rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-[3px]" style={{ backgroundColor: stripe }} />
      <div className="px-3 py-2.5">
        <p className="text-xs font-medium text-foreground truncate">{bed.name}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            {bed.plantCount > 0 ? `${bed.plantCount} plant${bed.plantCount !== 1 ? 's' : ''}` : 'Empty'}
          </span>
          <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
