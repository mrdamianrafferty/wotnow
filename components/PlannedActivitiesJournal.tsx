/**
 * Planned Activities Journal
 *
 * Go Daisy+ feature: plan activities with weather snapshots,
 * mark as completed/skipped, rate, and add notes.
 *
 * @module components/PlannedActivitiesJournal
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  CalendarPlus,
  Check,
  X,
  Star,
  Loader2,
  ChevronDown,
  Trash2,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface PlannedActivity {
  id: string;
  activity_key: string;
  planned_date: string;
  location_name: string | null;
  notes: string | null;
  status: 'planned' | 'completed' | 'skipped' | 'cancelled';
  completed_at: string | null;
  rating: number | null;
  created_at: string;
}

interface PlannedActivitiesJournalProps {
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PlannedActivitiesJournal({ className = '' }: PlannedActivitiesJournalProps) {
  const [activities, setActivities] = useState<PlannedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/godaisy/planned-activities', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        if (res.status === 403) {
          setError('Go Daisy+ required');
        } else {
          setError('Failed to load activities');
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setActivities(data.activities || []);
    } catch {
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const updateActivity = async (id: string, updates: Partial<PlannedActivity>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/godaisy/planned-activities?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setActivities(prev =>
          prev.map(a => a.id === id ? data.activity : a)
        );
      }
    } catch (err) {
      console.error('Failed to update activity:', err);
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/godaisy/planned-activities?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setActivities(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete activity:', err);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <p className="text-sm text-gray-500 text-center">{error}</p>
      </div>
    );
  }

  const planned = activities.filter(a => a.status === 'planned');
  const completed = activities.filter(a => a.status === 'completed');

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-cyan-600" />
            Activity Journal
          </h3>
          <span className="text-xs text-gray-500">
            {planned.length} planned, {completed.length} completed
          </span>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center">
          <CalendarPlus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            No planned activities yet. Tap an activity card to plan it.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {activities.slice(0, 10).map(activity => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              onUpdate={updateActivity}
              onDelete={deleteActivity}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ActivityRow({
  activity,
  onUpdate,
  onDelete,
}: {
  activity: PlannedActivity;
  onUpdate: (id: string, updates: Partial<PlannedActivity>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isUpcoming = activity.status === 'planned' && new Date(activity.planned_date) >= new Date();
  const isPast = activity.status === 'planned' && new Date(activity.planned_date) < new Date();

  const statusColors = {
    planned: isUpcoming ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700',
    completed: 'bg-green-50 text-green-700',
    skipped: 'bg-gray-50 text-gray-500',
    cancelled: 'bg-red-50 text-red-500',
  };

  return (
    <div className="px-4 py-3">
      <button
        className="w-full flex items-center gap-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {activity.activity_key.replaceAll('_', ' ')}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[activity.status]}`}>
              {isPast && activity.status === 'planned' ? 'missed' : activity.status}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {new Date(activity.planned_date).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            {activity.location_name && ` \u00B7 ${activity.location_name}`}
          </div>
        </div>
        {activity.rating && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: activity.rating }).map((_, i) => (
              <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />
            ))}
          </div>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3 pl-0 space-y-2">
          {activity.notes && (
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              {activity.notes}
            </p>
          )}

          {activity.status === 'planned' && (
            <div className="flex gap-2">
              <button
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                onClick={() => onUpdate(activity.id, {
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                })}
              >
                <Check className="h-3 w-3" /> Done
              </button>
              <button
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                onClick={() => onUpdate(activity.id, { status: 'skipped' })}
              >
                <X className="h-3 w-3" /> Skip
              </button>
              <button
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 hover:text-red-700 ml-auto"
                onClick={() => onDelete(activity.id)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}

          {activity.status === 'completed' && !activity.rating && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Rate:</span>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => onUpdate(activity.id, { rating: star })}
                  className="hover:scale-110 transition-transform"
                >
                  <Star className="h-4 w-4 text-gray-300 hover:text-amber-400 hover:fill-amber-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
