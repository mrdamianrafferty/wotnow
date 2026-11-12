/**
 * The four days the landing page draws, one after another.
 *
 * Each day is a verdict in the app's own grammar plus one drawing in the
 * conditions page's pencil: a comparison you can picture (a wave against a
 * 1.75 m person, 12 mm of rain as pound coins) and a handful of notes. The
 * days are fixed examples, like the photographed call they replace, so the
 * page renders the same on the server as in the browser and nothing here
 * waits on a forecast.
 *
 * A drawing is a list of marks rather than JSX so it stays a pure function:
 * seeded, so the wobble is the same every render (see pencil.ts), and
 * testable without a DOM.
 *
 * Every mark carries `at`, the second it starts drawing. The component turns
 * that into an animation delay; with reduced motion it is ignored.
 *
 * @module lib/godaisy/landing/drawnDays
 */

import { rough, circle, rng, type Pt } from '@/lib/godaisy/conditions/pencil';

export const VIEW = { w: 600, h: 380 } as const;

const C = {
  ink: 'var(--call-sk-ink)', pencil: 'var(--call-sk-pencil)', wash: 'var(--call-sk-wash)', paper: 'var(--call-page)',
  warm: 'var(--call-sk-warm)', water: 'var(--call-sk-water)', waterInk: 'var(--call-sk-water-ink)',
  moss: 'var(--call-sk-moss)', amber: 'var(--call-sk-amber)', sun: 'var(--call-sk-sun)', mud: 'var(--call-sk-mud)',
};

/** How a mark arrives: drawn along its length, washed in, or popped up. */
export type Arrive = 'draw' | 'wash' | 'pop' | 'fade';

export type Mark =
  | { kind: 'path'; d: string; fill: string; stroke: string; width: number; dash?: string; fillOpacity?: number; at: number; dur: number; len: number; arrive: Arrive }
  | { kind: 'text'; x: number; y: number; text: string; size: number; fill: string; anchor: 'start' | 'middle' | 'end'; weight: 500 | 700; at: number }
  | { kind: 'group'; marks: Mark[]; at: number };

export interface DrawnDay {
  id: 'surf' | 'bike' | 'football' | 'cafe';
  /** The control's label. */
  name: string;
  kicker: string;
  lead: string;
  verdict: string;
  /** The handwritten line under the verdict. */
  hand: string;
  /** When the hand line starts writing, in seconds. */
  handAt: number;
  /** What the drawing shows, for a screen reader. */
  label: string;
  marks: () => Mark[];
}

// ── the pen ─────────────────────────────────────────────────────────────────

interface PathOpts { closed?: boolean; amp?: number; stroke?: string; fill?: string; width?: number; at: number; dur?: number; len?: number; fillOpacity?: number }
interface TextOpts { at: number; size?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; weight?: 500 | 700 }
interface Pen {
  marks: Mark[];
  path(pts: readonly Pt[], o: PathOpts): Pen;
  dashed(x0: number, x1: number, y: number, stroke: string, at: number): Pen;
  raw(d: string, stroke: string, width: number, at: number): Pen;
  text(x: number, y: number, text: string, o: TextOpts): Pen;
  /** Several marks that pop in together. */
  group(at: number, draw: (p: Pen) => void): Pen;
}

function pen(seed0: number): Pen {
  let seed = seed0;
  const marks: Mark[] = [];
  const next = () => seed++;
  const api: Pen = {
    marks,
    path(pts, o) {
      const filled = !!o.fill && o.fill !== 'none';
      marks.push({
        kind: 'path', d: rough(pts, next(), o.amp ?? 1.2, !!o.closed),
        fill: o.fill ?? 'none', stroke: o.stroke ?? (filled ? 'none' : C.ink), width: o.width ?? 2.2,
        fillOpacity: o.fillOpacity, at: o.at, dur: o.dur ?? 0.8, len: o.len ?? 1400,
        arrive: filled && !o.stroke ? 'wash' : filled ? 'fade' : 'draw',
      });
      return api;
    },
    dashed(x0, x1, y, stroke, at) {
      marks.push({ kind: 'path', d: `M${x0} ${y.toFixed(1)} L${x1} ${y.toFixed(1)}`, fill: 'none', stroke, width: 1.8, dash: '5 6', at, dur: 0.5, len: 0, arrive: 'fade' });
      return api;
    },
    raw(d, stroke, width, at) {
      marks.push({ kind: 'path', d, fill: 'none', stroke, width, at, dur: 0.15, len: 20, arrive: 'draw' });
      return api;
    },
    text(x, y, text, o) {
      marks.push({ kind: 'text', x, y, text, size: o.size ?? 22, fill: o.fill ?? C.ink, anchor: o.anchor ?? 'start', weight: o.weight ?? 700, at: o.at });
      return api;
    },
    group(at, draw) {
      const inner = pen(next() * 7);
      draw(inner);
      marks.push({ kind: 'group', marks: inner.marks.map((m) => ({ ...m, at })), at });
      return api;
    },
  };
  return api;
}

/** Catmull-Rom through the points, so a hand-drawn line can bend. */
function curve(pts: readonly Pt[], steps: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const squash = (pts: Pt[], cy: number, k: number): Pt[] => pts.map(([x, y]) => [x, cy + (y - cy) * k] as const);

// ── the things it draws ─────────────────────────────────────────────────────

/** A stick person `h` tall, feet at `feet`. Shoulders at 82% of height, as on a real one. */
function person(p: Pen, x: number, feet: number, h: number, at: number, width = 2.2) {
  const r = h * 0.075, top = feet - h, neck = top + r * 2, hip = feet - h * 0.47, sh = top + h * 0.18;
  p.path(circle(x, top + r, r), { closed: true, amp: 1, width, at, len: 200 });
  p.path([[x, neck], [x, hip]], { amp: 1, width, at: at + 0.25, len: 200 });
  p.path([[x - h * 0.17, sh + h * 0.2], [x, sh], [x + h * 0.17, sh + h * 0.2]], { amp: 1, width, at: at + 0.4, len: 200 });
  p.path([[x - h * 0.12, feet], [x, hip], [x + h * 0.12, feet]], { amp: 1, width, at: at + 0.55, len: 260 });
  return { sh };
}

function flag(p: Pen, x: number, base: number, h: number, colour: string, lean = 1) {
  p.path([[x, base], [x, base - h]], { amp: 0.8, width: 1.8, at: 0 });
  p.path([[x, base - h], [x + 20 * lean, base - h + 7], [x, base - h + 14]], { closed: true, amp: 0.6, fill: colour, stroke: C.ink, width: 1.4, at: 0 });
}

function umbrella(p: Pen, x: number, y: number, open: boolean) {
  if (!open) {
    p.path([[x, y - 26], [x - 6, y + 4], [x, y + 26], [x + 6, y + 4]], { closed: true, amp: 0.6, fill: C.wash, stroke: C.ink, width: 1.6, at: 0 });
    p.path([[x, y + 26], [x, y + 34], [x - 4, y + 36]], { amp: 0.5, width: 1.6, at: 0 });
    return;
  }
  p.path([...curve([[x - 22, y], [x - 12, y - 18], [x, y - 22], [x + 12, y - 18], [x + 22, y]], 4), [x, y - 2]], { closed: true, amp: 0.6, fill: C.waterInk, stroke: C.ink, width: 1.6, at: 0 });
  p.path([[x, y - 2], [x, y + 30], [x - 5, y + 33]], { amp: 0.5, width: 1.6, at: 0 });
}

function sun(p: Pen, x: number, y: number, r: number, at: number) {
  p.path(circle(x, y, r, 14), { closed: true, amp: 0.6, fill: C.sun, stroke: C.ink, width: 1.5, at });
}

// ── the days ────────────────────────────────────────────────────────────────

/** 100 px to the metre. The wave's crest sits exactly on the person's shoulder line. */
function surf(): Mark[] {
  const p = pen(1);
  p.path([[10, 320], [590, 320]], { stroke: C.pencil, width: 1.8, at: 0, dur: 0.6 });
  const who = { sh: 320 - 175 * 0.82 };
  // the wave
  const x0 = 20, x1 = 300, base = 320, crest = who.sh, w = x1 - x0;
  const outline: Pt[] = [[x0, base], ...curve([[x0, base - (base - crest) * 0.25], [x0 + w * 0.3, base - (base - crest) * 0.55], [x0 + w * 0.62, crest + 4], [x0 + w * 0.76, crest], [x0 + w * 0.86, crest + 16], [x0 + w * 0.8, crest + 30], [x0 + w * 0.9, crest + 26], [x1, base]], 6), [x1, base]];
  p.path(outline, { closed: true, fill: C.water, at: 1.4 });
  p.path(outline, { closed: true, stroke: C.waterInk, width: 2.4, at: 0.4, dur: 1.2, len: 1200 });
  person(p, 430, 320, 175, 1.6);
  p.path([[332, 320], [332, who.sh]], { amp: 0.8, width: 1.6, at: 2.3, dur: 0.4, len: 200 });
  p.path([[326, who.sh], [338, who.sh]], { amp: 0.4, width: 1.6, at: 2.6, dur: 0.1, len: 20 });
  p.path([[326, 320], [338, 320]], { amp: 0.4, width: 1.6, at: 2.6, dur: 0.1, len: 20 });
  p.text(340, 262, '1.4 m', { size: 26, at: 2.7 });
  p.dashed(232, 470, who.sh, C.warm, 2.8);
  p.text(476, who.sh + 6, 'shoulders', { fill: C.warm, at: 2.9 });
  p.text(60, 304, 'water 15°', { size: 24, fill: C.waterInk, at: 1.6 });
  p.text(430, 346, '1.75 m person', { size: 18, fill: C.pencil, anchor: 'middle', weight: 500, at: 2.2 });
  p.text(430, 367, 'in a 4/3 suit', { size: 18, fill: C.pencil, anchor: 'middle', weight: 500, at: 2.3 });
  [0, 1, 2].forEach((i) => p.path(curve([[24 + i * 62, 118], [44 + i * 62, 104], [64 + i * 62, 112], [74 + i * 62, 120]], 4), { amp: 0.5, stroke: C.waterInk, width: 1.8, at: 3.0 + i * 0.12, dur: 0.3, len: 120 }));
  p.text(24, 84, 'a wave every 11 seconds', { size: 20, fill: C.waterInk, weight: 500, at: 3.3 });
  p.text(24, 152, 'tide rising, high 9:12am', { size: 20, fill: C.waterInk, weight: 500, at: 3.4 });
  p.group(3.2, (g) => flag(g, 560, 320, 74, C.moss, -1));
  p.text(556, 346, 'offshore,', { size: 18, fill: C.moss, anchor: 'middle', weight: 500, at: 3.4 });
  p.text(556, 367, 'force 2', { size: 18, fill: C.moss, anchor: 'middle', weight: 500, at: 3.45 });
  sun(p, 566, 50, 17, 3.5);
  p.text(540, 56, 'sunrise 7:41', { size: 20, fill: C.amber, anchor: 'end', weight: 500, at: 3.6 });
  return p.marks;
}

function bike(): Mark[] {
  const p = pen(2);
  p.path([[10, 320], [590, 320]], { stroke: C.pencil, width: 1.8, at: 0, dur: 0.6 });
  p.path(curve([[10, 304], [160, 286], [330, 250], [470, 196], [590, 240]], 6), { stroke: C.pencil, width: 1.2, at: 0.2, dur: 1, len: 900 });
  p.text(470, 184, 'Mam Tor, 517 m', { size: 18, fill: C.pencil, anchor: 'middle', weight: 500, at: 1.0 });
  const R = 30, rx = 250, fx = 340, hy = 290;
  const bb: Pt = [295, 292], st: Pt = [283, 246], ht: Pt = [330, 244];
  p.path(circle(rx, hy, R, 20), { closed: true, amp: 0.8, width: 2, at: 0.6, dur: 0.5, len: 260 });
  p.path(circle(fx, hy, R, 20), { closed: true, amp: 0.8, width: 2, at: 0.75, dur: 0.5, len: 260 });
  p.path([[rx, hy], st, bb, [rx, hy]], { amp: 0.6, width: 2, at: 1.0, dur: 0.5, len: 300 });
  p.path([st, ht, bb], { amp: 0.6, width: 2, at: 1.2, dur: 0.4, len: 200 });
  p.path([ht, [fx, hy]], { amp: 0.6, width: 2, at: 1.3, dur: 0.3, len: 80 });
  p.path([[324, 236], [342, 234], [344, 244]], { amp: 0.4, width: 2.4, at: 1.4, dur: 0.2, len: 40 });
  p.path([[276, 242], [292, 242]], { amp: 0.3, width: 3, at: 1.45, dur: 0.1, len: 20 });
  p.path([[284, 240], [316, 206]], { amp: 0.6, at: 1.5, dur: 0.3, len: 80 });
  p.path(circle(328, 192, 11, 14), { closed: true, amp: 0.8, at: 1.6, dur: 0.3, len: 90 });
  p.path([[316, 206], [338, 234]], { amp: 0.6, at: 1.7, dur: 0.3, len: 60 });
  p.path([[284, 240], [308, 260], bb], { amp: 0.6, at: 1.8, dur: 0.3, len: 100 });
  [440, 486, 532].forEach((x, i) => p.group(2.2 + i * 0.12, (g) => flag(g, x, 320, 58, C.moss, 1)));
  p.text(498, 346, 'tailwind home,', { size: 18, fill: C.moss, anchor: 'middle', weight: 500, at: 2.6 });
  p.text(498, 367, 'force 2', { size: 18, fill: C.moss, anchor: 'middle', weight: 500, at: 2.65 });
  // a 0–20° thermometer, at 14
  p.group(2.7, (g) => {
    const x = 34, top = 40, bottom = 140, y14 = bottom - (bottom - top) * (14 / 20);
    g.path([[x - 6, top], [x - 6, bottom], [x + 6, bottom], [x + 6, top]], { amp: 0.5, width: 1.8, at: 0 });
    g.path(circle(x, bottom + 10, 12, 14), { closed: true, amp: 0.5, fill: C.warm, stroke: C.ink, width: 1.6, at: 0 });
    g.path([[x, bottom], [x, y14]], { amp: 0.3, stroke: C.warm, width: 6, at: 0 });
  });
  p.text(60, 70, '14°, arm warmers', { fill: C.warm, at: 3.0 });
  p.text(60, 94, 'off by noon', { fill: C.warm, at: 3.05 });
  p.group(3.2, (g) => umbrella(g, 300, 92, false));
  p.text(318, 98, 'dry till 6pm', { fill: C.waterInk, at: 3.3 });
  sun(p, 566, 40, 15, 3.4);
  p.text(540, 46, 'light till 5:20', { size: 18, fill: C.amber, anchor: 'end', weight: 500, at: 3.5 });
  return p.marks;
}

function football(): Mark[] {
  const p = pen(3);
  const pitch: Pt[] = [[40, 330], [560, 330], [470, 190], [130, 190]];
  p.path(pitch, { closed: true, fill: C.moss, fillOpacity: 0.16, at: 0.6 });
  p.path(pitch, { closed: true, amp: 1, stroke: C.moss, width: 2, at: 0, dur: 1 });
  p.path([[85, 260], [515, 260]], { amp: 0.8, stroke: C.moss, width: 1.6, at: 0.7, dur: 0.4, len: 450 });
  p.path(squash(circle(300, 260, 46, 22), 260, 0.32), { closed: true, amp: 0.6, stroke: C.moss, width: 1.6, at: 0.9, dur: 0.4, len: 320 });
  p.path([[274, 190], [274, 168], [326, 168], [326, 190]], { amp: 0.5, at: 1.1, dur: 0.4, len: 120 });
  p.path(circle(352, 300, 9, 12), { closed: true, amp: 0.5, fill: C.paper, stroke: C.ink, width: 1.6, at: 1.3 });
  person(p, 220, 312, 92, 1.4);
  person(p, 404, 250, 62, 1.6, 1.8);
  // the floodlight
  p.path([[572, 330], [572, 70]], { amp: 0.6, width: 2, at: 2.0, dur: 0.4, len: 280 });
  p.path([[552, 60], [592, 60], [592, 80], [552, 80]], { closed: true, amp: 0.4, fill: C.sun, stroke: C.ink, width: 1.6, at: 2.3 });
  [0, 1, 2].forEach((i) => p.path([[548, 84 + i * 6], [500 - i * 10, 120 + i * 22]], { amp: 0.4, stroke: C.amber, width: 1.4, at: 2.4 + i * 0.08, dur: 0.25, len: 120 }));
  p.text(540, 40, 'sunset 4:12, lights on', { size: 20, fill: C.amber, anchor: 'end', weight: 500, at: 2.6 });
  // underfoot, in the app's own band word
  p.group(2.7, (g) => g.path([[20, 342], [32, 342], [32, 362], [46, 366], [46, 372], [20, 372]], { closed: true, amp: 0.6, fill: C.wash, stroke: C.ink, width: 1.6, at: 0 }));
  p.text(56, 368, 'firm underfoot, moulded studs', { size: 20, fill: C.mud, weight: 500, at: 2.8 });
  p.text(20, 60, '8° by kick-off,', { size: 24, fill: C.warm, at: 3.0 });
  p.text(20, 86, 'bring a layer', { size: 24, fill: C.warm, at: 3.05 });
  p.group(3.2, (g) => umbrella(g, 26, 140, false));
  p.text(46, 146, 'dry till 10pm', { fill: C.waterInk, at: 3.3 });
  return p.marks;
}

/** The cup is indoors. The weather stays on the other side of the window. */
function cafe(): Mark[] {
  const p = pen(4);
  const win: Pt[] = [[40, 40], [440, 40], [440, 268], [40, 268]];
  p.path(win, { closed: true, amp: 0.8, fill: C.water, fillOpacity: 0.35, at: 0.5 });
  p.path(win, { closed: true, amp: 1, width: 2.4, at: 0, dur: 0.8, len: 1300 });
  p.path([[240, 40], [240, 268]], { amp: 0.6, width: 2, at: 0.5, dur: 0.3, len: 240 });
  p.path([[40, 154], [440, 154]], { amp: 0.6, width: 2, at: 0.6, dur: 0.3, len: 420 });
  p.path([[28, 272], [452, 272]], { amp: 0.8, width: 2.4, at: 0.7, dur: 0.3, len: 440 });
  // outside: rain, umbrellas, flags bent by the gusts
  const r = rng(99);
  for (let i = 0; i < 40; i++) {
    const x = 50 + r() * 376, y = 48 + r() * 202;
    p.raw(`M${x.toFixed(1)} ${y.toFixed(1)} l-4 12`, C.waterInk, 1.4, 0.8 + r() * 1.2);
  }
  [80, 150, 205].forEach((x, i) => p.group(1.0 + i * 0.12, (g) => umbrella(g, x, 214, true)));
  [380, 414].forEach((x, i) => p.group(1.4 + i * 0.1, (g) => flag(g, x, 262, 54, C.warm, 1)));
  p.text(456, 60, 'rain from 11am,', { fill: C.waterInk, at: 1.2 });
  p.text(456, 84, 'all afternoon', { fill: C.waterInk, at: 1.25 });
  p.text(456, 150, 'gusts to', { size: 20, fill: C.warm, weight: 500, at: 1.7 });
  p.text(456, 172, 'force 6', { size: 20, fill: C.warm, weight: 500, at: 1.75 });
  // inside: the table and the cup
  p.path([[10, 322], [590, 322]], { stroke: C.pencil, width: 1.8, at: 0.3, dur: 0.6 });
  const cup: Pt[] = [[236, 236], [344, 236], [337, 312], [243, 312]];
  p.path(cup, { closed: true, amp: 1, fill: C.paper, at: 1.9 });
  p.path(cup, { closed: true, amp: 1, fill: C.wash, at: 2.0 });
  p.path(cup, { closed: true, amp: 1, width: 2.4, at: 1.9, dur: 0.6, len: 500 });
  p.path(circle(352, 266, 17, 14).filter((q) => q[0] > 340), { amp: 0.6, width: 2.4, at: 2.2, dur: 0.3, len: 90 });
  p.path(squash(circle(290, 318, 80, 24), 318, 0.1), { closed: true, amp: 0.6, fill: C.paper, stroke: C.ink, width: 2, at: 2.3 });
  [266, 290, 314].forEach((x, i) => p.path(curve([[x, 226], [x - 8, 206], [x + 6, 188], [x - 4, 168]], 5), { amp: 0.4, stroke: C.pencil, width: 1.8, at: 2.4 + i * 0.12, dur: 0.4, len: 90 }));
  // 12 mm of rain in pound coins: each is 2.8 mm thick, so four is about it
  for (let i = 0; i < 4; i++) {
    const cy = 314 - i * 11;
    p.group(2.7 + i * 0.12, (g) => g.path(squash(circle(520, cy, 22, 16), cy, 0.3), { closed: true, amp: 0.4, fill: C.sun, stroke: C.ink, width: 1.4, at: 0 }));
  }
  p.text(520, 254, '12 mm of rain:', { size: 19, anchor: 'middle', weight: 500, at: 3.2 });
  p.text(520, 274, 'four £1 coins deep', { size: 19, anchor: 'middle', weight: 500, at: 3.25 });
  p.text(290, 360, 'out there: 11°, feels like 7°', { fill: C.warm, anchor: 'middle', at: 3.5 });
  return p.marks;
}

export const DRAWN_DAYS: readonly DrawnDay[] = [
  { id: 'surf', name: 'Surf', kicker: 'Croyde Bay · Saturday, 7:00 am', lead: 'Today is', verdict: 'a surf day.', hand: 'Waves about shoulder high. Best before six.', handAt: 3.8,
    label: 'A 1.4 metre wave beside a 1.75 metre person, reaching their shoulders, with notes on the swell, the tide, an offshore wind and sunrise.', marks: surf },
  { id: 'bike', name: 'Cycling', kicker: 'Edale · Sunday, 8:00 am', lead: 'Today is', verdict: 'a bike day.', hand: 'Dry, 14°, and the wind brings you home.', handAt: 3.7,
    label: 'A cyclist on the road below Mam Tor, with flags showing a tailwind, a thermometer at 14 degrees and a furled umbrella for a dry day.', marks: bike },
  { id: 'football', name: 'Football', kicker: 'Hackney Marshes · Tuesday, 6:30 pm', lead: 'Tonight is', verdict: 'a five-a-side night.', hand: 'Dry till ten. Firm underfoot.', handAt: 3.5,
    label: 'A floodlit five-a-side pitch with two players, and notes on sunset, firm ground, 8 degrees and no rain until 10pm.', marks: football },
  { id: 'cafe', name: 'Café', kicker: 'Edinburgh · Wednesday, 9:00 am', lead: 'Today is', verdict: 'a café day.', hand: 'Rain from eleven. Get a window seat.', handAt: 3.7,
    label: 'A steaming cup on a table indoors, with rain, umbrellas and gusting flags beyond the window, and 12 millimetres of rain shown as a stack of four pound coins.', marks: cafe },
];

/** How long a day stays up before the next, in milliseconds. */
export const DAY_MS = 7000;
