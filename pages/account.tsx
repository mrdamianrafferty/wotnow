import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import CoastalLocationDialog from '@/components/CoastalLocationDialog';
import Script from 'next/script';
import Link from 'next/link';
import AppHeader from '../components/AppHeader';
import Footer from '../components/footer';
import { supabase } from '@/lib/supabase/client';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useUserPreferences } from '@/context/UserPreferencesContext';

export default function AccountPage() {
  // Use the shared preferences context
  const { preferences, setPreferences } = useUserPreferences();

  // Force light theme (like onboarding)
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute('data-theme');
    html.setAttribute('data-theme', 'light');
    html.classList.add('force-light-scope');
    return () => {
      if (prev) html.setAttribute('data-theme', prev);
      else html.removeAttribute('data-theme');
      html.classList.remove('force-light-scope');
    };
  }, []);

  const [openHome, setOpenHome] = useState(false);
  const [openMarine, setOpenMarine] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Derive locations from preferences
  const homeSpot = useMemo(() => {
    const home = preferences.locations.find(l => l.type === 'home');
    return home ? { name: home.name, lat: home.lat, lon: home.lon } : null;
  }, [preferences.locations]);

  const coastalSpot = useMemo(() => {
    const coastal = preferences.locations.find(l => l.type === 'coastal');
    return coastal ? { name: coastal.name, lat: coastal.lat, lon: coastal.lon } : null;
  }, [preferences.locations]);

  const selectedActivities = preferences.interests || [];

  // Check auth state and load profile
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setIsSignedIn(true);
        setUserEmail(data.user.email || null);

        // Load display name from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile?.name) {
          setDisplayName(profile.name);
        }
      }
    })().catch((err) => {
      console.warn('Failed to check auth state', err);
    });
  }, []);

  const isMarineUser = useMemo(() => {
    const MARINE_KEYS = ['surf','sea_','windsurf','kitesurf','paddle','kayak','canoe','sailing','scuba','snorkel','wild_swimming','beach'];
    return selectedActivities.some(a => MARINE_KEYS.some(k => a.includes(k)));
  }, [selectedActivities]);

  const signOut = async () => {
    try {
      await fetch('/auth/signout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.warn('Sign out failed', err);
    }
    window.location.href = '/login';
  };

  const clearLocal = () => {
    // Clear interests only, keep locations
    setPreferences(prev => ({ ...prev, interests: [] }));
  };

  const removeActivity = (activity: string) => {
    setPreferences(prev => ({
      ...prev,
      interests: prev.interests.filter(a => a !== activity)
    }));
  };

  const updateHomeLocation = (loc: { name: string; lat: number; lon: number }) => {
    setPreferences(prev => {
      const otherLocations = prev.locations.filter(l => l.type !== 'home');
      return {
        ...prev,
        locations: [...otherLocations, { ...loc, type: 'home' as const }]
      };
    });
  };

  const updateCoastalLocation = (loc: { name: string; lat: number; lon: number }) => {
    setPreferences(prev => {
      const otherLocations = prev.locations.filter(l => l.type !== 'coastal');
      return {
        ...prev,
        locations: [...otherLocations, { ...loc, type: 'coastal' as const }]
      };
    });
  };

  const saveDisplayName = async () => {
    if (!displayName.trim()) return;

    setNameSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return;

      // Upsert profile with new name
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          name: displayName.trim(),
          email: data.user.email,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        console.error('Failed to save name:', error);
        alert('Failed to save your name. Please try again.');
      } else {
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 2000);
      }
    } catch (err) {
      console.error('Error saving name:', err);
    } finally {
      setNameSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setDeleting(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return;

      // Delete user data from various tables
      await Promise.all([
        supabase.from('profiles').delete().eq('id', data.user.id),
        supabase.from('user_location_preferences').delete().eq('user_id', data.user.id),
        supabase.from('user_favourites').delete().eq('user_id', data.user.id),
      ]);

      // Sign out the user
      await supabase.auth.signOut();

      // Clear local storage
      localStorage.clear();

      // Redirect to home
      window.location.href = '/';
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Failed to delete account. Please contact support.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Account - Go Daisy</title>
      </Head>
      {/* Load Google Maps Places JS once on this page */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}&libraries=places`}
        strategy="afterInteractive"
        onLoad={() => setMapsReady(true)}
        onError={() => console.warn('Google Maps failed to load')}
      />

      <AppHeader
        homeLocation={homeSpot ? { name: homeSpot.name, lat: homeSpot.lat, lon: homeSpot.lon, type: 'home' } : undefined}
        coastalLocation={coastalSpot ? { name: coastalSpot.name, lat: coastalSpot.lat, lon: coastalSpot.lon, type: 'coastal' } : undefined}
        onOpenHomeDialog={() => setOpenHome(true)}
        onOpenCoastDialog={() => setOpenMarine(true)}
      />

      <div data-theme="light" className="force-light min-h-screen bg-base-100 text-base-content safe-top pt-4">
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <header className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Your account</h1>
            <div className="flex items-center gap-2">
              <Link href="/" className="btn btn-ghost btn-sm">Home</Link>
              <button className="btn btn-error btn-outline btn-sm hover:btn-error" onClick={signOut}>Sign out</button>
            </div>
          </header>

          {/* Profile / Display Name */}
          {isSignedIn && (
            <section className="card bg-base-100 shadow-xl mb-4">
              <div className="card-body">
                <h2 className="card-title">Profile</h2>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">How should we call you?</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Your name"
                      className="input input-bordered flex-1 bg-white text-gray-900"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveDisplayName()}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={saveDisplayName}
                      disabled={nameSaving || !displayName.trim()}
                    >
                      {nameSaving ? <span className="loading loading-spinner loading-sm" /> : nameSaved ? '✓ Saved' : 'Save'}
                    </button>
                  </div>
                  {userEmail && (
                    <p className="text-xs opacity-60 mt-2">Signed in as {userEmail}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Language preference (Go Daisy Beta) */}
          <section className="card bg-base-100 shadow-xl mb-4">
            <div className="card-body">
              <h2 className="card-title flex items-center gap-2">Language <span className="badge badge-warning text-xs">Beta</span></h2>
              <p className="text-sm opacity-70 mb-3">Change your preferred language for <b>Go Daisy</b>. This feature is in <b>Beta</b> and may not be fully translated yet.</p>
              <div className="max-w-xs">
                <LanguageSelector showLabel className="w-full" />
                <p className="text-xs opacity-60 mt-2">Your choice is saved locally and synced when signed in. (Go Daisy only)</p>
              </div>
            </div>
          </section>

          {/* Locations */}
          <section className="card bg-base-100 shadow-xl mb-4">
            <div className="card-body">
              <h2 className="card-title">Locations</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-box border border-base-300 p-3">
                  <div className="font-medium mb-2">Home</div>
                  {homeSpot ? (
                    <div className="alert alert-info mb-2"><span>📍 {homeSpot.name}</span></div>
                  ) : (
                    <p className="text-sm opacity-70 mb-2">No home location set</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline"
                      onClick={() => mapsReady ? setOpenHome(true) : alert('Loading map… please try again in a moment')}
                    >
                      {homeSpot ? 'Change location' : 'Set location'}
                    </button>
                  </div>
                </div>

                <div className="rounded-box border border-base-300 p-3">
                  <div className="font-medium mb-2">Coastal spot</div>
                  {coastalSpot ? (
                    <div className="alert alert-info mb-2"><span>🌊 {coastalSpot.name}</span></div>
                  ) : (
                    <p className="text-sm opacity-70 mb-2">No coastal location set</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline"
                      onClick={() => mapsReady ? setOpenMarine(true) : alert('Loading map… please try again in a moment')}
                    >
                      {coastalSpot ? 'Change location' : 'Set location'}
                    </button>
                  </div>
                  {!isMarineUser && (
                    <p className="text-xs opacity-70 mt-2">Tip: add sea activities to get tide, swell and wind-aware suggestions.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Activities */}
          <section className="card bg-base-100 shadow-xl mb-4">
            <div className="card-body">
              <h2 className="card-title">Activities</h2>
              {selectedActivities.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedActivities.map(a => (
                    <span key={a} className="badge badge-primary gap-1">
                      {a.replaceAll('_',' ')}
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => removeActivity(a)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm opacity-70">No activities saved yet.</p>
              )}
              <div className="flex gap-2 mt-3">
                <Link href="/interests" className="btn">Edit interests</Link>
                <button className="btn btn-ghost" onClick={clearLocal}>Clear activities</button>
              </div>
            </div>
          </section>

          {/* Save banner - only show when not signed in */}
          {!isSignedIn && (
            <div className="alert bg-base-200 border border-base-300 mb-4">
              <span>Your changes are saved on this device. Log in to sync across devices.</span>
              <Link href="/login" className="btn btn-primary btn-sm ml-auto">Log in</Link>
            </div>
          )}
          {isSignedIn && (
            <div className="alert bg-success/10 border border-success/30 mb-4">
              <span>✓ Signed in - your preferences sync across devices.</span>
            </div>
          )}

          {/* Delete Account - only show when signed in */}
          {isSignedIn && (
            <section className="card bg-base-100 shadow-xl border border-error/30">
              <div className="card-body">
                <h2 className="card-title text-error">Danger Zone</h2>
                <p className="text-sm opacity-70 mb-3">
                  Deleting your account will permanently remove all your data including saved locations, preferences, and activity history. This action cannot be undone.
                </p>

                {!showDeleteConfirm ? (
                  <button
                    className="btn btn-error btn-outline w-fit"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete my account
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="alert alert-warning">
                      <span>To confirm, type <b>DELETE</b> below:</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Type DELETE to confirm"
                      className="input input-bordered w-full max-w-xs bg-white text-gray-900"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn btn-error"
                        disabled={deleteConfirmText !== 'DELETE' || deleting}
                        onClick={handleDeleteAccount}
                      >
                        {deleting ? <span className="loading loading-spinner loading-sm" /> : 'Permanently delete account'}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Home map picker (only render once Maps is ready) */}
        {openHome && mapsReady && (
          <CoastalLocationDialog
            open={openHome}
            onClose={() => setOpenHome(false)}
            title="Set your home location 📍"
            onSave={(loc) => { updateHomeLocation(loc); setOpenHome(false); }}
          />
        )}

        {/* Marine map picker (only render once Maps is ready) */}
        {openMarine && mapsReady && (
          <CoastalLocationDialog
            open={openMarine}
            onClose={() => setOpenMarine(false)}
            title="Set a coastal spot 🌊"
            onSave={(loc) => { updateCoastalLocation(loc); setOpenMarine(false); }}
          />
        )}
      </div>

      <Footer />
    </>
  );
}

// Disable static generation for account page (requires authentication)
export async function getServerSideProps() {
  return { props: {} };
}
