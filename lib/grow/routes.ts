const GROW_BASE_PATH = '/grow';

const ensureLeadingSlash = (path: string): string => {
  if (!path) {
    return GROW_BASE_PATH;
  }
  return path.startsWith('/') ? path : `/${path}`;
};

const isValidGrowPath = (path: string): boolean => path.startsWith(GROW_BASE_PATH);

export const GROW_ROOT_PATH = GROW_BASE_PATH;
export const GROW_ONBOARDING_PATH = `${GROW_BASE_PATH}/onboarding`;

export function buildGrowLoginUrl(returnPath: string = GROW_ROOT_PATH): string {
  const normalized = ensureLeadingSlash(returnPath);
  const safePath = isValidGrowPath(normalized) ? normalized : GROW_ROOT_PATH;
  const encoded = encodeURIComponent(safePath);

  // Check if we're on the grow subdomain (native app or grow.godaisy.io)
  // If so, use absolute URL to main domain for login
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'grow.godaisy.io' || host.includes('grow.')) {
      return `https://godaisy.io/login?returnTo=${encoded}`;
    }
  }

  return `/login?returnTo=${encoded}`;
}
