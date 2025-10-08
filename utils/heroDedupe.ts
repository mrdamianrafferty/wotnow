import type { ActivityType } from '../data/activities/types';

const STORAGE_KEY = 'wotnow.heroHistory.v1';

type HeroSeen = { id: string; ts: number };

const now = () => Date.now();

function readHistory(): HeroSeen[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HeroSeen[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(history: HeroSeen[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

export function recordShownHeroes(ids: string[], opts?: { keepDays?: number; cap?: number }) {
  const keepMs = (opts?.keepDays ?? 7) * 24 * 60 * 60 * 1000;
  const cap = opts?.cap ?? 200;

  const history = readHistory()
    .filter(h => now() - h.ts <= keepMs);

  const appended = [
    ...history,
    ...ids.map(id => ({ id, ts: now() } as HeroSeen)),
  ];

  // Cap and save
  writeHistory(appended.slice(-cap));
}

export function dedupeHeroes(
  candidates: ActivityType[],
  limit: number,
  opts?: {
    keepDays?: number;             // don’t repeat within this window
    maxOccurrencesInWindow?: number; // allow up to N repeats per id in window
  }
): ActivityType[] {
  const keepMs = (opts?.keepDays ?? 7) * 24 * 60 * 60 * 1000;
  const maxPerId = opts?.maxOccurrencesInWindow ?? 0;

  const recent = readHistory().filter(h => now() - h.ts <= keepMs);

  const countInWindow = new Map<string, number>();
  for (const h of recent) countInWindow.set(h.id, (countInWindow.get(h.id) ?? 0) + 1);

  const out: ActivityType[] = [];
  const used = new Set<string>();

  // First pass: strictly avoid ids that hit the cap
  for (const a of candidates) {
    if (out.length >= limit) break;
    const c = countInWindow.get(a.id) ?? 0;
    if (c > maxPerId) continue;
    if (used.has(a.id)) continue;
    out.push(a);
    used.add(a.id);
  }

  // If we didn’t fill, allow least-recent repeats
  if (out.length < limit) {
    // Sort remaining by oldest last-seen first
    const lastSeen = new Map<string, number>();
    for (const h of recent) {
      const prev = lastSeen.get(h.id) ?? 0;
      lastSeen.set(h.id, Math.max(prev, h.ts));
    }

    const remaining = candidates.filter(a => !used.has(a.id));
    remaining.sort((a, b) => (lastSeen.get(a.id) ?? 0) - (lastSeen.get(b.id) ?? 0));

    for (const a of remaining) {
      if (out.length >= limit) break;
      if (used.has(a.id)) continue;
      out.push(a);
      used.add(a.id);
    }
  }

  return out;
}