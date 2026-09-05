/**
 * The three questions — phase 4.
 *
 * Sports, spots, hour. One screen each, in The Call's voice: the question is a
 * sentence, not a field label, and the app has already decided what it thinks
 * so the person is agreeing or disagreeing rather than filling in a form.
 *
 * THREE SPORTS IS A SEED, NOT A CAP. The music-app model: it asks for three
 * artists you love to get an idea of your taste, and then lets you go deeper
 * and wider. So the copy asks for three, the button unlocks at one, and nothing
 * stops someone picking nine.
 *
 * @module components/call/SetupSteps
 */

import { useMemo, useState } from 'react';
import type { SetupPlace } from '@/lib/godaisy/call/setup';
import { DEFAULT_INTEREST_IDS } from '@/context/UserPreferencesContext';

/* ── Sports ──────────────────────────────────────────────────────────────── */

export interface SportOption {
  id: string;
  label: string;
  category: string;
  /** Needs somewhere with water — decides whether step 2 asks for a second spot. */
  water: boolean;
}

/**
 * How many the copy asks for. Not a limit — see the note above.
 *
 * The button unlocks at one, because someone who only runs should not be made
 * to invent two more interests to get past a screen.
 */
export const SEED_TARGET = 3;

export function SportsStep({
  options, chosen, onToggle,
}: {
  options: SportOption[];
  chosen: string[];
  onToggle: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  /*
   * The opening set is the app's OWN default interests, in their order.
   *
   * The first attempt derived it from the library — one per category, biggest
   * categories first — on the theory that file order is a rough proxy for
   * popularity. Looking at the rendered screen disproved that: it opened on
   * "football, golf, skiing, running, a picnic, music outdoors, american
   * football, fly fishing", which is not what a stranger recognises. An
   * onboarding screen has one job on first paint and that was not it.
   *
   * `DEFAULT_INTEREST_IDS` is what the app already assumes about someone it
   * knows nothing about, so it is the same question already answered. The
   * indoor ones in that list are filtered out upstream — this screen is about
   * what the weather decides — and the shortfall is topped up from the library
   * so the opening screen is never thin.
   */
  const lead = useMemo(() => {
    const byId = new Map(options.map((o) => [o.id, o]));
    const out: SportOption[] = [];
    for (const id of DEFAULT_INTEREST_IDS) {
      const o = byId.get(id);
      if (o) out.push(o);
    }
    /*
     * The top-up goes ROUND THE CATEGORIES, not down the library.
     *
     * In library order it filled the remaining six slots with football,
     * american football, baseball, hurling, gaelic football and hockey — a
     * block of team sports, because that is where the file happens to sit. The
     * opening screen should read as a range of things a person might do, so it
     * takes one from each category in turn.
     */
    const byCategory = new Map<string, SportOption[]>();
    for (const o of options) {
      if (out.includes(o)) continue;
      const g = byCategory.get(o.category);
      if (g) g.push(o);
      else byCategory.set(o.category, [o]);
    }
    const groups = [...byCategory.values()];
    for (let round = 0; out.length < 12 && round < 8; round++) {
      for (const g of groups) {
        if (out.length >= 12) break;
        if (g[round]) out.push(g[round]);
      }
    }
    return out.slice(0, 12);
  }, [options]);

  // Anything already chosen stays visible when the list collapses, or a choice
  // made in the expanded list would look like it had been discarded.
  const shown = showAll
    ? options
    : [...lead, ...options.filter((o) => chosen.includes(o.id) && !lead.includes(o))];

  return (
    <>
      <p className="call-setup-question">What do you actually do?</p>
      <p className="call-setup-help">
        Three is plenty to start with. You can add more whenever you like.
      </p>
      <div className="call-setup-chips">
        {shown.map((o) => {
          const on = chosen.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              className={`call-setup-chip${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => onToggle(o.id)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {!showAll && options.length > shown.length && (
        <button type="button" className="call-setup-more" onClick={() => setShowAll(true)}>
          Show everything ({options.length})
        </button>
      )}
    </>
  );
}

/* ── Spots ───────────────────────────────────────────────────────────────── */

export interface PlaceSuggestion extends SetupPlace {
  /** What the search returned, for the secondary line. */
  detail?: string;
}

export function SpotsStep({
  query, onQuery, suggestions, searching, place, onPick, needsCoastal, coastal, onPickCoastal, pickingCoastal, onPickingCoastal,
}: {
  query: string;
  onQuery: (q: string) => void;
  suggestions: PlaceSuggestion[];
  searching: boolean;
  place: SetupPlace | null;
  onPick: (p: SetupPlace) => void;
  needsCoastal: boolean;
  coastal: SetupPlace | null;
  onPickCoastal: (p: SetupPlace) => void;
  pickingCoastal: boolean;
  onPickingCoastal: (v: boolean) => void;
}) {
  const target = pickingCoastal ? coastal : place;
  return (
    <>
      <p className="call-setup-question">
        {pickingCoastal ? 'And where do you go for the water?' : 'Where are you?'}
      </p>
      <p className="call-setup-help">
        {pickingCoastal
          ? 'The swell and the sea temperature come from here, not from home.'
          : 'The forecast is for this place. A town is close enough.'}
      </p>

      <input
        type="search"
        className="call-setup-input"
        placeholder={pickingCoastal ? 'A beach, a lake, a river' : 'Town or city'}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        autoComplete="off"
        aria-label={pickingCoastal ? 'Search for a coastal spot' : 'Search for your town'}
      />

      {target && !query && (
        <p className="call-setup-chosen">
          <strong>{target.name}</strong>
          {pickingCoastal && (
            <button type="button" className="call-setup-link" onClick={() => onPickingCoastal(false)}>
              Back to home
            </button>
          )}
        </p>
      )}

      {query.length > 1 && (
        <ul className="call-setup-results">
          {searching && <li className="call-setup-result is-quiet">Looking…</li>}
          {!searching && !suggestions.length && (
            <li className="call-setup-result is-quiet">Nothing by that name.</li>
          )}
          {suggestions.map((s) => (
            <li key={`${s.name}:${s.lat},${s.lon}`}>
              <button
                type="button"
                className="call-setup-result"
                onClick={() => (pickingCoastal ? onPickCoastal(s) : onPick(s))}
              >
                <span className="call-setup-result-name">{s.name}</span>
                {s.detail && <span className="call-setup-result-detail">{s.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/*
        * Only offered when a water sport was actually chosen. Asking a runner in
        * Sheffield for their beach is the app admitting it was not listening.
        */}
      {needsCoastal && !pickingCoastal && place && !query && (
        <button type="button" className="call-setup-second" onClick={() => onPickingCoastal(true)}>
          {coastal ? `Water: ${coastal.name}` : 'Add where you go for the water'}
        </button>
      )}
    </>
  );
}

/* ── Hour ────────────────────────────────────────────────────────────────── */

/**
 * The hours worth offering.
 *
 * Not a 24-hour picker. The call is a message that tells you what today is for,
 * so it lands before the day is decided — and a list of four is a decision where
 * a dropdown of twenty-four is a chore. The labels are what the hours mean, with
 * the clock time as the quiet half.
 */
export const HOUR_OPTIONS: ReadonlyArray<{ hour: number; label: string; when: string }> = [
  { hour: 6, label: 'First thing', when: '6am' },
  { hour: 7, label: 'With the kettle on', when: '7am' },
  { hour: 8, label: 'On the way out', when: '8am' },
  { hour: 19, label: 'The night before', when: '7pm' },
];

export function HourStep({
  hour, onPick, pushState, onEnablePush,
}: {
  hour: number | undefined;
  onPick: (h: number) => void;
  pushState: 'unsupported' | 'prompt' | 'granted' | 'denied' | 'working';
  onEnablePush: () => void;
}) {
  return (
    <>
      <p className="call-setup-question">When should Go Daisy tell you?</p>
      <p className="call-setup-help">One message a day. Nothing else, ever.</p>
      <div className="call-setup-hours">
        {HOUR_OPTIONS.map((o) => (
          <button
            key={o.hour}
            type="button"
            className={`call-setup-hour${hour === o.hour ? ' is-on' : ''}`}
            aria-pressed={hour === o.hour}
            onClick={() => onPick(o.hour)}
          >
            <span className="call-setup-hour-label">{o.label}</span>
            <span className="call-setup-hour-when">{o.when}</span>
          </button>
        ))}
      </div>

      {/*
        * The permission is asked for AFTER the hour, not before, and never on
        * arrival. A browser gives one chance at this prompt for the life of the
        * install: asked cold it is refused, and refused it cannot be asked
        * again. So it comes when the person has just said what they want and
        * when — the one moment the answer is obviously yes.
        */}
      {hour !== undefined && pushState !== 'unsupported' && (
        <div className="call-setup-push">
          {pushState === 'granted' ? (
            <p className="call-setup-help">That is set. Go Daisy will tell you at {labelFor(hour)}.</p>
          ) : pushState === 'denied' ? (
            <p className="call-setup-help">
              Notifications are blocked for this site, so Go Daisy will be here on the screen
              instead. Your browser settings can undo that.
            </p>
          ) : (
            <button
              type="button"
              className="call-setup-push-btn"
              onClick={onEnablePush}
              disabled={pushState === 'working'}
            >
              {pushState === 'working' ? 'Asking…' : 'Send it to my phone'}
            </button>
          )}
        </div>
      )}
    </>
  );
}

function labelFor(hour: number): string {
  return HOUR_OPTIONS.find((o) => o.hour === hour)?.when ?? `${hour}:00`;
}
