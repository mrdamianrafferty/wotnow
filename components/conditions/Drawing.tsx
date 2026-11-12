/**
 * The drawings on the conditions page — one per kind of section.
 *
 * Each takes only the numbers the model handed it (`lib/godaisy/conditions/
 * drawn`); nothing here reads the API or decides what to say. Every drawing is
 * decorative to a screen reader: the sentence above it says the same thing,
 * and the exact readings sit under it.
 *
 * Colours are the `--call-sk-*` tokens in styles/godaisy-call.css, which carry
 * their own dark values. Text uses the hand face through CSS, not an attribute,
 * so it falls back cleanly if the font has not arrived.
 *
 * @module components/conditions/Drawing
 */

import { useId, type ReactNode } from 'react';
import type { Drawing as Model } from '@/lib/godaisy/conditions/drawn';
import type { SeaWear } from '@/lib/godaisy/conditions/seaWear';
import { PERSON_M } from '@/lib/godaisy/conditions/drawn';
import { rough, circle, rng, type Pt } from '@/lib/godaisy/conditions/pencil';
import { useGdLocale } from '@/lib/godaisy/i18n/react';
import { tick, num as fmt } from '@/lib/godaisy/i18n';

const C = {
  ink: 'var(--call-sk-ink)', pencil: 'var(--call-sk-pencil)', wash: 'var(--call-sk-wash)', paper: 'var(--call-page)',
  warm: 'var(--call-sk-warm)', cold: 'var(--call-sk-cold)', water: 'var(--call-sk-water)', waterInk: 'var(--call-sk-water-ink)',
  moss: 'var(--call-sk-moss)', amber: 'var(--call-sk-amber)', sun: 'var(--call-sk-sun)', lit: 'var(--call-sk-lit)',
  mud: 'var(--call-sk-mud)', skin: 'var(--call-sk-skin)', leather: 'var(--call-sk-leather)', welly: 'var(--call-sk-welly)',
  neoprene: 'var(--call-sk-neoprene)', snow: 'var(--call-sk-snow)',
};

/* ── Pencil marks ─────────────────────────────────────────────────────── */

/** A line drawn twice, the second fainter, the way a pencil goes over itself. */
function Line({ pts, seed, stroke = C.ink, w = 2, dash, opacity }: {
  pts: readonly Pt[]; seed: number; stroke?: string; w?: number; dash?: string; opacity?: number;
}) {
  const common = { fill: 'none', stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeDasharray: dash };
  return (
    <g opacity={opacity}>
      <path d={rough(pts, seed, 1.4)} strokeWidth={w} {...common} />
      <path d={rough(pts, seed + 99, 1.8)} strokeWidth={w * 0.45} opacity={0.5} {...common} />
    </g>
  );
}

function Shape({ pts, seed, fill, stroke = C.ink, w = 1.6, amp = 1.2, clip }: {
  pts: readonly Pt[]; seed: number; fill: string; stroke?: string; w?: number; amp?: number; clip?: string;
}) {
  return (
    <path d={rough(pts, seed, amp, true)} fill={fill} stroke={stroke === 'none' ? 'none' : stroke}
      strokeWidth={w} strokeLinejoin="round" clipPath={clip ? `url(#${clip})` : undefined} />
  );
}

function Txt({ x, y, children, size = 17, anchor, bold, fill = C.ink }: {
  x: number; y: number; children: ReactNode; size?: number; anchor?: 'start' | 'middle' | 'end'; bold?: boolean; fill?: string;
}) {
  return <text x={x} y={y} fontSize={size} textAnchor={anchor} fontWeight={bold ? 700 : 500} fill={fill}>{children}</text>;
}

/**
 * A stick person, feet at (x, y), `h` px tall.
 *
 * `wear` dresses them for the sea, from the wetsuit ladder: swim shorts, a
 * shorty, a full suit, then boots, then a hood. Neoprene is drawn as thick
 * strokes under the pencil lines, so the stick figure still reads.
 */
function Person({ x, y, h, seed, wear }: { x: number; y: number; h: number; seed: number; wear?: SeaWear }) {
  const head = h * 0.13;
  const neck = y - h + head * 2;
  const hip = y - h * 0.47;
  const shoulder: Pt = [x, neck + h * 0.04];
  const handL: Pt = [x - h * 0.18, neck + h * 0.12];
  const handR: Pt = [x + h * 0.18, neck + h * 0.12];
  const footL: Pt = [x - h * 0.12, y];
  const footR: Pt = [x + h * 0.12, y];
  const along = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const suit = wear === 'cool' || wear === 'chilly' || wear === 'veryCold' || wear === 'freezing';
  const shorty = wear === 'mild';
  const swim = wear === 'warm' || wear === 'hot';
  const boots = wear === 'chilly' || wear === 'veryCold' || wear === 'freezing';
  const hood = wear === 'veryCold' || wear === 'freezing';
  const nw = Math.max(3, h * 0.075);
  const neo = (pts: readonly Pt[], k: number, col = C.neoprene, w = nw) => (
    <path d={rough(pts, seed + 300 + k, 0.6)} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  );
  const hip0: Pt = [x, hip];
  return (
    <g>
      {(suit || shorty) && (
        <>
          {neo([[x, neck], hip0], 0, C.neoprene, nw * 1.5)}
          {neo([shoulder, suit ? handL : along(shoulder, handL, 0.5)], 1)}
          {neo([shoulder, suit ? handR : along(shoulder, handR, 0.5)], 2)}
          {neo([hip0, suit ? footL : along(hip0, footL, 0.45)], 3)}
          {neo([hip0, suit ? footR : along(hip0, footR, 0.45)], 4)}
        </>
      )}
      {swim && (
        <>
          {neo([hip0, along(hip0, footL, 0.25)], 5, C.warm)}
          {neo([hip0, along(hip0, footR, 0.25)], 6, C.warm)}
        </>
      )}
      {boots && [footL, footR].map((f, k) => (
        <Shape key={k} pts={[[f[0] - h * 0.04, f[1] - h * 0.07], [f[0] + h * 0.03, f[1] - h * 0.07], [f[0] + h * 0.07, f[1]], [f[0] - h * 0.05, f[1]]]} seed={seed + 320 + k} fill={C.neoprene} w={1} />
      ))}
      <Shape pts={circle(x, y - h + head, head, 14)} seed={seed} fill={hood ? C.neoprene : C.paper} />
      {hood && <Shape pts={circle(x + head * 0.15, y - h + head * 1.1, head * 0.55, 10)} seed={seed + 9} fill={C.skin} w={1} amp={0.6} />}
      <Line pts={[[x, neck], [x, hip]]} seed={seed + 1} w={1.8} />
      <Line pts={[[x, hip], [x - h * 0.12, y]]} seed={seed + 2} w={1.8} />
      <Line pts={[[x, hip], [x + h * 0.12, y]]} seed={seed + 3} w={1.8} />
      <Line pts={[[x - h * 0.18, neck + h * 0.12], [x, neck + h * 0.04], [x + h * 0.18, neck + h * 0.12]]} seed={seed + 4} w={1.8} />
    </g>
  );
}

/** A hand-drawn snowflake (or, small, a frost crystal): three strokes and their tips. */
function Flake({ x, y, r, seed, col = C.cold, w = 1.4 }: { x: number; y: number; r: number; seed: number; col?: string; w?: number }) {
  return (
    <g>
      {[0, 60, 120].map((a, k) => {
        const t = (a * Math.PI) / 180;
        const dx = Math.cos(t) * r;
        const dy = Math.sin(t) * r;
        return <Line key={k} pts={[[x - dx, y - dy], [x + dx, y + dy]]} seed={seed + k} stroke={col} w={w} />;
      })}
      {r >= 8 && [0, 60, 120, 180, 240, 300].map((a, k) => {
        const t = (a * Math.PI) / 180;
        const tx = x + Math.cos(t) * r * 0.65;
        const ty = y + Math.sin(t) * r * 0.65;
        const l = r * 0.3;
        return (
          <g key={`v${k}`}>
            <Line pts={[[tx, ty], [tx + Math.cos(t + 0.8) * l, ty + Math.sin(t + 0.8) * l]]} seed={seed + 10 + k} stroke={col} w={w * 0.8} />
            <Line pts={[[tx, ty], [tx + Math.cos(t - 0.8) * l, ty + Math.sin(t - 0.8) * l]]} seed={seed + 20 + k} stroke={col} w={w * 0.8} />
          </g>
        );
      })}
    </g>
  );
}

function Svg({ h, children }: { h: number; children: ReactNode }) {
  return (
    <svg className="gd-drawn-svg" viewBox={`0 0 360 ${h}`} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/* ── The drawings ─────────────────────────────────────────────────────── */

function Thermometers({ d, seed }: { d: Extract<Model, { kind: 'thermometers' }>; seed: number }) {
  const vals = d.bars.map((b) => b.c);
  const lo = Math.floor(Math.min(0, ...vals) / 5) * 5;
  const hi = Math.max(lo + 15, Math.ceil(Math.max(...vals) / 5) * 5);
  const B = 180;
  const T = 30;
  const Y = (v: number) => B - ((B - T) * (v - lo)) / (hi - lo);
  const xs = d.bars.length === 1 ? [150] : [96, 236];
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += 5) ticks.push(t);
  // The locale cut its own gap into lines; an old-shape drawing (English, no
  // `gapLines`) falls back to the same cut made here.
  const windy = d.gapWindy ?? Boolean(d.gap?.startsWith('the wind'));
  const words = d.gap?.split(' ') ?? [];
  const gap1 = d.gapLines ? d.gapLines[0] : words.length > 2 ? words.slice(0, -2).join(' ') : '';
  const gap2 = d.gapLines ? d.gapLines[1] : words.length > 2 ? words.slice(-2).join(' ') : words.join(' ');
  return (
    <Svg h={234}>
      {ticks.map((t) => <Txt key={t} x={52} y={Y(t) + 5} size={15} anchor="end" fill={C.pencil}>{`${t}°`}</Txt>)}
      {d.bars.map((b, i) => {
        const x = xs[i];
        const col = b.tone === 'warm' ? C.warm : C.cold;
        return (
          <g key={b.label}>
            <Line pts={[[x - 9, Y(hi) - 6], [x - 9, B], [x + 9, B], [x + 9, Y(hi) - 6]]} seed={seed + i * 20} w={1.8} />
            <path d={rough([[x - 5, Y(b.c)], [x + 5, Y(b.c)], [x + 5, B + 4], [x - 5, B + 4]], seed + i * 20 + 5, 1, true)} fill={col} />
            <Shape pts={circle(x, B + 12, 14)} seed={seed + i * 20 + 7} fill={col} />
            {ticks.map((t) => <Line key={t} pts={[[x + 9, Y(t)], [x + 15, Y(t)]]} seed={seed + t + i} stroke={C.pencil} w={1} />)}
            <Txt x={x} y={228} size={19} anchor="middle" bold fill={col}>{b.label}</Txt>
          </g>
        );
      })}
      {windy && [[0, 62], [10, 84], [-6, 104]].map(([dx, y], i) => (
        <Line key={i} pts={[[124 + dx, y], [146 + dx, y - 5], [170 + dx, y + 3], [196 + dx, y - 2], [212 + dx, y + 4]]} seed={seed + 50 + i} stroke={C.pencil} w={1.6} />
      ))}
      {d.bars.length === 2 && d.gap && (
        <g>
          <Line pts={[[xs[0] + 16, Y(d.bars[0].c)], [xs[1] + 28, Y(d.bars[0].c)]]} seed={seed + 70} stroke={C.pencil} w={1.2} dash="3 4" />
          <Line pts={[[xs[1] + 26, Y(d.bars[0].c) + 2], [xs[1] + 26, Y(d.bars[1].c) - 2]]} seed={seed + 71} w={1.2} />
          <Txt x={xs[1] + 34} y={(Y(d.bars[0].c) + Y(d.bars[1].c)) / 2 + (gap1 ? -3 : 6)} size={18}>{gap1 || gap2}</Txt>
          {gap1 && <Txt x={xs[1] + 34} y={(Y(d.bars[0].c) + Y(d.bars[1].c)) / 2 + 15} size={18} bold fill={d.bars[1].tone === 'cold' ? C.cold : C.warm}>{gap2}</Txt>}
        </g>
      )}
    </Svg>
  );
}

function Flags({ d, seed }: { d: Extract<Model, { kind: 'flags' }>; seed: number }) {
  const base = 150;
  const top = 66;
  const x0 = 22;
  const n = d.flags.length;
  const step = Math.min(26.4, 316 / Math.max(1, n - 1));
  return (
    <Svg h={200}>
      <Line pts={[[8, base], [352, base]]} seed={seed} stroke={C.pencil} w={1.3} />
      {d.flags.map((f, i) => {
        const x = x0 + i * step;
        const L = 11 + Math.min(f.kmh, 60) * 0.42;
        const droop = ((1 - Math.min(f.kmh, 38) / 38) * 72 * Math.PI) / 180;
        const h = 7 + Math.min(f.kmh, 60) * 0.07;
        const col = f.kmh >= 29 ? C.warm : f.kmh >= 12 ? C.amber : C.moss;
        return (
          <g key={i}>
            <Line pts={[[x, base], [x, top]]} seed={seed + 100 + i} w={1.6} />
            <Shape pts={[[x, top], [x + Math.cos(droop) * L, top + Math.sin(droop) * L], [x, top + h]]} seed={seed + 200 + i} fill={col} w={1.2} />
            {f.label && <Txt x={x} y={base + 22} size={15} anchor="middle" fill={C.pencil}>{f.label}</Txt>}
          </g>
        );
      })}
      <Txt x={x0 - 6} y={44} size={17} bold>{d.first}</Txt>
      <Txt x={352} y={44} size={17} anchor="end" bold>{d.last}</Txt>
    </Svg>
  );
}

function Umbrellas({ d, seed }: { d: Extract<Model, { kind: 'umbrellas' }>; seed: number }) {
  const step = 50;
  const x0 = 30;
  return (
    <Svg h={162}>
      {d.days.map((day, i) => {
        const x = x0 + i * step;
        const r = rng(seed + 60 + i);
        return (
          <g key={i}>
            {day.wet === 'snow' ? (
              <>
                <Flake x={x} y={70} r={17} seed={seed + 30 + i * 40} />
                {[[-16, 28], [14, 22], [-4, 38], [18, 104], [-17, 98]].map(([dx, dy], k) => (
                  <Flake key={k} x={x + dx} y={dy} r={3.5} seed={seed + 50 + i * 40 + k * 3} w={1.1} />
                ))}
              </>
            ) : day.wet === 'dry' ? (
              <>
                <Shape pts={[[x, 46], [x + 6, 66], [x + 4, 92], [x - 4, 92], [x - 6, 66]]} seed={seed + 10 + i} fill={C.wash} />
                <Line pts={[[x, 92], [x, 112], [x + 4, 118], [x + 9, 114]]} seed={seed + 20 + i} w={1.8} />
              </>
            ) : (
              <>
                <Shape
                  pts={[
                    ...Array.from({ length: 13 }, (_, k) => {
                      const t = Math.PI + (k / 12) * Math.PI;
                      return [x + Math.cos(t) * 21, 64 + Math.sin(t) * 20] as const;
                    }),
                    [x + 21, 64], [x + 14, 68], [x + 7, 64], [x, 68], [x - 7, 64], [x - 14, 68], [x - 21, 64],
                  ]}
                  seed={seed + 30 + i} fill={C.cold}
                />
                <Line pts={[[x, 66], [x, 108], [x + 4, 114], [x + 9, 110]]} seed={seed + 40 + i} w={1.8} />
                {Array.from({ length: day.wet === 'wet' ? 5 : 2 }, (_, k) => {
                  const dx = x - 22 + r() * 44;
                  const dy = 12 + r() * 18;
                  return <Line key={k} pts={[[dx, dy], [dx - 2, dy + 7]]} seed={seed + 70 + i * 9 + k} stroke={C.waterInk} w={1.6} />;
                })}
              </>
            )}
            <Txt x={x} y={140} size={19} anchor="middle" bold={day.strong}>{day.label}</Txt>
            {day.note && <Txt x={x} y={156} size={15} anchor="middle" fill={day.wet === 'dry' ? C.pencil : C.cold}>{day.note}</Txt>}
          </g>
        );
      })}
    </Svg>
  );
}

function Wave({ d, seed }: { d: Extract<Model, { kind: 'wave' }>; seed: number }) {
  const { t } = useGdLocale();
  const base = 196;
  const pm = Math.min(60, 160 / Math.max(d.waveM, PERSON_M));
  const crest = base - d.waveM * pm;
  const w = (k: number) => crest + k * Math.min(1, (base - crest) / 72);
  const pts: Pt[] = [[10, base], [10, w(26)], [40, w(18)], [72, w(6)], [104, crest], [132, w(2)], [150, w(12)], [146, w(22)], [136, w(20)], [146, w(34)], [170, w(46)], [196, base - 6], [204, base]];
  const hint = d.airC !== undefined && d.waterC !== undefined && d.waterC - d.airC >= 3;
  return (
    <Svg h={248}>
      <Line pts={[[6, base], [354, base]]} seed={seed} stroke={C.pencil} w={1.3} />
      <Shape pts={pts} seed={seed + 8} fill={C.water} stroke={C.waterInk} w={1.8} />
      <Person x={262} y={base} h={PERSON_M * pm} seed={seed + 40} wear={d.wear} />
      <Line pts={[[112, crest], [300, crest]]} seed={seed + 51} stroke={C.warm} w={1.3} dash="3 4" />
      <Txt x={304} y={crest + 5} size={18} bold fill={C.warm}>{d.bandLabel ?? d.band}</Txt>
      <Line pts={[[218, crest], [218, base]]} seed={seed + 52} w={1.2} />
      <Txt x={212} y={(crest + base) / 2 + 6} size={18} anchor="end" bold>{`${d.waveM.toFixed(1)} m`}</Txt>
      {d.wearLabel && <Txt x={262} y={base + 22} size={18} anchor="middle" bold fill={C.ink}>{d.wearLabel}</Txt>}
      <Txt x={262} y={base + (d.wearLabel ? 40 : 22)} size={15} anchor="middle" fill={C.pencil}>{t('draw_person', { m: PERSON_M })}</Txt>
      {d.airC !== undefined && <Txt x={20} y={30} size={21} bold fill={C.warm}>{t('draw_air', { t: Math.round(d.airC) })}</Txt>}
      {d.waterC !== undefined && <Txt x={22} y={base - 12} size={21} bold fill={C.waterInk}>{t('draw_water', { t: Math.round(d.waterC) })}</Txt>}
      {hint && <Txt x={100} y={30} size={17} fill={C.pencil}>{t('draw_colder_than_sea')}</Txt>}
    </Svg>
  );
}

function Tide({ d, seed }: { d: Extract<Model, { kind: 'tide' }>; seed: number }) {
  const { L: loc, t } = useGdLocale();
  const L = 34;
  const R = 232;
  const B = 232;
  const h0 = Math.floor(d.from.h) - 1;
  const h1 = Math.ceil(d.to.h) + 1;
  const lo = Math.min(0, Math.floor(Math.min(d.from.m, d.to.m)));
  const hi = Math.ceil(Math.max(d.from.m, d.to.m) + 0.6);
  const pm = (B - 30) / (hi - lo);
  const Y = (m: number) => B - (m - lo) * pm;
  const X = (h: number) => L + ((R - L) * (h - h0)) / (h1 - h0);
  const mid = (d.from.m + d.to.m) / 2;
  const amp = (d.to.m - d.from.m) / 2;
  const level = (h: number) => mid - amp * Math.cos((Math.PI * (h - d.from.h)) / (d.to.h - d.from.h));
  const curve: Pt[] = [];
  for (let h = h0; h <= h1 + 0.001; h += 0.25) curve.push([X(h), Y(level(h))]);
  const low = d.from.m < d.to.m ? d.from : d.to;
  const high = d.from.m < d.to.m ? d.to : d.from;
  const ph = PERSON_M * pm;
  // The same bands the sentence uses (`inPeople`), so the drawing never shows
  // one person under a sentence that says two.
  const people = d.rangeM / PERSON_M;
  const stack = people < 1.75 ? 1 : people < 2.75 ? 2 : Math.min(3, Math.round(people));
  const andABit = (people >= 1.15 && people < 1.75) || (people >= 2.15 && people < 2.75);
  const ticks: number[] = [];
  for (let h = Math.ceil(h0 / 2) * 2; h <= h1; h += 2) ticks.push(h);
  const tickLabel = (h: number) => tick(loc, h);
  const labelEnd = (p: { h: number }) => (X(p.h) > (L + R) / 2 ? 'end' : 'start');
  return (
    <Svg h={262}>
      <path d={rough([...curve, [X(h1), B], [X(h0), B]], seed + 4, 1, true)} fill={C.water} />
      <Line pts={curve} seed={seed + 6} stroke={C.waterInk} w={2.4} />
      <Line pts={[[L - 4, B], [352, B]]} seed={seed + 7} stroke={C.pencil} w={1.3} />
      {ticks.map((h) => <Txt key={h} x={X(h)} y={B + 20} size={15} anchor="middle" fill={C.pencil}>{tickLabel(h)}</Txt>)}
      {Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).map((m) => (
        <Txt key={m} x={L - 8} y={Y(m) + 5} size={14} anchor="end" fill={C.pencil}>{`${m}m`}</Txt>
      ))}
      {[low, high].map((p, i) => (
        <g key={i}>
          <circle cx={X(p.h)} cy={Y(p.m)} r={4} fill={C.ink} />
          <Txt x={X(p.h) + (labelEnd(p) === 'end' ? -6 : 8)} y={Y(p.m) - 12} size={17} bold anchor={labelEnd(p)}>
            {t(p.type === 'high' ? 'draw_tide_high' : 'draw_tide_low', { m: p.m.toFixed(1) })}
          </Txt>
        </g>
      ))}
      <Line pts={[[X(low.h) + 4, Y(low.m)], [340, Y(low.m)]]} seed={seed + 20} stroke={C.pencil} w={1} dash="2 5" />
      <Line pts={[[X(high.h) + 4, Y(high.m)], [340, Y(high.m)]]} seed={seed + 21} stroke={C.waterInk} w={1.4} dash="4 4" />
      {Array.from({ length: stack }, (_, k) => (
        <Person key={k} x={300} y={Y(low.m) - k * ph * 0.86} h={ph} seed={seed + 30 + k * 6} />
      ))}
      {andABit && <Txt x={300} y={Y(high.m) - 10} size={17} anchor="middle" bold fill={C.waterInk}>{t('draw_plus_a_bit')}</Txt>}
      <Line pts={[[268, Y(low.m) - 2], [268, Y(high.m) + 2]]} seed={seed + 40} w={1.2} />
      <Txt x={262} y={(Y(low.m) + Y(high.m)) / 2 + 6} size={18} bold anchor="end">{`${d.rangeM.toFixed(1)} m`}</Txt>
    </Svg>
  );
}

function Daylight({ d, seed }: { d: Extract<Model, { kind: 'daylight' }>; seed: number }) {
  const { t, L } = useGdLocale();
  const id = useId().replace(/:/g, '');
  const r = 11;
  const step = 27.5;
  const x0 = 30;
  const cell = (hr: number) => ({ cx: x0 + (hr % 12) * step, cy: 36 + (hr < 12 ? 0 : 62) });
  const clampX = (x: number) => Math.max(56, Math.min(304, x));
  const rise = cell(Math.floor(d.riseH));
  const set = cell(Math.min(23, Math.floor(d.setH)));
  return (
    <Svg h={162}>
      <defs>
        {Array.from({ length: 24 }, (_, hr) => {
          const lit = Math.max(0, Math.min(1, Math.min(hr + 1, d.setH) - Math.max(hr, d.riseH)));
          if (!lit) return null;
          const { cx, cy } = cell(hr);
          // The lit part of an hour sits on the side the sun is: the end of a
          // sunrise hour, the start of a sunset hour.
          const x = hr < d.riseH + 1 && hr < 12 ? cx + r - 2 * r * lit : cx - r;
          return <clipPath key={hr} id={`${id}h${hr}`}><rect x={x} y={cy - r - 2} width={2 * r * lit + 1} height={2 * r + 4} /></clipPath>;
        })}
      </defs>
      {Array.from({ length: 24 }, (_, hr) => {
        const lit = Math.max(0, Math.min(1, Math.min(hr + 1, d.setH) - Math.max(hr, d.riseH)));
        const { cx, cy } = cell(hr);
        return (
          <g key={hr}>
            {lit > 0 && <path d={rough(circle(cx, cy, r, 14), seed + hr, 0.8, true)} fill={C.sun} clipPath={`url(#${id}h${hr})`} />}
            <path d={rough(circle(cx, cy, r, 14), seed + hr, 1.1, true)} fill="none" stroke={lit > 0 ? C.ink : C.pencil} strokeWidth={1.4} />
          </g>
        );
      })}
      <Txt x={x0 - r} y={14} size={15} fill={C.pencil}>{L.clock === '24h' ? '00:00' : t('draw_midnight')}</Txt>
      <Txt x={x0 - r} y={78} size={15} fill={C.pencil}>{L.clock === '24h' ? '12:00' : t('draw_noon')}</Txt>
      <Txt x={350} y={14} size={15} anchor="end" fill={C.pencil}>{d.lengthLabel}</Txt>
      <Txt x={clampX(rise.cx)} y={rise.cy + 30} size={17} anchor="middle" bold>{d.riseLabel}</Txt>
      <Txt x={clampX(set.cx)} y={set.cy + 30} size={17} anchor="middle" bold fill={C.warm}>{d.setLabel}</Txt>
    </Svg>
  );
}

function Dots({ d, seed }: { d: Extract<Model, { kind: 'dots' }>; seed: number }) {
  const { t, L } = useGdLocale();
  const id = useId().replace(/:/g, '');
  const n = Math.min(30, Math.max(d.limit, Math.ceil(d.value)));
  const step = Math.min(22.5, 330 / n);
  const r = Math.min(8, step * 0.36);
  const x0 = 20;
  const cy = 56;
  const limitX = x0 + (d.limit - 1) * step + r + 4;
  return (
    <Svg h={112}>
      <defs>
        {Array.from({ length: n }, (_, i) => {
          const f = Math.max(0, Math.min(1, d.value - i));
          const cx = x0 + i * step;
          return f > 0 ? <clipPath key={i} id={`${id}a${i}`}><rect x={cx - r} y={cy - r - 2} width={2 * r * f} height={2 * r + 4} /></clipPath> : null;
        })}
      </defs>
      {Array.from({ length: n }, (_, i) => {
        const f = Math.max(0, Math.min(1, d.value - i));
        const cx = x0 + i * step;
        const over = i >= d.limit;
        return (
          <g key={i}>
            {f > 0 && <path d={rough(circle(cx, cy, r, 12), seed + i, 0.8, true)} fill={over ? C.warm : C.moss} clipPath={`url(#${id}a${i})`} />}
            <path d={rough(circle(cx, cy, r, 12), seed + i, 1, true)} fill="none" stroke={f > 0 ? C.ink : C.pencil} strokeWidth={1.3} />
          </g>
        );
      })}
      <Line pts={[[limitX, cy - 18], [limitX, cy + 18]]} seed={seed + 50} stroke={C.warm} w={1.8} />
      <Txt x={x0 - r} y={24} size={19} bold fill={d.value > d.limit ? C.warm : C.moss}>{t('draw_today_value', { v: fmt(L, d.value, 1) })}</Txt>
      <Txt x={350} y={24} size={17} anchor="end" fill={C.warm}>{t('draw_who_limit', { n: d.limit })}</Txt>
      <Txt x={x0 - r} y={100} size={16} fill={C.pencil}>{t('draw_dust_key')}</Txt>
    </Svg>
  );
}


/**
 * Flip flops, bare feet, trainers, boots, wellies, and wellies again.
 *
 * Everything up to "a bit soggy" stands ON the ground — soggy gets a little mud
 * on the sole. Muddy is a whole welly in a puddle; very muddy has the foot of
 * the welly sunk.
 */
function Footwear({ d, seed }: { d: Extract<Model, { kind: 'footwear' }>; seed: number }) {
  const { t, L } = useGdLocale();
  const FOOTWEAR_LABELS = L.shoes;
  const id = useId().replace(/:/g, '');
  const ground = 92;
  const step = 58;
  const x0 = 34;
  const SINK = [0, 0, 0, 0, 0, 12];

  const foot = (x: number, f: number, s: number) => (
    <>
      <Shape pts={[[x - 6, f - 34], [x + 4, f - 34], [x + 4, f - 14], [x + 16, f - 9], [x + 22, f - 4], [x + 22, f], [x - 10, f], [x - 12, f - 8], [x - 7, f - 14]]} seed={s} fill={C.skin} w={1.5} />
      {[14, 18, 21].map((dx, k) => <circle key={k} cx={x + dx} cy={f - 6 + k} r={1.1} fill={C.ink} opacity={0.5} />)}
    </>
  );
  const welly = (x: number, f: number, s: number) => (
    <>
      <Shape pts={[[x - 8, f - 48], [x + 6, f - 48], [x + 6, f - 12], [x + 20, f - 8], [x + 23, f], [x - 10, f], [x - 10, f - 14]]} seed={s} fill={C.welly} />
      <Line pts={[[x - 9, f - 42], [x + 5, f - 42]]} seed={s + 1} w={1.1} />
      <Line pts={[[x - 4, f - 38], [x - 4, f - 20]]} seed={s + 2} stroke={C.paper} w={1.6} opacity={0.6} />
    </>
  );
  const WEAR = [
    (x: number, f: number, s: number) => (
      <>
        {foot(x, f - 3, s)}
        <Shape pts={[[x - 13, f - 3], [x + 25, f - 3], [x + 25, f], [x - 13, f]]} seed={s + 1} fill={C.cold} w={1.3} />
        <Line pts={[[x + 13, f - 3], [x + 4, f - 12], [x - 4, f - 4]]} seed={s + 2} stroke={C.cold} w={2} />
      </>
    ),
    (x: number, f: number, s: number) => foot(x, f, s),
    (x: number, f: number, s: number) => (
      <>
        <Shape pts={[[x - 6, f - 34], [x + 4, f - 34], [x + 4, f - 16], [x - 6, f - 16]]} seed={s} fill={C.skin} w={1.4} />
        <Shape pts={[[x - 11, f - 17], [x + 4, f - 19], [x + 12, f - 13], [x + 22, f - 8], [x + 25, f - 2], [x + 25, f], [x - 12, f]]} seed={s + 1} fill={C.paper} />
        <Line pts={[[x - 12, f - 4], [x + 25, f - 4]]} seed={s + 2} w={1} />
        {[0, 1, 2].map((k) => <Line key={k} pts={[[x + 3 + k * 4, f - 16 + k * 2], [x + 7 + k * 4, f - 14 + k * 2]]} seed={s + 3 + k} w={1} />)}
      </>
    ),
    (x: number, f: number, s: number) => (
      <>
        <Shape pts={[[x - 9, f - 30], [x + 6, f - 30], [x + 6, f - 13], [x + 20, f - 8], [x + 23, f], [x - 11, f], [x - 11, f - 14]]} seed={s} fill={C.leather} />
        <Line pts={[[x - 11, f - 3], [x + 23, f - 3]]} seed={s + 1} w={1.4} />
        {[0, 1, 2].map((k) => <Line key={k} pts={[[x + 1, f - 26 + k * 5], [x + 6, f - 26 + k * 5]]} seed={s + 2 + k} w={1} />)}
        {/* a bit soggy: a little mud on the sole and toe */}
        <Shape pts={[[x - 11, f - 4], [x - 4, f - 6], [x + 4, f - 4], [x + 12, f - 7], [x + 20, f - 6], [x + 24, f - 2], [x + 23, f], [x - 11, f]]} seed={s + 9} fill={C.mud} stroke="none" w={0} />
        <circle cx={x + 6} cy={f - 9} r={1.6} fill={C.mud} />
        <circle cx={x - 6} cy={f - 8} r={1.2} fill={C.mud} />
      </>
    ),
    welly,
    welly,
  ];

  return (
    <Svg h={170}>
      <defs>
        {FOOTWEAR_LABELS.map((_, i) => (
          <clipPath key={i} id={`${id}g${i}`}><rect x={x0 + i * step - 30} y={0} width={62} height={ground} /></clipPath>
        ))}
      </defs>
      {FOOTWEAR_LABELS.map(([a, b], i) => {
        const x = x0 + i * step;
        const on = i === d.index;
        const pr = rng(seed + 590 + i);
        return (
          <g key={i}>
            {i >= 4 && (
              <Shape pts={[[x - 10 - i * 4 - 6, ground], [x - 10 - i * 4, ground - 3 - i * 0.6], [x + 10 + i * 4, ground - 3 - i * 0.6], [x + 10 + i * 4 + 8, ground], [x + 10 + i * 4, ground + 5], [x - 10 - i * 4, ground + 5]]} seed={seed + 500 + i} fill={C.mud} stroke="none" w={0} />
            )}
            <g clipPath={`url(#${id}g${i})`}>{WEAR[i](x, ground + SINK[i], seed + 520 + i * 10)}</g>
            {i === 4 && (
              <>
                <Shape pts={[[x - 20, ground + 1], [x - 14, ground - 5], [x - 4, ground - 3], [x + 8, ground - 6], [x + 20, ground - 4], [x + 30, ground + 1], [x + 20, ground + 5], [x - 14, ground + 5]]} seed={seed + 596} fill={C.mud} stroke="none" w={0} />
                {Array.from({ length: 6 }, (_, k) => <circle key={k} cx={x - 8 + pr() * 14} cy={ground - 10 - pr() * 16} r={1 + pr() * 1.6} fill={C.mud} />)}
              </>
            )}
            {i === 5 && (
              <>
                <Shape pts={[[x - 24, ground + 1], [x - 16, ground - 6], [x - 9, ground - 4], [x + 7, ground - 4], [x + 16, ground - 7], [x + 28, ground + 1], [x + 18, ground + 6], [x - 16, ground + 6]]} seed={seed + 598} fill={C.mud} stroke="none" w={0} />
                {Array.from({ length: 5 }, (_, k) => <circle key={k} cx={x - 14 + pr() * 36} cy={ground - 8 - pr() * 30} r={1.5 + pr() * 2} fill={C.mud} />)}
              </>
            )}
            <Txt x={x + 4} y={ground + 34} size={17} anchor="middle" bold={on} fill={on ? C.ink : C.pencil}>{a}</Txt>
            {b && <Txt x={x + 4} y={ground + 51} size={17} anchor="middle" bold={on} fill={on ? C.ink : C.pencil}>{b}</Txt>}
          </g>
        );
      })}
      <Line pts={[[6, ground], [354, ground]]} seed={seed + 560} stroke={C.mud} w={2} />
      {d.frost && (
        <g>
          {Array.from({ length: 15 }, (_, k) => <Flake key={k} x={14 + k * 24} y={ground + 7} r={3.2} seed={seed + 700 + k * 3} w={1} />)}
          <Txt x={d.index >= 3 ? 6 : 354} y={22} size={17} bold anchor={d.index >= 3 ? 'start' : 'end'} fill={C.cold}>
            {t('draw_frost_overnight', { t: `${d.frost.lowC < 0 ? '−' : ''}${Math.abs(Math.round(d.frost.lowC))}°` })}
          </Txt>
          {d.frost.icy && <Txt x={d.index >= 3 ? 6 : 354} y={40} size={16} anchor={d.index >= 3 ? 'start' : 'end'} fill={C.cold}>{t('draw_icy')}</Txt>}
        </g>
      )}
      <Txt x={x0 + d.index * step + 4} y={24} size={19} anchor="middle" bold fill={C.amber}>{t('draw_today')}</Txt>
      <Line pts={[[x0 + d.index * step + 4, 30], [x0 + d.index * step + 4, 38]]} seed={seed + 570} stroke={C.amber} w={1.6} />
    </Svg>
  );
}

/** Snow lying, against a leg: ankle, shin, knee, thigh. */
function SnowDepth({ d, seed }: { d: Extract<Model, { kind: 'snowDepth' }>; seed: number }) {
  const { t } = useGdLocale();
  const G = 168;
  const px = 1.3;
  const Y = (cm: number) => G - Math.min(cm, 105) * px;
  const x = 170;
  const top = Y(Math.min(d.cm, 100));
  const r = rng(seed + 9);
  const surface: Pt[] = [[14, G]];
  for (let k = 0; k <= 16; k++) surface.push([14 + k * 20.5, top - 3 + r() * 6]);
  surface.push([342, G]);
  const marks: Array<[number, string]> = [[10, t('leg_ankle')], [28, t('leg_shin')], [50, t('leg_knee')], [78, t('leg_thigh')]];
  return (
    <Svg h={196}>
      {/* the leg and its welly, drawn first so the snow sits over them */}
      <Line pts={[[x - 4, Y(105)], [x + 4, Y(50)], [x, Y(10)]]} seed={seed} w={2.4} />
      <Line pts={[[x + 14, Y(105)], [x + 18, Y(50)], [x + 13, Y(14)]]} seed={seed + 1} w={2.4} />
      <Shape pts={[[x - 3, Y(32)], [x + 15, Y(32)], [x + 15, Y(8)], [x + 34, Y(5)], [x + 36, G], [x - 5, G], [x - 5, Y(8)]]} seed={seed + 2} fill={C.welly} />
      <Shape pts={surface} seed={seed + 3} fill={C.snow} stroke={C.cold} w={1.6} />
      {Array.from({ length: 14 }, (_, k) => <circle key={k} cx={22 + r() * 316} cy={top + 6 + r() * Math.max(4, G - top - 10)} r={1.2} fill={C.cold} opacity={0.5} />)}
      {marks.map(([cm, label], k) => (
        <g key={k}>
          <Line pts={[[x + 40, Y(cm)], [x + 52, Y(cm)]]} seed={seed + 20 + k} stroke={C.pencil} w={1.2} />
          <Txt x={x + 58} y={Y(cm) + 5} size={15} fill={C.pencil}>{label}</Txt>
        </g>
      ))}
      <Line pts={[[70, G - 2], [70, top + 2]]} seed={seed + 30} w={1.2} />
      <Txt x={62} y={Math.min(G - 6, (G + top) / 2 + 6)} size={18} anchor="end" bold fill={C.cold}>{`${Math.round(d.cm)} cm`}</Txt>
      <Line pts={[[8, G], [352, G]]} seed={seed + 31} stroke={C.pencil} w={1.3} />
    </Svg>
  );
}

/** A frost: a thermometer below zero, and the grass crisp with it. */
function Frost({ d, seed }: { d: Extract<Model, { kind: 'frost' }>; seed: number }) {
  const { t } = useGdLocale();
  const lo = Math.min(-10, Math.floor(d.lowC / 5) * 5);
  const hi = 10;
  const B = 130;
  const T = 26;
  const Y = (v: number) => B - ((B - T) * (v - lo)) / (hi - lo);
  const x = 52;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += 5) ticks.push(t);
  const G = 120;
  return (
    <Svg h={160}>
      {ticks.map((t) => <Txt key={t} x={x - 18} y={Y(t) + 5} size={14} anchor="end" bold={t === 0} fill={t === 0 ? C.ink : C.pencil}>{`${t < 0 ? '−' : ''}${Math.abs(t)}°`}</Txt>)}
      <Line pts={[[x - 8, Y(hi) - 4], [x - 8, B], [x + 8, B], [x + 8, Y(hi) - 4]]} seed={seed} w={1.8} />
      <path d={rough([[x - 4, Y(d.lowC)], [x + 4, Y(d.lowC)], [x + 4, B + 4], [x - 4, B + 4]], seed + 2, 1, true)} fill={C.cold} />
      <Shape pts={circle(x, B + 11, 12)} seed={seed + 3} fill={C.cold} />
      <Line pts={[[x + 10, Y(0)], [x + 26, Y(0)]]} seed={seed + 4} stroke={C.ink} w={1.4} dash="3 3" />
      <Line pts={[[110, G], [352, G]]} seed={seed + 5} stroke={C.pencil} w={1.3} />
      {Array.from({ length: 24 }, (_, k) => {
        const bx = 116 + k * 10;
        const lean = (k % 3) - 1;
        return (
          <g key={k}>
            <Line pts={[[bx, G], [bx + lean * 3, G - 14 - (k % 4) * 3]]} seed={seed + 10 + k} stroke={C.moss} w={1.4} />
            {k % 2 === 0 && <Flake x={bx + lean * 3} y={G - 15 - (k % 4) * 3} r={2.8} seed={seed + 60 + k * 3} w={0.9} />}
          </g>
        );
      })}
      <Txt x={352} y={44} size={22} anchor="end" bold fill={C.cold}>{t('draw_frost_word')}</Txt>
      <Txt x={352} y={70} size={18} anchor="end" fill={C.cold}>{d.label}</Txt>
    </Svg>
  );
}

/** Fog: trees at known distances, and the ones past what you can see are lost in it. */
function Visibility({ d, seed }: { d: Extract<Model, { kind: 'visibility' }>; seed: number }) {
  const { t, L } = useGdLocale();
  const G = 128;
  const D = [20, 50, 100, 200, 500, 1000, 2000];
  const lx = (m: number) => 72 + ((Math.log10(Math.max(20, Math.min(2000, m))) - Math.log10(20)) / 2) * 268;
  const seeTo = lx(d.m);
  const label = (m: number) => (m >= 1000 ? `${fmt(L, m / 1000, 0)} km` : `${m} m`);
  return (
    <Svg h={176}>
      <Person x={30} y={G} h={62} seed={seed} />
      <Txt x={30} y={G + 20} size={15} anchor="middle" fill={C.pencil}>{t('draw_you')}</Txt>
      {D.map((m, i) => {
        const x = lx(m);
        const s = 1 - 0.45 * (i / (D.length - 1));
        const seen = m <= d.m;
        return (
          <g key={m} opacity={seen ? 1 : 0.18}>
            <Line pts={[[x, G], [x, G - 34 * s]]} seed={seed + 10 + i} stroke={C.ink} w={1.8 * s + 0.4} />
            <Shape pts={circle(x, G - 44 * s, 14 * s, 12)} seed={seed + 20 + i} fill={C.moss} w={1.2} />
            {i !== 0 && <Txt x={x} y={G + 20} size={14} anchor="middle" fill={C.pencil}>{label(m)}</Txt>}
          </g>
        );
      })}
      <rect x={seeTo + 8} y={10} width={Math.max(0, 352 - seeTo - 8)} height={G - 8} fill={C.wash} opacity={0.75} />
      <Line pts={[[seeTo + 8, 26], [seeTo + 8, G]]} seed={seed + 40} stroke={C.cold} w={1.4} dash="4 4" />
      {/* Right of the line while there is room, left of it once the fog is far off. */}
      <Txt x={seeTo > 200 ? seeTo + 2 : seeTo + 14} y={22} size={17} bold anchor={seeTo > 200 ? 'end' : 'start'} fill={C.cold}>{t('draw_see_this_far')}</Txt>
      <Line pts={[[8, G], [352, G]]} seed={seed + 41} stroke={C.pencil} w={1.3} />
    </Svg>
  );
}

function Moon({ d, seed }: { d: Extract<Model, { kind: 'moon' }>; seed: number }) {
  const { t, L: loc } = useGdLocale();
  const cx = 48;
  const cy = 62;
  const r = 30;
  // Lit fraction to the terminator's half-width: 50% lit is a straight line.
  const k = Math.abs(1 - 2 * Math.min(1, Math.max(0, d.illuminationPct / 100)));
  const gibbous = d.illuminationPct > 50;
  const L = 112;
  const R = 350;
  const X = (h: number) => L + ((R - L) * (h - d.fromH)) / (24 - d.fromH);
  const y = 88;
  const ticks: number[] = [];
  for (let h = Math.ceil(d.fromH / 2) * 2; h <= 24; h += 2) ticks.push(h);
  const tl = (h: number) => tick(loc, h);
  const stars = rng(seed + 77);
  const dark = d.darkFromH;
  return (
    <Svg h={152}>
      <Shape pts={circle(cx, cy, r, 18)} seed={seed + 5} fill={C.wash} stroke={C.pencil} w={1.4} amp={1} />
      {/* The lit part, drawn on the right for a waxing moon and mirrored for waning. */}
      <g transform={d.waxing ? undefined : `translate(${2 * cx} 0) scale(-1 1)`}>
        <path
          d={`M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} A${(r * k).toFixed(1)} ${r} 0 0 ${gibbous ? 1 : 0} ${cx} ${cy - r} Z`}
          fill={C.lit} stroke={C.ink} strokeWidth={1.4}
        />
      </g>
      <Txt x={cx} y={cy + r + 24} size={17} anchor="middle" bold>{t('moon_lit', { pct: Math.round(d.illuminationPct) })}</Txt>
      {dark !== undefined && dark < 24 && (
        <path d={rough([[X(dark), y - 40], [X(24), y - 40], [X(24), y], [X(dark), y]], seed + 7, 1, true)} fill={C.wash} />
      )}
      <Line pts={[[L, y], [R, y]]} seed={seed + 8} stroke={C.pencil} w={1.3} />
      {ticks.map((h) => <Txt key={h} x={X(h)} y={y + 22} size={15} anchor="middle" fill={C.pencil}>{tl(h)}</Txt>)}
      {d.event && (
        <g>
          {d.event.type === 'set'
            ? <Line pts={[[X(d.fromH), y - 30], [X((d.fromH + d.event.h) / 2), y - 20], [X(d.event.h), y]]} seed={seed + 9} stroke={C.pencil} w={1.1} dash="2 4" />
            : <Line pts={[[X(d.event.h), y], [X(Math.min(24, d.event.h + 1)), y - 22]]} seed={seed + 9} stroke={C.pencil} w={1.1} dash="2 4" />}
          <circle
            cx={d.event.type === 'set' ? X(d.fromH + (d.event.h - d.fromH) * 0.3) : X(Math.min(24, d.event.h + 0.7))}
            cy={d.event.type === 'set' ? y - 25 : y - 16} r={5} fill={C.lit} stroke={C.ink} strokeWidth={1.2}
          />
          <Line pts={[[X(d.event.h), y - 6], [X(d.event.h), y + 6]]} seed={seed + 10} w={1.6} />
          <Txt x={Math.max(L + 40, Math.min(R - 40, X(d.event.h)))} y={y + 42} size={17} anchor="middle" bold>{d.event.label}</Txt>
        </g>
      )}
      {dark !== undefined && dark < 23.5 && (
        <g>
          {Array.from({ length: 9 }, (_, i) => {
            const sx = X(dark) + 14 + stars() * Math.max(10, X(24) - X(dark) - 24);
            const sy = y - 34 + stars() * 26;
            const a = 3 + stars() * 2;
            return (
              <g key={i}>
                <Line pts={[[sx - a, sy], [sx + a, sy]]} seed={seed + 80 + i} w={1.1} />
                <Line pts={[[sx, sy - a], [sx, sy + a]]} seed={seed + 90 + i} w={1.1} />
              </g>
            );
          })}
          <Txt x={(X(dark) + X(24)) / 2} y={y - 46} size={18} anchor="middle" bold>{t('draw_dark_sky')}</Txt>
        </g>
      )}
    </Svg>
  );
}

export function Drawing({ drawing, seed }: { drawing: Model; seed: number }) {
  switch (drawing.kind) {
    case 'thermometers': return <Thermometers d={drawing} seed={seed} />;
    case 'flags': return <Flags d={drawing} seed={seed} />;
    case 'umbrellas': return <Umbrellas d={drawing} seed={seed} />;
    case 'wave': return <Wave d={drawing} seed={seed} />;
    case 'tide': return <Tide d={drawing} seed={seed} />;
    case 'daylight': return <Daylight d={drawing} seed={seed} />;
    case 'dots': return <Dots d={drawing} seed={seed} />;
    case 'footwear': return <Footwear d={drawing} seed={seed} />;
    case 'moon': return <Moon d={drawing} seed={seed} />;
    case 'snowDepth': return <SnowDepth d={drawing} seed={seed} />;
    case 'frost': return <Frost d={drawing} seed={seed} />;
    case 'visibility': return <Visibility d={drawing} seed={seed} />;
    default: return null;
  }
}
