// API endpoint for submitting votes to polls
import { NextApiRequest, NextApiResponse } from 'next';
import { SharingService } from '../../../lib/services/sharingService';
import { generateDeviceFingerprint } from '../../../lib/utils/idGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      pollId,
      placeId,
      etaMinutes,
      accessibilityNeeded
    } = req.body;

    // Validation
    if (!pollId || !placeId) {
      return res.status(400).json({ 
        error: 'Missing required fields: pollId, placeId' 
      });
    }

    const deviceFingerprint = generateDeviceFingerprint(req);
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';

    const vote = await SharingService.submitVote({
      pollId,
      placeId,
      deviceFingerprint,
      etaMinutes,
      accessibilityNeeded,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress
    });

    if (!vote) {
      return res.status(409).json({ error: 'Already voted or rate limited' });
    }

    return res.status(201).json({ vote, success: true });
  } catch (error) {
    console.error('Vote API error:', error);
    
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
