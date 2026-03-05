import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '../ui/card';
import { BED_COLOR_HEX, BED_TYPES, type BedColor, type BedType } from '../../lib/grow/server/beds';

interface BedCardProps {
  id: string;
  name: string;
  type: BedType;
  color: BedColor;
  plantCount: number;
  plantSummary?: string;
  isNew?: boolean;
}

export function BedCard({ id, name, type, color, plantCount, plantSummary, isNew }: BedCardProps) {
  const hexColor = BED_COLOR_HEX[color] || BED_COLOR_HEX.terracotta;

  return (
    <Link href={`/grow/garden/beds/${id}`} className="block">
      <Card
        className={`overflow-hidden transition-transform active:scale-[0.98] hover:shadow-md ${
          isNew ? 'motion-safe:animate-sprout motion-reduce:animate-fade-in' : ''
        }`}
      >
        <div className="h-1" style={{ backgroundColor: hexColor }} />
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm truncate">{name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {BED_TYPES[type] || type}
          </p>
          <p className="text-xs mt-2 truncate" style={{ color: hexColor }}>
            {plantCount === 0
              ? 'Empty'
              : plantSummary || `${plantCount} plant${plantCount !== 1 ? 's' : ''}`}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
