/**
 * The ONE navigation control: kicker left, 26px menu dot right.
 *
 * Replaces the five navigation systems in the current app — bottom nav, header
 * dropdown, top tabs, home day tabs, marine day tabs. No tab bar, no header bar.
 * Days are reached by horizontal swipe; everything else lives behind the dot.
 *
 * @module components/call/ScreenChrome
 */

export function ScreenChrome({ onMenu }: { onMenu?: () => void }) {
  return (
    <button type="button" className="call-icon-btn" aria-label="Menu" onClick={onMenu}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
      </svg>
    </button>
  );
}
