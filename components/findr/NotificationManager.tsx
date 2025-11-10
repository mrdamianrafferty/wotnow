/**
 * NotificationManager Component
 *
 * Displays and manages scheduled fishing notifications
 *
 * Features:
 * - Lists all scheduled notifications
 * - Shows notification time and species details
 * - Allows canceling individual notifications
 * - Works on native and web (uses localStorage tracking)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Trash2, Clock, Fish, AlertCircle } from 'lucide-react';
import { cancelLocalNotification } from '@/lib/capacitor/notifications';
import { TranslatedText } from '../translation/TranslatedFishCard';
import { toast } from '@/lib/ui/toast';

export interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  scheduledAt: string; // ISO string
  speciesName?: string;
  speciesId?: string;
  type: 'hot_bite_alert' | 'peak_conditions_reminder';
}

const NOTIFICATIONS_KEY = 'findr_scheduled_notifications';

/**
 * Get all scheduled notifications from localStorage
 */
export function getScheduledNotifications(): ScheduledNotification[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return [];

    const notifications = JSON.parse(stored) as ScheduledNotification[];

    // Filter out past notifications
    const now = new Date();
    const active = notifications.filter(n => new Date(n.scheduledAt) > now);

    // Update localStorage if we filtered any out
    if (active.length !== notifications.length) {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(active));
    }

    return active.sort((a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  } catch (error) {
    console.error('[NotificationManager] Failed to load notifications:', error);
    return [];
  }
}

/**
 * Add a notification to the tracking list
 */
export function trackNotification(notification: ScheduledNotification): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getScheduledNotifications();
    const updated = [...existing, notification];
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[NotificationManager] Failed to track notification:', error);
  }
}

/**
 * Remove a notification from the tracking list
 */
export function untrackNotification(id: number): void {
  if (typeof window === 'undefined') return;

  try {
    const existing = getScheduledNotifications();
    const updated = existing.filter(n => n.id !== id);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[NotificationManager] Failed to untrack notification:', error);
  }
}

/**
 * Check if a notification exists for a specific species
 * Returns the notification ID if found, null otherwise
 */
export function getNotificationForSpecies(speciesId: string): number | null {
  const notifications = getScheduledNotifications();
  const found = notifications.find(n => n.speciesId === speciesId);
  return found ? found.id : null;
}

export function NotificationManager() {
  const [notifications, setNotifications] = useState<ScheduledNotification[]>([]);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  // Load notifications on mount and set up refresh interval
  useEffect(() => {
    const load = () => setNotifications(getScheduledNotifications());
    load();

    // Refresh every minute to update relative times
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (notification: ScheduledNotification) => {
    setCancelingId(notification.id);

    try {
      // Cancel the actual notification
      await cancelLocalNotification(notification.id);

      // Remove from tracking list
      untrackNotification(notification.id);

      // Update UI
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (error) {
      console.error('[NotificationManager] Failed to cancel notification:', error);
      await toast.error('Failed to cancel notification. Please try again.');
    } finally {
      setCancelingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Cancel all fishing alerts and reminders?')) return;

    setCancelingId(-1); // Special ID for "canceling all"

    try {
      // Cancel each notification
      await Promise.all(
        notifications.map(n => cancelLocalNotification(n.id))
      );

      // Clear tracking list
      localStorage.removeItem(NOTIFICATIONS_KEY);

      // Update UI
      setNotifications([]);
    } catch (error) {
      console.error('[NotificationManager] Failed to clear all notifications:', error);
      await toast.error('Failed to cancel some notifications. Please try again.');
    } finally {
      setCancelingId(null);
    }
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Very soon';
    if (diffMins < 60) return `In ${diffMins}min`;
    if (diffHours < 24) return `In ${diffHours}h`;
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (notifications.length === 0) {
    return (
      <div className="card bg-base-100 border border-base-300 p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-3 py-4">
          <BellOff size={48} className="text-base-content/30" />
          <div>
            <h3 className="font-semibold text-lg mb-1">
              <TranslatedText text="No Active Alerts" />
            </h3>
            <p className="text-sm text-base-content/60">
              <TranslatedText text="Set fishing alerts from prediction cards to get notified about hot bites and peak conditions." />
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell size={20} />
          <TranslatedText text="Fishing Alerts" />
          <span className="badge badge-sm badge-primary">{notifications.length}</span>
        </h3>
        {notifications.length > 1 && (
          <button
            onClick={handleClearAll}
            className="btn btn-sm btn-ghost text-error"
            disabled={cancelingId === -1}
          >
            {cancelingId === -1 ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Trash2 size={14} />
            )}
            <TranslatedText text="Clear All" />
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="card bg-base-100 border border-base-300 p-4"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0">
                {notification.type === 'hot_bite_alert' ? (
                  <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                    <AlertCircle size={24} className="text-error" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                    <Fish size={24} className="text-warning" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-base-content">
                    {notification.speciesName || 'Fishing Alert'}
                  </h4>
                  <div className="badge badge-sm badge-outline flex-shrink-0">
                    <Clock size={10} className="mr-1" />
                    {formatTime(notification.scheduledAt)}
                  </div>
                </div>
                <p className="text-xs text-base-content/70 mb-2">
                  {notification.body}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-base-content/50">
                    {notification.type === 'hot_bite_alert'
                      ? <TranslatedText text="Instant alert" />
                      : <TranslatedText text="Scheduled reminder" />
                    }
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Cancel Button - Made larger and more prominent */}
                <button
                  onClick={() => handleCancel(notification)}
                  className="btn btn-sm btn-ghost text-error flex-shrink-0 min-w-[44px] min-h-[44px]"
                  disabled={cancelingId === notification.id}
                  title="Cancel alert"
                >
                  {cancelingId === notification.id ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <Trash2 size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationManager;
