// pages/_offline.tsx
// Offline fallback page - shown when the app is offline and no cached version is available

import Head from 'next/head';
import { WifiOff, RefreshCw, Home, Fish, Leaf } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [appContext, setAppContext] = useState<'godaisy' | 'findr' | 'growdaisy'>('godaisy');

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Determine app context from URL
    const path = window.location.pathname;
    if (path.startsWith('/findr') || window.location.hostname.includes('fishfindr')) {
      setAppContext('findr');
    } else if (path.startsWith('/grow') || window.location.hostname.includes('growdaisy')) {
      setAppContext('growdaisy');
    }

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  const getAppConfig = () => {
    switch (appContext) {
      case 'findr':
        return {
          name: 'Findr',
          icon: Fish,
          color: 'text-cyan-500',
          bgColor: 'bg-cyan-500/10',
          homeLink: '/findr',
          description: 'Your fishing predictions are waiting',
        };
      case 'growdaisy':
        return {
          name: 'Grow Daisy',
          icon: Leaf,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          homeLink: '/grow',
          description: 'Your garden tasks are ready when you are',
        };
      default:
        return {
          name: 'Go Daisy',
          icon: Home,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          homeLink: '/',
          description: 'Your outdoor adventures await',
        };
    }
  };

  const config = getAppConfig();
  const AppIcon = config.icon;

  // If we're back online, auto-redirect
  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return (
    <>
      <Head>
        <title>Offline - {config.name}</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-base-100">
        <div className="max-w-md w-full text-center space-y-8">
          {/* App Icon */}
          <div className={`mx-auto w-20 h-20 rounded-full ${config.bgColor} flex items-center justify-center`}>
            <AppIcon className={`w-10 h-10 ${config.color}`} />
          </div>

          {/* Status Icon */}
          <div className="relative">
            {isOnline ? (
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-12 h-12 text-success animate-spin" />
                <p className="text-success font-semibold">Back online! Reconnecting...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <WifiOff className="w-12 h-12 text-warning" />
                <h1 className="text-2xl font-bold text-base-content">You&apos;re Offline</h1>
              </div>
            )}
          </div>

          {!isOnline && (
            <>
              {/* Message */}
              <div className="space-y-2">
                <p className="text-base-content/70">
                  {config.description}
                </p>
                <p className="text-sm text-base-content/50">
                  Check your internet connection and try again.
                </p>
              </div>

              {/* What's Available Offline */}
              <div className="bg-base-200 rounded-xl p-4 text-left">
                <h2 className="font-semibold text-sm mb-3">What you can do offline:</h2>
                <ul className="space-y-2 text-sm text-base-content/70">
                  {appContext === 'findr' ? (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                        View cached fish predictions
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                        Browse your favourite species
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                        Log catches (syncs when online)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                        View moon phases and tides
                      </li>
                    </>
                  ) : appContext === 'growdaisy' ? (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                        View your garden and plants
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                        Check saved task lists
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                        Weather data may be outdated
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                        View cached activity suggestions
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                        Check saved locations
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                        Weather data may be outdated
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRetry}
                  className="btn btn-primary w-full gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>

                <Link href={config.homeLink} className="btn btn-ghost btn-sm">
                  Go to {config.name} Home
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-12 text-xs text-base-content/40">
          Tip: Enable offline mode in Settings for better offline experience
        </p>
      </div>
    </>
  );
}
