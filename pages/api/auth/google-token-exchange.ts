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
    const { code, codeVerifier, platform } = req.body;

    if (!code || !codeVerifier) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Resolve clientId from server-side env vars based on platform
    const clientIdMap: Record<string, string | undefined> = {
      web: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      ios: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      android: process.env.NEXT_PUBLIC_GOOGLE_GODAISY_ANDROID_CLIENT_ID,
    };
    const clientId = clientIdMap[platform || 'web'];
    if (!clientId) {
      return res.status(400).json({ error: 'Invalid platform or missing client ID configuration' });
    }

    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`;

    console.log('[Google Token Exchange] Exchanging code for tokens');

    // Get client secret from environment (using Web client credentials)
    const clientSecret = process.env.GOOGLE_WEB_CLIENT_SECRET;

    if (!clientSecret) {
      console.error('[Google Token Exchange] GOOGLE_WEB_CLIENT_SECRET not configured');
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
        error: 'Authentication failed. Please try again.'
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
      error: 'Authentication failed. Please try again.'
    });
  }
}
