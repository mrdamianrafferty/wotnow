import type { NextApiRequest, NextApiResponse } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';
import { serializePlant, type PlantRow, type InsertPlantRow } from '../../../../lib/grow/server/plants';
import { getTierLimits, type GrowSubscriptionTier } from '../../../../lib/grow/subscription';

const ALLOWED_HEALTH_VALUES = new Set(['excellent', 'good', 'fair', 'poor']);

/**
 * Try to find a species_slug for a plant by name
 * Uses fuzzy matching similar to the planting calendar
 */
async function findSpeciesSlugByName(
  supabase: SupabaseClient,
  plantName: string,
  plantType: string
): Promise<string | null> {
  const normalizedName = plantName.toLowerCase().trim();

  // Fetch species to match against
  const { data: species, error } = await supabase
    .from('plant_species')
    .select('slug, name');

  if (error || !species) {
    return null;
  }

  // Build maps for lookup
  const nameToSlug = new Map<string, string>();
  const slugSet = new Set<string>();
  for (const sp of species) {
    if (sp.name) {
      nameToSlug.set(sp.name.toLowerCase().trim(), sp.slug);
    }
    slugSet.add(sp.slug);
  }

  // Direct match by name
  let matchedSlug = nameToSlug.get(normalizedName);

  // Check if plant name matches a slug directly (e.g., "Pepper" -> "pepper" slug)
  if (!matchedSlug && slugSet.has(normalizedName)) {
    matchedSlug = normalizedName;
  }

  // Try extracting base name (e.g., "Tomato (slicer)" -> "tomato")
  if (!matchedSlug) {
    const baseName = normalizedName.split(/[\s(\/]/)[0].trim();
    if (baseName !== normalizedName) {
      matchedSlug = nameToSlug.get(baseName);
      if (!matchedSlug && slugSet.has(baseName)) {
        matchedSlug = baseName;
      }
    }
  }

  // Try with fruit- prefix for fruit trees
  if (!matchedSlug && (plantType === 'fruit-tree' || plantType === 'fruit')) {
    const fruitSlug = `fruit-${normalizedName}`;
    if (slugSet.has(fruitSlug)) {
      matchedSlug = fruitSlug;
    }
    if (!matchedSlug) {
      const baseName = normalizedName.split(/[\s(\/]/)[0].trim();
      const fruitBaseSlug = `fruit-${baseName}`;
      if (slugSet.has(fruitBaseSlug)) {
        matchedSlug = fruitBaseSlug;
      }
    }
  }

  // Try with herb- prefix
  if (!matchedSlug && (plantType === 'herb' || plantType === 'ornamental')) {
    const herbSlug = `herb-${normalizedName}`;
    if (slugSet.has(herbSlug)) {
      matchedSlug = herbSlug;
    }
  }

  // Try with tree- prefix
  if (!matchedSlug && plantType === 'tree') {
    const treeSlug = `tree-${normalizedName}`;
    if (slugSet.has(treeSlug)) {
      matchedSlug = treeSlug;
    }
  }

  return matchedSlug || null;
}

function toIsoString(value?: unknown): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) {
    return;
  }

  const { supabase, userId } = auth;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('grow_user_plants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[grow] Failed to load plants for user', userId, error);
      return res.status(500).json({
        error: error.message || 'Failed to load plants',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }

    const plants = (data as PlantRow[]).map(serializePlant);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('grow_onboarding_completed, grow_onboarding_completed_at, grow_subscription_tier')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.warn('[grow] Failed to load onboarding status for user', userId, profileError);
    }

    const userTier = (profile?.grow_subscription_tier as GrowSubscriptionTier) || 'seed';
    const limits = getTierLimits(userTier);

    return res.status(200).json({
      plants,
      onboardingCompleted: Boolean(profile?.grow_onboarding_completed),
      onboardingCompletedAt: profile?.grow_onboarding_completed_at ?? null,
      // Include limit info for UI
      plantCount: plants.length,
      plantLimit: limits.maxPlants,
      tier: userTier,
    });
  }

  // =========================================================================
  // PLANT COUNT LIMIT CHECK (for POST)
  // =========================================================================

  // Get user's subscription tier
  const { data: tierProfile } = await supabase
    .from('profiles')
    .select('grow_subscription_tier')
    .eq('id', userId)
    .single();

  const userTier = (tierProfile?.grow_subscription_tier as GrowSubscriptionTier) || 'seed';
  const limits = getTierLimits(userTier);
  const maxPlants = limits.maxPlants;

  // Check current plant count if there's a limit
  if (maxPlants !== -1) {
    const { count, error: countError } = await supabase
      .from('grow_user_plants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('[grow] Failed to count plants for user', userId, countError);
    } else if (count !== null && count >= maxPlants) {
      console.log(`[grow] Plant limit reached for user ${userId}: ${count}/${maxPlants} plants`);
      return res.status(403).json({
        error: 'Plant limit reached',
        message: `You've reached your limit of ${maxPlants} plants. Upgrade to track more plants.`,
        currentCount: count,
        limit: maxPlants,
        tier: userTier,
        upgradeUrl: '/grow/premium',
      });
    }
  }

  const { 
    name, 
    type, 
    location, 
    health, 
    planted, 
    lastWatered, 
    notes,
    // Enhanced fields
    speciesSlug,
    variety,
    quantity,
    source,
    expectedHarvest,
    costCents,
    photoUrl,
    // Custom species fields (for plants not in our database)
    scientificName,
    wikiDescription,
    wikiUrl,
    wikiImageUrl,
    wikiImageLicense,
    identificationData,
    isCommunityPhoto,
    communityPhotoUrl,
    bedId,
  } = req.body ?? {};

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  const normalizedHealth = typeof health === 'string' && ALLOWED_HEALTH_VALUES.has(health)
    ? health
    : 'good';

  // Auto-lookup species_slug if not provided
  let effectiveSpeciesSlug = speciesSlug ? String(speciesSlug).trim() : null;
  if (!effectiveSpeciesSlug) {
    effectiveSpeciesSlug = await findSpeciesSlugByName(supabase, String(name), String(type));
  }

  const insertPayload: InsertPlantRow = {
    user_id: userId,
    name: String(name).trim(),
    type: String(type).trim(),
    location: location ? String(location).trim() : null,
    health: normalizedHealth,
    planted_at: toIsoString(planted),
    last_watered_at: toIsoString(lastWatered),
    notes: notes ? String(notes) : null,
    // Enhanced fields - auto-lookup if not provided
    species_slug: effectiveSpeciesSlug,
    variety: variety ? String(variety).trim() : null,
    quantity: typeof quantity === 'number' && quantity > 0 ? quantity : null,
    source: source ? String(source).trim() : null,
    expected_harvest_at: toIsoString(expectedHarvest),
    cost_cents: typeof costCents === 'number' && costCents >= 0 ? costCents : null,
    photo_url: photoUrl ? String(photoUrl).trim() : null,
    // Custom species fields (for plants not in our database)
    scientific_name: scientificName ? String(scientificName).trim() : null,
    wiki_description: wikiDescription ? String(wikiDescription) : null,
    wiki_url: wikiUrl ? String(wikiUrl).trim() : null,
    wiki_image_url: wikiImageUrl ? String(wikiImageUrl).trim() : null,
    wiki_image_license: wikiImageLicense ? String(wikiImageLicense).trim() : null,
    identification_data: identificationData && typeof identificationData === 'object' ? identificationData : null,
    is_community_photo: typeof isCommunityPhoto === 'boolean' ? isCommunityPhoto : false,
    community_photo_url: communityPhotoUrl ? String(communityPhotoUrl).trim() : null,
    bed_id: bedId && typeof bedId === 'string' ? bedId : null,
  };

  const { data, error } = await supabase
    .from('grow_user_plants')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    console.error('[grow] Failed to add plant for user', userId, error);
    return res.status(500).json({
      error: error.message || 'Failed to add plant',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }

  // If this is a custom plant (no species_slug), track the suggestion
  if (!speciesSlug && scientificName) {
    try {
      // Get the common names from identification data if available
      const commonNames = identificationData?.species?.commonNames || [];
      
      // Extract wikiUrl - could be a string or an object with language keys from Plant.id
      let effectiveWikiUrl = wikiUrl || null;
      if (!effectiveWikiUrl && identificationData?.species?.wikiUrl) {
        const urlData = identificationData.species.wikiUrl;
        if (typeof urlData === 'string') {
          effectiveWikiUrl = urlData;
        } else if (typeof urlData === 'object') {
          // Prefer English, then other languages
          effectiveWikiUrl = urlData.en || urlData.de || urlData.fr || urlData.es || urlData.it || urlData.pt || urlData.nl || null;
        }
      }
      
      // Fall back to identification data for wikiDescription if not in request body
      const effectiveWikiDescription = wikiDescription || identificationData?.species?.wikiDescription || null;
      
      await supabase.rpc('upsert_species_suggestion', {
        p_scientific_name: String(scientificName).trim(),
        p_common_name: String(name).trim(),
        p_common_names: Array.isArray(commonNames) ? commonNames : [],
        p_user_id: userId,
        p_wiki_data: identificationData ? {
          wikiDescription: effectiveWikiDescription,
          wikiUrl: effectiveWikiUrl,
          watering: identificationData?.species?.watering || null,
          edibleParts: identificationData?.species?.edibleParts || null,
          propagationMethods: identificationData?.species?.propagationMethods || null,
        } : null,
        p_wiki_image_url: wikiImageUrl || identificationData?.species?.wikiImageUrl || null,
        p_wiki_image_license: wikiImageLicense || identificationData?.species?.wikiImageLicense || null,
        p_community_photo_url: communityPhotoUrl || null,
      });
      console.log(`[grow] Tracked species suggestion: ${scientificName} (wikiDescription: ${effectiveWikiDescription ? 'yes' : 'no'})`);
    } catch (suggestionError) {
      // Don't fail the request if suggestion tracking fails
      console.warn('[grow] Failed to track species suggestion:', suggestionError);
    }
  }

  return res.status(201).json({ plant: serializePlant(data as PlantRow) });
}
