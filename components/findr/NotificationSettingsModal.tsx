/**
 * NotificationSettingsModal Component
 *
 * Simplified global notification settings for fishing alerts.
 * Replaces per-species notification configuration with 3 simple toggles:
 * - Hot bite alerts (85%+) via in-app push notifications
 * - Daily email digest (all favourites with confidence tiers)
 * - Weekly forecast email (7-day chart for trip planning)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Bell, Mail, TrendingUp, AlertCircle, Check } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { TranslatedText } from '../translation/TranslatedFishCard';
import type { UpdatePreferencesRequest } from '@/pages/api/findr/notification-preferences';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSettingsModal({
  isOpen,
  onClose,
}: NotificationSettingsModalProps) {
  const {
    preferences,
    isLoading,
    isError,
    isAuthenticated,
    updatePreferences,
  } = useNotificationPreferences();

  const [localPrefs, setLocalPrefs] = useState<UpdatePreferencesRequest>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with fetched preferences
  useEffect(() => {
    if (preferences && isOpen) {
      setLocalPrefs({
        hot_bite_alerts_enabled: preferences.hot_bite_alerts_enabled,
        daily_email_enabled: preferences.daily_email_enabled,
        daily_email_time: preferences.daily_email_time,
        weekly_forecast_enabled: preferences.weekly_forecast_enabled,
        weekly_forecast_day: preferences.weekly_forecast_day,
        weekly_forecast_time: preferences.weekly_forecast_time,
      });
      setHasChanges(false);
    }
  }, [preferences, isOpen]);

  const handleToggle = (field: keyof UpdatePreferencesRequest, value: boolean) => {
    setLocalPrefs((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updatePreferences.mutateAsync(localPrefs);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('[NotificationSettingsModal] Failed to save:', error);
    }
  };

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <div className="modal modal-open">
        <div className="modal-box max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle size={48} className="text-warning mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              <TranslatedText text="Authentication Required" />
            </h3>
            <p className="text-sm text-base-content/70 mb-4">
              <TranslatedText text="Please sign in to manage notification settings" />
            </p>
            <button onClick={onClose} className="btn btn-primary">
              <TranslatedText text="Close" />
            </button>
          </div>
        </div>
        <div className="modal-backdrop" onClick={onClose} />
      </div>
    );
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Bell size={20} />
            <TranslatedText text="Notification Settings" />
          </h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="alert alert-error mb-4">
            <AlertCircle size={20} />
            <span className="text-sm">
              <TranslatedText text="Failed to load notification settings. Please try again." />
            </span>
          </div>
        )}

        {/* Settings Content */}
        {!isLoading && !isError && preferences && (
          <div className="space-y-6">
            {/* Description */}
            <p className="text-sm text-base-content/70">
              <TranslatedText text="Manage fishing alerts for your favourite species. Alerts are sent when species reach 85% confidence or higher." />
            </p>

            {/* Hot Bite Alerts */}
            <div className="card bg-base-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle size={20} className="text-error" />
                    </div>
                    <h4 className="font-semibold">
                      <TranslatedText text="Hot Bite Alerts" />
                    </h4>
                  </div>
                  <p className="text-xs text-base-content/60 ml-12">
                    <TranslatedText text="Instant in-app notifications when favourite species reach 85%+ confidence. Perfect for last-minute fishing trips!" />
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-error"
                  checked={localPrefs.hot_bite_alerts_enabled ?? true}
                  onChange={(e) => handleToggle('hot_bite_alerts_enabled', e.target.checked)}
                />
              </div>
            </div>

            {/* Daily Email Digest */}
            <div className="card bg-base-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0">
                      <Mail size={20} className="text-info" />
                    </div>
                    <h4 className="font-semibold">
                      <TranslatedText text="Daily Email Digest" />
                    </h4>
                  </div>
                  <p className="text-xs text-base-content/60 ml-12 mb-3">
                    <TranslatedText text="Daily summary of all favourites, organized by confidence tiers: Hot Bites (85%+), Good Conditions (70-84%), and Status Updates (<70%). Maximum 1 email per day." />
                  </p>
                  <div className="ml-12 text-xs text-base-content/50">
                    <TranslatedText text="Sent daily at 8:00 AM" />
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-info"
                  checked={localPrefs.daily_email_enabled ?? false}
                  onChange={(e) => handleToggle('daily_email_enabled', e.target.checked)}
                />
              </div>
            </div>

            {/* Weekly Forecast Email */}
            <div className="card bg-base-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp size={20} className="text-success" />
                    </div>
                    <h4 className="font-semibold">
                      <TranslatedText text="Weekly Forecast" />
                    </h4>
                  </div>
                  <p className="text-xs text-base-content/60 ml-12 mb-3">
                    <TranslatedText text="7-day confidence forecast for each favourite species with best fishing days highlighted. Perfect for planning weekend trips!" />
                  </p>
                  <div className="ml-12 text-xs text-base-content/50">
                    <TranslatedText text="Sent every Monday at 8:00 AM" />
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-success"
                  checked={localPrefs.weekly_forecast_enabled ?? false}
                  onChange={(e) => handleToggle('weekly_forecast_enabled', e.target.checked)}
                />
              </div>
            </div>

            {/* Info Banner */}
            <div className="alert alert-info">
              <AlertCircle size={16} />
              <div className="text-xs">
                <TranslatedText text="Add species to your favourites to start receiving personalized fishing alerts and forecasts." />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="modal-action mt-6">
          <button
            onClick={onClose}
            className="btn btn-ghost"
            disabled={updatePreferences.isPending}
          >
            <TranslatedText text="Cancel" />
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!hasChanges || updatePreferences.isPending}
          >
            {updatePreferences.isPending ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                <TranslatedText text="Saving" />
              </>
            ) : updatePreferences.isSuccess && !hasChanges ? (
              <>
                <Check size={18} />
                <TranslatedText text="Saved" />
              </>
            ) : (
              <TranslatedText text="Save Changes" />
            )}
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

export default NotificationSettingsModal;
