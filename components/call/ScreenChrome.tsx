/**
 * The ONE navigation control: kicker left, menu right.
 *
 * Replaces the five navigation systems in the current app — bottom nav, header
 * dropdown, top tabs, home day tabs, marine day tabs. No tab bar, no header bar.
 * Days are reached by horizontal swipe; everything else lives behind this.
 *
 * IT IS A HAMBURGER, not the three dots it was. Three dots mean "more actions
 * about the thing you are looking at" — a share, a rename, a delete. This opens
 * settings, an account and the policies, which is a menu, and a menu is the one
 * icon every phone user already knows. The dots were also being read as the
 * evidence control, which is now its own button next to the facts.
 *
 * @module components/call/ScreenChrome
 */

export function ScreenChrome({ onMenu }: { onMenu?: () => void }) {
  // A focusable button that does nothing is worse for a keyboard or
  // screen-reader user than an absent one.
  if (!onMenu) return null;

  return (
    <button type="button" className="call-icon-btn" aria-label="Menu" onClick={onMenu}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}
