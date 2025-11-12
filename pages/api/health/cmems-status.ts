import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';

/**
 * CMEMS Data Health Check Endpoint
 *
 * Returns status of CMEMS data ingestion:
 * - Data freshness (how old is the latest data)
 * - Coverage (how many rectangles have data)
 * - Variables availability
 *
 * Use for monitoring/alerting systems (e.g., UptimeRobot, Pingdom, etc.)
 *
 * Returns:
 *   200: Healthy (data < 48h old, coverage > 50%)
 *   503: Unhealthy (stale data or low coverage)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = getSupabaseServerClient();

  try {
    // Get total rectangles
    const { count: totalRects } = await supabase
      .from('ices_rectangles')
      .select('*', { count: 'exact', head: true });

    // Get rectangles with conditions
    const { count: rectsWithData } = await supabase
      .from('findr_conditions_latest')
      .select('*', { count: 'exact', head: true });

    // Get latest data timestamp
    const { data: latest } = await supabase
      .from('findr_conditions_latest')
      .select('captured_at, sea_temp_c, salinity_psu, chlorophyll_mg_m3')
      .order('captured_at', { ascending: false })
      .limit(1)
      .single();

    // Get count of stale data (>48h old)
    const staleThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { count: staleCount } = await supabase
      .from('findr_conditions_latest')
      .select('*', { count: 'exact', head: true })
      .lt('captured_at', staleThreshold);

    // Calculate metrics
    const coverage = totalRects ? ((rectsWithData || 0) / totalRects * 100) : 0;
    const ageHours = latest ? (Date.now() - new Date(latest.captured_at).getTime()) / (1000 * 60 * 60) : 999;

    // Check variable availability from latest record
    let variablesAvailable = 0;
    if (latest) {
      if (latest.sea_temp_c != null) variablesAvailable++;
      if (latest.salinity_psu != null) variablesAvailable++;
      if (latest.chlorophyll_mg_m3 != null) variablesAvailable++;
    }

    // Determine health status
    const isHealthy =
      ageHours < 48 &&           // Data is fresh (<48h)
      coverage > 50 &&           // At least 50% coverage
      variablesAvailable >= 1;   // At least 1 variable available

    const status = {
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
      metrics: {
        coverage: {
          percentage: coverage.toFixed(1),
          rectangles: rectsWithData,
          total: totalRects
        },
        dataAge: {
          hours: ageHours.toFixed(1),
          timestamp: latest?.captured_at || null,
          status: ageHours < 24 ? 'fresh' : ageHours < 48 ? 'acceptable' : 'stale'
        },
        staleData: {
          count: staleCount,
          percentage: rectsWithData ? ((staleCount || 0) / rectsWithData * 100).toFixed(1) : '0'
        },
        variablesAvailable: {
          count: variablesAvailable,
          expected: 3
        }
      },
      issues: []
    };

    // Collect issues
    if (ageHours >= 48) {
      status.issues.push(`Data is stale: ${ageHours.toFixed(1)}h old (expected <48h)`);
    }
    if (coverage < 50) {
      status.issues.push(`Low coverage: ${coverage.toFixed(1)}% (expected >50%)`);
    }
    if (variablesAvailable < 1) {
      status.issues.push(`No environmental variables available`);
    }
    if (staleCount && staleCount > rectsWithData * 0.2) {
      status.issues.push(`${staleCount} rectangles have stale data (>${((staleCount || 0) / rectsWithData * 100).toFixed(0)}%)`);
    }

    // Return appropriate status code
    if (isHealthy) {
      return res.status(200).json(status);
    } else {
      return res.status(503).json(status);
    }

  } catch (error) {
    console.error('Health check error:', error);
    return res.status(503).json({
      healthy: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      issues: ['Failed to query database']
    });
  }
}
