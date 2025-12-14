import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Perenual Image License Type
 * Images from Perenual API include Creative Commons licensing info
 */
export interface PerenualImageLicense {
  license: number;
  license_name: string;
  license_url: string;
  original_url: string;
  regular_url: string;
  medium_url: string;
  small_url: string;
  thumbnail: string;
}

interface ImageAttributionProps {
  image: PerenualImageLicense;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Displays Creative Commons attribution for Perenual images
 * Required by CC BY-SA licenses
 */
export function ImageAttribution({ image, size = 'sm', className = '' }: ImageAttributionProps) {
  if (!image.license_url || !image.license_name) {
    return null;
  }

  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  
  return (
    <a
      href={image.license_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-0.5 ${textSize} text-muted-foreground/70 hover:text-muted-foreground transition-colors ${className}`}
      title={`License: ${image.license_name}`}
    >
      <span className="truncate max-w-[120px]">{formatLicenseName(image.license_name)}</span>
      <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
    </a>
  );
}

/**
 * Compact attribution link for inline use
 */
export function ImageAttributionInline({ image }: { image: PerenualImageLicense }) {
  if (!image.license_url) return null;
  
  return (
    <a
      href={image.license_url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[9px] text-muted-foreground/60 hover:text-muted-foreground hover:underline"
      title={image.license_name}
    >
      {getShortLicenseName(image.license_name)}
    </a>
  );
}

interface PerenualAttributionProps {
  className?: string;
  inline?: boolean;
}

/**
 * Attribution link to Perenual API as data source
 */
export function PerenualAttribution({ className = '', inline = false }: PerenualAttributionProps) {
  if (inline) {
    return (
      <span className={`text-[10px] text-muted-foreground/60 ${className}`}>
        Data from{' '}
        <a
          href="https://perenual.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-muted-foreground hover:underline"
        >
          Perenual
        </a>
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-[10px] text-muted-foreground/60 ${className}`}>
      <span>Plant data from</span>
      <a
        href="https://perenual.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 hover:text-muted-foreground hover:underline"
      >
        Perenual API
        <ExternalLink className="h-2 w-2" />
      </a>
    </div>
  );
}

/**
 * Combined attribution for image + source
 */
interface ImageWithAttributionProps {
  image: PerenualImageLicense;
  showSource?: boolean;
  className?: string;
}

export function ImageWithAttribution({ image, showSource = true, className = '' }: ImageWithAttributionProps) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <ImageAttributionInline image={image} />
        {showSource && <PerenualAttribution inline />}
      </div>
    </div>
  );
}

// ============ Helpers ============

function formatLicenseName(name: string): string {
  // Shorten common Creative Commons names
  return name
    .replace('Attribution-ShareAlike', 'CC BY-SA')
    .replace('Attribution', 'CC BY')
    .replace('Unported', '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getShortLicenseName(name: string): string {
  // Extract just the license type
  if (name.includes('BY-SA')) return 'CC BY-SA';
  if (name.includes('BY-NC')) return 'CC BY-NC';
  if (name.includes('BY')) return 'CC BY';
  if (name.includes('CC0')) return 'CC0';
  return 'License';
}
