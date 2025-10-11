import { normaliseCatchPhotoAssets } from '@/utils/catchPhotoAssets';

describe('normaliseCatchPhotoAssets', () => {
  it('returns an empty array when no photo data provided', () => {
    expect(normaliseCatchPhotoAssets({})).toEqual([]);
    expect(
      normaliseCatchPhotoAssets({
        photo_assets: null,
        photo_public_urls: null,
        photo_urls: null,
      })
    ).toEqual([]);
  });

  it('normalises structured photo assets with thumbnails and paths', () => {
    const result = normaliseCatchPhotoAssets({
      photo_assets: [
        {
          url: 'https://example.com/storage/v1/object/public/catch-photos/user/photo-1.jpg',
          thumbnail_url: 'https://example.com/rendered/photo-1-thumb.jpg',
          path: 'user/photo-1.jpg',
        },
        {
          url: 'https://example.com/storage/v1/object/public/catch-photos/user/photo-2.jpg',
          thumbnailUrl: 'https://example.com/rendered/photo-2-thumb.jpg',
        },
      ],
    });

    expect(result).toEqual([
      {
        url: 'https://example.com/storage/v1/object/public/catch-photos/user/photo-1.jpg',
        thumbnailUrl: 'https://example.com/rendered/photo-1-thumb.jpg',
        path: 'user/photo-1.jpg',
      },
      {
        url: 'https://example.com/storage/v1/object/public/catch-photos/user/photo-2.jpg',
        thumbnailUrl: 'https://example.com/rendered/photo-2-thumb.jpg',
        path: undefined,
      },
    ]);
  });

  it('deduplicates URLs and falls back to public URLs array', () => {
    const result = normaliseCatchPhotoAssets({
      photo_assets: [
        {
          url: 'https://storage.example.com/photo-a.jpg',
          thumbnail_url: null,
        },
      ],
      photo_public_urls: [
        'https://storage.example.com/photo-a.jpg',
        'https://storage.example.com/photo-b.jpg',
      ],
      photo_thumbnail_urls: [null, 'https://storage.example.com/photo-b-thumb.jpg'],
    });

    expect(result).toEqual([
      {
        url: 'https://storage.example.com/photo-a.jpg',
        thumbnailUrl: null,
        path: undefined,
      },
      {
        url: 'https://storage.example.com/photo-b.jpg',
        thumbnailUrl: 'https://storage.example.com/photo-b-thumb.jpg',
        path: undefined,
      },
    ]);
  });

  it('handles legacy string arrays stored in photo_urls', () => {
    const result = normaliseCatchPhotoAssets({
      photo_urls: ['https://cdn.example.com/legacy-photo.jpg'],
    });

    expect(result).toEqual([
      {
        url: 'https://cdn.example.com/legacy-photo.jpg',
        thumbnailUrl: null,
        path: undefined,
      },
    ]);
  });
});
