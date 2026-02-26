/**
 * Standardized API Response Helpers
 *
 * Use these helpers across API routes for consistent error/success shapes.
 *
 * Response format:
 *   Success: { success: true, data: T }
 *   Error:   { error: string, details?: unknown }
 */

import type { NextApiResponse } from 'next';

/**
 * Send a standardized error response
 */
export function apiError(
  res: NextApiResponse,
  status: number,
  message: string,
  details?: unknown
): void {
  const body: { error: string; details?: unknown } = { error: message };
  if (details !== undefined && process.env.NODE_ENV === 'development') {
    body.details = details;
  }
  res.status(status).json(body);
}

/**
 * Send a 405 Method Not Allowed with proper Allow header
 */
export function apiMethodNotAllowed(
  res: NextApiResponse,
  allowedMethods: string[]
): void {
  res.setHeader('Allow', allowedMethods.join(', '));
  apiError(res, 405, `Method not allowed. Allowed: ${allowedMethods.join(', ')}`);
}

/**
 * Send a standardized success response
 */
export function apiSuccess<T>(
  res: NextApiResponse,
  data: T,
  status = 200
): void {
  res.status(status).json(data);
}
