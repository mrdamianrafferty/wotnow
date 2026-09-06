/**
 * When Go Daisy calls — a setting, reachable from a settings page.
 *
 * ─── Why this exists ─────────────────────────────────────────────────────
 *
 * Until now the hour could be changed in exactly one place: by walking the
 * whole of `/start` again. That flow is linked from the call menu as "Sports
 * and spots — change what Go Daisy tells you about" and from `/account` as
 * "Edit activities". Neither says anything about timing, so nobody looking for
 * "when do I get this" would ever find it.
 *
 * On the iOS app it was worse than hidden. `/account`'s entire Notifications
 * block is wrapped in `!isIOSNative`, on the reasoning that iOS notification
 * settings belong in iOS Settings — true of the system permission, and not
 * true of WHICH HOUR a message is sent, which is our decision and lives on our
 * server. So the app offered no notification control of any kind.
 *
 * This card is therefore deliberately OUTSIDE that gate. It carries no
 * permission switch — iOS grants that natively at launch and revokes it in
 * Settings — only the choice the app actually owns.
 *
 * ─── Why it saves to two places ──────────────────────────────────────────
 *
 * `saveCallHour` writes the cookie as well as the server, and its comment
 * explains why that is load-bearing rather than tidy: the cookie is mirrored
 * over the server on every session restore, so a server-only save is erased by
 * the next app launch.
 *
 * @module components/call/CallHourCard
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { HOUR_OPTIONS } from './SetupSteps';
import { loadCallHour, saveCallHour } from '@/lib/godaisy/call/sync';

type Status = 'loading' | 'ready' | 'saving' | 'saved' | 'local-only' | 'no-setup';

export function CallHourCard({ isSignedIn }: { isSignedIn: boolean }) {
  const [hour, setHour] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const h = await loadCallHour();
      if (cancelled) return;
      setHour(h);
      setStatus('ready');
    })();
    return () => { cancelled = true; };
  }, []);

  const pick = useCallback(async (h: number) => {
    setHour(h);
    setStatus('saving');
    setStatus(await saveCallHour(h));
  }, []);

  return (
    <section className="gd-acct-block">
      <h2 className="gd-acct-h2">When Go Daisy calls</h2>
      <p className="gd-acct-note">
        One message a day, at the hour you pick — and only when the day is
        actually worth it. A quiet morning means there was nothing worth saying.
      </p>

      <div className="gd-hour-row">
        {HOUR_OPTIONS.map((o) => (
          <button
            key={o.hour}
            type="button"
            className={hour === o.hour ? 'gd-btn' : 'gd-btn gd-btn--quiet'}
            aria-pressed={hour === o.hour}
            disabled={status === 'loading' || status === 'saving'}
            onClick={() => pick(o.hour)}
          >
            {o.label}
            <span className="gd-hour-when"> · {o.when}</span>
          </button>
        ))}
      </div>

      {/*
        * The 7pm option is the night before, so it says so.
        *
        * `EVENING_FROM` in the sender is 18:00, and 19 clears it — a call at
        * that hour is made for the NEXT day, which is the entire point of the
        * option being called "the night before". Saying it here means the
        * notification's own "Tomorrow at ..." title is a confirmation rather
        * than a surprise.
        */}
      {hour !== undefined && hour >= 18 && (
        <p className="gd-acct-note">
          At that hour the call is about tomorrow, not today.
        </p>
      )}

      {/*
        * Suppressed while there is no setup, because the two messages disagree:
        * "remembered on this device" is only true once there is a place to
        * remember it against, and `no-setup` is precisely the case where
        * nothing was written.
        */}
      {!isSignedIn && status !== 'no-setup' && (
        <div className="gd-note">
          <Link href="/login">Sign in</Link> to get the call on your phone. Your
          choice is remembered on this device either way.
        </div>
      )}

      {status === 'saved' && hour !== undefined && (
        <p className="gd-acct-note">
          That is set. Go Daisy will tell you at{' '}
          {HOUR_OPTIONS.find((o) => o.hour === hour)?.when ?? `${hour}:00`}.
        </p>
      )}

      {/*
        * An hour with no place to be about cannot be saved, and the honest
        * thing is to say which half is missing rather than to fail quietly.
        * This is reachable: a new device, signed in, with no cookie and no
        * setup ever mirrored.
        */}
      {status === 'no-setup' && (
        <div className="gd-note gd-note--bad">
          Go Daisy does not know where you are yet.{' '}
          <Link href="/start">Set your sports and spots</Link> and the hour will
          save with them.
        </div>
      )}

      {/*
        * The cookie IS written in this case, so the message must not imply the
        * choice was lost. `AuthContext` mirrors it on the next session restore,
        * which for the app is the next launch.
        */}
      {status === 'local-only' && (
        <div className="gd-note">
          Saved on this device. It will reach your other devices the next time
          Go Daisy opens.
        </div>
      )}
    </section>
  );
}
