/**
 * Onboarding — phase 4. Sports, spots, hour.
 *
 * A new route, like `/call` was. The three screens this replaces are 1,243 +
 * 955 + 442 lines and they are not deleted here: the plan is explicit that
 * deleting early is the most common way a migration like this strands itself
 * half-done, and the deletions belong in phase 7 with the swap.
 *
 * WHY THIS EXISTS AT ALL. Before it, `/call` could only be reached by typing a
 * URL with `?place=` in it, and the three sports were the app's guess from a
 * list of a dozen seeded towns. A verdict about a sport you do not do, at a
 * place you do not live, is not a product — and the bet is that people send
 * these cards, which nobody does for a card about somebody else's Tuesday.
 *
 * Place search is Open-Meteo's geocoder rather than Google Places: no key on
 * the client, no script to load before the input works, and it is the same
 * provider the forecast comes from, so a place it can name is a place we can
 * forecast. That last part is not a convenience — Google will happily return a
 * building.
 *
 * @module pages/start
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { allSports } from '@/data/activities';
import { useGoDaisyPushNotifications } from '@/hooks/useGoDaisyPushNotifications';
import {
  writeSetup, readSetup, mirrorToPreferences, type CallSetup, type SetupPlace,
} from '@/lib/godaisy/call/setup';
import {
  SportsStep, SpotsStep, HourStep, SEED_TARGET,
  type SportOption, type PlaceSuggestion,
} from '@/components/call/SetupSteps';

const STEPS = ['Sports', 'Spots', 'Hour'] as const;

/** The water sports, which decide whether step 2 asks for a second spot. */
const WATER = new Set([
  'surfing', 'sea_swimming', 'wild_swimming', 'sea_kayaking', 'kayaking', 'canoeing',
  'stand_up_paddleboarding', 'sup_sea', 'windsurfing', 'kitesurfing', 'sailing',
  'sailing_inland', 'rowing', 'snorkeling', 'scuba_diving', 'jet_skiing',
  'sea_fishing_shore', 'sea_fishing_boat', 'fly_fishing_freshwater', 'coarse_fishing',
]);

/** Library names are written to be done ("Go Cycling"); a chip is a thing you are. */
const chipLabel = (name: string) =>
  name.replace(/^(?:Go to|Do Some|Go|Play|Do|Have|Take|Try|Hit|Visit)\s+/i, '').toLowerCase();

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export default function StartPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [sports, setSports] = useState<string[]>([]);
  const [place, setPlace] = useState<SetupPlace | null>(null);
  const [coastal, setCoastal] = useState<SetupPlace | null>(null);
  const [pickingCoastal, setPickingCoastal] = useState(false);
  const [hour, setHour] = useState<number | undefined>(undefined);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  const push = useGoDaisyPushNotifications();
  const [pushWorking, setPushWorking] = useState(false);

  const options: SportOption[] = useMemo(
    () =>
      (allSports as Array<{ id: string; name: string; category: string; weatherSensitive: boolean }>)
        // Indoor activities are what a write-off offers instead; they are not
        // what the call is about, and offering them here would say otherwise.
        .filter((a) => a.weatherSensitive)
        .map((a) => ({ id: a.id, label: chipLabel(a.name), category: a.category, water: WATER.has(a.id) })),
    [],
  );

  // Coming back to change something should not start from an empty screen.
  useEffect(() => {
    const saved = readSetup();
    if (!saved) return;
    setSports(saved.sports);
    setPlace(saved.place);
    if (saved.coastal) setCoastal(saved.coastal);
    if (saved.hour !== undefined) setHour(saved.hour);
  }, []);

  const needsCoastal = sports.some((id) => WATER.has(id));

  /*
   * Debounced, and the response is dropped if a newer keystroke has been typed
   * since it was sent. Without the sequence check a slow answer for "lon" lands
   * after a fast one for "london" and the list flips back — which reads as the
   * search being broken rather than slow.
   */
  const seq = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); setSearching(false); return; }
    const mine = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
        );
        const j = (await res.json()) as { results?: GeoResult[] };
        if (mine !== seq.current) return;
        setSuggestions(
          (j.results ?? []).map((r) => ({
            name: r.name,
            lat: r.latitude,
            lon: r.longitude,
            detail: [r.admin1, r.country].filter(Boolean).join(', '),
          })),
        );
      } catch {
        if (mine === seq.current) setSuggestions([]);
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const toggleSport = useCallback((id: string) => {
    setSports((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }, []);

  const pickPlace = useCallback((p: SetupPlace) => {
    setPlace({ name: p.name, lat: p.lat, lon: p.lon });
    setQuery('');
    setSuggestions([]);
  }, []);

  const pickCoastal = useCallback((p: SetupPlace) => {
    setCoastal({ name: p.name, lat: p.lat, lon: p.lon });
    setQuery('');
    setSuggestions([]);
    setPickingCoastal(false);
  }, []);

  const enablePush = useCallback(async () => {
    setPushWorking(true);
    try {
      const state = await push.requestPermission();
      // Subscribing writes a row against a user id, so it only works signed in.
      // The permission is still worth having: it is the half a browser gives you
      // exactly one chance at, and the subscription can be created later.
      if (state === 'granted') await push.subscribe().catch(() => false);
    } finally {
      setPushWorking(false);
    }
  }, [push]);

  const canAdvance =
    step === 0 ? sports.length >= 1 : step === 1 ? Boolean(place) : hour !== undefined;

  const finish = useCallback(() => {
    if (!place || !sports.length) return;
    const setup: CallSetup = {
      v: 1,
      sports,
      place,
      ...(coastal ? { coastal } : {}),
      ...(hour !== undefined ? { hour } : {}),
    };
    writeSetup(setup);
    mirrorToPreferences(setup);
    // `replace`, not `push`: the back button from the call should not land on
    // the last screen of a flow that is already finished.
    router.replace('/call');
  }, [place, sports, coastal, hour, router]);

  const pushState = pushWorking
    ? 'working'
    : !push.isSupported
      ? 'unsupported'
      : push.permission;

  return (
    <>
      <Head>
        <title>Set up Go Daisy</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="call-setup">
        <div className="call-setup-inner">
          <nav className="call-setup-rail" aria-label="Progress">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={`call-setup-tick${i === step ? ' is-now' : ''}${i < step ? ' is-done' : ''}`}
                aria-current={i === step ? 'step' : undefined}
              >
                {label}
              </span>
            ))}
          </nav>

          <div className="call-setup-body">
            {step === 0 && (
              <SportsStep options={options} chosen={sports} onToggle={toggleSport} />
            )}
            {step === 1 && (
              <SpotsStep
                query={query}
                onQuery={setQuery}
                suggestions={suggestions}
                searching={searching}
                place={place}
                onPick={pickPlace}
                needsCoastal={needsCoastal}
                coastal={coastal}
                onPickCoastal={pickCoastal}
                pickingCoastal={pickingCoastal}
                onPickingCoastal={(v) => { setPickingCoastal(v); setQuery(''); }}
              />
            )}
            {step === 2 && (
              <HourStep hour={hour} onPick={setHour} pushState={pushState} onEnablePush={enablePush} />
            )}
          </div>

          <div className="call-setup-actions">
            {step > 0 && (
              <button
                type="button"
                className="call-setup-back"
                onClick={() => { setStep((s) => s - 1); setQuery(''); }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="call-btn call-setup-next"
              disabled={!canAdvance}
              onClick={() => (step === STEPS.length - 1 ? finish() : setStep((s) => s + 1))}
            >
              {step === STEPS.length - 1 ? 'Get my call' : 'Next'}
            </button>
          </div>

          {step === 0 && sports.length > 0 && sports.length < SEED_TARGET && (
            <p className="call-setup-note">
              {sports.length} of {SEED_TARGET}. Enough to start — more makes it better.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
