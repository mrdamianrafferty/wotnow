/**
 * Get Beaufort number from wind speed in m/s (standard internal unit).
 * Converts m/s to km/h for scale calculation.
 */
export function getBeaufortNumber(windMps: number): number {
  // Beaufort scale thresholds in km/h
  const thresholds = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const windKmh = windMps * 3.6;
  for (let i = 0; i < thresholds.length; i++) {
    if (windKmh < thresholds[i]) return i;
  }
  return 12; // Hurricane
}