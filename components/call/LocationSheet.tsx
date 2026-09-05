/**
 * Changing where you are, from the screen that is wrong about it.
 *
 * The kicker names the place, and until now that was all it did — changing it
 * meant the menu, then onboarding, then three steps to correct one field. The
 * moment you notice the place is wrong is the moment you are looking at it, so
 * that is where the fix belongs.
 *
 * TWO WAYS IN, because they fail differently. Search always works and needs you
 * to know what the place is called; GPS knows exactly where you are and is
 * refused, unavailable or wrong indoors often enough that it cannot be the only
 * option. Neither is the primary — whichever you reach for is the right one.
 *
 * @module components/call/LocationSheet
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { readSetup, writeSetup, mirrorToPreferences, type SetupPlace } from '@/lib/godaisy/call/setup';
import { Spinner } from './Spinner';

interface Suggestion extends SetupPlace {
  detail?: string;
}

type GpsState = 'idle' | 'locating' | 'denied' | 'failed';

export function LocationSheet({ current, onClose }: { current: string; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [gps, setGps] = useState<GpsState>('idle');
  const panel = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    const mine = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
        );
        const j = (await res.json()) as {
          results?: Array<{ name: string; latitude: number; longitude: number; country?: string; admin1?: string }>;
        };
        // Dropped if a newer keystroke has been typed since: a slow answer for
        // "lon" landing after a fast one for "london" flips the list back, and
        // that reads as broken rather than slow.
        if (mine !== seq.current) return;
        setResults((j.results ?? []).map((r) => ({
          name: r.name,
          lat: r.latitude,
          lon: r.longitude,
          detail: [r.admin1, r.country].filter(Boolean).join(', '),
        })));
      } catch {
        if (mine === seq.current) setResults([]);
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  /**
   * Save and reload.
   *
   * A reload rather than client-side state, because the call is decided on the
   * server from this cookie — the verdict, the seven days, the photographs and
   * the share link all come from `getServerSideProps`. Re-deriving that in the
   * browser would be a second implementation of the whole page.
   */
  const choose = useCallback((place: SetupPlace) => {
    const saved = readSetup();
    const setup = saved
      ? { ...saved, place }
      // Somebody who never onboarded still gets to move the map. The sports
      // fall back to what the place is known for on the next render.
      : { v: 1 as const, sports: ['hiking', 'running', 'cycling'], place };
    writeSetup(setup);
    mirrorToPreferences(setup);
    window.location.assign('/');
  }, []);

  const useGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setGps('failed'); return; }
    setGps('locating');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        let name = 'Here';
        try {
          // A coordinate is not a place name, and the kicker prints one. The
          // reverse lookup is best-effort: a fix without a name is still a fix,
          // and "Here" is honest where a wrong town would not be.
          // `/api/geocode` already does this, cached, and answers in
          // OpenWeather's array shape — reusing it rather than adding a second
          // reverse endpoint that would drift from the first.
          const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
          if (res.ok) {
            const j = (await res.json()) as Array<{ name?: string }>;
            if (Array.isArray(j) && j[0]?.name) name = j[0].name;
          }
        } catch { /* keep "Here" */ }
        choose({ name, lat, lon });
      },
      (err) => setGps(err.code === err.PERMISSION_DENIED ? 'denied' : 'failed'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, [choose]);

  return (
    <div className="call-drawer-scrim" onClick={onClose} role="presentation">
      <div
        className="call-drawer call-place"
        role="dialog"
        aria-modal="true"
        aria-label="Change location"
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="call-drawer-grab" aria-hidden="true" />

        <header className="call-drawer-head">
          <p className="call-label call-drawer-kicker">Where</p>
          <p className="call-drawer-headline">{current}</p>
          <button type="button" className="call-drawer-close" onClick={onClose}>Close</button>
        </header>

        <input
          type="search"
          className="call-setup-input"
          placeholder="Town or city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          aria-label="Search for a place"
        />

        {query.length > 1 && (
          <ul className="call-setup-results call-place-results">
            {searching && <li><Spinner label="Looking…" /></li>}
            {!searching && !results.length && (
              <li className="call-setup-result is-quiet">Nothing by that name.</li>
            )}
            {results.map((r) => (
              <li key={`${r.name}:${r.lat},${r.lon}`}>
                <button type="button" className="call-setup-result" onClick={() => choose(r)}>
                  <span className="call-setup-result-name">{r.name}</span>
                  {r.detail && <span className="call-setup-result-detail">{r.detail}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        {!query && (
          <div className="call-place-gps">
            <button
              type="button"
              className="call-setup-chip call-place-gps-btn"
              onClick={useGps}
              disabled={gps === 'locating'}
            >
              Use my location
            </button>
            {gps === 'locating' && <Spinner label="Finding you…" />}
            {gps === 'denied' && (
              <p className="call-drawer-quiet">
                Location is blocked for this site. Your browser settings can undo that —
                or search for the place instead.
              </p>
            )}
            {gps === 'failed' && (
              <p className="call-drawer-quiet">That did not work. Search for the place instead.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
