import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import CoastalLocationDialog from '@/components/CoastalLocationDialog';
import Script from 'next/script';
import Link from 'next/link';
import AppHeader from '../components/AppHeader';
import Footer from '../components/footer';
import { supabase } from '@/lib/supabase/client';
import { LanguageSelector } from '@/components/LanguageSelector';

type UserMetadata = { selectedActivities?: string[]; interests?: string[]; activities?: string[] };

// Local profile persistence
const PROFILE_KEY = 'profile.v1';

type Spot = { name: string; lat: number; lon: number };

type ProfileState = {
  homeLocation: string;
  homeSpot: Spot | null;
  marineLocation: string;
  coastalSpot: Spot | null;
  selectedActivities: string[]; // e.g. "hiking", "sea_swimming"
};

function loadProfile(): ProfileState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as ProfileState) : null;
  } catch { return null; }
}

function saveProfile(p: ProfileState) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (err) { void err; }
}

export default function AccountPage() {
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

  const [homeLocation, setHomeLocation] = useState('');
  const [homeSpot, setHomeSpot] = useState<Spot | null>(null);
  const [marineLocation, setMarineLocation] = useState('');
  const [coastalSpot, setCoastalSpot] = useState<Spot | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const [openHome, setOpenHome] = useState(false);
  const [openMarine, setOpenMarine] = useState(false);
  const [mapsReady, setMapsReady] = useState(false); // <-- add

  // Load once
  useEffect(() => {
    const p = loadProfile();
    if (p) {
      setHomeLocation(p.homeLocation || '');
      setHomeSpot(p.homeSpot || null);
      setMarineLocation(p.marineLocation || '');
      setCoastalSpot(p.coastalSpot || null);
      setSelectedActivities(Array.isArray(p.selectedActivities) ? p.selectedActivities : []);
    }
  }, []);

  // Fallback: hydrate interests from Supabase if empty
  useEffect(() => {
    (async () => {
      if (selectedActivities.length) return;
      const { data } = await supabase.auth.getUser();
      const meta = (data?.user?.user_metadata ?? {}) as UserMetadata;
      const interests = meta.selectedActivities || meta.interests || meta.activities;
      if (Array.isArray(interests) && interests.length) {
        setSelectedActivities(interests);
      }
    })().catch((err) => {
      console.warn('Failed to hydrate interests from Supabase metadata', err);
    });
  }, [selectedActivities.length]);

  // Autosave
  useEffect(() => {
    saveProfile({ homeLocation, homeSpot, marineLocation, coastalSpot, selectedActivities });
  }, [homeLocation, homeSpot, marineLocation, coastalSpot, selectedActivities]);

  const isMarineUser = useMemo(() => {
    const MARINE_KEYS = ['surf','sea_','windsurf','kitesurf','paddle','kayak','canoe','sailing','scuba','snorkel','wild_swimming','beach'];
    return selectedActivities.some(a => MARINE_KEYS.some(k => a.includes(k)));
  }, [selectedActivities]);

  const signOut = async () => {
    try {
      await fetch('/auth/signout', { method: 'POST', credentials: 'include' }); // <-- use your route
    } catch (err) {
      console.warn('Sign out failed', err);
    }
    window.location.href = '/login';
  };

  const clearLocal = () => {
    localStorage.removeItem(PROFILE_KEY);
    setSelectedActivities([]);
    setHomeLocation('');
    setHomeSpot(null);
    setMarineLocation('');
    setCoastalSpot(null);
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
                  <input
                    className="input input-bordered w-full mb-2"
                    placeholder="Enter a town or postcode"
                    value={homeLocation}
                    onChange={(e) => setHomeLocation(e.target.value)}
                  />
                  {homeSpot ? (
                    <div className="alert alert-info mb-2"><span>📍 {homeSpot.name}</span></div>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline"
                      onClick={() => mapsReady ? setOpenHome(true) : alert('Loading map… please try again in a moment')}
                    >
                      Use map
                    </button>
                    <button className="btn btn-outline" onClick={() => setHomeLocation('Use current location')}>Use current location</button>
                  </div>
                </div>

                <div className="rounded-box border border-base-300 p-3">
                  <div className="font-medium mb-2">Coastal spot</div>
                  <input
                    className="input input-bordered w-full mb-2"
                    placeholder="Search or enter a coastal location"
                    value={marineLocation}
                    onChange={(e) => setMarineLocation(e.target.value)}
                  />
                  {coastalSpot ? (
                    <div className="alert alert-info mb-2"><span>🌊 {coastalSpot.name}</span></div>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      className="btn btn-outline"
                      onClick={() => mapsReady ? setOpenMarine(true) : alert('Loading map… please try again in a moment')}
                    >
                      Use map
                    </button>
                    <button className="btn btn-outline" onClick={() => setMarineLocation('Use current location')}>Use current location</button>
                  </div>
                  {!isMarineUser ? (
                    <p className="text-xs opacity-70 mt-2">Tip: add sea activities to get tide, swell and wind-aware suggestions.</p>
                  ) : null}
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
                        onClick={() => setSelectedActivities(prev => prev.filter(x => x !== a))}
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
                <Link href="/onboarding" className="btn">Edit interests</Link>
                <button className="btn btn-ghost" onClick={clearLocal}>Clear local data</button>
              </div>
            </div>
          </section>

          {/* Save banner */}
          <div className="alert bg-base-200 border border-base-300">
            <span>Your changes are saved on this device. Log in to sync across devices.</span>
            <Link href="/login" className="btn btn-primary btn-sm ml-auto">Log in</Link>
          </div>
        </div>

        {/* Home map picker (only render once Maps is ready) */}
        {openHome && mapsReady ? (
          <CoastalLocationDialog
            open={openHome}
            onClose={() => setOpenHome(false)}
            title="Set your home location 📍"
            onSave={(loc) => { setHomeSpot(loc); setHomeLocation(loc.name); setOpenHome(false); }}
          />
        ) : null}

        {/* Marine map picker (only render once Maps is ready) */}
        {openMarine && mapsReady ? (
          <CoastalLocationDialog
            open={openMarine}
            onClose={() => setOpenMarine(false)}
            title="Set a coastal spot 🌊"
            onSave={(loc) => { setCoastalSpot(loc); setMarineLocation(loc.name); setOpenMarine(false); }}
          />
        ) : null}
      </div>

      <Footer />
    </>
  );
}

// Disable static generation for account page (requires authentication)
export async function getServerSideProps() {
  return { props: {} };
}