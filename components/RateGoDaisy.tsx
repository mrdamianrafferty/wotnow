/**
 * "Rate Go Daisy": a plain link, shown only inside the native app, to the
 * store's own review page. Opening the store is allowed; asking with a prompt
 * of our own is not, so this is a link and not a question (lib/review/policy.ts).
 *
 * Nothing on the website shows it: a person in a browser has no app to rate.
 */

import { Browser } from '@capacitor/browser';
import { useIsNativeApp } from '@/hooks/useIsNativeApp';
import { getPlatform } from '@/lib/capacitor/platform';
import { reviewUrl } from '@/lib/daisyFamily';
import { trackEvent } from '@/lib/analytics/events';

export default function RateGoDaisy({ placement, className }: { placement: string; className?: string }) {
  const isNative = useIsNativeApp();
  if (!isNative) return null;

  const platform = getPlatform() === 'ios' ? 'ios' : 'android';
  const url = reviewUrl(platform);

  return (
    <a
      className={className}
      href={url}
      onClick={(e) => {
        // The shell's own browser, so a store page never replaces the app's page
        e.preventDefault();
        trackEvent('rate_link_click', { placement, platform });
        void Browser.open({ url }).catch(() => window.location.assign(url));
      }}
    >
      Rate Go Daisy
    </a>
  );
}
