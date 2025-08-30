// API endpoint for creating and managing invites
import { NextApiRequest, NextApiResponse } from 'next';
import { SharingService } from '../../../lib/services/sharingService';
import { db } from '../../../lib/db/sharing';
import { generateDeviceFingerprint } from '../../../lib/utils/idGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'POST':
        return await createInvite(req, res);
      case 'GET':
        return await getInvite(req, res);
      default:
        res.setHeader('Allow', ['POST', 'GET']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Invite API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createInvite(req: NextApiRequest, res: NextApiResponse) {
  const {
    userId,
    activityId,
    activityName,
    placeId,
    placeName,
    placeAddress,
    placeLatLng,
    startTime,
    duration = 120, // default 2 hours
    toneHint = 'dm'
  } = req.body;

  // Validation
  if (!userId || !activityId || !activityName || !startTime) {
    return res.status(400).json({ 
      error: 'Missing required fields: userId, activityId, activityName, startTime' 
    });
  }

  const invite = await SharingService.createInvite({
    userId,
    activityId,
    activityName,
    placeId,
    placeName,
    placeAddress,
    placeLatLng,
    startTime,
    duration,
    toneHint
  });

  // Generate share message
  const shareMessage = SharingService.generateShareMessage(invite.messageTemplate, {
    activityName: invite.activityName,
    venueName: invite.placeName || 'TBD',
    startTime: new Date(invite.startTime).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    directionsLink: invite.placeLatLng ? 
      `https://maps.google.com/?q=${invite.placeLatLng.lat},${invite.placeLatLng.lng}` : 
      '#',
    shortUrl: invite.shortUrl
  });

  return res.status(201).json({
    invite,
    shareMessage,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
  });
}

async function getInvite(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid invite ID' });
  }

  const invite = await db.getInvite(id);
  if (!invite) {
    return res.status(404).json({ error: 'Invite not found' });
  }

  // Track analytics
  await db.updateInviteAnalytics(id, 'opens');

  return res.status(200).json({ invite });
}
