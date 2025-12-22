'use client';

import React, { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Navigation } from './Navigation';
import { SessionRefreshNotice } from './SessionRefreshNotice';
import {
  SkeletonGardenPage,
  SkeletonPlanPage,
  SkeletonWeatherPage,
  SkeletonGrowHomepage,
  SkeletonInfoPage
} from './GrowSkeletons';
import { auth, type AuthUser } from '../../lib/grow/auth';
import { buildGrowLoginUrl, GROW_ONBOARDING_PATH, GROW_ROOT_PATH } from '../../lib/grow/routes';
import { api } from '../../lib/grow/api';
import { Home, Calendar, Sprout, CloudSun, Info } from 'lucide-react';

// Code-split ALL page components with skeleton loaders for iOS performance
const Homepage = dynamic(() => import('./Homepage').then(mod => ({ default: mod.Homepage })), {
  loading: () => <SkeletonGrowHomepage />,
  ssr: true
});

const PlanPage = dynamic(() => import('./PlanPage').then(mod => ({ default: mod.PlanPage })), {
  loading: () => <SkeletonPlanPage />,
  ssr: true
});

const GardenPage = dynamic(() => import('./GardenPage').then(mod => ({ default: mod.GardenPage })), {
  loading: () => <SkeletonGardenPage />,
  ssr: true
});

const WeatherPage = dynamic(() => import('./WeatherPage').then(mod => ({ default: mod.WeatherPage })), {
  loading: () => <SkeletonWeatherPage />,
  ssr: true
});

const InfoPage = dynamic(() => import('./InfoPage').then(mod => ({ default: mod.InfoPage })), {
  loading: () => <SkeletonInfoPage />,
  ssr: true
});

export type GrowPageKey = 'home' | 'plan' | 'garden' | 'conditions' | 'info';

const STORAGE_KEY = 'grow:lastPage';

export function GrowExperience() {
  const [currentPage, setCurrentPage] = useState<GrowPageKey>('home');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [hasCheckedPlants, setHasCheckedPlants] = useState(false);
  const router = useRouter();
  const userId = currentUser?.id ?? null;
  const { isReady } = router;

  const redirectToLogin = useCallback(() => {
    const targetFromWindow = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : null;

    const candidate = targetFromWindow && targetFromWindow.startsWith(GROW_ROOT_PATH)
      ? targetFromWindow
      : router.asPath && router.asPath.startsWith(GROW_ROOT_PATH)
        ? router.asPath
        : GROW_ROOT_PATH;

    void router.replace(buildGrowLoginUrl(candidate));
  }, [router]);

  useEffect(() => {
    startTransition(() => {
      const storedPage = window.localStorage.getItem(STORAGE_KEY) as GrowPageKey | null;
      if (storedPage) {
        setCurrentPage(storedPage);
      }
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const user = await auth.getUser();
        if (!isMounted) {
          return;
        }
        setCurrentUser(user);
      } catch (_error) {
        if (isMounted) {
          setCurrentUser(null);
        }
      }
    };

    const handleRefreshSuccess = async () => {
      try {
        const session = await auth.getSession();
        if (!isMounted) {
          return;
        }
        setCurrentUser(session?.user ?? null);
      } catch (_error) {
        if (isMounted) {
          setCurrentUser(null);
        }
      }
    };

    const handleRefreshFailed = () => {
      if (!isMounted) {
        return;
      }
      setCurrentUser(null);
      redirectToLogin();
    };

    const handleSessionExpired = () => {
      if (!isMounted) {
        return;
      }
      setCurrentUser(null);
      redirectToLogin();
    };

    loadUser();

    window.addEventListener('auth:refresh-success', handleRefreshSuccess);
    window.addEventListener('auth:refresh-failed', handleRefreshFailed);
    window.addEventListener('auth:session-expired', handleSessionExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:refresh-success', handleRefreshSuccess);
      window.removeEventListener('auth:refresh-failed', handleRefreshFailed);
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [redirectToLogin]);

  useEffect(() => {
    setHasCheckedPlants(false);
  }, [userId]);

  useEffect(() => {
      if (hasCheckedPlants || !isReady) {
        return;
      }

      let isMounted = true;

      // Verify the user has at least one persisted plant; otherwise redirect to onboarding.
      const verifyPlantInventory = async () => {
        if (typeof window === 'undefined') {
          return;
        }

        const token = auth.getCurrentAccessToken();
        if (!token) {
          if (isMounted) {
            setHasCheckedPlants(true);
            redirectToLogin();
          }
          return;
        }

        try {
          const response = await api.getUserPlants();
          if (!isMounted) {
            return;
          }

          const plantCount = Array.isArray(response?.plants) ? response.plants.length : 0;
          const onboardingCompleteFromServer = Boolean(response?.onboardingCompleted);
          const onboardingComplete = onboardingCompleteFromServer || (typeof window !== 'undefined'
            && window.localStorage.getItem('grow:onboarding-complete') === 'true');

          if (onboardingCompleteFromServer && typeof window !== 'undefined') {
            window.localStorage.setItem('grow:onboarding-complete', 'true');
          }
          setHasCheckedPlants(true);

          if (plantCount === 0 && !onboardingComplete) {
            router.replace(GROW_ONBOARDING_PATH);
          }
        } catch (error) {
          if (!isMounted) {
            return;
          }

          setHasCheckedPlants(true);

          const message = error instanceof Error ? error.message : '';
          if (message === 'Not authenticated') {
            redirectToLogin();
            return;
          }

          console.error('Failed to verify garden plants for onboarding:', error);
        }
      };

      verifyPlantInventory();

      return () => {
        isMounted = false;
      };
    }, [hasCheckedPlants, isReady, redirectToLogin, router, userId]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, currentPage);
  }, [currentPage]);

  const handlePageChange = useCallback((page: GrowPageKey) => {
    setCurrentPage(page);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await auth.signOut();
    } finally {
      setCurrentUser(null);
      redirectToLogin();
    }
  }, [redirectToLogin]);

  const currentView = useMemo(() => {
    switch (currentPage) {
      case 'plan':
        return <PlanPage />;
      case 'garden':
        return <GardenPage />;
      case 'conditions':
        return <WeatherPage />;
      case 'info':
        return <InfoPage />;
      case 'home':
      default:
        return <Homepage />;
    }
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Safe area padding for iOS notch/dynamic island */}
      <div className="pt-[env(safe-area-inset-top)]">
        <Navigation
          currentPage={currentPage}
          onPageChange={handlePageChange}
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />
      </div>
      <SessionRefreshNotice />
      {/* Add bottom padding for mobile bottom nav */}
      <main id="main-content" className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        {currentView}
      </main>
      {/* Mobile bottom navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex justify-around items-center h-16">
          {(['home', 'plan', 'garden', 'conditions', 'info'] as const).map((page) => {
            const isActive = currentPage === page;
            const icons = {
              home: <Home size={24} />,
              plan: <Calendar size={24} />,
              garden: <Sprout size={24} />,
              conditions: <CloudSun size={24} />,
              info: <Info size={24} />,
            };
            const labels = {
              home: 'Home',
              plan: 'Plan',
              garden: 'Garden',
              conditions: 'Weather',
              info: 'Info',
            };
            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] min-h-[48px] transition-all duration-150 ${isActive ? 'scale-110' : 'scale-100'}`}
                aria-label={labels[page]}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={`transition-colors duration-150 ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {icons[page]}
                </span>
                <span className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {labels[page]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
