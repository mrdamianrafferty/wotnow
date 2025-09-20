"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUserPreferences } from '../context/UserPreferencesContext';

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
  const inferredHome = React.useMemo(() => preferences.locations.find(l => l.type === 'home'), [preferences.locations]);
  const inferredCoast = React.useMemo(() => preferences.locations.find(l => l.type === 'coastal'), [preferences.locations]);

  const effectiveHome = homeLocation ?? inferredHome;
  const effectiveCoast = coastalLocation ?? inferredCoast;

  // Defer dynamic labels until after mount to avoid hydration mismatches
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const resolvedHomeLabel = mounted && effectiveHome?.name
    ? `🏡 ${effectiveHome.name.split(',')[0]} ✓`
    : 'Set home location';
  const resolvedCoastLabel = mounted && effectiveCoast?.name
    ? `🏖️ ${effectiveCoast.name.split(',')[0]} ✓`
    : 'Set beach location';

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
    <header className="w-full" data-theme="light">
      <div className="navbar bg-base-100 shadow-sm">
        {/* Left: Hamburger + Logo */}
        <div className="navbar-start">
          {/* Hamburger with submenu (mobile) */}
          <div className="dropdown">
            <label
              tabIndex={0}
              className="btn btn-ghost swap swap-rotate text-gray-800"
              aria-label="Open menu"
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
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-white rounded-box w-52"
            >
              {/* Use root path for Home */}
              <li><Link href="/">Home</Link></li>
              <li><Link href="/weather">My Weather</Link></li>
              <li><Link href="/activities">Activity dashboard</Link></li>
              <li><Link href="/interests">Set activities</Link></li>
              
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
              style={{ width: 'auto', height: 'auto' }}
            />
          </Link>
        </div>

        {/* Right: Location buttons + Home/Beach switch */}
        <div className="navbar-end gap-2 items-center">
          {/* DaisyUI swap-text toggle (render only when controlled) */}
          {typeof activeLocationType !== 'undefined' && typeof onToggleLocationType === 'function' && (
            <button
              type="button"
              className={`swap swap-text btn btn-ghost btn-sm md:btn-md ${activeLocationType === 'coastal' ? 'swap-active' : ''}`}
              onClick={handleSwapClick}
              aria-label={activeLocationType === 'coastal' ? 'Showing beach — switch to home' : 'Showing home — switch to beach'}
              title={activeLocationType === 'coastal' ? 'Beach' : 'Home'}
            >
              <div className="swap-on">Beach</div>
              <div className="swap-off">Home</div>
            </button>
          )}

          <button
            type="button"
            className="btn btn-success btn-sm md:btn-md"
            onClick={() => onOpenHomeDialog?.()}
            aria-label={resolvedHomeLabel}
            title={resolvedHomeLabel}
          >
            <span suppressHydrationWarning>{resolvedHomeLabel}</span>
          </button>
          <button
            type="button"
            className="btn btn-info btn-sm md:btn-md"
            onClick={() => onOpenCoastDialog?.()}
            aria-label={resolvedCoastLabel}
            title={resolvedCoastLabel}
          >
            <span suppressHydrationWarning>{resolvedCoastLabel}</span>
          </button>
        </div>
      </div>

    </header>
  );
};

export default AppHeader;