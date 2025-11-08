'use client';

import React from 'react';

interface GuildBadgeProps {
  guild: 'pelagic' | 'surf_estuary' | 'reef_kelp' | 'benthic' | 'cephalopod' | 'default_coastal' | string;
  size?: 'xs' | 'sm' | 'md';
  showTooltip?: boolean;
}

const GUILD_INFO: Record<string, {
  label: string;
  icon: string;
  description: string;
  color: string;
}> = {
  pelagic: {
    label: 'Pelagic',
    icon: '🌊',
    description: 'Open water baby!',
    color: 'badge-info'
  },
  surf_estuary: {
    label: 'Surf/Estuary',
    icon: '🏖️',
    description: 'Not too far out man!',
    color: 'badge-accent'
  },
  reef_kelp: {
    label: 'Reef/Kelp',
    icon: '🪨',
    description: 'Rocky habitats',
    color: 'badge-secondary'
  },
  benthic: {
    label: 'Benthic',
    icon: '⚓',
    description: 'Bottom-dwellers',
    color: 'badge-neutral'
  },
  cephalopod: {
    label: 'Cephalopod',
    icon: '🦑',
    description: 'Squiddycuttlepus',
    color: 'badge-primary'
  },
  default_coastal: {
    label: 'Coastal',
    icon: '🐟',
    description: 'Cruising the coast',
    color: 'badge-ghost'
  }
};

/**
 * GuildBadge - Shows the ecological guild of a species
 * 
 * Displays the species' habitat guild with environmental weighting info.
 * Each guild has different weights for temperature, salinity, depth, and substrate.
 * 
 * Examples:
 * - Pelagic (Mackerel, Bass): 38% temp weight - highly sensitive to water temperature
 * - Reef/Kelp (Wrasse, Pollock): 35% substrate weight - needs rocky bottom
 * - Benthic (Plaice, Sole): 30% substrate weight - bottom-dwellers
 */
export const GuildBadge: React.FC<GuildBadgeProps> = ({ 
  guild, 
  size = 'sm',
  showTooltip = true 
}) => {
  const info = GUILD_INFO[guild] || GUILD_INFO.default_coastal;

  const badge = (
  <div className={`badge ${info.color} badge-outline badge-${size} gap-1 font-medium`} style={{ boxShadow: 'none', filter: 'none' }}>
      <span role="img" aria-label={info.label}>{info.icon}</span>
      <span>{info.label}</span>
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <div 
      className="tooltip tooltip-bottom" 
      data-tip={info.description}
    >
      {badge}
    </div>
  );
};
