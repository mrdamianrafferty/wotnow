/**
 * The drawer, against a real API response.
 *
 * IT SHIPPED EMPTY. `rowsFor` was written against `wind_speed`, `temp_max`,
 * `rain`, `pop` — OpenWeather One Call names, because that is the shape the
 * forecast pipeline imitates internally. `/api/unified-weather` answers in its
 * own: `windSpeedMS`, `maxC`, `precipMM`, `cloudsPct`. Every key missed, every
 * section rendered "Nothing published for this", and nothing looked broken —
 * the empty state is indistinguishable from a quiet day.
 *
 * So the fixture is a REAL response, trimmed, rather than a hand-written object
 * that would agree with whatever the reader happens to expect. A hand-written
 * fixture would have passed against the broken version too.
 */

import fs from 'node:fs';
import path from 'node:path';
import { render, screen, waitFor, act } from '@testing-library/react';
import { EvidenceDrawer } from '@/components/call/EvidenceDrawer';
import type { CallOption } from '@/lib/godaisy/call/makeCall';

const READINGS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'unified-weather-marine.json'), 'utf8'),
);

const option = {
  activityId: 'surfing',
  activityName: 'Surfing',
  score: 72,
  band: 'worthALook',
  verdict: { verdict: 'a surf day.', reason: 'Swell worth having.' },
  facts: [],
  weighed: [{ key: 'swellPeriod', score: 0.4 }, { key: 'gust', score: 0.9 }],
  parts: [
    { name: 'morning', band: 'prime', score: 82 },
    { name: 'afternoon', band: 'worthALook', score: 66 },
    { name: 'evening', band: 'notToday', score: 20 },
  ],
} as unknown as CallOption;

const openEverything = async () => {
  const heads = await screen.findAllByRole('button', { expanded: false });
  await act(async () => { heads.forEach((h) => h.click()); });
};

const sections = () =>
  [...document.querySelectorAll('.call-drawer-section')].map((sec) => ({
    title: sec.querySelector('.call-drawer-section-title')?.textContent ?? '',
    rows: sec.querySelectorAll('.call-drawer-row').length,
  }));

describe('the evidence drawer, on a real response', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => READINGS }) as never;
    render(
      <EvidenceDrawer
        option={option} place="Newquay" lat={50.4155} lon={-5.0737}
        coastal headline="Today is a surf day." onClose={() => {}}
      />,
    );
  });

  it('puts a number in every section it shows', async () => {
    await openEverything();
    const empty = sections().filter((s) => s.rows === 0);
    expect(empty).toEqual([]);
  });

  it('reads the fields the API actually returns, in the units it returns them', async () => {
    await openEverything();
    // windSpeedMS is metres per second and the app speaks km/h.
    const ms = READINGS.windSpeedMS as number;
    expect(screen.getByText(`${(ms * 3.6).toFixed(0)} km/h`)).toBeInTheDocument();
    // visibilityKm is already kilometres and must not be divided again.
    expect(screen.getByText(`${(READINGS.visibilityKm as number).toFixed(1)} km`)).toBeInTheDocument();
  });

  it('leads with the section the verdict turned on', async () => {
    await waitFor(() => expect(sections().length).toBeGreaterThan(0));
    expect(sections()[0].title).toBe('The sea');
  });

  /*
   * `mode=full` returns no `marine`, `tides` or `marineHourly` at all, so a surf
   * day's sea section would have been empty even once the field names were
   * right — a second, independent reason for the same symptom.
   */
  it('asks for marine data at a coastal place', () => {
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('mode=marine'));
  });

  it('never invents a reading', async () => {
    await openEverything();
    const values = [...document.querySelectorAll('.call-drawer-row-value')].map((e) => e.textContent);
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) {
      expect(v).not.toMatch(/undefined|NaN|null/);
    }
  });
});
