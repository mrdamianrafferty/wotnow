

// utils/weatherBackground.ts
// Minimal, dependency‑free resolver that maps unified weather inputs → CSS class hints.
// Works with components/WeatherAnimationLayer.tsx and your windwave.css helpers.
// British English comments.

export type Condition =
  | 'clear'
  | 'cloudy'
  | 'overcast'
  | 'drizzle'
  | 'rain'
  | 'storm'
  | 'snow'
  | 'fog'
  | 'marine_calm'
  | 'marine_choppy'
  | 'marine_storm';

export type BackgroundPickArgs = {
  condition: Condition;
  cloudPct?: number;          // 0..100
  waveHeightM?: number;       // metres
  windSpeedMS?: number;       // m/s (used for Beaufort proxy)
  isMarine?: boolean;         // true if the location is coastal/sea
  applyBeaufortToInland?: boolean; // allow lake/river waves based on wind
};

export type BackgroundPick = {
  showClouds: boolean;
  cloudsClass?: string;       // e.g. 'wa-clouds'
  showWaves: boolean;
  wavesClass?: string;        // e.g. 'wa-waves' (could be extended to variants)
};

// --- Beaufort plumbing (optional hook) ---------------------------------------
// Consumers can inject their own Beaufort calculator (e.g., a precise library).
let beaufortResolver: (windMS?: number) => number = (windMS?: number) => {
  if (windMS == null) return 0;
  const ms = Math.max(0, windMS);
  // Approx mapping m/s → Beaufort number 0..12
  if (ms < 0.3) return 0;   // Calm
  if (ms < 1.6) return 1;   // Light air
  if (ms < 3.4) return 2;   // Light breeze
  if (ms < 5.5) return 3;   // Gentle breeze
  if (ms < 8.0) return 4;   // Moderate breeze
  if (ms < 10.8) return 5;  // Fresh breeze
  if (ms < 13.9) return 6;  // Strong breeze
  if (ms < 17.2) return 7;  // Near gale
  if (ms < 20.8) return 8;  // Gale
  if (ms < 24.5) return 9;  // Strong gale
  if (ms < 28.5) return 10; // Storm
  if (ms < 32.7) return 11; // Violent storm
  return 12;                 // Hurricane force
};

export function setBeaufortResolver(fn: (windMS?: number) => number) {
  beaufortResolver = fn;
}

// --- Core classifier ---------------------------------------------------------
export function pickBackgroundClasses(args: BackgroundPickArgs): BackgroundPick {
  const {
    condition,
    cloudPct = 0,
    waveHeightM,
    windSpeedMS,
    isMarine = false,
    applyBeaufortToInland = false,
  } = args;

  // Decide on clouds
  const cloudsByCond = (
    condition === 'cloudy' ||
    condition === 'overcast' ||
    condition === 'drizzle' ||
    condition === 'rain' ||
    condition === 'storm' ||
    condition === 'snow' ||
    condition === 'fog'
  );
  const showClouds = cloudsByCond || cloudPct >= 20;

  // Decide on waves (explicit marine_* OR thresholds)
  let waves = false;
  if (condition === 'marine_calm' || condition === 'marine_choppy' || condition === 'marine_storm') {
    waves = true;
  }
  const bft = beaufortResolver(windSpeedMS);
  // Show waves if: marine and >0.3 m, or Beaufort whitecaps (~Bft 4+) in marine or opted inland.
  if ((isMarine || applyBeaufortToInland) && (waveHeightM != null && waveHeightM > 0.3)) waves = true;
  if ((isMarine || applyBeaufortToInland) && bft >= 4) waves = true;

  // Base classes — you can extend to variants like 'wa-waves--choppy' using bft/height.
  const pick: BackgroundPick = {
    showClouds,
    cloudsClass: showClouds ? 'wa-clouds' : undefined,
    showWaves: waves,
    wavesClass: waves ? 'wa-waves' : undefined,
  };

  return pick;
}

// --- Optional extension: variant selection (example) -------------------------
// If you later want intensity variants, uncomment and use this helper instead
// of 'wa-waves' above.
/*
function wavesVariantClass(waveHeightM?: number, bft?: number): string | undefined {
  if (waveHeightM == null && bft == null) return undefined;
  const level = Math.max(
    waveHeightM != null ? (waveHeightM < 0.6 ? 1 : waveHeightM < 1.5 ? 2 : 3) : 0,
    bft != null ? (bft < 5 ? 1 : bft < 8 ? 2 : 3) : 0
  );
  return level === 1 ? 'wa-waves--calm'
       : level === 2 ? 'wa-waves--choppy'
       : 'wa-waves--storm';
}
*/