/**
 * Plant Health Log Components
 *
 * Form for recording health observations and timeline for viewing history.
 *
 * @module components/grow/PlantHealthLog
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  X,
  Loader2,
  Heart,
  Droplets,
  Camera,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface Plant {
  id: string;
  name: string;
}

interface HealthLog {
  id: string;
  plantId: string;
  observedAt: string;
  healthScore: number;
  symptoms: string[];
  symptomNotes: string | null;
  heightCm: number | null;
  leafCount: number | null;
  flowerCount: number | null;
  fruitCount: number | null;
  soilMoisture: 'dry' | 'moist' | 'wet' | null;
  photoUrl: string | null;
  weatherSnapshot: Record<string, unknown> | null;
  createdAt: string;
}

const SYMPTOM_OPTIONS = [
  { value: 'yellowing_leaves', label: 'Yellowing leaves', emoji: '💛' },
  { value: 'browning_leaves', label: 'Brown spots/edges', emoji: '🟤' },
  { value: 'wilting', label: 'Wilting', emoji: '😔' },
  { value: 'drooping', label: 'Drooping', emoji: '⬇️' },
  { value: 'pest_damage', label: 'Pest damage', emoji: '🐛' },
  { value: 'holes_in_leaves', label: 'Holes in leaves', emoji: '🕳️' },
  { value: 'spots', label: 'Spots/discoloration', emoji: '⭕' },
  { value: 'mold', label: 'Mold/fungus', emoji: '🦠' },
  { value: 'stunted_growth', label: 'Stunted growth', emoji: '📉' },
  { value: 'leggy', label: 'Leggy/stretched', emoji: '📏' },
  { value: 'leaf_drop', label: 'Leaf drop', emoji: '🍂' },
  { value: 'no_flowers', label: 'Not flowering', emoji: '🌸' },
];

// =============================================================================
// HEALTH LOG FORM
// =============================================================================

interface HealthLogFormProps {
  plant: Plant;
  onClose: () => void;
  onSuccess?: () => void;
}

export function HealthLogForm({ plant, onClose, onSuccess }: HealthLogFormProps) {
  const [healthScore, setHealthScore] = useState(7);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomNotes, setSymptomNotes] = useState('');
  const [soilMoisture, setSoilMoisture] = useState<'dry' | 'moist' | 'wet' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const toggleSymptom = (value: string) => {
    setSymptoms((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const submitLog = async () => {
    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in');
        return;
      }

      const response = await fetch('/api/grow/outcomes/health-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plantId: plant.id,
          healthScore,
          symptoms: symptoms.length > 0 ? symptoms : undefined,
          symptomNotes: symptomNotes || undefined,
          soilMoisture: soilMoisture || undefined,
        }),
      });

      if (response.ok) {
        toast.success('Health observation recorded');
        onSuccess?.();
        onClose();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record observation');
      }
    } catch (error) {
      console.error('Health log error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-pink-50 to-rose-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <Heart className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Health Check</h2>
                <p className="text-sm text-gray-500">{plant.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto flex-1 space-y-5">
            {/* Health Score */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Overall Health (1-10)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={healthScore}
                  onChange={(e) => setHealthScore(parseInt(e.target.value))}
                  className="flex-1 accent-pink-500"
                />
                <span
                  className={`text-lg font-bold w-8 text-center ${
                    healthScore >= 8
                      ? 'text-emerald-600'
                      : healthScore >= 5
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {healthScore}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Poor</span>
                <span>Average</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Soil Moisture */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Droplets className="h-4 w-4" />
                Soil Moisture
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'dry', label: 'Dry', color: 'bg-amber-100 text-amber-700' },
                  { value: 'moist', label: 'Moist', color: 'bg-emerald-100 text-emerald-700' },
                  { value: 'wet', label: 'Wet', color: 'bg-blue-100 text-blue-700' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setSoilMoisture(
                        soilMoisture === opt.value ? null : (opt.value as 'dry' | 'moist' | 'wet')
                      )
                    }
                    className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      soilMoisture === opt.value
                        ? `${opt.color} border-current`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptoms */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Any issues? (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_OPTIONS.map((symptom) => (
                  <button
                    key={symptom.value}
                    onClick={() => toggleSymptom(symptom.value)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      symptoms.includes(symptom.value)
                        ? 'bg-red-100 text-red-700 border-2 border-red-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-1">{symptom.emoji}</span>
                    {symptom.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            {symptoms.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                <Textarea
                  placeholder="Describe what you observed..."
                  value={symptomNotes}
                  onChange={(e) => setSymptomNotes(e.target.value)}
                  className="h-20 text-sm resize-none"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 border-t bg-gray-50">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={submitLog}
              disabled={isSubmitting}
              className="flex-1 bg-pink-600 hover:bg-pink-700 gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// HEALTH TIMELINE
// =============================================================================

interface HealthTimelineProps {
  plantId: string;
  compact?: boolean;
}

export function HealthTimeline({ plantId, compact = false }: HealthTimelineProps) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

  const supabase = createClient();

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/grow/outcomes/health-log?plantId=${plantId}&limit=20`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.error('Error fetching health logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [plantId, supabase]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-4 text-center">
        <Heart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No health observations yet</p>
        <p className="text-xs text-gray-400 mt-1">Track your plant&apos;s health over time</p>
      </div>
    );
  }

  // Calculate trend
  const recentLogs = logs.slice(0, 5);
  const avgScore = recentLogs.reduce((sum, l) => sum + l.healthScore, 0) / recentLogs.length;
  const trend =
    recentLogs.length >= 2
      ? recentLogs[0].healthScore - recentLogs[recentLogs.length - 1].healthScore
      : 0;

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
            <Heart className="h-5 w-5 text-pink-600" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Health Timeline</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Avg: {avgScore.toFixed(1)}/10</span>
              {trend > 0 && (
                <span className="flex items-center text-emerald-600">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  Improving
                </span>
              )}
              {trend < 0 && (
                <span className="flex items-center text-red-600">
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                  Declining
                </span>
              )}
              {trend === 0 && (
                <span className="flex items-center text-gray-500">
                  <Minus className="h-3 w-3 mr-0.5" />
                  Stable
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Timeline */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t"
          >
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={log.id} className="flex gap-3">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        log.healthScore >= 8
                          ? 'bg-emerald-500'
                          : log.healthScore >= 5
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    >
                      {log.healthScore}
                    </div>
                    {index < logs.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-3">
                    <div className="text-sm text-gray-500">
                      {new Date(log.observedAt).toLocaleDateString('en-IE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>

                    {/* Symptoms */}
                    {log.symptoms && log.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {log.symptoms.map((s) => {
                          const symptom = SYMPTOM_OPTIONS.find((opt) => opt.value === s);
                          return (
                            <span
                              key={s}
                              className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full"
                            >
                              {symptom?.emoji} {symptom?.label || s}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Soil moisture */}
                    {log.soilMoisture && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <Droplets className="h-3 w-3" />
                        Soil: {log.soilMoisture}
                      </div>
                    )}

                    {/* Notes */}
                    {log.symptomNotes && (
                      <p className="mt-1 text-xs text-gray-400 italic">
                        &quot;{log.symptomNotes}&quot;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// QUICK HEALTH CHECK BUTTON
// =============================================================================

interface QuickHealthCheckButtonProps {
  plant: Plant;
  onSuccess?: () => void;
}

export function QuickHealthCheckButton({ plant, onSuccess }: QuickHealthCheckButtonProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-sm font-medium transition-colors"
      >
        <Heart className="h-4 w-4" />
        Health Check
      </button>

      {showForm && (
        <HealthLogForm
          plant={plant}
          onClose={() => setShowForm(false)}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}
