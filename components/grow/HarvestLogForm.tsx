/**
 * Harvest Log Form
 *
 * A form for recording harvest outcomes from plants.
 * Captures quantity, quality, and expectations.
 *
 * @module components/grow/HarvestLogForm
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import {
  X,
  Loader2,
  Star,
  Leaf,
  Scale,
  Calendar,
  ChevronRight,
  Check,
  Sparkles,
  ThumbsUp,
  Minus,
  ThumbsDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

interface Plant {
  id: string;
  name: string;
  plantedAt?: string;
  speciesSlug?: string;
}

interface HarvestLogFormProps {
  plant: Plant;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'quantity' | 'quality' | 'expectations' | 'done';

const QUANTITY_UNITS = [
  { value: 'count', label: 'Count', placeholder: 'e.g., 12' },
  { value: 'kg', label: 'kg', placeholder: 'e.g., 2.5' },
  { value: 'lbs', label: 'lbs', placeholder: 'e.g., 5' },
  { value: 'bunches', label: 'Bunches', placeholder: 'e.g., 3' },
  { value: 'handfuls', label: 'Handfuls', placeholder: 'e.g., 4' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function HarvestLogForm({ plant, onClose, onSuccess }: HarvestLogFormProps) {
  const [step, setStep] = useState<Step>('quantity');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [quantityValue, setQuantityValue] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('count');
  const [qualityRating, setQualityRating] = useState(0);
  const [qualityNotes, setQualityNotes] = useState('');
  const [metExpectations, setMetExpectations] = useState<string | null>(null);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);

  const supabase = createClient();

  // Calculate days from planting
  const daysFromPlanting = plant.plantedAt
    ? Math.floor(
        (new Date(harvestDate).getTime() - new Date(plant.plantedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : undefined;

  const submitHarvest = async () => {
    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to record harvest');
        return;
      }

      const response = await fetch('/api/grow/outcomes/harvest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plantId: plant.id,
          harvestDate,
          quantityValue: quantityValue ? parseFloat(quantityValue) : undefined,
          quantityUnit: quantityValue ? quantityUnit : undefined,
          qualityRating: qualityRating || undefined,
          qualityNotes: qualityNotes || undefined,
          metExpectations: metExpectations || undefined,
          daysFromPlanting,
        }),
      });

      if (response.ok) {
        setStep('done');
        onSuccess?.();

        // Auto-close after showing success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to record harvest');
      }
    } catch (error) {
      console.error('Harvest submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record harvest');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (step === 'quantity') setStep('quality');
    else if (step === 'quality') setStep('expectations');
    else if (step === 'expectations') submitHarvest();
  };

  const goBack = () => {
    if (step === 'quality') setStep('quantity');
    else if (step === 'expectations') setStep('quality');
  };

  const canProceed = () => {
    if (step === 'quantity') return true; // Optional
    if (step === 'quality') return true; // Optional
    if (step === 'expectations') return true; // Optional
    return false;
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
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-50 to-green-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Leaf className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Log Harvest</h2>
                <p className="text-sm text-gray-500">{plant.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress indicator */}
          {step !== 'done' && (
            <div className="flex px-4 pt-3 gap-1">
              {['quantity', 'quality', 'expectations'].map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    ['quantity', 'quality', 'expectations'].indexOf(step) >= i
                      ? 'bg-emerald-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            {/* Step 1: Quantity */}
            {step === 'quantity' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-gray-700">
                  <Scale className="h-4 w-4" />
                  <span className="font-medium">How much did you harvest?</span>
                </div>

                {/* Date picker */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    className="flex-1"
                  />
                </div>

                {/* Quantity input */}
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={
                      QUANTITY_UNITS.find((u) => u.value === quantityUnit)?.placeholder
                    }
                    value={quantityValue}
                    onChange={(e) => setQuantityValue(e.target.value)}
                    className="flex-1"
                  />
                  <select
                    value={quantityUnit}
                    onChange={(e) => setQuantityUnit(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-white text-sm"
                  >
                    {QUANTITY_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>

                {daysFromPlanting !== undefined && daysFromPlanting > 0 && (
                  <p className="text-xs text-gray-500">
                    {daysFromPlanting} days since planting
                  </p>
                )}

                <p className="text-xs text-gray-400">
                  Skip if you don&apos;t want to track quantity
                </p>
              </motion.div>
            )}

            {/* Step 2: Quality */}
            {step === 'quality' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-gray-700">
                  <Star className="h-4 w-4" />
                  <span className="font-medium">How was the quality?</span>
                </div>

                {/* Star rating */}
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setQualityRating(star)}
                      className="p-2 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= qualityRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {qualityRating > 0 && (
                  <p className="text-center text-sm text-gray-600">
                    {qualityRating === 5 && 'Excellent!'}
                    {qualityRating === 4 && 'Great quality'}
                    {qualityRating === 3 && 'Good, average'}
                    {qualityRating === 2 && 'Below average'}
                    {qualityRating === 1 && 'Poor quality'}
                  </p>
                )}

                {/* Notes */}
                <Textarea
                  placeholder="Any notes about the quality? (optional)"
                  value={qualityNotes}
                  onChange={(e) => setQualityNotes(e.target.value)}
                  className="h-20 text-sm resize-none"
                />
              </motion.div>
            )}

            {/* Step 3: Expectations */}
            {step === 'expectations' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-gray-700">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">Did it meet your expectations?</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: 'exceeded',
                      label: 'Exceeded!',
                      icon: Sparkles,
                      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                    },
                    {
                      value: 'met',
                      label: 'Met expectations',
                      icon: ThumbsUp,
                      color: 'text-blue-600 bg-blue-50 border-blue-200',
                    },
                    {
                      value: 'below',
                      label: 'Below expectations',
                      icon: Minus,
                      color: 'text-amber-600 bg-amber-50 border-amber-200',
                    },
                    {
                      value: 'failed',
                      label: 'Failed/lost crop',
                      icon: ThumbsDown,
                      color: 'text-red-600 bg-red-50 border-red-200',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMetExpectations(opt.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        metExpectations === opt.value
                          ? opt.color
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <opt.icon
                        className={`h-5 w-5 mb-1 ${
                          metExpectations === opt.value
                            ? ''
                            : 'text-gray-400'
                        }`}
                      />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-gray-400 text-center">
                  This helps improve predictions for other gardeners
                </p>
              </motion.div>
            )}

            {/* Done */}
            {step === 'done' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Harvest Logged!
                </h3>
                <p className="text-sm text-gray-500">
                  Thanks for contributing to better gardening predictions
                </p>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          {step !== 'done' && (
            <div className="flex gap-3 p-4 border-t bg-gray-50">
              {step !== 'quantity' && (
                <Button variant="outline" onClick={goBack} className="flex-1">
                  Back
                </Button>
              )}
              <Button
                onClick={goNext}
                disabled={!canProceed() || isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : step === 'expectations' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Save
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// QUICK HARVEST BUTTON
// =============================================================================

interface QuickHarvestButtonProps {
  plant: Plant;
  onSuccess?: () => void;
}

export function QuickHarvestButton({ plant, onSuccess }: QuickHarvestButtonProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition-colors"
      >
        <Leaf className="h-4 w-4" />
        Log Harvest
      </button>

      {showForm && (
        <HarvestLogForm
          plant={plant}
          onClose={() => setShowForm(false)}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}
