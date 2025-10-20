const WIND_CARDINALS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const DEFAULT_LOCALE = typeof window !== 'undefined' && window.navigator ? window.navigator.language : undefined;

export function formatCardinalDirection(degrees?: number | null): string {
  if (degrees == null || Number.isNaN(degrees)) {
    return '—';
  }
  const normalised = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalised / 22.5) % WIND_CARDINALS.length;
  return `${WIND_CARDINALS[index]}\u00a0(${Math.round(normalised)}°)`;
}

export function formatDisplayTime(value?: string | null, options?: Intl.DateTimeFormatOptions, locale: string | undefined = DEFAULT_LOCALE): string {
  if (!value) {
    return '—';
  }
  const trimmed = value.trim();
  const date = new Date(trimmed);

  if (!Number.isNaN(date.getTime())) {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      ...options,
    });
    return formatter.format(date);
  }

  const hhmmMatch = /^([01]?\d|2[0-3]):[0-5]\d$/.exec(trimmed);
  if (hhmmMatch) {
    if (options?.hour12 === false) {
      return trimmed;
    }

    const [hoursString, minutes] = trimmed.split(':');
    const hours = Number.parseInt(hoursString, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHours = ((hours + 11) % 12) + 1;
    return `${displayHours}:${minutes}\u00a0${suffix}`;
  }

  return trimmed;
}

export function formatRelativeTime(value?: string | null, baseDate: Date = new Date(), locale: string | undefined = DEFAULT_LOCALE): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const diffMs = date.getTime() - baseDate.getTime();
  const abs = Math.abs(diffMs);

  const divisions: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60_000, 'minute'],
    [3_600_000, 'hour'],
    [86_400_000, 'day'],
  ];

  for (const [threshold, unit] of divisions) {
    if (abs < threshold * (unit === 'minute' ? 120 : unit === 'hour' ? 48 : 14)) {
      const valueNumeric = diffMs / threshold;
      const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      return formatter.format(Math.round(valueNumeric), unit);
    }
  }

  const formatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  return formatter.format(date);
}

export function formatWaveHeight(value?: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(value < 1 ? 2 : 1)}\u00a0m`;
}

export function formatWindSpeed(value?: number | null, unit: 'kts' | 'kmh' = 'kts'): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  const speed = unit === 'kmh' ? value * 1.852 : value;
  const suffix = unit === 'kmh' ? 'km/h' : 'kts';
  return `${Math.round(speed)}\u00a0${suffix}`;
}

export function formatTemperature(value?: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value)}\u00a0°C`;
}

/**
 * Format ocean current description in plain English
 * @param speedMS Current speed in meters per second
 * @param directionDeg Current direction in degrees (where current is flowing TO)
 * @returns Plain English description like "Very strong currents (1.4 m/s) pushing south"
 */
export function formatCurrentDescription(speedMS?: number | null, directionDeg?: number | null): string | null {
  if (speedMS == null || Number.isNaN(speedMS)) {
    return null;
  }

  // Current strength categories (based on oceanographic standards)
  let strength: string;
  if (speedMS < 0.1) {
    strength = 'Negligible';
  } else if (speedMS < 0.25) {
    strength = 'Weak';
  } else if (speedMS < 0.5) {
    strength = 'Moderate';
  } else if (speedMS < 1.0) {
    strength = 'Strong';
  } else {
    strength = 'Very strong';
  }

  // Get cardinal direction (simplified to 8 directions for readability)
  let direction = '';
  if (directionDeg != null && !Number.isNaN(directionDeg)) {
    const normalised = ((directionDeg % 360) + 360) % 360;
    const index = Math.round(normalised / 45); // 8 directions
    const cardinals = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    direction = cardinals[index % 8];
  }

  const speedDisplay = speedMS.toFixed(2);
  const directionPart = direction ? ` pushing ${direction}` : '';
  
  return `${strength} currents (${speedDisplay} m/s)${directionPart}`;
}

export function formatTideHeight(value?: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(1)}\u00a0m`;
}
