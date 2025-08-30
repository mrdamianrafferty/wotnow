// API endpoint for creating and managing polls
import { NextApiRequest, NextApiResponse } from 'next';
import { SharingService } from '../../../lib/services/sharingService';
import { db } from '../../../lib/db/sharing';
import { generateDeviceFingerprint } from '../../../lib/utils/idGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'POST':
        return await createPoll(req, res);
      case 'GET':
        return await getPoll(req, res);
      default:
        res.setHeader('Allow', ['POST', 'GET']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Poll API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createPoll(req: NextApiRequest, res: NextApiResponse) {
  const {
    userId,
    activityId,
    activityName,
    startTime,
    candidates,
    toneHint = 'group'
  } = req.body;

  // Validation
  if (!userId || !activityId || !activityName || !startTime || !candidates) {
    return res.status(400).json({ 
      error: 'Missing required fields: userId, activityId, activityName, startTime, candidates' 
    });
  }

  if (!Array.isArray(candidates) || candidates.length < 2 || candidates.length > 5) {
    return res.status(400).json({ 
      error: 'Candidates must be an array with 2-5 options' 
    });
  }

  const poll = await SharingService.createPoll({
    userId,
    activityId,
    activityName,
    startTime,
    candidates,
    toneHint
  });

  // Generate WhatsApp-optimized share message
  const startTimeFormatted = new Date(startTime).toLocaleString('en-GB', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  let shareMessage = `Vote a spot for ${activityName} (${startTimeFormatted}):\n`;
  
  candidates.forEach((candidate, index) => {
    const optionUrl = `${poll.longUrl}?vote=${candidate.placeId}`;
    shareMessage += `${index + 1}) ${candidate.name} — ${candidate.address.split(',')[0]}\n`;
  });
  
  shareMessage += `\n${poll.shortUrl}`;

  return res.status(201).json({
    poll,
    shareMessage,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
  });
}

async function getPoll(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid poll ID' });
  }

  const results = await SharingService.getPollResults(id);
  if (!results) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  // Track analytics
  await db.updatePollAnalytics(id, 'opens');

  return res.status(200).json(results);
}
