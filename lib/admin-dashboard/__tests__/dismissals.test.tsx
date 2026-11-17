/**
 * Dismissing Needs attention items for 14 days (dismissals.ts), and the
 * daily series behind the sparklines and the stacked downloads chart
 * (family-series.ts).
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { FamilyDashboard } from '@/components/admin/FamilyDashboard';
import { deriveAttention, type AttentionItem } from '../attention';
import { attentionKey, DISMISS_MS, DISMISS_STORAGE_KEY, liveDismissals, splitDismissed } from '../dismissals';
import { sampleFamilySummary } from '../family-sample';
import { listingConversionDaily, stackedDownloads, sumSeries } from '../family-series';

const now = new Date('2026-10-27T07:00:00Z');

const item = (over: Partial<AttentionItem> = {}): AttentionItem => ({
  level: 'check',
  rule: 'automated_traffic',
  apps: ['risedaisy', 'grewp'],
  label: 'Rise Daisy',
  title: 'Likely automated traffic from Singapore',
  body: '',
  short: 'Bot traffic',
  country: { code: 'SG', name: 'Singapore', visitors: 600, share: 60 },
  ...over,
});

describe('dismissals', () => {
  it('knows an item by rule, apps (in any order) and country, not by its figures', () => {
    expect(attentionKey(item())).toBe(attentionKey(item({ apps: ['grewp', 'risedaisy'], title: 'Likely automated traffic from Singapore (more)', body: 'changed' })));
    expect(attentionKey(item())).not.toBe(attentionKey(item({ country: { code: 'US', name: 'United States', visitors: 1, share: 1 } })));
    expect(attentionKey(item())).not.toBe(attentionKey(item({ rule: 'analytics_disagree', country: undefined })));
  });

  it('keeps only well-formed dismissals that have not run out', () => {
    const t = 1_000;
    expect(liveDismissals({ a: t + 1, b: t - 1, c: 'x', d: null }, t)).toEqual({ a: t + 1 });
    expect(liveDismissals('nonsense', t)).toEqual({});
    expect(liveDismissals([1, 2], t)).toEqual({});
  });

  it('splits dismissed items out until the 14 days are up', () => {
    const it1 = item();
    const it2 = item({ rule: 'errors_rising', level: 'danger', apps: ['godaisy'], country: undefined });
    const t = Date.parse('2026-11-01T00:00:00Z');
    const d = { [attentionKey(it1)]: t + DISMISS_MS };
    expect(splitDismissed([it1, it2], d, t).active).toEqual([it2]);
    expect(splitDismissed([it1, it2], d, t + DISMISS_MS + 1).active).toEqual([it1, it2]);
  });

  it('hides a dismissed item from the page and the header count, remembers it, and restores it', () => {
    window.localStorage.clear();
    render(<FamilyDashboard data={sampleFamilySummary(now)} />);
    const before = deriveAttention(sampleFamilySummary(now)).length;
    const title = 'Errors up 92% in a week';
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Dismiss “${title}”`) }));

    expect(screen.queryByRole('button', { name: new RegExp(`^Dismiss “${title}”`) })).toBeNull();
    const count = screen.getByRole('link', { name: /urgent|to check|All clear/ }).textContent ?? '';
    expect((count.match(/\d+/g) ?? []).reduce((a, n) => a + Number(n), 0)).toBe(before - 1);
    const stored = JSON.parse(window.localStorage.getItem(DISMISS_STORAGE_KEY)!);
    const until = Object.values(stored)[0] as number;
    expect(until - Date.now()).toBeGreaterThan(DISMISS_MS - 60_000);

    const dismissedList = screen.getByText('1 dismissed item').closest('details')!;
    fireEvent.click(within(dismissedList).getByRole('button', { name: 'Restore' }));
    expect(screen.getByRole('button', { name: new RegExp(`^Dismiss “${title}”`) })).toBeInTheDocument();
    expect(window.localStorage.getItem(DISMISS_STORAGE_KEY)).toBeNull();
  });

  it('reads dismissals saved earlier, and works when storage is unavailable', () => {
    window.localStorage.clear();
    const errorsItem = deriveAttention(sampleFamilySummary(now)).find((a) => a.rule === 'errors_rising')!;
    window.localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify({ [attentionKey(errorsItem)]: Date.now() + DISMISS_MS }));
    const { unmount } = render(<FamilyDashboard data={sampleFamilySummary(now)} />);
    expect(screen.getByText('1 dismissed item')).toBeInTheDocument();
    unmount();

    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<FamilyDashboard data={sampleFamilySummary(now)} />);
    expect(screen.getByText('Errors up 92% in a week')).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('family series', () => {
  it('sums series of the most common length and says how many it used', () => {
    expect(sumSeries([[1, 2, 3], [1, 1, 1], [5, 5], null, [7]])).toEqual({ daily: [2, 3, 4], apps: 2 });
    expect(sumSeries([null, undefined, [1]])).toEqual({ daily: [], apps: 0 });
  });

  it('stacks each day’s downloads by app and adds up to the apps’ own totals', () => {
    const data = sampleFamilySummary(now);
    const { days, apps } = stackedDownloads(data.apps);
    expect(days.length).toBe(14);
    for (const d of days) expect(d.total).toBe(d.segments.reduce((a, g) => a + g.value, 0));
    const chartTotal = days.reduce((a, d) => a + d.total, 0);
    expect(apps.reduce((a, x) => a + x.total, 0)).toBe(chartTotal);
    // The last 7 days are the week the header counts
    const lastWeek = days.slice(-7).reduce((a, d) => a + d.total, 0);
    expect(lastWeek).toBe(data.totals.downloads.value);
  });

  it('rates listing conversion over a rolling window from summed views and downloads', () => {
    const data = sampleFamilySummary(now);
    const line = listingConversionDaily(data.apps);
    expect(line.length).toBeGreaterThan(1);
    for (const v of line) if (v !== null) expect(v).toBeGreaterThanOrEqual(0);
  });
});
