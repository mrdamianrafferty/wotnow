import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Loader2, Sprout } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/grow/api';
import { BED_TYPES, type BedType } from '../../lib/grow/server/beds';
import type { SerializedBed } from '../../lib/grow/server/beds';

const TYPE_ICONS: Record<BedType, string> = {
  raised_bed: '🌱',
  container: '🪴',
  in_ground: '🌿',
  greenhouse: '🏠',
  polytunnel: '🌀',
  other: '📦',
  veg_patch: '🥬',
  permaculture_space: '🌳',
};

/** Friendly default names when creating a new bed of each type */
const DEFAULT_BED_NAMES: Record<BedType, string> = {
  raised_bed: 'Raised Bed',
  container: 'Container',
  in_ground: 'Garden Bed',
  greenhouse: 'Greenhouse',
  polytunnel: 'Polytunnel',
  other: 'Growing Space',
  veg_patch: 'Veg Patch',
  permaculture_space: 'Permaculture Space',
};

interface CreateBedSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBedCreated: (bed: SerializedBed) => void;
  existingBedCount: number;
  onPermacultureSpaceSelected?: () => void;
}

export function CreateBedSheet({ open, onOpenChange, onBedCreated, existingBedCount, onPermacultureSpaceSelected }: CreateBedSheetProps) {
  const [step, setStep] = useState<'type' | 'name'>('type');
  const [selectedType, setSelectedType] = useState<BedType | null>(null);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const resetState = () => {
    setStep('type');
    setSelectedType(null);
    setName('');
    setIsSaving(false);
    setShowUpgradePrompt(false);
  };

  const handleTypeSelect = (type: BedType) => {
    if (type === 'permaculture_space' && onPermacultureSpaceSelected) {
      // Close the sheet and launch the guild flow instead
      onOpenChange(false);
      resetState();
      onPermacultureSpaceSelected();
      return;
    }

    setSelectedType(type);
    // Auto-populate name with a friendly default + number
    const friendlyName = DEFAULT_BED_NAMES[type];
    setName(`${friendlyName} ${existingBedCount + 1}`);
    setStep('name');
  };

  const handleCreate = async () => {
    if (!selectedType || !name.trim()) return;

    setIsSaving(true);
    try {
      const response = await api.createBed({ name: name.trim(), type: selectedType });
      const bed = response?.bed as SerializedBed;
      if (!bed) throw new Error('Unexpected response');

      onBedCreated(bed);
      toast.success(`${bed.name} created`, { description: 'Your new bed is ready for plants.' });
      onOpenChange(false);
      resetState();
    } catch (error: unknown) {
      const apiError = error as { status?: number; response?: { limit?: number } };
      if (apiError.status === 403) {
        setShowUpgradePrompt(true);
        setIsSaving(false);
        return;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Could not create bed', { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-green-600" />
            {step === 'type' ? 'What kind of bed or container?' : 'Name your bed or container'}
          </DialogTitle>
        </DialogHeader>

        {showUpgradePrompt ? (
          <div className="text-center py-6 space-y-3">
            <Sprout className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-sm text-muted-foreground">
              You&apos;ve reached your free bed limit.
              Upgrade for unlimited beds, or add plants without beds in the Plants tab.
            </p>
            <Button
              onClick={() => { window.location.href = '/grow/premium'; }}
              className="bg-green-600 hover:bg-green-700"
            >
              View Plans
            </Button>
          </div>
        ) : step === 'type' ? (
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(BED_TYPES) as [BedType, string][]).map(([type, label]) => (
              <button
                key={type}
                onClick={() => handleTypeSelect(type)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-muted hover:border-green-500 hover:bg-green-50 transition-all text-center"
              >
                <span className="text-2xl">{TYPE_ICONS[type]}</span>
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bed-name">Bed name</Label>
              <Input
                id="bed-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Raised Bed 1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('type')}
                disabled={isSaving}
              >
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isSaving || !name.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating…
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
