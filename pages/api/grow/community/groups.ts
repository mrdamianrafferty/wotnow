/**
 * /api/grow/community/groups
 *
 * API endpoint for community groups (regional gardening groups).
 *
 * GET: List groups (nearby or user's groups)
 * POST: Create a new group
 *
 * @module pages/api/grow/community/groups
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

interface CreateGroupRequest {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  isPublic?: boolean;
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

  if (req.method === 'GET') {
    try {
      const latitude = parseFloat(req.query.lat as string);
      const longitude = parseFloat(req.query.lon as string);
      const radiusKm = parseFloat(req.query.radius as string) || 50;
      const myGroups = req.query.myGroups === 'true';

      if (myGroups) {
        // Get user's joined groups
        const { data: memberships, error: memberError } = await supabase
          .from('grow_community_members')
          .select(`
            group_id,
            role,
            joined_at,
            grow_community_groups (
              id,
              name,
              description,
              latitude,
              longitude,
              radius_km,
              member_count,
              is_public,
              created_at
            )
          `)
          .eq('user_id', userId);

        if (memberError) {
          console.error('[Community Groups] Error fetching memberships:', memberError);
          return res.status(500).json({ error: 'Failed to fetch groups' });
        }

        const groups = memberships?.map(m => ({
          ...m.grow_community_groups,
          role: m.role,
          joined_at: m.joined_at,
        })) || [];

        return res.status(200).json({ groups });
      }

      // Find nearby groups
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          error: 'latitude and longitude are required for nearby search',
        });
      }

      // Use the RPC function we created in the migration
      const { data: nearbyGroups, error: nearbyError } = await supabase
        .rpc('grow_get_nearby_groups', {
          user_lat: latitude,
          user_lon: longitude,
          radius_km: radiusKm,
        });

      if (nearbyError) {
        console.error('[Community Groups] Error finding nearby:', nearbyError);
        return res.status(500).json({ error: 'Failed to find nearby groups' });
      }

      // Check which groups the user is already a member of
      const groupIds = nearbyGroups?.map((g: { id: string }) => g.id) || [];

      let membershipMap: Record<string, string> = {};
      if (groupIds.length > 0) {
        const { data: memberships } = await supabase
          .from('grow_community_members')
          .select('group_id, role')
          .eq('user_id', userId)
          .in('group_id', groupIds);

        if (memberships) {
          membershipMap = memberships.reduce((acc: Record<string, string>, m) => {
            acc[m.group_id] = m.role;
            return acc;
          }, {});
        }
      }

      const groupsWithMembership = nearbyGroups?.map((g: { id: string }) => ({
        ...g,
        is_member: !!membershipMap[g.id],
        role: membershipMap[g.id] || null,
      })) || [];

      return res.status(200).json({ groups: groupsWithMembership });
    } catch (error) {
      console.error('[Community Groups] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    const body = req.body as CreateGroupRequest;

    if (!body.name || !body.latitude || !body.longitude) {
      return res.status(400).json({
        error: 'name, latitude, and longitude are required',
      });
    }

    try {
      // Create the group
      const { data: group, error: createError } = await supabase
        .from('grow_community_groups')
        .insert({
          name: body.name,
          description: body.description,
          latitude: body.latitude,
          longitude: body.longitude,
          radius_km: body.radiusKm || 25,
          is_public: body.isPublic !== false,
          created_by: userId,
          member_count: 1, // Creator is automatically a member
        })
        .select()
        .single();

      if (createError || !group) {
        console.error('[Community Groups] Error creating:', createError);
        return res.status(500).json({ error: 'Failed to create group' });
      }

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('grow_community_members')
        .insert({
          group_id: group.id,
          user_id: userId,
          role: 'admin',
        });

      if (memberError) {
        console.error('[Community Groups] Error adding member:', memberError);
        // Don't fail - group was created
      }

      return res.status(201).json({
        success: true,
        group: {
          ...group,
          is_member: true,
          role: 'admin',
        },
      });
    } catch (error) {
      console.error('[Community Groups] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
