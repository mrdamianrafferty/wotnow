'use client';

import React, { useMemo } from 'react';

interface MiniCalendarProps {
  forecast: number[]; // Array of 7 confidence scores (0-100)
  className?: string;
  compact?: boolean;
  showLabels?: boolean;
}

/**
 * MiniCalendar - 7-day confidence forecast bar chart
 * 
 * Displays a visual representation of fishing conditions over the next 7 days.
 * Colors based on confidence levels:
 * - Red (85%+): Peak conditions
 * - Yellow (60-84%): Good conditions  
 * - Blue/Gray (<60%): Fair/waiting conditions
 */
export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  forecast,
  className = '',
  compact = false,
  showLabels = true,
}) => {
  const days = useMemo(() => {
    const today = new Date();
    return forecast.slice(0, 7).map((confidence, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() + index);
      
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.getDate(),
        confidence,
        color: getConfidenceColor(confidence),
        height: `${Math.max(confidence, 10)}%`, // Minimum 10% for visibility
      };
    });
  }, [forecast]);

  const maxConfidence = Math.max(...forecast.slice(0, 7));

  return (
    <div className={`mini-calendar ${className}`}>
      {/* Bar Chart */}
      <div className={`flex items-end justify-between gap-1 ${compact ? 'h-12' : 'h-20'}`}>
        {days.map((day, index) => (
          <div
            key={index}
            className="flex flex-col items-center flex-1 min-w-0"
            title={`${day.day}: ${day.confidence}% confidence`}
          >
            {/* Bar */}
            <div className="relative w-full flex items-end" style={{ height: compact ? '48px' : '64px' }}>
              <div
                className={`w-full rounded-t transition-all duration-300 ${day.color} relative group cursor-help`}
                style={{ height: day.height }}
              >
                {/* Confidence label on hover */}
                {!compact && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-bold whitespace-nowrap bg-base-100 px-2 py-1 rounded shadow-lg">
                      {day.confidence}%
                    </span>
                  </div>
                )}
                
                {/* Peak indicator */}
                {day.confidence === maxConfidence && day.confidence >= 70 && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="text-xs">🔥</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Day label */}
            {showLabels && (
              <div className="text-center mt-1">
                <span className={`text-xs ${compact ? 'font-normal' : 'font-semibold'} text-base-content/70`}>
                  {index === 0 ? 'Now' : day.day.slice(0, compact ? 1 : 3)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend (non-compact only) */}
      {!compact && showLabels && (
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-base-content/60">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-error"></div>
            <span>Peak</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning"></div>
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-info"></div>
            <span>Fair</span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Get color class based on confidence score
 */
function getConfidenceColor(confidence: number | null): string {
  if (confidence === null || confidence < 60) {
    return 'bg-base-300'; // Gray - waiting
  }
  if (confidence < 70) {
    return 'bg-info'; // Blue - fair
  }
  if (confidence < 85) {
    return 'bg-warning'; // Yellow - good
  }
  return 'bg-error'; // Red - peak
}

export default MiniCalendar;
