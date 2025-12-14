import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { PlantSpecies } from '../../lib/grow/species';

interface CareGuideCardProps {
  species: Pick<PlantSpecies, 'careGuides'>;
  maxSections?: number;
  expandable?: boolean;
}

const sectionIcons: Record<string, string> = {
  'watering': '💧',
  'sunlight': '☀️',
  'pruning': '✂️',
  'fertilizing': '🧪',
  'soil': '🪴',
  'planting': '🌱',
  'harvesting': '🧺',
  'pest': '🐛',
  'disease': '🩺',
  'propagation': '🪵',
  'temperature': '🌡️',
  'humidity': '💨',
};

function getSectionIcon(type: string): string {
  const lowerType = type.toLowerCase();
  for (const [key, icon] of Object.entries(sectionIcons)) {
    if (lowerType.includes(key)) return icon;
  }
  return '📖';
}

function formatSectionTitle(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Displays care guide sections from Perenual API.
 * Can show as a condensed list or expandable accordion.
 */
export function CareGuideCard({ species, maxSections = 5, expandable = true }: CareGuideCardProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  
  const careGuides = species.careGuides;
  
  if (!careGuides || careGuides.length === 0) {
    return null;
  }

  const displayedSections = careGuides.slice(0, maxSections);
  const hasMore = careGuides.length > maxSections;

  const toggleSection = (index: number) => {
    if (!expandable) return;
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <BookOpen className="h-4 w-4 text-green-600" />
          Care Guide
        </div>
        <Badge variant="secondary" className="text-xs">
          {careGuides.length} {careGuides.length === 1 ? 'tip' : 'tips'}
        </Badge>
      </div>

      <div className="space-y-2">
        {displayedSections.map((section, index) => {
          const isExpanded = expandedSections.has(index);
          const icon = getSectionIcon(section.type);
          const title = formatSectionTitle(section.type);
          
          return (
            <div 
              key={index} 
              className="rounded-lg border border-gray-200 bg-white overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSection(index)}
                disabled={!expandable}
                className={`w-full flex items-center justify-between p-3 text-left ${
                  expandable ? 'hover:bg-gray-50 cursor-pointer' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="font-medium text-sm text-gray-800">{title}</span>
                </div>
                {expandable && (
                  isExpanded 
                    ? <ChevronUp className="h-4 w-4 text-gray-400" />
                    : <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
              
              {(isExpanded || !expandable) && section.description && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                  <p className="text-sm text-gray-600 whitespace-pre-line mt-2">
                    {section.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {hasMore && (
        <p className="text-xs text-gray-500 text-center">
          +{careGuides.length - maxSections} more care tips available
        </p>
      )}
    </div>
  );
}
