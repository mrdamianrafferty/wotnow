import type { NextApiRequest, NextApiResponse } from 'next';
import { fishIdService } from '@/lib/findr/fishIdentificationService';

interface StatsResponse {
  aiAvailable: boolean;
  monthlyUsage: number;
  remainingBudget: number;
  pricePerCall: number;
  monthlyBudget?: number;
  cacheSize?: number;
}

/**
 * Get fish identification service statistics
 *
 * Returns:
 * - aiAvailable: Whether AI identification is enabled
 * - monthlyUsage: Current monthly spend in euros
 * - remainingBudget: Remaining budget in euros
 * - pricePerCall: Cost per identification
 * - monthlyBudget: Total monthly budget
 * - cacheSize: Number of cached identifications
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const stats = await fishIdService.getStats();

    // Cache stats for 1 minute
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

    return res.status(200).json(stats);
  } catch (error) {
    console.error('[identify-stats] Error:', error);

    return res.status(500).json({
      error: 'Failed to load stats'
    });
  }
}
