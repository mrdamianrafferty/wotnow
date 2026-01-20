/**
 * /api/grow/marketplace/seeds/messages
 *
 * API endpoint for seed swap messaging.
 * Users can send messages about listings and view conversations.
 *
 * GET: Get messages for a listing or all user's conversations
 * POST: Send a message about a listing
 *
 * @module pages/api/grow/marketplace/seeds/messages
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

interface SendMessageRequest {
  listingId: string;
  message: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const accessToken = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = user.id;

  // GET - Get messages
  if (req.method === 'GET') {
    try {
      const listingId = req.query.listingId as string;
      const unreadOnly = req.query.unreadOnly === 'true';

      // Get messages for a specific listing
      if (listingId) {
        // Verify user has access (sender, recipient, or listing owner)
        const { data: listing } = await supabase
          .from('grow_seed_listings')
          .select('user_id')
          .eq('id', listingId)
          .single();

        if (!listing) {
          return res.status(404).json({ error: 'Listing not found' });
        }

        const { data: messages, error } = await supabase
          .from('grow_seed_messages')
          .select('*')
          .eq('listing_id', listingId)
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[Seed Messages] Error fetching:', error);
          return res.status(500).json({ error: 'Failed to fetch messages' });
        }

        // Mark messages as read if user is recipient
        const unreadMessageIds = (messages || [])
          .filter(m => m.recipient_id === userId && !m.is_read)
          .map(m => m.id);

        if (unreadMessageIds.length > 0) {
          await supabase
            .from('grow_seed_messages')
            .update({ is_read: true })
            .in('id', unreadMessageIds);
        }

        return res.status(200).json({ messages: messages || [] });
      }

      // Get all user's conversations (inbox view)
      let query = supabase
        .from('grow_seed_messages')
        .select(`
          id,
          listing_id,
          sender_id,
          recipient_id,
          message,
          is_read,
          created_at,
          grow_seed_listings!inner (
            plant_name,
            variety,
            user_id
          )
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('is_read', false).eq('recipient_id', userId);
      }

      const { data: messages, error } = await query.limit(100);

      if (error) {
        console.error('[Seed Messages] Error fetching conversations:', error);
        return res.status(500).json({ error: 'Failed to fetch conversations' });
      }

      // Group by listing and get latest message
      const conversationMap = new Map<string, {
        listingId: string;
        plantName: string;
        variety: string | null;
        isListingOwner: boolean;
        latestMessage: {
          id: string;
          message: string;
          senderId: string;
          isRead: boolean;
          createdAt: string;
        };
        unreadCount: number;
      }>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const msg of (messages as any[]) || []) {
        const listing = msg.grow_seed_listings;
        const existing = conversationMap.get(msg.listing_id);

        if (!existing) {
          conversationMap.set(msg.listing_id, {
            listingId: msg.listing_id,
            plantName: listing?.plant_name,
            variety: listing?.variety,
            isListingOwner: listing?.user_id === userId,
            latestMessage: {
              id: msg.id,
              message: msg.message,
              senderId: msg.sender_id,
              isRead: msg.is_read,
              createdAt: msg.created_at,
            },
            unreadCount: (!msg.is_read && msg.recipient_id === userId) ? 1 : 0,
          });
        } else {
          if (!msg.is_read && msg.recipient_id === userId) {
            existing.unreadCount++;
          }
        }
      }

      const conversations = Array.from(conversationMap.values());

      return res.status(200).json({
        conversations,
        totalUnread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
      });
    } catch (error) {
      console.error('[Seed Messages] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST - Send a message
  if (req.method === 'POST') {
    const body = req.body as SendMessageRequest;

    if (!body.listingId || !body.message?.trim()) {
      return res.status(400).json({
        error: 'listingId and message are required',
      });
    }

    try {
      // Get the listing to find the recipient
      const { data: listing } = await supabase
        .from('grow_seed_listings')
        .select('user_id, status, plant_name')
        .eq('id', body.listingId)
        .single();

      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      if (listing.status !== 'active') {
        return res.status(400).json({ error: 'Cannot message about inactive listings' });
      }

      // Determine recipient
      // If user is listing owner, find the most recent sender
      // Otherwise, send to listing owner
      let recipientId = listing.user_id;

      if (listing.user_id === userId) {
        // Listing owner responding - find who they're replying to
        const { data: lastMessage } = await supabase
          .from('grow_seed_messages')
          .select('sender_id')
          .eq('listing_id', body.listingId)
          .neq('sender_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMessage) {
          recipientId = lastMessage.sender_id;
        } else {
          return res.status(400).json({
            error: 'Cannot send message - no conversation found',
          });
        }
      }

      // Create the message
      const { data: message, error } = await supabase
        .from('grow_seed_messages')
        .insert({
          listing_id: body.listingId,
          sender_id: userId,
          recipient_id: recipientId,
          message: body.message.trim(),
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        console.error('[Seed Messages] Error sending:', error);
        return res.status(500).json({ error: 'Failed to send message' });
      }

      // Increment listing views if this is first contact
      const { count } = await supabase
        .from('grow_seed_messages')
        .select('id', { count: 'exact', head: true })
        .eq('listing_id', body.listingId)
        .eq('sender_id', userId);

      if (count === 1) {
        await supabase
          .from('grow_seed_listings')
          .update({ views_count: supabase.rpc('increment_views') })
          .eq('id', body.listingId);
      }

      return res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      console.error('[Seed Messages] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
