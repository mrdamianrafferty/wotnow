/**
 * API endpoint to fetch AI identification accuracy statistics
 * Used to provide feedback to the AI system about its performance
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/server';

interface AIAccuracyStats {
  rectangleCode: string;
  totalAISuggestions: number;
  correctSuggestions: number;
  correctedSuggestions: number;
  gaveUpCount: number;
  accuracyRate: number;
  giveUpRate: number;
  topMistakes?: Array<{
    suggestedSpecies: string;
    actualSpecies: string;
    count: number;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rectangleCode, since } = req.query;

  if (!rectangleCode || typeof rectangleCode !== 'string') {
    return res.status(400).json({ error: 'rectangleCode is required' });
  }

  try {
    const supabase = await createClient();

    // Default to last 90 days if since not provided (enough data for meaningful stats)
    const sinceDate = since
      ? new Date(since as string)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Query all catches with AI suggestions in this rectangle
    const { data, error } = await supabase
      .from('findr_catch_entries')
      .select('ai_suggested_species_id, ai_suggested_species_name, species_id, species_common_name, ai_was_corrected, ai_gave_up, ai_confidence')
      .eq('rectangle_code', rectangleCode)
      .gte('caught_at', sinceDate.toISOString())
      .not('ai_suggested_species_id', 'is', null); // Only catches where AI was involved

    if (error) {
      console.error('[ai-accuracy] Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!data || data.length === 0) {
      return res.status(200).json({
        rectangleCode,
        totalAISuggestions: 0,
        correctSuggestions: 0,
        correctedSuggestions: 0,
        gaveUpCount: 0,
        accuracyRate: 0,
        giveUpRate: 0,
        topMistakes: [],
        since: sinceDate.toISOString()
      });
    }

    // Calculate statistics
    const totalAISuggestions = data.length;
    type CatchEntry = {
      ai_suggested_species_id: string;
      ai_suggested_species_name?: string;
      species_id: string;
      species_common_name?: string;
      ai_was_corrected?: boolean;
      ai_gave_up?: boolean;
      ai_confidence?: number;
    };

    const correctSuggestions = data.filter((c: CatchEntry) => !c.ai_was_corrected && !c.ai_gave_up).length;
    const correctedSuggestions = data.filter((c: CatchEntry) => c.ai_was_corrected).length;
    const gaveUpCount = data.filter((c: CatchEntry) => c.ai_gave_up).length;

    // Calculate accuracy rate (exclude gave-up cases from accuracy calculation)
    const aiAttempts = totalAISuggestions - gaveUpCount;
    const accuracyRate = aiAttempts > 0 ? correctSuggestions / aiAttempts : 0;
    const giveUpRate = totalAISuggestions > 0 ? gaveUpCount / totalAISuggestions : 0;

    // Identify top mistakes (where AI was corrected)
    const mistakes = new Map<string, { suggested: string; actual: string; count: number }>();

  for (const catch_ of data.filter((c: CatchEntry) => c.ai_was_corrected)) {
      const key = `${catch_.ai_suggested_species_id}->${catch_.species_id}`;
      const existing = mistakes.get(key);

      if (existing) {
        existing.count++;
      } else {
        mistakes.set(key, {
          suggested: catch_.ai_suggested_species_name || catch_.ai_suggested_species_id,
          actual: catch_.species_common_name || catch_.species_id,
          count: 1
        });
      }
    }

    const topMistakes = Array.from(mistakes.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(m => ({
        suggestedSpecies: m.suggested,
        actualSpecies: m.actual,
        count: m.count
      }));

    const stats: AIAccuracyStats = {
      rectangleCode,
      totalAISuggestions,
      correctSuggestions,
      correctedSuggestions,
      gaveUpCount,
      accuracyRate: Math.round(accuracyRate * 100) / 100, // Round to 2 decimals
      giveUpRate: Math.round(giveUpRate * 100) / 100,
      topMistakes,
    };

    return res.status(200).json({
      ...stats,
      since: sinceDate.toISOString()
    });
  } catch (error) {
    console.error('[ai-accuracy] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
