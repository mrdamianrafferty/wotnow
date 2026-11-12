/**
 * The drawn conditions page says things in sentences, so the sentences are
 * what is tested.
 *
 * Against two REAL responses, not hand-written objects: Newquay at noon on 12
 * November 2026 (a cold north-easterly, a big tide, a thin moon) and the
 * trimmed September response the evidence drawer was tested against. A
 * hand-written fixture agrees with whatever its author expected; these were
 * what the API actually said.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  drawConditions, beaufort, waveBand, inPeople, clock, wetness, howFar, snowDeep,
} from '@/lib/godaisy/conditions/drawn';
import { whyHref, whyFromQuery, placeFromQuery } from '@/lib/godaisy/conditions/whyLink';
import { rowsFor } from '@/lib/godaisy/call/readings';
import { seaWear } from '@/lib/godaisy/conditions/seaWear';
import { EVIDENCE_SECTIONS } from '@/lib/godaisy/call/evidence';

const load = (f: string) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8'));
const NOV = load('unified-weather-newquay-nov.json');
const SEP = load('unified-weather-marine.json');
const NOON = new Date('2026-11-12T12:05:00Z');

const said = (day: number, extra: Partial<Parameters<typeof drawConditions>[1]> = {}) =>
  Object.fromEntries(drawConditions(NOV, { day, now: NOON, coastal: true, ...extra }).sections.map((s) => [s.id, s.sentence]));

describe('today, in Newquay', () => {
  const s = said(0);

  it('says each section in a sentence', () => {
    expect(s).toEqual({
      temperature: "It's 9°, but the wind makes it feel like 4°",
      wind: "Force 5 now. By noon tomorrow it's force 1: smoke drifts",
      rain: 'Leave the umbrella at home until Sunday',
      sea: "Waves about chest high. At 14°, it's a 4/3 and boots",
      tide: "Between 1:09pm and 7pm the sea climbs 3.8 m. That's two grown-ups standing on each other's shoulders, and then some",
      sky: "About 9 hours of daylight, and it's gone by 4:39pm",
      air: "Clean air: fine dust is under a third of the WHO's daily limit",
      ground: 'Muddy. Wellies, not trainers',
      night: "A thin moon that sets at 6:18pm, so it's dark after that",
    });
  });

  it('gives every section a drawing and readings, none of them invented', () => {
    for (const sec of drawConditions(NOV, { day: 0, now: NOON, coastal: true }).sections) {
      expect(sec.drawing).not.toBeNull();
      expect(sec.facts.length).toBeGreaterThan(0);
      for (const f of sec.facts) expect(f.value).not.toMatch(/undefined|NaN|null/);
    }
  });

  it('leaves the sea and the tide out inland', () => {
    const inland = said(0, { coastal: false });
    expect(inland.sea).toBeUndefined();
    expect(inland.tide).toBeUndefined();
    expect(inland.temperature).toBeDefined();
  });

  it('leads with what the call turned on', () => {
    const p = drawConditions(NOV, {
      day: 0, now: NOON, coastal: true,
      weighed: [{ key: 'gust', score: 0.8 }, { key: 'swellPeriod', score: 0.3 }],
    });
    expect(p.sections.slice(0, 2).map((x) => x.id)).toEqual(['sea', 'wind']);
    expect(p.sections[0].because?.score).toBe(0.3);
    expect(p.sections[2].because).toBeUndefined();
  });
});

describe('a later day, from the call', () => {
  it('is about that day, and says what only exists for today', () => {
    const p = drawConditions(NOV, { day: 3, now: NOON, coastal: true });
    expect(p.dayName).toBe('Sunday');
    const s = Object.fromEntries(p.sections.map((x) => [x.id, x.sentence]));
    expect(s.temperature).toBe('About 11° all day');
    expect(s.rain).toBe('Rain on Sunday, about 11 mm');
    expect(s.sea).toBe("Waves bigger than a grown-up, 2.3 m. At 14°, it's a 4/3 and boots");
    expect(p.todayOnly).toEqual(expect.arrayContaining(['the air', 'the ground', 'the moon']));
  });

  it('picks the daytime tide, not the one in the small hours', () => {
    expect(said(1).tide).toMatch(/^Between 7:15am and 1:42pm the sea drops/);
  });
});

describe('September, the evening fixture', () => {
  const s = Object.fromEntries(
    drawConditions(SEP, { day: 0, now: new Date('2026-09-05T18:02:00Z'), coastal: true })
      .sections.map((x) => [x.id, x.sentence]),
  );
  it('names humidity when it is what makes it feel warmer', () => {
    expect(s.temperature).toBe("It's 17°, but the humidity makes it feel like 19°");
  });
  it('says tomorrow once, after the time that needs it', () => {
    expect(s.tide).toMatch(/^Between 12:37am and 7:17am tomorrow the sea drops/);
  });
  it('says a moon that rises after dark', () => {
    expect(s.night).toBe('A half moon, rising at 10:04pm');
  });
  it('leaves summer daylight as when it ends', () => {
    expect(s.sky).toBe('Light until 7:56pm: about 13½ hours of it');
  });
});

describe('the fixed comparisons', () => {
  it('uses the Beaufort thresholds', () => {
    expect([0, 1, 5, 6, 11, 12, 28, 29, 38, 39, 117, 118].map(beaufort))
      .toEqual([0, 1, 1, 2, 2, 3, 4, 5, 5, 6, 11, 12]);
  });
  it('measures waves against a person', () => {
    expect([0.2, 0.5, 0.9, 1.2, 1.6, 2.4].map(waveBand))
      .toEqual(['ankle', 'knee', 'waist', 'chest', 'head', 'overhead']);
  });
  it('never claims a stack of people for a small tide', () => {
    expect(inPeople(0.4)).toBe('about knee height');
    expect(inPeople(1.2)).toBe('about chest height');
    expect(inPeople(2.1)).toBe('a bit more than one grown-up');
    expect(inPeople(3.0)).toBe('a grown-up and a half');
    expect(inPeople(3.5)).toBe("two grown-ups standing on each other's shoulders");
  });
  it('says the sea as what to wear, on the old card\'s ladder', () => {
    expect([5, 8, 11.9, 12, 14.9, 15, 18, 21, 24.9, 25, 29].map((t) => seaWear(t).short)).toEqual([
      'Are you mad?', '6/5 or 5/4 + hood', '6/5 or 5/4 + hood', '4/3 + boots', '4/3 + boots',
      '3/2 full suit', 'Shorty / swimwear', 'Swimsuit', 'Swimsuit', 'Swimsuit optional', 'Swimsuit optional',
    ]);
  });
  it('dresses the person in the drawing to match', () => {
    const sea = drawConditions(NOV, { day: 0, now: NOON, coastal: true }).sections.find((x) => x.id === 'sea');
    expect(sea?.drawing).toMatchObject({ kind: 'wave', wear: 'chilly', wearLabel: '4/3 + boots' });
    expect(sea?.facts).toContainEqual({ label: 'Wear', value: '4/3 + boots' });
  });
  it('tells the time the way people say it', () => {
    expect([0, 7.45, 12, 16.65, 19].map(clock)).toEqual(['midnight', '7:27am', 'noon', '4:39pm', '7pm']);
  });
  it('reads a missing daily total as dry, not as unknown', () => {
    expect(wetness({ summary: 'clear sky' })).toBe('dry');
    expect(wetness({ precipMM: 0.9, summary: 'overcast clouds' })).toBe('light');
    expect(wetness({ precipMM: 19.8, summary: 'light rain' })).toBe('wet');
    expect(wetness({ summary: 'light rain' })).toBe('light');
  });
});

/*
 * "See every number" is the table the drawer used to be tested on. It shipped
 * empty once: `rowsFor` read OpenWeather names (`wind_speed`, `temp_max`) the
 * endpoint never returns, and an empty section looks just like a quiet day.
 */
describe('See every number', () => {
  const all = EVIDENCE_SECTIONS.map((s) => ({ id: s.id, rows: rowsFor({ ...s, because: undefined }, SEP) }));

  it('puts a number in every section', () => {
    expect(all.filter((s) => s.rows.length === 0).map((s) => s.id)).toEqual([]);
  });

  it('reads the fields the API returns, in its units', () => {
    const values = all.flatMap((s) => s.rows.map((r) => r.value));
    expect(values).toContain(`${((SEP.windSpeedMS as number) * 3.6).toFixed(0)} km/h`);
    expect(values).toContain(`${(SEP.visibilityKm as number).toFixed(1)} km`);
    for (const v of values) expect(v).not.toMatch(/undefined|NaN|null/);
  });
});

describe('the Why? link', () => {
  const href = whyHref({
    place: 'Newquay', lat: 50.4155, lon: -5.0737, coastal: true, day: 2,
    verdict: 'Saturday is a surf day.',
    weighed: [{ key: 'swellPeriod', score: 0.4 }, { key: 'gust', score: 0.912 }],
  });
  const q = Object.fromEntries(new URL(href, 'https://godaisy.io').searchParams);

  it('round-trips everything the page needs', () => {
    expect(href.startsWith('/weather?')).toBe(true);
    expect(placeFromQuery(q)).toEqual({ name: 'Newquay', lat: 50.4155, lon: -5.0737, coastal: true });
    expect(whyFromQuery(q)).toEqual({
      day: 2,
      verdict: 'Saturday is a surf day.',
      weighed: [{ key: 'swellPeriod', score: 0.4 }, { key: 'gust', score: 0.91 }],
    });
  });

  it('throws away what it cannot trust', () => {
    expect(placeFromQuery({ lat: '91', lon: '0' })).toBeNull();
    expect(placeFromQuery({ lat: 'x', lon: '0' })).toBeNull();
    expect(placeFromQuery({ lat: '50', lon: '-5', n: '<script>' })?.name).toBe('script');
    expect(whyFromQuery({ day: '99', w: 'gust:0.2,bad key:1,ok:7' })).toEqual({
      day: 0, verdict: null, weighed: [{ key: 'gust', score: 0.2 }, { key: 'ok', score: 1 }],
    });
  });
});

/*
 * Winter, on the real Newquay response: the same readings with the snow, the
 * frost or the fog put in, so everything else about the day is still real.
 */
describe('snow, frost and fog', () => {
  type R = typeof NOV;
  const winter = (edit: (r: R) => void) => {
    const r = JSON.parse(JSON.stringify(NOV)) as R;
    edit(r);
    return r;
  };
  const say = (r: R, id: string, day = 0) =>
    drawConditions(r, { day, now: NOON, coastal: true }).sections.find((x) => x.id === id);

  it('reads snow depth in centimetres', () => {
    const r = winter((w) => { for (const h of w.hourly) h.snowDepthCm = 9; });
    expect(say(r, 'ground')?.sentence).toBe('Snow on the ground, about 9 cm: ankle deep');
    expect(say(r, 'ground')?.drawing).toEqual({ kind: 'snowDepth', cm: 9 });
  });

  it('calls a light covering a dusting', () => {
    const r = winter((w) => { for (const h of w.hourly) h.snowDepthCm = 2; });
    expect(say(r, 'ground')?.sentence).toBe('A dusting of snow on the ground');
  });

  it('draws snow, not an umbrella, when the forecast says snow', () => {
    const r = winter((w) => { w.daily[3].summary = 'snow'; delete w.daily[3].precipMM; });
    const rain = say(r, 'rain');
    expect(rain?.sentence).toBe('Dry until Sunday, then snow');
    expect(rain?.title).toBe('Rain and snow');
    expect(rain?.drawing).toMatchObject({ days: expect.arrayContaining([expect.objectContaining({ label: 'Sun', wet: 'snow', note: 'first snow' })]) });
  });

  it('hears snow in the hourly codes when the summary says rain', () => {
    const r = winter((w) => { for (const h of w.hourly) if (h.timeISO.startsWith('2026-11-13')) h.weatherCode = 73; });
    expect(say(r, 'rain')?.sentence).toBe('Dry until tomorrow, then snow');
  });

  it('warns of ice when a frost comes down on wet ground', () => {
    const r = winter((w) => { w.hourly[15].tempC = -2.2; });
    const g = say(r, 'ground');
    expect(g?.sentence).toBe('Muddy. Wellies, not trainers. Frost overnight, down to −2°: icy by morning');
    expect(g?.drawing).toEqual({ kind: 'footwear', index: 4, frost: { lowC: -2.2, icy: true } });
  });

  it('says frozen ground, and how cold it goes', () => {
    const r = winter((w) => { w.soil.temp0cm = -1; w.hourly[15].tempC = -3.4; });
    expect(say(r, 'ground')?.sentence).toBe('Frozen hard underfoot, and down to −3° overnight');
  });

  it('says a frost on a later day too', () => {
    const r = winter((w) => { w.daily[1].minC = -3; });
    expect(say(r, 'ground', 1)?.sentence).toBe('Frost overnight, down to −3°');
    expect(say(r, 'ground', 1)?.drawing).toEqual({ kind: 'frost', lowC: -3, label: 'down to −3°' });
  });

  it('leads the sky with fog, as how far you can see', () => {
    const r = winter((w) => { w.visibilityKm = 0.4; [0, 1, 2].forEach((i) => { w.hourly[i].weatherCode = 45; }); });
    const sky = say(r, 'sky');
    expect(sky?.sentence).toBe('Fog: you can see about 400 m, four football pitches, clearing by 3pm');
    expect(sky?.drawing).toEqual({ kind: 'visibility', m: 400 });
    expect(sky?.facts[0]).toEqual({ label: 'Visibility', value: '400 m' });
  });

  it('calls one to two kilometres mist', () => {
    const r = winter((w) => { w.visibilityKm = 1.5; });
    expect(say(r, 'sky')?.sentence).toBe('Mist: you can see about 1.5 km, fifteen football pitches');
  });

  it('adds fog that is coming to the daylight', () => {
    const r = winter((w) => { w.hourly[10].weatherCode = 45; });
    expect(say(r, 'sky')?.sentence).toBe("About 9 hours of daylight, and it's gone by 4:39pm. Fog likely from 10pm");
  });

  it('measures fog and snow against things people know', () => {
    expect(howFar(60)).toBe('under 60 m, not even a football pitch');
    expect(howFar(150)).toBe('about 150 m, two football pitches');
    expect(howFar(950)).toBe('about 950 m, ten football pitches');
    expect([5, 12, 30, 55, 80].map(snowDeep)).toEqual(['ankle', 'shin', 'knee', 'thigh', 'waist']);
  });
});

/*
 * The gaps filled on 12 Nov 2026: thunder, high UV, high pollen, and a wind
 * drawing for days past the hourly forecast. Same method: the real Newquay
 * response with one thing put in.
 */
describe('thunder, UV, pollen and long-range wind', () => {
  type R = typeof NOV;
  const withEdit = (edit: (r: R) => void) => {
    const r = JSON.parse(JSON.stringify(NOV)) as R;
    edit(r);
    return r;
  };
  const sec = (r: R, id: string, day = 0, lang?: 'de') =>
    drawConditions(r, { day, now: NOON, coastal: true, lang } as Parameters<typeof drawConditions>[1]).sections.find((x) => x.id === id);

  it('says thunder on the day, and marks it in the week strip', () => {
    const r = withEdit((w) => { w.daily[0].summary = 'thunderstorm'; w.daily[0].precipMM = 6; });
    const rain = sec(r, 'rain');
    expect(rain?.sentence).toBe('Thunderstorms today, about 6 mm, then dry tomorrow');
    expect(rain?.drawing).toMatchObject({ days: expect.arrayContaining([expect.objectContaining({ label: 'Thu', thunder: true })]) });
  });

  it('names thunder later in the week under its day', () => {
    const r = withEdit((w) => { for (const h of w.hourly) if (h.timeISO.startsWith('2026-11-14T15')) h.weatherCode = 95; });
    const days = (sec(r, 'rain')?.drawing as { days: Array<{ label: string; note?: string; thunder?: boolean }> }).days;
    expect(days.find((d) => d.label === 'Sat')).toMatchObject({ thunder: true, note: 'thunder' });
    expect(sec(r, 'rain')?.sentence).toBe('Leave the umbrella at home until Saturday');
  });

  it('adds high UV to the daylight, with its hours drawn', () => {
    const r = withEdit((w) => { for (const h of w.hourly) if (/2026-11-12T1[2-4]/.test(h.timeISO)) h.uvi = 7; });
    const sky = sec(r, 'sky');
    expect(sky?.sentence).toBe("About 9 hours of daylight, and it's gone by 4:39pm. UV high from noon to 3pm");
    expect(sky?.drawing).toMatchObject({ kind: 'daylight', uvHours: [12, 13, 14], uvLabel: 'UV 7' });
  });

  it('says nothing about UV below 6', () => {
    const r = withEdit((w) => { for (const h of w.hourly) h.uvi = 5; });
    expect(sec(r, 'sky')?.sentence).toBe("About 9 hours of daylight, and it's gone by 4:39pm");
  });

  it('names the pollen furthest over its high line', () => {
    const r = withEdit((w) => { w.pollen.grass = 60; w.pollen.birch_pollen = 200; });
    expect(sec(r, 'air')?.sentence).toBe("Clean air: fine dust is under a third of the WHO's daily limit. High pollen: birch");
    expect(sec(r, 'air', 0, 'de')?.sentence).toMatch(/Hohe Pollenbelastung: /);
  });

  it('draws one flag for a day past the hourly forecast', () => {
    const r = withEdit((w) => { w.hourly = w.hourly.filter((h: { timeISO: string }) => h.timeISO < '2026-11-16'); });
    const wind = sec(r, 'wind', 5);
    expect(wind?.drawing).toMatchObject({ kind: 'flags', flags: [expect.objectContaining({ kmh: expect.any(Number) })] });
    expect((wind?.drawing as { flags: unknown[] }).flags).toHaveLength(1);
  });
});
