'use client';

import Image, { type ImageProps } from 'next/image';
import React, { useEffect, useState } from 'react';

export interface ImageWithFallbackProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
}

const DEFAULT_FALLBACK =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="Arial, sans-serif" font-size="18">Image unavailable</text></svg>';

export function ImageWithFallback({
  fallbackSrc = DEFAULT_FALLBACK,
  src,
  alt,
  width = 400,
  height = 300,
  onError,
  ...props
}: ImageWithFallbackProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [hasErrored, setHasErrored] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setHasErrored(false);
  }, [src]);

  const handleError: ImageProps['onError'] = (event) => {
    if (!hasErrored) {
      setHasErrored(true);
      setCurrentSrc(fallbackSrc);
    }
    if (typeof onError === 'function') {
      onError(event);
    }
  };

  return (
    <Image
      {...props}
      src={currentSrc || fallbackSrc}
      alt={alt}
      width={width}
      height={height}
      onError={handleError}
    />
  );
}

export default ImageWithFallback;
