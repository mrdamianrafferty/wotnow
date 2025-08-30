import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Share2 } from 'lucide-react';
import { createPortal } from 'react-dom';

// Dynamically import EnhancedShareModal with no SSR
const EnhancedShareModal = dynamic(() => import('./sharing/EnhancedShareModal'), {
  ssr: false,
});

// Create a portal target for the modal
const modalRoot = typeof document !== 'undefined' ? document.body : null;

interface ShareButtonProps {
  activityId: string;
  activityName: string;
  activityDescription?: string;
  activityMessage?: string;
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'ghost' | 'outline' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const buttonVariants = {
  default: 'btn',
  ghost: 'btn btn-ghost',
  outline: 'btn btn-outline',
  link: 'btn btn-link',
};

const buttonSizes = {
  default: '',
  sm: 'btn-sm',
  lg: 'btn-lg',
  icon: 'btn-square',
};

export const ShareButton: React.FC<ShareButtonProps> = ({
  activityId,
  activityName,
  activityDescription,
  activityMessage,
  className = '',
  children,
  variant = 'default',
  size = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      <button
        onClick={handleClick}
        className={`${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
        aria-label={`Share ${activityName}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Share2 size={16} className="mr-1" />
        {children || 'Share'}
      </button>
      
      {modalRoot && isOpen && createPortal(
        <div className="fixed inset-0 z-50">
          <EnhancedShareModal
            isOpen={isOpen}
            onClose={handleClose}
            activityId={activityId}
            activityName={activityName}
            activityDescription={activityDescription}
            activityMessage={activityMessage}
          />
        </div>,
        modalRoot
      )}
    </>
  );
};