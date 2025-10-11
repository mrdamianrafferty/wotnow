export interface CatchPhotoAsset {
  url: string;
  thumbnailUrl?: string | null;
  path?: string | null;
}

const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * Normalise the various photo payload shapes returned by the catch log API
 * into a consistent array of photo assets with URLs and optional thumbnails.
 */
export function normaliseCatchPhotoAssets(apiCatch: Record<string, unknown>): CatchPhotoAsset[] {
  const assets: CatchPhotoAsset[] = [];
  const seen = new Set<string>();

  const registerAsset = (asset: CatchPhotoAsset | null | undefined) => {
    if (!asset || !isString(asset.url) || asset.url.trim() === '') {
      return;
    }

    const url = asset.url.trim();
    if (seen.has(url)) {
      return;
    }

    seen.add(url);
    assets.push({
      url,
      thumbnailUrl: isString(asset.thumbnailUrl) ? asset.thumbnailUrl : null,
      path: isString(asset.path) ? asset.path : undefined,
    });
  };

  const rawPhotoAssets = apiCatch.photo_assets;
  if (Array.isArray(rawPhotoAssets)) {
    rawPhotoAssets.forEach((item) => {
      if (!item) return;
      if (isString(item)) {
        registerAsset({ url: item });
        return;
      }

      if (typeof item === 'object') {
        const photoObject = item as Record<string, unknown>;
        const url = isString(photoObject.url) ? photoObject.url : null;
        if (!url) return;

        const thumbnail =
          isString(photoObject.thumbnail_url) && photoObject.thumbnail_url.length > 0
            ? photoObject.thumbnail_url
            : isString(photoObject.thumbnailUrl)
            ? photoObject.thumbnailUrl
            : undefined;

        const path =
          isString(photoObject.path) && photoObject.path.length > 0
            ? photoObject.path
            : isString(photoObject.original)
            ? photoObject.original
            : undefined;

        registerAsset({
          url,
          thumbnailUrl: thumbnail,
          path,
        });
      }
    });
  }

  const fallbackUrlsSource =
    Array.isArray(apiCatch.photo_public_urls) && apiCatch.photo_public_urls.length > 0
      ? apiCatch.photo_public_urls
      : Array.isArray(apiCatch.photo_urls)
      ? apiCatch.photo_urls
      : [];

  const fallbackThumbnails =
    Array.isArray(apiCatch.photo_thumbnail_urls) && apiCatch.photo_thumbnail_urls.length > 0
      ? apiCatch.photo_thumbnail_urls
      : [];

  fallbackUrlsSource.forEach((value, index) => {
    if (!isString(value)) return;
    const thumbnailCandidate = fallbackThumbnails[index];
    registerAsset({
      url: value,
      thumbnailUrl: isString(thumbnailCandidate) ? thumbnailCandidate : undefined,
    });
  });

  return assets;
}
