/**
 * @jest-environment node
 */
/**
 * The adjusted-active-users rule: a country is left out only when it is big,
 * has no store downloads, and browses like a script; and an app is never
 * adjusted on missing data.
 */

import { adjustUsers, familyUsers } from '../automated';
import { FAMILY_APPS, readAppSummary, type AppSnapshot, type FamilyAppId, type Part, type VercelPart } from '../family';
import { sampleFamilyBodies, sampleFamilySummary, sampleVercel } from '../family-sample';

const now = new Date('2026-10-27T07:00:00Z');
const sample = () => sampleFamilySummary(now, { withVercel: true }).apps;
const by = (apps: AppSnapshot[], id: FamilyAppId) => apps.find((a) => a.id === id)!;

/** One app from the sample bodies, edited. */
function edited(id: FamilyAppId, edit: (b: Record<string, any>) => void): AppSnapshot {
  const bodies = sampleFamilyBodies(now) as Record<string, Record<string, any>>;
  const body = structuredClone(bodies[id]);
  edit(body);
  return readAppSummary(FAMILY_APPS.find((a) => a.id === id)!, body);
}

describe('adjustUsers: week of 21–27 Oct 2026', () => {
  it('flags Singapore on Rise Daisy: 663 of 1,049, no SG download, 72% desktop', () => {
    const v = adjustUsers(by(sample(), 'risedaisy'));
    expect(v.flagged).toEqual([{ code: 'SG', name: 'Singapore', users: 663, share: 63, basis: 'desktop', viewsPerVisitor: null }]);
    expect(v.raw!.value).toBe(1049);
    expect(v.headline!.value).toBe(386);
    expect(v.excluded).toBe(663);
    expect(v.rawOnlyWhy).toBeNull();
  });

  it('does not flag Grewp’s Spain: real, mobile, and it has a download', () => {
    const grewp = by(sample(), 'grewp');
    const v = adjustUsers(grewp);
    expect(v.flagged).toEqual([]);
    expect(v.headline).toEqual(v.raw);
    // Even without the download, Grewp is 68% mobile and Vercel shows nothing odd for Spain
    const noDownload = edited('grewp', (b) => (b.storeDownloads.data.countries30d = []));
    expect(adjustUsers(noDownload).flagged).toEqual([]);
  });

  it('leaves Findr (19 users) and a Fly Cast that is 68% desktop alone', () => {
    expect(adjustUsers(by(sample(), 'findr')).flagged).toEqual([]);
    expect(adjustUsers(by(sample(), 'flycast')).flagged).toEqual([]);
  });

  it('sums the family: adjusted headline, raw kept, countries named', () => {
    const f = familyUsers(sample());
    expect(f.excluded).toBe(663);
    expect(f.raw.value - f.headline.value).toBe(663);
    expect(f.countries).toEqual([{ code: 'SG', name: 'Singapore', users: 663, apps: ['risedaisy'] }]);
    expect(f.rawOnly).toEqual([]);
  });
});

describe('the four conditions', () => {
  const rise = (edit: (b: Record<string, any>) => void) => adjustUsers(edited('risedaisy', edit));
  const sg = (users: number) => (b: Record<string, any>) => (b.audience.data.countries[0].activeUsers = users);

  it('needs 25 users and 20% of the app', () => {
    expect(rise(sg(209)).flagged).toHaveLength(0); // 209 of 1,049: 19.9%
    expect(rise(sg(210)).flagged).toHaveLength(1); // 20.02%
    // 24 of 100 is 24%, but under 25 users
    const small = (users: number) => (b: Record<string, any>) => {
      b.audience.data.countries = [{ code: 'SG', name: 'Singapore', activeUsers: users }];
      b.audience.data.devices = [{ category: 'desktop', activeUsers: 100 }];
    };
    expect(rise(small(24)).flagged).toHaveLength(0);
    expect(rise(small(25)).flagged).toHaveLength(1);
  });

  it('is cleared by a single store download from the country', () => {
    expect(rise((b) => b.storeDownloads.data.countries30d.push({ country: 'SG', downloads: 1 })).flagged).toHaveLength(0);
  });

  it('needs desktop 70%, or Vercel pages per visitor 1.5× the app’s', () => {
    const mobile = (b: Record<string, any>) => (b.audience.data.devices = [{ category: 'desktop', activeUsers: 300 }, { category: 'mobile', activeUsers: 749 }]);
    expect(rise(mobile).flagged).toHaveLength(0);

    // Vercel: Rise averages 3.4 pages per visitor; Singapore at 5.2 is 1.5× (5.1)
    const risedaisy = edited('risedaisy', mobile);
    const withVercel = (views: number): AppSnapshot => ({
      ...risedaisy,
      vercel: { state: 'ok', data: { ...(sampleVercel(now).risedaisy as Extract<Part<VercelPart>, { state: 'ok' }>).data, countries: [{ code: 'SG', name: 'Singapore', visitors: 100, pageviews: views }] } },
    });
    expect(adjustUsers(withVercel(520)).flagged.map((c) => [c.code, c.basis])).toEqual([['SG', 'vercel']]);
    expect(adjustUsers(withVercel(400)).flagged).toHaveLength(0);
  });

  it('never flags a home market', () => {
    expect(rise((b) => (b.audience.data.countries[0] = { code: 'GB', name: 'United Kingdom', activeUsers: 663 })).flagged).toHaveLength(0);
  });
});

describe('never adjusts without the data', () => {
  it('stays raw, with the reason, when the audience, devices or store countries are missing', () => {
    const noAudience = adjustUsers(edited('risedaisy', (b) => delete b.audience));
    expect(noAudience).toMatchObject({ excluded: 0, flagged: [], rawOnlyWhy: 'audience not reported' });
    expect(noAudience.headline).toEqual(noAudience.raw);
    expect(adjustUsers(edited('risedaisy', (b) => (b.audience.data.devices = []))).rawOnlyWhy).toBe('no device split');
    expect(adjustUsers(edited('risedaisy', (b) => delete b.storeDownloads.data.countries30d)).rawOnlyWhy).toBe('store countries not reported');
    expect(adjustUsers(edited('risedaisy', (b) => (b.storeDownloads = { state: 'error', message: 'x' }))).rawOnlyWhy).toBe('store countries not reported');
  });

  it('says nothing for an app with no active users, and lists raw-only apps in the family sum', () => {
    expect(adjustUsers(edited('risedaisy', (b) => delete b.analytics)).raw).toBeNull();
    const apps = sample().map((a) => (a.id === 'risedaisy' ? edited('risedaisy', (b) => delete b.audience) : a));
    expect(familyUsers(apps).rawOnly).toEqual([{ id: 'risedaisy', name: 'Rise Daisy', why: 'audience not reported' }]);
    expect(familyUsers(apps).excluded).toBe(0);
  });
});

describe('week on week', () => {
  it('scales the previous week by the same excluded share and says it is an estimate', () => {
    const v = adjustUsers(by(sample(), 'risedaisy'));
    expect(v.previousEstimated).toBe(true);
    // 386/1049 of 1,566
    expect(v.headline!.previous).toBe(576);
    expect(v.headline!.delta).toBe(-33);
  });
});
