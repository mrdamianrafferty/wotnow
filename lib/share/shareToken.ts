/**
 * Share Token System
 *
 * Generates and decodes shareable tokens that encode:
 * - App (godaisy, findr, growdaisy)
 * - Location/rectangle
 * - Date
 * - Recommendation data
 * - Expiry (7 days default)
 */

export type ShareApp = 'godaisy' | 'findr' | 'growdaisy';

/**
 * Base share data common to all apps
 */
interface BaseShareData {
  app: ShareApp;
  createdAt: string;
  expiresAt: string;
}

/**
 * Go Daisy share data
 */
export interface GoDaisyShareData extends BaseShareData {
  app: 'godaisy';
  activityId: string;
  activityName: string;
  score: number;
  date: string;
  location?: string;
  weatherSummary?: string;
  /**
   * The place's slug and which day of the run, so the landing page can address
   * the share renderer.
   *
   * Optional because tokens minted before this existed do not carry them, and a
   * link someone sent last week must still open. Without them the landing page
   * simply has no preview image, which is what every Go Daisy share had until
   * now — the card was rendered for the native share sheet and a link pasted
   * into a chat previewed as bare text.
   */
  slug?: string;
  dayIndex?: number;
}

/**
 * Findr share data
 */
export interface FindrShareData extends BaseShareData {
  app: 'findr';
  speciesCode: string;
  speciesName: string;
  confidence: number;
  rectangleCode: string;
  regionName: string;
  date: string;
  conditionsSummary?: string;
}

/**
 * Grow Daisy share data
 */
export interface GrowDaisyShareData extends BaseShareData {
  app: 'growdaisy';
  taskId: string;
  taskTitle: string;
  urgency: string;
  category: string;
  location?: string;
}

export type ShareData = GoDaisyShareData | FindrShareData | GrowDaisyShareData;

/**
 * Token version for future compatibility
 */
const TOKEN_VERSION = 1;

/**
 * Default token expiry in days
 */
const DEFAULT_EXPIRY_DAYS = 7;

/**
 * Generate a shareable token from share data
 */
export function generateShareToken(data: Omit<ShareData, 'createdAt' | 'expiresAt'>, expiryDays = DEFAULT_EXPIRY_DAYS): string {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

  const fullData: ShareData = {
    ...data,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  } as ShareData;

  // Create payload with version
  const payload = {
    v: TOKEN_VERSION,
    d: fullData,
  };

  // Encode to base64 (URL-safe)
  const jsonString = JSON.stringify(payload);
  const base64 = btoa(jsonString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return base64;
}

/**
 * Decode a share token
 */
export function decodeShareToken(token: string): ShareData | null {
  try {
    // Restore base64 padding and characters
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const jsonString = atob(base64);
    const payload = JSON.parse(jsonString);

    // Version check
    if (payload.v !== TOKEN_VERSION) {
      console.warn('[ShareToken] Unknown token version:', payload.v);
      return null;
    }

    const data = payload.d as ShareData;

    // Validate required fields
    if (!data.app || !data.createdAt || !data.expiresAt) {
      console.warn('[ShareToken] Missing required fields');
      return null;
    }

    return data;
  } catch (error) {
    console.error('[ShareToken] Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if a share token is expired
 */
export function isTokenExpired(data: ShareData): boolean {
  const expiresAt = new Date(data.expiresAt);
  return expiresAt < new Date();
}

/**
 * Get a human-readable expiry message
 */
export function getExpiryMessage(data: ShareData): string {
  const expiresAt = new Date(data.expiresAt);
  const now = new Date();

  if (expiresAt < now) {
    return 'This share link has expired';
  }

  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays > 1) {
    return `Expires in ${diffDays} days`;
  } else if (diffDays === 1) {
    return 'Expires tomorrow';
  } else if (diffHours > 1) {
    return `Expires in ${diffHours} hours`;
  } else {
    return 'Expires soon';
  }
}

/**
 * Generate a share URL
 */
export function getShareUrl(token: string): string {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://godaisy.io';

  return `${baseUrl}/share/${token}`;
}

/**
 * Get app-specific title for sharing
 */
export function getShareTitle(data: ShareData): string {
  switch (data.app) {
    case 'godaisy': {
      /*
       * THIS IS THE HEADLINE OF THE LINK PREVIEW, so it is the first thing a
       * stranger reads about Go Daisy — and it said "Go Cycling - 85% match",
       * which is a database row. Nobody forwards a database row. It reads like
       * the sentence their friend actually sent them now.
       */
      const activity = data.activityName
        .replace(/^(?:Go to|Do Some|Go|Play|Do|Have|Take|Try|Hit|Visit)\s+/i, '')
        .toLowerCase();
      return data.location
        ? `It is ${activity} weather in ${data.location}`
        : `It is ${activity} weather`;
    }
    case 'findr':
      return `${data.speciesName} fishing - ${data.confidence}% confidence`;
    case 'growdaisy':
      return `Garden task: ${data.taskTitle}`;
    default:
      return 'Shared recommendation';
  }
}

/**
 * Get app-specific description for sharing
 */
export function getShareDescription(data: ShareData): string {
  switch (data.app) {
    case 'godaisy':
      return data.weatherSummary || `Great conditions for ${data.activityName} on ${formatDate(data.date)}`;
    case 'findr':
      return data.conditionsSummary || `Good conditions for ${data.speciesName} at ${data.regionName}`;
    case 'growdaisy':
      return `${data.urgency} priority task: ${data.taskTitle}`;
    default:
      return 'Check out this recommendation';
  }
}

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return dateString;
  }
}

/**
 * Get app-specific brand color
 */
export function getAppColor(app: ShareApp): string {
  switch (app) {
    case 'godaisy':
      return '#0284c7'; // sky-600
    case 'findr':
      return '#0891b2'; // cyan-600
    case 'growdaisy':
      return '#16a34a'; // green-600
    default:
      return '#3b82f6'; // blue-500
  }
}

/**
 * Get app name for display
 */
export function getAppName(app: ShareApp): string {
  switch (app) {
    case 'godaisy':
      return 'Go Daisy';
    case 'findr':
      return 'Fish Findr';
    case 'growdaisy':
      return 'Grow Daisy';
    default:
      return 'Daisy';
  }
}

/**
 * Get app URL
 */
export function getAppUrl(app: ShareApp): string {
  switch (app) {
    case 'godaisy':
      return 'https://godaisy.io';
    case 'findr':
      return 'https://fishfindr.eu';
    case 'growdaisy':
      return 'https://godaisy.io/grow';
    default:
      return 'https://godaisy.io';
  }
}
