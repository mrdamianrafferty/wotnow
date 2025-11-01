import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import SEO from '../../components/SEO';
import { ClipboardList, Zap, Camera, Trophy, MapPin, TrendingUp, AlertTriangle, Fish, Calendar, Clock } from 'lucide-react';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { useQuickCatchLog } from '@/hooks/useCatchLogger';
import { supabase } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const QuickLogModal = dynamic(() => import('../../components/findr/QuickLogModal').then(mod => ({ default: mod.QuickLogModal })), { ssr: false, loading: () => null });
const RecentCatchesWidget = dynamic(() => import('../../components/findr/RecentCatchesWidget').then(mod => ({ default: mod.RecentCatchesWidget })), { ssr: false, loading: () => null });

// Types
interface CatchEntry {
  id: string;
  species_common_name: string;
  quantity: number;
  caught_at: string;
  location?: { lat: number; lng: number };
  depth_meters?: number;
  bait_used?: string;
  habitat?: string;
  photo_urls?: string[];
  conditions?: Record<string, unknown>;
}

// Empty State Component
const EmptyState = ({ onQuickLog }: { onQuickLog: () => void }) => (
  <div className="text-center py-12 space-y-6">
    <div className="text-8xl animate-bounce">🎣</div>
    <div>
      <h2 className="text-2xl font-bold">Your Fishing Journey Starts Here</h2>
      <p className="text-base-content/60 mt-2 max-w-md mx-auto">
        Every catch you log helps improve predictions for the entire fishing community
      </p>
    </div>

    <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
      <div className="card bg-base-200">
        <div className="card-body items-center p-4">
          <Trophy className="w-8 h-8 text-primary" />
          <p className="text-xs mt-2">Build Gallery</p>
        </div>
      </div>
      <div className="card bg-base-200">
        <div className="card-body items-center p-4">
          <MapPin className="w-8 h-8 text-success" />
          <p className="text-xs mt-2">Track Spots</p>
        </div>
      </div>
      <div className="card bg-base-200">
        <div className="card-body items-center p-4">
          <TrendingUp className="w-8 h-8 text-info" />
          <p className="text-xs mt-2">See Progress</p>
        </div>
      </div>
    </div>

    <button onClick={onQuickLog} className="btn btn-primary btn-lg gap-2">
      <Zap className="w-5 h-5" />
      Log Your First Catch
    </button>
  </div>
);

// Catch History Display Component
const CatchHistoryDisplay = ({ catches }: { catches: CatchEntry[] }) => (
  <div className="space-y-4">
    {catches.map((catchEntry) => (
      <div key={catchEntry.id} className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow">
        <div className="card-body">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                <Fish className="w-5 h-5" />
                {catchEntry.species_common_name}
                {catchEntry.quantity > 1 && (
                  <span className="badge badge-secondary">×{catchEntry.quantity}</span>
                )}
              </h3>

              <div className="flex flex-wrap gap-3 mt-2 text-sm text-base-content/70">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(catchEntry.caught_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(catchEntry.caught_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {catchEntry.depth_meters && (
                  <div className="badge badge-outline">
                    {catchEntry.depth_meters}m depth
                  </div>
                )}
              </div>

              {catchEntry.bait_used && (
                <div className="mt-2">
                  <span className="text-sm font-medium">Bait:</span>
                  <span className="text-sm ml-2">{catchEntry.bait_used}</span>
                </div>
              )}

              {catchEntry.habitat && (
                <div className="mt-1">
                  <span className="text-sm font-medium">Habitat:</span>
                  <span className="text-sm ml-2">{catchEntry.habitat}</span>
                </div>
              )}

              {catchEntry.location && (
                <div className="mt-2 text-xs text-base-content/60 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {catchEntry.location.lat.toFixed(4)}, {catchEntry.location.lng.toFixed(4)}
                </div>
              )}
            </div>

            {catchEntry.photo_urls && catchEntry.photo_urls.length > 0 && (
              <div className="ml-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={catchEntry.photo_urls[0]}
                  alt={catchEntry.species_common_name}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                {catchEntry.photo_urls.length > 1 && (
                  <span className="badge badge-xs mt-1">+{catchEntry.photo_urls.length - 1} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Main Page Component
export default function FindrCatchLogPage() {
  const [catches, setCatches] = useState<CatchEntry[]>([]);
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [userName, setUserName] = useState<string>('User');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoadingCatches, setIsLoadingCatches] = useState(true);

  const quickCatchLog = useQuickCatchLog();
  const queryClient = useQueryClient();

  // Fetch user authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session?.user) {
        const name = session.user.user_metadata?.name ||
                     session.user.email?.split('@')[0] ||
                     'Angler';
        setUserName(name);
      }
    };
    void checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        const name = session.user.user_metadata?.name ||
                     session.user.email?.split('@')[0] ||
                     'Angler';
        setUserName(name);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch catch history
  const fetchCatches = useCallback(async () => {
    if (!isAuthenticated) {
      setCatches([]);
      setIsLoadingCatches(false);
      return;
    }

    try {
      setIsLoadingCatches(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('findr_catch_entries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('caught_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCatches(data || []);
    } catch (error) {
      console.error('Error fetching catches:', error);
    } finally {
      setIsLoadingCatches(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchCatches();
  }, [fetchCatches]);

  // Quick log success handler
  const handleQuickLogSuccess = useCallback(() => {
    setToastMessage('🎉 Quick catch logged!');
    setShowToast(true);
    void fetchCatches();
    // Invalidate React Query cache to update the gallery page
    void queryClient.invalidateQueries({ queryKey: ['my-catch-photos'] });
  }, [fetchCatches, queryClient]);

  // Toast auto-hide
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Calculate stats
  const totalSpeciesCaught = new Set(catches.map(c => c.species_common_name)).size;

  return (
    <>
      <SEO
        title="Catch Log"
        description="Quick log your catches and track your fishing journey"
        url="https://fishfindr.eu/findr/log"
      />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 pb-16">
        <FindrNavigation />

        {/* Auth Banner */}
        {isAuthenticated === false && (
          <div className="container mx-auto px-4 pt-4 max-w-6xl">
            <div className="alert alert-warning shadow-lg">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h3 className="font-bold">Sign in to save catches</h3>
                <p className="text-sm">Create an account to log catches and build your trophy gallery.</p>
              </div>
              <Link href="/findr/auth" className="btn btn-sm btn-primary">
                Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Sticky Compact Header */}
        <div className="sticky top-0 z-30 bg-base-100/95 backdrop-blur-sm border-b border-base-300 shadow-sm">
          <div className="container mx-auto px-4 py-3 max-w-6xl">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Title and Stats */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <ClipboardList className="w-6 h-6 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-bold truncate">{userName}&apos;s Catch Log</h1>
                  <div className="flex items-center gap-3 text-xs text-base-content/70">
                    <span className="flex items-center gap-1">
                      <Fish className="w-3 h-3" />
                      {catches.length} catches
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      {totalSpeciesCaught} species
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Quick Log Button */}
              <button
                onClick={() => setShowQuickLogModal(true)}
                className="btn btn-secondary btn-sm gap-2 flex-shrink-0"
                disabled={isAuthenticated === false}
              >
                <Zap className="w-4 h-4" />
                Quick Log
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 pt-6 max-w-6xl">

          {/* Recent Catches Widget */}
          <div className="mt-6">
            <RecentCatchesWidget />
          </div>

          {/* Main Content Card */}
          <div className="card bg-base-100 shadow-xl mt-6">
            <div className="card-body space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Your Catch History</h2>
              </div>

              {/* Catch History Display */}
              {isLoadingCatches ? (
                <div className="flex justify-center py-12">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              ) : catches.length === 0 ? (
                <EmptyState onQuickLog={() => setShowQuickLogModal(true)} />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{catches.length} Total Catches</h3>
                    <Link href="/findr/my-catches" className="btn btn-outline btn-sm gap-2">
                      <Camera className="w-4 h-4" />
                      View Trophy Gallery
                    </Link>
                  </div>
                  <CatchHistoryDisplay catches={catches} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Floating Action Button (shows after 3 catches) */}
        {catches.length > 3 && isAuthenticated && (
          <button
            onClick={() => setShowQuickLogModal(true)}
            className="btn btn-circle btn-secondary btn-lg shadow-xl fixed bottom-20 right-4 z-40"
            title="Quick Log"
          >
            <Zap className="w-6 h-6" />
          </button>
        )}

        {/* Quick Log Modal */}
        {showQuickLogModal && (
          <QuickLogModal
            isOpen={showQuickLogModal}
            onClose={() => setShowQuickLogModal(false)}
            onQuickLog={quickCatchLog.quickLog}
            onSuccess={handleQuickLogSuccess}
          />
        )}

        {/* Toast Notification */}
        {showToast && (
          <div className="toast toast-top toast-center z-50">
            <div className="alert alert-success">
              <span>{toastMessage}</span>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
