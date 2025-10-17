/**
 * Test page for TrophyPhotoCarousel component
 * Navigate to /test/trophy-photo-carousel to test the image carousel functionality
 */

'use client';

import React, { useState } from 'react';
import { Camera, ImageIcon, Zap, CheckCircle } from 'lucide-react';
import { TrophyPhotoCarousel, PhotoGalleryGrid, type PhotoData } from '../../components/findr/TrophyPhotoCarousel';

// Sample photo data for testing
const samplePhotos: PhotoData[] = [
  {
    id: '1',
    url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=200&h=150&fit=crop',
    caption: 'Beautiful Atlantic Mackerel',
    metadata: {
      speciesName: 'Atlantic Mackerel',
      location: 'Brighton Marina',
      date: '2024-01-15',
      icesRectangle: '31E8',
      quantity: 3,
      size: 'average',
      bait: 'Feather rigs',
      photographer: 'Test User'
    }
  },
  {
    id: '2', 
    url: 'https://images.unsplash.com/photo-1571079570759-ce7ec0c8aa74?w=800&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1571079570759-ce7ec0c8aa74?w=200&h=150&fit=crop',
    caption: 'Impressive Sea Bass Catch',
    metadata: {
      speciesName: 'European Sea Bass',
      location: 'Shoreham Beach',
      date: '2024-01-12',
      icesRectangle: '31E8',
      quantity: 1,
      size: 'large',
      bait: 'Ragworm',
      photographer: 'Test User'
    }
  },
  {
    id: '3',
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=200&h=150&fit=crop',
    caption: 'Lucky Cod from the Pier',
    metadata: {
      speciesName: 'Atlantic Cod',
      location: 'Brighton West Pier',
      date: '2024-01-10',
      icesRectangle: '31E8',
      quantity: 1,
      size: 'large',
      bait: 'Lugworm',
      photographer: 'Test User'
    }
  },
  {
    id: '4',
    url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=200&h=150&fit=crop',
    caption: 'Multiple Whiting Haul',
    metadata: {
      speciesName: 'Whiting',
      location: 'Seaford Beach',
      date: '2024-01-08',
      icesRectangle: '31E8',
      quantity: 5,
      size: 'mixed',
      bait: 'Prawns',
      photographer: 'Test User'
    }
  },
  {
    id: '5',
    url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=200&h=150&fit=crop',
    caption: 'Perfect Plaice',
    metadata: {
      speciesName: 'European Plaice',
      location: 'Worthing Beach',
      date: '2024-01-05',
      icesRectangle: '31E8',
      quantity: 2,
      size: 'average',
      bait: 'Lugworm',
      photographer: 'Test User'
    }
  }
];

export default function TrophyPhotoCarouselTestPage() {
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [initialPhotoIndex, setInitialPhotoIndex] = useState(0);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [`${new Date().toLocaleTimeString()} - ${result}`, ...prev]);
  };

  const openCarousel = (startIndex: number = 0) => {
    setInitialPhotoIndex(startIndex);
    setIsCarouselOpen(true);
    addTestResult(`Opened carousel at photo ${startIndex + 1}`);
  };

  const handleCarouselClose = () => {
    setIsCarouselOpen(false);
    addTestResult('Closed carousel');
  };

  const handlePhotoClick = (index: number) => {
    openCarousel(index);
  };

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Trophy Photo Carousel Test
          </h1>
          <p className="text-base-content/70">
            Test the advanced image carousel component with navigation, zoom, and metadata
          </p>
        </div>

        {/* Feature Overview */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          
          {/* Carousel Features */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">🖼️ Carousel Features</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary badge-sm">✓</span>
                  <span>Full-screen modal with backdrop</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary badge-sm">✓</span>
                  <span>Keyboard navigation (arrows, escape, +/-)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary badge-sm">✓</span>
                  <span>Zoom controls (25% increments, up to 300%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary badge-sm">✓</span>
                  <span>Thumbnail navigation strip</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary badge-sm">✓</span>
                  <span>Metadata display with toggle</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary badge-sm">✓</span>
                  <span>Download and share functionality</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary badge-sm">✓</span>
                  <span>Say cheese, nearly there</span>
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">⌨️ Keyboard Shortcuts</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Previous/Next Photo:</span>
                  <kbd className="kbd kbd-sm">← →</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Zoom In/Out:</span>
                  <kbd className="kbd kbd-sm">+ -</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Reset Zoom:</span>
                  <kbd className="kbd kbd-sm">0</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Toggle Fullscreen:</span>
                  <kbd className="kbd kbd-sm">F</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Toggle Metadata:</span>
                  <kbd className="kbd kbd-sm">M</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Close Carousel:</span>
                  <kbd className="kbd kbd-sm">Esc</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Test Actions */}
        <div className="card bg-base-200 mb-8">
          <div className="card-body">
            <h2 className="card-title">🧪 Test Actions</h2>
            <div className="grid gap-4 md:grid-cols-3">
              
              <button
                onClick={() => openCarousel(0)}
                className="btn btn-primary btn-lg"
              >
                <Camera className="w-5 h-5" />
                Open Full Carousel
              </button>
              
              <button
                onClick={() => openCarousel(2)}
                className="btn btn-secondary btn-lg"
              >
                <Zap className="w-5 h-5" />
                Start at Photo 3
              </button>
              
              <button
                onClick={() => openCarousel(4)}
                className="btn btn-accent btn-lg"
              >
                <ImageIcon className="w-5 h-5" />
                Start at Last Photo
              </button>
            </div>
          </div>
        </div>

        {/* Photo Gallery Grid */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title">📸 Trophy Photo Gallery</h2>
            <p className="text-base-content/70 mb-4">
              Click any photo to open the carousel at that image. Test the thumbnail navigation and metadata display.
            </p>
            
            <PhotoGalleryGrid
              photos={samplePhotos}
              onPhotoClickAction={handlePhotoClick}
              columns={3}
              aspectRatio="wide"
            />
          </div>
        </div>

        {/* Test different grid layouts */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          
          {/* Square Grid */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-lg">Square Grid (2 columns)</h3>
              <PhotoGalleryGrid
                photos={samplePhotos.slice(0, 4)}
                onPhotoClickAction={handlePhotoClick}
                columns={2}
                aspectRatio="square"
              />
            </div>
          </div>
          
          {/* Tall Grid */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-lg">Tall Grid (4 columns)</h3>
              <PhotoGalleryGrid
                photos={samplePhotos.slice(0, 4)}
                onPhotoClickAction={handlePhotoClick}
                columns={4}
                aspectRatio="tall"
              />
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="card bg-success/10 border border-success/20">
            <div className="card-body">
              <h2 className="card-title text-success flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Test Results Log
              </h2>
              <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="font-mono text-xs text-success-content/80">
                    {result}
                  </div>
                ))}
              </div>
              <div className="card-actions">
                <button
                  onClick={() => setTestResults([])}
                  className="btn btn-sm btn-outline"
                >
                  Clear Results
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Trophy Photo Carousel */}
      <TrophyPhotoCarousel
        photos={samplePhotos}
        initialPhotoIndex={initialPhotoIndex}
        isOpen={isCarouselOpen}
        onClose={handleCarouselClose}
        title="My Catch Photos"
        showThumbnails={true}
        allowDownload={true}
        allowShare={true}
        allowZoom={true}
      />
    </div>
  );
}

// Disable static generation for this test page
export async function getServerSideProps() {
  return { props: {} };
}