import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Health check endpoint for NCEI ERDDAP (temperature data)
 *
 * Tests: https://www.ncei.noaa.gov/erddap/griddap/noaacwBLENDEDsstDaily.html
 *
 * Usage with UptimeRobot:
 * - URL: https://www.fishfindr.eu/api/health/erddap-ncei-status
 * - Method: GET
 * - Expected: 200 OK
 * - Alert on: 503 Service Unavailable
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test NCEI ERDDAP with the main page
    const testUrl = 'https://www.ncei.noaa.gov/erddap/index.html';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return res.status(200).json({
        status: 'healthy',
        service: 'NCEI ERDDAP',
        endpoint: 'www.ncei.noaa.gov/erddap',
        dataset: 'noaacwBLENDEDsstDaily',
        checked_at: new Date().toISOString(),
      });
    } else {
      return res.status(503).json({
        status: 'unhealthy',
        service: 'NCEI ERDDAP',
        endpoint: 'www.ncei.noaa.gov/erddap',
        http_status: response.status,
        checked_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(503).json({
      status: 'error',
      service: 'NCEI ERDDAP',
      endpoint: 'www.ncei.noaa.gov/erddap',
      error: errorMessage,
      checked_at: new Date().toISOString(),
    });
  }
}
