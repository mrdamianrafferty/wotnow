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
import { isGood } from '@/lib/godaisy/call/bands';
import { setupFromCookieHeader } from '@/lib/godaisy/call/setup';
import { SEO_LOCATIONS } from '@/data/seoLocations';
import type { SeoLocation } from '@/data/seoLocations';
import { locationFromSetup, locationFromShare } from '@/lib/godaisy/call/location';
import bgMap from '@/data/bgMap';
import { VerdictLockup } from '@/components/call/VerdictLockup';
import { ScreenChrome } from '@/components/call/ScreenChrome';
import { AlternatesControl } from '@/components/call/AlternatesControl';
import { IndoorPrompt, type IndoorOption } from '@/components/call/IndoorPrompt';
import { EvidenceDrawer } from '@/components/call/EvidenceDrawer';
import { MenuSheet } from '@/components/call/MenuSheet';
import { LocationSheet } from '@/components/call/LocationSheet';
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

/** What `navigator.share` takes. Typed here because the DOM lib's version omits files. */
interface ShareData { title?: string; text?: string; url?: string; files?: File[] }

export default function CallPage({ slug, place, days, photos, indoor, coords, coastal, error }: CallPageProps) {
  const [dayIndex, setDayIndex] = useState(0);
  const [altIndex, setAltIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
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
    const qs = `place=${encodeURIComponent(slug)}&day=${dayIndex}&alt=${altIndex}&date=${iso}`;

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
    try {
      /*
       * `res.ok`, because a 404 has a body too.
       *
       * `.text()` and `.blob()` both resolve happily on an error response, so a
       * broken renderer did not throw — it returned `{"error":"Unknown place…"}`
       * and that string became the message, while the same 46 bytes became
       * `the-call.png`. A share that cannot be built has to fail loudly enough
       * to fall through to the link on its own.
       */
      const textRes = await fetch(`/api/call/share?${qs}&crop=text`);
      if (!textRes.ok) throw new Error(`share text ${textRes.status}`);
      const text = await textRes.text();
      const payload: ShareData = { title: 'Go Daisy', text, url: link };
      // The clipboard has one field, so the link has to be IN the sentence. The
      // share sheet has two, and every target composes them itself.
      const flat = `${text}\n${link}`;

      if (navigator.canShare) {
        try {
          const cardRes = await fetch(`/api/call/share?${qs}&crop=card`);
          if (!cardRes.ok) throw new Error(`share card ${cardRes.status}`);
          const blob = await cardRes.blob();
          // And that what came back is an image, so an error page served as 200
          // by a proxy cannot become a PNG either.
          if (!blob.type.startsWith('image/')) throw new Error(`share card ${blob.type}`);
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
        await navigator.clipboard.writeText(flat);
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
            <button type="button" className="call-btn" onClick={send} disabled={sendState === 'working'}>
              {sendState === 'sent' ? 'Sent' : sendState === 'copied' ? 'Copied' : 'Send out the call'}
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
