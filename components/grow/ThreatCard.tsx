import React, { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ImageAttribution, PerenualAttribution, type PerenualImageLicense } from './PerenualAttribution';
import { AlertTriangle, Bug, Leaf, Droplets, Thermometer, Skull, Worm, ExternalLink, X, ZoomIn } from 'lucide-react';

type ThreatRiskBand = 'none' | 'low' | 'moderate' | 'high' | 'severe';

// Wikimedia Commons image with proper attribution per their requirements
interface WikimediaImage {
  local_path: string;           // Path to local image file
  wikimedia_file: string;       // Original filename on Wikimedia Commons
  wikimedia_url: string;        // URL to Wikimedia Commons file page
  license: string;              // License type (CC BY-SA 3.0, Public Domain, etc.)
  license_url: string;          // URL to license
  author: string;               // Author/photographer name
  source: 'Wikimedia Commons';  // Always Wikimedia Commons
}

interface ThreatCardJson {
  where_on_plant?: string[];
  confirmation_tips?: string[];
  prevention_bullets?: string[];
  recognition_bullets?: string[];
  treatment_pesticide_free?: string[];
  when_to_escalate_bullets?: string[];
  // Wikimedia Commons image (preferred)
  wikimedia_image?: WikimediaImage;
  // Perenual enrichment (legacy)
  perenual_id?: number;
  perenual_synced_at?: string;
  perenual_match_confidence?: string;
  images?: PerenualImageLicense[];
  perenual_description?: Array<{ subtitle: string; description: string }>;
  perenual_solution?: Array<{ subtitle: string; description: string }>;
  perenual_hosts?: string[];
  perenual_family?: string;
  perenual_other_names?: string[];
}

interface ThreatData {
  threatId: string;
  slug: string;
  commonName: string;
  scientificName: string | null;
  threatType: string;
  severityDefault: number;
  score: number;
  band: ThreatRiskBand;
  matchedHosts: Array<{ kind: string; key: string; strength: number }>;
  matchedRules: Array<{ ruleId: string; title: string; score: number }>;
  reasons: string[];
  cardJson: ThreatCardJson;
}

interface ThreatCardProps {
  threat: ThreatData;
  compact?: boolean;
}

const THREAT_TYPE_ICONS: Record<string, React.ReactNode> = {
  pest: <Bug className="h-4 w-4" />,
  fungal: <Leaf className="h-4 w-4" />,
  oomycete: <Droplets className="h-4 w-4" />,
  bacterial: <AlertTriangle className="h-4 w-4" />,
  viral: <Skull className="h-4 w-4" />,
  nematode: <Worm className="h-4 w-4" />,
  abiotic: <Thermometer className="h-4 w-4" />,
  nutrient: <Leaf className="h-4 w-4" />,
};

const BAND_COLORS: Record<ThreatRiskBand, string> = {
  none: 'border-gray-200 bg-gray-50 text-gray-600',
  low: 'border-green-200 bg-green-50 text-green-700',
  moderate: 'border-amber-200 bg-amber-50 text-amber-700',
  high: 'border-orange-300 bg-orange-50 text-orange-700',
  severe: 'border-red-300 bg-red-50 text-red-700',
};

const CARD_BORDER_COLORS: Record<ThreatRiskBand, string> = {
  none: 'border-gray-200',
  low: 'border-green-200',
  moderate: 'border-amber-200',
  high: 'border-orange-300',
  severe: 'border-red-300',
};

export function ThreatCard({ threat, compact = false }: ThreatCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const cardJson = threat.cardJson as ThreatCardJson;
  
  // Prefer Wikimedia image over Perenual images
  const wikimediaImage = cardJson?.wikimedia_image;
  const perenualImages = cardJson?.images;
  const primaryPerenualImage = perenualImages?.[0];
  
  const hasImage = !!wikimediaImage || !!primaryPerenualImage;
  const hasPerenualData = !!cardJson?.perenual_id;

  // Get image source for lightbox
  const lightboxImageSrc = wikimediaImage?.local_path || 
    primaryPerenualImage?.original_url || 
    primaryPerenualImage?.medium_url || 
    primaryPerenualImage?.small_url;
  
  return (
    <>
    <Card className={`border-2 ${CARD_BORDER_COLORS[threat.band]} overflow-hidden`}>
      {/* Image section with attribution */}
      {wikimediaImage ? (
        // Wikimedia Commons image with proper attribution
        <div className="relative group">
          <button
            onClick={() => setLightboxOpen(true)}
            className="relative h-32 w-full bg-muted block cursor-zoom-in"
            aria-label={`View full size image of ${threat.commonName}`}
          >
            <Image
              src={wikimediaImage.local_path}
              alt={`${threat.commonName}${threat.scientificName ? ` (${threat.scientificName})` : ''} - ${formatThreatType(threat.threatType)}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            {/* Zoom hint on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
            </div>
          </button>
          {/* Wikimedia attribution overlay - per their requirements */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 pointer-events-none">
            <div className="pointer-events-auto">
              <WikimediaAttribution image={wikimediaImage} />
            </div>
          </div>
        </div>
      ) : primaryPerenualImage && (
        // Fallback to Perenual image (legacy)
        <div className="relative group">
          <button
            onClick={() => setLightboxOpen(true)}
            className="relative h-32 w-full bg-muted block cursor-zoom-in"
            aria-label={`View full size image of ${threat.commonName}`}
          >
            <Image
              src={primaryPerenualImage.medium_url || primaryPerenualImage.small_url || primaryPerenualImage.thumbnail}
              alt={`${threat.commonName}${threat.scientificName ? ` (${threat.scientificName})` : ''} - ${formatThreatType(threat.threatType)}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            {/* Zoom hint on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
            </div>
          </button>
          {/* Image attribution overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 pointer-events-none">
            <div className="pointer-events-auto">
              <ImageAttribution image={primaryPerenualImage} size="sm" className="text-white/80 hover:text-white" />
            </div>
          </div>
        </div>
      )}

      <CardHeader className={hasImage ? 'pt-3' : ''}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {THREAT_TYPE_ICONS[threat.threatType] || <AlertTriangle className="h-4 w-4" />}
              </span>
              <CardTitle className="text-lg truncate">{threat.commonName}</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatThreatType(threat.threatType)}
              {threat.scientificName && (
                <span className="italic"> • {threat.scientificName}</span>
              )}
            </p>
          </div>
          <Badge variant="outline" className={BAND_COLORS[threat.band]}>
            {threat.band}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Recognition bullets or reasons */}
        {cardJson?.recognition_bullets && cardJson.recognition_bullets.length > 0 ? (
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {cardJson.recognition_bullets.slice(0, compact ? 2 : 3).map((bullet, idx) => (
              <li key={idx}>{bullet}</li>
            ))}
          </ul>
        ) : Array.isArray(threat.reasons) && threat.reasons.length > 0 ? (
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {threat.reasons.slice(0, compact ? 2 : 3).map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Relevant based on your garden plants and features.
          </p>
        )}

        {/* Matched hosts */}
        {threat.matchedHosts && threat.matchedHosts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {threat.matchedHosts.slice(0, 4).map((h) => (
              <Badge key={`${h.kind}:${h.key}`} variant="secondary" className="text-xs">
                {h.key}
              </Badge>
            ))}
            {threat.matchedHosts.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{threat.matchedHosts.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Perenual hosts (affected plants from API) */}
        {!threat.matchedHosts?.length && cardJson?.perenual_hosts && cardJson.perenual_hosts.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Affects: </span>
            {cardJson.perenual_hosts.slice(0, 3).join(', ')}
            {cardJson.perenual_hosts.length > 3 && ` +${cardJson.perenual_hosts.length - 3} more`}
          </div>
        )}

        {/* Data source attribution */}
        {hasPerenualData && (
          <div className="pt-2 border-t border-gray-100">
            <PerenualAttribution />
          </div>
        )}
      </CardContent>
    </Card>

    {/* Fullscreen Lightbox Modal */}
    {lightboxOpen && lightboxImageSrc && (
      <ImageLightbox
        src={lightboxImageSrc}
        alt={`${threat.commonName}${threat.scientificName ? ` (${threat.scientificName})` : ''}`}
        onClose={() => setLightboxOpen(false)}
        wikimediaImage={wikimediaImage}
        perenualImage={primaryPerenualImage}
      />
    )}
    </>
  );
}

function formatThreatType(type: string): string {
  const typeLabels: Record<string, string> = {
    pest: 'Pest',
    fungal: 'Fungal Disease',
    oomycete: 'Water Mold',
    bacterial: 'Bacterial Disease',
    viral: 'Viral Disease',
    nematode: 'Nematode',
    abiotic: 'Environmental Stress',
    nutrient: 'Nutrient Issue',
    weed: 'Weed',
    other: 'Other',
  };
  return typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Wikimedia Commons attribution component
 * Per their requirements: Author, License with link, Link to source
 * https://commons.wikimedia.org/wiki/Commons:Credit_line
 */
interface WikimediaAttributionProps {
  image: WikimediaImage;
}

function WikimediaAttribution({ image }: WikimediaAttributionProps) {
  // Check if attribution is required (not Public Domain or CC0)
  const requiresAttribution = !['Public Domain', 'CC0'].includes(image.license);
  
  // Format license display
  const licenseShort = image.license
    .replace('CC BY-SA ', 'CC BY-SA ')
    .replace('CC BY ', 'CC BY ');

  return (
    <div className="flex items-center justify-between text-[10px] text-white/90">
      <div className="flex items-center gap-1 min-w-0">
        {requiresAttribution ? (
          <>
            <span className="truncate">© {image.author}</span>
            <span className="text-white/60">•</span>
            <a 
              href={image.license_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white underline"
            >
              {licenseShort}
            </a>
          </>
        ) : (
          <span className="text-white/70">{image.license}</span>
        )}
      </div>
      <a
        href={image.wikimedia_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-0.5 text-white/70 hover:text-white ml-2 shrink-0"
        title="View on Wikimedia Commons"
      >
        <span className="hidden sm:inline">Wikimedia</span>
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    </div>
  );
}

/**
 * Fullscreen image lightbox modal
 */
interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
  wikimediaImage?: WikimediaImage;
  perenualImage?: PerenualImageLicense;
}

function ImageLightbox({ src, alt, onClose, wikimediaImage, perenualImage }: ImageLightboxProps) {
  // Close on escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Full size image of ${alt}`}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        aria-label="Close lightbox"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Image container - takes up most of the screen */}
      <div 
        className="flex-1 flex items-center justify-center p-4 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-full max-w-7xl max-h-[85vh]">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>
      </div>

      {/* Attribution bar at bottom */}
      <div 
        className="bg-black/80 px-4 py-3 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {wikimediaImage ? (
          <div className="text-sm text-white/90 flex items-center justify-center gap-2 flex-wrap">
            <span className="font-medium">{alt}</span>
            <span className="text-white/50">•</span>
            {!['Public Domain', 'CC0'].includes(wikimediaImage.license) && (
              <>
                <span>© {wikimediaImage.author}</span>
                <span className="text-white/50">•</span>
              </>
            )}
            <a 
              href={wikimediaImage.license_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 underline"
            >
              {wikimediaImage.license}
            </a>
            <span className="text-white/50">•</span>
            <a
              href={wikimediaImage.wikimedia_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 underline flex items-center gap-1"
            >
              View on Wikimedia Commons
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : perenualImage ? (
          <div className="text-sm text-white/90">
            <span className="font-medium">{alt}</span>
            <span className="text-white/50 mx-2">•</span>
            <span className="text-white/70">Image via Perenual</span>
          </div>
        ) : (
          <div className="text-sm text-white/90 font-medium">{alt}</div>
        )}
      </div>
    </div>
  );
}
