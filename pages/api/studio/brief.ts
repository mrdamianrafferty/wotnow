/**
 * POST /api/studio/brief — the Daisy Studio commissioner enquiry.
 *
 * Validates the five fields from /studio/build, drops bot submissions (the
 * hidden `website` honeypot), and emails the brief to hello@godaisy.io with the
 * sender as reply-to. Nothing is stored: the email is the record.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const FROM = 'Daisy Studio <hello@godaisy.io>';
const TO = 'hello@godaisy.io';
const WHEN = ['No fixed date', 'Within 3 months', 'Within 6 months', 'Later this year'];

// Small per-instance limiter: enough to blunt a burst from one address.
const recent = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function limited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > MAX_PER_WINDOW;
}

function field(body: Record<string, unknown>, key: string, max: number): string {
  const v = body[key];
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (typeof req.body === 'object' && req.body) || {};
  // Honeypot: real people never see this field. Pretend it worked.
  if (field(body, 'website', 200)) return res.status(200).json({ ok: true });

  const name = field(body, 'name', 120);
  const email = field(body, 'email', 200);
  const organisation = field(body, 'organisation', 200);
  const need = field(body, 'need', 5000);
  const whenRaw = field(body, 'when', 40);
  const when = WHEN.includes(whenRaw) ? whenRaw : 'No fixed date';

  if (!name || !need) return res.status(400).json({ error: 'Please add your name and what you need.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please check your email address.' });

  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'Too many briefs from here just now. Please email hello@godaisy.io.' });

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('[studio/brief] RESEND_API_KEY is not set');
    return res.status(500).json({ error: '' });
  }

  const subject = `Studio brief: ${organisation || name}`;
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Organisation: ${organisation || '(not given)'}`,
    `When: ${when}`,
    '',
    need,
  ].join('\n');
  const html = `<p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}<br><strong>Organisation:</strong> ${escapeHtml(organisation || '(not given)')}<br><strong>When:</strong> ${escapeHtml(when)}</p><p style="white-space:pre-wrap">${escapeHtml(need)}</p>`;

  try {
    const { error } = await new Resend(key).emails.send({ from: FROM, to: TO, replyTo: email, subject, text, html });
    if (error) throw new Error(error.message);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[studio/brief] send failed', err);
    return res.status(502).json({ error: '' });
  }
}
