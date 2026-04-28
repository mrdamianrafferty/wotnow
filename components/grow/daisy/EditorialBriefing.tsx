'use client';

/**
 * EditorialBriefing
 *
 * The Tier-0 "Daily briefing" panel from the Daisy design system, translated
 * to Grow Daisy with Cool Shadow tokens and support for all six voice modes
 * from the Grow Daisy Editorial Voice Guide (2026-04-28).
 *
 * Voice modes:
 *   nudge     — Daily Nudge: brief, warm, practical. Default.
 *   insight   — Botanical Insight: explanatory, accessible science (James Wong register).
 *   vibe      — Garden Vibe: poetic/seasonal, mood copy (Vita/Monty/Kimmerer register).
 *   do-dont   — Do/Don't: structured checklist tone, high-information moments.
 *   ecological — Ecological Note: Alys Fowler / Fukuoka. Restraint, watching.
 *   coach     — Firm Coach: clear, no flourish, for frost/pest/drought urgency.
 *               Visual: terracotta left border instead of leaf, to signal urgency
 *               before the user has processed the words.
 *
 * The surface (cream panel, Georgia italic body) is shared across all modes.
 * What changes per mode is the left accent colour and the kicker treatment.
 *
 * See GROW_DAISY_EDITORIAL_VOICE.md for copy standards.
 * See grow-daisy-design-review.html §Components for visual spec.
 */

import React from 'react';
import { SourceBadge, type DataSource } from './HonestyBadges';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type VoiceMode =
  | 'nudge'
  | 'insight'
  | 'vibe'
  | 'do-dont'
  | 'ecological'
  | 'coach';

interface EditorialBriefingProps {
  /** Small uppercase kicker, e.g. "Garden Pulse · Mon 28 Apr" */
  kicker: string;
  /**
   * The body content. Should be prose written in the voice mode's register —
   * see GROW_DAISY_EDITORIAL_VOICE.md for exemplar copy per mode.
   * Rendered as a <p> so inline <strong>/<em> are fine.
   */
  body: React.ReactNode;
  /**
   * Optional attribution footer.
   * Should name the zone and data source:
   *   "Zone 8b · last 7 days of Met Office data"
   * Not a generic label like "weather data".
   */
  attribution?: string;
  /** Optional data-source badge shown top-right */
  source?: DataSource;
  /**
   * Voice mode — controls left accent colour and subtle visual emphasis.
   * Defaults to 'nudge'. Use 'coach' for frost/pest/drought alerts.
   */
  mode?: VoiceMode;
  /** Additional className for the outer panel */
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Mode → visual config                                                 */
/* ------------------------------------------------------------------ */

const MODE_ACCENT: Record<VoiceMode, string> = {
  nudge:      'var(--gd-leaf)',        // sage-slate — default
  insight:    'var(--gd-moss)',        // muted green — explanatory
  vibe:       'var(--gd-stone-warm)',  // warm stone — poetic/seasonal
  'do-dont':  'var(--gd-leaf)',        // leaf — structured/practical
  ecological: 'var(--gd-moss)',        // moss — ecological restraint
  coach:      'var(--gd-terracotta)',  // terracotta — urgent, act now
};

// Coach mode gets a subtly warmer panel surface so urgency is felt, not just read.
const MODE_BG: Record<VoiceMode, string> = {
  nudge:      'var(--gd-cream)',
  insight:    'var(--gd-cream)',
  vibe:       'var(--gd-cream)',
  'do-dont':  'var(--gd-cream)',
  ecological: 'var(--gd-cream)',
  coach:      '#f0e8df',  // warm cream — more urgent than neutral cream
};

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function EditorialBriefing({
  kicker,
  body,
  attribution,
  source,
  mode = 'nudge',
  className = '',
}: EditorialBriefingProps) {
  const accent = MODE_ACCENT[mode];
  const bg = MODE_BG[mode];

  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: bg,
        border: '1px solid var(--gd-cream-border)',
        borderLeft: `3px solid ${accent}`,
        paddingTop: 22,
        paddingRight: 24,
        paddingBottom: 22,
        // Slightly more left padding to clear the 3px accent border visually
        paddingLeft: 20,
      }}
    >
      {/* Header row: kicker + optional source badge */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span
          style={{
            fontFamily: 'var(--gd-font-serif)',
            fontStyle: 'italic',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: mode === 'coach' ? 'var(--gd-terracotta)' : 'var(--gd-stone-warm)',
          }}
        >
          {kicker}
        </span>
        {source && <SourceBadge kind={source} />}
      </div>

      {/* Narrative */}
      <p
        style={{
          fontFamily: 'var(--gd-font-serif)',
          fontStyle: 'italic',
          fontSize: 15.5,
          lineHeight: 1.65,
          color: 'var(--gd-peat)',
          margin: 0,
        }}
      >
        {body}
      </p>

      {/* Attribution — should be specific: "Zone 8b · last 7 days of Met Office data" */}
      {attribution && (
        <p
          style={{
            fontFamily: 'var(--gd-font-serif)',
            fontStyle: 'italic',
            fontSize: 12,
            color: 'var(--gd-stone-warm)',
            marginTop: 14,
            marginBottom: 0,
          }}
        >
          — {attribution}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EditorialVerdictBar — left-bordered pull-quote / one-line verdict   */
/* ------------------------------------------------------------------ */

interface EditorialVerdictBarProps {
  children: React.ReactNode;
  /** Accent matches the parent briefing mode. Defaults to leaf. */
  accent?: string;
  className?: string;
}

/**
 * A slim left-bordered strip for the one-line verdict below a briefing.
 *   e.g. "Verdict — water deeply, mulch tomorrow."
 * Use accent="var(--gd-terracotta)" when inside a coach-mode panel.
 */
export function EditorialVerdictBar({
  children,
  accent = 'var(--gd-leaf)',
  className = '',
}: EditorialVerdictBarProps) {
  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      style={{ paddingLeft: 12, borderLeft: `3px solid ${accent}` }}
    >
      <span
        style={{
          fontFamily: 'var(--gd-font-serif)',
          fontStyle: 'italic',
          fontSize: 13,
          color: 'var(--gd-peat)',
          lineHeight: 1.5,
        }}
      >
        {children}
      </span>
    </div>
  );
}
