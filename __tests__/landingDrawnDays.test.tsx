/**
 * The landing page's four drawn days.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DRAWN_DAYS, VIEW, DAY_MS, SURF_SUIT, SURF_WATER_C, type Mark } from '@/lib/godaisy/landing/drawnDays';
import { seaWear } from '@/lib/godaisy/conditions/seaWear';
import DrawnDays from '@/components/landing/DrawnDays';

function flat(ms: Mark[]): Mark[] {
  return ms.flatMap((m) => (m.kind === 'group' ? flat(m.marks) : [m]));
}
function coords(d: string): number[][] {
  return Array.from(d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)).map((m) => [Number(m[1]), Number(m[2])]);
}

describe('the drawn days', () => {
  it('runs surf, cycling, football, café, in that order', () => {
    expect(DRAWN_DAYS.map((d) => d.name)).toEqual(['Surf', 'Cycling', 'Football', 'Café']);
  });

  it('draws the same thing every time', () => {
    for (const d of DRAWN_DAYS) expect(d.marks()).toEqual(d.marks());
  });

  it.each(DRAWN_DAYS.map((d) => [d.name, d] as const))('keeps %s inside the frame', (_n, d) => {
    for (const m of flat(d.marks())) {
      if (m.kind === 'path') {
        // relative moves (rain streaks) are 4×12 px; the absolute start is what can stray
        for (const [x, y] of coords(m.d)) {
          expect(x).toBeGreaterThanOrEqual(-4);
          expect(x).toBeLessThanOrEqual(VIEW.w + 4);
          expect(y).toBeGreaterThanOrEqual(-4);
          expect(y).toBeLessThanOrEqual(VIEW.h + 4);
        }
      } else if (m.kind === 'text') {
        // Caveat runs at roughly 0.42 em a character
        const w = m.text.length * m.size * 0.42;
        const left = m.anchor === 'start' ? m.x : m.anchor === 'middle' ? m.x - w / 2 : m.x - w;
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left + w).toBeLessThanOrEqual(VIEW.w + 8);
        expect(m.y).toBeLessThanOrEqual(VIEW.h);
      }
    }
  });

  it('puts the wave at the shoulder line, which is where a 1.75 m person’s shoulders are', () => {
    const marks = flat(DRAWN_DAYS[0].marks());
    const dashed = marks.find((m) => m.kind === 'path' && m.dash);
    expect(dashed && dashed.kind === 'path' && Number(/M\d+ ([\d.]+)/.exec(dashed.d)![1])).toBeCloseTo(320 - 175 * 0.82, 0);
    expect(marks.some((m) => m.kind === 'text' && m.text === '1.4 m')).toBe(true);
  });

  it('dresses the surfer in what the wetsuit ladder says for that water', () => {
    expect(SURF_SUIT).toBe(seaWear(SURF_WATER_C, 'en').short);
    expect(SURF_SUIT).toBe('3/2 full suit');
    const marks = flat(DRAWN_DAYS[0].marks());
    expect(marks.some((m) => m.kind === 'text' && m.text === SURF_SUIT)).toBe(true);
    expect(marks.filter((m) => m.kind === 'path' && m.stroke === 'var(--call-sk-neoprene)')).toHaveLength(5);
  });

  it('keeps the café cup indoors, out of the rain', () => {
    const marks = flat(DRAWN_DAYS[3].marks());
    const rain = marks.filter((m) => m.kind === 'path' && / l-4 12$/.test(m.d));
    expect(rain.length).toBeGreaterThan(20);
    for (const r of rain) {
      const [[x, y]] = coords(r.kind === 'path' ? r.d : '');
      expect(x).toBeGreaterThan(40); expect(x + 0).toBeLessThan(440);
      expect(y).toBeGreaterThan(40); expect(y + 12).toBeLessThan(268);
    }
  });
});

describe('<DrawnDays />', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn(),
    }));
  });
  afterEach(() => jest.useRealTimers());

  it('opens on the surf day', () => {
    render(<DrawnDays />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('a surf day.');
  });

  it('moves on to the next day by itself', () => {
    render(<DrawnDays />);
    act(() => { jest.advanceTimersByTime(DAY_MS + 500); });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('a bike day.');
  });

  it('jumps to a day, and stays put when paused', () => {
    render(<DrawnDays />);
    fireEvent.click(screen.getByRole('button', { name: 'Café' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('a café day.');
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    act(() => { jest.advanceTimersByTime(DAY_MS * 3); });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('a café day.');
  });

  it('never moves on its own for someone who asked for less motion', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn(),
    }));
    render(<DrawnDays />);
    act(() => { jest.advanceTimersByTime(DAY_MS * 3); });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('a surf day.');
    expect(screen.queryByRole('button', { name: /Pause|Play/ })).toBeNull();
  });
});
