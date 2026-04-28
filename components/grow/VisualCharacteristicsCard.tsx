import React from 'react';
import { Flower2, Apple, Leaf, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { PlantSpecies } from '../../lib/grow/species';
import { formatSeason } from '../../lib/grow/formatters';

interface VisualCharacteristicsCardProps {
  species: PlantSpecies;
}

function ColorBadges({ colors }: { colors: string[] }) {
  const colorMap: Record<string, string> = {
    red: 'bg-red-100 text-red-800',
    pink: 'bg-pink-100 text-pink-800',
    orange: 'bg-orange-100 text-orange-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-fuchsia-100 text-fuchsia-900',
    white: 'bg-gray-100 text-gray-800',
    cream: 'bg-amber-50 text-amber-800',
    brown: 'bg-amber-100 text-amber-800',
    black: 'bg-gray-800 text-gray-100',
  };

  return (
    <div className="flex flex-wrap gap-1">
      {colors.map((color) => {
        const colorClass = colorMap[color.toLowerCase()] || 'bg-gray-100 text-gray-800';
        return (
          <Badge key={color} variant="outline" className={`${colorClass} text-[10px] px-1.5 py-0`}>
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </Badge>
        );
      })}
    </div>
  );
}

interface CharacteristicItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subValue?: string | null;
}

function CharacteristicItem({ icon, label, value, subValue }: CharacteristicItemProps) {
  return (
    <div className="flex items-start gap-2 p-2">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[var(--gd-cream-deep)] flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="font-medium text-sm leading-tight">{value}</div>
        {subValue && (
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{subValue}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Displays visual characteristics of a plant species including
 * flowering, fruiting, leaf colors, and edibility.
 * Uses a 2-column grid layout for compact display.
 */
export function VisualCharacteristicsCard({ species }: VisualCharacteristicsCardProps) {
  const hasFlowers = species.flowers && (species.flowerColor || species.floweringSeason);
  const hasFruits = species.fruits && (species.fruitColor.length > 0 || species.harvestSeason);
  const hasLeaves = species.leafColor.length > 0;
  const hasCulinary = species.cuisine && species.cuisineList;
  const hasCones = species.cones;

  // Build array of characteristics to display
  const characteristics: CharacteristicItemProps[] = [];

  if (hasFlowers) {
    characteristics.push({
      icon: <Flower2 className="h-4 w-4 text-pink-500" />,
      label: 'Flowers',
      value: (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-pink-600 text-sm">Yes</span>
          {species.flowerColor && (
            <Badge variant="outline" className="bg-pink-50 text-pink-700 text-[10px] px-1.5 py-0">
              {species.flowerColor}
            </Badge>
          )}
        </div>
      ),
      subValue: species.floweringSeason ? `Blooms in ${formatSeason(species.floweringSeason)}` : null,
    });
  }

  if (hasFruits) {
    characteristics.push({
      icon: <Apple className="h-4 w-4 text-red-500" />,
      label: 'Fruits',
      value: (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-red-600 text-sm">Yes</span>
            {species.edibleFruit && (
              <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
                Edible
              </Badge>
            )}
          </div>
          {species.fruitColor.length > 0 && <ColorBadges colors={species.fruitColor} />}
        </div>
      ),
      subValue: species.harvestSeason
        ? `Harvest: ${formatSeason(species.harvestSeason)}`
        : species.edibleFruitTasteProfile
          ? `Taste: ${species.edibleFruitTasteProfile}`
          : null,
    });
  }

  if (hasLeaves) {
    characteristics.push({
      icon: <Leaf className="h-4 w-4 text-green-500" />,
      label: 'Foliage',
      value: (
        <div className="space-y-1">
          {species.edibleLeaf && (
            <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
              Edible Leaves
            </Badge>
          )}
          <ColorBadges colors={species.leafColor} />
        </div>
      ),
      subValue: species.edibleLeafTasteProfile ? `Taste: ${species.edibleLeafTasteProfile}` : null,
    });
  }

  if (hasCulinary) {
    characteristics.push({
      icon: <span className="text-base">🍳</span>,
      label: 'Culinary',
      value: (
        <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">
          Culinary Use
        </Badge>
      ),
      subValue: species.cuisineList,
    });
  }

  if (hasCones) {
    characteristics.push({
      icon: <span className="text-base">🌲</span>,
      label: 'Cones',
      value: <span className="text-green-700 text-sm">Produces cones</span>,
    });
  }

  if (characteristics.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-5 w-5 text-[var(--gd-moss)]" />
          Visual Characteristics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-1">
          {characteristics.map((char, index) => (
            <CharacteristicItem key={index} {...char} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
