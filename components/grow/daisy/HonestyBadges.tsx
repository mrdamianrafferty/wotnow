'use client';

/**
 * HonestyBadges — SourceBadge + GrowthStageBadge
 *
 * The two secondary honesty components in the Daisy system, ported to Grow Daisy
 * with garden-appropriate labels. Both use the Cool Shadow token set.
 *
 * SourceBadge: where the underlying data comes from.
 *   - live      → your own weather station / GPS-pinned sensor
 *   - derived   → a forecast model built from live inputs
 *   - regional  → climatic average for the climate zone
 *
 * GrowthStageBadge: current stage in a plant's growth cycle.
 *   dormant → emerging → active → peak → setting → senescing
 *
 * See grow-daisy-design-review.html §Components for usage context.
 */

import React from 'react';

/* ------------------------------------------------------------------ */
/* SourceBadge                                                          */
/* ------------------------------------------------------------------ */

export type DataSource = 'live' | 'derived' | 'regional';

interface SourceBadgeProps {
  kind: DataSource;
  className?: string;
}

const SOURCE_MAP: Record<DataSource, { glyph: string; label: string; colour: string; bg: string }> = {
  live:     { glyph: '●', label: 'Live sensor',   colour: 'var(--gd-leaf)',       bg: '#dde2d8' },
  derived:  { glyph: '◐', label: 'Derived',        colour: '#7a5a13',              bg: '#f6ecd4' },
  regional: { glyph: '○', label: 'Regional est.',  colour: 'var(--gd-stone-warm)', bg: '#efebe2' },
};

export function SourceBadge({ kind, className = '' }: SourceBadgeProps) {
  const { glyph, label, colour, bg } = SOURCE_MAP[kind];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ background: bg, color: colour, border: '1px solid transparent' }}
      aria-label={`Data source: ${label}`}
    >
      <span style={{ fontSize: 9 }} aria-hidden="true">{glyph}</span>
      <span style={{ fontFamily: 'var(--gd-font-serif)', fontStyle: 'italic' }}>{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* GrowthStageBadge                                                     */
/* ------------------------------------------------------------------ */

export type GrowthStage = 'dormant' | 'emerging' | 'active' | 'peak' | 'setting' | 'senescing';

interface GrowthStageBadgeProps {
  stage: GrowthStage;
  className?: string;
}

const STAGE_MAP: Record<GrowthStage, { bg: string; fg: string; label: string }> = {
  dormant:   { bg: 'var(--gd-growth-dormant)', fg: '#5a604f', label: 'Dormant'   },
  emerging:  { bg: '#d8e0cd',                  fg: '#3a463e', label: 'Emerging'  },
  active:    { bg: 'var(--gd-growth-active)',  fg: 'var(--gd-leaf)', label: 'Active'    },
  peak:      { bg: 'var(--gd-growth-peak)',    fg: 'var(--gd-leaf-dark)', label: 'Peak'      },
  setting:   { bg: '#ede0bf',                  fg: '#7a5a13', label: 'Setting'   },
  senescing: { bg: '#ead4c4',                  fg: '#8a3a1d', label: 'Senescing' },
};

export function GrowthStageBadge({ stage, className = '' }: GrowthStageBadgeProps) {
  const { bg, fg, label } = STAGE_MAP[stage];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${className}`}
      style={{
        background: bg,
        color: fg,
        fontFamily: 'var(--gd-font-serif)',
        fontStyle: 'italic',
        border: '1px solid transparent',
      }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* ConfidencePill — compact text-only fallback for tight spaces        */
/* ------------------------------------------------------------------ */

import type { ConfidenceBand } from './ConfidenceRing';

interface ConfidencePillProps {
  value: number;
  band?: ConfidenceBand;
  className?: string;
}

const PILL_BAND: Record<ConfidenceBand, { bg: string; fg: string }> = {
  high:     { bg: '#dde2d8', fg: 'var(--gd-conf-high)'     },
  fair:     { bg: '#dadfd0', fg: 'var(--gd-conf-fair)'     },
  marginal: { bg: '#ede0bf', fg: 'var(--gd-conf-marginal)' },
  poor:     { bg: '#ead4c4', fg: 'var(--gd-conf-poor)'     },
};

export function ConfidencePill({ value, band = 'high', className = '' }: ConfidencePillProps) {
  const { bg, fg } = PILL_BAND[band];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${className}`}
      style={{ background: bg, color: fg }}
    >
      <span style={{ fontFamily: 'var(--gd-font-serif)', fontStyle: 'italic', fontWeight: 700 }}>
        {Math.round(value)}
      </span>
      <span style={{ fontFamily: 'var(--gd-font-serif)', fontStyle: 'italic', opacity: 0.75 }}>
        conf.
      </span>
    </span>
  );
}
