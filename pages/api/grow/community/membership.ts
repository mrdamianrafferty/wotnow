/**
 * /api/grow/community/membership
 *
 * API endpoint for managing group membership.
 *
 * POST: Join a group
 * DELETE: Leave a group
 *
 * @module pages/api/grow/community/membership
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
  const groupId = req.query.groupId as string;

  if (!groupId) {
    return res.status(400).json({ error: 'groupId is required' });
  }

  if (req.method === 'POST') {
    try {
      // Check if group exists and is public
      const { data: group, error: groupError } = await supabase
        .from('grow_community_groups')
        .select('id, is_public, member_count')
        .eq('id', groupId)
        .single();

      if (groupError || !group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      if (!group.is_public) {
        return res.status(403).json({ error: 'This group is private. Request an invite.' });
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('grow_community_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'Already a member of this group' });
      }

      // Join the group
      const { error: joinError } = await supabase
        .from('grow_community_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member',
        });

      if (joinError) {
        console.error('[Community Membership] Join error:', joinError);
        return res.status(500).json({ error: 'Failed to join group' });
      }

      // Increment member count
      await supabase
        .from('grow_community_groups')
        .update({ member_count: (group.member_count || 0) + 1 })
        .eq('id', groupId);

      return res.status(201).json({
        success: true,
        message: 'Successfully joined group',
      });
    } catch (error) {
      console.error('[Community Membership] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Check current membership
      const { data: membership, error: memberError } = await supabase
        .from('grow_community_members')
        .select('id, role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (memberError || !membership) {
        return res.status(404).json({ error: 'Not a member of this group' });
      }

      // Check if user is the only admin
      if (membership.role === 'admin') {
        const { data: otherAdmins } = await supabase
          .from('grow_community_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('role', 'admin')
          .neq('user_id', userId);

        if (!otherAdmins || otherAdmins.length === 0) {
          return res.status(400).json({
            error: 'Cannot leave: You are the only admin. Transfer admin to another member first.',
          });
        }
      }

      // Leave the group
      const { error: leaveError } = await supabase
        .from('grow_community_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (leaveError) {
        console.error('[Community Membership] Leave error:', leaveError);
        return res.status(500).json({ error: 'Failed to leave group' });
      }

      // Decrement member count
      const { data: group } = await supabase
        .from('grow_community_groups')
        .select('member_count')
        .eq('id', groupId)
        .single();

      if (group) {
        await supabase
          .from('grow_community_groups')
          .update({ member_count: Math.max(0, (group.member_count || 1) - 1) })
          .eq('id', groupId);
      }

      return res.status(200).json({
        success: true,
        message: 'Successfully left group',
      });
    } catch (error) {
      console.error('[Community Membership] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
