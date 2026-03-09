import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '../ui/card';
import { Sun, CloudSun, Cloud, Sprout } from 'lucide-react';
import { BED_COLOR_HEX, BED_TYPES, type BedColor, type BedType, type SunExposure, type DedicatedGroup, type RotationMode } from '../../lib/grow/server/beds';
import { ROTATION_GROUP_LABELS } from '../../lib/grow/bedIntelligenceTypes';
import { getSeasonalTint } from '../../lib/grow/seasonalColors';

export type BedStatus = 'empty' | 'healthy' | 'approaching_harvest' | 'ready_to_harvest';

interface BedCardProps {
  id: string;
  name: string;
  type: BedType;
  color: BedColor;
  plantCount: number;
  plantSummary?: string;
  sunExposure?: SunExposure | null;
  lastActivity?: string | null;
  isNew?: boolean;
  bedStatus?: BedStatus;
  rotationMode?: RotationMode | null;
  dedicatedGroup?: DedicatedGroup | null;
}

const STATUS_RING_CLASS: Record<BedStatus, string> = {
  empty: '',
  healthy: 'ring-1 ring-green-300/50',
  approaching_harvest: 'ring-1 ring-amber-400/60',
  ready_to_harvest: 'ring-2 ring-yellow-500',
};

const SUN_ICONS: Record<SunExposure, React.ReactNode> = {
  full_sun: <Sun className="h-3.5 w-3.5 text-amber-500" />,
  partial_shade: <CloudSun className="h-3.5 w-3.5 text-amber-400" />,
  full_shade: <Cloud className="h-3.5 w-3.5 text-slate-400" />,
};

const GROUP_EMOJI: Record<DedicatedGroup, string> = {
  brassica: '🥬',
  legume: '🫛',
  root_allium: '🥕',
  solanaceae: '🍅',
  cucurbit: '🎃',
};

export function BedCard({ id, name, type, color, plantCount, plantSummary, sunExposure, lastActivity, isNew, bedStatus, rotationMode, dedicatedGroup }: BedCardProps) {
  const hexColor = BED_COLOR_HEX[color] || BED_COLOR_HEX.terracotta;
  const seasonal = getSeasonalTint();
  const statusRing = bedStatus ? STATUS_RING_CLASS[bedStatus] : '';

  return (
    <Link href={`/grow/garden/beds/${id}`} className="block">
      <Card
        className={`overflow-hidden transition-transform active:scale-[0.98] hover:shadow-md ${
          isNew ? 'motion-safe:animate-sprout motion-reduce:animate-fade-in' : ''
        } ${statusRing}`}
      >
        <div className="h-1.5" style={{ backgroundColor: hexColor }} />
        <CardContent className="p-4" style={{ backgroundColor: seasonal.backgroundColor }}>
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-semibold text-sm truncate">{name}</h3>
            {sunExposure && SUN_ICONS[sunExposure]}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {BED_TYPES[type] || type}
          </p>
          {rotationMode === 'rotating' && dedicatedGroup && (
            <p className="text-[10px] mt-0.5 text-green-700 font-medium">
              {GROUP_EMOJI[dedicatedGroup]} {ROTATION_GROUP_LABELS[dedicatedGroup]} {new Date().getFullYear()}
            </p>
          )}
          <p className="text-xs mt-2 flex items-center gap-1 truncate" style={{ color: plantCount > 0 ? hexColor : undefined }}>
            {plantCount === 0 ? (
              <span className="text-muted-foreground">Empty</span>
            ) : (
              <>
                <Sprout className="h-3.5 w-3.5 shrink-0" />
                {plantSummary || `${plantCount} plant${plantCount !== 1 ? 's' : ''}`}
              </>
            )}
          </p>
          {lastActivity && (
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{lastActivity}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
