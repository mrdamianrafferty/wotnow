/**
 * Notification Preferences Card
 *
 * Settings card for managing push notification preferences in Grow Daisy.
 * Includes toggle for subscribing and individual notification type controls.
 *
 * Supports both:
 * - Web Push (PWA/browser)
 * - Native Push via Capacitor (iOS/Android apps)
 *
 * @module components/grow/NotificationPreferencesCard
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import {
  Bell,
  BellOff,
  Loader2,
  Snowflake,
  Bug,
  CloudRain,
  Droplets,
  CheckSquare,
  Leaf,
  Clock,
  AlertTriangle,
  Smartphone,
  Check,
  Circle,
  Lock,
} from 'lucide-react';
import { useGrowPushNotifications } from '@/hooks/useGrowPushNotifications';
import { useGrowSubscription } from '@/hooks/useGrowSubscription';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

interface NotificationPreferences {
  frostAlerts: boolean;
  weatherThreats: boolean;
  extremeWeather: boolean;
  wateringReminders: boolean;
  taskReminders: boolean;
  plantHealthAlerts: boolean;
  harvestReminders: boolean;
  localPestAlerts: boolean;
  communityTips: boolean;
  quietStartHour: number;
  quietEndHour: number;
  timezone: string;
  maxDailyNotifications: number;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  frostAlerts: true,
  weatherThreats: true,
  extremeWeather: true,
  wateringReminders: true,
  taskReminders: true,
  plantHealthAlerts: true,
  harvestReminders: true,
  localPestAlerts: false,
  communityTips: false,
  quietStartHour: 22,
  quietEndHour: 7,
  timezone: 'Europe/Dublin',
  maxDailyNotifications: 10,
};

// =============================================================================
// COMPONENT
// =============================================================================

export function NotificationPreferencesCard() {
  // Detect if running in Capacitor native app (must be in useEffect for SSR safety)
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [platformChecked, setPlatformChecked] = useState(false);

  useEffect(() => {
    const checkPlatform = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        setIsNativeApp(Capacitor.isNativePlatform());
      } catch {
        setIsNativeApp(false);
      }
      setPlatformChecked(true);
    };
    checkPlatform();
  }, []);

  // Web Push hook (only used for PWA/browser)
  const {
    isSupported: webPushSupported,
    permission: webPushPermission,
    isSubscribed: webPushSubscribed,
    isLoading: webPushLoading,
    error: webPushError,
    subscribe: webPushSubscribe,
    unsubscribe: webPushUnsubscribe,
  } = useGrowPushNotifications();

  const { isBloomOrHigher } = useGrowSubscription();
  const supabase = createClient();

  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Native push state (Capacitor)
  const [nativePushEnabled, setNativePushEnabled] = useState(false);
  const [nativePushLoading, setNativePushLoading] = useState(false);
  const [nativePushError, setNativePushError] = useState<string | null>(null);

  // Unified state based on platform
  const isSupported = isNativeApp ? true : webPushSupported;
  const permission = isNativeApp ? (nativePushEnabled ? 'granted' : 'prompt') : webPushPermission;
  const isSubscribed = isNativeApp ? nativePushEnabled : webPushSubscribed;
  const pushLoading = isNativeApp ? nativePushLoading : webPushLoading;
  const pushError = isNativeApp ? nativePushError : webPushError;

  // Check native push status on mount
  useEffect(() => {
    if (!isNativeApp) return;

    const checkNativePushStatus = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const permStatus = await PushNotifications.checkPermissions();
        setNativePushEnabled(permStatus.receive === 'granted');
      } catch (error) {
        console.error('[NotificationPrefs] Error checking native push status:', error);
      }
    };

    checkNativePushStatus();
  }, [isNativeApp]);

  // Native push subscribe handler
  const handleNativeSubscribe = useCallback(async (): Promise<boolean> => {
    if (!isNativeApp) return false;

    setNativePushLoading(true);
    setNativePushError(null);

    try {
      const { initPushNotifications, syncPushTokenToServer } = await import('@/lib/capacitor/pushNotifications');

      // Initialize push notifications (requests permission + registers)
      await initPushNotifications();

      // Get session for token sync
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await syncPushTokenToServer(session.access_token);
      }

      setNativePushEnabled(true);
      setNativePushLoading(false);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to enable notifications';
      setNativePushError(message);
      setNativePushLoading(false);
      return false;
    }
  }, [isNativeApp, supabase]);

  // Native push unsubscribe handler
  const handleNativeUnsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isNativeApp) return false;

    setNativePushLoading(true);

    try {
      const { removePushTokenFromServer } = await import('@/lib/capacitor/pushNotifications');

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await removePushTokenFromServer(session.access_token);
      }

      setNativePushEnabled(false);
      setNativePushLoading(false);
      return true;
    } catch (error) {
      console.error('[NotificationPrefs] Error unsubscribing:', error);
      setNativePushLoading(false);
      return false;
    }
  }, [isNativeApp, supabase]);

  // Unified subscribe/unsubscribe handlers
  const subscribe = isNativeApp ? handleNativeSubscribe : webPushSubscribe;
  const unsubscribe = isNativeApp ? handleNativeUnsubscribe : webPushUnsubscribe;

  // ---------------------------------------------------------------------------
  // LOAD PREFERENCES
  // ---------------------------------------------------------------------------

  const loadPreferences = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/grow/push/preferences', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoadingPrefs(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // ---------------------------------------------------------------------------
  // SAVE PREFERENCES
  // ---------------------------------------------------------------------------

  const savePreference = async (key: keyof NotificationPreferences, value: boolean | number | string) => {
    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to save preferences');
        return;
      }

      const response = await fetch('/api/grow/push/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (response.ok) {
        setPreferences(prev => ({ ...prev, [key]: value }));
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save preference:', error);
      toast.error('Failed to save preference');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast.success('Push notifications enabled!');
    } else if (pushError) {
      toast.error(pushError);
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      toast.success('Push notifications disabled');
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  // Loading while checking platform
  if (!platformChecked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not supported banner
  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellOff className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              Push notifications are not supported in this browser.
              Try using Chrome, Firefox, or Edge for the best experience.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Permission denied banner
  if (permission === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellOff className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              {isNativeApp ? (
                <>
                  Notification permission was denied. To enable notifications,
                  go to Settings → Grow Daisy → Notifications and enable them.
                </>
              ) : (
                <>
                  Notification permission was denied. To enable notifications,
                  please update your browser settings to allow notifications from this site.
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLoading = pushLoading || isLoadingPrefs;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {isNativeApp ? <Smartphone className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          Notifications
          {isSubscribed && (
            <Badge variant="default" className="ml-2 bg-emerald-500">
              Active
            </Badge>
          )}
          {isNativeApp && (
            <Badge variant="outline" className="ml-2 text-xs">
              Native
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Get alerts for frost warnings, pest risks, and task reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <Label className="text-base font-medium">
              {isSubscribed ? 'Notifications Enabled' : 'Enable Notifications'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isSubscribed
                ? 'You will receive alerts on this device'
                : 'Turn on to receive weather alerts and reminders'}
            </p>
          </div>
          <Button
            variant={isSubscribed ? 'outline' : 'default'}
            onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={isLoading}
            className={isSubscribed ? '' : 'bg-emerald-600 hover:bg-emerald-700'}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Disable
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Enable
              </>
            )}
          </Button>
        </div>

        {/* Preferences - only show if subscribed */}
        {isSubscribed && (
          <>
            <Separator />

            {/* Weather Alerts - BLOOM+ Feature */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <CloudRain className="h-5 w-5 text-blue-600" />
                <span className="text-base font-semibold">Weather Alerts</span>
                {!isBloomOrHigher && (
                  <Badge variant="secondary" className="text-xs">BLOOM+</Badge>
                )}
              </div>

              <div className="space-y-2">
                <PreferenceToggle
                  label="Frost Alerts"
                  description="Get warned 48 hours before frost"
                  icon={<Snowflake className="h-5 w-5 text-blue-400" />}
                  checked={preferences.frostAlerts}
                  onChange={(checked) => savePreference('frostAlerts', checked)}
                  disabled={!isBloomOrHigher || isSaving}
                  locked={!isBloomOrHigher}
                />

                <PreferenceToggle
                  label="Pest & Disease Threats"
                  description="Alerts when conditions favor pests"
                  icon={<Bug className="h-5 w-5 text-amber-600" />}
                  checked={preferences.weatherThreats}
                  onChange={(checked) => savePreference('weatherThreats', checked)}
                  disabled={!isBloomOrHigher || isSaving}
                  locked={!isBloomOrHigher}
                />

                <PreferenceToggle
                  label="Extreme Weather"
                  description="Heat waves, storms, heavy rain"
                  icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                  checked={preferences.extremeWeather}
                  onChange={(checked) => savePreference('extremeWeather', checked)}
                  disabled={!isBloomOrHigher || isSaving}
                  locked={!isBloomOrHigher}
                />
              </div>
            </div>

            <Separator />

            {/* Task Reminders - All Tiers */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <CheckSquare className="h-5 w-5 text-emerald-600" />
                <span className="text-base font-semibold">Task Reminders</span>
              </div>

              <div className="space-y-2">
                <PreferenceToggle
                  label="Watering Reminders"
                  description="When plants need water"
                  icon={<Droplets className="h-5 w-5 text-blue-500" />}
                  checked={preferences.wateringReminders}
                  onChange={(checked) => savePreference('wateringReminders', checked)}
                  disabled={isSaving}
                />

                <PreferenceToggle
                  label="Task Reminders"
                  description="General garden tasks"
                  icon={<CheckSquare className="h-5 w-5 text-emerald-500" />}
                  checked={preferences.taskReminders}
                  onChange={(checked) => savePreference('taskReminders', checked)}
                  disabled={isSaving}
                />

                <PreferenceToggle
                  label="Harvest Reminders"
                  description="When crops are ready to pick"
                  icon={<Leaf className="h-5 w-5 text-green-600" />}
                  checked={preferences.harvestReminders}
                  onChange={(checked) => savePreference('harvestReminders', checked)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <Separator />

            {/* Quiet Hours */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className="text-base font-semibold">Quiet Hours</span>
              </div>

              <div className="p-4 bg-muted/20 rounded-xl space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base text-muted-foreground">From</span>
                  <Select
                    value={preferences.quietStartHour.toString()}
                    onValueChange={(value) => savePreference('quietStartHour', parseInt(value))}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="w-28 h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()} className="text-base py-3">
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-base text-muted-foreground">To</span>
                  <Select
                    value={preferences.quietEndHour.toString()}
                    onValueChange={(value) => savePreference('quietEndHour', parseInt(value))}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="w-28 h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()} className="text-base py-3">
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-sm text-muted-foreground">
                  No notifications during these hours
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface PreferenceToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  locked?: boolean;
}

function PreferenceToggle({
  label,
  description,
  icon,
  checked,
  onChange,
  disabled,
  locked,
}: PreferenceToggleProps) {
  const handleClick = () => {
    if (!disabled && !locked) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || locked}
      className={`
        w-full flex items-center justify-between p-4 rounded-xl
        transition-all duration-200 text-left
        ${disabled || locked
          ? 'opacity-50 cursor-not-allowed bg-muted/30'
          : 'active:scale-[0.98] hover:bg-muted/50 cursor-pointer'
        }
        ${checked && !locked ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-muted/20'}
      `}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <span className="text-base font-medium block">{label}</span>
          <span className="text-sm text-muted-foreground block mt-0.5">{description}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
        {locked ? (
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" className="text-xs">
              Upgrade
            </Badge>
          </div>
        ) : checked ? (
          <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="h-5 w-5 text-white stroke-[3]" />
          </div>
        ) : (
          <div className="h-7 w-7 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
            <Circle className="h-3 w-3 text-transparent" />
          </div>
        )}
      </div>
    </button>
  );
}
