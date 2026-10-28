/**
 * One app card's funnel (visitors → downloads → trials → paid) and its errors
 * per 100 active users with the top Sentry issue. Rendered inside AppCard
 * (FamilyDashboard.tsx); every figure comes from lib/admin-dashboard/funnel.ts,
 * and a step the app cannot report says "not tracked" rather than 0.
 */

import { appFunnel, errorRate, type FunnelStep } from '@/lib/admin-dashboard/funnel';
import type { AppSnapshot } from '@/lib/admin-dashboard/family';
import { fmt } from './DashboardParts';
import base from './FamilyDashboard.module.css';
import s from './AppFunnel.module.css';

/** One decimal only where it matters: 0 < x < 10. */
const pctText = (x: number) => fmt(x, x > 0 && x < 10 ? 1 : 0);

/** Bar width relative to the funnel's first tracked step, with a sliver for small non-zero values. */
function width(step: FunnelStep, top: number): string {
  if (step.value === null || top <= 0) return '0%';
  const w = (step.value / top) * 100;
  return `${step.value > 0 ? Math.max(w, 2) : 0}%`;
}

export function FunnelBlock({ app }: { app: AppSnapshot }) {
  const { steps, links } = appFunnel(app);
  const top = Math.max(0, ...steps.map((st) => st.value ?? 0));
  const summary = steps.map((st) => `${st.label} ${st.value === null ? 'not tracked' : fmt(st.value)}`).join(', ');

  return (
    <div className={s.block}>
      <div className={base.compareHead}>
        <span className={base.chipsLabel}>Funnel</span>
        <span>visitors 28 d · stores 30 d · subscriptions now</span>
      </div>
      <ol className={s.steps} aria-label={`${app.name} funnel: ${summary}`}>
        {steps.map((st, i) => (
          <li key={st.key} className={s.step}>
            {i > 0 ? (
              <span className={s.rate} title={links[i - 1].note ?? undefined}>
                {links[i - 1].rate !== null ? `↓ ${pctText(links[i - 1].rate!)}%` : links[i - 1].note ? '↓ n/a' : '↓'}
              </span>
            ) : null}
            <div className={s.row} title={st.note ?? undefined}>
              <span className={s.label}>
                {st.label} <span className={s.window}>{st.window}</span>
              </span>
              <span className={`${s.value} ${base.num}`}>{st.value === null ? <span className={s.untracked}>not tracked</span> : fmt(st.value)}</span>
            </div>
            <div className={base.barTrack}>
              {st.value !== null ? <div className={base.barFill} style={{ width: width(st, top), background: app.color }} /> : null}
            </div>
            {st.value === null && st.note ? <span className={s.note}>{st.note}</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ErrorRateBlock({ app }: { app: AppSnapshot }) {
  const er = errorRate(app);
  const t = app.topIssue;
  return (
    <div className={s.block}>
      <div className={base.compareHead}>
        <span className={base.chipsLabel}>Errors per 100 users</span>
        <span className={base.num}>{er.per100 !== null ? pctText(er.per100) : '—'}</span>
      </div>
      <p className={base.small}>
        {er.per100 !== null
          ? `${fmt(er.errors!)} stored errors ÷ ${fmt(er.users!)} ${er.adjusted ? 'adjusted ' : ''}active users, 7 days`
          : (er.note ?? 'not reported')}
      </p>
      {t ? (
        t.state === 'ok' ? (
          <p className={base.small}>
            Top issue:{' '}
            <a className={base.link} href={t.data.permalink} target="_blank" rel="noopener noreferrer" aria-label={`${t.data.title} (opens Sentry in a new tab)`}>
              {t.data.title}
            </a>{' '}
            <span className={base.num}>· {fmt(t.data.count)} events in 7 d</span>
            {t.data.sharedWith ? ` · project shared with ${t.data.sharedWith}` : ''}
          </p>
        ) : (
          <p className={base.small}>
            Top issue: {t.state === 'error' ? `error: ${t.message}` : (t.note ?? (t.missing.length ? `set ${t.missing.join(', ')}` : 'not reported'))}
          </p>
        )
      ) : null}
    </div>
  );
}
