import React from 'react';
import { Skeleton } from '../../SkeletonLoader';

export function HomepageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="motion-safe:animate-fade-in" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-3.5 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Bed pills row */}
      <div className="motion-safe:animate-fade-in" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[60px] w-[120px] rounded-xl shrink-0" />
          ))}
        </div>
      </div>

      {/* Weather pulse card */}
      <div className="motion-safe:animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>

      {/* Compact card */}
      <div className="motion-safe:animate-fade-in" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
