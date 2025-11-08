import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Google OAuth Token Exchange API
 *
 * Exchanges an authorization code for Google ID tokens using PKCE.
 * This endpoint is called by the native iOS app after receiving the
 * authorization code via deep link redirect.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, codeVerifier, clientId, redirectUri } = req.body;

    if (!code || !codeVerifier || !clientId || !redirectUri) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('[Google Token Exchange] Exchanging code for tokens');

    // Get client secret from environment
    const clientSecret = process.env.GOOGLE_IOS_CLIENT_SECRET;

    if (!clientSecret) {
      console.error('[Google Token Exchange] GOOGLE_IOS_CLIENT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[Google Token Exchange] Token exchange failed:', errorData);
      return res.status(tokenResponse.status).json({
        error: 'Token exchange failed',
        details: errorData
      });
    }

    const tokens = await tokenResponse.json();

    console.log('[Google Token Exchange] Token exchange successful');

    // Return the ID token to the client
    return res.status(200).json({
      idToken: tokens.id_token,
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    });

  } catch (error) {
    console.error('[Google Token Exchange] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
