import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ImageAttribution, PerenualAttribution, type PerenualImageLicense } from './PerenualAttribution';
import { AlertTriangle, Bug, Leaf, Droplets, Thermometer, Skull, Worm } from 'lucide-react';

type ThreatRiskBand = 'none' | 'low' | 'moderate' | 'high' | 'severe';

interface ThreatCardJson {
  where_on_plant?: string[];
  confirmation_tips?: string[];
  prevention_bullets?: string[];
  recognition_bullets?: string[];
  treatment_pesticide_free?: string[];
  when_to_escalate_bullets?: string[];
  // Perenual enrichment
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
  const cardJson = threat.cardJson as ThreatCardJson;
  const images = cardJson?.images;
  const primaryImage = images?.[0];
  const hasPerenualData = !!cardJson?.perenual_id;
  
  return (
    <Card className={`border-2 ${CARD_BORDER_COLORS[threat.band]} overflow-hidden`}>
      {/* Image section with attribution */}
      {primaryImage && (
        <div className="relative">
          <div className="relative h-32 w-full bg-muted">
            <Image
              src={primaryImage.medium_url || primaryImage.small_url || primaryImage.thumbnail}
              alt={threat.commonName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          {/* Image attribution overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
            <ImageAttribution image={primaryImage} size="sm" className="text-white/80 hover:text-white" />
          </div>
        </div>
      )}

      <CardHeader className={primaryImage ? 'pt-3' : ''}>
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
