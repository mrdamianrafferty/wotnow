"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { supabase } from '../lib/supabase/client';
import { LanguageSelector } from './LanguageSelector';
import { useTranslationMap } from '../lib/translation/useTranslationMap';

export type LocationLite = { name: string; lat: number; lon: number; type?: 'home'|'coastal' };

interface AppHeaderProps {
  homeLocation?: LocationLite;
  coastalLocation?: LocationLite;
  onOpenHomeDialog?: () => void;
  onOpenCoastDialog?: () => void;
  // NEW: active location toggle control
  activeLocationType?: 'home' | 'coastal';
  onToggleLocationType?: (next: 'home' | 'coastal') => void;
}

const toFirstName = (input?: string | null) => {
  if (!input) return null;
  const first = input.trim().split(/\s+/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
};

/**
 * Go Daisy header using DaisyUI navbar + dropdown menu.
 * Visible links: two location buttons (Home, Coastal).
 * Dropdown (hamburger) contains: Weather, Interests, Activities.
 */
const AppHeader: React.FC<AppHeaderProps> = ({
  homeLocation,
  coastalLocation,
  onOpenHomeDialog,
  onOpenCoastDialog,
  activeLocationType,
  onToggleLocationType,
}) => {
  // Access user preferences to infer locations when not provided via props
  const { preferences } = useUserPreferences();
  const translationInputs = React.useMemo(
    () => [
      'Skip to main content',
      'Open menu',
      'Locations',
      'Set home location',
      'Set beach location',
      'Home',
      'Beach',
      'Switch to Home',
      'Switch to Beach',
      'Showing beach — switch to home',
      'Showing home — switch to beach',
      'My Weather',
      'Grow garden',
      'Activity dashboard',
      'Set activities',
      'My Account',
      'Log in / Register',
      'Go to settings',
      'Log in or register',
      'Log in',
    ] as const,
    [],
  );
  const { t } = useTranslationMap(translationInputs);

  const [authReady, setAuthReady] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState<string | null>(null);

  // Resolve display name from (in order): profile.name, preferences (if present), email local-part
  const resolveName = React.useCallback(async (uid: string | null) => {
    try {
      // 2) Try profile.name from DB
      if (uid) {
        const { data } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', uid)
          .maybeSingle();
        if (data?.name) {
          const n = toFirstName(data.name);
          if (n) { setDisplayName(n); return; }
        }
        if (data?.email) {
          const local = String(data.email).split('@')[0] || '';
          const n = toFirstName(local.replace(/[._-]+/g, ' '));
          if (n) { setDisplayName(n); return; }
        }
      }
      // 3) Fallback to auth user email
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || '';
      if (email) {
        const local = email.split('@')[0] || '';
        const n = toFirstName(local.replace(/[._-]+/g, ' '));
        if (n) { setDisplayName(n); return; }
      }
      setDisplayName(null);
    } catch {
      setDisplayName(null);
    }
  }, []);

  // Initial auth check + subscribe to auth state changes
  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error) {
          console.warn('[AppHeader] Failed to load session', error);
          setUserId(null);
          setDisplayName(null);
        } else {
          const uid = data?.user?.id ?? null;
          setUserId(uid);
          await resolveName(uid);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[AppHeader] getUser threw', err);
          setUserId(null);
          setDisplayName(null);
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }

      const { data: authSub } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const uid = session?.user?.id ?? null;
        setUserId(uid);
        await resolveName(uid);
      });
      unsub = () => authSub.subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [resolveName]);

  const inferredHome = React.useMemo(() => preferences.locations.find(l => l.type === 'home'), [preferences.locations]);
  const inferredCoast = React.useMemo(() => preferences.locations.find(l => l.type === 'coastal'), [preferences.locations]);

  const effectiveHome = homeLocation ?? inferredHome;
  const effectiveCoast = coastalLocation ?? inferredCoast;

  // Defer dynamic labels until after mount to avoid hydration mismatches
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const resolvedHomeLabel = React.useMemo(() => {
    if (mounted && effectiveHome?.name) {
      return `🏡 ${effectiveHome.name.split(',')[0]} ✓`;
    }
    return t('Set home location');
  }, [effectiveHome?.name, mounted, t]);

  const resolvedCoastLabel = React.useMemo(() => {
    if (mounted && effectiveCoast?.name) {
      return `🏖️ ${effectiveCoast.name.split(',')[0]} ✓`;
    }
    return t('Set beach location');
  }, [effectiveCoast?.name, mounted, t]);

  // Toggle click handler with fallbacks to open dialogs if missing
  const handleSwapClick = () => {
    const isHome = activeLocationType !== 'coastal';
    const next: 'home' | 'coastal' = isHome ? 'coastal' : 'home';
    if (next === 'coastal' && !effectiveCoast) {
      onOpenCoastDialog?.();
      return;
    }
    if (next === 'home' && !effectiveHome) {
      onOpenHomeDialog?.();
      return;
    }
    onToggleLocationType?.(next);
  };

  return (
    <header className="w-full bg-base-100" data-theme="light">
      {/* Safe area spacer - fills iOS notch/status bar area with background color */}
      <div className="safe-top bg-base-100" />
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 btn btn-primary btn-sm"
      >
        {t('Skip to main content')}
      </a>

      <div className="navbar bg-base-100 shadow-sm pt-1 md:pt-0">
        {/* Left: Hamburger + Logo */}
        <div className="navbar-start">
          {/* Hamburger with submenu (desktop only) */}
          <div className="dropdown hidden md:flex">
            <label
              tabIndex={0}
              className="btn btn-ghost swap swap-rotate text-gray-800"
              aria-label={t('Open menu')}
              role="button"
              aria-haspopup="menu"
            >
              {/* Hamburger icon */}
              <svg className="swap-off fill-current" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512"><path d="M64,384H448V341.33H64Zm0-106.67H448V234.67H64ZM64,128v42.67H448V128Z"/></svg>
              {/* Close icon */}
              <svg className="swap-on fill-current" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512"><polygon points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49"/></svg>
            </label>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-white rounded-box w-64"
            >
              {/* Mobile: Location buttons at top */}
              <li className="menu-title md:hidden">
                <span>{t('Locations')}</span>
              </li>
              <li className="md:hidden">
                <button
                  type="button"
                  onClick={() => {
                    onOpenHomeDialog?.();
                    // Close dropdown by removing focus
                    (document.activeElement as HTMLElement)?.blur();
                  }}
                  className="justify-start"
                >
                  <span suppressHydrationWarning>
                    {effectiveHome?.name ? `🏡 ${effectiveHome.name.split(',')[0]}` : `🏡 ${t('Set home location')}`}
                  </span>
                </button>
              </li>
              <li className="md:hidden">
                <button
                  type="button"
                  onClick={() => {
                    onOpenCoastDialog?.();
                    (document.activeElement as HTMLElement)?.blur();
                  }}
                  className="justify-start"
                >
                  <span suppressHydrationWarning>
                    {effectiveCoast?.name ? `🏖️ ${effectiveCoast.name.split(',')[0]}` : `🏖️ ${t('Set beach location')}`}
                  </span>
                </button>
              </li>
              {/* Toggle button for mobile */}
              {typeof activeLocationType !== 'undefined' && typeof onToggleLocationType === 'function' && (
                <li className="md:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      handleSwapClick();
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                    className="justify-start"
                  >
                    <span>
                      🔄 {activeLocationType === 'coastal' ? t('Switch to Home') : t('Switch to Beach')}
                    </span>
                  </button>
                </li>
              )}
              <li className="mt-1 border-t border-base-200 md:hidden" />

              <li className="md:hidden">
                <div className="px-2 py-1">
                  <LanguageSelector className="w-full" showLabel />
                </div>
              </li>
              
              {/* Use root path for Home */}
              <li><Link href="/">{t('Home')}</Link></li>
              <li><Link href="/weather">{t('My Weather')}</Link></li>
              <li><Link href="/grow">{t('Grow garden')}</Link></li>
              <li><Link href="/activities">{t('Activity dashboard')}</Link></li>
              <li><Link href="/interests">{t('Set activities')}</Link></li>
              <li className="mt-1 border-t border-base-200" />
              {authReady && userId ? (
                <li><Link href="/settings">🤾 {t('My Account')}</Link></li>
              ) : (
                <li><Link href="/login">🪵 {t('Log in / Register')}</Link></li>
              )}
            </ul>
          </div>

          {/* Logo */}
          <Link href="/" className="btn btn-ghost normal-case text-xl" aria-label="Go Daisy home">
            <Image
              src="/go-daisy-logo.png"
              alt="Go Daisy"
              width={180}
              height={60}
              priority
              className="h-8 w-auto md:h-[60px]"
            />
          </Link>
        </div>

        {/* Right: Location buttons + Home/Beach switch */}
        <div className="navbar-end gap-2 items-center">
          {/* Desktop: Show all controls (hidden on mobile) */}
          <div className="hidden md:flex gap-2 items-center">
            <LanguageSelector compact className="hidden md:flex" />

            {/* DaisyUI swap-text toggle (render only when controlled) */}
            {typeof activeLocationType !== 'undefined' && typeof onToggleLocationType === 'function' && (
              <button
                type="button"
                className={`swap swap-text btn btn-ghost btn-md ${activeLocationType === 'coastal' ? 'swap-active' : ''}`}
                onClick={handleSwapClick}
                aria-label={activeLocationType === 'coastal' ? t('Showing beach — switch to home') : t('Showing home — switch to beach')}
                title={activeLocationType === 'coastal' ? t('Beach') : t('Home')}
              >
                <div className="swap-on">{t('Beach')}</div>
                <div className="swap-off">{t('Home')}</div>
              </button>
            )}

            <button
              type="button"
              className="btn btn-success btn-md"
              onClick={() => onOpenHomeDialog?.()}
              aria-label={resolvedHomeLabel}
              title={resolvedHomeLabel}
            >
              <span suppressHydrationWarning>{resolvedHomeLabel}</span>
            </button>
            <button
              type="button"
              className="btn btn-info btn-md"
              onClick={() => onOpenCoastDialog?.()}
              aria-label={resolvedCoastLabel}
              title={resolvedCoastLabel}
            >
              <span suppressHydrationWarning>{resolvedCoastLabel}</span>
            </button>
            {/* Auth badge: shows Log in/Register or user's name, and links appropriately */}
            {authReady && (
              userId ? (
                <Link
                  href="/settings"
                  className="badge badge-outline badge-success gap-1 whitespace-nowrap"
                  title={t('Go to settings')}
                  aria-label={t('Go to settings')}
                >
                  <span aria-hidden="true">🤾</span>
                  <span>{displayName ?? t('My Account')}</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="badge badge-outline badge-info gap-1 whitespace-nowrap"
                  title={t('Log in or register')}
                  aria-label={t('Log in or register')}
                >
                  <span aria-hidden="true">🪵</span>
                  <span>{t('Log in / Register')}</span>
                </Link>
              )
            )}
          </div>

          {/* Mobile: Language selector stays visible next to auth */}
          <div className="flex items-center gap-1 md:hidden">
            <LanguageSelector compact className="md:hidden" />
            {authReady && (
              userId ? (
                <Link
                  href="/settings"
                  className="btn btn-ghost btn-sm btn-circle"
                  title={t('My Account')}
                  aria-label={t('My Account')}
                >
                  <span className="text-xl">🤾</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="btn btn-ghost btn-sm btn-circle"
                  title={t('Log in')}
                  aria-label={t('Log in')}
                >
                  <span className="text-xl">🪵</span>
                </Link>
              )
            )}
          </div>
        </div>
      </div>

    </header>
  );
};

export default AppHeader;/* Trigger deployment */
