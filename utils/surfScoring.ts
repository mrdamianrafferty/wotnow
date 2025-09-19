// surfScoring.ts
// Traffic-light surf grading with safety gates + tide integration.
// NOTE: If beach orientation is stored for this spot, USE IT. If absent, we degrade gracefully.
// NOTE: Tides come from the separate Stormglass Tides API (not the main marine endpoint).

export type Skill = "novice" | "intermediate" | "advanced";

export type Wind = { speedKt: number; directionDeg: number }; // met convention: FROM which it blows
export type Swell = { heightM: number; periodS: number; directionDeg: number };

export type TideInput = {
  tideHeightM: number;       // current tide height vs chart datum
  tideRangeM: number;        // daily (or rolling) high - low
  stage?: "flood" | "ebb" | "slack";
  minutesToTurn?: number;    // + or - to next high/low
};

export type TideProfile = {
  minM: number; maxM: number;
  stageWeight?: { flood?: number; ebb?: number; slack?: number };
  nearTurnBonusMin?: number;     // e.g. 45
  nearTurnBonusWeight?: number;  // e.g. 0.15
  springRangeM?: number;         // e.g. 3.0 => above is “springy”
  name?: string;
};

export type HourlyMarine = {
  ts: string;                     // ISO timestamp
  wind: Wind;
  primary: Swell;
  secondary?: Swell[];
  tide: TideInput;                // from separate Stormglass Tides API
};

export type DayMarine = {
  beachFacingDeg?: number | null; // USE stored orientation if possible
  skill?: Skill;                  // default intermediate
  tideProfile: TideProfile;       // per-spot configuration
  hours: HourlyMarine[];          // full day of hourly marine + tides
};

export type GradeResult = {
  score: number;                   // 0–100
  light: "green" | "amber" | "red";
  unsafe: boolean;
  reasons: string[];
  components: Record<string, number>;
};

export type DayResult = {
  dayLight: "green" | "amber" | "red";
  bestHour: GradeResult & { ts: string } | null; // best slot of the day
  hours: (GradeResult & { ts: string })[];
};

// Helper functions (temporarily inline)
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const smooth = (x: number, x0: number, x1: number) => {
  const t = clamp((x - x0) / (x1 - x0));
  return t * t * (3 - 2 * t);
};

// Compass direction helper functions
const degToCompass = (deg: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(deg / 22.5) % 16];
};

const expandCompassDirection = (shortDir: string): string => {
  const expansions: Record<string, string> = {
    'N': 'North', 'NNE': 'North-Northeast', 'NE': 'Northeast', 'ENE': 'East-Northeast',
    'E': 'East', 'ESE': 'East-Southeast', 'SE': 'Southeast', 'SSE': 'South-Southeast',
    'S': 'South', 'SSW': 'South-Southwest', 'SW': 'Southwest', 'WSW': 'West-Southwest',
    'W': 'West', 'WNW': 'West-Northwest', 'NW': 'Northwest', 'NNW': 'North-Northwest'
  };
  return expansions[shortDir] || shortDir;
};

const formatWindInfo = (speedKt: number, dirDeg: number): string => {
  const rounded = Math.round(speedKt);
  const kmh = Math.round(speedKt * 1.852); // Convert knots to km/h
  const compassDir = degToCompass(dirDeg);
  const fullDir = expandCompassDirection(compassDir);
  
  return `${rounded} knots (${kmh} km/h) from the ${fullDir}`;
};

// ------------ Core scoring pieces ------------
function scorePeriod(periodS: number): number {
  const base = smooth(periodS, 5, 10) * 0.7 + smooth(periodS, 12, 17) * 0.3;
  return clamp(base);
}

function scoreHeight(h: number, skill: Skill = "intermediate"): number {
  const bands = {
    // Soften novice: treat 0.3–0.8 m as viable
    novice:        { low: 0.3, mid: 0.85, high: 1.3 },
    intermediate:  { low: 0.6, mid: 1.3, high: 2.1 },
    advanced:      { low: 1.0, mid: 2.0, high: 3.0 },
  }[skill];

  const up = smooth(h, bands.low, bands.mid);
  const down = 1 - smooth(h, bands.mid, bands.high);
  const bell = Math.min(up, down);
  const tail = smooth(h, bands.high, bands.high + 0.8) * 0.25;
  return clamp(Math.max(bell, tail));
}

function scoreAlignment(swellDir: number, beachFacingDeg: number): number {
  const d = angDiff(swellDir, beachFacingDeg);
  // Allow more oblique swell before zeroing alignment
  if (d >= 120) return 0;
  if (d <= 30) return 1;
  if (d <= 70) return 0.7 + (1 - (d - 30) / 40) * 0.3;
  return clamp(1 - (d - 70) / 50);
}

type WindRegime = "offshore" | "onshore" | "cross";
function windRegime(beachFacingDeg: number, windDir: number): WindRegime {
  // Onshore if wind is FROM the sea bearing (±45°); Offshore if FROM landward bearing (±45°); else cross
  const toSea = beachFacingDeg;
  const fromLand = (beachFacingDeg + 180) % 360;
  const dOn  = angDiff(windDir, toSea);
  const dOff = angDiff(windDir, fromLand);
  if (dOff <= 45) return "offshore";
  if (dOn  <= 45) return "onshore";
  return "cross";
}

function scoreWind(regime: WindRegime, speedKt: number): number {
  switch (regime) {
    case "offshore":
      if (speedKt <= 10) return 1;
      if (speedKt <= 15) return 0.92;
      if (speedKt <= 20) return 0.8;
      if (speedKt <= 25) return 0.65;
      if (speedKt <= 30) return 0.5;
      return 0.35;
    case "cross":
      if (speedKt <= 8)  return 0.75;
      if (speedKt <= 12) return 0.65;
      if (speedKt <= 18) return 0.5;
      if (speedKt <= 24) return 0.35;
      return 0.25;
    case "onshore":
      if (speedKt <= 5)  return 0.5;
      if (speedKt <= 10) return 0.35;
      if (speedKt <= 15) return 0.2;
      if (speedKt <= 20) return 0.12;
      return 0.08;
  }
}

function scoreWindUnknown(speedKt: number): number {
  // Fallback when beach orientation is unknown (speed-only, slightly friendlier)
  if (speedKt <= 6)  return 0.8;
  if (speedKt <= 12) return 0.65;
  if (speedKt <= 18) return 0.5;
  if (speedKt <= 24) return 0.35;
  return 0.25;
}

// Combine multiple swells by energy proxy H²·T
function effectiveSwell(primary: Swell, secondaries: Swell[] = []): Swell {
  let eTot = primary.heightM ** 2 * primary.periodS;
  let vx = eTot * Math.cos((primary.directionDeg * Math.PI) / 180);
  let vy = eTot * Math.sin((primary.directionDeg * Math.PI) / 180);
  let perN = eTot * primary.periodS;
  let h2sum = primary.heightM ** 2;

  for (const s of secondaries) {
    const e = s.heightM ** 2 * s.periodS;
    eTot += e; perN += e * s.periodS;
    vx   += e * Math.cos((s.directionDeg * Math.PI) / 180);
    vy   += e * Math.sin((s.directionDeg * Math.PI) / 180);
    h2sum += s.heightM ** 2;
  }
  const dir = (Math.atan2(vy, vx) * 180) / Math.PI;
  return {
    heightM: Math.sqrt(h2sum),
    periodS: perN / Math.max(eTot, 1e-6),
    directionDeg: (dir + 360) % 360,
  };
}

// ------------ Tide scoring ------------
function scoreTide(tide: TideInput, prof: TideProfile) {
  const reasons: string[] = [];
  const { minM, maxM } = prof;

  // Height fit → peak at mid-band
  const inside = clamp((tide.tideHeightM - minM) / Math.max(0.001, (maxM - minM)));
  const heightFit = inside <= 0 ? 0 : inside >= 1 ? 1 : (1 - Math.abs(inside - 0.5) * 2);

  // Stage weight
  const sw = prof.stageWeight ?? {};
  const stageW = tide.stage ? (sw[tide.stage] ?? 1) : 1;

  // Near turn bonus
  let nearTurn = 0;
  if (typeof tide.minutesToTurn === "number" && prof.nearTurnBonusMin) {
    const t = Math.abs(tide.minutesToTurn);
    if (t <= prof.nearTurnBonusMin) {
      const w = prof.nearTurnBonusWeight ?? 0.15;
      nearTurn = (1 - t / prof.nearTurnBonusMin) * w;
      reasons.push("Near tide turn – smoother conditions");
    }
  }

  // Springiness info
  const springy = prof.springRangeM ? tide.tideRangeM >= prof.springRangeM : false;
  if (springy) reasons.push("Large tidal range – stronger currents");

  const score = clamp(heightFit * stageW + nearTurn, 0, 1);
  if (tide.tideHeightM < minM) reasons.push("Tide too low for this spot");
  if (tide.tideHeightM > maxM) reasons.push("Tide too high for this spot");

  return { score, reasons, springy };
}

// ------------ Safety gates ------------
function assessSafety(
  skill: Skill,
  eff: Swell,
  wind: Wind,
  regime: WindRegime | "unknown",
  gustKt?: number,
  tide?: TideInput,
  tideProf?: TideProfile
): { unsafe: boolean; reasons: string[] } {
  const r: string[] = [];
  const E = eff.heightM * eff.heightM * eff.periodS; // H²·T proxy

  const limits = {
    // Slightly higher wind limits; keep heights conservative
    novice:       { maxH: 1.5, maxE: 35, maxWindOn: 24, maxWindOther: 32 },
    intermediate: { maxH: 2.5, maxE: 55, maxWindOn: 27, maxWindOther: 34 },
    advanced:     { maxH: 4.0, maxE: 95, maxWindOn: 32, maxWindOther: 40 },
  }[skill];

  if (eff.heightM > limits.maxH) r.push(`Waves too large for ${skill} (≈ ${eff.heightM.toFixed(1)} m)`);
  if (E > limits.maxE) r.push(`Long-period power too high (H²·T ≈ ${Math.round(E)})`);
  // Removed: hard shorebreak risk that forced red on many decent long-period days
  // if (eff.periodS >= 14 && eff.heightM >= (skill === "intermediate" ? 1.8 : 1.4)) {
  //   r.push("Powerful shorebreak risk (≥14 s and decent height)");
  // }

  const maxWind = regime === "onshore" ? limits.maxWindOn : limits.maxWindOther;
  if (regime !== "unknown" && wind.speedKt > maxWind) {
    r.push(`${regime === "onshore" ? "Onshore" : "Strong"} wind (${wind.speedKt} kt)`);
  }
  if (regime === "unknown" && wind.speedKt > 28) {
    r.push(`Strong wind (${wind.speedKt} kt)`);
  }
  if (gustKt && gustKt - wind.speedKt >= 15) r.push(`Severe gusts (up to ${gustKt} kt)`);

  // Tide hazards
  if (tide && tideProf) {
    if (tide.tideHeightM < tideProf.minM - 0.2) r.push("Tide far too low – exposed hazards");
    if (tide.tideHeightM > tideProf.maxM + 0.2) r.push("Tide far too high – heavy shorebreak/closeouts");
    const springy = tideProf.springRangeM ? tide.tideRangeM >= tideProf.springRangeM : false;
    if (springy && eff.periodS >= 14 && eff.heightM >= (skill === "intermediate" ? 1.5 : 1.2)) {
      r.push("Spring tide + long period – strong rips likely");
    }
    if (tide.stage === "ebb" && eff.periodS >= 13 && eff.heightM >= 1.2) {
      r.push("Ebbing tide + long period – heavy currents");
    }
  }

  return { unsafe: r.length > 0, reasons: r };
}

// ------------ Hourly grading + day summary ------------
export function gradeHour(
  hour: HourlyMarine,
  beachFacingDeg?: number | null,
  tideProfile?: TideProfile,
  skill: Skill = "intermediate",
  gustKt?: number
): GradeResult {
  // USE existing beach orientation if possible
  const hasOrientation = typeof beachFacingDeg === "number";
  const eff = effectiveSwell(hour.primary, hour.secondary ?? []);
  const p = scorePeriod(eff.periodS);
  const h = scoreHeight(eff.heightM, skill);

  let align = 0.6; // neutral if unknown
  let windQ = scoreWindUnknown(hour.wind.speedKt);
  let regime: WindRegime | "unknown" = "unknown";

  if (hasOrientation) {
    align = scoreAlignment(eff.directionDeg, beachFacingDeg!);
    regime = windRegime(beachFacingDeg!, hour.wind.directionDeg);
    windQ = scoreWind(regime as WindRegime, hour.wind.speedKt);
  }

  const W = hasOrientation
    ? { period: 0.24, height: 0.24, alignment: 0.20, wind: 0.22, tide: 0.10 }
    : { period: 0.35, height: 0.30, alignment: 0.05, wind: 0.20, tide: 0.10 };

  const tideEval = tideProfile ? scoreTide(hour.tide, tideProfile) : { score: 0.6, reasons: [] as string[] };

  const swellQ = Math.pow(p, 0.5) * Math.pow(h, 0.5) * align;
  let score = 100 * clamp(
    0.5 * swellQ + 0.5 * (W.period * p + W.height * h + W.alignment * align + W.wind * windQ + W.tide * tideEval.score)
  );

  // Soft penalty for potential powerful shorebreak instead of automatic unsafe
  let softPenalty = 0;
  if (eff.periodS >= 15 && eff.heightM >= (skill === "intermediate" ? 1.7 : skill === "novice" ? 1.3 : 2.0)) {
    softPenalty = eff.periodS >= 16 ? 12 : 8;
  }
  if (softPenalty > 0) {
    score = clamp((score - softPenalty) / 100) * 100; // clamp in 0..100
  }

  const safety = assessSafety(
    skill, eff, hour.wind, hasOrientation ? (regime as WindRegime) : "unknown",
    gustKt, hour.tide, tideProfile
  );

  const reasons: string[] = [
    `Waves every ${Math.round(eff.periodS)} seconds`,
    `Wave height: ${eff.heightM.toFixed(1)} meters`,
  ];
  if (hasOrientation) {
    const dA = Math.round(angDiff(eff.directionDeg, beachFacingDeg!));
    reasons.push(dA <= 25 ? "Swell hits the beach square-on"
      : dA <= 60 ? "Swell roughly aligned"
      : "Swell partly aligned");
    reasons.push(
      regime === "offshore" ? `Offshore wind ${formatWindInfo(hour.wind.speedKt, hour.wind.directionDeg)}`
      : regime === "cross"  ? `Cross-shore wind ${formatWindInfo(hour.wind.speedKt, hour.wind.directionDeg)}`
                            : `Onshore wind ${formatWindInfo(hour.wind.speedKt, hour.wind.directionDeg)}`
    );
  } else {
    reasons.push("Beach orientation unknown – wind impact estimated");
    reasons.push(`Wind ${formatWindInfo(hour.wind.speedKt, hour.wind.directionDeg)}`);
  }
  reasons.push(...tideEval.reasons);
  if (softPenalty > 0) {
    reasons.push(`Long-period shorebreak risk – soft penalty applied (−${softPenalty})`);
  }

  let light: GradeResult["light"];
  if (safety.unsafe) {
    light = "red";
    score = Math.min(score, 30);
    reasons.unshift("⚠️ Safety: " + safety.reasons.join("; "));
  } else {
    // Slightly easier cutoffs
    light = score >= 65 ? "green" : score >= 40 ? "amber" : "red";
  }

  return {
    score: Math.round(score),
    light,
    unsafe: safety.unsafe,
    reasons,
    components: {
      period: Math.round(p * 100),
      height: Math.round(h * 100),
      alignment: Math.round(align * 100),
      wind: Math.round(windQ * 100),
      tide: Math.round((tideEval.score ?? 0.6) * 100),
    },
  };
}

export function gradeDay(input: DayMarine): DayResult {
  const skill = input.skill ?? "intermediate";
  const hours = input.hours.map(h => {
    const g = gradeHour(h, input.beachFacingDeg ?? null, input.tideProfile, skill);
    return { ts: h.ts, ...g };
    });
  // Best slot: choose highest score but prefer green > amber > red
  const byLight = (l: GradeResult["light"]) => (l === "green" ? 2 : l === "amber" ? 1 : 0);
  const best = hours
    .slice()
    .sort((a, b) => byLight(b.light) - byLight(a.light) || b.score - a.score)[0] ?? null;

  // Day light: median of top 3 hours (robust)
  const sorted = hours.slice().sort((a, b) => b.score - a.score).slice(0, 3);
  const med = sorted.length ? Math.round(sorted.reduce((s, x) => s + x.score, 0) / sorted.length) : 0;
  const dayLight: DayResult["dayLight"] = med >= 65 ? "green" : med >= 40 ? "amber" : "red";

  return { dayLight, bestHour: best, hours };
}