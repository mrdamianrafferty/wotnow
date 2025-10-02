// utils/currentStrength.ts

/**
 * Convert sea surface current speed (m/s) into a descriptive strength label.
 *
 * @param speedMS Current speed in metres per second
 * @returns One of: "Very weak current" | "Weak current" | "Moderately strong current" | "Strong current" | "Very strong current"
 */
export function classifyCurrentStrength(speedMS: number | null | undefined): string {
  if (speedMS === null || speedMS === undefined || speedMS < 0) {
    return "No data";
  }

  if (speedMS < 0.25) {
    return "Very weak current";
  } else if (speedMS < 0.5) {
    return "Weak";
  } else if (speedMS < 1.0) {
    return "Moderately strong current";
  } else if (speedMS < 1.5) {
    return "Strong current";
  } else {
    return "Beware very strong currents!";
  }
}