import { useEffect, useState } from "react";

type IssWindow = {
  risetimeISO: string;
  endtimeISO: string;
  durationSec: number;
};
type VisibleResp = {
  version: string;
  sourceUsed?: "open-notify" | "prediction";
  results: IssWindow[];
};
type Heartbeat = { ok: boolean; timestamp?: number; position?: { lat: number; lon: number } };

function fmtRange(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const tf = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${tf.format(s)}–${tf.format(e)}`;
}

export function IssCard({ lat, lon }: { lat: number; lon: number }) {
  const [passes, setPasses] = useState<IssWindow[] | null>(null);
  const [hb, setHb] = useState<Heartbeat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const [v, h] = await Promise.all([
          fetch(`/api/iss-visible?lat=${lat}&lon=${lon}&bestOnly=true`, { cache: "no-store" }).then(r => r.json() as Promise<VisibleResp>),
          fetch(`/api/iss-heartbeat`, { cache: "no-store" }).then(r => r.json() as Promise<Heartbeat>).catch(() => ({ ok: false })),
        ]);
        if (!cancelled) {
          setPasses(v.results || []);
          setHb(h);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [lat, lon]);

  if (loading) return <div className="card">Checking ISS passes…</div>;

  return (
    <div className="card">
      <strong>ISS tonight</strong>
      {hb && (
        <div style={{ fontSize: 12, opacity: 0.8, margin: "4px 0" }}>
          Service: {hb.ok ? "Open Notify online" : "fallback active"}
        </div>
      )}

      {!passes || passes.length === 0 ? (
        <div>No decent night-time passes here tonight.</div>
      ) : (
        <ul>
          {passes.slice(0, 2).map((p, i) => (
            <li key={i}>
              {i === 0 ? <em>Look up at</em> : <span>Also try</span>}{" "}
              {fmtRange(p.risetimeISO, p.endtimeISO)} ({Math.round(p.durationSec / 60)} min)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}