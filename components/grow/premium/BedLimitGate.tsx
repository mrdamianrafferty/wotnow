/**
 * BedLimitGate — Friendly dual-CTA modal shown when free users hit the 2-bed limit.
 *
 * Celebrates progress, offers two paths:
 *   1. Keep planting for free (switches to Plants tab + opens AddPlantDialog)
 *   2. Upgrade for unlimited beds (navigates to /grow/premium)
 */

import { Dialog, DialogContent } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Sprout, Leaf, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface BedLimitGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPlantsInstead: () => void;
}

export function BedLimitGate({ open, onOpenChange, onAddPlantsInstead }: BedLimitGateProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 px-6 pt-6 pb-5 text-white text-center">
          <Sprout className="h-8 w-8 mx-auto mb-2" />
          <h2 className="text-lg font-bold">Your garden is growing!</h2>
          <p className="text-sm text-emerald-100 mt-1">
            You&apos;ve filled your 2 free beds — nice work!
            Here&apos;s how to keep going:
          </p>
        </div>

        {/* Cards */}
        <div className="p-5 space-y-3">
          {/* Free option — prominent, first */}
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-emerald-900 text-sm">Keep planting for free</h3>
            </div>
            <p className="text-xs text-emerald-700 mb-3">
              Add plants in the Plants tab — no bed needed.
              You can organise them into beds later.
            </p>
            <Button
              onClick={onAddPlantsInstead}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-9"
            >
              Start Planting
            </Button>
          </div>

          {/* Upgrade option */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Unlock unlimited beds</h3>
            </div>
            <p className="text-xs text-gray-600 mb-1">
              <span className="font-medium">Sprout</span> — from €3.99/mo
            </p>
            <ul className="text-xs text-gray-500 space-y-0.5 mb-3 ml-1">
              <li>✓ Unlimited garden beds</li>
              <li>✓ 75 plants (up from 25)</li>
              <li>✓ More AI identifications</li>
            </ul>
            <Link href="/grow/premium">
              <Button
                variant="outline"
                className="w-full text-sm h-9"
                onClick={() => onOpenChange(false)}
              >
                View Plans
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
