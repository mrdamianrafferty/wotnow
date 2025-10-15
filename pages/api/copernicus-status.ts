/**
 * Copernicus Monitoring Dashboard API
 * 
 * Returns health metrics for monitoring dashboard
 * GET /api/copernicus-status
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Get dashboard summary
    const { data: summary, error: summaryError } = await supabase
      .from('copernicus_dashboard_summary')
      .select('*')
      .single();

    if (summaryError) throw summaryError;

    // Get recent ingestion logs
    const { data: recentLogs, error: logsError } = await supabase
      .from('copernicus_ingestion_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (logsError) throw logsError;

    // Get health summary metrics
    const { data: healthMetrics, error: healthError } = await supabase
      .rpc('get_copernicus_health_summary');

    if (healthError) throw healthError;

    // Get unresolved alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('copernicus_alerts')
      .select('*')
      .eq('resolved', false)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (alertsError) throw alertsError;

    // Get rectangles needing attention
    const { data: staleRectangles, error: staleError } = await supabase
      .rpc('check_for_stale_data')
      .limit(20);

    if (staleError) throw staleError;

    // Get failing rectangles
    const { data: failingRectangles, error: failingError } = await supabase
      .from('copernicus_rectangle_health')
      .select('*')
      .gt('consecutive_failures', 3)
      .order('consecutive_failures', { ascending: false })
      .limit(20);

    if (failingError) throw failingError;

    // Calculate overall health score (0-100)
    const avgSuccessRate = summary?.avg_success_rate_7d || 0;
    const unresolvedAlerts = summary?.unresolved_alerts || 0;
    const staleCount = summary?.rectangles_stale || 0;
    const failingCount = summary?.rectangles_failing || 0;

    let healthScore = 100;
    healthScore -= (100 - avgSuccessRate) * 0.5; // Success rate has 50% weight
    healthScore -= Math.min(unresolvedAlerts * 5, 20); // Alerts cost 5 points each, max 20
    healthScore -= Math.min(staleCount * 2, 15); // Stale rectangles cost 2 points each, max 15
    healthScore -= Math.min(failingCount * 3, 15); // Failing rectangles cost 3 points each, max 15
    healthScore = Math.max(0, Math.round(healthScore));

    const healthStatus = 
      healthScore >= 90 ? 'excellent' :
      healthScore >= 75 ? 'good' :
      healthScore >= 50 ? 'fair' :
      healthScore >= 25 ? 'poor' : 'critical';

    return res.status(200).json({
      health_score: healthScore,
      health_status: healthStatus,
      summary,
      health_metrics: healthMetrics,
      recent_logs: recentLogs,
      alerts,
      stale_rectangles: staleRectangles,
      failing_rectangles: failingRectangles,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching Copernicus status:', error);
    return res.status(500).json({
      error: 'Failed to fetch status',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
