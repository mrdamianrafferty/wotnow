import React from 'react';
import { Cherry, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { auth } from '../../../lib/grow/auth';
import { BED_COLOR_HEX, type BedColor } from '../../../lib/grow/server/beds';
import type { SeasonalTint } from '../../../lib/grow/seasonalColors';

export interface HarvestHorizonItem {
  plantingId: string;
  plantName: string;
  speciesSlug: string | null;
  bedName: string;
  bedColor: string;
  plantedAt: string;
  daysRemaining: number;
  growthProgress: number;
  stageBadgeClass: string;
  stageLabel: string;
}

interface HarvestHorizonProps {
  seasonal: SeasonalTint;
  t: (value: string) => string;
}

async function fetchHarvestHorizon(): Promise<HarvestHorizonItem[]> {
  const token = auth.getCurrentAccessToken();
  if (!token) return [];

  const res = await fetch('/api/grow/harvest-horizon', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.plants ?? [];
}

export function HarvestHorizon({ seasonal, t }: HarvestHorizonProps) {
  const { data: plants = [] } = useQuery({
    queryKey: ['harvestHorizon'],
    queryFn: fetchHarvestHorizon,
    staleTime: 10 * 60 * 1000,
  });

  if (plants.length === 0) return null;

  return (
    <section aria-labelledby="harvest-heading">
      <h2 id="harvest-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
        <Cherry size={16} style={{ color: seasonal.accentColor }} aria-hidden="true" />
        {t('Harvest Horizon')}
      </h2>
      <div className="space-y-2">
        {plants.map(plant => {
          const dotColor = BED_COLOR_HEX[plant.bedColor as BedColor] || '#6B7B8D';
          const isReady = plant.daysRemaining <= 0;
          return (
            <div
              key={plant.plantingId}
              className="rounded-lg border border-border/50 p-3 hover:shadow-sm hover:scale-[1.01] transition-all duration-200"
              style={{ backgroundImage: seasonal.gradient }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-foreground truncate">{plant.plantName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {isReady && <Sparkles size={12} className="text-yellow-500 animate-pulse" aria-hidden="true" />}
                    {isReady
                      ? t('Ready now')
                      : `~${plant.daysRemaining} ${t('days remaining')}`}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${plant.stageBadgeClass}`}>
                    {plant.stageLabel}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(plant.growthProgress * 100, 100)}%`,
                    backgroundImage: `linear-gradient(to right, ${seasonal.accentColor}, ${seasonal.accentColor}cc)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
