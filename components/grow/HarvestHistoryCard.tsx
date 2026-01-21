/**
 * Harvest History Card
 *
 * Displays harvest history for a plant with summary statistics.
 *
 * @module components/grow/HarvestHistoryCard
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import {
  Leaf,
  Star,
  Calendar,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Loader2,
  Scale,
  Sparkles,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface HarvestOutcome {
  id: string;
  plantId: string;
  harvestDate: string;
  quantityValue: number | null;
  quantityUnit: string | null;
  qualityRating: number | null;
  qualityNotes: string | null;
  metExpectations: 'exceeded' | 'met' | 'below' | 'failed' | null;
  daysFromPlanting: number | null;
  createdAt: string;
}

interface HarvestHistoryCardProps {
  plantId: string;
  plantName?: string;
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function HarvestHistoryCard({
  plantId,
  plantName: _plantName,
  compact = false,
}: HarvestHistoryCardProps) {
  const [harvests, setHarvests] = useState<HarvestOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchHarvests = async () => {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/grow/outcomes/harvest?plantId=${plantId}&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Transform snake_case to camelCase
          const transformed = (data.outcomes || []).map(
            (h: Record<string, unknown>) => ({
              id: h.id,
              plantId: h.plant_id,
              harvestDate: h.harvest_date,
              quantityValue: h.quantity_value,
              quantityUnit: h.quantity_unit,
              qualityRating: h.quality_rating,
              qualityNotes: h.quality_notes,
              metExpectations: h.met_expectations,
              daysFromPlanting: h.days_from_planting,
              createdAt: h.created_at,
            })
          );
          setHarvests(transformed);
        } else {
          throw new Error('Failed to fetch harvests');
        }
      } catch (err) {
        console.error('Error fetching harvests:', err);
        setError('Failed to load harvest history');
      } finally {
        setLoading(false);
      }
    };

    fetchHarvests();
  }, [plantId, supabase]);

  // Calculate statistics
  const totalHarvests = harvests.length;
  const avgQuality =
    harvests.filter((h) => h.qualityRating).length > 0
      ? harvests.reduce((sum, h) => sum + (h.qualityRating || 0), 0) /
        harvests.filter((h) => h.qualityRating).length
      : 0;
  const exceededCount = harvests.filter((h) => h.metExpectations === 'exceeded').length;
  const metCount = harvests.filter((h) => h.metExpectations === 'met').length;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border p-4 text-center text-sm text-gray-500">
        {error}
      </div>
    );
  }

  if (harvests.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-4 text-center">
        <Leaf className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No harvests recorded yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Log your first harvest to track your success
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <Leaf className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Harvest History</h3>
            <p className="text-sm text-gray-500">
              {totalHarvests} harvest{totalHarvests !== 1 ? 's' : ''} recorded
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Stats summary */}
      {!compact && (
        <div className="grid grid-cols-3 gap-2 px-4 pb-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-semibold">{avgQuality.toFixed(1)}</span>
            </div>
            <span className="text-xs text-gray-500">Avg Quality</span>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold">{exceededCount}</span>
            </div>
            <span className="text-xs text-gray-500">Exceeded</span>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="font-semibold">
                {totalHarvests > 0
                  ? Math.round(((exceededCount + metCount) / totalHarvests) * 100)
                  : 0}
                %
              </span>
            </div>
            <span className="text-xs text-gray-500">Success</span>
          </div>
        </div>
      )}

      {/* Harvest list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t"
          >
            <div className="divide-y max-h-64 overflow-y-auto">
              {harvests.map((harvest) => (
                <div key={harvest.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(harvest.harvestDate).toLocaleDateString('en-IE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Quality stars */}
                    {harvest.qualityRating && (
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= harvest.qualityRating!
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    {/* Quantity */}
                    {harvest.quantityValue && (
                      <div className="flex items-center gap-1">
                        <Scale className="h-3 w-3" />
                        <span>
                          {harvest.quantityValue} {harvest.quantityUnit}
                        </span>
                      </div>
                    )}

                    {/* Days from planting */}
                    {harvest.daysFromPlanting && (
                      <span className="text-xs text-gray-400">
                        {harvest.daysFromPlanting} days
                      </span>
                    )}

                    {/* Expectations badge */}
                    {harvest.metExpectations && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          harvest.metExpectations === 'exceeded'
                            ? 'bg-emerald-100 text-emerald-700'
                            : harvest.metExpectations === 'met'
                            ? 'bg-blue-100 text-blue-700'
                            : harvest.metExpectations === 'below'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {harvest.metExpectations === 'exceeded' && 'Exceeded'}
                        {harvest.metExpectations === 'met' && 'Met'}
                        {harvest.metExpectations === 'below' && 'Below'}
                        {harvest.metExpectations === 'failed' && 'Failed'}
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  {harvest.qualityNotes && (
                    <p className="mt-1 text-xs text-gray-400 italic">
                      &quot;{harvest.qualityNotes}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
