'use client';

import React, { useState, useCallback } from 'react';
import { MapPin, Fish, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PlanItSheet, type PlannedActivity } from '../PlanItSheet';

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
}

/**
 * PlanSessionSheet - Fishing-specific planning sheet
 *
 * Extends PlanItSheet with:
 * - Spot/location display (read-only)
 * - Target species display
 * - Conditions summary
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
