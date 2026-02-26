/**
 * RevenueCat Auth Sync
 *
 * Listens to Supabase auth state changes and syncs with RevenueCat:
 * - On sign-in: identifies the user with their Supabase UUID
 * - On sign-out: resets RevenueCat to anonymous
 *
 * Only loaded on iOS via dynamic import.
 *
 * @module components/grow/RevenueCatAuthSync
 */

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { identifyRevenueCatUser, logOutRevenueCat } from '@/lib/grow/revenueCat';

export default function RevenueCatAuthSync() {
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.id) {
          await identifyRevenueCatUser(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          await logOutRevenueCat();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
