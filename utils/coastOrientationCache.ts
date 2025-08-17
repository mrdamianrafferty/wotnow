// /utils/coastOrientationCache.ts
const KEY = 'wotnow.coast.orientation.v1';

type CacheItem = {
  lat: number; lon: number;
  orientation: number; // 0–359
  updatedAt: number;   // epoch ms
};

export function getCachedOrientation(lat: number, lon: number): number | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const items: CacheItem[] = JSON.parse(raw);
    const rLat = +lat.toFixed(5), rLon = +lon.toFixed(5);
    const match = items.find(i => i.lat === rLat && i.lon === rLon);
    return match?.orientation;
  } catch { /* ignore */ }
}

export function setCachedOrientation(lat: number, lon: number, orientation: number) {
  try {
    const raw = localStorage.getItem(KEY);
    const items: CacheItem[] = raw ? JSON.parse(raw) : [];
    const rLat = +lat.toFixed(5), rLon = +lon.toFixed(5);
    const idx = items.findIndex(i => i.lat === rLat && i.lon === rLon);
    const entry: CacheItem = { lat: rLat, lon: rLon, orientation, updatedAt: Date.now() };
    if (idx >= 0) items[idx] = entry; else items.push(entry);
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

export function clearOrientationCache() {
  localStorage.removeItem(KEY);
}