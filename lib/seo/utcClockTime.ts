/**
 * "HH:MM" of an instant, in UTC, identical on the server and in every browser.
 *
 * The spot pages (`/[activity]/[location]`) are statically generated, so what
 * the server renders is what the browser must render on hydration. They used
 * `toLocaleTimeString('en-GB', { hour, minute })` with no `timeZone`, which
 * formats in the *runtime's* zone: UTC on Vercel, the visitor's zone in the
 * browser. Every visitor outside UTC got a text mismatch, React threw a
 * hydration error (three events per page view), and the page captioned the
 * wrong time "UTC". Pinning the zone to UTC fixes both.
 *
 * Returns '' for an unparseable value rather than "Invalid Date".
 */
export function utcClockTime(iso: string | number | Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(11, 16);
}
