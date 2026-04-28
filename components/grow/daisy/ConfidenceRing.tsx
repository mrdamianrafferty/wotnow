'use client';

/**
 * ConfidenceRing
 *
 * The signature Daisy honesty component. An SVG arc ring that expresses
 * how confident the system is in a given recommendation, on a 0–100 scale,
 * colour-coded by band (high / fair / marginal / poor).
 *
 * Ported from the Rise Daisy design system. Palette re-keyed to Cool Shadow
 * (sage-slate primary) for Grow Daisy. See grow-daisy-design-review.html.
 *
 * @example
 *   <ConfidenceRing value={84} band="high" size={64} label="conf." />
 */

import React from 'react';

export type ConfidenceBand = 'high' | 'fair' | 'marginal' | 'poor';

interface ConfidenceRingProps {
  /** 0–100 confidence value */
  value: number;
  /** Determines colour of the arc */
  band?: ConfidenceBand;
  /** Outer diameter in px (default 72) */
  size?: number;
  /** Optional small label below the number. Only shown when size > 60. */
  label?: string;
  /** Additional className for the wrapper div */
  className?: string;
}

const BAND_COLOUR: Record<ConfidenceBand, { arc: string; tint: string }> = {
  high:     { arc: 'var(--gd-conf-high)',     tint: '#d6dfd2' },
  fair:     { arc: 'var(--gd-conf-fair)',     tint: '#dadfd0' },
  marginal: { arc: 'var(--gd-conf-marginal)', tint: '#ede0bf' },
  poor:     { arc: 'var(--gd-conf-poor)',     tint: '#ead4c4' },
};

/** Derive band automatically from a numeric value if not supplied. */
function inferBand(value: number): ConfidenceBand {
  if (value >= 75) return 'high';
  if (value >= 50) return 'fair';
  if (value >= 25) return 'marginal';
  return 'poor';
}

export function ConfidenceRing({
  value,
  band,
  size = 72,
  label,
  className = '',
}: ConfidenceRingProps) {
  const resolvedBand = band ?? inferBand(value);
  const { arc, tint } = BAND_COLOUR[resolvedBand];

  const strokeWidth = size <= 44 ? 4 : size <= 60 ? 5 : 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(100, Math.max(0, value)) / 100);

  const numFontSize = size <= 44 ? 13 : 17;
  const labelFontSize = 9;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Confidence: ${value}%`}
    >
      {/* SVG ring */}
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tint}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={arc}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>

      {/* Centre label */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden="true"
      >
        <span
          style={{
            fontFamily: 'var(--gd-font-serif)',
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: numFontSize,
            color: 'var(--gd-peat)',
            lineHeight: 1,
          }}
        >
          {Math.round(value)}
        </span>
        {label && size > 60 && (
          <span
            style={{
              fontFamily: 'var(--gd-font-serif)',
              fontStyle: 'italic',
              fontSize: labelFontSize,
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              color: 'var(--gd-stone-warm)',
              marginTop: 2,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
