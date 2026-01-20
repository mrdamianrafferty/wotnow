/**
 * Task Feedback Prompt
 *
 * A prompt that appears after completing a task to collect feedback.
 * Shows thumbs up/down and optional detailed feedback.
 *
 * @module components/grow/TaskFeedbackPrompt
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import {
  ThumbsUp,
  ThumbsDown,
  X,
  Loader2,
  MessageSquare,
  Star,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

interface TaskFeedbackPromptProps {
  taskId: string;
  taskType: string;
  taskName: string;
  plantId?: string;
  onClose: () => void;
  onFeedbackSubmitted?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TaskFeedbackPrompt({
  taskId,
  taskType,
  taskName,
  plantId,
  onClose,
  onFeedbackSubmitted,
}: TaskFeedbackPromptProps) {
  const [step, setStep] = useState<'initial' | 'details' | 'done'>('initial');
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const submitFeedback = async (helpful: boolean, includeDetails = false) => {
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to submit feedback');
        return;
      }

      const response = await fetch('/api/grow/outcomes/task-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          taskId,
          taskType,
          plantId,
          wasHelpful: helpful,
          feedbackRating: includeDetails ? rating : undefined,
          feedbackText: includeDetails ? feedbackText : undefined,
        }),
      });

      if (response.ok) {
        setStep('done');
        onFeedbackSubmitted?.();

        // Auto-close after showing thank you
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFeedback = (helpful: boolean) => {
    setWasHelpful(helpful);
    if (helpful) {
      // For positive feedback, just submit quickly
      submitFeedback(helpful);
    } else {
      // For negative feedback, ask for details
      setStep('details');
    }
  };

  const handleDetailedSubmit = () => {
    submitFeedback(wasHelpful || false, true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <span className="text-sm font-medium text-gray-700">
            Task Completed!
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 'initial' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <p className="text-sm text-gray-600">
                Was this task helpful for <strong>{taskName}</strong>?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 hover:bg-green-50 hover:border-green-300"
                  onClick={() => handleQuickFeedback(true)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      Yes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 hover:bg-red-50 hover:border-red-300"
                  onClick={() => handleQuickFeedback(false)}
                  disabled={isSubmitting}
                >
                  <ThumbsDown className="h-4 w-4 text-red-600" />
                  No
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  How would you rate this task?
                </p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-600 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Tell us more (optional)
                </label>
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What could be improved?"
                  className="h-20 text-sm resize-none"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('initial')}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleDetailedSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Submit'
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-2"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <ThumbsUp className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Thanks for your feedback!
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// OUTCOME FOLLOW-UP PROMPT
// =============================================================================

interface OutcomeFollowUpProps {
  feedbackId: string;
  taskName: string;
  onClose: () => void;
}

export function OutcomeFollowUpPrompt({
  feedbackId,
  taskName,
  onClose,
}: OutcomeFollowUpProps) {
  const [outcome, setOutcome] = useState<string | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [notes] = useState(''); // Notes can be added in future UI expansion
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const submitOutcome = async () => {
    if (!outcome) return;

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in');
        return;
      }

      const response = await fetch('/api/grow/outcomes/task-feedback', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          feedbackId,
          outcome,
          outcomeNotes: notes,
          wouldRecommend,
        }),
      });

      if (response.ok) {
        toast.success('Thanks for the follow-up!');
        onClose();
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      console.error('Outcome submission error:', error);
      toast.error('Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
    >
      <div className="flex items-center justify-between p-3 border-b">
        <span className="text-sm font-medium text-gray-700">
          Quick Follow-Up
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-600">
          How did things turn out after <strong>{taskName}</strong>?
        </p>

        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'improved', label: 'Improved', emoji: '✨' },
            { value: 'no_change', label: 'No change', emoji: '➡️' },
            { value: 'worsened', label: 'Got worse', emoji: '😟' },
            { value: 'unknown', label: "Can't tell", emoji: '🤷' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOutcome(opt.value)}
              className={`p-2 text-sm rounded-lg border transition-colors ${
                outcome === opt.value
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {outcome && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Would you recommend this task?</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setWouldRecommend(true)}
                  className={`p-1 rounded ${wouldRecommend === true ? 'bg-green-100' : ''}`}
                >
                  <ThumbsUp className="h-4 w-4 text-green-600" />
                </button>
                <button
                  onClick={() => setWouldRecommend(false)}
                  className={`p-1 rounded ${wouldRecommend === false ? 'bg-red-100' : ''}`}
                >
                  <ThumbsDown className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={submitOutcome}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Submit'
              )}
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
