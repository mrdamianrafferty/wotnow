import { useGdLocale } from '@/lib/godaisy/i18n/react';
/**
 * The alternates control — names what you get next, below the primary action.
 *
 * It renders only when the day has two or more options in Prime or Worth a look,
 * and it took the place of the secondary button: two controls were doing one job,
 * and the product's thesis is that it refuses to hand you a list. Marginal and
 * below never enter the cycle.
 *
 * A bare refresh-cw read as "reload the page". Naming the next option ("Or:
 * Cycling") says what a tap does without a box, a count or a list: it is one
 * more answer, and you can see which before you commit to the tap.
 *
 * No `title`. The browser's native tooltip drew a grey slab across the bottom
 * of the photograph on hover, and it said what `aria-label` already says to
 * anyone who needs it — a second, uglier copy of the same sentence.
 *
 * @module components/call/AlternatesControl
 */

export interface AlternatesControlProps {
  onCycle: () => void;
  /** Position in the cycle, for the accessible name only — never shown. */
  index: number;
  total: number;
  label: string;
  /** Display name of the option a tap will show. Falls back to a generic label. */
  nextName?: string;
}

export function AlternatesControl({ onCycle, index, total, label, nextName }: AlternatesControlProps) {
  const { t } = useGdLocale();
  const visible = nextName ? t('call_alt_next', { name: nextName }) : t('call_alt_try');
  return (
    <div className="call-altrow">
      <button
        type="button"
        className="call-alt-btn"
        onClick={onCycle}
        aria-label={`${visible} — ${label} (${index + 1}/${total})`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
        <span className="call-alt-text">{visible}</span>
      </button>
    </div>
  );
}
