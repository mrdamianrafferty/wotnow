/**
 * /api/findr/species/suggestions
 * 
 * Generate smart species suggestions for a user
 * Categories: youveCaught, hotRightNow, localFavorites, seasonalPeak
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  try {
    const { userId, icesSquare } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId parameter is required' });
    }
    
    if (!icesSquare || typeof icesSquare !== 'string') {
      return res.status(400).json({ error: 'icesSquare parameter is required' });
    }
    
    // Get species user has caught
    const { data: userCatches } = await supabase
      .from('findr_catch_entries')
      .select('species_id, species_common_name, scientific_name')
      .eq('user_id', userId);
    
    const userSpeciesIds = new Set(userCatches?.map(c => c.species_id) || []);
    
    // Get user's existing favourites to exclude
    const { data: existingFavourites } = await supabase
      .from('user_favourites')
      .select('species_id')
      .eq('user_id', userId);
    
    const favouriteIds = new Set(existingFavourites?.map(f => f.species_id) || []);
    
    // Get local favorites (popular in region)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: regionalCatches } = await supabase
      .from('findr_catch_entries')
      .select('species_id, species_common_name, scientific_name')
      .eq('rectangle_code', icesSquare)
      .gte('caught_at', thirtyDaysAgo.toISOString());
    
    // Aggregate regional catches
    interface SpeciesData {
      id: string;
      commonName: string;
      scientificName?: string;
    }
    
    interface SpeciesSuggestion {
      species: SpeciesData;
      category: string;
      reason: string;
      userHasCaught: boolean;
      userCatchCount?: number;
      regionalPopularity?: number;
    }
    
    const regionalPopularity = new Map<string, { species: SpeciesData; count: number }>();
    regionalCatches?.forEach(catch_ => {
      const key = catch_.species_id;
      if (regionalPopularity.has(key)) {
        regionalPopularity.get(key)!.count++;
      } else {
        regionalPopularity.set(key, {
          species: {
            id: catch_.species_id,
            commonName: catch_.species_common_name,
            scientificName: catch_.scientific_name
          },
          count: 1
        });
      }
    });
    
    // Build suggestion categories
    const suggestions = {
      youveCaught: [] as SpeciesSuggestion[],
      hotRightNow: [] as SpeciesSuggestion[], // TODO: Need live conditions scoring
      localFavorites: [] as SpeciesSuggestion[],
      seasonalPeak: [] as SpeciesSuggestion[], // TODO: Need species seasonal data
      allRegional: [] as SpeciesSuggestion[]
    };
    
    // You've caught (exclude already favourited)
    suggestions.youveCaught = userCatches
      ?.filter(catch_ => !favouriteIds.has(catch_.species_id))
      .map(catch_ => ({
        species: {
          id: catch_.species_id,
          commonName: catch_.species_common_name,
          scientificName: catch_.scientific_name
        },
        category: 'youve-caught',
        reason: 'You have successfully caught this species before',
        userHasCaught: true,
        userCatchCount: userCatches.filter(c => c.species_id === catch_.species_id).length
      }))
      .slice(0, 10) || [];
    
    // Local favorites (popular + not already favourited)
    suggestions.localFavorites = Array.from(regionalPopularity.values())
      .filter(item => !favouriteIds.has(item.species.id))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => ({
        species: item.species,
        category: 'local-favorites',
        reason: `Popular in your area (${item.count} recent catches)`,
        userHasCaught: userSpeciesIds.has(item.species.id),
        regionalPopularity: item.count
      }));
    
    // All regional (everything available, not favourited)
    suggestions.allRegional = Array.from(regionalPopularity.values())
      .filter(item => !favouriteIds.has(item.species.id))
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        species: item.species,
        category: 'all-regional',
        reason: `Found in ${icesSquare}`,
        userHasCaught: userSpeciesIds.has(item.species.id),
        regionalPopularity: item.count
      }));
    
    // TODO: Hot right now - needs live conditions + species preference scoring
    // TODO: Seasonal peak - needs species seasonal data
    
    return res.status(200).json({
      success: true,
      userId,
      icesSquare,
      suggestions,
      notes: [
        'hotRightNow requires live conditions scoring engine',
        'seasonalPeak requires species seasonal preference data',
        'Species details (images, habitat) require species_data table'
      ]
    });
    
  } catch (error) {
    console.error('[species-suggestions] API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
