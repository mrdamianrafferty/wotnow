import React from 'react';
import { Skeleton, SkeletonText } from '../SkeletonLoader';

/**
 * Skeleton loader for Grow Homepage with task cards
 */
export const SkeletonGrowHomepage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header with location */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Weather context card */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="w-20 h-20 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Task cards stack */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3 flex-1">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="w-16 h-8 rounded-full" />
            </div>
            <SkeletonText lines={2} />
            <div className="flex justify-between items-center mt-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      ))}
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
