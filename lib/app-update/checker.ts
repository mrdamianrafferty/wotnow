/**
 * App Update Checker
 *
 * Checks for new app versions and prompts users to update.
 * Works on both native (App Store/Play Store) and web (PWA).
 *
 * Features:
 * - Automatic version checking
 * - Configurable check frequency
 * - Optional/required updates
 * - Direct links to app stores
 * - PWA refresh for web users
 *
 * Setup:
 * 1. Create API endpoint at /api/app-version that returns:
 *    { version: "1.1.0", required: false, releaseNotes: "..." }
 * 2. Import and call checkForUpdates() in _app.tsx useEffect
 *
 * Usage:
 *   import { checkForUpdates } from '@/lib/app-update/checker';
 *
 *   // Check on app start
 *   useEffect(() => {
 *     checkForUpdates();
 *   }, []);
 */

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Current app version (from package.json)
 */
const CURRENT_VERSION = '1.0.0'; // Should match package.json

/**
 * Update information from API
 */
export interface UpdateInfo {
  /** Latest version available */
  version: string;
  /** Whether update is required (blocks app usage) */
  required: boolean;
  /** Release notes or changelog */
  releaseNotes?: string;
  /** URL to download (if different from default store) */
  downloadUrl?: string;
}

/**
 * Update check result
 */
export interface UpdateCheckResult {
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Update information (if available) */
  updateInfo: UpdateInfo | null;
  /** Current app version */
  currentVersion: string;
}

/**
 * Compare version strings (semver-like)
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

/**
 * Check if update is available
 *
 * @returns Update check result with version info
 *
 * @example
 * const result = await checkForUpdates();
 * if (result.updateAvailable) {
 *   showUpdatePrompt(result.updateInfo);
 * }
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    // Fetch latest version from API
    const response = await fetch('/api/app-version', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check for updates: ${response.status}`);
    }

    const updateInfo: UpdateInfo = await response.json();

    // Compare versions
    const comparison = compareVersions(updateInfo.version, CURRENT_VERSION);
    const updateAvailable = comparison > 0;

    if (updateAvailable) {
      console.log(`[AppUpdate] Update available: ${CURRENT_VERSION} → ${updateInfo.version}`);
    } else {
      console.log(`[AppUpdate] App is up to date: ${CURRENT_VERSION}`);
    }

    return {
      updateAvailable,
      updateInfo: updateAvailable ? updateInfo : null,
      currentVersion: CURRENT_VERSION,
    };
  } catch (error) {
    console.error('[AppUpdate] Failed to check for updates:', error);
    return {
      updateAvailable: false,
      updateInfo: null,
      currentVersion: CURRENT_VERSION,
    };
  }
}

/**
 * Get app store URL for current platform
 */
export function getAppStoreUrl(): string {
  if (Capacitor.getPlatform() === 'ios') {
    return 'https://apps.apple.com/app/findr/idXXXXXXXXXX'; // Replace with real App Store ID
  } else if (Capacitor.getPlatform() === 'android') {
    return 'https://play.google.com/store/apps/details?id=eu.fishfindr.app';
  } else {
    // Web - reload to get latest PWA
    return window.location.href;
  }
}

/**
 * Open app store for update
 */
export async function openAppStore(): Promise<void> {
  const url = getAppStoreUrl();

  if (Capacitor.isNativePlatform()) {
    // Open in external browser (App Store/Play Store)
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
    } catch (error) {
      console.error('[AppUpdate] Failed to open app store:', error);
      // Fallback to window.open
      window.open(url, '_blank');
    }
  } else {
    // Web - reload to get latest PWA
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Clear cache and reload
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }
    window.location.reload();
  }
}

/**
 * Schedule automatic update checks
 *
 * @param intervalMs - Check interval in milliseconds (default: 6 hours)
 * @param onUpdateAvailable - Callback when update is found
 *
 * @example
 * scheduleUpdateChecks(6 * 60 * 60 * 1000, (updateInfo) => {
 *   showUpdatePrompt(updateInfo);
 * });
 */
export function scheduleUpdateChecks(
  intervalMs: number = 6 * 60 * 60 * 1000, // 6 hours
  onUpdateAvailable?: (updateInfo: UpdateInfo) => void
): () => void {
  // Check immediately
  checkForUpdates().then((result) => {
    if (result.updateAvailable && result.updateInfo && onUpdateAvailable) {
      onUpdateAvailable(result.updateInfo);
    }
  });

  // Schedule periodic checks
  const intervalId = setInterval(async () => {
    const result = await checkForUpdates();
    if (result.updateAvailable && result.updateInfo && onUpdateAvailable) {
      onUpdateAvailable(result.updateInfo);
    }
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Check if user has dismissed update prompt
 */
function hasUserDismissedUpdate(version: string): boolean {
  if (typeof window === 'undefined') return false;

  const dismissed = localStorage.getItem('dismissed_update_version');
  return dismissed === version;
}

/**
 * Mark update as dismissed by user
 */
export function dismissUpdate(version: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('dismissed_update_version', version);
  console.log(`[AppUpdate] User dismissed update to ${version}`);
}

/**
 * Clear dismissed update (for testing or when user reopens app)
 */
export function clearDismissedUpdate(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('dismissed_update_version');
}

/**
 * Check if should show update prompt
 * (doesn't show if user already dismissed this version)
 */
export async function shouldShowUpdatePrompt(): Promise<{
  show: boolean;
  updateInfo: UpdateInfo | null;
}> {
  const result = await checkForUpdates();

  if (!result.updateAvailable || !result.updateInfo) {
    return { show: false, updateInfo: null };
  }

  // Don't show if user dismissed this version
  if (hasUserDismissedUpdate(result.updateInfo.version)) {
    return { show: false, updateInfo: result.updateInfo };
  }

  // Always show if required
  if (result.updateInfo.required) {
    return { show: true, updateInfo: result.updateInfo };
  }

  // Show optional update
  return { show: true, updateInfo: result.updateInfo };
}

/**
 * Get app info (version, build, etc.)
 */
export async function getAppInfo(): Promise<{
  version: string;
  build: string;
  platform: string;
}> {
  try {
    if (Capacitor.isNativePlatform()) {
      const info = await CapacitorApp.getInfo();
      return {
        version: info.version,
        build: info.build,
        platform: Capacitor.getPlatform(),
      };
    } else {
      return {
        version: CURRENT_VERSION,
        build: '1',
        platform: 'web',
      };
    }
  } catch (error) {
    console.error('[AppUpdate] Failed to get app info:', error);
    return {
      version: CURRENT_VERSION,
      build: '1',
      platform: 'unknown',
    };
  }
}
