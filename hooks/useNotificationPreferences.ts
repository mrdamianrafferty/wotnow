/**
 * Notification Preferences Hook
 *
 * Manages user preferences for fishing alert notifications
 *
 * Features:
 * - Master enable/disable toggle
 * - Adjustable confidence threshold (70-100%)
 * - Peak conditions reminders toggle (70-84% confidence)
 * - localStorage persistence with debounce
 * - Cross-tab synchronization
 *
 * Usage:
 * ```tsx
 * const { preferences, updatePreferences } = useNotificationPreferences();
 *
 * // Check if notifications should be sent
 * if (preferences.enabled && species.confidence >= preferences.minConfidence) {
 *   scheduleNotification(...);
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'findr_notification_preferences';
const DEBOUNCE_MS = 500;

export interface NotificationPreferences {
  /** Master toggle for all notifications */
  enabled: boolean;

  /** Minimum confidence threshold (70-100) for hot bite alerts */
  minConfidence: number;

  /** Enable peak conditions reminders for 70-84% confidence */
  peakRemindersEnabled: boolean;

  /** Future: 'app' | 'email' | 'both' (email requires backend) */
  deliveryMethod: 'app';

  /** Future: 'immediate' | 'daily_digest' */
  frequency: 'immediate';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  minConfidence: 85, // Default to hot bite alerts only (85%+)
  peakRemindersEnabled: false,
  deliveryMethod: 'app',
  frequency: 'immediate',
};

/**
 * Load preferences from localStorage
 */
function loadPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(stored);

    // Validate and merge with defaults
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_PREFERENCES.enabled,
      minConfidence: typeof parsed.minConfidence === 'number' && parsed.minConfidence >= 70 && parsed.minConfidence <= 100
        ? parsed.minConfidence
        : DEFAULT_PREFERENCES.minConfidence,
      peakRemindersEnabled: typeof parsed.peakRemindersEnabled === 'boolean'
        ? parsed.peakRemindersEnabled
        : DEFAULT_PREFERENCES.peakRemindersEnabled,
      deliveryMethod: parsed.deliveryMethod === 'app' ? 'app' : DEFAULT_PREFERENCES.deliveryMethod,
      frequency: parsed.frequency === 'immediate' ? 'immediate' : DEFAULT_PREFERENCES.frequency,
    };
  } catch (error) {
    console.error('[useNotificationPreferences] Failed to load preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save preferences to localStorage
 */
function savePreferences(preferences: NotificationPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('[useNotificationPreferences] Failed to save preferences:', error);
  }
}

export interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  resetToDefaults: () => void;

  /** Helper: Check if notifications should be sent for a given confidence */
  shouldNotify: (confidence: number) => boolean;
}

/**
 * Hook for managing notification preferences
 */
export function useNotificationPreferences(): UseNotificationPreferencesResult {
  const [preferences, setPreferences] = useState<NotificationPreferences>(loadPreferences);
  const hasHydrated = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasHydrated.current) return;

    const stored = loadPreferences();
    setPreferences(stored);
    hasHydrated.current = true;
  }, []);

  // Auto-save to localStorage with debounce
  useEffect(() => {
    if (!hasHydrated.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule save
    saveTimeoutRef.current = setTimeout(() => {
      savePreferences(preferences);
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [preferences]);

  // Sync across tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const stored = loadPreferences();
        setPreferences(stored);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Update preferences (partial update)
  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Reset to default values
  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  // Helper: Check if notifications should be sent
  const shouldNotify = useCallback((confidence: number): boolean => {
    if (!preferences.enabled) {
      return false;
    }

    // Hot bite alerts (85%+)
    if (confidence >= 85 && confidence >= preferences.minConfidence) {
      return true;
    }

    // Peak conditions reminders (70-84%)
    if (preferences.peakRemindersEnabled && confidence >= 70 && confidence < 85) {
      return true;
    }

    return false;
  }, [preferences.enabled, preferences.minConfidence, preferences.peakRemindersEnabled]);

  return {
    preferences,
    updatePreferences,
    resetToDefaults,
    shouldNotify,
  };
}

export default useNotificationPreferences;
