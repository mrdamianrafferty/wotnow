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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';

import { fetchForecastForLocation } from '@/lib/seo/getActivityScore';
import { getSuggestionsByDay, type Suggestion } from '@/utils/getSuggestionsByDay';
import { allSports } from '@/data/activities';
import { makeCall, type Call } from '@/lib/godaisy/call/makeCall';
import { isGood } from '@/lib/godaisy/call/bands';
import { setupFromCookieHeader } from '@/lib/godaisy/call/setup';
import { SEO_LOCATIONS } from '@/data/seoLocations';
import type { SeoLocation } from '@/data/seoLocations';
import { locationFromSetup, locationFromShare } from '@/lib/godaisy/call/location';
import bgMap from '@/data/bgMap';
import { trackEvent } from '@/lib/analytics/events';
import { shareCall } from '@/lib/godaisy/call/share';
import { VerdictLockup } from '@/components/call/VerdictLockup';
import { ScreenChrome } from '@/components/call/ScreenChrome';
import { AlternatesControl } from '@/components/call/AlternatesControl';
import { IndoorPrompt, type IndoorOption } from '@/components/call/IndoorPrompt';
import { EvidenceDrawer } from '@/components/call/EvidenceDrawer';
import { MenuSheet } from '@/components/call/MenuSheet';
import { LocationSheet } from '@/components/call/LocationSheet';
import { DayPager } from '@/components/call/DayPager';
import { asSentence } from '@/lib/godaisy/call/verdict';

const DAYS = 7;

/** Where a visitor with no query lands. A real place with several sports. */
const DEFAULT_PLACE = 'newquay-cornwall';

/** Sports that only a coastal place can offer, in the order they characterise one. */
const WATER = ['surfing', 'sea_swimming', 'sea_kayaking', 'stand_up_paddleboarding',
               'windsurfing', 'kitesurfing', 'sailing'];

/**
 * The three sports a place is seeded with, when the visitor has not chosen.
 *
 * NOT the first three in the list. Those sort generically — Newquay's are
 * running, cycling and urban exploring — so a surf town produced "a good day to
 * get the bike out" all week and surfing never entered the ranking at all. The
 * data was never the problem: Newquay lists surfing, it was just fourth.
 *
 * A coastal place leads with what makes it coastal, then fills from the rest.
 */
function seedSports(location: SeoLocation): string[] {
  const water = location.beachFacingDeg != null
    ? WATER.filter((w) => location.activities.includes(w)).slice(0, 1)
    : [];
  const land = location.activities.filter((a) => !WATER.includes(a));
  return [...water, ...land].slice(0, 3);
}

export interface CallPageProps {
  /** The location's slug, so the share endpoint can be addressed. */
  slug: string;
  place: string;
  /** One serialisable call per day. */
  days: Call[];
  /** Activity id → photograph, so the hero changes with the alternate. */
  photos: Record<string, string>;
  /** Offered on a write-off. Weather-insensitive, so the day cannot spoil them. */
  indoor: IndoorOption[];
  /** Where the drawer reads its numbers from, on demand. */
  coords: { lat: number; lon: number };
  /** Whether the sea and the tides are evidence here, or dashboard furniture. */
  coastal: boolean;
  error?: string;
}

/** Swipe threshold in px. Below this a drag is a tap, not a day turn. */
const SWIPE_MIN = 48;

/*
 * The same threshold for a trackpad, in wheel units rather than pixels, plus
 * the pause that ends a gesture.
 *
 * A two-finger horizontal push is the only swipe a laptop has, and macOS
 * keeps sending it for half a second after the fingers have lifted — the
 * momentum tail. Turning a day per event would flick past the whole week on
 * one flick, so a turn locks the gesture until the wheel has been quiet for
 * WHEEL_REST, which is how a gesture ends when nothing tells you it has.
 */
const WHEEL_MIN = 60;
const WHEEL_REST = 220;

export default function CallPage({ slug, place, days, photos, indoor, coords, coastal, error }: CallPageProps) {
  const [dayIndex, setDayIndex] = useState(0);
  const [altIndex, setAltIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const screenRef = useRef<HTMLElement>(null);
  const [sendState, setSendState] = useState<'idle' | 'working' | 'sent' | 'copied'>('idle');
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [placePicker, setPlacePicker] = useState(false);

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

  /*
   * TRACKPAD SWIPE. Bound by hand, because React cannot.
   *
   * React registers `onWheel` as a passive listener on the root, so a handler
   * written as a prop is forbidden from calling preventDefault — and without
   * that, Chrome and Safari read the same gesture as history-back and leave
   * the app while it is turning the day. Hence the ref and the effect.
   *
   * Vertical dominance passes straight through untouched: the evidence drawer
   * scrolls, and stealing its wheel would be a worse bug than the one being
   * fixed. Overlays bail out entirely.
   */
  const overlayOpen = drawer || menu || placePicker;
  useEffect(() => {
    const el = screenRef.current;
    if (!el || overlayOpen) return;

    let travelled = 0;
    let spent = false;
    let rest: ReturnType<typeof setTimeout>;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      clearTimeout(rest);
      rest = setTimeout(() => { travelled = 0; spent = false; }, WHEEL_REST);
      if (spent) return;
      travelled += e.deltaX;
      if (Math.abs(travelled) > WHEEL_MIN) {
        turn(travelled > 0 ? 1 : -1);
        spent = true;
        travelled = 0;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); clearTimeout(rest); };
  }, [turn, overlayOpen]);

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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://godaisy.io';
    const iso = new Date(day.date * 1000).toISOString().slice(0, 10);
    /*
     * `a` AND `n` ARE WHAT LET THE RENDERER DRAW A PLACE NOBODY SEEDED.
     *
     * The slug carries the coordinates; the activity and the name are the rest
     * of what a card needs. Passing the activity explicitly also makes the card
     * agree with the screen by construction, rather than by re-deriving a
     * ranking from a sports list the URL does not carry.
     *
     * These went missing between being written and being committed — #131 added
     * them to `/api/call/share` and shipped a client that never sent them, so
     * every share from a place somebody named 404'd exactly as it had before.
     * The `call_share_failed` event added in #134 is what caught it, on its
     * first real run, which is the entire argument for having it.
     */
    const qs = `place=${encodeURIComponent(slug)}&day=${dayIndex}&alt=${altIndex}&date=${iso}`
      + `&a=${encodeURIComponent(option.activityId)}&n=${encodeURIComponent(place)}`;

    /*
     * A SHORT LINK FOR ANY PLACE, NOT JUST THE SEEDED ONES.
     *
     * A real share went out reading `godaisy.io/share/eyJ2IjoxLCJkIjp7ImFwc…`
     * — 413 characters of base64 that filled an iMessage bubble and looked like
     * something you would not tap. The first fix pointed the link at the spot
     * page, which is 51 characters and a page that already ranks — but only for
     * the seeded towns. Everybody who typed their own town in onboarding, which
     * is everybody who onboards, kept getting the token.
     *
     * So the fallback is a query on the call itself: about sixty characters,
     * legible, and it opens the same screen the sender was looking at rather
     * than a landing page describing it.
     */
    const spotSlug = SEO_LOCATIONS.some((l: SeoLocation) => l.slug === slug) ? slug : null;
    const link = spotSlug
      ? `${origin}/${option.activityId.replace(/_/g, '-')}/${spotSlug}?from=share`
      : `${origin}/call?place=${encodeURIComponent(slug)}&a=${encodeURIComponent(option.activityId)}`
        + `&n=${encodeURIComponent(place)}&d=${dayIndex}&from=share`;
    /*
     * THE CARD, FETCHED BEFORE ANY SHEET OPENS.
     *
     * `res.ok`, because a 404 has a body too: `.text()` and `.blob()` both
     * resolve happily on an error response, so a broken renderer did not throw
     * — it returned `{"error":"Unknown place…"}` and that string became the
     * message, while the same 46 bytes became `the-call.png`.
     */
    let card: Blob | undefined;
    let text: string;
    try {
      const textRes = await fetch(`/api/call/share?${qs}&crop=text`);
      if (!textRes.ok) throw new Error(`share text ${textRes.status}`);
      text = await textRes.text();
    } catch (e) {
      trackEvent('call_share_failed', {
        activity_id: option.activityId,
        stage: 'text',
        reason: e instanceof Error ? e.message : 'unknown',
      });
      setSendState('idle');
      return;
    }

    try {
      const cardRes = await fetch(`/api/call/share?${qs}&crop=card`);
      if (!cardRes.ok) throw new Error(`share card ${cardRes.status}`);
      const blob = await cardRes.blob();
      // And that what came back is an image, so an error page served as 200 by
      // a proxy cannot become a PNG either.
      if (!blob.type.startsWith('image/')) throw new Error(`share card ${blob.type}`);
      card = blob;
    } catch (e) {
      // No card is a reason to send words, not a reason to send nothing — but
      // it IS worth counting. A 404 from the renderer is exactly what shipped
      // for months, and a number would have found it before a screenshot did.
      trackEvent('call_share_failed', {
        activity_id: option.activityId,
        stage: 'card',
        reason: e instanceof Error ? e.message : 'unknown',
      });
    }

    /*
     * ONE CALL, FOUR PLATFORMS.
     *
     * `shareCall` picks the native sheet inside the app and the Web Share API
     * outside it, and falls to the clipboard where neither exists. This used to
     * call `navigator.share` directly, which does not exist in a Capacitor
     * WebView — so on iOS and Android, the two places Go Daisy ships, the one
     * button the redesign is about silently copied a link instead.
     */
    const result = await shareCall({
      text,
      url: link,
      ...(card ? { card } : {}),
      title: 'Go Daisy',
    });

    if (result.outcome === 'cancelled') {
      // A sheet somebody closed is a decision, not an error. No label, no count.
      setSendState('idle');
      return;
    }

    if (result.outcome === 'failed') {
      trackEvent('call_share_failed', {
        activity_id: option.activityId,
        stage: 'send',
        reason: result.reason ?? 'unknown',
      });
      setSendState('idle');
      return;
    }

    setSendState(result.outcome === 'shared' ? 'sent' : 'copied');

    /*
     * THE ONE NUMBER THE REDESIGN IS ABOUT.
     *
     * "Phases 0-3 exist to find out whether people send these cards", and
     * nothing counted one for the life of the project, so the central bet had
     * no evidence either way.
     */
    trackEvent('call_shared', {
      activity_id: option.activityId,
      day_index: dayIndex,
      band: option.band,
      with_card: result.withCard,
      method: result.method,
      // A seeded town or a place they named — the two have very different link
      // shapes, and only one of them was ever tested.
      place_kind: spotSlug ? 'spot_page' : 'own_place',
    });

    setTimeout(() => setSendState('idle'), 2400);
  };

  return (
    <Shell
      title={`${option.verdict.verdict.replace(/\.$/, '')} — Go Daisy`}
      preview={{
        slug,
        place,
        activityId: option.activityId,
        verdict: option.verdict.verdict,
        reason: option.verdict.reason ?? '',
        date: day.date,
        dayIndex,
        altIndex,
      }}
    >
      <main
        ref={screenRef}
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
            {/*
              * The kicker is a button. The moment you notice the place is wrong
              * is the moment you are looking at it, so changing it belongs here
              * rather than three steps into onboarding behind the menu.
              */}
            <button
              type="button"
              className="call-label call-label--on-dark call-kicker-btn"
              onClick={() => setPlacePicker(true)}
              aria-label={`${place} — change location`}
            >
              {kicker}
            </button>
            {/*
              * The dot is the MENU, which is what ScreenChrome always said it
              * was — "everything else lives behind the dot". It briefly opened
              * the evidence drawer instead, because the drawer was the first
              * thing that existed to put there, and that left the whole new
              * surface with no route to settings, an account or a privacy
              * policy. The evidence has its own control below, where it is
              * more discoverable anyway: it belongs to the verdict, not to
              * navigation.
              */}
            <ScreenChrome onMenu={() => setMenu(true)} />
          </div>

          <VerdictLockup
            kicker=""
            leadIn={option.verdict.leadIn}
            verdict={option.verdict.verdict}
            reason={option.verdict.reason}
            facts={option.facts}
            cycleKey={`${dayIndex}-${altIndex}`}
            onWhy={() => setDrawer(true)}
          />

          {day.isNoDay && <IndoorPrompt options={indoor} />}

          <div className="call-actions">
            {/* `aria-live` because the label is the only confirmation there is.
                "Copied" replaces "Send out the call" silently otherwise, and a
                screen reader user is left not knowing whether anything
                happened — on the one button the app exists for. */}
            <button
              type="button"
              className="call-btn"
              onClick={send}
              disabled={sendState === 'working'}
              aria-live="polite"
            >
              {sendState === 'working'
                ? 'Sending…'
                : sendState === 'sent'
                  ? 'Sent'
                  : sendState === 'copied'
                    ? 'Copied'
                    : 'Send out the call'}
            </button>
            {hasAlternates && (
              <AlternatesControl
                onCycle={() => setAltIndex((i) => {
                  const next = (i + 1) % options.length;
                  // Whether the second answer gets looked at is the other half
                  // of the sharing bet: a day with two good things on it is
                  // worth more than a day with one, and nothing measured it.
                  trackEvent('call_alternate_viewed', {
                    activity_id: options[next]?.activityId ?? '',
                    position: next,
                    of: options.length,
                    day_index: dayIndex,
                  });
                  return next;
                })}
                index={altIndex}
                total={options.length}
                label="Another option for today"
              />
            )}
          </div>

          <DayPager
            dates={days.map((d) => d.date)}
            index={dayIndex}
            onSelect={setDayIndex}
          />
        </div>

        {menu && <MenuSheet onClose={() => setMenu(false)} />}
        {placePicker && <LocationSheet current={place} onClose={() => setPlacePicker(false)} />}

        {drawer && (
          <EvidenceDrawer
            option={option}
            place={place}
            lat={coords.lat}
            lon={coords.lon}
            coastal={coastal}
            headline={asSentence(option.verdict)}
            onClose={() => setDrawer(false)}
          />
        )}
      </main>
    </Shell>
  );
}

/**
 * A shared call needs to unfurl.
 *
 * The spot pages have carried og tags since phase 6, and this page had none —
 * title, `noindex`, viewport, nothing else. That was fine while the shared link
 * WAS a spot page. It stopped being fine when the link became
 * `/call?place=setup:…` for everybody who typed their own town in onboarding,
 * which is everybody who onboards: the most common share in the product pasted
 * into WhatsApp, iMessage or Slack as a bare blue URL with no picture, no
 * headline and nothing to tap for.
 *
 * `noindex` stays and does not conflict. Indexing is what a crawler stores;
 * unfurling is what a messenger draws. A personal forecast should not be in
 * Google and should absolutely have a preview.
 *
 * The image is the same renderer the share sheet attaches, at the `og` crop —
 * so the card in the message and the card behind the link are the same picture
 * of the same day, rather than two things that agree by coincidence.
 */
interface ShellPreview {
  slug: string;
  place: string;
  activityId: string;
  verdict: string;
  reason: string;
  date: number;
  dayIndex: number;
  altIndex: number;
}

function Shell({
  title, preview, children,
}: {
  title: string;
  preview?: ShellPreview;
  children: React.ReactNode;
}) {
  const origin = 'https://godaisy.io';
  let og: { url: string; image: string; description: string } | null = null;
  if (preview) {
    const iso = new Date(preview.date * 1000).toISOString().slice(0, 10);
    const q = `place=${encodeURIComponent(preview.slug)}&day=${preview.dayIndex}`
      + `&alt=${preview.altIndex}&date=${iso}`
      + `&a=${encodeURIComponent(preview.activityId)}&n=${encodeURIComponent(preview.place)}`;
    og = {
      url: `${origin}/call?${q}&from=share`,
      image: `${origin}/api/call/share?${q}&crop=og`,
      // The verdict already ends in a full stop and already names the day.
      description: [preview.verdict, preview.reason].filter(Boolean).join(' '),
    };
  }

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {og && (
          <>
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Go Daisy" />
            <meta property="og:title" content={`${title.replace(' — Go Daisy', '')} in ${preview!.place}`} />
            <meta property="og:description" content={og.description} />
            <meta property="og:url" content={og.url} />
            <meta property="og:image" content={og.image} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={og.description} />
            {/* `summary_large_image` is what turns a thumbnail into the card.
                Without it the picture is a 120px square beside the text. */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={`${title.replace(' — Go Daisy', '')} in ${preview!.place}`} />
            <meta name="twitter:description" content={og.description} />
            <meta name="twitter:image" content={og.image} />
          </>
        )}
      </Head>
      {children}
    </>
  );
}


/**
 * Also used by `/`, which is the home screen now — see `pages/index.tsx`.
 *
 * Exported rather than duplicated: the home screen and this route answer the
 * same question about the same person, and two loaders would drift the day one
 * of them learned something the other did not.
 */
export const getServerSideProps: GetServerSideProps<CallPageProps> = async (ctx) => {
  /*
   * A place that was ASKED FOR and does not exist must 404, not quietly become
   * another one. Requesting ?place=croyde-bay served Llanes — the first row in
   * the data file — under a kicker naming Llanes, which reads as a bug in the
   * forecast rather than a bad URL. A visitor with no query still gets a default,
   * because a stranger arriving cold should see a working call.
   */
  const asked = ctx.query.place ? String(ctx.query.place) : null;

  /*
   * THE URL OUTRANKS THE COOKIE, and that is not an implementation detail.
   *
   * Every share carries a link to somebody else's call, and the whole growth
   * model is that a stranger opens it. If the cookie won, a returning user
   * following a friend's link would be shown their own forecast instead — the
   * shared object would silently fail for exactly the audience it exists for.
   * So: an explicit ?place= is honoured, and the setup fills the silence.
   */
  const setup = ctx.query.place || ctx.query.sports
    ? null
    : setupFromCookieHeader(ctx.req.headers.cookie);

  /*
   * A place that was ASKED FOR and does not exist must 404, not quietly become
   * another one. Requesting ?place=croyde-bay served Llanes — the first row in
   * the data file — under a kicker naming Llanes, which reads as a bug in the
   * forecast rather than a bad URL. A visitor with no query and no setup still
   * gets a default, because a stranger arriving cold should see a working call.
   */
  /*
   * A shared link names a place that may never have been seeded.
   *
   * `?place=setup:43.514,-5.270&a=cycling&n=Lastres` is what Send now puts in
   * the message for anyone whose town is not one of the seeded spot pages —
   * which is anyone who typed their own. Without this branch the recipient got
   * a 404 for a link the app itself had just written.
   */
  const location: SeoLocation | undefined = asked
    ? (SEO_LOCATIONS.find((l: SeoLocation) => l.slug === asked)
       ?? locationFromShare(asked, String(ctx.query.n ?? ''), String(ctx.query.a ?? '')) ?? undefined)
    : setup
      ? locationFromSetup(setup)
      : (SEO_LOCATIONS.find((l: SeoLocation) => l.slug === DEFAULT_PLACE) ?? SEO_LOCATIONS[0]);
  if (!location) return { notFound: true };

  const sports = String(ctx.query.sports ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // The setup's sports are the point of asking for them. Falls back to the
  // location's own curated activities, which is what a stranger without either
  // should see.
  const chosen = sports.length ? sports : setup ? setup.sports : seedSports(location);

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

    /*
     * A no-day must name the next yes, so the good days are found first.
     *
     * The test is the BAND, not `isNoDay`. A marginal day is not a no-day — you
     * can go out on it — but it is not the day to promise someone either, and
     * "Thursday is the one" over a score of 46 is a promise the forecast does
     * not keep.
     */
    const goodDayLabels = byDay.map((d, i) => {
      const c = makeCall({
        date: d.date, place: location.name, weather: forecast[i].weather,
        suggestions: d.suggestions, sports: chosen, seeded: chosen, dayIndex: i,
        coords: { lat: location.lat, lon: location.lon },
      });
      return c.call && isGood(c.call.band) ? weekday(d.date) : null;
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
        // Where, so the dayparts know whether the sun is up in them.
        coords: { lat: location.lat, lon: location.lon },
        names: Object.fromEntries(
          (allSports as Array<{ id: string; name: string }>).map((a) => [a.id, a.name]),
        ),
        nextYes,
        dayIndex: i,
        weekday: weekday(d.date),
        parts: forecast[i].parts,
        activities: allSports as never,
      });
    });

    const photos: Record<string, string> = {};
    for (const day of days) {
      for (const o of [day.call, ...day.alternates]) {
        if (o && bgMap[o.activityId]) photos[o.activityId] = bgMap[o.activityId];
      }
    }

    /*
     * Indoor options come from the activity library's own `weatherSensitive:
     * false` flag rather than a hand-kept list, so a new indoor activity appears
     * here without anyone remembering to add it. All 37 are sent; the prompt
     * leads with three and keeps the rest behind More, because the first ask is
     * a decision and the second is a menu.
     *
     * The prefix strip turns a library name into something that finishes the
     * sentence "… instead": "Go to the Cinema" is a thing you do, "the cinema"
     * is a thing you say. Longest alternative first, or "Do" would eat the
     * "Do Some" case and leave "some crafts".
     */
    const indoor: IndoorOption[] = (allSports as Array<{ id: string; name: string; category: string; weatherSensitive: boolean }>)
      .filter((a) => !a.weatherSensitive)
      .map((a) => ({
        id: a.id,
        category: a.category,
        label: a.name.replace(/^(?:Go to|Do Some|Go|Play|Do|Have|Take|Try|Hit|Visit)\s+/i, '').toLowerCase(),
      }));

    return {
      props: {
        slug: location.slug,
        place: location.name,
        days,
        photos,
        indoor,
        coords: { lat: location.lat, lon: location.lon },
        // Coastal by the same test `withMarine` uses, so the drawer offers the
        // sea exactly where the sea was scored.
        coastal: location.beachFacingDeg != null || location.coastal === true,
      },
    };
  } catch (e) {
    // The verdict is withheld rather than guessed. Never a confident sentence
    // over incomplete data.
    return {
      props: {
        slug: location.slug,
        place: location.name,
        days: [],
        photos: {},
        indoor: [],
        // The location resolved; it is the forecast that failed. These stay
        // correct so a retry has somewhere to read from.
        coords: { lat: location.lat, lon: location.lon },
        coastal: location.beachFacingDeg != null || location.coastal === true,
        error: e instanceof Error ? e.message : 'The forecast is unavailable.',
      },
    };
  }
};
