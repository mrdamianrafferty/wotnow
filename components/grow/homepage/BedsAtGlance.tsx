import React from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { BedPill } from './BedPill';
import type { SerializedBed } from '../../../lib/grow/server/beds';

interface BedsAtGlanceProps {
  beds: SerializedBed[];
  isAuthenticated: boolean;
  t: (value: string) => string;
}

export function BedsAtGlance({ beds, isAuthenticated, t }: BedsAtGlanceProps) {
  if (!isAuthenticated) return null;

  if (beds.length === 0) {
    return (
      <section aria-labelledby="beds-heading">
        <h2 id="beds-heading" className="sr-only">{t('My Garden')}</h2>
        <Link
          href="/grow/garden"
          className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/60 p-6 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Plus size={20} />
          <span className="text-sm font-medium">{t('Start your garden')}</span>
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="beds-heading">
      <h2 id="beds-heading" className="sr-only">{t('My Garden')}</h2>
      <div
        role="list"
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
      >
        {beds.map(bed => (
          <BedPill key={bed.id} bed={bed} />
        ))}
      </div>
    </section>
  );
}
