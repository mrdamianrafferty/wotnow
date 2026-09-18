/**
 * Who is asking to send a push notification, and what they may send.
 *
 * /api/grow/push/send and /api/godaisy/push/send accept two callers: a server
 * holding the push API secret, and a signed-in person (for "send me a test
 * notification"). Both endpoints then let EITHER one broadcast — so anyone who
 * made a free account could send any title and text to every user. Broadcasts
 * are now for the secret holder only; a signed-in person may send to themselves.
 */
import { timingSafeEqual } from 'crypto';
import type { NextApiRequest } from 'next';

export type PushCaller = { kind: 'service' } | { kind: 'user'; userId: string };

/** Resolves a Supabase access token to its user id, or null. */
export type TokenVerifier = (accessToken: string) => Promise<string | null>;

/** Compares secrets in constant time, so the response time says nothing about how much matched. */
export function secretsMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The caller, or null when neither the secret nor a valid session was presented. */
export async function resolvePushCaller(
  req: Pick<NextApiRequest, 'headers'>,
  expectedSecret: string | undefined,
  verifyToken: TokenVerifier
): Promise<PushCaller | null> {
  const header = req.headers['x-push-api-secret'];
  const given = Array.isArray(header) ? header[0] : header;
  // An unset secret must never match an empty or missing header.
  if (given && expectedSecret && secretsMatch(given, expectedSecret)) return { kind: 'service' };

  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    const userId = await verifyToken(auth.substring(7));
    if (userId) return { kind: 'user', userId };
  }
  return null;
}

/**
 * Why this send is refused, or null when it is allowed. A signed-in person may
 * only send to themselves; broadcasting, and sending to someone else, need the
 * secret.
 */
export function refuseSend(caller: PushCaller, body: { broadcast?: boolean; userId?: string }): string | null {
  if (caller.kind === 'service') return null;
  if (body.broadcast) return 'Broadcasts can only be sent by the server';
  if (body.userId && body.userId !== caller.userId) return 'Cannot send notifications to another user';
  return null;
}
