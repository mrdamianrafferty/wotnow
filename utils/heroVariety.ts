// /utils/heroVariety.ts
// Utilities to keep recent hero choices varied across days/sessions

export type Level = 'perfect' | 'good' | 'fair' | 'indoor' | 'indoorAlternative';

export interface SuggestionLike {
  activityId: string;
  score: number;
  evaluation: Level;
}

// Rolling list of recent hero activityIds (most recent first)
export interface VarietyState {
  recent: string[];
  // Daily reset stamp: YYYY-MM-DD
  date: string;
}

export const VARIETY_KEY = 'wotnow.heroVariety.v1';
export const MAX_RECENT = 5;
export const SCORE_TOLERANCE = 3; // allow small substitutions within N points to promote variety

export function todayISO(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function loadVarietyState(): VarietyState {
  try {
    if (!canUseStorage()) return { recent: [], date: todayISO() };
    const raw = window.localStorage.getItem(VARIETY_KEY);
    if (!raw) return { recent: [], date: todayISO() };

    const parsed = JSON.parse(raw) as VarietyState | null;
    if (!parsed || !Array.isArray(parsed.recent)) {
      return { recent: [], date: todayISO() };
    }

    // Reset daily
    const now = todayISO();
    if (parsed.date !== now) {
      return { recent: [], date: now };
    }
    return parsed;
  } catch {
    return { recent: [], date: todayISO() };
  }
}

export function saveVarietyState(state: VarietyState): void {
  try {
    if (!canUseStorage()) return;
    window.localStorage.setItem(VARIETY_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function recordHeroSelection(activityId: string): void {
  const state = loadVarietyState();
  const recent = [activityId, ...state.recent.filter((id) => id !== activityId)].slice(0, MAX_RECENT);
  saveVarietyState({ date: todayISO(), recent });
}

export function isRecentlyUsed(activityId: string): boolean {
  const state = loadVarietyState();
  return state.recent.includes(activityId);
}

export function uniqueByActivityId<T extends { activityId: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const s of list) {
    if (!seen.has(s.activityId)) {
      seen.add(s.activityId);
      out.push(s);
    }
  }
  return out;
}

/**
 * Return the top candidate, but if it was used recently and a close-runner-up
 * within SCORE_TOLERANCE exists that wasn't used recently, choose that instead.
 * Does not write to storage (selection side-effect is done by caller).
 */
export function selectWithVariety<T extends SuggestionLike>(candidates: T[]): T | null {
  if (!candidates || candidates.length === 0) return null;

  // Pre-sorted by score desc recommended; sort here defensively.
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const recent = loadVarietyState().recent;

  if (!recent.includes(top.activityId)) return top;

  // Find an alternative within tolerance that isn't recently used
  const alt = sorted.find(
    (c) => !recent.includes(c.activityId) && top.score - c.score <= SCORE_TOLERANCE
  );
  return alt ?? top;
}
