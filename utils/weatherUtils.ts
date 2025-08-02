export function getBeaufortExplanation(windKmh: number): string {
  if (windKmh < 2) return "Calm: Smoke rises vertically, sea like a mirror.";
  if (windKmh < 6) return "Light air: Ripples with the appearance of scales are formed, but without foam crests.";
  if (windKmh < 12) return "Light breeze: Small wavelets, still short but more pronounced; crests have a glassy appearance but do not break.";
  if (windKmh < 20) return "Gentle breeze: Large wavelets; crests begin to break; scattered whitecaps.";
  if (windKmh < 29) return "Moderate breeze: Small branches move, dust and loose paper are raised; waves become longer; fairly frequent white horses.";
  if (windKmh < 39) return "Fresh breeze: Small trees in leaf begin to sway; waves moderate, many white horses, some spray.";
  if (windKmh < 50) return "Strong breeze: Large branches in motion; whistling heard in overhead wires; umbrellas used with difficulty; waves larger, white foam crests more extensive.";
  if (windKmh < 62) return "Near gale: Whole trees in motion; inconvenience felt when walking against wind; sea heaps up, white foam from breaking waves begins to be blown in streaks along direction of wind.";
  if (windKmh < 75) return "Gale: Twigs break off trees; progress generally impeded; moderately high waves of greater length; edges of crests begin to break into spindrift; foam is blown in well-marked streaks along the direction of the wind.";
  if (windKmh < 89) return "Severe gale: Slight structural damage occurs; high waves; dense streaks of foam along the direction of the wind; sea begins to roll; spray affects visibility.";
  if (windKmh < 103) return "Storm: Trees uprooted; considerable structural damage occurs; very high waves with long overhanging crests; sea is completely white with foam and spray; visibility seriously affected.";
  if (windKmh < 118) return "Violent storm: Exceptionally high waves; sea covered with white foam patches; visibility reduced.";
  return "Hurricane: Air filled with foam and spray; sea completely white with driving spray; visibility very seriously affected.";
}