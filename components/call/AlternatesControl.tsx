/**
 * The alternates control — a refresh-cw below the primary action.
 *
 * It renders only when the day has two or more options in Prime or Worth a look,
 * and it took the place of the secondary button: two controls were doing one job,
 * and the product's thesis is that it refuses to hand you a list. Marginal and
 * below never enter the cycle.
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
}

export function AlternatesControl({ onCycle, index, total, label }: AlternatesControlProps) {
  return (
    <div className="call-altrow">
      <button
        type="button"
        className="call-icon-btn call-icon-btn--lg"
        onClick={onCycle}
        aria-label={`${label} (${index + 1} of ${total})`}
      >
        {/* Larger than the 22px it was, now that there is no box around it to
            fill: the icon has to carry the control on its own. */}
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
      </button>
    </div>
  );
}
