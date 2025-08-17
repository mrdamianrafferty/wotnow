import { mpsToKnots } from './weatherUtils';

/**
 * Returns a marine conditions summary. All windSpeed values must be in m/s (internal standard).
 * Converts to knots for display only.
 */
export function marineConditionsSummary(
  waveHeight?: number,
  windSpeedMps?: number
): string {
  if (waveHeight == null || windSpeedMps == null) return "Marine conditions unavailable";

  // Convert m/s to knots for descriptive messages
  const windSpeedKnots = mpsToKnots(windSpeedMps);

  // All thresholds use m/s internally
  if (windSpeedMps > 20) {
    return 'Very strong wind—unsafe for casual sea activities';
  }
  if (waveHeight < 0.1 && windSpeedKnots < 2) return "It's dead calm";
  if (waveHeight < 0.3 && windSpeedKnots < 5) return "Almost calm";
  if (waveHeight < 0.7 && windSpeedKnots < 10) return "It's calm";
  if (waveHeight < 1.2 && windSpeedKnots < 15) return "Gentle breeze and small waves";
  if (waveHeight < 1.8 && windSpeedKnots < 20) return "Getting choppy";
  if (waveHeight < 3.0 && windSpeedKnots < 28) return "It's choppy";
  if (waveHeight < 5.0 && windSpeedKnots < 40) return "Winds picking up, rough seas";
  return "It's stormy";
}