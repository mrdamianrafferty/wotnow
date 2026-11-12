/**
 * The landing hero: four days, drawn in pencil one after another.
 *
 * Replaces the photographed surf call. Each day's drawing comes from
 * `lib/godaisy/landing/drawnDays.ts` and draws itself on, then the day holds
 * and fades into the next.
 *
 * MOTION RULES.
 * - The draw-on animations live in CSS behind `prefers-reduced-motion:
 *   no-preference`, so the server's markup animates from first paint with no
 *   flash of a finished drawing, and a reduced-motion visitor (or one without
 *   script) simply gets it finished.
 * - It pauses itself, without being asked, while the tab is hidden, so a
 *   background tab is not cycling for nobody.
 * - A Pause button stops the reel, because anything that moves on its own for
 *   more than five seconds needs one (WCAG 2.2.2).
 * - With reduced motion it never advances on its own; the day buttons still
 *   switch.
 *
 * The server renders the first day, so the page is complete before any script
 * runs and a crawler reads "a surf day." as the h1.
 *
 * @module components/landing/DrawnDays
 */

import React, { useCallback, useEffect, useState } from 'react';
import { DRAWN_DAYS, DAY_MS, VIEW, type Mark } from '@/lib/godaisy/landing/drawnDays';

const FADE_MS = 450;

function MarkEl({ m, animate, i }: { m: Mark; animate: boolean; i: number }) {
  const delay = { animationDelay: `${m.at.toFixed(2)}s` } as React.CSSProperties;
  if (m.kind === 'group') {
    return (
      <g className={animate ? 'gd-dd-pop' : undefined} style={animate ? delay : undefined}>
        {m.marks.map((c, k) => <MarkEl key={k} m={c} animate={false} i={k} />)}
      </g>
    );
  }
  if (m.kind === 'text') {
    return (
      <text
        x={m.x} y={m.y} fontSize={m.size} fill={m.fill} textAnchor={m.anchor} fontWeight={m.weight}
        className={animate ? 'gd-dd-fade' : undefined} style={animate ? delay : undefined}
      >
        {m.text}
      </text>
    );
  }
  const cls = !animate ? undefined : m.arrive === 'draw' ? 'gd-dd-draw' : m.arrive === 'wash' ? 'gd-dd-wash' : 'gd-dd-fade';
  const style = !animate ? undefined : ({
    ...delay,
    animationDuration: m.arrive === 'draw' ? `${m.dur}s` : undefined,
    ['--gd-dd-len' as string]: m.len,
  } as React.CSSProperties);
  return (
    <path
      key={i} d={m.d} fill={m.fill} fillOpacity={m.fillOpacity} stroke={m.stroke} strokeWidth={m.width}
      strokeDasharray={m.dash} strokeLinecap="round" strokeLinejoin="round" className={cls} style={style}
    />
  );
}

export default function DrawnDays() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [run, setRun] = useState(0); // remounts the drawing so it draws again
  // Until the browser answers, assume stillness: no autoplay, no Pause button.
  const [still, setStill] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      setStill(mq.matches);
      setPaused(mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    const vis = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', vis);
    return () => {
      mq.removeEventListener('change', apply);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  const go = useCallback((n: number) => {
    setI(((n % DRAWN_DAYS.length) + DRAWN_DAYS.length) % DRAWN_DAYS.length);
    setRun((r) => r + 1);
    setLeaving(false);
  }, []);

  useEffect(() => {
    if (paused || hidden || still) return;
    let fade: ReturnType<typeof setTimeout> | undefined;
    const t = setTimeout(() => {
      setLeaving(true);
      fade = setTimeout(() => go(i + 1), FADE_MS);
    }, DAY_MS);
    return () => { clearTimeout(t); if (fade) clearTimeout(fade); };
  }, [i, run, paused, hidden, still, go]);

  const day = DRAWN_DAYS[i];
  const marks = day.marks();

  return (
    <section className={`gd-land-drawn${leaving ? ' is-leaving' : ''}`} aria-roledescription="carousel" aria-label="What a day can be good for">
      <div className="gd-land-drawn-inner">
        <div className="gd-land-drawn-text" key={`t${run}`}>
          <p className="gd-land-kicker is-dark">{day.kicker}</p>
          <p className="gd-land-lead is-dark">{day.lead}</p>
          <h1 className="gd-land-verdict is-dark">{day.verdict}</h1>
          <p className="gd-land-drawn-hand gd-dd-write" style={{ animationDelay: `${day.handAt}s` }}>
            {day.hand}
          </p>
        </div>
        <svg
          key={`d${run}`}
          className="gd-land-drawn-svg"
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          role="img"
          aria-label={day.label}
        >
          {marks.map((m, k) => <MarkEl key={k} m={m} animate i={k} />)}
        </svg>
      </div>
      <div className="gd-land-drawn-controls">
        <div className="gd-land-drawn-days" role="group" aria-label="Days">
          {DRAWN_DAYS.map((d, k) => (
            <button
              key={d.id}
              type="button"
              // A gd- class opts out of the site-wide grey hover on bare buttons.
              className="gd-land-drawn-day"
              aria-pressed={k === i}
              onClick={() => go(k)}
            >
              {d.name}
            </button>
          ))}
        </div>
        {!still && (
          <button type="button" className="gd-land-drawn-pause" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
            {paused ? 'Play' : 'Pause'}
          </button>
        )}
      </div>
    </section>
  );
}
