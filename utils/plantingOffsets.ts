export type CropWarmth = 'cool' | 'warm';

const CROP_WARMTH: Record<string, CropWarmth> = {
  Tomato: 'warm', Courgette: 'warm', 'Runner Bean': 'warm', 'French Bean (dwarf)': 'warm',
  Pepper: 'warm', Sweetcorn: 'warm',
  Lettuce: 'cool', Pea: 'cool', Carrot: 'cool', Beetroot: 'cool', Kale: 'cool', 'Spring Onion': 'cool',
};

export function soilThresholdFor(crop: string): number {
  // RHS-style gates: cool ~7 °C, warm-lovers ~10 °C (adjust per crop if you have specifics)
  return (CROP_WARMTH[crop] === 'warm') ? 10 : 7;
}

export function computeElevationSoilOffsetDays(input: {
  crop: string;
  elevationM?: number;                 // now available
  dailyMeanT?: number[];               // recent 30-day mean air temps (Open-Meteo)
  dailySoilT0cm?: number[];            // recent 30-day mean soil temps (Open-Meteo)
  dailyDatesISO?: string[];            // matching dates
  lapsePerM?: number;                  // override, default 0.005 (0.5 °C / 100 m)
}): { days: number; reason: string } {
  const threshold = soilThresholdFor(input.crop);
  const dates = Array.isArray(input.dailyDatesISO) ? input.dailyDatesISO : [];
  const soil = Array.isArray(input.dailySoilT0cm) ? input.dailySoilT0cm : [];
  const air  = Array.isArray(input.dailyMeanT) ? input.dailyMeanT : [];
  const warmth = CROP_WARMTH[input.crop] || 'cool';

  // 1) Primary: soil gate — find first day soil >= threshold
  if (dates.length && soil.length === dates.length) {
    const i = soil.findIndex(v => typeof v === 'number' && v >= threshold);
    if (i >= 0) {
      const when = dates[i];
      return { days: 0, reason: `Soil ≥ ${threshold} °C on ${when} — no elevation delay applied` };
    }
  }

  // 2) Fallback: altitude → ΔT → days using recent warming rate
  const L = typeof input.lapsePerM === 'number' ? input.lapsePerM : 0.005; // 0.5 °C per 100 m (Met Office UK)
  const elev = Math.max(0, Number(input.elevationM ?? 0));
  const dT = elev * L; // °C deficit due to altitude

  // Warming slope °C/day from recent air temps (robust median of day-to-day diffs)
  const diffs = air.slice(1).map((v, i) => v - air[i]).filter(Number.isFinite).sort((a,b)=>a-b);
  const slope = diffs.length ? diffs[Math.floor(diffs.length / 2)] : 0.3; // fallback ~0.3 °C/day

  let days = slope > 0 ? Math.round(dT / slope) : Math.round(dT / 0.3);
  // Scale by crop warmth (cool crops less sensitive)
  if (warmth === 'cool') days = Math.round(days * 0.65);

  // Clamp to a sensible band
  days = Math.max(-10, Math.min(21, days));

  const reason = `Altitude penalty ~${dT.toFixed(1)} °C (${(L*100).toFixed(1)} °C/100 m), ` +
                 `local warming ~${slope.toFixed(2)} °C/day ⇒ ${days} day offset (${warmth})`;

  return { days, reason };
}

// ---- Elevation/soil-driven date shifting helpers ----
export type DatedLabel = 'sowIndoors'|'sowOutdoors'|'transplant'|'harvest';
export interface DatedWindow { label: DatedLabel; startISO: string; endISO: string; }

function shiftISOByDays(iso: string, days: number): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + days);
  // keep to YYYY-MM-DD if input looked like a date-only iso
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return isDateOnly ? d.toISOString().slice(0,10) : d.toISOString();
}

/**
 * Apply elevation/soil offset (in **days**) to a set of planting windows for a given crop.
 * This is intentionally separate from zone-based **week** offsets so you can compose them.
 */
export function applyElevationSoilOffsetToWindows(
  crop: string,
  windows: DatedWindow[],
  ctx: {
    elevationM?: number;
    // recent Open‑Meteo daily series for the last ~30 days
    dailyMeanT?: number[];      // air temperature mean (°C)
    dailySoilT0cm?: number[];   // soil temperature 0 cm (°C)
    dailyDatesISO?: string[];   // matching ISO dates
    lapsePerM?: number;         // override lapse, default 0.005 °C/m
  }
): { windows: DatedWindow[]; days: number; reason: string } {
  const { days, reason } = computeElevationSoilOffsetDays({
    crop,
    elevationM: ctx.elevationM,
    dailyMeanT: ctx.dailyMeanT,
    dailySoilT0cm: ctx.dailySoilT0cm,
    dailyDatesISO: ctx.dailyDatesISO,
    lapsePerM: ctx.lapsePerM,
  });
  if (!days) return { windows, days: 0, reason };
  const shifted = windows.map(w => ({
    ...w,
    startISO: shiftISOByDays(w.startISO, days),
    endISO: shiftISOByDays(w.endISO, days),
  }));
  return { windows: shifted, days, reason };
}

/**
 * Convenience: produce a short human explanation to show in the UI card.
 */
export function elevationOffsetReasonLine(crop: string, details: Parameters<typeof computeElevationSoilOffsetDays>[0]): string {
  const { days, reason } = computeElevationSoilOffsetDays(details);
  if (!days) return `No elevation delay for ${crop.toLowerCase()} — soil is already warm enough.`;
  const sign = days > 0 ? 'later' : 'earlier';
  return `${Math.abs(days)} day ${sign} due to altitude (${reason}).`;
}