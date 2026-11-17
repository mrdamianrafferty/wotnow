/**
 * Dismissing a Needs attention item on /admin/apps for 14 days, remembered in
 * this browser only (localStorage). An item is known by its rule, the apps it
 * is about and, for automated traffic, the country, so the same problem
 * stays dismissed while its figures move, and a new problem for the same app
 * still shows.
 *
 * Storage can be missing or throw (private windows, blocked site data), so
 * every read and write is guarded and the page works without it: nothing is
 * dismissed.
 */

import { useCallback, useEffect, useState } from 'react';
import type { AttentionItem } from './attention';

export const DISMISS_DAYS = 14;
export const DISMISS_MS = DISMISS_DAYS * 86_400_000;
export const DISMISS_STORAGE_KEY = 'admin-apps:dismissed-attention:v1';

/** key → when the dismissal runs out (ms since epoch). */
export type Dismissals = Record<string, number>;

export function attentionKey(item: Pick<AttentionItem, 'rule' | 'apps' | 'country'>): string {
  return [item.rule, [...item.apps].sort().join(','), item.country?.code ?? ''].join('|');
}

/** Only well-formed entries that have not run out. */
export function liveDismissals(raw: unknown, now: number): Dismissals {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Dismissals = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > now) out[k] = v;
  }
  return out;
}

export function splitDismissed(items: AttentionItem[], dismissals: Dismissals, now: number): { active: AttentionItem[]; dismissed: { item: AttentionItem; until: number }[] } {
  const active: AttentionItem[] = [];
  const dismissed: { item: AttentionItem; until: number }[] = [];
  for (const item of items) {
    const until = dismissals[attentionKey(item)];
    if (until && until > now) dismissed.push({ item, until });
    else active.push(item);
  }
  return { active, dismissed };
}

function read(now: number): Dismissals {
  try {
    const text = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    return text ? liveDismissals(JSON.parse(text), now) : {};
  } catch {
    return {};
  }
}

function write(d: Dismissals): void {
  try {
    if (Object.keys(d).length) window.localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(d));
    else window.localStorage.removeItem(DISMISS_STORAGE_KEY);
  } catch {
    // Storage blocked: the dismissal lasts until the page is reloaded
  }
}

/** Dismissals in this browser. Empty on the server and until the first effect runs, so the first render matches. */
export function useDismissals() {
  const [dismissals, setDismissals] = useState<Dismissals>({});

  useEffect(() => {
    const now = Date.now();
    const d = read(now);
    write(d); // drops the ones that ran out
    setDismissals(d);
  }, []);

  const dismiss = useCallback((item: AttentionItem) => {
    setDismissals((prev) => {
      const now = Date.now();
      const next = { ...liveDismissals(prev, now), [attentionKey(item)]: now + DISMISS_MS };
      write(next);
      return next;
    });
  }, []);

  const restore = useCallback((item: AttentionItem) => {
    setDismissals((prev) => {
      const next = { ...prev };
      delete next[attentionKey(item)];
      write(next);
      return next;
    });
  }, []);

  return { dismissals, dismiss, restore };
}
