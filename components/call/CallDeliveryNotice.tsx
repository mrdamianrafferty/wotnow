/**
 * What has to be true for the call to actually arrive.
 *
 * ─── Why this exists ─────────────────────────────────────────────────────
 *
 * Choosing an hour is the last step of onboarding, and until now it was
 * possible to finish it and never receive anything — twice over, silently:
 *
 *   SIGNED OUT. The setup lives in a cookie by design, so `/call` renders
 *   correctly for a stranger. But the sender is a cron, and a cron has no
 *   cookie: it reads `godaisy_notification_preferences`, and a row only
 *   appears for someone signed in. A signed-out visitor who picks an hour
 *   gets a working call SCREEN and no notification, ever, with nothing on
 *   the page saying so.
 *
 *   IN MOBILE SAFARI. iOS grants Web Push only to home-screen web apps. So
 *   for the traffic that arrives from search — overwhelmingly mobile Safari —
 *   Add to Home Screen is not a nicety, it is the whole capability. Without
 *   it the browser cannot receive a push at all, whatever permission says.
 *
 * ─── Why it is not `InstallPrompt` ───────────────────────────────────────
 *
 * `components/InstallPrompt.tsx` already contains an iOS walkthrough and is
 * mounted nowhere, so reusing it looks like the obvious move. It is not: it
 * is a Findr artifact. It hardcodes "Install Findr App", renders as a fixed
 * bottom banner meant for `_app.tsx` rather than an inline answer at the
 * point of the question, and is written in DaisyUI classes while this surface
 * is the hand-rolled `gd-`/`call-setup-` system. `components/AppCTA.tsx` is
 * worse — its store links point at an App Store SEARCH for Findr.
 *
 * What was reusable is `useInstallPrompt`, which is app-agnostic and now
 * carries the Capacitor guard. This is the Go Daisy face for it.
 *
 * ─── Restraint ───────────────────────────────────────────────────────────
 *
 * Only ever ONE line, and only when something is actually missing. Signing in
 * outranks installing: an install with no account still delivers nothing, so
 * there is no point explaining Add to Home Screen to someone who has the
 * other gate closed. Silent when neither applies, which is the case for
 * everyone already in the native app.
 *
 * @module components/call/CallDeliveryNotice
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useAuth } from '@/context/AuthContext';

export function CallDeliveryNotice() {
  const { user, loading } = useAuth();
  const { platform } = useInstallPrompt();

  /*
   * The native app needs none of this — it has a push token already, and
   * telling someone inside the app to install the app is the exact failure
   * the Capacitor guard in `useInstallPrompt` exists to prevent. Checked here
   * too, because this component decides its own visibility rather than
   * inheriting the hook's `showPrompt` (which is also gated on a 7-day
   * dismissal, and a dismissal should not hide the SIGN-IN gate).
   */
  const [isNative, setIsNative] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!cancelled) setIsNative(Capacitor.isNativePlatform());
      } catch {
        // Web. Nothing to suppress.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Don't flash "sign in to get this" at someone whose session is still loading.
  if (loading || isNative) return null;

  if (!user) {
    return (
      <div className="gd-note">
        Go Daisy can only send the call to an account.{' '}
        <Link href="/login">Sign in</Link> and it starts arriving at the hour
        you picked — your choice is saved on this device either way.
      </div>
    );
  }

  /*
   * Signed in, in mobile Safari, not yet on the home screen.
   *
   * `platform.isStandalone` is the honest test here: it is exactly the state
   * iOS requires before it will deliver a Web Push, so it is the thing the
   * sentence is about. Android Chrome can receive push in the browser, so it
   * gets no nudge — an install there is a preference, not a requirement, and
   * this component is for things that are actually missing.
   */
  if (platform.isIOS && platform.isSafari && !platform.isStandalone) {
    return (
      <div className="gd-note">
        On iPhone, notifications need Go Daisy on your home screen: tap{' '}
        <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Open
        it from there and the call arrives at the hour you picked.
      </div>
    );
  }

  return null;
}
