import React from 'react';
import { Sparkles } from 'lucide-react';
import type { WeatherTasksData } from '../../../hooks/useWeatherTasks';
import type { SeasonalTint } from '../../../lib/grow/seasonalColors';
import { EditorialBriefing, type VoiceMode } from '../daisy/EditorialBriefing';

interface GardenPulseProps {
  weatherData: WeatherTasksData;
  isPremium: boolean;
  seasonal: SeasonalTint;
  t: (value: string) => string;
}

type ForecastWithDescription = WeatherTasksData['forecast'][number] & {
  description?: string;
};

/* ------------------------------------------------------------------ */
/* Voice-aligned copy builders                                          */
/*                                                                      */
/* These follow the Grow Daisy Editorial Voice Guide (2026-04-28).     */
/* Register: Daily Nudge — brief, warm, practical.                     */
/* One clear observation tied to one implied action.                   */
/* Active sentences. Specific where it counts.                         */
/*                                                                      */
/* IMPORTANT: these are weather-data-driven fallbacks. Where a         */
/* human-written or model-reviewed briefing is available it should     */
/* replace this function entirely — these exist so the panel is never  */
/* empty, not as a substitute for genuine editorial voice.             */
/* ------------------------------------------------------------------ */

/**
 * Returns the dominant weather character for today — the one fact that shapes
 * the gardening decision. Not a summary of everything; one thing.
 */
function buildWeatherSentence(today: ForecastWithDescription): string {
  const temp = Math.round(today.tempMax);
  const rain = today.precipitation;
  const desc = today.description?.toLowerCase() ?? '';

  // Frost / very cold
  if (today.tempMin !== undefined && Math.round(today.tempMin) <= 1) {
    return `Overnight temperatures are brushing zero — keep tender things under cover and hold back on planting out.`;
  }

  // Heavy rain
  if (rain >= 10) {
    return `Heavy rain expected today. Leave the borders alone; digging wet soil does more harm than good.`;
  }

  // Dry and warm — best planting window
  if (temp >= 18 && rain < 1) {
    return `Dry and warm, with a high of ${temp}°C. A good afternoon for transplanting — water in well and they should settle quickly.`;
  }

  // Mild and damp — the Monty Don planting sweet spot
  if (temp >= 10 && temp < 18 && rain > 0 && rain < 5) {
    return `Mild and damp today, with a high of ${temp}°C — good conditions for planting out hardy seedlings. The rain will do some of the settling in for you.`;
  }

  // Hot and dry — watering priority
  if (temp >= 22 && rain < 1) {
    return `${temp}°C and dry. Check containers and shallow-rooted beds by midday — they will not wait until evening.`;
  }

  // Windy conditions
  if (desc.includes('wind') || desc.includes('gust')) {
    return `Wind in the forecast today. Tie in climbers, stake anything tall, and hold off on fine sowing until it settles.`;
  }

  // Dull and cool — low-action day
  if (temp < 10) {
    return `Cool and grey today, a high of ${temp}°C. A good day for indoor work — potting on, seed sorting, or letting the garden rest.`;
  }

  // Default: give the temperature and a useful implication
  return desc
    ? `${desc.charAt(0).toUpperCase() + desc.slice(1)} today, with a high of ${temp}°C.`
    : `A high of ${temp}°C today.`;
}

/**
 * Returns a soil sentence when premium soil data is available.
 * Written in the Beth Chatto / conditions-first register.
 */
function buildSoilSentence(soilTemp: number): string {
  if (soilTemp >= 12) {
    return `Soil is at ${soilTemp}°C — warm enough for most sowings, including the tender ones.`;
  }
  if (soilTemp >= 8) {
    return `Soil at ${soilTemp}°C. Hardy seeds will take; hold the tender things a little longer.`;
  }
  if (soilTemp >= 5) {
    return `Soil at ${soilTemp}°C — the warmth is coming, but slowly. Sow under glass for now.`;
  }
  return `Soil is still cold at ${soilTemp}°C. No sowing yet; let it warm in its own time.`;
}

/**
 * Returns the dominant voice mode based on conditions.
 * Used to set the visual accent on the briefing panel.
 */
function resolveVoiceMode(today: ForecastWithDescription): VoiceMode {
  const isUrgent =
    (today.tempMin !== undefined && Math.round(today.tempMin) <= 1) ||
    today.precipitation >= 10;
  return isUrgent ? 'coach' : 'nudge';
}

/** Format today's date as the kicker, e.g. "Garden Pulse · Mon 28 Apr" */
function buildKicker(label: string): string {
  const d = new Date();
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${label} · ${day}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function GardenPulse({ weatherData, isPremium, seasonal, t }: GardenPulseProps) {
  // seasonal retained for future zone-tint use; suppress unused-var lint
  void seasonal;

  const today = (weatherData.forecast as ForecastWithDescription[])[0];
  if (!today) return null;

  const soilTemp =
    isPremium && weatherData.soil.temperature6cm > 0
      ? Math.round(weatherData.soil.temperature6cm)
      : null;

  const weatherSentence = buildWeatherSentence(today);
  const soilSentence = soilTemp !== null ? buildSoilSentence(soilTemp) : null;
  const mode = resolveVoiceMode(today);

  const showSoilUpsell = !isPremium && weatherData.soil.temperature6cm > 0;

  // Attribution: name the zone when available, not just "weather data"
  // The zone string comes from user preferences; fall back gracefully.
  const attribution = [
    t('Garden Pulse'),
    'forecast data',
  ].join(' · ');

  return (
    <section aria-labelledby="pulse-heading">
      <h2 id="pulse-heading" className="sr-only">{t('Garden Pulse')}</h2>

      <EditorialBriefing
        kicker={buildKicker(t('Garden Pulse'))}
        source="derived"
        mode={mode}
        body={
          <>
            {weatherSentence}
            {soilSentence && (
              <>{' '}{soilSentence}</>
            )}
            {showSoilUpsell && (
              <span
                className="block mt-3"
                style={{
                  fontFamily: 'var(--gd-font-sans)',
                  fontStyle: 'normal',
                  fontSize: 11,
                  color: 'var(--gd-stone-warm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Sparkles size={10} aria-hidden="true" />
                Soil temperature insights available with Bloom+
              </span>
            )}
          </>
        }
        attribution={attribution}
      />
    </section>
  );
}
