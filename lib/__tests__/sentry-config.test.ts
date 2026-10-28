import { serverDsn, tracesSampleRate } from '../sentry-config';

describe('serverDsn', () => {
  it('prefers SENTRY_DSN, then the Go Daisy DSN', () => {
    expect(serverDsn({ SENTRY_DSN: 'a', NEXT_PUBLIC_SENTRY_DSN_GODAISY: 'b' })).toBe('a');
    expect(serverDsn({ NEXT_PUBLIC_SENTRY_DSN_GODAISY: 'b' })).toBe('b');
  });
  it("never uses Findr's NEXT_PUBLIC_SENTRY_DSN", () => {
    expect(serverDsn({ NEXT_PUBLIC_SENTRY_DSN: 'findr' })).toBeUndefined();
    expect(serverDsn({ SENTRY_DSN: ' ', NEXT_PUBLIC_SENTRY_DSN: 'findr' })).toBeUndefined();
  });
});

describe('tracesSampleRate', () => {
  it('is 0.1 in production and 1 elsewhere', () => {
    expect(tracesSampleRate(undefined, 'production')).toBe(0.1);
    expect(tracesSampleRate(undefined, 'development')).toBe(1);
  });
  it('honours a valid override, ignores a bad one', () => {
    expect(tracesSampleRate('0.25', 'production')).toBe(0.25);
    expect(tracesSampleRate('0', 'production')).toBe(0);
    expect(tracesSampleRate('5', 'production')).toBe(0.1);
    expect(tracesSampleRate('abc', 'development')).toBe(1);
  });
});
