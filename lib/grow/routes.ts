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
  return `/login?returnTo=${encoded}`;
}
