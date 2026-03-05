import React from 'react';
import { Skeleton, SkeletonText } from '../SkeletonLoader';

/**
 * Skeleton loader for Grow Homepage — garden status dashboard
 */
export const SkeletonGrowHomepage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Bed pills row */}
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-[60px] w-[120px] rounded-xl shrink-0" />
        ))}
      </div>

      {/* Weather pulse card */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>

      {/* Compact card */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  );
};

/**
 * Skeleton loader for Garden Page with plant grid
 */
export const SkeletonGardenPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Plant grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card bg-base-100 shadow-md">
            <div className="card-body">
              <div className="flex items-center space-x-3 mb-3">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <SkeletonText lines={2} />
              <div className="flex justify-between items-center mt-3">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton loader for Plan Page with calendar
 */
export const SkeletonPlanPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="w-10 h-10 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Calendar grid */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming events */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="card bg-base-100 shadow-sm">
            <div className="card-body py-3">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton loader for Weather Page
 */
export const SkeletonWeatherPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Location header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Current conditions card */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body text-center">
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-12 w-32 mx-auto mt-4" />
          <Skeleton className="h-6 w-48 mx-auto mt-2" />
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forecast cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card bg-base-100 shadow-md">
            <div className="card-body py-4 px-3 text-center">
              <Skeleton className="h-4 w-20 mx-auto" />
              <Skeleton className="w-12 h-12 rounded-full mx-auto my-3" />
              <Skeleton className="h-6 w-16 mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Garden alerts */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {[1, 2].map((i) => (
          <div key={i} className="card bg-base-100 shadow-sm">
            <div className="card-body py-3">
              <div className="flex items-start space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton loader for Info Page with accordion sections
 */
export const SkeletonInfoPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-80 mt-2" />
      </div>

      {/* Accordion sections */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="card bg-base-100 shadow-md">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="h-6 w-48" />
            </div>
            {[1, 2, 3].map((j) => (
              <div key={j} className="py-3 border-b border-base-200 last:border-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-5 w-64" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
