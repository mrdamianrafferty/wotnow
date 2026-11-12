/**
 * The pencil: wobbly lines for the drawn conditions page.
 *
 * SEEDED, ALWAYS. The wobble comes from a seeded generator, and the seed comes
 * from the place, the day and the section, so a drawing is the same drawing
 * every time it renders. Unseeded, every re-render redrew every line and the
 * page twitched like a flip-book whenever anything on it changed.
 *
 * @module lib/godaisy/conditions/pencil
 */

export type Pt = readonly [number, number];

/** mulberry32. Small, fast, and good enough for a hand-drawn line. */
export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A string to a seed. */
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A path through the points, each nudged a little, every ~10px. */
export function rough(pts: readonly Pt[], seed: number, amp = 1.2, closed = false): string {
  const r = rng(seed);
  const out: Array<[number, number]> = [];
  const P = closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i < P.length - 1; i++) {
    const [a, b] = [P[i], P[i + 1]];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10));
    for (let j = 0; j < n; j++) {
      const t = j / n;
      out.push([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * amp, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * amp]);
    }
  }
  const last = P[P.length - 1];
  out.push([last[0] + (r() - 0.5) * amp, last[1] + (r() - 0.5) * amp]);
  return `M${out.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')}${closed ? ' Z' : ''}`;
}

export function circle(cx: number, cy: number, r: number, n = 16): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return [cx + Math.cos(t) * r, cy + Math.sin(t) * r] as const;
  });
}
