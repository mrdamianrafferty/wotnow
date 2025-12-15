/**
 * Wikipedia Image License Parser
 * 
 * Fetches image metadata from Wikipedia/Wikimedia Commons API to determine
 * if an image can be used (based on license) and extract proper attribution.
 */

// Licenses that allow reuse with attribution
const ALLOWED_LICENSES = [
  'cc-by-sa-4.0',
  'cc-by-sa-3.0',
  'cc-by-sa-2.5',
  'cc-by-sa-2.0',
  'cc-by-sa-1.0',
  'cc-by-4.0',
  'cc-by-3.0',
  'cc-by-2.5',
  'cc-by-2.0',
  'cc-by-1.0',
  'cc0',
  'cc-zero',
  'public domain',
  'pd',
  'pd-self',
  'pd-user',
  'pd-author',
  'pd-us',
  'pd-old',
  'pd-old-100',
  'pd-art',
  'gfdl',
];

// Human-readable license names
const LICENSE_DISPLAY_NAMES: Record<string, string> = {
  'cc-by-sa-4.0': 'CC BY-SA 4.0',
  'cc-by-sa-3.0': 'CC BY-SA 3.0',
  'cc-by-sa-2.5': 'CC BY-SA 2.5',
  'cc-by-sa-2.0': 'CC BY-SA 2.0',
  'cc-by-4.0': 'CC BY 4.0',
  'cc-by-3.0': 'CC BY 3.0',
  'cc-by-2.5': 'CC BY 2.5',
  'cc-by-2.0': 'CC BY 2.0',
  'cc0': 'CC0 (Public Domain)',
  'cc-zero': 'CC0 (Public Domain)',
  'public domain': 'Public Domain',
  'pd': 'Public Domain',
  'gfdl': 'GFDL',
};

export interface WikiImageLicenseInfo {
  imageUrl: string | null;
  thumbnailUrl: string | null;
  license: string | null;
  licenseShortName: string | null;
  licenseUrl: string | null;
  artist: string | null;
  attribution: string | null;
  isAllowed: boolean;
  error?: string;
}

/**
 * Extract the image filename from a Wikipedia/Wikimedia URL
 */
function extractImageFilename(url: string): string | null {
  // Handle various Wikipedia/Wikimedia image URL formats
  const patterns = [
    // Direct Wikimedia Commons file
    /File:([^/]+)$/i,
    // Wikimedia upload URL
    /\/wikipedia\/commons\/[a-f0-9]\/[a-f0-9]{2}\/([^/?]+)/i,
    // Wikimedia thumb URL
    /\/wikipedia\/commons\/thumb\/[a-f0-9]\/[a-f0-9]{2}\/([^/]+)\//i,
    // Upload.wikimedia.org
    /upload\.wikimedia\.org\/.*\/([^/?]+)$/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

/**
 * Normalize license string for comparison
 */
function normalizeLicense(license: string): string {
  return license
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/creative\s*commons/gi, 'cc')
    .replace(/attribution/gi, 'by')
    .replace(/share\s*alike/gi, 'sa')
    .replace(/version\s*/gi, '')
    .replace(/unported/gi, '')
    .replace(/international/gi, '')
    .trim();
}

/**
 * Check if a license allows reuse
 */
function isLicenseAllowed(license: string): boolean {
  const normalized = normalizeLicense(license);
  
  // Check exact match first
  if (ALLOWED_LICENSES.includes(normalized)) {
    return true;
  }
  
  // Check partial matches for common patterns
  const allowedPatterns = [
    /^cc-by(-sa)?(-\d+(\.\d+)?)?$/,
    /^cc0$/,
    /^cc-zero$/,
    /^pd/,
    /^public\s*domain$/,
    /^gfdl/,
  ];
  
  return allowedPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Get human-readable license display name
 */
function getLicenseDisplayName(license: string): string {
  const normalized = normalizeLicense(license);
  return LICENSE_DISPLAY_NAMES[normalized] || license;
}

/**
 * Fetch image license information from Wikimedia Commons API
 */
export async function getWikipediaImageLicense(
  imageUrl: string
): Promise<WikiImageLicenseInfo> {
  const result: WikiImageLicenseInfo = {
    imageUrl: null,
    thumbnailUrl: null,
    license: null,
    licenseShortName: null,
    licenseUrl: null,
    artist: null,
    attribution: null,
    isAllowed: false,
  };

  try {
    // Extract filename from URL
    const filename = extractImageFilename(imageUrl);
    if (!filename) {
      result.error = 'Could not extract filename from URL';
      return result;
    }

    // Query Wikimedia Commons API for image info
    const apiUrl = new URL('https://commons.wikimedia.org/w/api.php');
    apiUrl.searchParams.set('action', 'query');
    apiUrl.searchParams.set('titles', `File:${filename}`);
    apiUrl.searchParams.set('prop', 'imageinfo');
    apiUrl.searchParams.set('iiprop', 'url|extmetadata');
    apiUrl.searchParams.set('iiurlwidth', '1024'); // Get thumbnail at max width
    apiUrl.searchParams.set('format', 'json');
    apiUrl.searchParams.set('origin', '*');

    const response = await fetch(apiUrl.toString());
    if (!response.ok) {
      result.error = `API request failed: ${response.status}`;
      return result;
    }

    const data = await response.json();
    
    // Navigate to the image info
    const pages = data?.query?.pages;
    if (!pages) {
      result.error = 'No pages in API response';
      return result;
    }

    // Get the first (and usually only) page
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    
    if (pageId === '-1' || !page?.imageinfo?.[0]) {
      result.error = 'Image not found in Wikimedia Commons';
      return result;
    }

    const imageInfo = page.imageinfo[0];
    const extmetadata = imageInfo.extmetadata || {};

    // Extract image URLs
    result.imageUrl = imageInfo.url || null;
    result.thumbnailUrl = imageInfo.thumburl || null;

    // Extract license information
    const licenseShortName = extmetadata.LicenseShortName?.value || '';
    const licenseUrl = extmetadata.LicenseUrl?.value || '';
    
    result.license = licenseShortName;
    result.licenseShortName = getLicenseDisplayName(licenseShortName);
    result.licenseUrl = licenseUrl || null;

    // Extract artist/attribution
    const artist = extmetadata.Artist?.value || '';
    // Strip HTML tags from artist field
    result.artist = artist.replace(/<[^>]*>/g, '').trim() || null;

    // Build attribution string
    const attributionParts: string[] = [];
    if (result.artist) {
      attributionParts.push(`Photo by ${result.artist}`);
    }
    if (result.licenseShortName) {
      attributionParts.push(`(${result.licenseShortName})`);
    }
    attributionParts.push('via Wikimedia Commons');
    result.attribution = attributionParts.join(' ');

    // Check if license allows reuse
    result.isAllowed = isLicenseAllowed(licenseShortName);

    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Get Wikipedia image license info from a Wikipedia article URL
 * by first fetching the article's main image
 */
export async function getWikipediaArticleImageLicense(
  wikiUrl: string
): Promise<WikiImageLicenseInfo> {
  const result: WikiImageLicenseInfo = {
    imageUrl: null,
    thumbnailUrl: null,
    license: null,
    licenseShortName: null,
    licenseUrl: null,
    artist: null,
    attribution: null,
    isAllowed: false,
  };

  try {
    // Extract article title from URL
    const urlMatch = wikiUrl.match(/\/wiki\/([^#?]+)/);
    if (!urlMatch) {
      result.error = 'Could not extract article title from URL';
      return result;
    }

    const articleTitle = decodeURIComponent(urlMatch[1]);

    // Get the article's main image (pageimage)
    const apiUrl = new URL('https://en.wikipedia.org/w/api.php');
    apiUrl.searchParams.set('action', 'query');
    apiUrl.searchParams.set('titles', articleTitle);
    apiUrl.searchParams.set('prop', 'pageimages');
    apiUrl.searchParams.set('piprop', 'original');
    apiUrl.searchParams.set('format', 'json');
    apiUrl.searchParams.set('origin', '*');

    const response = await fetch(apiUrl.toString());
    if (!response.ok) {
      result.error = `Wikipedia API request failed: ${response.status}`;
      return result;
    }

    const data = await response.json();
    const pages = data?.query?.pages;
    if (!pages) {
      result.error = 'No pages in API response';
      return result;
    }

    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    if (pageId === '-1' || !page?.original?.source) {
      result.error = 'No main image found for article';
      return result;
    }

    // Now get the license info for this image
    return await getWikipediaImageLicense(page.original.source);

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Check if an image URL is from Wikipedia/Wikimedia
 */
export function isWikimediaUrl(url: string): boolean {
  const wikimediaPatterns = [
    /wikipedia\.org/i,
    /wikimedia\.org/i,
    /upload\.wikimedia\.org/i,
  ];
  return wikimediaPatterns.some(pattern => pattern.test(url));
}

/**
 * Wikipedia article summary info
 */
export interface WikiSummaryInfo {
  title: string;
  extract: string;
  extractHtml?: string;
  pageUrl: string;
  thumbnailUrl?: string;
  originalImageUrl?: string;
  language: string;
  attribution: string;
  error?: string;
}

/**
 * Fetch Wikipedia article summary using the REST API
 * Uses the summary endpoint which returns a clean extract
 * 
 * @param wikiUrl - Full Wikipedia article URL (e.g., https://en.wikipedia.org/wiki/Rosa)
 * @returns Summary info with extract, attribution, and URLs
 */
export async function getWikipediaSummary(wikiUrl: string): Promise<WikiSummaryInfo | null> {
  try {
    // Extract language and article title from URL
    // Supports: https://en.wikipedia.org/wiki/Article_Name
    //           https://fr.wikipedia.org/wiki/Nom_Article
    const urlMatch = wikiUrl.match(/https?:\/\/([a-z]{2,3})\.wikipedia\.org\/wiki\/([^#?]+)/i);
    if (!urlMatch) {
      console.warn('[getWikipediaSummary] Could not parse Wikipedia URL:', wikiUrl);
      return null;
    }

    const [, language, articleTitle] = urlMatch;
    const decodedTitle = decodeURIComponent(articleTitle);

    // Use Wikipedia REST API summary endpoint
    // https://en.wikipedia.org/api/rest_v1/page/summary/Article_Title
    const apiUrl = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(decodedTitle)}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GoDaisy/1.0 (https://godaisy.io; hello@godaisy.io)',
      },
    });

    if (!response.ok) {
      console.warn('[getWikipediaSummary] API request failed:', response.status);
      return null;
    }

    const data = await response.json();

    // Build attribution text
    const attribution = `From Wikipedia, the free encyclopedia. Content available under CC BY-SA 3.0.`;

    return {
      title: data.title || decodedTitle,
      extract: data.extract || '',
      extractHtml: data.extract_html,
      pageUrl: data.content_urls?.desktop?.page || wikiUrl,
      thumbnailUrl: data.thumbnail?.source,
      originalImageUrl: data.originalimage?.source,
      language,
      attribution,
    };
  } catch (error) {
    console.error('[getWikipediaSummary] Error:', error);
    return null;
  }
}

/**
 * Fetch Wikipedia summary by scientific name
 * Tries multiple Wikipedia languages if the English article doesn't exist
 * 
 * @param scientificName - Latin binomial (e.g., "Gentiana brachyphylla")
 * @returns Summary info or null if not found
 */
export async function getWikipediaSummaryByScientificName(scientificName: string, preferEnglish: boolean = true): Promise<WikiSummaryInfo | null> {
  // Languages to try in order of preference
  // English first is strongly preferred for user experience
  const languages = preferEnglish ? ['en', 'de', 'fr', 'es', 'it', 'pt', 'nl'] : ['de', 'en', 'fr', 'es', 'it', 'pt', 'nl'];
  
  // Format scientific name for Wikipedia URL (replace spaces with underscores)
  const formattedName = scientificName.trim().replace(/\s+/g, '_');

  for (const lang of languages) {
    const wikiUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(formattedName)}`;
    
    try {
      const summary = await getWikipediaSummary(wikiUrl);
      if (summary && summary.extract && summary.extract.length > 50) {
        return summary;
      }
    } catch {
      // Try next language
      continue;
    }
  }

  return null;
}
