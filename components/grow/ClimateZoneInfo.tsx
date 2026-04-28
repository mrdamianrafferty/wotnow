import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Snowflake,
  ThermometerSun,
  Leaf,
} from 'lucide-react';
import {
  type ClimateZoneCode,
  getClimateZoneInfo,
  getClimateZonePlantingAdvice,
  getClimateZoneFrostDates,
} from '../../lib/grow/climate';

interface ClimateZoneInfoProps {
  climateZone: ClimateZoneCode;
  variant?: 'full' | 'compact' | 'badge-only';
}

export function ClimateZoneInfo({ climateZone, variant = 'compact' }: ClimateZoneInfoProps) {
  const zoneInfo = getClimateZoneInfo(climateZone);
  const plantingAdvice = getClimateZonePlantingAdvice(climateZone);
  const frostDates = getClimateZoneFrostDates(climateZone);
  const bestPlants = (plantingAdvice.bestPlants ?? []) as string[];
  const avoidPlants = (plantingAdvice.avoidPlants ?? []) as string[];
  const specialConsiderations = (plantingAdvice.specialConsiderations ?? []) as string[];

  if (variant === 'badge-only') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
        {getClimateIcon(climateZone)}
        <span className="ml-1">{zoneInfo.name}</span>
      </Badge>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="p-3 rounded-lg bg-white border border-l-4 border-l-green-500 border-green-200">
        <div className="flex items-start gap-3">
          <div className="text-3xl">{getClimateIcon(climateZone)}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{zoneInfo.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {climateZone.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{zoneInfo.description}</p>
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="outline" className="bg-white">
                <Snowflake className="h-3 w-3 mr-1" />
                Last frost:{' '}
                {frostDates.lastSpringFrost.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Badge>
              <Badge variant="outline" className="bg-white">
                <Leaf className="h-3 w-3 mr-1" />
                {frostDates.frostFreeDepth} frost-free days
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{getClimateIcon(climateZone)}</span>
          <div>
            <div className="flex items-center gap-2">
              <span>{zoneInfo.name}</span>
              <Badge variant="secondary">{climateZone.replace('_', ' ')}</Badge>
            </div>
            <p className="text-sm font-normal text-muted-foreground mt-1">{zoneInfo.description}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <ThermometerSun className="h-4 w-4" />
            Climate Characteristics
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="text-xs text-blue-700 font-medium mb-1">Winter</div>
              <div className="text-sm">{zoneInfo.characteristics.winterType}</div>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
              <div className="text-xs text-orange-700 font-medium mb-1">Summer</div>
              <div className="text-sm">{zoneInfo.characteristics.summerType}</div>
            </div>
            <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200">
              <div className="text-xs text-cyan-700 font-medium mb-1">Rainfall</div>
              <div className="text-sm">{zoneInfo.characteristics.rainfall}</div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--gd-soil-moist)] border border-[var(--gd-cream-border)]">
              <div className="text-xs text-[var(--gd-leaf)] font-medium mb-1">Growing Season</div>
              <div className="text-sm">{zoneInfo.characteristics.growingSeason}</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Snowflake className="h-4 w-4" />
            Frost Information
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted border">
              <div className="text-xs text-muted-foreground mb-1">Last Spring Frost</div>
              <div className="font-medium">
                {frostDates.lastSpringFrost.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted border">
              <div className="text-xs text-muted-foreground mb-1">First Fall Frost</div>
              <div className="font-medium">
                {frostDates.firstFallFrost.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted border">
              <div className="text-xs text-muted-foreground mb-1">Frost-Free Days</div>
              <div className="font-medium">{frostDates.frostFreeDepth}</div>
            </div>
          </div>
          <div className="mt-2 p-2 rounded bg-yellow-50 border border-yellow-200">
            <p className="text-xs text-yellow-800">
              <strong>Frost Risk:</strong> {zoneInfo.characteristics.frostRisk}
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Leaf className="h-4 w-4" />
            What Grows Best
          </h4>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="text-xs text-green-700 font-medium mb-2">✓ Best Plants</div>
              <div className="flex flex-wrap gap-1">
                {bestPlants.map((plant: string) => (
                  <Badge key={plant} variant="secondary" className="text-xs bg-green-100 text-green-800">
                    {plant}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="text-xs text-red-700 font-medium mb-2">✗ Avoid These</div>
              <div className="flex flex-wrap gap-1">
                {avoidPlants.map((plant: string) => (
                  <Badge key={plant} variant="secondary" className="text-xs bg-red-100 text-red-800">
                    {plant}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">💡 Special Considerations</h4>
          <ul className="space-y-2">
            {specialConsiderations.map((tip: string, index: number) => (
              <li key={`${index}-${tip}`} className="text-sm flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function getClimateIcon(climateZone: ClimateZoneCode): string {
  const icons: Record<ClimateZoneCode, string> = {
    atlantic_mild: '🌊',
    cool_maritime: '☁️',
    continental_cool: '🌲',
    med_marine: '☀️',
    southern_hot_dry: '🏜️',
    mountain_cool: '⛰️',
  };
  return icons[climateZone];
}
