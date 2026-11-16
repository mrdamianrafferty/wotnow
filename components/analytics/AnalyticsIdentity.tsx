/**
 * Tells GA who is looking, without saying who they are.
 *
 * - user_id: a one-way hash of the Supabase id, salted with the property
 *   ('godaisy' / 'grow'), so a person can be followed across web and app and
 *   joined to the webhooks' server-side purchases.
 * - user properties: platform (web / ios / android), signed_in, pro_status
 *   (Go Daisy: free / plus; Grow: seed / sprout / …).
 * - sign_up / login: once per real sign-in, read from the user record
 *   (lib/analytics/sign-in-kind.ts), because Supabase re-emits SIGNED_IN on
 *   tab refocus and token refresh.
 *
 * Renders nothing. Mounted once in _app, inside AuthProvider.
 */

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { GaApp } from '@/lib/analytics/gaIds';
import { analyticsUserId, authMethodOf, setUserId, setUserProperties, track } from '@/lib/analytics/track';
import { signInKind } from '@/lib/analytics/sign-in-kind';

function platform(): 'web' | 'ios' | 'android' {
  try {
    const p = Capacitor.getPlatform();
    return p === 'ios' || p === 'android' ? p : 'web';
  } catch {
    return 'web';
  }
}

export default function AnalyticsIdentity({ app }: { app: GaApp }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [proStatus, setProStatus] = useState('unknown');

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    if (!user) {
      setUserId(null);
      setProStatus('free');
      return;
    }
    setProStatus('unknown');

    void analyticsUserId(app, user.id).then((hashed) => {
      if (cancelled || !hashed) return;
      setUserId(hashed);

      const key = `daisy:ga-sign-in:${hashed}`;
      let seen: string | null = null;
      try {
        seen = window.localStorage.getItem(key);
      } catch {
        /* storage blocked: the event may repeat, never block sign-in */
      }
      const kind = signInKind(user.created_at, user.last_sign_in_at, seen, Date.now());
      if (kind) track(kind, { method: authMethodOf(user.app_metadata?.provider) });
      if (user.last_sign_in_at) {
        try {
          window.localStorage.setItem(key, user.last_sign_in_at);
        } catch {
          /* ignore */
        }
      }
    });

    // The tier lives on profiles; one read per sign-in, never retried.
    const column = app === 'grow' ? 'grow_subscription_tier' : 'godaisy_subscription_tier';
    void Promise.resolve(
      supabase.from('profiles').select(column).eq('id', user.id).maybeSingle(),
    )
      .then(({ data }) => {
        if (cancelled) return;
        const tier = (data as Record<string, unknown> | null)?.[column];
        setProStatus(typeof tier === 'string' && tier ? tier : app === 'grow' ? 'seed' : 'free');
      })
      .catch(() => {
        /* stays 'unknown' */
      });

    return () => {
      cancelled = true;
    };
    // user fields are read when the id changes; a later token refresh is not a new sign-in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loading, app]);

  useEffect(() => {
    if (loading) return;
    setUserProperties({
      platform: platform(),
      signed_in: userId ? 'yes' : 'no',
      pro_status: proStatus,
    });
  }, [userId, loading, proStatus]);

  return null;
}
