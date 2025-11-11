import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

if (!jwtSecret) {
  throw new Error('Missing JWT_SECRET environment variable');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface UnsubscribeTokenPayload {
  userId: string;
  type: 'unsubscribe';
}

/**
 * API Route: Email Unsubscribe
 *
 * Handles one-click unsubscribe from email notifications.
 * Uses signed JWT tokens for security without requiring user login.
 *
 * GET /api/findr/unsubscribe?token=xxx - Unsubscribe user from all emails
 * POST /api/findr/unsubscribe/generate - Generate unsubscribe token (internal use)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      return handleUnsubscribe(req, res);
    } else if (req.method === 'POST' && req.query.action === 'generate') {
      return handleGenerateToken(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[Unsubscribe] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/findr/unsubscribe?token=xxx
 * Unsubscribes user from all email notifications
 */
async function handleUnsubscribe(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ error: 'Missing unsubscribe token' });
    }

    // Verify the JWT token
    let payload: UnsubscribeTokenPayload;
    try {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload: decoded } = await jwtVerify(token, secret);
      payload = decoded as unknown as UnsubscribeTokenPayload;
    } catch (error) {
      console.error('[Unsubscribe] Invalid token:', error);
      return res.status(400).json({ error: 'Invalid or expired unsubscribe token' });
    }

    if (payload.type !== 'unsubscribe') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    const userId = payload.userId;

    // Update user preferences to disable all emails
    const { data: updated, error: updateError } = await supabase
      .from('user_notification_preferences')
      .update({
        daily_email_enabled: false,
        weekly_forecast_enabled: false,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      // If preferences don't exist yet, create them with emails disabled
      if (updateError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('user_notification_preferences')
          .insert({
            user_id: userId,
            hot_bite_alerts_enabled: true,
            hot_bite_channels: { push: true },
            daily_email_enabled: false,
            daily_email_time: '08:00:00',
            weekly_forecast_enabled: false,
            weekly_forecast_day: 1,
            weekly_forecast_time: '08:00:00',
          });

        if (insertError) {
          console.error('[Unsubscribe] Failed to create preferences:', insertError);
          return res.status(500).json({ error: 'Failed to unsubscribe' });
        }

        return res.status(200).json({
          success: true,
          message: 'Successfully unsubscribed from all emails',
        });
      }

      console.error('[Unsubscribe] Failed to update preferences:', updateError);
      return res.status(500).json({ error: 'Failed to unsubscribe' });
    }

    console.log('[Unsubscribe] User unsubscribed:', userId);
    return res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from all emails',
      preferences: updated,
    });

  } catch (error) {
    console.error('[Unsubscribe] Error in handleUnsubscribe:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/findr/unsubscribe?action=generate
 * Generates an unsubscribe token for a user (internal use only)
 *
 * Request body: { userId: string }
 * Returns: { token: string }
 */
async function handleGenerateToken(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in request body' });
    }

    // Verify the user exists
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user) {
      console.error('[Unsubscribe] User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate JWT token valid for 365 days
    const secret = new TextEncoder().encode(jwtSecret);
    const token = await new SignJWT({ userId, type: 'unsubscribe' } as UnsubscribeTokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('365d')
      .sign(secret);

    return res.status(200).json({ token });

  } catch (error) {
    console.error('[Unsubscribe] Error in handleGenerateToken:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Utility function to generate unsubscribe token
 * Can be imported and used by email template generators
 */
export async function generateUnsubscribeToken(userId: string): Promise<string> {
  if (!jwtSecret) {
    throw new Error('Missing JWT_SECRET environment variable');
  }

  const secret = new TextEncoder().encode(jwtSecret);
  const token = await new SignJWT({ userId, type: 'unsubscribe' } as UnsubscribeTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(secret);

  return token;
}
