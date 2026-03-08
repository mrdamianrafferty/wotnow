/**
 * Go Daisy+ Locked Overlay
 *
 * Blurred content wrapper with lock icon and upgrade CTA.
 * Used for soft-gating Plus features (user sees blurred preview, not a blank wall).
 *
 * @module components/GoDaisyLockedOverlay
 */

import React from 'react';
import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import type { GoDaisyUpgradeFeature } from './GoDaisyUpgradePrompt';
import { UPGRADE_HEADLINES } from '@/lib/godaisy/subscription';

interface GoDaisyLockedOverlayProps {
  feature: GoDaisyUpgradeFeature;
  children: React.ReactNode;
  className?: string;
  /** Show compact lock badge instead of full overlay */
  compact?: boolean;
}

export function GoDaisyLockedOverlay({
  feature,
  children,
  className = '',
  compact = false,
}: GoDaisyLockedOverlayProps) {
  const headline = UPGRADE_HEADLINES[feature] || 'Upgrade to Go Daisy+';

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <div className="blur-[3px] pointer-events-none select-none opacity-60">
          {children}
        </div>
        <Link
          href="/godaisy-plus"
          className="absolute top-2 right-2 badge badge-sm gap-1 bg-cyan-600 text-white border-none hover:bg-cyan-700 transition-colors"
        >
          <Lock className="h-3 w-3" />
          Plus
        </Link>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Blurred content preview */}
      <div className="blur-[6px] pointer-events-none select-none opacity-50">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-100/30 backdrop-blur-[2px]">
        <div className="text-center space-y-3 p-4 max-w-xs">
          <div className="mx-auto w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
            <Lock className="h-5 w-5 text-cyan-600" />
          </div>
          <p className="text-sm font-medium text-base-content">{headline}</p>
          <Link href="/godaisy-plus">
            <button className="btn btn-sm bg-cyan-600 hover:bg-cyan-700 text-white border-none gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade to Plus
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
