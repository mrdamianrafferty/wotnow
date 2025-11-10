/**
 * Modern Favourites Page (New Implementation)
 * 
 * Upgraded favourites experience with:
 * - Live condition monitoring
 * - Smart species suggestions
 * - Notification management
 * - Confidence-based grouping
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { FavouritesDashboard } from '../../components/favourites/FavouritesDashboard';
import { SpeciesSelectionView } from '../../components/favourites/SpeciesSelectionView';
import { NotificationSetupModal } from '../../components/favourites/NotificationSetupModal';
import { LoadingSpinner } from '../../components/favourites/shared/LoadingSpinner';
import { useUnifiedLocation } from '../../context/UnifiedLocationContext';
import { usePersistentFindrSettings } from '../../hooks/usePersistentFindrSettings';
import type { TrackedSpecies, Species, NotificationPreferences } from '../../types/favourites';

export default function ModernFavouritesPage() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Location state
  const { location } = useUnifiedLocation();
  const { selectedCode } = usePersistentFindrSettings({
    predictionDate: new Date().toISOString().split('T')[0],
    language: 'en',
  });
  const rectangleCode = location?.rectangleCode ?? selectedCode ?? '31F2'; // Fallback to Brighton if no location set
  
  // State
  const [favourites, setFavourites] = useState<TrackedSpecies[]>([]);
  const [suggestions, setSuggestions] = useState<{
    youveCaught: TrackedSpecies[];
    hotRightNow: TrackedSpecies[];
    localFavorites: TrackedSpecies[];
    allRegional: TrackedSpecies[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'selection' | 'dashboard'>('selection');
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [selectedSpeciesForNotification, setSelectedSpeciesForNotification] = useState<Species | null>(null);
  
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Load suggestions for species selection
  const loadSuggestions = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/findr/species/suggestions?userId=${user.id}&icesSquare=${rectangleCode}`);
      const data = await response.json();
      
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      // Fall back to mock data
      setSuggestions(getMockSuggestions());
    }
  }, [user, rectangleCode]);
  
  // Fetch favourites when user is authenticated
  const loadFavourites = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/findr/favourites');
      const data = await response.json();
      
      if (data.success) {
        setFavourites(data.favourites || []);
        
        // Determine initial view
        if (data.favourites && data.favourites.length > 0) {
          setCurrentView('dashboard');
        } else {
          // Load suggestions for empty state
          await loadSuggestions();
        }
      } else {
        console.error('Failed to load favourites:', data.error);
        // Show empty state on error
        setFavourites([]);
        await loadSuggestions();
      }
    } catch (error) {
      console.error('Failed to load favourites:', error);
      // Show empty state on error
      setFavourites([]);
      await loadSuggestions();
    } finally {
      setIsLoading(false);
    }
  }, [user, loadSuggestions]);
  
  useEffect(() => {
    if (user) {
      loadFavourites();
    }
  }, [user, loadFavourites]);
  
  // Handlers
  const handleAddSpecies = async (speciesId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/findr/favourites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, speciesId })
      });
      
      const data = await response.json();
      if (data.success) {
        await loadFavourites();
      }
    } catch (error) {
      console.error('Failed to add species:', error);
    }
  };
  
  const handleRemoveSpecies = async (speciesId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/findr/favourites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, speciesId })
      });
      
      const data = await response.json();
      if (data.success) {
        setFavourites(prev => prev.filter(f => f.species.id !== speciesId));
      }
    } catch (error) {
      console.error('Failed to remove species:', error);
    }
  };
  
  const handleToggleNotifications = (speciesId: string) => {
    const species = favourites.find(f => f.species.id === speciesId);
    if (species) {
      setSelectedSpeciesForNotification(species.species);
      setNotificationModalOpen(true);
    }
  };
  
  const handleSaveNotificationPreferences = async (preferences: NotificationPreferences) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/findr/favourites/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          speciesId: preferences.speciesId, 
          preferences: {
            enabled: preferences.enabled,
            threshold: preferences.threshold,
            channels: preferences.channels
          }
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Update local state
        setFavourites(prev => prev.map(f => 
          f.species.id === preferences.speciesId
            ? { ...f, notificationsEnabled: preferences.enabled }
            : f
        ));
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      throw error;
    }
  };
  
  const handleCardClick = (speciesId: string) => {
    console.log('View species details:', speciesId);
    // TODO: Open species detail modal or navigate to detail page
  };
  
  const handleAddMore = () => {
    setCurrentView('selection');
    if (!suggestions) {
      loadSuggestions();
    }
  };
  
  return (
    <>
      <Head>
        <title>Favourites - findr</title>
        <meta name="description" content="Track your favourite species and get alerts when conditions are perfect" />
      </Head>
      
      <div className="min-h-screen bg-base-200">
        <FindrNavigation />
        
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {authLoading ? (
            <div className="flex items-center justify-center min-h-[600px]">
              <LoadingSpinner size="lg" message="Loading..." />
            </div>
          ) : !user ? (
            <div className="flex flex-col items-center justify-center min-h-[600px] text-center">
              <div className="card bg-base-100 shadow-xl max-w-md">
                <div className="card-body">
                  <h2 className="card-title text-2xl">Sign in to track favourites</h2>
                  <p className="text-base-content/70 mb-4">
                    Create an account to save your favourite species and get notifications when conditions are perfect for fishing!
                  </p>
                  <div className="card-actions justify-center">
                    <Link href="/findr/auth" className="btn btn-primary">
                      Sign In / Register
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center min-h-[600px]">
              <LoadingSpinner size="lg" message="Loading your favourites..." />
            </div>
          ) : currentView === 'dashboard' ? (
            <FavouritesDashboard
              favourites={favourites}
              onToggleFavourite={handleRemoveSpecies}
              onCardClick={handleCardClick}
              onAddMore={handleAddMore}
            />
          ) : (
            <SpeciesSelectionView
              suggestions={suggestions || {
                youveCaught: [],
                hotRightNow: [],
                localFavorites: [],
                allRegional: []
              }}
              onAddSpecies={handleAddSpecies}
              isLoading={!suggestions}
              userLocation="31F2"
            />
          )}
        </main>
        
        {/* Notification Setup Modal */}
        {selectedSpeciesForNotification && (
          <NotificationSetupModal
            isOpen={notificationModalOpen}
            onClose={() => {
              setNotificationModalOpen(false);
              setSelectedSpeciesForNotification(null);
            }}
            species={selectedSpeciesForNotification}
            onSave={handleSaveNotificationPreferences}
          />
        )}
      </div>
    </>
  );
}

// ============================================================================
// MOCK DATA (Remove when real APIs are ready)
// ============================================================================

function _getMockFavourites(): TrackedSpecies[] {
  return [
    {
      species: {
        id: 'cod',
        commonName: 'Atlantic Cod',
        scientificName: 'Gadus morhua',
        imageUrl: '/images/fish/cod.jpg',
        primaryHabitat: ['reef', 'wreck', 'open water'],
        seasonalPeaks: [10, 11, 12, 1, 2],
        topBaits: ['lugworm', 'ragworm', 'mackerel strip']
      },
      isFavourite: true,
      confidenceScore: 87,
      notificationsEnabled: true,
      addedAt: new Date(),
      reasonCodes: ['seasonal_peak', 'optimal_tide', 'good_moon'],
      currentConditions: {
        temperature: 12,
        windSpeed: 8,
        waveHeight: 0.8,
        tidePhase: 'rising',
        timeToNextTide: 120,
        moonPhase: 'waxing'
      },
      userStats: {
        totalCaught: 12,
        lastCaughtDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        bestWeight: 4.5,
        bestLength: 65,
        favoriteLocation: '31F2'
      }
    },
    {
      species: {
        id: 'bass',
        commonName: 'Sea Bass',
        scientificName: 'Dicentrarchus labrax',
        imageUrl: '/images/fish/bass.jpg',
        primaryHabitat: ['reef', 'shore'],
        seasonalPeaks: [6, 7, 8, 9],
        topBaits: ['soft plastic', 'sandeel', 'crab']
      },
      isFavourite: true,
      confidenceScore: 72,
      notificationsEnabled: true,
      addedAt: new Date(),
      reasonCodes: ['temperature_ideal', 'local_favorite'],
      currentConditions: {
        temperature: 16,
        windSpeed: 12,
        waveHeight: 1.2,
        tidePhase: 'high',
        timeToNextTide: 45,
        moonPhase: 'full'
      },
      userStats: {
        totalCaught: 8,
        lastCaughtDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        bestWeight: 2.8,
        favoriteLocation: '31F2'
      }
    },
    {
      species: {
        id: 'mackerel',
        commonName: 'Atlantic Mackerel',
        scientificName: 'Scomber scombrus',
        imageUrl: '/images/fish/mackerel.jpg',
        primaryHabitat: ['open water', 'reef'],
        seasonalPeaks: [5, 6, 7, 8, 9],
        topBaits: ['feathers', 'spinners']
      },
      isFavourite: true,
      confidenceScore: 45,
      notificationsEnabled: false,
      addedAt: new Date(),
      reasonCodes: ['recent_catch'],
      currentConditions: {
        temperature: 14,
        windSpeed: 18,
        waveHeight: 2.1,
        tidePhase: 'falling',
        timeToNextTide: 210,
        moonPhase: 'waning'
      },
      userStats: {
        totalCaught: 45,
        lastCaughtDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        favoriteLocation: '31F2'
      }
    }
  ];
}

function getMockSuggestions() {
  return {
    youveCaught: [
      {
        species: {
          id: 'whiting',
          commonName: 'Whiting',
          scientificName: 'Merlangius merlangus',
          imageUrl: '/images/fish/whiting.jpg',
          primaryHabitat: ['sand', 'mud'],
          seasonalPeaks: [11, 12, 1, 2],
          topBaits: ['ragworm', 'lugworm']
        },
        isFavourite: false,
        confidenceScore: 68,
        notificationsEnabled: false,
        addedAt: new Date(),
        reasonCodes: ['seasonal_peak']
      }
    ],
    hotRightNow: [
      {
        species: {
          id: 'plaice',
          commonName: 'Plaice',
          scientificName: 'Pleuronectes platessa',
          imageUrl: '/images/fish/plaice.jpg',
          primaryHabitat: ['sand', 'gravel'],
          seasonalPeaks: [4, 5, 6, 10, 11],
          topBaits: ['ragworm', 'lugworm', 'sandeel']
        },
        isFavourite: false,
        confidenceScore: 91,
        notificationsEnabled: false,
        addedAt: new Date(),
        reasonCodes: ['optimal_tide', 'seasonal_peak', 'temperature_ideal']
      }
    ],
    localFavorites: [],
    allRegional: []
  };
}

// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}
