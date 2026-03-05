import React from 'react';
import { CloudSun, Sparkles } from 'lucide-react';
import type { WeatherTasksData } from '../../../hooks/useWeatherTasks';
import type { SeasonalTint } from '../../../lib/grow/seasonalColors';

interface GardenPulseProps {
  weatherData: WeatherTasksData;
  isPremium: boolean;
  seasonal: SeasonalTint;
  t: (value: string) => string;
}

type ForecastWithDescription = WeatherTasksData['forecast'][number] & {
  description?: string;
};

function buildPulseText(
  forecast: ForecastWithDescription[],
  soil: WeatherTasksData['soil'],
  isPremium: boolean,
): string {
  const today = forecast[0];
  if (!today) return '';

  const parts: string[] = [];

  // Temperature + conditions
  const tempHigh = Math.round(today.tempMax);
  const desc = today.description
    ? today.description.charAt(0).toUpperCase() + today.description.slice(1)
    : '';
  parts.push(desc ? `${tempHigh}\u00B0C, ${desc.toLowerCase()}.` : `High of ${tempHigh}\u00B0C today.`);

  // Soil workability
  if (isPremium && soil.temperature6cm > 0) {
    const soilTemp = Math.round(soil.temperature6cm);
    if (soilTemp >= 8) {
      parts.push(`Soil is workable at ${soilTemp}\u00B0C \u2014 good day for planting.`);
    } else if (soilTemp >= 5) {
      parts.push(`Soil at ${soilTemp}\u00B0C \u2014 a bit cold for most sowing.`);
    } else {
      parts.push(`Soil still cold at ${soilTemp}\u00B0C \u2014 hold off on planting.`);
    }
  }

  // Rain note
  if (today.precipitation > 0) {
    const mm = today.precipitation.toFixed(1);
    parts.push(`${mm}mm rain expected.`);
  }

  return parts.join(' ');
}

export function GardenPulse({ weatherData, isPremium, seasonal, t }: GardenPulseProps) {
  const text = buildPulseText(
    weatherData.forecast as ForecastWithDescription[],
    weatherData.soil,
    isPremium,
  );

  if (!text) return null;

  return (
    <section aria-labelledby="pulse-heading">
      <h2 id="pulse-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
        <CloudSun size={16} style={{ color: seasonal.accentColor }} aria-hidden="true" />
        {t('Garden Pulse')}
      </h2>
      <div
        className="rounded-xl border border-border/50 p-4 flex overflow-hidden"
        style={{ backgroundImage: seasonal.gradient }}
      >
        <div
          className="w-1 rounded-full shrink-0 -ml-1 mr-3"
          style={{ backgroundColor: seasonal.accentColor }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground/90 leading-relaxed">{text}</p>
          {!isPremium && weatherData.soil.temperature6cm > 0 && (
            <p className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
              <Sparkles size={10} aria-hidden="true" />
              Soil insights available with Bloom+
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
