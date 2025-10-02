'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export interface FindrModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const FindrModal: React.FC<FindrModalProps> = ({ title, open, onClose, children }) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  return (
    <div className={`modal ${open ? 'modal-open' : ''}`}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="modal-box w-[calc(100%-1.5rem)] max-w-lg space-y-4 rounded-2xl p-4 sm:max-w-2xl sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id={titleId} className="font-semibold text-lg">
            {title}
          </h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm h-10 w-10"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label="Close" />
    </div>
  );
};

export default FindrModal;
