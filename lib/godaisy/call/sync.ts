/**
 * The setup, pushed to the server for anyone signed in.
 *
 * `setup.ts` explains why the cookie is the system of record, and that decision
 * stands — it is what makes `/call` correct in the first byte of HTML and what
 * makes onboarding work for a stranger with no account. But it also means the
 * setup exists ONLY in a browser, and the daily call is sent by a cron, which
 * has no browser. That gap is why Go Daisy had collected iOS device tokens for
 * six months and never sent a single notification.
 *
 * So this is a mirror, not a move. Signed-out people keep working exactly as
 * before and simply get no call, which is the honest outcome: a push
 * notification needs a device token, and a device token belongs to an account.
 *
 * A SEPARATE MODULE FROM `setup.ts` on purpose. `setup.ts` is imported by
 * `getServerSideProps` for `setupFromCookieHeader`; importing the browser
 * Supabase client from it would drag an auth client into the server bundle for
 * the sake of a function the server never calls.
 *
 * @module lib/godaisy/call/sync
 */

import { supabase } from '@/lib/supabase/client';
import type { CallSetup } from './setup';

/**
 * Mirror the setup into Supabase. Never throws.
 *
 * Onboarding's last act is `router.replace('/call')`, and a failure here must
 * not stand between somebody and the screen they just finished setting up. A
 * lost sync costs one missed call and is repaired the next time they pass
 * through `/start` or change a setting — so it is logged and swallowed, not
 * surfaced. The cookie, which is what `/call` actually reads, has already been
 * written by then either way.
 *
 * @returns true when the server accepted the setup.
 */
export async function syncSetupToServer(setup: CallSetup): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    /*
     * The zone the person is actually in, read from their own browser.
     *
     * The sender matches each row's chosen hour against the local clock in this
     * timezone. Without it the column keeps its default of Europe/Dublin, and
     * someone in Vancouver who asked for 07:00 would be called at 23:00 — the
     * kind of bug that reads as the app being broken rather than mis-configured.
     */
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;

    const res = await fetch('/api/godaisy/call-setup', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        sports: setup.sports,
        place: setup.place,
        ...(setup.coastal ? { coastal: setup.coastal } : {}),
        ...(setup.hour !== undefined ? { hour: setup.hour } : {}),
        ...(timezone ? { timezone } : {}),
      }),
    });

    if (!res.ok) {
      console.warn('[CallSync] Server rejected the setup:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[CallSync] Could not mirror setup to the server:', err);
    return false;
  }
}
