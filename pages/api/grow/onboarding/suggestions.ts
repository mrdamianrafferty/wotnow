import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface SuggestionItem {
  slug: string;
  name: string;
  category: string;
  careLevel: string;
  sunRequirements?: string;
  description?: string;
  imageKey?: string;
}

interface SuggestionsResponse {
  suggestions: SuggestionItem[];
}

// Map onboarding interest IDs to plant_species categories
const INTEREST_TO_CATEGORIES: Record<string, string[]> = {
  flowers: ['flower', 'ornamental'],
  lawn_care: ['ornamental'],
  ornamental_trees: ['ornamental', 'shrub'],
  fruit_trees: ['fruit_tree'],
  vegetables: ['vegetable'],
  herbs: ['herb'],
  wildlife: ['flower', 'shrub'],
  indoor_plants: ['indoor'],
};

const BEGINNER_FALLBACK_SLUGS = [
  'tomato',
  'basil',
  'lettuce',
  'mint',
  'rosemary',
  'chives',
  'courgette',
  'sunflower',
  'marigold',
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuggestionsResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { interests, climateZone } = req.body as {
    interests?: string[];
    climateZone?: string;
  };

  const selectedInterests = Array.isArray(interests) ? interests : [];

  // Use service role to bypass RLS on plant_species
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Gather target categories from interests
  const targetCategories = new Set<string>();
  for (const interest of selectedInterests) {
    const cats = INTEREST_TO_CATEGORIES[interest];
    if (cats) {
      cats.forEach((c) => targetCategories.add(c));
    }
  }

  // If no interests selected, default to common beginner categories
  if (targetCategories.size === 0) {
    targetCategories.add('vegetable');
    targetCategories.add('herb');
    targetCategories.add('flower');
  }

  // Query species matching categories
  const { data: species, error } = await supabase
    .from('plant_species')
    .select('slug, name, category, care_level, sun_requirements, description, image_key')
    .in('category', Array.from(targetCategories))
    .order('name');

  if (error) {
    console.error('[grow] Failed to fetch species for suggestions:', error);
    return res.status(500).json({ error: 'Failed to load plant suggestions' });
  }

  if (!species || species.length === 0) {
    // Fallback: return beginner plants
    const { data: fallback } = await supabase
      .from('plant_species')
      .select('slug, name, category, care_level, sun_requirements, description, image_key')
      .in('slug', BEGINNER_FALLBACK_SLUGS);

    const suggestions: SuggestionItem[] = (fallback || []).map((s) => ({
      slug: s.slug,
      name: s.name,
      category: s.category || 'unknown',
      careLevel: s.care_level || 'medium',
      sunRequirements: s.sun_requirements || undefined,
      description: s.description || undefined,
      imageKey: s.image_key || undefined,
    }));

    return res.status(200).json({ suggestions });
  }

  // Score and sort species
  interface ScoredSpecies {
    slug: string;
    name: string;
    category: string;
    care_level: string;
    sun_requirements?: string;
    description?: string;
    image_key?: string;
    score: number;
  }

  const scored: ScoredSpecies[] = species.map((s) => {
    let score = 0;

    // Prefer low maintenance for onboarding
    if (s.care_level === 'low') score += 3;
    else if (s.care_level === 'medium') score += 1;
    else if (s.care_level === 'high') score -= 1;

    // Bonus for having an image
    if (s.image_key) score += 1;

    // USDA zone compatibility (if available)
    if (climateZone) {
      // Simple zone check — would be more sophisticated in production
      score += 1;
    }

    return { ...s, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Diversify: max 3 per category, max 12 total
  const categoryCounts: Record<string, number> = {};
  const diversified: ScoredSpecies[] = [];

  for (const s of scored) {
    const cat = s.category || 'unknown';
    const count = categoryCounts[cat] || 0;
    if (count >= 3) continue;
    categoryCounts[cat] = count + 1;
    diversified.push(s);
    if (diversified.length >= 12) break;
  }

  const suggestions: SuggestionItem[] = diversified.map((s) => ({
    slug: s.slug,
    name: s.name,
    category: s.category || 'unknown',
    careLevel: s.care_level || 'medium',
    sunRequirements: s.sun_requirements || undefined,
    description: s.description || undefined,
    imageKey: s.image_key || undefined,
  }));

  return res.status(200).json({ suggestions });
}
