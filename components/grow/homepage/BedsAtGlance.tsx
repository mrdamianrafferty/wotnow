import React from 'react';
import { Sprout } from 'lucide-react';
import Link from 'next/link';
import { BedPill } from './BedPill';
import type { SerializedBed } from '../../../lib/grow/server/beds';
import type { SeasonalTint } from '../../../lib/grow/seasonalColors';

interface BedsAtGlanceProps {
  beds: SerializedBed[];
  isAuthenticated: boolean;
  seasonal: SeasonalTint;
  t: (value: string) => string;
}

export function BedsAtGlance({ beds, isAuthenticated, seasonal, t }: BedsAtGlanceProps) {
  if (!isAuthenticated) return null;

  if (beds.length === 0) {
    return (
      <section aria-labelledby="beds-heading">
        <h2 id="beds-heading" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          {t('My Beds')}
        </h2>
        <Link
          href="/grow/garden"
          className="flex items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 hover:scale-[1.01] transition-all duration-200"
          style={{
            backgroundImage: seasonal.gradient,
            borderColor: seasonal.borderColor,
            color: seasonal.accentColor,
          }}
        >
          <Sprout size={20} />
          <span className="text-sm font-medium">{t('Start your garden')}</span>
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="beds-heading">
      <h2 id="beds-heading" className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
        {t('My Beds')}
      </h2>
      <div
        role="list"
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
      >
        {beds.map(bed => (
          <BedPill key={bed.id} bed={bed} seasonal={seasonal} t={t} />
        ))}
      </div>
    </section>
  );
}
