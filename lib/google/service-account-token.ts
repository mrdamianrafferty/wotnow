/**
 * OAuth access token for a Google service account, from its JSON key, with
 * no Google SDK: a self-signed RS256 JWT exchanged at the token endpoint.
 * Used by the Play install reports (Cloud Storage) and the admin dashboard's
 * GA4 Data API reports.
 */

import { createSign } from 'node:crypto';

export interface ServiceAccountKey {
  clientEmail: string;
  privateKey: string;
}

/** Reads a base64-encoded service-account JSON key. Throws when it is set but unreadable. */
export function decodeServiceAccountKey(base64: string, envName: string): ServiceAccountKey {
  const credentials = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8')) as {
    client_email?: string;
    private_key?: string;
  };
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error(`${envName} has no client_email or private_key`);
  }
  return { clientEmail: credentials.client_email, privateKey: credentials.private_key };
}

export async function getServiceAccountToken(key: ServiceAccountKey, scope: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: key.clientEmail,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp: iat + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.privateKey).toString('base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('Google token response had no access_token');
  return json.access_token;
}
