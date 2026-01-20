/**
 * Notification Preferences Card
 *
 * Settings card for managing push notification preferences in Grow Daisy.
 * Includes toggle for subscribing and individual notification type controls.
 *
 * @module components/grow/NotificationPreferencesCard
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
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
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
  } = useGrowPushNotifications();

  const { isBloomOrHigher } = useGrowSubscription();
  const supabase = createClient();

  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
              Notification permission was denied. To enable notifications,
              please update your browser settings to allow notifications from this site.
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
          <Bell className="h-5 w-5" />
          Notifications
          {isSubscribed && (
            <Badge variant="default" className="ml-2 bg-emerald-500">
              Active
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
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-blue-600" />
                <Label className="text-sm font-medium">Weather Alerts</Label>
                {!isBloomOrHigher && (
                  <Badge variant="secondary" className="text-xs">BLOOM+</Badge>
                )}
              </div>

              <div className="space-y-3 pl-6">
                <PreferenceToggle
                  label="Frost Alerts"
                  description="Get warned 48 hours before frost"
                  icon={<Snowflake className="h-4 w-4 text-blue-400" />}
                  checked={preferences.frostAlerts}
                  onChange={(checked) => savePreference('frostAlerts', checked)}
                  disabled={!isBloomOrHigher || isSaving}
                  locked={!isBloomOrHigher}
                />

                <PreferenceToggle
                  label="Pest & Disease Threats"
                  description="Alerts when conditions favor pests"
                  icon={<Bug className="h-4 w-4 text-amber-600" />}
                  checked={preferences.weatherThreats}
                  onChange={(checked) => savePreference('weatherThreats', checked)}
                  disabled={!isBloomOrHigher || isSaving}
                  locked={!isBloomOrHigher}
                />

                <PreferenceToggle
                  label="Extreme Weather"
                  description="Heat waves, storms, heavy rain"
                  icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                  checked={preferences.extremeWeather}
                  onChange={(checked) => savePreference('extremeWeather', checked)}
                  disabled={!isBloomOrHigher || isSaving}
                  locked={!isBloomOrHigher}
                />
              </div>
            </div>

            <Separator />

            {/* Task Reminders - All Tiers */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-emerald-600" />
                <Label className="text-sm font-medium">Task Reminders</Label>
              </div>

              <div className="space-y-3 pl-6">
                <PreferenceToggle
                  label="Watering Reminders"
                  description="When plants need water"
                  icon={<Droplets className="h-4 w-4 text-blue-500" />}
                  checked={preferences.wateringReminders}
                  onChange={(checked) => savePreference('wateringReminders', checked)}
                  disabled={isSaving}
                />

                <PreferenceToggle
                  label="Task Reminders"
                  description="General garden tasks"
                  icon={<CheckSquare className="h-4 w-4 text-emerald-500" />}
                  checked={preferences.taskReminders}
                  onChange={(checked) => savePreference('taskReminders', checked)}
                  disabled={isSaving}
                />

                <PreferenceToggle
                  label="Harvest Reminders"
                  description="When crops are ready to pick"
                  icon={<Leaf className="h-4 w-4 text-green-600" />}
                  checked={preferences.harvestReminders}
                  onChange={(checked) => savePreference('harvestReminders', checked)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <Separator />

            {/* Quiet Hours */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <Label className="text-sm font-medium">Quiet Hours</Label>
              </div>

              <div className="flex items-center gap-4 pl-6">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">From</Label>
                  <Select
                    value={preferences.quietStartHour.toString()}
                    onValueChange={(value) => savePreference('quietStartHour', parseInt(value))}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">to</Label>
                  <Select
                    value={preferences.quietEndHour.toString()}
                    onValueChange={(value) => savePreference('quietEndHour', parseInt(value))}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                No notifications will be sent during quiet hours
              </p>
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
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <Label className="text-sm font-normal">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {locked && (
          <Badge variant="outline" className="text-xs">
            Upgrade
          </Badge>
        )}
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
