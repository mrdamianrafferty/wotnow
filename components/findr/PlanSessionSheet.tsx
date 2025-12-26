'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { MapPin, Fish, AlertTriangle, CheckCircle2, Clock, Waves, Moon, Sunrise, Sun } from 'lucide-react';
import { PlanItSheet, type PlannedActivity } from '../PlanItSheet';
import type { TideExtreme } from '../../lib/findr/conditionHelpers';

interface SafetyCheckItem {
  id: string;
  label: string;
  checked: boolean;
}

const DEFAULT_SAFETY_CHECKS: SafetyCheckItem[] = [
  { id: 'tell_someone', label: 'Tell someone where I\'m going', checked: false },
  { id: 'check_conditions', label: 'Check swell & wind gusts', checked: false },
  { id: 'check_tides', label: 'Check tide times', checked: false },
];

export interface PlanSessionSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (plan: PlannedActivity) => void;
  /** The fishing spot/rectangle name */
  spotName: string;
  /** The rectangle code */
  rectangleCode: string;
  /** Target species name */
  speciesName: string;
  /** Species code for data */
  speciesCode: string;
  /** Confidence score for this species */
  confidence?: number;
  /** Current conditions summary (optional) */
  conditionsSummary?: string;
  /** Tide extremes for the week */
  tideExtremes?: TideExtreme[] | null;
  /** Species' preferred fishing times */
  bestTimes?: string[] | null;
  /** Recommended baits for this species */
  recommendedBaits?: string[] | null;
  /** Alternative bait suggestions */
  baitSuggestions?: string[];
  /** Moon phase name */
  moonPhase?: string | null;
  /** Moon illumination percentage */
  moonIllumination?: number | null;
}

// Helper to format time as HH:MM
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Helper to get tides for a specific date
function getTidesForDate(tides: TideExtreme[] | null | undefined, dateStr: string): TideExtreme[] {
  if (!tides || !dateStr) return [];
  const targetDate = new Date(dateStr);
  return tides.filter(tide => {
    const tideDate = new Date(tide.time);
    return tideDate.toDateString() === targetDate.toDateString();
  }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

// Map bestTimes codes to readable labels
const BEST_TIME_LABELS: Record<string, { label: string; icon: 'dawn' | 'sun' | 'moon' | 'tide' }> = {
  dawn: { label: 'Dawn (5-7am)', icon: 'dawn' },
  dusk: { label: 'Dusk (5-8pm)', icon: 'dawn' },
  day: { label: 'Daytime', icon: 'sun' },
  night: { label: 'Night fishing', icon: 'moon' },
  mid_flood: { label: 'Rising tide', icon: 'tide' },
  early_ebb: { label: 'Falling tide', icon: 'tide' },
  high_slack: { label: 'High water', icon: 'tide' },
  low_slack: { label: 'Low water', icon: 'tide' },
};

/**
 * PlanSessionSheet - Fishing-specific planning sheet
 *
 * Extends PlanItSheet with:
 * - Spot/location display (read-only)
 * - Target species display
 * - Tide times for planned day
 * - Optimal fishing times based on species preferences
 * - Quick bait reminder
 * - Moon phase info
 * - Safety checklist
 */
export const PlanSessionSheet: React.FC<PlanSessionSheetProps> = ({
  open,
  onClose,
  onSave,
  spotName,
  rectangleCode,
  speciesName,
  speciesCode,
  confidence,
  conditionsSummary,
  tideExtremes,
  bestTimes,
  recommendedBaits,
  baitSuggestions,
  moonPhase,
  moonIllumination,
}) => {
  const [safetyChecks, setSafetyChecks] = useState<SafetyCheckItem[]>(DEFAULT_SAFETY_CHECKS);

  const toggleCheck = useCallback((id: string) => {
    setSafetyChecks(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  }, []);

  const allChecked = safetyChecks.every(item => item.checked);

  const handleSave = useCallback((plan: PlannedActivity) => {
    // Add fishing-specific data to the plan
    const fishingPlan: PlannedActivity = {
      ...plan,
      activityData: {
        ...plan.activityData,
        spotName,
        rectangleCode,
        speciesName,
        speciesCode,
        confidence,
        safetyChecksCompleted: safetyChecks.filter(c => c.checked).map(c => c.id),
      },
    };
    onSave(fishingPlan);
  }, [spotName, rectangleCode, speciesName, speciesCode, confidence, safetyChecks, onSave]);

  // Reset safety checks when sheet opens
  React.useEffect(() => {
    if (open) {
      setSafetyChecks(DEFAULT_SAFETY_CHECKS);
    }
  }, [open]);

  // Get tides for today and tomorrow
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const todayTides = useMemo(() => getTidesForDate(tideExtremes, todayStr), [tideExtremes, todayStr]);
  const tomorrowTides = useMemo(() => getTidesForDate(tideExtremes, tomorrowStr), [tideExtremes, tomorrowStr]);

  // Get best times from species preferences
  const timePreferences = useMemo(() => {
    if (!bestTimes || bestTimes.length === 0) return [];
    return bestTimes
      .filter(t => BEST_TIME_LABELS[t])
      .map(t => BEST_TIME_LABELS[t])
      .slice(0, 3);
  }, [bestTimes]);

  // Get bait suggestions (prefer structured data, fallback to legacy)
  const baitList = useMemo(() => {
    if (recommendedBaits && recommendedBaits.length > 0) {
      return recommendedBaits.slice(0, 3);
    }
    if (baitSuggestions && baitSuggestions.length > 0) {
      return baitSuggestions.slice(0, 3);
    }
    return [];
  }, [recommendedBaits, baitSuggestions]);

  // Check if we have any trip insights to show
  const hasTripInsights = todayTides.length > 0 || tomorrowTides.length > 0 ||
    timePreferences.length > 0 || baitList.length > 0 || moonPhase;

  return (
    <PlanItSheet
      open={open}
      onClose={onClose}
      onSave={handleSave}
      app="findr"
      activityType="fishing_session"
      activityName={`Fishing for ${speciesName}`}
      activityData={{
        spotName,
        rectangleCode,
        speciesCode,
      }}
    >
      {/* Spot info */}
      <div className="bg-base-200 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <span className="font-medium">{spotName}</span>
          <span className="text-base-content/50 text-xs">({rectangleCode})</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Fish className="h-4 w-4 text-info shrink-0" aria-hidden="true" />
          <span>{speciesName}</span>
          {confidence !== undefined && (
            <span className={`badge badge-sm ${
              confidence >= 80 ? 'badge-success' :
              confidence >= 60 ? 'badge-warning' :
              'badge-error'
            }`}>
              {confidence}%
            </span>
          )}
        </div>
        {conditionsSummary && (
          <p className="text-xs text-base-content/60 italic">
            {conditionsSummary}
          </p>
        )}
      </div>

      {/* Trip Planning Insights */}
      {hasTripInsights && (
        <div className="space-y-3">
          <span className="text-sm font-medium text-base-content/70">Trip insights</span>

          {/* Tide times for today and tomorrow */}
          {(todayTides.length > 0 || tomorrowTides.length > 0) && (
            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-cyan-700 dark:text-cyan-300">
                <Waves className="h-4 w-4" aria-hidden="true" />
                Tide times
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {todayTides.length > 0 && (
                  <div>
                    <span className="font-medium text-base-content/70">Today</span>
                    <div className="mt-1 space-y-0.5">
                      {todayTides.map((tide, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="capitalize">{tide.type}</span>
                          <span className="font-mono">{formatTime(tide.time)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {tomorrowTides.length > 0 && (
                  <div>
                    <span className="font-medium text-base-content/70">Tomorrow</span>
                    <div className="mt-1 space-y-0.5">
                      {tomorrowTides.map((tide, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="capitalize">{tide.type}</span>
                          <span className="font-mono">{formatTime(tide.time)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Best times for this species */}
          {timePreferences.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Best times for {speciesName}
              </div>
              <div className="flex flex-wrap gap-2">
                {timePreferences.map((pref, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded">
                    {pref.icon === 'dawn' && <Sunrise className="h-3 w-3" />}
                    {pref.icon === 'sun' && <Sun className="h-3 w-3" />}
                    {pref.icon === 'moon' && <Moon className="h-3 w-3" />}
                    {pref.icon === 'tide' && <Waves className="h-3 w-3" />}
                    {pref.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bait reminder and moon phase in a row */}
          <div className="flex gap-3">
            {/* Bait reminder */}
            {baitList.length > 0 && (
              <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                  🎣 Bring
                </div>
                <div className="text-xs text-base-content/80">
                  {baitList.join(', ')}
                </div>
                <a
                  href={`/findr/bait-shops?rect=${encodeURIComponent(rectangleCode)}&bait=${encodeURIComponent(baitList[0] || '')}`}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline mt-1.5 inline-block"
                  onClick={(e) => e.stopPropagation()}
                >
                  Find bait locally →
                </a>
              </div>
            )}

            {/* Moon phase */}
            {moonPhase && (
              <div className="flex-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <div className="flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                  <Moon className="h-3 w-3" aria-hidden="true" />
                  Moon
                </div>
                <div className="text-xs text-base-content/80">
                  {moonPhase}
                  {moonIllumination != null && (
                    <span className="text-base-content/50 ml-1">({Math.round(moonIllumination)}%)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Safety checklist */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          <span className="text-sm font-medium">Safety checklist</span>
          {allChecked && (
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          )}
        </div>
        <div className="space-y-1">
          {safetyChecks.map(item => (
            <label
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={item.checked}
                onChange={() => toggleCheck(item.id)}
              />
              <span className={`text-sm ${item.checked ? 'text-success' : ''}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
        {!allChecked && (
          <p className="text-xs text-warning flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Complete safety checks before heading out
          </p>
        )}
      </div>
    </PlanItSheet>
  );
};

export default PlanSessionSheet;
