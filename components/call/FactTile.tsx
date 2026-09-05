/**
 * One of the three facts. Label in small-caps over a tabular value.
 *
 * @module components/call/FactTile
 */

import type { CallFact } from '@/lib/godaisy/call/facts';

export function FactTile({ fact }: { fact: CallFact }) {
  return (
    <div className="call-fact">
      <p className="call-label call-label--on-dark">{fact.label}</p>
      <b className="call-num">{fact.value}</b>
    </div>
  );
}
