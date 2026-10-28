import { utcClockTime } from '../lib/seo/utcClockTime';

describe('utcClockTime', () => {
  it('formats in UTC whatever the runtime zone is', () => {
    const iso = '2026-10-22T14:05:09.000Z';
    expect(utcClockTime(iso)).toBe('14:05');
    // The old implementation depended on process.env.TZ; this must not.
    const original = process.env.TZ;
    try {
      for (const tz of ['UTC', 'Europe/Brussels', 'America/Los_Angeles', 'Asia/Kolkata']) {
        process.env.TZ = tz;
        expect(utcClockTime(iso)).toBe('14:05');
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it('zero-pads and handles midnight', () => {
    expect(utcClockTime('2026-01-01T00:07:00Z')).toBe('00:07');
    expect(utcClockTime(new Date('2026-01-01T23:59:59Z'))).toBe('23:59');
  });

  it('returns an empty string for garbage rather than "Invalid Date"', () => {
    expect(utcClockTime('not a date')).toBe('');
  });
});
