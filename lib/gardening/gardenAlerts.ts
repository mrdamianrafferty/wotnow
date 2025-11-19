// lib/gardening/gardenAlerts.ts
// ---------------------------------------------------------
// Core types, rules, and evaluation for Grow Daisy garden
// alerts (frost, heat, drought, waterlogging, fungal,
// slug party, wind, cold soil).
//
// Assumptions (all metric):
//  - Temperatures: °C
//  - Precipitation: mm
//  - Wind speed: km/h
//  - Humidity: %
//  - Soil moisture: volumetric water content (m³/m³, 0–1)
//  - timeISO/dateISO are ISO-8601 strings in local time
// ---------------------------------------------------------

export type Severity = 'none' | 'info' | 'warning' | 'high';

export type GardenAlertKey =
  | 'frost_risk'
  | 'heat_stress'
  | 'drought_stress'
  | 'waterlogging'
  | 'fungal_window'
  | 'slug_party'
  | 'wind_damage'
  | 'cold_soil';

export type SoilType = 'sandy' | 'loam' | 'clay' | 'peat' | 'chalk';
export type Shade = 'full_sun' | 'part_shade' | 'full_shade';

export interface GardenProfile {
  soilType: SoilType;
  shade: Shade;
}

export interface GardenAlertCopy {
  title: string;
  message: string;
  emoji: string;
}

export interface GardenAlertResult {
  key: GardenAlertKey;
  severity: Severity;
  copy: GardenAlertCopy;
  triggeredBy?: Record<string, number | string | boolean | null>;
}

export interface HourSlice {
  timeISO: string;
  airTempC: number | null;
  humidityPct: number | null;
  precipMm: number | null;
  cloudPct: number | null;
  windSpeedKmh: number | null;
}

export interface DaySlice {
  dateISO: string;
  minTempC: number | null;
  maxTempC: number | null;
  totalPrecipMm: number | null;
}

export interface SoilSlice {
  dateISO: string;
  temp0cm: number | null;
  temp20cm?: number | null;
  moisture0to1: number | null;
  moisture3to9?: number | null;
}

export interface GardenAlertInputs {
  today: DaySlice;
  hoursNext24: HourSlice[];
  hoursNext48: HourSlice[];
  last7Days: DaySlice[];
  soilToday?: SoilSlice;
}

const severityOrder: Severity[] = ['none', 'info', 'warning', 'high'];

function bumpSeverityUp(severity: Severity, steps = 1): Severity {
  const idx = severityOrder.indexOf(severity);
  if (idx < 0) return severity;
  return severityOrder[Math.min(idx + steps, severityOrder.length - 1)];
}

function bumpSeverityDown(severity: Severity, steps = 1): Severity {
  const idx = severityOrder.indexOf(severity);
  if (idx < 0) return severity;
  return severityOrder[Math.max(idx - steps, 0)];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function minOf(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter(isFiniteNumber);
  if (!filtered.length) return null;
  return Math.min(...filtered);
}

function maxOf(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter(isFiniteNumber);
  if (!filtered.length) return null;
  return Math.max(...filtered);
}

function sumOf(values: Array<number | null | undefined>): number {
  return values.filter(isFiniteNumber).reduce((sum, value) => sum + (value as number), 0);
}

function meanOf(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter(isFiniteNumber);
  if (!filtered.length) return null;
  const total = filtered.reduce((sum, value) => sum + value, 0);
  return total / filtered.length;
}

function isNightHour(timeISO: string): boolean {
  const date = new Date(timeISO);
  const hour = date.getHours();
  return hour < 6 || hour >= 18;
}

function evaluateFrostRisk(inputs: GardenAlertInputs): GardenAlertResult | null {
  const nightHours = inputs.hoursNext24.filter(hour => isNightHour(hour.timeISO));
  if (!nightHours.length) return null;

  const nightMinTemp = minOf(nightHours.map(hour => hour.airTempC));
  if (nightMinTemp == null) return null;

  const pivot = nightHours.find(hour => hour.airTempC === nightMinTemp) ?? nightHours[0];
  const cloud = pivot.cloudPct ?? null;
  const wind = pivot.windSpeedKmh ?? null;

  let severity: Severity = 'none';

  if (nightMinTemp > 4) {
    severity = 'none';
  } else if (nightMinTemp > 0) {
    if ((cloud ?? 50) > 40 || (wind ?? 10) > 8) {
      severity = 'info';
    } else {
      severity = 'warning';
    }
  } else if (nightMinTemp > -2) {
    severity = 'warning';
  } else {
    severity = 'high';
  }

  if (severity === 'none') return null;

  const copy: GardenAlertCopy = severity === 'info'
    ? {
        emoji: '❄️',
        title: 'Frost brushes possible',
        message: 'Very tender plants and cold corners may see a light frost – worth tucking pots closer to the house.',
      }
    : severity === 'warning'
    ? {
        emoji: '❄️',
        title: 'Frosty morning incoming',
        message: 'Cover tender veg and flowers, or move pots somewhere sheltered tonight.',
      }
    : {
        emoji: '❄️',
        title: 'Hard frost on the way',
        message: 'Protect citrus, tomatoes and other tender plants, or bring them indoors if you can.',
      };

  return {
    key: 'frost_risk',
    severity,
    copy,
    triggeredBy: {
      nightMinTemp,
      cloudPctAtMin: cloud,
      windKmhAtMin: wind,
    },
  };
}

function evaluateHeatStress(inputs: GardenAlertInputs): GardenAlertResult | null {
  const { today, hoursNext24 } = inputs;
  const maxTemp = today.maxTempC;
  if (maxTemp == null) return null;

  const dayHours = hoursNext24.filter(hour => !isNightHour(hour.timeISO));
  const meanCloud = meanOf(dayHours.map(hour => hour.cloudPct)) ?? 50;
  const meanWind = meanOf(dayHours.map(hour => hour.windSpeedKmh)) ?? 10;

  let severity: Severity = 'none';

  if (maxTemp < 24) {
    severity = 'none';
  } else if (maxTemp < 28) {
    severity = 'info';
  } else if (maxTemp < 32 && meanCloud < 40) {
    severity = 'warning';
  } else if (maxTemp >= 32 && (meanCloud < 40 || meanWind >= 20)) {
    severity = 'high';
  } else {
    severity = 'info';
  }

  if (severity === 'none') return null;

  const copy: GardenAlertCopy = severity === 'info'
    ? {
        emoji: '🔥',
        title: 'Warm gardening day',
        message: 'Keep seedlings and pots watered; a little afternoon shade will help the softest plants.',
      }
    : severity === 'warning'
    ? {
        emoji: '🔥',
        title: 'Scorchy sunshine',
        message: 'Avoid planting out tiny seedlings and move thirsty pots out of the fiercest afternoon sun.',
      }
    : {
        emoji: '🔥',
        title: 'Too hot to be kind',
        message: 'Potted plants will dry out fast – water deeply this evening and shade anything that wilts easily.',
      };

  return {
    key: 'heat_stress',
    severity,
    copy,
    triggeredBy: { maxTemp, meanCloud, meanWind },
  };
}

function evaluateDroughtStress(inputs: GardenAlertInputs): GardenAlertResult | null {
  const { last7Days, soilToday } = inputs;
  if (!last7Days.length) return null;

  const rainLast7 = sumOf(last7Days.map(day => day.totalPrecipMm));
  const meanTempLast7 = meanOf(
    last7Days.map(day =>
      day.maxTempC != null && day.minTempC != null
        ? (day.maxTempC + day.minTempC) / 2
        : null
    )
  );

  const soilMoistTop = soilToday?.moisture0to1 ?? null;
  const soilMoistMid = soilToday?.moisture3to9 ?? null;

  let severity: Severity = 'none';

  if (rainLast7 >= 15 || (soilMoistTop != null && soilMoistTop >= 0.25)) {
    severity = 'none';
  } else if (rainLast7 >= 5) {
    severity = 'info';
  } else {
    const warm = (meanTempLast7 ?? 0) >= 24;
    const veryDryTop = soilMoistTop != null && soilMoistTop < 0.2;
    const veryDryMid = soilMoistMid != null && soilMoistMid < 0.2;

    if (warm && (veryDryTop || veryDryMid)) {
      severity = 'high';
    } else if (veryDryTop) {
      severity = 'warning';
    } else {
      severity = 'info';
    }
  }

  if (severity === 'none') return null;

  const copy: GardenAlertCopy = severity === 'info'
    ? {
        emoji: '💧',
        title: 'Drying out a bit',
        message: 'A deep soak for veg beds and pots in the next day or two will keep things happy.',
      }
    : severity === 'warning'
    ? {
        emoji: '💧',
        title: 'Proper dry spell',
        message: 'Focus on deep, less frequent watering for veg, fruit and pots; lawns can usually cope.',
      }
    : {
        emoji: '💧',
        title: 'Thirsty garden alert',
        message: 'Save water for your most precious plants, mulch where you can and avoid light sprinkling.',
      };

  return {
    key: 'drought_stress',
    severity,
    copy,
    triggeredBy: { rainLast7, meanTempLast7, soilMoistTop, soilMoistMid },
  };
}

function evaluateWaterlogging(inputs: GardenAlertInputs): GardenAlertResult | null {
  const { last7Days, hoursNext24, soilToday } = inputs;
  if (!last7Days.length) return null;

  const recentDays = last7Days.slice(-3);
  const rainLast3 = sumOf(recentDays.map(day => day.totalPrecipMm));
  const rainNext24 = sumOf(hoursNext24.map(hour => hour.precipMm));

  const soilMoistTop = soilToday?.moisture0to1 ?? null;
  const soilMoistMid = soilToday?.moisture3to9 ?? null;

  let severity: Severity = 'none';

  if ((soilMoistTop ?? 0) < 0.3 && rainLast3 < 10) {
    severity = 'none';
  } else if (rainLast3 >= 10 || (soilMoistTop != null && soilMoistTop >= 0.3)) {
    severity = 'info';
  }

  if (rainLast3 >= 25 && rainNext24 >= 5 && (soilMoistTop != null && soilMoistTop >= 0.4)) {
    severity = 'warning';
  }

  if (
    soilMoistTop != null &&
    soilMoistMid != null &&
    soilMoistTop >= 0.45 &&
    soilMoistMid >= 0.4 &&
    rainNext24 >= 10
  ) {
    severity = 'high';
  }

  if (severity === 'none') return null;

  const copy: GardenAlertCopy = severity === 'info'
    ? {
        emoji: '🌧️',
        title: 'Plenty of rain about',
        message: 'No need to water, and make sure pots and trays aren’t sitting in standing water.',
      }
    : severity === 'warning'
    ? {
        emoji: '🌧️',
        title: 'Soggy roots warning',
        message: 'Check drainage in pots and raised beds; avoid adding more water and watch rot-prone plants.',
      }
    : {
        emoji: '🌧️',
        title: 'Seriously waterlogged',
        message: 'Avoid digging heavy soil, shelter containers from constant soak and watch for yellowing from wet feet.',
      };

  return {
    key: 'waterlogging',
    severity,
    copy,
    triggeredBy: { rainLast3, rainNext24, soilMoistTop, soilMoistMid },
  };
}

function evaluateFungalWindow(inputs: GardenAlertInputs): GardenAlertResult | null {
  const { hoursNext48 } = inputs;
  if (!hoursNext48.length) return null;

  const temps = hoursNext48.map(hour => hour.airTempC);
  const hums = hoursNext48.map(hour => hour.humidityPct);
  const precip = hoursNext48.map(hour => hour.precipMm);

  const meanTemp = meanOf(temps);
  const meanHum = meanOf(hums);
  const rainHours = precip.filter(value => (value ?? 0) >= 0.2).length;

  if (meanTemp == null || meanHum == null) return null;

  let severity: Severity = 'none';

  const tempInBand = meanTemp >= 10 && meanTemp <= 25;
  const wetEnough = meanHum >= 75 && rainHours >= 4;

  if (!tempInBand || !wetEnough) {
    severity = 'none';
  } else if (meanHum >= 85 || rainHours >= 8) {
    severity = 'warning';
  } else {
    severity = 'info';
  }

  if (severity === 'none') return null;

  const copy: GardenAlertCopy = severity === 'info'
    ? {
        emoji: '🦠',
        title: 'Fungal-friendly weather',
        message: 'Avoid wetting leaves when you water and give plants space for air to move.',
      }
    : {
        emoji: '🦠',
        title: 'Blight & mildew watch',
        message: 'Check potatoes, tomatoes and roses over the next few days and keep foliage dry and airy.',
      };

  return {
    key: 'fungal_window',
    severity,
    copy,
    triggeredBy: { meanTemp, meanHum, rainHours },
  };
}

function evaluateSlugParty(inputs: GardenAlertInputs): GardenAlertResult | null {
  const nightHours = inputs.hoursNext24.filter(hour => isNightHour(hour.timeISO));
  if (!nightHours.length) return null;

  const nightMinTemp = minOf(nightHours.map(hour => hour.airTempC));
  if (nightMinTemp == null) return null;

  const precipLast24 = sumOf(inputs.hoursNext24.map(hour => hour.precipMm));
  const precipTonight = sumOf(nightHours.map(hour => hour.precipMm));
  const meanCloud = meanOf(nightHours.map(hour => hour.cloudPct)) ?? 60;
  const meanWind = meanOf(nightHours.map(hour => hour.windSpeedKmh)) ?? 5;

  let severity: Severity = 'none';

  if (nightMinTemp < 5 || (precipLast24 < 1 && precipTonight < 1)) {
    severity = 'none';
  } else if (nightMinTemp >= 7 && (precipLast24 >= 1 || precipTonight >= 1)) {
    severity = 'info';
  }

  if (
    nightMinTemp >= 9 &&
    (precipLast24 >= 3 || precipTonight >= 2) &&
    meanCloud >= 60 &&
    meanWind <= 10
  ) {
    severity = 'warning';
  }

  if (severity === 'none') return null;

  const copy: GardenAlertCopy = severity === 'info'
    ? {
        emoji: '🐌',
        title: 'Slug stroll tonight',
        message: 'Worth guarding your softest seedlings and salad beds this evening.',
      }
    : {
        emoji: '🐌',
        title: 'Slug party conditions',
        message: 'Protect young plants tonight with traps, barriers or a quick night-time patrol.',
      };

  return {
    key: 'slug_party',
    severity,
    copy,
    triggeredBy: {
      nightMinTemp,
      precipLast24,
      precipTonight,
      meanCloud,
      meanWind,
    },
  };
}

function evaluateWindDamage(inputs: GardenAlertInputs): GardenAlertResult | null {
  const { hoursNext24 } = inputs;
  if (!hoursNext24.length) return null;

  const maxWind = maxOf(hoursNext24.map(hour => hour.windSpeedKmh));
  if (maxWind == null) return null;

  let severity: Severity = 'none';

  if (maxWind < 25) {
    severity = 'none';
  } else if (maxWind < 40) {
    severity = 'info';
  } else if (maxWind < 55) {
    severity = 'warning';
  } else {
    severity = 'high';
  }

  if (severity === 'none') return null;

  const copy: GardenAlertCopy = severity === 'info'
    ? {
        emoji: '💨',
        title: 'Blustery spell',
        message: 'Good day to check ties on climbers and taller plants.',
      }
    : severity === 'warning'
    ? {
        emoji: '💨',
        title: 'Windy enough to snap stems',
        message: 'Stake beans, sunflowers and anything top-heavy; move tall pots out of the main gusts.',
      }
    : {
        emoji: '💨',
        title: 'Strong winds expected',
        message: 'Secure greenhouse doors, tie in climbers firmly and move loose pots somewhere sheltered.',
      };

  return {
    key: 'wind_damage',
    severity,
    copy,
    triggeredBy: { maxWind },
  };
}

function evaluateColdSoil(inputs: GardenAlertInputs): GardenAlertResult | null {
  const soil = inputs.soilToday;
  if (!soil || soil.temp0cm == null) return null;

  const topTemp = soil.temp0cm;
  const topMoisture = soil.moisture0to1 ?? null;

  let severity: Severity = 'none';
  let copy: GardenAlertCopy | null = null;

  if (topTemp < 5) {
    severity = 'warning';
    copy = {
      emoji: '🌱',
      title: 'Soil still too cold',
      message: 'Most seeds will sulk at the moment – better to wait a bit or start things off in trays under cover.',
    };
  } else if (topTemp < 8) {
    severity = 'info';
    copy = {
      emoji: '🌱',
      title: 'Chilly soil for sowing',
      message: 'Hardy crops may cope, but warmth-lovers are happier started under cover.',
    };
  } else if (topTemp <= 18) {
    const moistureOk = topMoisture == null || (topMoisture >= 0.18 && topMoisture <= 0.4);
    if (moistureOk) {
      severity = 'info';
      copy = {
        emoji: '🌱',
        title: 'Nice soil for sowing',
        message: 'Temperatures and moisture look good for getting seeds and young plants started.',
      };
    }
  }

  if (!copy || severity === 'none') return null;

  return {
    key: 'cold_soil',
    severity,
    copy,
    triggeredBy: { temp0cm: topTemp, moisture0to1: topMoisture },
  };
}

function applySoilDroughtAdjust(alert: GardenAlertResult, soilType: SoilType): GardenAlertResult {
  if (alert.severity === 'none') return alert;
  let severity: Severity = alert.severity;

  switch (soilType) {
    case 'sandy':
    case 'chalk':
      severity = bumpSeverityUp(severity, 1);
      break;
    case 'clay':
      severity = bumpSeverityDown(severity, 1);
      break;
    default:
      break;
  }

  return { ...alert, severity };
}

function applySoilWaterloggingAdjust(alert: GardenAlertResult, soilType: SoilType): GardenAlertResult {
  if (alert.severity === 'none') return alert;
  let severity: Severity = alert.severity;

  switch (soilType) {
    case 'clay':
    case 'peat':
      severity = bumpSeverityUp(severity, 1);
      break;
    case 'sandy':
    case 'chalk':
      severity = bumpSeverityDown(severity, 1);
      break;
    default:
      break;
  }

  return { ...alert, severity };
}

function applySoilColdAdjust(alert: GardenAlertResult, soilType: SoilType): GardenAlertResult {
  if (alert.severity === 'none') return alert;
  let severity: Severity = alert.severity;

  switch (soilType) {
    case 'sandy':
    case 'chalk':
      severity = bumpSeverityDown(severity, 1);
      break;
    case 'clay':
      severity = bumpSeverityUp(severity, 1);
      break;
    default:
      break;
  }

  return { ...alert, severity };
}

function applyShadeFungalAdjust(alert: GardenAlertResult, shade: Shade): GardenAlertResult {
  if (alert.severity === 'none') return alert;
  let severity: Severity = alert.severity;

  switch (shade) {
    case 'full_shade':
      severity = bumpSeverityUp(severity, 1);
      break;
    case 'part_shade':
      if (severity === 'info') severity = 'warning';
      break;
    default:
      break;
  }

  return { ...alert, severity };
}

function applyShadeSlugAdjust(alert: GardenAlertResult, shade: Shade): GardenAlertResult {
  if (alert.severity === 'none') return alert;
  let severity: Severity = alert.severity;

  switch (shade) {
    case 'full_shade':
      severity = bumpSeverityUp(severity, 1);
      break;
    case 'part_shade':
      if (severity === 'info') severity = 'warning';
      break;
    default:
      break;
  }

  return { ...alert, severity };
}

function applyShadeHeatAdjust(alert: GardenAlertResult, shade: Shade): GardenAlertResult {
  if (alert.severity === 'none') return alert;
  let severity: Severity = alert.severity;

  switch (shade) {
    case 'part_shade':
    case 'full_shade':
      severity = bumpSeverityDown(severity, 1);
      break;
    default:
      break;
  }

  return { ...alert, severity };
}

export function adjustForGardenProfile(alert: GardenAlertResult, profile: GardenProfile): GardenAlertResult {
  let adjusted = { ...alert };

  switch (alert.key) {
    case 'drought_stress':
      adjusted = applySoilDroughtAdjust(adjusted, profile.soilType);
      break;
    case 'waterlogging':
      adjusted = applySoilWaterloggingAdjust(adjusted, profile.soilType);
      break;
    case 'cold_soil':
      adjusted = applySoilColdAdjust(adjusted, profile.soilType);
      break;
    default:
      break;
  }

  switch (alert.key) {
    case 'fungal_window':
      adjusted = applyShadeFungalAdjust(adjusted, profile.shade);
      break;
    case 'slug_party':
      adjusted = applyShadeSlugAdjust(adjusted, profile.shade);
      break;
    case 'heat_stress':
      adjusted = applyShadeHeatAdjust(adjusted, profile.shade);
      break;
    default:
      break;
  }

  return adjusted;
}

export function evaluateBaseGardenAlerts(inputs: GardenAlertInputs): GardenAlertResult[] {
  const alerts: Array<GardenAlertResult | null> = [
    evaluateFrostRisk(inputs),
    evaluateHeatStress(inputs),
    evaluateDroughtStress(inputs),
    evaluateWaterlogging(inputs),
    evaluateFungalWindow(inputs),
    evaluateSlugParty(inputs),
    evaluateWindDamage(inputs),
    evaluateColdSoil(inputs),
  ];

  return alerts.filter((alert): alert is GardenAlertResult => Boolean(alert && alert.severity !== 'none'));
}

export function evaluateGardenAlerts(inputs: GardenAlertInputs, profile: GardenProfile): GardenAlertResult[] {
  return evaluateBaseGardenAlerts(inputs)
    .map(alert => adjustForGardenProfile(alert, profile))
    .filter(alert => alert.severity !== 'none');
}
