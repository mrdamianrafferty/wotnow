// utils/getSoilCondition.ts

/**
 * Convert surface soil moisture (m³/m³) into a simple phrase.
 * Keeps it concise (≤ 4 words) and in WotNow tone of voice.
 *
 * Typical usage:
 *   const label = getSoilCondition(0.28); // "Ground is soft"
 */
export function getSoilCondition(moisture: number): string {
  if (moisture < 0.15) {
    return "Ground's bone dry";
  } else if (moisture < 0.35) {
    return "Ground's nice and soft";
  } else if (moisture < 0.45) {
    return "Watch out, it's muddy";
  } else {
    return "It's a swamp";
  }
}
