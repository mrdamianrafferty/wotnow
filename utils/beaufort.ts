export function getBeaufortNumber(windKmh: number): number {
  // Beaufort scale thresholds in km/h
  const thresholds = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  for (let i = 0; i < thresholds.length; i++) {
    if (windKmh < thresholds[i]) return i;
  }
  return 12; // Hurricane
}