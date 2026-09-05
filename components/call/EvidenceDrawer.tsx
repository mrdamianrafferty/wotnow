/**
 * The evidence — phase 5.
 *
 * `weather.tsx` is 1,603 lines showing eight sections, always, in a fixed
 * order, none of them aware of what you came to do. This is the same readings
 * on demand, over the call, ordered by which inputs moved the verdict.
 *
 * THE DRAWER IS THE ANSWER TO DOUBT, not a second home screen. Nobody opens it
 * to browse; they open it because they do not believe "Monday is a write-off
 * for surfing" and they want to see the numbers. So it opens on the reason —
 * two paragraphs and the bars — and the readings are underneath in the order
 * that matters, rather than the order the API returns them in.
 *
 * ON DEMAND. The readings are fetched when it opens and not before: they are
 * eight sections of numbers nobody has asked for until they ask, and the call
 * screen's job is to render one sentence fast.
 *
 * @module components/call/EvidenceDrawer
 */

import { useEffect, useRef, useState } from 'react';
import { visibleSections, type RankedSection } from '@/lib/godaisy/call/evidence';
import { BAND_LABEL, type CallBand } from '@/lib/godaisy/call/bands';
import type { CallOption } from '@/lib/godaisy/call/makeCall';

export interface EvidenceDrawerProps {
  option: CallOption;
  place: string;
  /** Where to read from, for the on-demand fetch. */
  lat: number;
  lon: number;
  coastal: boolean;
  /** The verdict as one line, so the drawer opens on what it is explaining. */
  headline: string;
  onClose: () => void;
}

const PART_LABEL: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

/**
 * `/api/unified-weather`, as it actually answers.
 *
 * THE FIRST VERSION OF THIS WAS WRITTEN AGAINST A GUESS. It read `wind_speed`,
 * `temp_max`, `rain`, `pop` — OpenWeather One Call names, because that is the
 * shape the forecast pipeline imitates internally. This endpoint answers in its
 * own shape: `windSpeedMS`, `maxC`, `precipMM`, `cloudsPct`. Every key missed,
 * every section rendered "Nothing published for this", and the drawer looked
 * like a working feature with no data behind it — which is exactly how it
 * shipped, because the empty state was indistinguishable from a quiet day.
 *
 * Units are in the names and they are not the ones the app uses: wind is m/s
 * where `WeatherData` is km/h, visibility is already km.
 */
interface Readings {
  temperatureC?: number;
  feelsLikeC?: number;
  humidityPct?: number;
  pressureHpa?: number;
  /** METRES PER SECOND. */
  windSpeedMS?: number;
  windDeg?: number;
  /** Already kilometres. */
  visibilityKm?: number;
  uvi?: number;
  cloudsPct?: number;
  hourly?: Array<{ timeISO?: string; tempC?: number; windMS?: number; precipMM?: number }>;
  daily?: Array<{ minC?: number; maxC?: number; windMS?: number; precipMM?: number; moonPhase?: number }>;
  marine?: { waveHeight?: number; wavePeriod?: number; swellHeight?: number; swellPeriod?: number };
  /** An ARRAY of extremes, not an object with one. */
  tides?: Array<{ time?: string; type?: string; height?: number }>;
  marineHourly?: Array<{ waterTempC?: number }>;
  airQuality?: { aqi?: number; components?: Record<string, number> };
  pollen?: Record<string, number | string | null>;
  soil?: { temp0cm?: number; temp6cm?: number; moisture0to1?: number };
  moon?: { illuminationPct?: number; moonriseISO?: string; moonsetISO?: string };
}

export function EvidenceDrawer({
  option, place, lat, lon, coastal, headline, onClose,
}: EvidenceDrawerProps) {
  const [readings, setReadings] = useState<Readings | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const panel = useRef<HTMLDivElement>(null);

  /*
   * Escape closes it, and focus moves into the panel on open.
   *
   * A drawer that traps a keyboard user behind a screen they cannot leave is
   * worse than no drawer. Focus is not fully trapped — the call underneath is
   * inert while this is open, and a full trap is more machinery than a panel
   * with one close button needs.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        // `mode=marine` is what puts `marine`, `tides` and `marineHourly` in the
        // response at all; `full` returns none of them, so a surf day's sea
        // section would have been empty even after the field names were right.
        const res = await fetch(
          `/api/unified-weather?lat=${lat}&lon=${lon}&mode=${coastal ? 'marine' : 'full'}`,
        );
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as Readings;
        if (live) { setReadings(j); setState('ready'); }
      } catch {
        // The verdict and the bars come from props and are already on screen.
        // A failed fetch costs the readings, not the explanation.
        if (live) setState('failed');
      }
    })();
    return () => { live = false; };
  }, [lat, lon, coastal]);

  const sections = visibleSections(option.weighed, { coastal });

  return (
    <div className="call-drawer-scrim" onClick={onClose} role="presentation">
      <div
        className="call-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Why: ${headline}`}
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="call-drawer-grab" aria-hidden="true" />

        <header className="call-drawer-head">
          <p className="call-label call-drawer-kicker">Why</p>
          <p className="call-drawer-headline">{headline}</p>
          <button type="button" className="call-drawer-close" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>

        <PartBars parts={option.parts} band={option.band} />

        <section className="call-drawer-sections">
          {sections.map((s) => (
            <SectionBlock key={s.id} section={s} readings={readings} state={state} />
          ))}
        </section>

        <p className="call-drawer-foot">
          {place} · scored {option.score} out of 100 · {BAND_LABEL[option.band]}
        </p>
      </div>
    </div>
  );
}

/**
 * Three bars, one per part of the day.
 *
 * Not twenty-four. The window is built on dayparts because a 24-bar chart is
 * the app claiming to know that the wind turns at 10:00, which the forecast
 * cannot support — and a chart that contradicts the sentence above it is worse
 * than no chart.
 */
function PartBars({ parts, band }: { parts?: CallOption['parts']; band: CallBand }) {
  if (!parts?.length) {
    // No hourly series for this day — the first and last days of a forecast are
    // often partial. Saying so is better than three grey bars implying a reading.
    return null;
  }
  return (
    <div className="call-drawer-bars">
      {parts.map((p) => (
        <div key={p.name} className={`call-drawer-bar is-${p.band}`}>
          <span className="call-drawer-bar-part">{PART_LABEL[p.name] ?? p.name}</span>
          <span className="call-drawer-bar-band">{BAND_LABEL[p.band]}</span>
        </div>
      ))}
      {note(parts, band) && <p className="call-drawer-bars-note">{note(parts, band)}</p>}
    </div>
  );
}

/**
 * What the bars say that the verdict does not.
 *
 * THE BARS CAN DISAGREE WITH THE VERDICT, and hiding that would be the wrong
 * fix. Newquay on 7 September reads "a write-off for cycling" — the day totals
 * 6.9 mm of rain, cycling vetoes above 3 — while its parts score prime, prime,
 * notToday, because nearly all of that rain falls in the evening. The parts are
 * right and the day-level verdict is wrong for that day.
 *
 * That is a scoring question, not a drawer question: the fix belongs where the
 * verdict is decided, and the honest thing here is to say what the numbers show
 * rather than to quietly render two contradictory claims and let the reader
 * find them. A drawer whose whole purpose is to be checkable cannot start by
 * suppressing the check.
 */
function note(parts: NonNullable<CallOption['parts']>, band: CallBand): string | null {
  const good = new Set<CallBand>(['prime', 'worthALook']);
  const dayIsGood = good.has(band);
  const goodParts = parts.filter((p) => good.has(p.band));

  if (parts.every((p) => p.band === band)) return 'It holds all day.';
  if (!dayIsGood && goodParts.length) {
    const names = goodParts.map((p) => (PART_LABEL[p.name] ?? p.name).toLowerCase());
    const list = names.length === 1 ? `the ${names[0]}` : `the ${names.slice(0, -1).join(', ')} and the ${names[names.length - 1]}`;
    return `Taken as a whole the day is off, but ${list} scores better than that.`;
  }
  return null;
}

function SectionBlock({
  section, readings, state,
}: {
  section: RankedSection;
  readings: Readings | null;
  state: 'loading' | 'ready' | 'failed';
}) {
  const [open, setOpen] = useState(false);
  const rows = state === 'ready' ? rowsFor(section, readings) : [];

  return (
    <div className={`call-drawer-section${section.because ? ' is-evidence' : ''}`}>
      <button
        type="button"
        className="call-drawer-section-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="call-drawer-section-title">{section.title}</span>
        {/*
          * Only sections a criterion actually pointed at say why they are here.
          * Labelling all of them "evidence" would make the word mean nothing,
          * and most sections on most days have nothing pointing at them.
          */}
        {section.because && (
          <span className="call-drawer-section-why">
            {section.because.score < 0.5 ? 'held the day back' : 'weighed in'}
          </span>
        )}
        <span className="call-drawer-section-chev" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="call-drawer-section-body">
          {state === 'loading' && <p className="call-drawer-quiet">Reading…</p>}
          {state === 'failed' && <p className="call-drawer-quiet">Those numbers did not load.</p>}
          {state === 'ready' && !rows.length && <p className="call-drawer-quiet">Nothing published for this.</p>}
          {rows.map((r) => (
            <p key={r.label} className="call-drawer-row">
              <span className="call-drawer-row-label">{r.label}</span>
              <span className="call-drawer-row-value">{r.value}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

interface Row { label: string; value: string }

/** Degrees to the eight points, because "215°" is a number and "SW" is a wind. */
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
const compass = (deg?: number) =>
  typeof deg === 'number' && Number.isFinite(deg) ? COMPASS[Math.round(deg / 45) % 8] : null;

/** Today's total from the hourly series, since the daily figure is not always there. */
const rainToday = (r: Readings): number | undefined => {
  const today = new Date().toISOString().slice(0, 10);
  const hours = (r.hourly ?? []).filter((h) => h.timeISO?.startsWith(today));
  if (!hours.length) return r.daily?.[0]?.precipMM;
  return hours.reduce((sum, h) => sum + (typeof h.precipMM === 'number' ? h.precipMM : 0), 0);
};

/**
 * The readings for one section.
 *
 * Nothing is defaulted: a missing field produces no row, never "undefined" and
 * never a zero standing in for an absence. A fabricated reading in a drawer
 * whose whole job is to be checkable is the one unforgivable bug in this file.
 */
function rowsFor(section: RankedSection, r: Readings | null): Row[] {
  if (!r) return [];
  const n = (v: unknown, unit: string, dp = 0): string | null =>
    typeof v === 'number' && Number.isFinite(v) ? `${v.toFixed(dp)}${unit}` : null;
  const keep = (label: string, v: string | null): Row[] => (v ? [{ label, value: v }] : []);
  const kmh = (ms?: number) => (typeof ms === 'number' ? ms * 3.6 : undefined);
  const today = r.daily?.[0];

  switch (section.id) {
    case 'wind': {
      const dir = compass(r.windDeg);
      return [
        ...keep('Now', n(kmh(r.windSpeedMS), ' km/h')),
        ...keep('Today', n(kmh(today?.windMS), ' km/h')),
        ...keep('From the', dir),
      ];
    }
    case 'rain':
      return [
        ...keep('Today', n(rainToday(r), ' mm', 1)),
        ...keep('Next hour', n(r.hourly?.[0]?.precipMM, ' mm', 1)),
      ];
    case 'temperature':
      return [
        ...keep('Now', n(r.temperatureC, '°')),
        ...keep('Feels like', n(r.feelsLikeC, '°')),
        ...keep('High', n(today?.maxC, '°')),
        ...keep('Low', n(today?.minC, '°')),
      ];
    case 'sea':
      return [
        ...keep('Wave height', n(r.marine?.waveHeight, ' m', 1)),
        ...keep('Swell', n(r.marine?.swellHeight, ' m', 1)),
        ...keep('Swell period', n(r.marine?.swellPeriod ?? r.marine?.wavePeriod, ' s')),
        ...keep('Sea temperature', n(r.marineHourly?.[0]?.waterTempC, '°', 1)),
      ];
    case 'tide':
      // Two extremes is a tide; six is a timetable, and this is a drawer.
      return (r.tides ?? []).slice(0, 2).flatMap((t) => {
        const when = typeof t.time === 'string'
          ? new Date(t.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : null;
        const kind = typeof t.type === 'string' ? t.type : 'tide';
        return when ? [{ label: `${kind[0].toUpperCase()}${kind.slice(1)} water`, value: when }] : [];
      });
    case 'sky':
      return [
        ...keep('Cloud', n(r.cloudsPct, '%')),
        ...keep('Visibility', n(r.visibilityKm, ' km', 1)),
        ...keep('UV', n(r.uvi, '')),
      ];
    case 'air': {
      const worstPollen = Object.entries(r.pollen ?? {})
        .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
      return [
        ...keep('Humidity', n(r.humidityPct, '%')),
        ...keep('Pressure', n(r.pressureHpa, ' hPa')),
        ...keep('Air quality', n(r.airQuality?.aqi, '')),
        ...keep('PM2.5', n(r.airQuality?.components?.pm2_5, ' µg/m³', 1)),
        ...(worstPollen ? [{ label: 'Most pollen', value: worstPollen[0].replace(/_/g, ' ') }] : []),
      ];
    }
    case 'ground':
      return [
        ...keep('Soil at the surface', n(r.soil?.temp0cm, '°')),
        ...keep('Soil at 6 cm', n(r.soil?.temp6cm, '°')),
        ...keep('Moisture, top layer', n(
          typeof r.soil?.moisture0to1 === 'number' ? r.soil.moisture0to1 * 100 : undefined, '%')),
      ];
    case 'night': {
      const time = (iso?: string) => (iso
        ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : null);
      return [
        ...keep('Moon', n(r.moon?.illuminationPct, '% lit')),
        ...keep('Moonrise', time(r.moon?.moonriseISO)),
        ...keep('Moonset', time(r.moon?.moonsetISO)),
      ];
    }
    default:
      return [];
  }
}
