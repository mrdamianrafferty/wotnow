import { SEA_POINTS, MAX_POINT_KM } from '../seaPoints';
import { SEO_LOCATIONS } from '../../../data/seoLocations';

const km = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
};

describe('the chosen water points', () => {
  it('belong to places that exist', () => {
    for (const slug of Object.keys(SEA_POINTS)) expect([slug, SEO_LOCATIONS.some((l) => l.slug === slug)]).toEqual([slug, true]);
  });

  it('stay near the place they stand for, so a city never borrows a distant coast', () => {
    for (const [slug, p] of Object.entries(SEA_POINTS)) {
      const loc = SEO_LOCATIONS.find((l) => l.slug === slug)!;
      const d = km(loc.lat, loc.lon, p.lat, p.lon);
      expect([slug, d <= MAX_POINT_KM]).toEqual([slug, true]);
    }
  });

  it('say why, so the choice can be argued with', () => {
    for (const p of Object.values(SEA_POINTS)) expect(p.why.length).toBeGreaterThan(10);
  });

  it('are valid coordinates', () => {
    for (const p of Object.values(SEA_POINTS)) {
      expect(Math.abs(p.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(p.lon)).toBeLessThanOrEqual(180);
    }
  });
});
