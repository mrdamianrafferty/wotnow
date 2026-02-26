/**
 * Push Permission Primer
 *
 * A pre-permission modal shown BEFORE the native push notification prompt.
 * Explains to the user why the app needs notification permissions and what
 * types of notifications they will receive.
 *
 * This is critical for mobile apps because:
 * - iOS only allows ONE permission request; if denied, users must go to Settings
 * - Showing context before the native prompt dramatically increases opt-in rates
 * - If the user dismisses the primer, the native prompt is NOT shown
 *
 * Supports all three apps: Go Daisy, Findr, and Grow Daisy.
 *
 * @module components/PushPermissionPrimer
 *
 * @example
 * ```tsx
 * import { usePushPrimer } from '@/components/PushPermissionPrimer';
 *
 * function MyPage() {
 *   const { showPrimer, PrimerComponent } = usePushPrimer({
 *     app: 'godaisy',
 *     onPermissionGranted: () => console.log('Notifications enabled!'),
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={showPrimer}>Enable Notifications</button>
 *       <PrimerComponent />
 *     </div>
 *   );
 * }
 * ```
 */

'use client';

import React, { useState, useCallback, useEffect, useId, useRef } from 'react';
import {
  Bell,
  BellOff,
  X,
  Sun,
  Fish,
  Droplets,
  Star,
  Waves,
  Leaf,
  CloudRain,
  Snowflake,
  Bug,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type PrimerApp = 'godaisy' | 'findr' | 'grow';

export interface PushPermissionPrimerProps {
  /** Which app variant to show messaging for */
  app: PrimerApp;
  /** Whether the primer modal is open */
  open: boolean;
  /** Called when the modal is closed (either via Enable or Not Now) */
  onClose: () => void;
  /** Called after the native permission is successfully granted */
  onPermissionGranted: () => void;
  /** Optional: called if the user taps "Not Now" */
  onDismiss?: () => void;
}

export interface UsePushPrimerOptions {
  /** Which app variant to show messaging for */
  app: PrimerApp;
  /** Called after the native permission is successfully granted */
  onPermissionGranted: () => void;
  /** Optional: called if the user taps "Not Now" */
  onDismiss?: () => void;
}

export interface UsePushPrimerReturn {
  /** Call this to show the primer (respects prior dismissal) */
  showPrimer: () => void;
  /** Whether the primer was previously dismissed */
  wasDismissed: boolean;
  /** The primer component to render (renders nothing when closed) */
  PrimerComponent: React.FC;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DISMISSAL_KEY = 'push-primer-dismissed';

/** How long to respect a dismissal before showing again (7 days in ms) */
const DISMISSAL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// =============================================================================
// APP-SPECIFIC CONTENT
// =============================================================================

interface AppContent {
  title: string;
  headline: string;
  description: string;
  benefits: Array<{
    icon: React.ReactNode;
    text: string;
  }>;
  accentColor: string;
  iconBgColor: string;
}

function getAppContent(app: PrimerApp): AppContent {
  switch (app) {
    case 'godaisy':
      return {
        title: 'Go Daisy',
        headline: 'Stay in the know',
        description:
          'Get notified about perfect weather conditions for your favourite activities.',
        benefits: [
          {
            icon: <Sun className="h-5 w-5 text-amber-500" />,
            text: 'Activity alerts when conditions are ideal',
          },
          {
            icon: <Star className="h-5 w-5 text-indigo-500" />,
            text: 'Astronomy events like ISS passes and meteor showers',
          },
          {
            icon: <Waves className="h-5 w-5 text-blue-500" />,
            text: 'Tide alerts for coastal activities',
          },
          {
            icon: <CloudRain className="h-5 w-5 text-gray-500" />,
            text: 'Weather warnings before they affect your plans',
          },
        ],
        accentColor: 'text-primary',
        iconBgColor: 'bg-primary/10',
      };

    case 'findr':
      return {
        title: 'Fish Findr',
        headline: 'Never miss a bite',
        description:
          'Get notified when fishing conditions are ideal in your area.',
        benefits: [
          {
            icon: <Fish className="h-5 w-5 text-blue-500" />,
            text: 'Hot bite alerts when species are active nearby',
          },
          {
            icon: <Waves className="h-5 w-5 text-cyan-500" />,
            text: 'Tide and current updates for your fishing spots',
          },
          {
            icon: <Droplets className="h-5 w-5 text-teal-500" />,
            text: 'Marine condition changes that affect your catch',
          },
          {
            icon: <Star className="h-5 w-5 text-amber-500" />,
            text: 'Seasonal species forecasts and peak windows',
          },
        ],
        accentColor: 'text-blue-600',
        iconBgColor: 'bg-blue-50',
      };

    case 'grow':
      return {
        title: 'Grow Daisy',
        headline: 'Grow with confidence',
        description:
          'Get reminders for watering, planting, and weather alerts for your garden.',
        benefits: [
          {
            icon: <Snowflake className="h-5 w-5 text-blue-400" />,
            text: 'Frost warnings to protect your plants',
          },
          {
            icon: <Droplets className="h-5 w-5 text-blue-500" />,
            text: 'Watering reminders based on weather and soil',
          },
          {
            icon: <Bug className="h-5 w-5 text-amber-600" />,
            text: 'Pest and disease risk alerts',
          },
          {
            icon: <Leaf className="h-5 w-5 text-green-600" />,
            text: 'Harvest reminders when crops are ready to pick',
          },
        ],
        accentColor: 'text-emerald-600',
        iconBgColor: 'bg-emerald-50',
      };
  }
}

// =============================================================================
// DISMISSAL HELPERS
// =============================================================================

function getDismissalState(app: PrimerApp): { dismissed: boolean; timestamp: number | null } {
  if (typeof window === 'undefined') {
    return { dismissed: false, timestamp: null };
  }

  try {
    const stored = localStorage.getItem(`${DISMISSAL_KEY}-${app}`);
    if (!stored) return { dismissed: false, timestamp: null };

    const timestamp = parseInt(stored, 10);
    if (isNaN(timestamp)) return { dismissed: false, timestamp: null };

    // Check if cooldown has expired
    const elapsed = Date.now() - timestamp;
    if (elapsed > DISMISSAL_COOLDOWN_MS) {
      // Cooldown expired, clear the dismissal
      localStorage.removeItem(`${DISMISSAL_KEY}-${app}`);
      return { dismissed: false, timestamp: null };
    }

    return { dismissed: true, timestamp };
  } catch {
    return { dismissed: false, timestamp: null };
  }
}

function setDismissed(app: PrimerApp): void {
  try {
    localStorage.setItem(`${DISMISSAL_KEY}-${app}`, Date.now().toString());
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

// =============================================================================
// PUSH REGISTRATION HELPER
// =============================================================================

/**
 * Attempt to register for push notifications via the appropriate mechanism.
 * Returns true if permission was granted, false otherwise.
 */
async function requestPushPermission(): Promise<boolean> {
  // Try Capacitor native path first
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications')) {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.requestPermissions();
      if (result.receive === 'granted') {
        await PushNotifications.register();
        return true;
      }
      return false;
    }
  } catch {
    // Not native or plugin unavailable, fall through to web
  }

  // Web Push path
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  return false;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PushPermissionPrimer({
  app,
  open,
  onClose,
  onPermissionGranted,
  onDismiss,
}: PushPermissionPrimerProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const content = getAppContent(app);

  // Focus trap: focus the dialog when it opens
  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleEnable = useCallback(async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPushPermission();
      if (granted) {
        onPermissionGranted();
      }
    } catch (error) {
      console.error('[PushPrimer] Permission request failed:', error);
    } finally {
      setIsRequesting(false);
      onClose();
    }
  }, [onPermissionGranted, onClose]);

  const handleDismiss = useCallback(() => {
    setDismissed(app);
    onDismiss?.();
    onClose();
  }, [app, onDismiss, onClose]);

  if (!open) return null;

  return (
    <div
      className={`modal modal-bottom sm:modal-middle ${open ? 'modal-open' : ''}`}
      style={{ overscrollBehavior: 'contain' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="modal-box w-full max-w-md space-y-5 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6"
      >
        {/* Close button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${content.iconBgColor}`}>
              <Bell className={`h-5 w-5 ${content.accentColor}`} />
            </div>
            <h3 id={titleId} className="font-semibold text-lg">
              {content.headline}
            </h3>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={handleDismiss}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-base-content/70 leading-relaxed">
          {content.description}
        </p>

        {/* Benefits list */}
        <div className="space-y-3">
          {content.benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{benefit.icon}</div>
              <span className="text-sm text-base-content/80">{benefit.text}</span>
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <p className="text-xs text-base-content/50">
          You can change your notification preferences at any time in Settings.
          We will never spam you.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            className={`btn btn-primary w-full gap-2 ${isRequesting ? 'loading' : ''}`}
            onClick={handleEnable}
            disabled={isRequesting}
          >
            {!isRequesting && <Bell className="h-4 w-4" />}
            {isRequesting ? 'Requesting...' : 'Enable Notifications'}
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full gap-2 text-base-content/60"
            onClick={handleDismiss}
            disabled={isRequesting}
          >
            <BellOff className="h-4 w-4" />
            Not Now
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <button
        type="button"
        className="modal-backdrop"
        onClick={handleDismiss}
        aria-label="Close"
      />
    </div>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for easily integrating the push permission primer.
 *
 * Returns a `showPrimer` function and a `PrimerComponent` to render.
 * Automatically checks localStorage for prior dismissal and respects
 * a 7-day cooldown before showing again.
 *
 * @example
 * ```tsx
 * const { showPrimer, PrimerComponent } = usePushPrimer({
 *   app: 'findr',
 *   onPermissionGranted: () => {
 *     // Register push token, update UI, etc.
 *     registerPushNotifications(userId);
 *   },
 * });
 *
 * // Show the primer on a button click or after some event
 * <button onClick={showPrimer}>Enable Notifications</button>
 * <PrimerComponent />
 * ```
 */
export function usePushPrimer({
  app,
  onPermissionGranted,
  onDismiss,
}: UsePushPrimerOptions): UsePushPrimerReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [wasDismissed, setWasDismissed] = useState(false);

  // Check dismissal state on mount
  useEffect(() => {
    const { dismissed } = getDismissalState(app);
    setWasDismissed(dismissed);
  }, [app]);

  const showPrimer = useCallback(() => {
    // Re-check dismissal state at show time (in case it changed)
    const { dismissed } = getDismissalState(app);
    if (dismissed) {
      setWasDismissed(true);
      return;
    }
    setIsOpen(true);
  }, [app]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setWasDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const PrimerComponent: React.FC = useCallback(
    () => (
      <PushPermissionPrimer
        app={app}
        open={isOpen}
        onClose={handleClose}
        onPermissionGranted={onPermissionGranted}
        onDismiss={handleDismiss}
      />
    ),
    [app, isOpen, handleClose, onPermissionGranted, handleDismiss]
  );

  return {
    showPrimer,
    wasDismissed,
    PrimerComponent,
  };
}
