'use client';

import React from 'react';
import CoastalLocationDialog, { type BasicLocation } from '@/components/CoastalLocationDialog';

interface GrowLocationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (location: BasicLocation) => void;
}

/**
 * Simplified location dialog for Grow (gardening) context.
 * Wraps CoastalLocationDialog with garden-specific title and styling.
 */
export function GrowLocationDialog({ open, onClose, onSave }: GrowLocationDialogProps) {
  return (
    <CoastalLocationDialog
      open={open}
      onClose={onClose}
      title="Set your garden location"
      onSave={onSave}
    />
  );
}
