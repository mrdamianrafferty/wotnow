import React, { useState, useEffect } from 'react';
import { Droplets, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/button';
import type { WeatherTasksData } from '../../../hooks/useWeatherTasks';

interface SmartNudgeProps {
  weatherData: WeatherTasksData;
  urgentAlertIds: Set<string>;
  t: (value: string) => string;
}

function getSkipKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `grow:nudge-skipped:${today}`;
}

export function SmartNudge({ weatherData, urgentAlertIds, t }: SmartNudgeProps) {
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSkipped(localStorage.getItem(getSkipKey()) === '1');
    }
  }, []);

  if (skipped) return null;

  const handleSkip = () => {
    localStorage.setItem(getSkipKey(), '1');
    setSkipped(true);
  };

  // Priority 1: Watering recommendation
  if (weatherData.wateringRecommendation?.shouldWater) {
    return (
      <section aria-labelledby="nudge-heading">
        <h2 id="nudge-heading" className="sr-only">Smart Nudge</h2>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Droplets className="mt-0.5 h-5 w-5 text-blue-600 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900">
                {t('Your plants need water today')}
              </p>
              <p className="text-xs text-blue-800 mt-0.5 opacity-80">
                {weatherData.wateringRecommendation.reason}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100"
            >
              {t('Skip today')}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Priority 2: Optimal/critical task not already in urgency banner
  const nudgeAlert = weatherData.alerts.find(
    a => (a.severity === 'critical' || a.severity === 'warning') &&
      !urgentAlertIds.has(`weather-${a.type}-${a.forecastDate}`)
  );

  if (nudgeAlert) {
    return (
      <section aria-labelledby="nudge-heading">
        <h2 id="nudge-heading" className="sr-only">Smart Nudge</h2>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">{nudgeAlert.title}</p>
              <p className="text-xs text-amber-800 mt-0.5 opacity-80">
                {nudgeAlert.suggestedAction || nudgeAlert.message}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100"
            >
              {t('Skip today')}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
