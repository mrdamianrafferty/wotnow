/**
 * Asking for a rating from inside the Go Daisy app, by the system's own sheet.
 *
 * Both native apps load the live site (`server.url`), so this code ships with
 * the website; the native half is the `@capacitor-community/in-app-review`
 * plugin, which arrives with the next App Store / Play build. Until a build
 * that has it is installed, `requestReview` finds no plugin and quietly does
 * nothing: no error, no fallback prompt of our own (see lib/review/policy.ts
 * for why there is none), and no state spent, so the first ask still happens
 * once the plugin is there.
 *
 * Counts are kept per install in @capacitor/preferences, not localStorage,
 * which the web view may evict.
 */

import { Capacitor } from '@capacitor/core';
import { trackEvent } from '@/lib/analytics/events';
import { parseState, recordAsk, recordSession, shouldAsk, type ReviewState } from './policy';

const KEY = 'gd.review.v1';
const PLUGIN = 'InAppReview';

async function prefs() {
  return (await import('@capacitor/preferences')).Preferences;
}

async function load(now: number): Promise<ReviewState> {
  const { value } = await (await prefs()).get({ key: KEY });
  return parseState(value, now);
}

async function save(state: ReviewState): Promise<void> {
  await (await prefs()).set({ key: KEY, value: JSON.stringify(state) });
}

const isNativeApp = () => typeof window !== 'undefined' && Capacitor.isNativePlatform();

let counted = false;

/** Call once per launch of the app. Safe to call on every page: it counts a launch once. */
export async function recordReviewSession(now = Date.now()): Promise<void> {
  if (!isNativeApp() || counted) return;
  counted = true;
  try {
    await save(recordSession(await load(now), now));
  } catch {
    // A counter that cannot be kept is a rating that is never asked for, which is fine
  }
}

/**
 * Call after something that went well for the person (they sent a call out,
 * saved a plan). Asks only if the policy allows it and this build has the
 * native plugin. Returns whether a request was made.
 */
export async function noteHappyMoment(moment: string, now = Date.now()): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const state = await load(now);
    if (!shouldAsk(state, now)) return false;
    if (!Capacitor.isPluginAvailable(PLUGIN)) return false;

    const { InAppReview } = await import('@capacitor-community/in-app-review');
    // Saved first: if the sheet throws half way, the next launch must not ask again straight away
    await save(recordAsk(state, now));
    trackEvent('review_requested', { moment, platform: Capacitor.getPlatform() });
    await InAppReview.requestReview();
    return true;
  } catch {
    return false;
  }
}

/** Test seam: forget that this launch was counted. */
export function resetReviewSessionForTests(): void {
  counted = false;
}
