import { useEffect, useState } from 'react';

/**
 * True inside the Capacitor iOS/Android shell, false in a browser.
 *
 * Both native apps load the live site (`server.url` in the capacitor configs),
 * so a "get the app" link rendered for the web also shows up inside the app,
 * where it is pointless. Anything that promotes a store listing hides itself
 * with this.
 *
 * Starts false so the server render, which is what search engines read, keeps
 * the links; the native shell drops them after mount. `@capacitor/core` is
 * imported lazily so it stays out of the web bundle's first load.
 */
export function useIsNativeApp(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!cancelled) setIsNative(Capacitor.isNativePlatform());
      } catch {
        // Web. Nothing to hide.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return isNative;
}
