/**
 * Grewp Groups Discovery Card
 *
 * Integrates with the Grewp API to show nearby gardening groups
 * or prompt users to start their own.
 *
 * @module components/grow/GrewpGroupsCard
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MapPin,
  Star,
  ChevronRight,
  Sparkles,
  Leaf,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

interface GrewpGroup {
  id: string;
  name: string;
  slug: string;
  description?: string;
  locationText?: string;
  distanceKm: number;
  audienceType: string;
  requiresApproval: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  url: string;
}

interface GrewpActivity {
  id: string;
  emoji: string;
  name: string;
  category: string;
}

interface GrewpResponse {
  activity: GrewpActivity;
  groups: GrewpGroup[];
  startYourOwn: {
    prompt: string;
    suggestedEvents: string[];
    url: string;
  };
}

interface GrewpGroupsCardProps {
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number;
  compact?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const GREWP_API_BASE = 'https://grewp.org/api/go-daisy';
const ACTIVITY_ID = 'outdoor_gardening';

// =============================================================================
// COMPONENT
// =============================================================================

export function GrewpGroupsCard({
  latitude: propLat,
  longitude: propLng,
  radiusKm = 30,
  compact = false,
}: GrewpGroupsCardProps) {
  const [data, setData] = useState<GrewpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    typeof propLat === 'number' && typeof propLng === 'number'
      ? { lat: propLat, lng: propLng }
      : null
  );

  const supabase = createClient();

  // Fetch user coordinates from Supabase if not provided via props
  useEffect(() => {
    if (coords) return;

    const fetchUserCoords = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: prefs } = await supabase
          .from('grow_user_preferences')
          .select('latitude, longitude')
          .eq('user_id', user.id)
          .single();

        if (prefs?.latitude && prefs?.longitude) {
          setCoords({ lat: prefs.latitude, lng: prefs.longitude });
        }
      } catch (err) {
        console.debug('[GrewpGroupsCard] Could not fetch user coords:', err);
      }
    };

    fetchUserCoords();
  }, [coords, supabase]);

  // Update coords if props change
  useEffect(() => {
    if (typeof propLat === 'number' && typeof propLng === 'number') {
      setCoords({ lat: propLat, lng: propLng });
    }
  }, [propLat, propLng]);

  // Fetch groups when we have coordinates
  useEffect(() => {
    if (!coords) return;

    const fetchGroups = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `${GREWP_API_BASE}/${ACTIVITY_ID}?lat=${coords.lat}&lng=${coords.lng}&radiusKm=${radiusKm}`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch groups');
        }

        const result: GrewpResponse = await response.json();
        setData(result);
      } catch (err) {
        console.error('[GrewpGroupsCard] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load groups');
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [coords, radiusKm]);

  const latitude = coords?.lat;
  const longitude = coords?.lng;
  const hasLocation = !!coords;

  // Don't render if no location
  if (!hasLocation) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Finding gardening groups nearby...</span>
        </div>
      </div>
    );
  }

  // Error state - show subtle retry option
  if (error) {
    return (
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-500">
            <Users className="h-5 w-5" />
            <span className="text-sm">Couldn&apos;t load local groups</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError(null);
              setLoading(true);
              // Re-trigger fetch
              const url = `${GREWP_API_BASE}/${ACTIVITY_ID}?lat=${latitude}&lng=${longitude}&radiusKm=${radiusKm}`;
              fetch(url)
                .then((r) => r.json())
                .then(setData)
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // No data yet
  if (!data) {
    return null;
  }

  const hasGroups = data.groups.length > 0;
  const topGroups = compact ? data.groups.slice(0, 2) : data.groups.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-xl">{data.activity.emoji}</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {hasGroups ? 'Local Gardening Groups' : 'Start a Gardening Group'}
            </h3>
            <p className="text-sm text-gray-500">
              {hasGroups
                ? `${data.groups.length} group${data.groups.length !== 1 ? 's' : ''} near you`
                : 'Be the first in your area!'}
            </p>
          </div>
        </div>
        {hasGroups && data.groups.length > 2 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-emerald-600 text-sm font-medium hover:underline"
          >
            {expanded ? 'Show less' : `+${data.groups.length - 2} more`}
          </button>
        )}
      </div>

      {/* Groups List */}
      {hasGroups && (
        <div className="divide-y">
          <AnimatePresence>
            {(expanded ? data.groups : topGroups).map((group, index) => (
              <motion.a
                key={group.id}
                href={group.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 truncate">{group.name}</h4>
                    {group.ratingAverage && group.ratingCount && group.ratingCount > 0 && (
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-xs font-medium">{group.ratingAverage.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-3 w-3" />
                    <span>{group.distanceKm.toFixed(1)} km away</span>
                    {group.locationText && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="truncate">{group.locationText}</span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
              </motion.a>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Start Your Own Section */}
      {!hasGroups && (
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">{data.startYourOwn.prompt}</p>

          {/* Suggested Events */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Suggested first events:
            </p>
            <div className="flex flex-wrap gap-2">
              {data.startYourOwn.suggestedEvents.map((event, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  {event}
                </span>
              ))}
            </div>
          </div>

          <a
            href={data.startYourOwn.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            <Leaf className="h-4 w-4" />
            Start a Gardening Group
            <ExternalLink className="h-3.5 w-3.5 ml-1" />
          </a>
        </div>
      )}

      {/* Browse All Link (when groups exist) */}
      {hasGroups && (
        <div className="p-3 border-t bg-gray-50">
          <a
            href={data.startYourOwn.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <span>Start your own group on Grewp</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT PREVIEW COMPONENT
// =============================================================================

interface GrewpPreviewChipProps {
  latitude?: number | null;
  longitude?: number | null;
  onClick?: () => void;
}

/**
 * Compact chip showing group count - for use in headers/toolbars
 */
export function GrewpPreviewChip({ latitude: propLat, longitude: propLng, onClick }: GrewpPreviewChipProps) {
  const [groupCount, setGroupCount] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    typeof propLat === 'number' && typeof propLng === 'number'
      ? { lat: propLat, lng: propLng }
      : null
  );

  const supabase = createClient();

  // Fetch user coordinates if not provided
  useEffect(() => {
    if (coords) return;

    const fetchUserCoords = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: prefs } = await supabase
          .from('grow_user_preferences')
          .select('latitude, longitude')
          .eq('user_id', user.id)
          .single();

        if (prefs?.latitude && prefs?.longitude) {
          setCoords({ lat: prefs.latitude, lng: prefs.longitude });
        }
      } catch (err) {
        console.debug('[GrewpPreviewChip] Could not fetch user coords:', err);
      }
    };

    fetchUserCoords();
  }, [coords, supabase]);

  // Update coords if props change
  useEffect(() => {
    if (typeof propLat === 'number' && typeof propLng === 'number') {
      setCoords({ lat: propLat, lng: propLng });
    }
  }, [propLat, propLng]);

  // Fetch group count
  useEffect(() => {
    if (!coords) return;

    fetch(`${GREWP_API_BASE}/${ACTIVITY_ID}?lat=${coords.lat}&lng=${coords.lng}&radiusKm=30`)
      .then((r) => r.json())
      .then((data: GrewpResponse) => setGroupCount(data.groups.length))
      .catch(() => setGroupCount(null));
  }, [coords]);

  if (!coords || groupCount === null) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium transition-colors"
    >
      <Users className="h-4 w-4" />
      {groupCount > 0 ? `${groupCount} local group${groupCount !== 1 ? 's' : ''}` : 'Start a group'}
    </button>
  );
}
