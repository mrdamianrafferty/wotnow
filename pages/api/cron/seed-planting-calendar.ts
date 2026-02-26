import type { NextApiRequest, NextApiResponse } from 'next';
import { seedPlantingCalendar } from '../../../lib/grow/plantingCalendarSeeder';
import { verifyCronAuth } from '@/lib/cron-auth';

const logger = {
  info: (...args: unknown[]) => console.info('[planting-calendar]', ...args),
  warn: (...args: unknown[]) => console.warn('[planting-calendar]', ...args),
  error: (...args: unknown[]) => console.error('[planting-calendar]', ...args),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyCronAuth(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const dryRun = typeof req.query.dryRun !== 'undefined';
  const sourceUrl = typeof req.query.source === 'string' ? req.query.source : undefined;

  try {
    const result = await seedPlantingCalendar({
      dryRun,
      sourceUrl,
      logger,
    });

    return res.status(200).json({
      success: true,
      dryRun,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Seeding run failed', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
}
