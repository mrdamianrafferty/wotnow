/**
 * /api/grow/marketplace/affiliates
 *
 * API endpoint for affiliate gardening products.
 * Browse tools, seeds, soil, pots, and fertilizers with affiliate links.
 *
 * GET: Browse products by category or get featured items
 *
 * @module pages/api/grow/marketplace/affiliates
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type ProductCategory = 'tools' | 'seeds' | 'soil' | 'pots' | 'fertilizer';

const VALID_CATEGORIES: ProductCategory[] = ['tools', 'seeds', 'soil', 'pots', 'fertilizer'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse query params
    const category = req.query.category as string;
    const featuredOnly = req.query.featured === 'true';
    const tags = (req.query.tags as string)?.split(',').filter(Boolean);
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category as ProductCategory)) {
      return res.status(400).json({
        error: 'Invalid category',
        validCategories: VALID_CATEGORIES,
      });
    }

    // Build query
    let query = supabase
      .from('grow_affiliate_products')
      .select('id, name, description, category, affiliate_url, image_url, price_from_cents, currency, rating, is_featured, tags, updated_at');

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (featuredOnly) {
      query = query.eq('is_featured', true);
    }

    if (tags && tags.length > 0) {
      // Filter products that have ANY of the specified tags
      query = query.overlaps('tags', tags);
    }

    // Order by featured first, then by rating
    query = query
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data: products, error, count } = await query;

    if (error) {
      console.error('[Affiliates API] Error fetching:', error);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    // Format products for response
    const formattedProducts = (products || []).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      affiliateUrl: p.affiliate_url,
      imageUrl: p.image_url,
      priceFrom: p.price_from_cents ? {
        cents: p.price_from_cents,
        currency: p.currency,
        formatted: `${p.currency === 'EUR' ? '€' : '$'}${(p.price_from_cents / 100).toFixed(2)}`,
      } : null,
      rating: p.rating,
      isFeatured: p.is_featured,
      tags: p.tags || [],
    }));

    // Get all available categories with counts
    const { data: categoryData } = await supabase
      .from('grow_affiliate_products')
      .select('category');

    const categoryCounts: Record<string, number> = {};
    for (const item of categoryData || []) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    }

    return res.status(200).json({
      products: formattedProducts,
      pagination: {
        offset,
        limit,
        total: count || formattedProducts.length,
        hasMore: (offset + formattedProducts.length) < (count || formattedProducts.length),
      },
      categories: VALID_CATEGORIES.map(cat => ({
        id: cat,
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        count: categoryCounts[cat] || 0,
      })),
      filters: {
        category,
        featured: featuredOnly,
        tags,
      },
    });
  } catch (error) {
    console.error('[Affiliates API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
