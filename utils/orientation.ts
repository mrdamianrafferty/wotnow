/**
 * computeSimulatedOrientation
 * Returns a stable, deterministic bearing (0–359) derived from lat/lon.
 * Placeholder until real coastline analysis is implemented.
 * Interpreted as the beach’s seaward-facing normal.
 */
export const computeSimulatedOrientation = (lat: number, lon: number): number => {
  // Derive a pseudo-bearing from position; deterministic for any lat/lon
  const angleDeg = (Math.atan2(lon, lat) * 180) / Math.PI;
  const bearing = (angleDeg + 360) % 360;
  // Snap to nearest 5° for nicer, stable values
  return (Math.round(bearing / 5) * 5) % 360;
};

/** Normalise any degree value to 0–359 */
export const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;

/** Signed smallest angular difference in degrees, range [-180, 180] */
export const signedDelta = (fromDeg: number, toDeg: number): number => {
  const d = norm360(fromDeg - toDeg);
  return d > 180 ? d - 360 : d;
};

/**
 * Classify wind relative to the beach orientation.
 * beachOrientation: bearing the beach faces out to sea (0–359)
 * windFromDeg: meteorological degrees (direction the wind is FROM, 0–359)
 */
export type WindRelative =
  | 'onshore'
  | 'side-onshore'
  | 'cross-shore'
  | 'side-offshore'
  | 'offshore';

export const classifyWindRelative = (
  beachOrientation: number,
  windFromDeg: number
): WindRelative => {
  const diff = signedDelta(windFromDeg, beachOrientation); // -180..180
  const abs = Math.abs(diff);

  // Thresholds (tune to taste)
  if (abs <= 35) return 'onshore';
  if (abs >= 145) return 'offshore';
  if (abs >= 65 && abs <= 115) return 'cross-shore';

  // Side-on vs side-off decided by whether the wind has an onshore component
  // cos(diff) > 0 => onshore component; < 0 => offshore component
  return Math.cos((diff * Math.PI) / 180) > 0 ? 'side-onshore' : 'side-offshore';
};

/**
 * Convenience score for suitability (-1 to +1) based on on/offshore component.
 * +1 = pure onshore, -1 = pure offshore, ~0 = pure cross-shore.
 */
export const onshoreComponentScore = (
  beachOrientation: number,
  windFromDeg: number
): number => {
  const diff = signedDelta(windFromDeg, beachOrientation);
  // Cosine projects wind onto the shore-normal axis.
  // Optionally soften extremes with a power curve.
  return Math.cos((Math.abs(diff) * Math.PI) / 180);
};

/** Simple type to explain where an orientation value came from */
export type OrientationSource = 'meta' | 'computed' | 'none';

/** Type guard for numbers that are not NaN/undefined/null */
const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/**
 * Resolve a beach orientation using (in order):
 *  1) An explicit beachOrientation (meta), if present
 *  2) A deterministic computed value from lat/lon (placeholder)
 *  3) None (undefined)
 *
 * Returns the orientation (0–359) and the source used. Optionally logs.
 */
export const resolveBeachOrientation = (
  args: {
    beachOrientation?: number | null;
    lat?: number | null;
    lon?: number | null;
    log?: (label: string, data?: Record<string, unknown>) => void;
  }
): { orientation: number | undefined; source: OrientationSource } => {
  const { beachOrientation, lat, lon, log } = args;

  if (isFiniteNumber(beachOrientation)) {
    const o = norm360(beachOrientation as number);
    log?.('resolveBeachOrientation', { source: 'meta', orientation: o });
    return { orientation: o, source: 'meta' };
  }

  if (isFiniteNumber(lat) && isFiniteNumber(lon)) {
    const o = computeSimulatedOrientation(lat as number, lon as number);
    log?.('resolveBeachOrientation', {
      source: 'computed',
      orientation: o,
      lat,
      lon,
    });
    return { orientation: o, source: 'computed' };
  }

  log?.('resolveBeachOrientation', { source: 'none' });
  return { orientation: undefined, source: 'none' };
};

/**
 * Convenience helper: classify wind relative to the beach using
 * resolveBeachOrientation as a fallback.
 */
export const classifyRelativeWindWithFallback = (
  args: {
    beachOrientation?: number | null;
    lat?: number | null;
    lon?: number | null;
    windFromDeg?: number | null; // meteorological degrees (wind FROM)
    log?: (label: string, data?: Record<string, unknown>) => void;
  }
): {
  windRelative: WindRelative | undefined;
  orientation: number | undefined;
  orientationSource: OrientationSource;
} => {
  const { windFromDeg, log, ...rest } = args;
  const { orientation, source } = resolveBeachOrientation({ ...rest, log });

  if (!isFiniteNumber(windFromDeg) || !isFiniteNumber(orientation)) {
    log?.('classifyRelativeWindWithFallback', {
      windRelative: undefined,
      orientation,
      orientationSource: source,
      windFromDeg,
    });
    return { windRelative: undefined, orientation, orientationSource: source };
  }

  const windRelative = classifyWindRelative(orientation as number, windFromDeg as number);
  log?.('classifyRelativeWindWithFallback', {
    windRelative,
    orientation,
    orientationSource: source,
    windFromDeg,
  });
  return { windRelative, orientation, orientationSource: source };
};