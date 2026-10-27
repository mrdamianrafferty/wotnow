/**
 * Who may read /api/admin/metrics-summary.
 *
 * Two ways in, both fail closed when their env var is unset:
 * - the multi-app dashboard, with `Authorization: Bearer $DASHBOARD_READ_TOKEN`
 *   (a shared secret, compared in constant time);
 * - a signed-in Go Daisy user whose email is in GODAISY_ADMIN_EMAILS, by
 *   Supabase access token in the same header or by session cookie.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/serverClient';
import { createPagesServerClient } from '@/lib/supabase/pages-api';

function bearer(req: NextApiRequest): string | null {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() || null : null;
}

/** Constant-time string compare; hashing first makes the lengths equal. */
export function secretsMatch(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function hasDashboardToken(req: NextApiRequest, env: Record<string, string | undefined> = process.env): boolean {
  const expected = env.DASHBOARD_READ_TOKEN?.trim();
  const given = bearer(req);
  return Boolean(expected && given && secretsMatch(given, expected));
}

export function adminEmails(env: Record<string, string | undefined> = process.env): Set<string> {
  return new Set(
    (env.GODAISY_ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** The signed-in admin's email, or null. */
export async function getAdminEmail(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const allowed = adminEmails();
  if (allowed.size === 0) return null;

  const token = bearer(req);
  const { data } = token
    ? await getSupabaseServerClient().auth.getUser(token)
    : await createPagesServerClient({ req, res }).auth.getUser();
  const email = data.user?.email?.toLowerCase();
  return email && allowed.has(email) ? email : null;
}
