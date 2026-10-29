/**
 * The sites /admin/search offers, as plain data. Kept apart from
 * search-console.ts (which carries the same ids with their Search Console
 * properties) because that module pulls in Node's crypto for the service
 * account, which a page running in the browser cannot import. A test keeps the
 * two lists the same.
 */

import type { FamilyAppId } from './family';

export const SEARCH_SITE_LIST: { id: FamilyAppId; name: string }[] = [
  { id: 'godaisy', name: 'Go Daisy' },
  { id: 'growdaisy', name: 'Grow Daisy' },
  { id: 'risedaisy', name: 'Rise Daisy' },
  { id: 'findr', name: 'Findr' },
  { id: 'flycast', name: 'Fly Cast' },
  { id: 'grewp', name: 'Grewp' },
];
