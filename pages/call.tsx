/**
 * The Call — phase 2.
 *
 * A NEW route, deliberately, rather than a rewrite of `index.tsx`. That file is
 * 1,341 lines serving two products through a cookie fork; rebuilding in place
 * would mean carrying the fork through every commit. Build clean here, dogfood,
 * and swap `/` over in phase 7.
 *
 * The whole product is one screen and one sentence. Read the verdict, send it,
 * or swipe to tomorrow.
 *
 * @module pages/call
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';

import { fetchForecastForLocation } from '@/lib/seo/getActivityScore';
import { getSuggestionsByDay, type Suggestion } from '@/utils/getSuggestionsByDay';
import { allSports } from '@/data/activities';
import { makeCall, type Call } from '@/lib/godaisy/call/makeCall';
import { SEO_LOCATIONS } from '@/data/seoLocations';
import type { SeoLocation } from '@/data/seoLocations';
import bgMap from '@/data/bgMap';
import { VerdictLockup } from '@/components/call/VerdictLockup';
import { ScreenChrome } from '@/components/call/ScreenChrome';
import { AlternatesControl } from '@/components/call/AlternatesControl';

const DAYS = 7;

interface CallPageProps {
  /** The location's slug, so the share endpoint can be addressed. */
  slug: string;
  place: string;
  /** One serialisable call per day. */
  days: Call[];
  /** Activity id → photograph, so the hero changes with the alternate. */
  photos: Record<string, string>;
  error?: string;
}

/** Swipe threshold in px. Below this a drag is a tap, not a day turn. */
const SWIPE_MIN = 48;

/** What `navigator.share` takes. Typed here because the DOM lib's version omits files. */
interface ShareData { title?: string; text?: string; url?: string; files?: File[] }

export default function CallPage({ slug, place, days, photos, error }: CallPageProps) {
  const [dayIndex, setDayIndex] = useState(0);
  const [altIndex, setAltIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [sendState, setSendState] = useState<'idle' | 'working' | 'sent' | 'copied'>('idle');

  // altIndex is a view state, not a preference: the daily call stays
  // deterministic, so turning the day resets which alternate is showing.
  useEffect(() => { setAltIndex(0); }, [dayIndex]);

  const day = days[dayIndex];
  const options = day?.alternates.length ? day.alternates : day?.call ? [day.call] : [];
  const option = options[altIndex % Math.max(1, options.length)] ?? day?.call ?? null;
  const hasAlternates = options.length > 1;

  const turn = useCallback((delta: number) => {
    setDayIndex((d) => Math.min(days.length - 1, Math.max(0, d + delta)));
  }, [days.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') turn(1);
      if (e.key === 'ArrowLeft') turn(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  const kicker = useMemo(() => {
    if (!day) return place;
    const when = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    }).format(new Date(day.date * 1000));
    return `${place} · ${when}`;
  }, [day, place]);

  if (error || !day || !option) {
    return (
      <Shell title="Go Daisy">
        <main className="call-screen call-screen--empty">
          <p className="call-label">{place}</p>
          <p className="call-verdict call-verdict--quiet">Reading the conditions…</p>
          <p className="call-reason call-reason--dark">
            {error ?? 'No call for this place yet.'}
          </p>
        </main>
      </Shell>
    );
  }

  const photo = photos[option.activityId];

  /*
   * The share sheet is phase 4; this is the minimum that makes the BET testable.
   *
   * Phases 0-3 exist to find out whether people send these cards, and a Send
   * button that does nothing measures nothing. So: the native share sheet where
   * the platform has one, with the card image attached when the browser will
   * carry files, and a copied link where it will not.
   *
   * The URL carries the day AND the displayed alternate, so what lands is what
   * was on screen — not the day's default.
   */
  const send = async () => {
    setSendState('working');
    const iso = new Date(day.date * 1000).toISOString().slice(0, 10);
    const qs = `place=${encodeURIComponent(slug)}&day=${dayIndex}&alt=${altIndex}&date=${iso}`;
    const link = `${window.location.origin}/call?${qs}`;
    try {
      const text = await fetch(`/api/call/share?${qs}&crop=text`).then((r) => r.text());
      const payload: ShareData = { title: 'Go Daisy', text, url: link };

      if (navigator.canShare) {
        try {
          const blob = await fetch(`/api/call/share?${qs}&crop=card`).then((r) => r.blob());
          const file = new File([blob], 'the-call.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) payload.files = [file];
        } catch {
          // No card is a reason to send words, not a reason to send nothing.
        }
      }

      if (navigator.share) {
        await navigator.share(payload);
        setSendState('sent');
      } else {
        await navigator.clipboard.writeText(`${text}`);
        setSendState('copied');
      }
    } catch {
      // A cancelled share sheet lands here too, which is not a failure.
      setSendState('idle');
      return;
    }
    setTimeout(() => setSendState('idle'), 2400);
  };

  return (
    <Shell title={`${option.verdict.verdict.replace(/\.$/, '')} — Go Daisy`}>
      <main
        className="call-screen"
        onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchX === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
          if (Math.abs(dx) > SWIPE_MIN) turn(dx < 0 ? 1 : -1);
          setTouchX(null);
        }}
      >
        {photo && (
          // The photograph identifies the SPORT, not the spot — see the imagery
          // decision. Treated hard so one generic image can serve many places.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="call-photo" src={photo} alt="" aria-hidden="true" />
        )}
        <div className={`call-scrim${day.isNoDay ? ' call-scrim--no' : ''}`} />

        <div className="call-content">
          <div className="call-chrome">
            <p className="call-label call-label--on-dark">{kicker}</p>
            <ScreenChrome />
          </div>

          <VerdictLockup
            kicker=""
            leadIn={option.verdict.leadIn}
            verdict={option.verdict.verdict}
            reason={option.verdict.reason}
            facts={option.facts}
            cycleKey={`${dayIndex}-${altIndex}`}
          />

          <div className="call-actions">
            <button type="button" className="call-btn" onClick={send} disabled={sendState === 'working'}>
              {sendState === 'sent' ? 'Sent' : sendState === 'copied' ? 'Copied' : 'Send the call'}
            </button>
            {hasAlternates && (
              <AlternatesControl
                onCycle={() => setAltIndex((i) => (i + 1) % options.length)}
                index={altIndex}
                total={options.length}
                label="Another option for today"
              />
            )}
          </div>

          <div className="call-dots" aria-hidden="true">
            {days.map((_, i) => <i key={i} className={i === dayIndex ? 'on' : ''} />)}
            <span>swipe for tomorrow</span>
          </div>
        </div>
      </main>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      {children}
    </>
  );
}

export const getServerSideProps: GetServerSideProps<CallPageProps> = async (ctx) => {
  const slug = String(ctx.query.place ?? 'croyde-bay');
  const location =
    SEO_LOCATIONS.find((l: SeoLocation) => l.slug === slug) ??
    SEO_LOCATIONS.find((l: SeoLocation) => l.slug.includes('croyde')) ??
    SEO_LOCATIONS[0];

  const sports = String(ctx.query.sports ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Falls back to the location's own curated activities, which is what a
  // stranger arriving without preferences should see.
  const chosen = sports.length ? sports : location.activities.slice(0, 3);

  try {
    const forecast = (await fetchForecastForLocation(location)).slice(0, DAYS);
    const byDay = getSuggestionsByDay({
      forecast,
      activities: allSports,
      interests: chosen,
      now: new Date(),
      includeAllActivities: true,
    }) as Array<{ date: number; suggestions: Suggestion[] }>;

    const weekday = (ts: number) =>
      new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date(ts * 1000));

    // A no-day must name the next yes, so the good days are found first.
    const goodDayLabels = byDay.map((d, i) => {
      const c = makeCall({
        date: d.date, place: location.name, weather: forecast[i].weather,
        suggestions: d.suggestions, sports: chosen, seeded: chosen, dayIndex: i,
      });
      return c.isNoDay ? null : weekday(d.date);
    });

    const days: Call[] = byDay.map((d, i) => {
      const nextYes = goodDayLabels.slice(i + 1).find(Boolean) ?? undefined;
      return makeCall({
        date: d.date,
        place: location.name,
        weather: forecast[i].weather,
        suggestions: d.suggestions,
        sports: chosen,
        seeded: chosen,
        names: Object.fromEntries(
          (allSports as Array<{ id: string; name: string }>).map((a) => [a.id, a.name]),
        ),
        nextYes,
        dayIndex: i,
        weekday: weekday(d.date),
      });
    });

    const photos: Record<string, string> = {};
    for (const day of days) {
      for (const o of [day.call, ...day.alternates]) {
        if (o && bgMap[o.activityId]) photos[o.activityId] = bgMap[o.activityId];
      }
    }

    return { props: { slug: location.slug, place: location.name, days, photos } };
  } catch (e) {
    // The verdict is withheld rather than guessed. Never a confident sentence
    // over incomplete data.
    return {
      props: {
        slug: location.slug,
        place: location.name,
        days: [],
        photos: {},
        error: e instanceof Error ? e.message : 'The forecast is unavailable.',
      },
    };
  }
};
