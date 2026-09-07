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
 *   WITH NOTHING OUTDOORS CHOSEN. The sender requires the called activity to
 *   be weather-sensitive, because a notification claims the weather made today
 *   worth telling you about and an activity the weather has no opinion on
 *   cannot make that claim. Thirty-seven of the library's activities are
 *   indoor, so a setup of yoga, reading and the cinema is an ordinary thing to
 *   arrive at — and it receives nothing, in any weather, for ever.
 *
 * ─── Why it is not `InstallPrompt` ───────────────────────────────────────
 *
 * `components/InstallPrompt.tsx` already contained an iOS walkthrough and was
 * mounted nowhere, so reusing it looked like the obvious move. It was not: it
 * was a Findr artifact. It hardcoded "Install Findr App", rendered as a fixed
 * bottom banner meant for `_app.tsx` rather than an inline answer at the
 * point of the question, and was written in DaisyUI classes while this surface
 * is the hand-rolled `gd-`/`call-setup-` system. `components/AppCTA.tsx` was
 * worse — its store links pointed at an App Store SEARCH for Findr.
 *
 * Both are deleted now. They were unreferenced once this component existed,
 * and a dead component that names another product is not inert: it is the
 * thing the next person reaches for. Past tense above because the files are
 * gone, not because the reasoning is — it is why this one is hand-written.
 *
 * What was reusable is `useInstallPrompt`, which is app-agnostic and now
 * carries the Capacitor guard. This is the Go Daisy face for it.
 *
 * ─── Restraint ───────────────────────────────────────────────────────────
 *
 * Only ever ONE line, and only when something is actually missing.
 *
 * THE ORDER IS BY WHAT THE LINE WOULD PROMISE. Signing in outranks
 * installing: an install with no account still delivers nothing, so there is
 * no point explaining Add to Home Screen to someone who has the other gate
 * closed.
 *
 * The outdoor gate outranks both, and for a stronger reason than priority.
 * Each of the other two lines ends by promising the call arrives at the hour
 * you picked. For somebody with nothing outdoors chosen that sentence is
 * false — signing in does not make it true, and nor does installing — so
 * showing either of them would be telling them something untrue about their
 * own setup. It is checked first, and before the auth and platform guards,
 * because unlike the other two it depends on neither: it is equally true
 * signed out, and equally true inside the native app, which is the one place
 * this component is otherwise silent.
 *
 * @module components/call/CallDeliveryNotice
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useAuth } from '@/context/AuthContext';
import { isOutdoor } from '@/utils/activityHelpers';

interface CallDeliveryNoticeProps {
  /**
   * The activity ids currently chosen, live rather than re-read.
   *
   * Passed in because both call sites already hold this in state and can
   * change it on the page the notice is rendered on — `/start` while the
   * chooser is open, `/account` where an interest can be removed. Reading the
   * cookie here instead would show an answer that was true when the component
   * mounted.
   */
  activities: readonly string[];
}

export function CallDeliveryNotice({ activities }: CallDeliveryNoticeProps) {
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

  /*
   * Nothing outdoors chosen.
   *
   * `isOutdoor` is the same `weatherSensitive` flag the sender gates on, read
   * through the helper that already exists, so the two cannot drift into
   * disagreeing about what indoor means. It answers true for an id it does not
   * recognise, which is the right way round: an unknown activity leaves this
   * silent rather than telling somebody their setup is broken when it is the
   * library that is out of date.
   *
   * The length check is not redundant. An empty list is a different state —
   * somebody who has chosen nothing at all — and `[].some()` is false, so
   * without it this would answer a question nobody had asked yet.
   */
  if (activities.length > 0 && !activities.some(isOutdoor)) {
    return (
      <div className="gd-note">
        Pick an outdoor activity and we&rsquo;ll tell you when you are good to go.
      </div>
    );
  }

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
