export function marineConditionsSummary(waveHeight?: number, windSpeedKmh?: number): string {
  if (waveHeight == null || windSpeedKmh == null) return "Marine conditions unavailable";
  const windSpeed = windSpeedKmh / 1.852; // convert km/h to knots
  if (waveHeight < 0.1 && windSpeed < 2) return "It's dead calm";
  if (waveHeight < 0.3 && windSpeed < 5) return "Almost calm";
  if (waveHeight < 0.7 && windSpeed < 10) return "It's calm";
  if (waveHeight < 1.2 && windSpeed < 15) return "Gentle breeze and small waves";
  if (waveHeight < 1.8 && windSpeed < 20) return "Getting choppy";
  if (waveHeight < 3.0 && windSpeed < 28) return "It's choppy";
  if (waveHeight < 5.0 && windSpeed < 40) return "Winds picking up, rough seas";
  return "It's stormy";
}