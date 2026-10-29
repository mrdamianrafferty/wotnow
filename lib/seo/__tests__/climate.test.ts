import { landNormals, marineNormals } from '../climateAggregate';
import { ACTIVITY_MEASURES, MEASURES, describeMonths, extremes, monthByMonth, sentenceFor, type NormalsFile } from '../climate';
import { placeSpecificActivities } from '../tiers';

/** Two years of daily data where every January day is hot and every July day is cold, so the answer is known. */
function twoYears() {
  const time: string[] = [];
  const tmax: number[] = [];
  const tmin: number[] = [];
  const precip: number[] = [];
  const snow: number[] = [];
  const wind: number[] = [];
  for (const y of [2023, 2024]) {
    for (let m = 1; m <= 12; m++) {
      const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      for (let d = 1; d <= days; d++) {
        time.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        tmax.push(m === 1 ? 30 : m === 7 ? 10 : 20);
        tmin.push(m === 1 ? -5 : 5); // January nights below freezing
        precip.push(m === 1 && d <= 10 ? 5 : m === 1 && d <= 12 ? 0.5 : 0); // 10 rainy days a January; 0.5 mm is not one
        snow.push(m === 7 ? 0 : d === 1 ? 2 : 0); // a snowy first of every month except July
        wind.push(m === 1 ? 40 : 10);
      }
    }
  }
  return { time, tmax, tmin, precip, snowfall: snow, windMean: wind };
}

describe('turning daily weather into twelve numbers', () => {
  const n = landNormals(twoYears())!;

  it('averages temperatures by calendar month, January first', () => {
    expect(n.maxTemp[0]).toBe(30);
    expect(n.maxTemp[6]).toBe(10);
    expect(n.maxTemp[3]).toBe(20);
    expect(n.minTemp[0]).toBe(-5);
    expect(n.wind[0]).toBe(40);
  });

  it('counts days a month as a typical month, not a total over the years', () => {
    expect(n.rainDays[0]).toBe(10); // ten rainy days in each of two Januaries, not twenty
    expect(n.rainDays[6]).toBe(0);
    expect(n.frostDays[0]).toBe(31); // every January night, in a 31-day month
    expect(n.frostDays[1]).toBe(0);
    expect(n.snowDays[0]).toBe(1);
    expect(n.snowDays[6]).toBe(0);
  });

  it('does not count 0.5 mm as a rainy day', () => {
    expect(n.rainDays[0]).toBe(10);
  });

  it('refuses to publish a series with a month missing, rather than turning the gap into zero', () => {
    const d = twoYears();
    const keep = d.time.map((t) => !t.slice(5, 7).startsWith('03'));
    const cut = (a: number[]) => a.filter((_, i) => keep[i]);
    expect(landNormals({ time: d.time.filter((_, i) => keep[i]), tmax: cut(d.tmax), tmin: cut(d.tmin), precip: cut(d.precip), snowfall: cut(d.snowfall), windMean: cut(d.windMean) })).toBeNull();
  });

  it('skips null readings without counting them as zero', () => {
    const d = twoYears();
    const tmax: (number | null)[] = d.tmax.map((v, i) => (d.time[i] === '2023-01-01' ? null : v));
    expect(landNormals({ ...d, tmax })!.maxTemp[0]).toBe(30);
  });

  it('builds marine normals from daily waves and hourly sea temperature, or nothing', () => {
    const time: string[] = [];
    const wave: number[] = [];
    const hTime: string[] = [];
    const sst: number[] = [];
    for (let m = 1; m <= 12; m++) {
      time.push(`2023-${String(m).padStart(2, '0')}-15`);
      wave.push(m);
      hTime.push(`2023-${String(m).padStart(2, '0')}-15T12:00`);
      sst.push(m + 0.25);
    }
    const out = marineNormals({ time, waveMax: wave }, { time: hTime, sst })!;
    expect(out.wave[11]).toBe(12);
    expect(out.seaTemp[0]).toBe(1.3);
    expect(marineNormals({ time, waveMax: wave.map(() => null) }, { time: hTime, sst })).toBeNull();
  });
});

describe('describing months', () => {
  it('writes a run as "from to", across the new year too', () => {
    expect(describeMonths([4, 5, 6, 7, 8, 9, 10])).toBe('April to October');
    expect(describeMonths([11, 12, 1, 2, 3])).toBe('November to March');
    expect(describeMonths([12, 1, 2])).toBe('December to February');
    expect(describeMonths([9, 10, 11])).toBe('September to November');
  });

  it('copes with one month, two months, gaps, and all year', () => {
    expect(describeMonths([5])).toBe('May');
    expect(describeMonths([5, 6])).toBe('May and June');
    expect(describeMonths([3, 4, 5, 9, 10])).toBe('March to May and September and October');
    expect(describeMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe('all year');
    expect(describeMonths([])).toBeNull();
    expect(describeMonths([0, 13])).toBeNull();
  });
});

describe('the sentences are facts about the numbers', () => {
  const series = [9, 10, 11, 13, 15, 17, 19, 19.4, 18, 15, 12, 10];

  it('finds the highest and lowest month, first month winning a tie', () => {
    expect(extremes(series)).toEqual({ hi: { month: 7, value: 19.4 }, lo: { month: 0, value: 9 } });
    expect(extremes([5, 5, 5]).hi.month).toBe(0);
  });

  it('says the same thing the data says', () => {
    expect(sentenceFor('maxTemp', series)).toBe('Daytime highs peak at 19°C in August and fall to 9°C in January.');
    expect(sentenceFor('seaTemp', series)).toBe('The sea is warmest in August at 19°C and coldest in January at 9°C.');
    expect(sentenceFor('wave', [2.7, 2.8, 2.4, 1.8, 1.4, 1.3, 1.4, 1.5, 1.7, 2, 2.7, 2.7])).toContain('biggest in February');
  });

  it('says so when snow and frost are rare, instead of reporting a meaningless peak', () => {
    expect(sentenceFor('snowDays', [0, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1])).toContain('rare');
    expect(sentenceFor('frostDays', new Array(12).fill(0.4))).toContain('rare');
    expect(sentenceFor('snowDays', [8, 6, 3, 0, 0, 0, 0, 0, 0, 1, 4, 7])).toBe('Snow is most likely in January, with about 8 snowy days.');
  });
});

describe('what each activity shows', () => {
  it('has an entry for every place-specific activity, so a new one cannot ship without a decision', () => {
    const missing = [...placeSpecificActivities()].filter((id) => !ACTIVITY_MEASURES[id]);
    expect(missing).toEqual([]);
  });

  it('only names measures that exist, with at least three and at most four per activity', () => {
    for (const [id, keys] of Object.entries(ACTIVITY_MEASURES)) {
      expect(keys.length).toBeGreaterThanOrEqual(3);
      expect(keys.length).toBeLessThanOrEqual(4);
      for (const k of keys) expect(MEASURES[k]).toBeDefined();
      expect(new Set(keys).size).toBe(keys.length);
      expect(id).toBeTruthy();
    }
  });
});

describe('the block a page shows', () => {
  const twelve = (f: (i: number) => number) => Array.from({ length: 12 }, (_, i) => f(i));
  const land = { maxTemp: twelve((i) => 10 + i), minTemp: twelve((i) => 2 + i), rainDays: twelve(() => 12), snowDays: twelve(() => 0), frostDays: twelve(() => 0), wind: twelve(() => 20) };
  const marine = { wave: twelve((i) => 1 + i / 10), seaTemp: twelve((i) => 10 + i / 2) };
  const file: NormalsFile = { landYears: ['2020', '2024'], marineYears: ['2022', '2024'], locations: { coast: { land, marine }, inland: { land } } };

  it('shows the activity’s own measures, in its own order, with the in-season months', () => {
    const b = monthByMonth('sea_swimming', { slug: 'coast', name: 'Coast' }, 'Sea swimming', file)!;
    expect(b.rows.map((r) => r.key)).toEqual(['seaTemp', 'wave', 'maxTemp', 'rainDays']);
    expect(b.rows.every((r) => r.values.length === 12)).toBe(true);
    expect(b.seasonal).toEqual([5, 6, 7, 8, 9, 10]);
    expect(b.seasonSentence).toBe('Our seasonal guide puts sea swimming in season from May to October.');
    expect(b.sentences.length).toBe(4);
    expect(b.basis).toContain('2022 to 2024');
    expect(b.basis).toContain('Not a forecast');
  });

  it('shows nothing for a sea activity where there is no sea data, and nothing for an unknown place', () => {
    expect(monthByMonth('sea_swimming', { slug: 'inland', name: 'Inland' }, 'Sea swimming', file)).toBeNull();
    expect(monthByMonth('sea_swimming', { slug: 'nowhere', name: 'Nowhere' }, 'Sea swimming', file)).toBeNull();
  });

  it('shows land activities without needing the sea, and cites only the years it used', () => {
    const b = monthByMonth('rock_climbing', { slug: 'inland', name: 'Inland' }, 'Rock climbing', file)!;
    expect(b.rows.map((r) => r.key)).toEqual(['maxTemp', 'rainDays', 'wind', 'minTemp']);
    expect(b.basis).not.toContain('2022');
    expect(b.seasonal).toBeNull();
    expect(b.seasonSentence).toBeNull();
  });

  it('never claims a verdict: no "best", no score', () => {
    const b = monthByMonth('surfing', { slug: 'coast', name: 'Coast' }, 'Surfing', file)!;
    const text = [...b.sentences, b.basis, b.seasonSentence ?? ''].join(' ');
    expect(text).not.toMatch(/\bbest\b/i);
    expect(text).not.toMatch(/\bscore\b/i);
  });
});
