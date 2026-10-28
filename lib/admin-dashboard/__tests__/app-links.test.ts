/**
 * @jest-environment node
 */
import { APP_DASHBOARDS, attentionActions, cleanDashboardUrl, dashboardUrl, sentryUrl } from '../app-links';
import { FAMILY_APPS } from '../family';
import { getFamilySummary } from '../family-fetch';
import { sampleFamilySummary } from '../family-sample';

const rise = FAMILY_APPS.find((a) => a.id === 'risedaisy')!;

describe('dashboard URLs', () => {
  it('has the verified default for every app but Grow Daisy', () => {
    expect(APP_DASHBOARDS.godaisy).toBe('/admin/dashboard');
    expect(APP_DASHBOARDS.risedaisy).toBe('https://www.risedaisy.com/admin/dashboard');
    expect(APP_DASHBOARDS.findr).toBe('https://fishfindr.eu/findr/admin/dashboard');
    expect(APP_DASHBOARDS.flycast).toBe('https://flycastcoach.com/admin');
    expect(APP_DASHBOARDS.grewp).toBe('https://grewp.org/en/admin/dashboard');
    expect(APP_DASHBOARDS.hungerford).toBe('https://hungerford.risedaisy.com/admin');
    expect(APP_DASHBOARDS.growdaisy).toBeNull();
  });

  it('lets METRICS_<APP>_DASHBOARD_URL override one app', () => {
    const env = { METRICS_RISEDAISY_DASHBOARD_URL: 'https://admin.risedaisy.com/home' };
    expect(dashboardUrl('risedaisy', rise.envKey, env)).toBe('https://admin.risedaisy.com/home');
    expect(dashboardUrl('findr', 'FINDR', env)).toBe(APP_DASHBOARDS.findr);
  });

  it('can give Grow Daisy a link by env, and ignores unusable overrides', () => {
    expect(dashboardUrl('growdaisy', 'GROWDAISY', { METRICS_GROWDAISY_DASHBOARD_URL: 'https://grow.godaisy.io/admin' })).toBe('https://grow.godaisy.io/admin');
    for (const bad of ['', '  ', 'http://insecure.example', 'javascript:alert(1)', '//evil.example', 'not a url']) {
      expect(cleanDashboardUrl(bad)).toBeNull();
      expect(dashboardUrl('risedaisy', 'RISEDAISY', { METRICS_RISEDAISY_DASHBOARD_URL: bad })).toBe(APP_DASHBOARDS.risedaisy);
    }
    expect(cleanDashboardUrl('/admin/x')).toBe('/admin/x');
  });

  it('is on every summary snapshot, resolved after the cache, and in the sample', async () => {
    const cache = { get: async () => undefined, set: async () => undefined } as never;
    const s = await getFamilySummary({ METRICS_FINDR_DASHBOARD_URL: 'https://fishfindr.eu/new' }, { cache });
    expect(s.apps.find((a) => a.id === 'findr')?.dashboardUrl).toBe('https://fishfindr.eu/new');
    expect(s.apps.find((a) => a.id === 'growdaisy')?.dashboardUrl).toBeNull();
    expect(sampleFamilySummary().apps.find((a) => a.id === 'grewp')?.dashboardUrl).toBe(APP_DASHBOARDS.grewp);
  });
});

describe('attentionActions', () => {
  const urls = { findr: APP_DASHBOARDS.findr, godaisy: '/admin/dashboard', growdaisy: null };
  const names = { findr: 'Findr', godaisy: 'Go Daisy' };

  it('sends errors to the app’s Sentry project; Hungerford shares Rise Daisy’s', () => {
    expect(attentionActions({ rule: 'errors_rising', apps: ['findr'] }, urls, names)).toEqual([
      { text: 'Open Sentry issues', href: 'https://go-daisy.sentry.io/projects/findr-nextjs/', external: true, aria: 'Open Sentry issues (opens in a new tab)' },
    ]);
    expect(sentryUrl('hungerford')).toBe(sentryUrl('risedaisy'));
    expect(sentryUrl('growdaisy')).toBeNull();
  });

  it('sends the other rules to the app’s dashboard, same tab when it is on this site', () => {
    const [f] = attentionActions({ rule: 'analytics_disagree', apps: ['findr'] }, urls, names);
    expect(f).toMatchObject({ text: 'Open Findr dashboard', external: true });
    const [g] = attentionActions({ rule: 'not_reporting', apps: ['godaisy'] }, urls, names);
    expect(g).toMatchObject({ href: '/admin/dashboard', external: false, aria: 'Open Go Daisy dashboard' });
  });

  it('gives nothing for an app with no dashboard, and Android goes to Go Daisy', () => {
    expect(attentionActions({ rule: 'wrong_property', apps: ['growdaisy'] }, urls, names)).toEqual([]);
    expect(attentionActions({ rule: 'android_missing', apps: [] }, urls, names)[0].href).toBe('/admin/dashboard');
  });
});
