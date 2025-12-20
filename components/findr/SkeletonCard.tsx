'use client';

import React from 'react';

/**
 * Skeleton Card Component (DaisyUI)
 * 
 * Loading placeholder for fish prediction cards.
 * Uses DaisyUI skeleton component for consistent styling.
 */

export const SkeletonCard: React.FC = () => {
  return (
    <div className="card h-full bg-base-100 shadow-xl" style={{ minHeight: '460px' }}>
      <div className="card-body flex h-full flex-col gap-4 sm:gap-5">
        {/* Image Skeleton */}
        <div
          className="skeleton relative mx-auto w-full h-48 sm:h-64 rounded-2xl aspect-[3/2] sm:aspect-[4/3]"
          style={{ minHeight: '192px' }}
        />

        {/* Title and Badge Skeleton */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Fish name */}
              <div className="skeleton h-7 sm:h-8 w-3/4"></div>
            </div>
            {/* Scientific name */}
            <div className="skeleton h-4 w-1/2"></div>
          </div>
          {/* Confidence badge */}
          <div className="skeleton h-10 w-10 rounded-full shrink-0"></div>
        </div>

        {/* Summary text skeleton */}
        <div className="space-y-2">
          <div className="skeleton h-4 w-full"></div>
          <div className="skeleton h-4 w-5/6"></div>
          <div className="skeleton h-4 w-4/6"></div>
        </div>

        {/* Button skeleton */}
        <div className="skeleton h-8 w-32 rounded-lg"></div>

        {/* Rationale section skeleton */}
        <div className="rounded-2xl border border-base-200 bg-base-200/30 p-4 space-y-2">
          <div className="skeleton h-4 w-1/3"></div>
          <div className="skeleton h-3 w-full"></div>
          <div className="skeleton h-3 w-4/5"></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Carousel Component (DaisyUI)
 * 
 * Loading placeholder for the card carousel.
 */

export const SkeletonCarousel: React.FC = () => {
  return (
    <div className="relative w-full">
      <div className="overflow-hidden">
        <div className="flex gap-4 md:gap-6">
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
};

/**
 * Compact Skeleton Card (DaisyUI)
 * 
 * Smaller loading placeholder for list views or compact displays.
 */

export const SkeletonCardCompact: React.FC = () => {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-4 flex flex-row gap-3 items-center">
        {/* Small image */}
        <div className="skeleton w-16 h-16 rounded-lg shrink-0" />
        
        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 w-2/3"></div>
          <div className="skeleton h-3 w-1/2"></div>
        </div>

        {/* Badge */}
        <div className="skeleton w-12 h-12 rounded-full shrink-0" />
      </div>
    </div>
  );
};

/**
 * Simple Loading Spinner (DaisyUI)
 * 
 * For inline loading states.
 */

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'loading-sm' : size === 'lg' ? 'loading-lg' : '';
  return <span className={`loading loading-spinner text-primary ${sizeClass}`}></span>;
};

/**
 * Skeleton Species List (DaisyUI)
 *
 * Loading placeholder for the full species lineup grid.
 * Reserves space to prevent CLS when species load.
 */

export const SkeletonSpeciesList: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <section className="space-y-5 px-4 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="skeleton h-7 w-48"></div>
        <div className="skeleton h-5 w-32"></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card bg-base-100 shadow-md border border-base-200/60">
            <div className="card-body space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="skeleton w-12 h-12 sm:w-14 sm:h-14 rounded-lg shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="skeleton h-5 w-24"></div>
                      <div className="skeleton h-5 w-10 rounded-full"></div>
                    </div>
                    <div className="skeleton h-3 w-20"></div>
                  </div>
                </div>
                <div className="skeleton w-8 h-8 rounded-full shrink-0" />
              </div>
              <div className="space-y-2">
                <div className="skeleton h-3 w-full"></div>
                <div className="skeleton h-3 w-5/6"></div>
              </div>
              <div className="space-y-2">
                <div className="skeleton h-3 w-1/3"></div>
                <div className="skeleton h-3 w-full"></div>
                <div className="skeleton h-3 w-4/5"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SkeletonCard;
