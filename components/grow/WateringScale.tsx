import React from 'react';
import { Droplets } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { PlantSpecies, WateringBenchmark } from '../../lib/grow/species';

interface WateringScaleProps {
  species: Pick<PlantSpecies, 'watering' | 'wateringPeriod' | 'wateringBenchmark'>;
  showBenchmark?: boolean;
}

const wateringLevels: Record<string, { level: number; color: string; label: string }> = {
  'Frequent': { level: 4, color: 'bg-blue-500', label: 'High water needs' },
  'Average': { level: 3, color: 'bg-blue-400', label: 'Moderate water needs' },
  'Moderate': { level: 2, color: 'bg-blue-300', label: 'Low-moderate water needs' },
  'Minimum': { level: 1, color: 'bg-blue-200', label: 'Drought tolerant' },
  'None': { level: 0, color: 'bg-gray-200', label: 'No watering needed' },
};

function formatBenchmark(benchmark: WateringBenchmark): string {
  const { value, unit } = benchmark;
  if (!value || !unit) return '';
  return `${value} ${unit}`;
}

/**
 * Visual watering level indicator showing plant water requirements.
 * Displays a 4-bar scale with optional benchmark details.
 */
export function WateringScale({ species, showBenchmark = true }: WateringScaleProps) {
  const { watering, wateringPeriod, wateringBenchmark } = species;
  
  if (!watering) {
    return null;
  }

  const info = wateringLevels[watering] || wateringLevels['Average'];
  const bars = [1, 2, 3, 4];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Droplets className="h-4 w-4 text-blue-500" />
          Watering
        </div>
        <Badge variant="secondary" className="text-xs">
          {watering}
        </Badge>
      </div>
      
      {/* Visual scale */}
      <div className="flex gap-1">
        {bars.map((bar) => (
          <div
            key={bar}
            className={`h-2 flex-1 rounded-full transition-colors ${
              bar <= info.level ? info.color : 'bg-gray-100'
            }`}
          />
        ))}
      </div>
      
      <p className="text-xs text-gray-500">{info.label}</p>
      
      {/* Benchmark details */}
      {showBenchmark && wateringBenchmark && (
        <div className="text-xs text-gray-600 space-y-1">
          {wateringPeriod && (
            <p>
              <span className="font-medium">Frequency:</span> {wateringPeriod}
            </p>
          )}
          {wateringBenchmark.value && (
            <p>
              <span className="font-medium">Amount:</span> {formatBenchmark(wateringBenchmark)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
