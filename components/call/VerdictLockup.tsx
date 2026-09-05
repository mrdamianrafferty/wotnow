/**
 * The signature component.
 *
 * Kicker · lead-in · verdict · reason · three facts. Identical structure
 * everywhere it appears — the call, the share card, the spot page, the push
 * notification. It does not vary.
 *
 * @module components/call/VerdictLockup
 */

import { useEffect, useRef } from 'react';
import { fitVerdict } from '@/lib/godaisy/fitVerdict';
import type { CallFact } from '@/lib/godaisy/call/facts';
import { FactTile } from './FactTile';

export interface VerdictLockupProps {
  kicker: string;
  /** Omitted for sentence-shaped verdicts, which carry their own subject. */
  leadIn?: string;
  verdict: string;
  reason: string;
  facts: CallFact[];
  /** Changes whenever the verdict does, so the fit and the motion re-run. */
  cycleKey: string | number;
}

export function VerdictLockup({ kicker, leadIn, verdict, reason, facts, cycleKey }: VerdictLockupProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  /*
   * Re-fit on every verdict change, not just on mount. Alternates swap the whole
   * lockup, and a Portuguese alternate needing 46px would otherwise overflow a
   * box still sized for a 62px English one. Fonts must have loaded first, or the
   * measurement is taken against the fallback.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const run = () => { if (!cancelled && ref.current) fitVerdict(ref.current); };
    run();
    document.fonts?.ready.then(run).catch(() => {});
    window.addEventListener('resize', run);
    return () => { cancelled = true; window.removeEventListener('resize', run); };
  }, [cycleKey, verdict]);

  return (
    <div className="call-lockup" key={cycleKey}>
      <p className="call-label call-label--on-dark call-kicker">{kicker}</p>
      <div className="call-body">
        {leadIn ? <span className="call-leadin">{leadIn}</span> : null}
        <p className="call-verdict" ref={ref}>{verdict}</p>
        <p className="call-reason">{reason}</p>
        {facts.length > 0 && (
          <div className="call-facts">
            {facts.map((f) => <FactTile key={f.key} fact={f} />)}
          </div>
        )}
      </div>
    </div>
  );
}
