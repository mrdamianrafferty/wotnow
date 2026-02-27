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
import { LogIn } from 'lucide-react';
import { GrowBottomNav } from './GrowBottomNav';

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
  const [isGuestMode, setIsGuestMode] = useState(false);
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
        if (user) {
          setCurrentUser(user);
          setIsGuestMode(false);
        } else {
          // No user - enable guest mode instead of redirecting
          setCurrentUser(null);
          setIsGuestMode(true);
        }
      } catch (_error) {
        if (isMounted) {
          setCurrentUser(null);
          setIsGuestMode(true);
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
        setIsGuestMode(!session?.user);
      } catch (_error) {
        if (isMounted) {
          setCurrentUser(null);
          setIsGuestMode(true);
        }
      }
    };

    const handleRefreshFailed = () => {
      if (!isMounted) {
        return;
      }
      // Don't redirect - just switch to guest mode
      setCurrentUser(null);
      setIsGuestMode(true);
    };

    const handleSessionExpired = () => {
      if (!isMounted) {
        return;
      }
      // Don't redirect - just switch to guest mode
      setCurrentUser(null);
      setIsGuestMode(true);
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
  }, []);

  useEffect(() => {
    setHasCheckedPlants(false);
  }, [userId]);

  useEffect(() => {
      if (hasCheckedPlants || !isReady) {
        return;
      }

      let isMounted = true;

      // Verify the user has at least one persisted plant; otherwise redirect to onboarding.
      // Skip this check for guest users - they can browse without plants.
      const verifyPlantInventory = async () => {
        if (typeof window === 'undefined') {
          return;
        }

        const token = auth.getCurrentAccessToken();
        if (!token) {
          // No token - user is in guest mode, skip plant check
          if (isMounted) {
            setHasCheckedPlants(true);
            setIsGuestMode(true);
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
            // Not authenticated - switch to guest mode instead of redirecting
            setIsGuestMode(true);
            return;
          }

          console.error('Failed to verify garden plants for onboarding:', error);
        }
      };

      verifyPlantInventory();

      return () => {
        isMounted = false;
      };
    }, [hasCheckedPlants, isReady, router, userId]);

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
      <div className="safe-area-top">
        <Navigation
          currentPage={currentPage}
          onPageChange={handlePageChange}
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />
      </div>
      <SessionRefreshNotice />
      {/* Guest mode banner */}
      {isGuestMode && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-green-800">
              <span className="font-medium">Browsing as guest.</span>{' '}
              <span className="hidden sm:inline">Sign in to save your garden and get personalized recommendations.</span>
            </p>
            <button
              onClick={() => redirectToLogin()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              <LogIn size={16} />
              Sign In
            </button>
          </div>
        </div>
      )}
      {/* Add bottom padding for mobile bottom nav */}
      <main id="main-content" className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
        {currentView}
      </main>
      {/* Mobile bottom navigation — uses shared GrowBottomNav for consistency */}
      <GrowBottomNav />
    </div>
  );
}
