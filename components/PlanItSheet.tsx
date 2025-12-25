'use client';

import React, { useEffect, useId, useRef, useState, useCallback } from 'react';
import { X, Calendar, Clock, Bell, BellOff, Check } from 'lucide-react';

/**
 * Plan data structure stored in localStorage
 */
export interface PlannedActivity {
  id: string;
  app: 'godaisy' | 'findr' | 'growdaisy';
  activityType: string;
  activityName: string;
  activityData: Record<string, unknown>;
  plannedFor: string; // ISO date string
  plannedTime?: string; // HH:MM format
  reminderEnabled: boolean;
  createdAt: string;
}

/**
 * When options for the plan
 */
type WhenOption = 'today' | 'tomorrow' | 'weekend' | 'afterwork' | 'custom';

interface WhenChip {
  id: WhenOption;
  label: string;
  getDate: () => Date;
}

const getNextWeekend = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + daysUntilSaturday);
  return saturday;
};

const getAfterWork = (): Date => {
  const today = new Date();
  today.setHours(17, 0, 0, 0); // 5 PM today
  return today;
};

const WHEN_OPTIONS: WhenChip[] = [
  { id: 'today', label: 'Today', getDate: () => new Date() },
  { id: 'tomorrow', label: 'Tomorrow', getDate: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }},
  { id: 'weekend', label: 'This weekend', getDate: getNextWeekend },
  { id: 'afterwork', label: 'After work', getDate: getAfterWork },
];

export interface PlanItSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (plan: PlannedActivity) => void;
  app: 'godaisy' | 'findr' | 'growdaisy';
  activityType: string;
  activityName: string;
  activityData?: Record<string, unknown>;
  /** Custom content to show in the sheet (e.g., safety checklist for Findr) */
  children?: React.ReactNode;
}

/**
 * PlanItSheet - A shared bottom sheet component for planning activities
 *
 * Features:
 * - Bottom sheet on mobile, centered modal on desktop
 * - When? chips (Today, Tomorrow, This weekend, After work)
 * - Optional time picker
 * - Reminder toggle
 * - Saves to localStorage (anonymous-first)
 */
export const PlanItSheet: React.FC<PlanItSheetProps> = ({
  open,
  onClose,
  onSave,
  app,
  activityType,
  activityName,
  activityData = {},
  children,
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [selectedWhen, setSelectedWhen] = useState<WhenOption>('today');
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSelectedWhen('today');
      setCustomDate('');
      setSelectedTime('');
      setReminderEnabled(true);
      setShowTimePicker(false);
      setSaved(false);
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  const getPlannedDate = useCallback((): string => {
    if (selectedWhen === 'custom' && customDate) {
      return customDate;
    }
    const option = WHEN_OPTIONS.find(o => o.id === selectedWhen);
    if (option) {
      return option.getDate().toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }, [selectedWhen, customDate]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    const plan: PlannedActivity = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      app,
      activityType,
      activityName,
      activityData,
      plannedFor: getPlannedDate(),
      plannedTime: selectedTime || undefined,
      reminderEnabled,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    try {
      const existing = localStorage.getItem('planned_activities');
      const plans: PlannedActivity[] = existing ? JSON.parse(existing) : [];
      plans.push(plan);
      localStorage.setItem('planned_activities', JSON.stringify(plans));

      // Schedule reminder notification if enabled (native apps only)
      if (reminderEnabled) {
        try {
          const { scheduleReminder } = await import('@/lib/capacitor/pushNotifications');
          await scheduleReminder(plan);
        } catch {
          // Non-fatal - notifications are optional
          if (process.env.NODE_ENV === 'development') {
            console.log('[PlanItSheet] Could not schedule reminder - continuing without');
          }
        }
      }

      onSave(plan);
      setSaved(true);

      // Close after brief success feedback
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (error) {
      console.error('[PlanItSheet] Failed to save plan:', error);
    } finally {
      setIsSaving(false);
    }
  }, [app, activityType, activityName, activityData, getPlannedDate, selectedTime, reminderEnabled, onSave, onClose]);

  const formatDateDisplay = (option: WhenChip): string => {
    const date = option.getDate();
    if (option.id === 'afterwork') {
      return 'Today 5pm';
    }
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className={`modal modal-bottom sm:modal-middle ${open ? 'modal-open' : ''}`}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="modal-box w-full max-w-lg space-y-4 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h3 id={titleId} className="font-semibold text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
            Plan it
          </h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Activity being planned */}
        <div className="bg-base-200 rounded-lg p-3">
          <p className="text-sm text-base-content/70">Planning:</p>
          <p className="font-medium">{activityName}</p>
        </div>

        {/* When? chips */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-base-content/70">When?</label>
          <div className="flex flex-wrap gap-2">
            {WHEN_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedWhen(option.id)}
                className={`btn btn-sm ${
                  selectedWhen === option.id
                    ? 'btn-primary'
                    : 'btn-outline'
                }`}
              >
                {option.label}
                {selectedWhen === option.id && (
                  <span className="text-xs opacity-70 ml-1">
                    ({formatDateDisplay(option)})
                  </span>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedWhen('custom')}
              className={`btn btn-sm ${
                selectedWhen === 'custom'
                  ? 'btn-primary'
                  : 'btn-outline'
              }`}
            >
              Pick date
            </button>
          </div>

          {/* Custom date picker */}
          {selectedWhen === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="input input-bordered w-full mt-2"
            />
          )}
        </div>

        {/* Time picker toggle */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowTimePicker(!showTimePicker)}
            className="btn btn-ghost btn-sm gap-2"
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            {showTimePicker ? 'Hide time' : 'Add specific time'}
          </button>

          {showTimePicker && (
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="input input-bordered w-full"
            />
          )}
        </div>

        {/* Reminder toggle */}
        <div className="flex items-center justify-between py-2">
          <label className="flex items-center gap-2 cursor-pointer">
            {reminderEnabled ? (
              <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
            ) : (
              <BellOff className="h-5 w-5 text-base-content/50" aria-hidden="true" />
            )}
            <span className="text-sm">Remind me</span>
          </label>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
          />
        </div>

        {/* Custom children (e.g., safety checklist for Findr) */}
        {children}

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || saved || (selectedWhen === 'custom' && !customDate)}
          className={`btn btn-primary w-full ${saved ? 'btn-success' : ''}`}
        >
          {saved ? (
            <>
              <Check className="h-5 w-5" aria-hidden="true" />
              Planned!
            </>
          ) : isSaving ? (
            <>
              <span className="loading loading-spinner loading-sm" aria-hidden="true" />
              Saving...
            </>
          ) : (
            'Save plan'
          )}
        </button>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label="Close" />
    </div>
  );
};

/**
 * Hook to manage planned activities in localStorage
 */
export function usePlannedActivities() {
  const [plans, setPlans] = useState<PlannedActivity[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('planned_activities');
    if (stored) {
      try {
        setPlans(JSON.parse(stored));
      } catch {
        setPlans([]);
      }
    }
  }, []);

  const addPlan = useCallback((plan: PlannedActivity) => {
    setPlans(prev => {
      const updated = [...prev, plan];
      localStorage.setItem('planned_activities', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removePlan = useCallback((planId: string) => {
    setPlans(prev => {
      const updated = prev.filter(p => p.id !== planId);
      localStorage.setItem('planned_activities', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getUpcoming = useCallback(() => {
    const now = new Date();
    return plans
      .filter(p => new Date(p.plannedFor) >= now)
      .sort((a, b) => new Date(a.plannedFor).getTime() - new Date(b.plannedFor).getTime());
  }, [plans]);

  return { plans, addPlan, removePlan, getUpcoming };
}

export default PlanItSheet;
