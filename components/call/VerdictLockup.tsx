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
  /** Omitted where the screen draws its own — the call puts it in ScreenChrome. */
  kicker?: string;
  /** Omitted for sentence-shaped verdicts, which carry their own subject. */
  leadIn?: string;
  verdict: string;
  reason: string;
  facts: CallFact[];
  /** Changes whenever the verdict does, so the fit and the motion re-run. */
  cycleKey: string | number;
  /** Opens the evidence. Rendered inline, at the end of the sentence. */
  onWhy?: () => void;
}

export function VerdictLockup({ kicker, leadIn, verdict, reason, facts, cycleKey, onWhy }: VerdictLockupProps) {
  const ref = useRef<HTMLHeadingElement>(null);

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
      {kicker ? <p className="call-label call-label--on-dark call-kicker">{kicker}</p> : null}
      <div className="call-body">
        {leadIn ? <span className="call-leadin">{leadIn}</span> : null}
        {/* An h1, not a p. It is the page's heading in every sense — the
            sentence the whole screen exists to say — and the screen had no
            heading at all, which reads to a screen reader as a page about
            nothing. The lead-in above is not a heading: it is half of this
            sentence, split for typography. */}
        {/*
          * "Why?" LIVES AT THE END OF THE SENTENCE, not under the send button.
          *
          * It sat below the primary action, where it read as a question about
          * sending rather than about the weather — "why send this?" Attached to
          * the full stop it can only be asking about the claim it follows, and
          * the word stops being cryptic because its position says what it means.
          *
          * Inside the heading, so it sits on the last line's baseline however
          * the verdict wraps, and small enough not to compete with 62px type.
          */}
        <h1 className="call-verdict" ref={ref}>
          {verdict}
          {onWhy && (
            <button type="button" className="call-why" onClick={onWhy}>
              Why?
            </button>
          )}
        </h1>
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
