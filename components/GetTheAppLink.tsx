/**
 * One quiet line on the call screen for people using Go Daisy in a browser:
 * the app is the better place for it (the daily message, the sheet that opens
 * on a lock screen), and until now nothing on this screen said it existed.
 *
 * `/app` sends a phone to its own store and shows a QR to anyone on a laptop.
 * Nothing renders inside the native app, where the person has it already.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { useIsNativeApp } from '@/hooks/useIsNativeApp';
import { trackEvent } from '@/lib/analytics/events';
import { APP_LINK_PATH } from '@/lib/daisyFamily';

export default function GetTheAppLink({ placement }: { placement: string }) {
  const isNative = useIsNativeApp();
  // By user agent as well, which is known on the first render (see GetTheApp)
  const inApp = isNative || (typeof navigator !== 'undefined' && /godaisy-app|Capacitor/i.test(navigator.userAgent));

  useEffect(() => {
    if (!inApp) trackEvent('cross_promo_view', { from_app: 'go_daisy', placement });
  }, [inApp, placement]);

  if (inApp) return null;
  return (
    <p className="call-appline">
      <Link
        href={APP_LINK_PATH}
        onClick={() => trackEvent('cross_promo_click', { from_app: 'go_daisy', to_app: 'go_daisy_app', placement })}
      >
        Get the Go Daisy app
      </Link>
    </p>
  );
}
