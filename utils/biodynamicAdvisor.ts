// src/utils/biodynamicAdvisor.ts
// British English messaging. No external ephemeris; simple, robust heuristics.

import type { MoonPhase } from '@/data/biodynamicPhaseRules';
import { biodynamicByPhase } from '@/data/biodynamicPhaseRules';

// ---- Types ------------------------------------------------------------------

export interface WeatherSnapshot {
  /** Air temperature in °C (current or daytime max) */
  temperature?: number;
  /** Overnight minimum in °C (helps recommend frost caution) */
  minTemperature?: number;
  /** Precipitation in mm over the next few hours / today */
  precipitation?: number;
  /** Mean wind speed in km/h (surface) */
  windSpeed?: number;
  /** Gust speed in km/h */
  gust?: number;
  /** Soil temperature at 5–10 cm in °C (optional if you have it) */
  soilTemperature?: number;
  /** Boolean if frost is likely (optional shortcut from provider) */
  frostRisk?: boolean;
  /** Relative humidity % (optional) */
  humidity?: number;
}

export interface Advice {
  dateISO: string;
  phase: MoonPhase;
  phaseTitle: string;
  recommendedTasks: string[]; // from biodynamic table (raw)
  blockers: string[];         // specific weather-based reasons
  nudges: string[];           // alternatives / mitigations
  summary: string;            // one-line UX string
}

// ---- Lunar phase helper (same mapping as your MoonNugget) -------------------

function getLunarPhase(date = new Date()): MoonPhase {
  const synodic = 29.530588;
  const epoch = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC
  const now = date.getTime();
  const days = (now - epoch) / (1000 * 60 * 60 * 24);
  const phase = ((days % synodic) + synodic) % synodic;
  const eighth = synodic / 8;

  if (phase < 0.5 * eighth) return 'new';
  if (phase < 1.5 * eighth) return 'waxing_crescent';
  if (phase < 2.5 * eighth) return 'first_quarter';
  if (phase < 3.5 * eighth) return 'waxing_gibbous';
  if (phase < 4.5 * eighth) return 'full';
  if (phase < 5.5 * eighth) return 'waning_gibbous';
  if (phase < 6.5 * eighth) return 'last_quarter';
  if (phase < 7.5 * eighth) return 'waning_crescent';
  return 'new';
}

// ---- Configurable guardrails (tweak to your climate/UI) ---------------------

export interface Guardrails {
  tooColdAir: number;          // °C: sowing/transplant caution
  tooColdSoil: number;         // °C: root germination caution
  frostStrikeMin: number;      // °C: overnight frost hazard
  tooWet: number;              // mm precipitation threshold
  tooWindy: number;            // km/h: general garden work awkward
  tooGusty: number;            // km/h: staking/sheets risk
  heatStress: number;          // °C: avoid transplanting midday
}

export const DEFAULT_GUARDRAILS: Guardrails = {
  tooColdAir: 6,
  tooColdSoil: 7,
  frostStrikeMin: 1,
  tooWet: 8,
  tooWindy: 40,
  tooGusty: 55,
  heatStress: 30,
};

// ---- Core advisor -----------------------------------------------------------

export function getDailyBiodynamicAdvice(
  weather: WeatherSnapshot,
  date = new Date(),
  rules = biodynamicByPhase,
  limits: Guardrails = DEFAULT_GUARDRAILS
): Advice {
  const phase = getLunarPhase(date);
  const rule = rules[phase];
  const recs = [...(rule?.tasks ?? [])];
  const blockers: string[] = [];
  const nudges: string[] = [];

  const t = weather.temperature ?? 0;
  const tMin = weather.minTemperature ?? undefined;
  const soilT = weather.soilTemperature ?? undefined;
  const rain = weather.precipitation ?? 0;
  const wind = weather.windSpeed ?? 0;
  const gust = weather.gust ?? 0;

  // Cold / frost
  const frostLikely = weather.frostRisk || (tMin != null && tMin <= limits.frostStrikeMin);
  if (frostLikely) {
    blockers.push('overnight frost risk');
    nudges.push('Start seeds indoors or use cloches/fleece');
  } else if (t < limits.tooColdAir) {
    blockers.push(`air temperature low (${round1(t)} °C)`);
    nudges.push('Favour indoor starts or wait for a warmer window');
  }
  if (soilT != null && soilT < limits.tooColdSoil) {
    blockers.push(`soil still cold (${round1(soilT)} °C)`);
    nudges.push('Pre-warm beds with covers; choose cold-tolerant varieties');
  }

  // Wet
  if (rain > limits.tooWet) {
    blockers.push(`heavy rain (${round1(rain)} mm)`);
    nudges.push('Avoid sowing into waterlogged beds; do tool care or planning');
  }

  // Wind
  if (gust > limits.tooGusty) {
    blockers.push(`very gusty (${round0(gust)} km/h)`);
    nudges.push('Defer tall staking or fleece; secure tunnels & covers');
  } else if (wind > limits.tooWindy) {
    blockers.push(`windy (${round0(wind)} km/h)`);
    nudges.push('Sheltered tasks only; firm in recent transplants');
  }

  // Heat
  if (t >= limits.heatStress) {
    blockers.push(`heat stress likely (${round1(t)} °C)`);
    nudges.push('Transplant in the evening; irrigate and provide shade');
  }

  // Build the one-liner
  const phaseName = rule?.title ?? phaseToPretty(phase);
  const fav = firstPhrase(rule?.tasks) ?? 'garden tasks';
  let summary: string;

  if (blockers.length) {
    const firstBlock = blockers[0];
    const nudge = nudges[0] ? ` ${capitalise(nudges[0])}.` : '';
    summary = `Biodynamic gardeners favour ${fav.toLowerCase()} under ${phaseName.toLowerCase()}, but today’s probably not ideal — ${firstBlock}.` + nudge;
  } else {
    summary = `Lovely for biodynamic rhythm: ${phaseName}. ${favourLine(phase)}${weatherLine(weather)}`;
  }

  return {
    dateISO: date.toISOString().slice(0, 10),
    phase,
    phaseTitle: phaseName,
    recommendedTasks: recs,
    blockers,
    nudges,
    summary,
  };
}

// ---- Helpers ----------------------------------------------------------------

function round1(n: number) { return Math.round(n * 10) / 10; }
function round0(n: number) { return Math.round(n); }

function firstPhrase(tasks?: string[]) {
  if (!tasks || !tasks.length) return undefined;
  // Keep it short (strip parentheticals)
  return tasks[0].replace(/\s*\\(.*?\\)\s*/g, '').replace(/\.$/, '');
}

function phaseToPretty(p: MoonPhase): string {
  return ({
    new: 'New Moon — start & settle',
    waxing_crescent: 'Waxing Crescent — build above-ground growth',
    first_quarter: 'First Quarter — momentum',
    waxing_gibbous: 'Waxing Gibbous — refine & support',
    full: 'Full Moon — peak sap',
    waning_gibbous: 'Waning Gibbous — root focus',
    last_quarter: 'Last Quarter — reduce & control',
    waning_crescent: 'Waning Crescent — reset & prepare',
  } as Record<MoonPhase, string>)[p];
}

function favourLine(phase: MoonPhase): string {
  const map: Record<MoonPhase, string> = {
    new: 'Favour sowing leafy salads and gentle transplants.',
    waxing_crescent: 'Favour sowing fruiting annuals and training climbers.',
    first_quarter: 'Favour successive sowings and light grafting.',
    waxing_gibbous: 'Favour staking, support and pre-full flower/fruit work.',
    full: 'Favour harvesting leafy crops and cut flowers.',
    waning_gibbous: 'Favour root crops, compost turning and soil amendments.',
    last_quarter: 'Favour weeding, pruning and restraint.',
    waning_crescent: 'Favour bed prep, tool care and storage.',
  };
  return map[phase] ? map[phase] + ' ' : '';
}

function weatherLine(w: WeatherSnapshot): string {
  const bits: string[] = [];
  if (w.temperature != null) bits.push(`${round1(w.temperature)} °C`);
  if (w.precipitation != null) bits.push(`${round1(w.precipitation)} mm`);
  if (w.windSpeed != null) bits.push(`${round0(w.windSpeed)} km/h wind`);
  return bits.length ? ` (today ~ ${bits.join(', ')}).` : '';
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}