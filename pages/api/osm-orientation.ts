// /api/osm-orientation.ts (Next.js API route or Vite serverless function)
import type { NextApiRequest, NextApiResponse } from 'next';
import * as turf from '@turf/turf';
import type { Feature, LineString, Polygon, Point, Position } from 'geojson';

function norm360(d: number) { return ((d % 360) + 360) % 360; }
function snap5(d: number) { return (Math.round(norm360(d) / 5) * 5) % 360; }

// ---- Minimal in‑memory cache to reduce Overpass hits ----
const ORIENT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const orientCache = new Map<string, { ts: number; payload: unknown }>();
const cacheKey = (lat: number, lon: number, radius: number) => `${lat.toFixed(5)}:${lon.toFixed(5)}:${radius}`;

// Types for Overpass API response elements used here
type OverpassGeometry = { lat: number; lon: number };
type OverpassElement = {
  type: 'way' | 'relation';
  tags?: Record<string, string>;
  geometry?: OverpassGeometry[];
};

type NearestPoint = Feature<Point> & { properties: { index: number; dist: number } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lat = parseFloat(String(req.query.lat));
  const lon = parseFloat(String(req.query.lon));
  const radius = parseInt(String(req.query.radius || 1500), 10); // metres

  // Cache lookup
  const key = cacheKey(lat, lon, radius);
  const cached = orientCache.get(key);
  if (cached && (Date.now() - cached.ts) < ORIENT_TTL_MS) {
    return res.status(200).json(cached.payload);
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({ error: 'lat/lon required' }); return;
  }

  // Overpass QL: coastline ways + water polygons around the point
  const overpassQL = `
    [out:json][timeout:25];
    (
      way["natural"="coastline"](around:${radius},${lat},${lon});
    )->.coast;
    (
      way["natural"="water"](around:${radius*2},${lat},${lon});
      relation["natural"="water"](around:${radius*2},${lat},${lon});
      relation["place"="sea"](around:${radius*2},${lat},${lon});
    )->.water;
    (.coast; .water;);
    out body geom;
  `.trim();

  const resp = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    // polite: Overpass prefers a POST with data=
    body: new URLSearchParams({ data: overpassQL }).toString(),
  });

  if (!resp.ok) {
    res.status(502).json({ error: 'Overpass upstream error' }); return;
  }
  const data = await resp.json() as { elements?: OverpassElement[] };

  // Separate features
  const coastLines: Feature<LineString>[] = [];
  const waterPolys: Feature<Polygon>[] = [];

  for (const el of data.elements || []) {
    if (el.type === 'way' && el.tags?.natural === 'coastline' && Array.isArray(el.geometry) && el.geometry.length >= 2) {
      coastLines.push(turf.lineString(el.geometry.map((g: OverpassGeometry) => [g.lon, g.lat])));
    } else if ((el.type === 'way' || el.type === 'relation') && Array.isArray(el.geometry) && el.geometry.length >= 3) {
      // treat as polygon if closed
      const coords = el.geometry.map((g: OverpassGeometry) => [g.lon, g.lat]);
      const last = coords[coords.length - 1];
      if (coords.length >= 4 && coords[0][0] === last[0] && coords[0][1] === last[1]) {
        waterPolys.push(turf.polygon([coords]));
      }
    }
  }

  if (coastLines.length === 0) {
    res.status(404).json({ error: 'No coastline found nearby' }); return;
  }

  const pt = turf.point([lon, lat]);

  // Find nearest coastline + nearest vertex index on that line
  let best: { line: Feature<LineString>; nearest: NearestPoint; dist: number } = {
    line: coastLines[0],
    nearest: turf.nearestPointOnLine(coastLines[0], pt) as NearestPoint,
    dist: Infinity,
  };
  for (const line of coastLines) {
    const n = turf.nearestPointOnLine(line, pt, { units: 'meters' }) as NearestPoint;
    const d = n.properties.dist as number;
    if (d < best.dist) best = { line, nearest: n, dist: d };
  }

  // Get an approximate local segment around the nearest point
  const idx = Math.max(1, Math.min(best.nearest.properties.index, (best.line.geometry.coordinates.length - 2)));
  const A: Position = best.line.geometry.coordinates[idx - 1];
  const B: Position = best.line.geometry.coordinates[idx + 0];

  // Alongshore bearing
  const segBearing = turf.bearing(turf.point(A), turf.point(B)); // -180..+180
  const leftNormal = norm360(segBearing - 90);
  const rightNormal = norm360(segBearing + 90);

  // Decide which normal points to sea: cast a ray and see if it falls in water
  const sampleDistM = 300; // tweak if needed
  const sampleLeft = turf.destination(pt, sampleDistM / 1000, leftNormal, { units: 'kilometers' });
  const sampleRight = turf.destination(pt, sampleDistM / 1000, rightNormal, { units: 'kilometers' });

  let leftInWater = false, rightInWater = false;
  for (const poly of waterPolys) {
    if (turf.booleanPointInPolygon(sampleLeft, poly)) leftInWater = true;
    if (turf.booleanPointInPolygon(sampleRight, poly)) rightInWater = true;
    if (leftInWater || rightInWater) break;
  }

  let seaFacing = rightNormal; // default
  if (leftInWater && !rightInWater) seaFacing = leftNormal;
  else if (rightInWater && !leftInWater) seaFacing = rightNormal;
  else {
    // Fallback: point that is farther from land (crude heuristic)
    const dL = turf.distance(pt, sampleLeft);
    const dR = turf.distance(pt, sampleRight);
    seaFacing = dL > dR ? leftNormal : rightNormal;
  }

  const payload = {
    orientation: snap5(seaFacing),        // 0–359, snapped to 5°
    source: 'osm' as const,
    debug: { segBearing: Math.round(norm360(segBearing)), leftNormal, rightNormal }
  };
  orientCache.set(key, { ts: Date.now(), payload });
  res.status(200).json(payload);
}