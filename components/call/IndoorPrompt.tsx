/**
 * What to do with a write-off.
 *
 * "A no always names the next yes. Without that the app has told you to close it
 * and given you no reason to come back." Naming a day in three days' time is a
 * reason to come back, but it is not a reason to stay — so a write-off also
 * offers something that does not care what the weather is doing.
 *
 * The choice is remembered. Being asked the same question every wet Tuesday is
 * the opposite of a product that has already decided; once it knows, the no-day
 * simply says what you are doing instead.
 *
 * THE SHAPE IS THREE, THEN THIRTY-SEVEN. Three chips is a decision — the eye
 * takes all of it in and picks. The full library is a menu, and a menu on a
 * screen that has just told you the day is off is work. So the whole list is
 * here, one tap away, grouped by the category the activity data already carries.
 *
 * @module components/call/IndoorPrompt
 */

import { useEffect, useId, useMemo, useState } from 'react';

export interface IndoorOption {
  id: string;
  /** How it reads in "… instead": "the cinema", "yoga", "cook something". */
  label: string;
  /** From the activity library — groups the expanded list. */
  category?: string;
}

const STORAGE_KEY = 'godaisy.call.indoor';

/** Read the remembered choice. Storage can throw in a private window. */
export function readIndoorPreference(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(id: string | null) {
  try {
    if (id === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // A per-viewer convenience, not a preference worth an account. If the
    // browser will not store it, the prompt simply asks again.
  }
}

/**
 * The three that lead: one from each of the three largest categories.
 *
 * Taking the first three in library order gave ice hockey, curling and the
 * cinema — two of which need an ice rink, because that is the order the data
 * files happen to sit in. One per category spreads the opening offer across the
 * kinds of thing someone might want, and stays derived from the data rather
 * than hand-picked.
 */
function lead(options: IndoorOption[]): IndoorOption[] {
  const groups = new Map<string, IndoorOption[]>();
  for (const o of options) {
    const key = o.category ?? '';
    const g = groups.get(key);
    if (g) g.push(o);
    else groups.set(key, [o]);
  }
  const biggest = [...groups.values()].sort((a, b) => b.length - a.length);
  const picked = biggest.slice(0, 3).map((g) => g[0]);
  // Fewer than three categories: top up in order so the row is never short.
  if (picked.length < 3) {
    for (const o of options) {
      if (picked.length >= 3) break;
      if (!picked.includes(o)) picked.push(o);
    }
  }
  return picked;
}

const upperFirst = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

export interface IndoorPromptProps {
  options: IndoorOption[];
}

export function IndoorPrompt({ options }: IndoorPromptProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Both controls point at the same region, so a screen reader can tell that
  // More and Fewer operate one thing rather than two unrelated buttons.
  const listId = useId();

  // Read after mount: localStorage does not exist on the server, and rendering
  // the chosen state on the server would mismatch the hydrated one.
  useEffect(() => {
    setChosen(readIndoorPreference());
    setReady(true);
  }, []);

  const three = useMemo(() => lead(options), [options]);
  const grouped = useMemo(() => {
    const groups = new Map<string, IndoorOption[]>();
    for (const o of options) {
      const key = o.category ?? 'Other';
      const g = groups.get(key);
      if (g) g.push(o);
      else groups.set(key, [o]);
    }
    return [...groups.entries()];
  }, [options]);

  if (!ready || options.length === 0) return null;

  const picked = options.find((o) => o.id === chosen);
  const choose = (id: string) => { remember(id); setChosen(id); setExpanded(false); };

  if (picked) {
    return (
      <div className="call-indoor call-indoor--settled">
        <p className="call-indoor-line">
          {/* The labels are lower-case because they sit in a chip row; here one
              of them starts a sentence. */}
          Nothing outside today. <strong>{upperFirst(picked.label)}</strong> instead.
        </p>
        <button
          type="button"
          className="call-indoor-change"
          onClick={() => { remember(null); setChosen(null); }}
        >
          Change
        </button>
      </div>
    );
  }

  /*
   * BOTH VIEWS ARE ALWAYS RENDERED, and the inactive one is `hidden`.
   *
   * The disclosure buttons carry `aria-controls`, which has to name an element
   * that exists. Unmounting the expanded list while collapsed — the obvious way
   * to write this — leaves More pointing at nothing, which is the same bug as
   * having no wiring at all, only harder to see. `hidden` takes the inactive
   * view out of the tab order and off the screen, and the reference stays good.
   */
  const chip = (o: IndoorOption) => (
    <button key={o.id} type="button" className="call-indoor-chip" onClick={() => choose(o.id)}>
      {o.label}
    </button>
  );

  return (
    <div className="call-indoor">
      <p className="call-label call-label--on-dark">Instead</p>
      <p className="call-indoor-line">Pick something indoors and we will remember it.</p>

      <div className="call-indoor-row" hidden={expanded}>
        {three.map(chip)}
        {options.length > three.length && (
          <button
            type="button"
            className="call-indoor-chip call-indoor-chip--more"
            onClick={() => setExpanded(true)}
            aria-controls={listId}
            aria-expanded={expanded}
          >
            More
          </button>
        )}
      </div>

      <div className="call-indoor-all" id={listId} hidden={!expanded}>
        {grouped.map(([category, items]) => (
          <div key={category} className="call-indoor-group">
            <p className="call-label call-label--on-dark call-indoor-group-name">{category}</p>
            <div className="call-indoor-row">{items.map(chip)}</div>
          </div>
        ))}
        <button
          type="button"
          className="call-indoor-change"
          onClick={() => setExpanded(false)}
          aria-controls={listId}
          aria-expanded={expanded}
        >
          Fewer
        </button>
      </div>
    </div>
  );
}
