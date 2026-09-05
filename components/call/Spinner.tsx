/**
 * Waiting, said quietly.
 *
 * One spinner, used wherever something is genuinely in flight. It exists
 * because of the sea: `mode=marine` fetches waves, swell, sea temperature and
 * tide extremes from a second provider and takes about three seconds cold
 * against a third of a second for everything else. Three seconds of nothing
 * reads as broken.
 *
 * IT ONLY APPEARS AFTER A BEAT. Anything that resolves inside ~400 ms should
 * not flash a spinner at all — the flash is more distracting than the wait, and
 * a warm marine response comes back in 350 ms. The delay is done in CSS rather
 * than with a timer so there is no state to get wrong.
 *
 * @module components/call/Spinner
 */

export function Spinner({ label }: { label: string }) {
  return (
    <p className="call-spin" role="status">
      <span className="call-spin-dot" aria-hidden="true" />
      <span className="call-spin-label">{label}</span>
    </p>
  );
}
