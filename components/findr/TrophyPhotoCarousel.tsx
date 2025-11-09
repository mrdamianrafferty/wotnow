/**
 * TrophyPhotoCarousel Component
 * 
 * Advanced image carousel component for displaying catch photos with:
 * - Full-screen modal view with navigation
 * - Thumbnail navigation strip
 * - Keyboard controls (arrow keys, escape)
 * - Touch/swipe support for mobile
 * - Image captions and metadata display
 * - Zoom functionality in full-screen mode
 * - Loading states and error handling
 * 
 * Used for displaying catch photos in history views and trophy galleries.
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Download, Share2, Calendar, MapPin, Fish, Camera,
  Maximize2, ChevronUp, ChevronDown, Trophy
} from 'lucide-react';
import { shareText } from '@/lib/capacitor/share';
import { TranslatedText } from '../translation/TranslatedFishCard';

// Types
export interface PhotoData {
  id: string;
  url: string;
  thumbnail?: string;
  caption?: string;
  pinned?: boolean;
  metadata?: {
    speciesName?: string;
    location?: string;
    date?: string;
    photographer?: string;
    icesRectangle?: string;
    quantity?: number;
    size?: string;
    bait?: string;
  };
}

interface TrophyPhotoCarouselProps {
  photos: PhotoData[];
  initialPhotoIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  showThumbnails?: boolean;
  allowDownload?: boolean;
  allowShare?: boolean;
  allowZoom?: boolean;
}

export function TrophyPhotoCarousel({
  photos,
  initialPhotoIndex = 0,
  isOpen,
  onClose,
  title = 'Trophy Photos',
  showThumbnails = true,
  allowDownload = true,
  allowShare = true,
  allowZoom = true,
}: TrophyPhotoCarouselProps) {
  
  // State
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showMetadata, setShowMetadata] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Current photo
  const currentPhoto = photos[currentIndex];
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialPhotoIndex, photos.length - 1)));
      setZoomLevel(1);
      setIsFullscreen(false);
      setShowMetadata(true);
      setImageError(false);
    }
  }, [isOpen, initialPhotoIndex, photos.length]);
  
  // Navigation functions
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : photos.length - 1);
    setZoomLevel(1);
    setImageError(false);
  }, [photos.length]);
  
  const goToNext = useCallback(() => {
    setCurrentIndex(prev => prev < photos.length - 1 ? prev + 1 : 0);
    setZoomLevel(1);
    setImageError(false);
  }, [photos.length]);
  
  const goToPhoto = useCallback((index: number) => {
    if (index >= 0 && index < photos.length) {
      setCurrentIndex(index);
      setZoomLevel(1);
      setImageError(false);
    }
  }, [photos.length]);
  
  // Zoom functions
  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  }, []);
  
  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  }, []);
  
  const resetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);
  
  // Download function
  const downloadImage = useCallback(async () => {
    if (!currentPhoto || !allowDownload) return;
    
    try {
      const response = await fetch(currentPhoto.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `catch-photo-${currentPhoto.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, [currentPhoto, allowDownload]);
  
  // Share function - Using Capacitor wrapper
  const shareImage = useCallback(async () => {
    if (!currentPhoto || !allowShare) return;

    try {
      // Build share content with metadata
      let shareContent = '🎣 ';

      if (currentPhoto.metadata?.speciesName) {
        shareContent += `${currentPhoto.metadata.speciesName}`;
      } else {
        shareContent += 'My Fishing Trophy';
      }

      if (currentPhoto.metadata?.date) {
        shareContent += `\n📅 ${new Date(currentPhoto.metadata.date).toLocaleDateString()}`;
      }

      if (currentPhoto.metadata?.location) {
        shareContent += `\n📍 ${currentPhoto.metadata.location}`;
      }

      if (currentPhoto.metadata?.quantity) {
        shareContent += `\n🐟 Quantity: ${currentPhoto.metadata.quantity}`;
      }

      if (currentPhoto.metadata?.size) {
        shareContent += `\n📏 Size: ${currentPhoto.metadata.size}`;
      }

      if (currentPhoto.metadata?.bait) {
        shareContent += `\n🎣 Bait: ${currentPhoto.metadata.bait}`;
      }

      shareContent += '\n\nCheck out fishfindr.eu for fishing predictions!';

      await shareText(shareContent, 'My Fishing Trophy');
    } catch (error) {
      console.error('[TrophyPhotoCarousel] Share failed:', error);
    }
  }, [currentPhoto, allowShare]);
  
  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case '+':
        case '=':
          if (allowZoom) {
            event.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (allowZoom) {
            event.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (allowZoom) {
            event.preventDefault();
            resetZoom();
          }
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          setIsFullscreen(prev => !prev);
          break;
        case 'm':
        case 'M':
          event.preventDefault();
          setShowMetadata(prev => !prev);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, allowZoom, goToPrevious, goToNext, onClose, zoomIn, zoomOut, resetZoom]);
  
  // Image loading handlers
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);
  
  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);
  
  const handleImageLoadStart = useCallback(() => {
    setImageLoading(true);
    setImageError(false);
  }, []);
  
  if (!isOpen || photos.length === 0) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8" />
            <h2 className="text-xl font-semibold">
              <TranslatedText text={title} />
            </h2>
            <span className="text-lg opacity-80">
              {currentIndex + 1} / {photos.length}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            {allowZoom && (
              <>
                <button
                  onClick={zoomOut}
                  className="btn btn-circle bg-black/80 border-2 border-white/30 text-white hover:bg-purple-600 hover:border-purple-400 min-w-[48px] min-h-[48px] shadow-xl backdrop-blur-sm disabled:opacity-40"
                  disabled={zoomLevel <= 0.5}
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-6 h-6 stroke-[2.5]" />
                </button>
                <span className="text-lg font-semibold text-white min-w-[4rem] text-center bg-black/80 px-3 py-1 rounded-lg border-2 border-white/30 shadow-xl backdrop-blur-sm">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  className="btn btn-circle bg-black/80 border-2 border-white/30 text-white hover:bg-purple-600 hover:border-purple-400 min-w-[48px] min-h-[48px] shadow-xl backdrop-blur-sm disabled:opacity-40"
                  disabled={zoomLevel >= 3}
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-6 h-6 stroke-[2.5]" />
                </button>
              </>
            )}
            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn btn-circle bg-black/80 border-2 border-white/30 text-white hover:bg-indigo-600 hover:border-indigo-400 min-w-[48px] min-h-[48px] shadow-xl backdrop-blur-sm"
              title="Toggle Fullscreen (F)"
            >
              <Maximize2 className="w-6 h-6 stroke-[2.5]" />
            </button>
            {/* Download */}
            {allowDownload && (
              <button
                onClick={downloadImage}
                className="btn btn-circle bg-black/80 border-2 border-white/30 text-white hover:bg-green-600 hover:border-green-400 min-w-[56px] min-h-[56px] shadow-xl backdrop-blur-sm"
                title="Download"
              >
                <Download className="w-8 h-8 stroke-[2.5]" />
              </button>
            )}
            {/* Share */}
            {allowShare && (
              <button
                onClick={shareImage}
                className="btn btn-circle bg-black/80 border-2 border-white/30 text-white hover:bg-blue-600 hover:border-blue-400 min-w-[56px] min-h-[56px] shadow-xl backdrop-blur-sm"
                title="Share"
              >
                <Share2 className="w-8 h-8 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Large Close Button (always visible, top-right) */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-50 btn btn-circle bg-black/90 border-2 border-white/40 text-white hover:bg-red-600 hover:border-red-400 min-w-[64px] min-h-[64px] shadow-2xl backdrop-blur-sm"
        title="Close (Esc)"
        aria-label="Close full screen photo"
      >
        <X className="w-12 h-12 stroke-[3]" />
      </button>
      
      {/* Main Image Area */}
      <div 
        ref={containerRef}
        className={`relative flex-1 flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-16'}`}
        onClick={e => {
          // Only close if clicking outside the image area (mobile-friendly)
          if (e.target === containerRef.current) {
            onClose();
          }
        }}
        style={{ touchAction: 'manipulation' }}
      >
        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 btn btn-circle bg-black/90 border-2 border-white/40 text-white hover:bg-black hover:border-white min-w-[64px] min-h-[64px] shadow-2xl backdrop-blur-sm"
              title="Previous (←)"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-10 h-10 stroke-[3]" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 btn btn-circle bg-black/90 border-2 border-white/40 text-white hover:bg-black hover:border-white min-w-[64px] min-h-[64px] shadow-2xl backdrop-blur-sm"
              title="Next (→)"
              aria-label="Next photo"
            >
              <ChevronRight className="w-10 h-10 stroke-[3]" />
            </button>
          </>
        )}
        
        {/* Image Container */}
        <div className="relative max-w-full max-h-full flex items-center justify-center">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="loading loading-spinner loading-lg text-white"></span>
            </div>
          )}
          
          {imageError ? (
            <div className="text-center text-white p-8">
              <div className="text-6xl mb-4">🖼️</div>
              <p className="text-lg font-medium mb-2">
                <TranslatedText text="Failed to load image" />
              </p>
              <p className="text-sm opacity-70">
                <TranslatedText text="The photo could not be displayed" />
              </p>
            </div>
          ) : (
            <div 
              className="overflow-hidden rounded-lg"
              style={{
                transform: `scale(${zoomLevel})`,
                transition: 'transform 0.2s ease-out',
                cursor: zoomLevel > 1 ? 'grab' : 'zoom-in',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={currentPhoto.url}
                alt={currentPhoto.caption || `Photo ${currentIndex + 1}`}
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
                onLoadStart={handleImageLoadStart}
                onClick={allowZoom ? (zoomLevel === 1 ? zoomIn : resetZoom) : undefined}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Metadata Panel */}
      {showMetadata && currentPhoto.metadata && !isFullscreen && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent text-white p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {currentPhoto.caption && (
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium">{currentPhoto.caption}</h3>
                  {currentPhoto.metadata.photographer === 'Stock photo' && (
                    <span className="badge badge-sm bg-white/20 text-white border-none">
                      Stock Photo
                    </span>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {currentPhoto.metadata.speciesName && (
                  <div className="flex items-center gap-2">
                    <Fish className="w-4 h-4 opacity-70" />
                    <span>{currentPhoto.metadata.speciesName}</span>
                  </div>
                )}
                
                {currentPhoto.metadata.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 opacity-70" />
                    <span>{new Date(currentPhoto.metadata.date).toLocaleDateString()}</span>
                  </div>
                )}
                
                {currentPhoto.metadata.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 opacity-70" />
                    <span>{currentPhoto.metadata.location}</span>
                  </div>
                )}
                
                {currentPhoto.metadata.quantity && (
                  <div className="text-sm">
                    <span className="opacity-70">Quantity: </span>
                    <span>{currentPhoto.metadata.quantity}</span>
                  </div>
                )}
                
                {currentPhoto.metadata.size && (
                  <div className="text-sm">
                    <span className="opacity-70">Size: </span>
                    <span>{currentPhoto.metadata.size}</span>
                  </div>
                )}
                
                {currentPhoto.metadata.bait && (
                  <div className="text-sm">
                    <span className="opacity-70">Bait: </span>
                    <span>{currentPhoto.metadata.bait}</span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => setShowMetadata(false)}
              className="btn btn-ghost btn-sm btn-circle text-white hover:bg-white/20 ml-4"
              title="Hide Metadata (M)"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Show Metadata Button (when hidden) */}
      {!showMetadata && !isFullscreen && (
        <button
          onClick={() => setShowMetadata(true)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 btn btn-sm bg-black/50 border-white/20 text-white hover:bg-black/70"
          title="Show Metadata (M)"
        >
          <ChevronUp className="w-4 h-4" />
          <TranslatedText text="Show Info" />
        </button>
      )}
      
      {/* Thumbnail Navigation */}
      {showThumbnails && photos.length > 1 && !isFullscreen && (
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="bg-black/60 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex gap-2 justify-center overflow-x-auto max-w-full">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => goToPhoto(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-white shadow-lg' 
                      : 'border-white/30 hover:border-white/60'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnail || photo.url}
                    alt={`Thumbnail ${index + 1}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility component for inline photo galleries
export function PhotoGalleryGrid({ 
  photos, 
  onPhotoClickAction,
  onPinToggle,
  // columns prop removed; responsive grid classes now control columns
  aspectRatio = 'square' 
}: {
  photos: PhotoData[];
  onPhotoClickAction: (index: number) => void;
  onPinToggle?: (photo: PhotoData, index: number) => void;
  columns?: number;
  aspectRatio?: 'square' | 'wide' | 'tall';
}) {
  const aspectClasses = {
    square: 'aspect-square',
    wide: 'aspect-video', 
    tall: 'aspect-[3/4]'
  };
  
  return (
    <div className={
      `grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
    }>
      {photos.map((photo, index) => {
        const isStockPhoto = photo.metadata?.photographer === 'Stock photo';

        return (
          <div key={photo.id} className={`relative ${aspectClasses[aspectRatio]} rounded-lg overflow-hidden bg-base-200 hover:shadow-lg transition-all duration-200 group`}>
            <button
              onClick={() => onPhotoClickAction(index)}
              className="absolute inset-0 w-full h-full z-0"
              tabIndex={-1}
              aria-label={photo.caption || `Photo ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbnail || photo.url}
                alt={photo.caption || `Photo ${index + 1}`}
                width={200}
                height={200}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </button>

            {/* Pin (Trophy) icon button */}
            {onPinToggle && (
              <button
                type="button"
                className={`absolute top-2 left-2 z-10 p-1 rounded-full bg-white/80 hover:bg-yellow-200 border border-yellow-400 shadow ${photo.pinned ? 'text-yellow-500' : 'text-gray-400'}`}
                title={photo.pinned ? 'Unpin this catch' : 'Pin this catch'}
                onClick={e => { e.stopPropagation(); onPinToggle(photo, index); }}
              >
                <Trophy className="w-5 h-5" fill={photo.pinned ? '#facc15' : 'none'} />
              </button>
            )}

            {/* Stock photo indicator badge */}
            {isStockPhoto && (
              <div className="absolute top-2 right-2 badge badge-sm bg-black/50 text-white border-none">
                Stock
              </div>
            )}

            {photo.caption && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2 pointer-events-none">
                <span className="text-white text-xs font-medium">
                  {photo.caption}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}