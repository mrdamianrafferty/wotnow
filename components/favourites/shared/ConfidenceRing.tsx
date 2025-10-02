/**
 * ConfidenceRing Component
 * 
 * Radial progress indicator showing confidence score (0-100)
 * Color-coded by confidence bands: active (green), good (blue), waiting (amber)
 */

import React from 'react';
import type { ConfidenceBand } from '../../../types/favourites';

interface ConfidenceRingProps {
  score: number;              // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ConfidenceRing({ 
  score, 
  size = 'md', 
  showLabel = true,
  className = '' 
}: ConfidenceRingProps) {
  // Clamp score to 0-100
  const clampedScore = Math.max(0, Math.min(100, score));
  
  // Determine confidence band
  const band: ConfidenceBand = 
    clampedScore >= 85 ? 'active' :
    clampedScore >= 60 ? 'good' :
    'waiting';
  
  // Size configurations
  const sizeConfig = {
    sm: { 
      diameter: 48, 
      strokeWidth: 4, 
      fontSize: 'text-xs',
      labelSize: 'text-[10px]'
    },
    md: { 
      diameter: 64, 
      strokeWidth: 6, 
      fontSize: 'text-sm',
      labelSize: 'text-xs'
    },
    lg: { 
      diameter: 96, 
      strokeWidth: 8, 
      fontSize: 'text-lg',
      labelSize: 'text-sm'
    }
  }[size];
  
  // Color mapping
  const colorMap: Record<ConfidenceBand, { stroke: string; text: string; glow: string }> = {
    active: {
      stroke: 'stroke-success',
      text: 'text-success',
      glow: 'drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]'
    },
    good: {
      stroke: 'stroke-info',
      text: 'text-info',
      glow: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]'
    },
    waiting: {
      stroke: 'stroke-warning',
      text: 'text-warning',
      glow: ''
    }
  };
  
  const colors = colorMap[band];
  
  // SVG circle calculations
  const radius = (sizeConfig.diameter - sizeConfig.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;
  
  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* SVG Ring */}
      <svg 
        width={sizeConfig.diameter} 
        height={sizeConfig.diameter}
        className={band === 'active' ? colors.glow : ''}
      >
        {/* Background circle */}
        <circle
          cx={sizeConfig.diameter / 2}
          cy={sizeConfig.diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={sizeConfig.strokeWidth}
          className="text-base-300 opacity-30"
        />
        
        {/* Progress circle */}
        <circle
          cx={sizeConfig.diameter / 2}
          cy={sizeConfig.diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={sizeConfig.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colors.stroke} transition-all duration-500 ease-out`}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%'
          }}
        />
        
        {/* Center text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.35em"
          className={`${sizeConfig.fontSize} font-bold ${colors.text} fill-current`}
        >
          {Math.round(clampedScore)}%
        </text>
      </svg>
      
      {/* Optional label */}
      {showLabel && (
        <span className={`mt-1 ${sizeConfig.labelSize} text-base-content/70 font-medium`}>
          Confidence
        </span>
      )}
    </div>
  );
}

export default ConfidenceRing;
