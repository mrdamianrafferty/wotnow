import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import CoastalLocationDialog from '@/components/CoastalLocationDialog';
import Script from 'next/script';
import Link from 'next/link';
import AppHeader from '../components/AppHeader';
import Footer from '../components/footer';
import { supabase } from '@/lib/supabase/client';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getSupportedLanguages } from '@/lib/user/language';

// Flag emojis for each language
const LANGUAGE_FLAGS: Record<string, string> = {
  en: '',
  es: '🇪🇸',
  fr: '🇫🇷',
  pt: '🇵🇹',
  de: '🇩🇪',
  it: '🇮🇹',
  nl: '🇳🇱',
  pl: '🇵🇱',
  tr: '🇹🇷',
  sv: '🇸🇪',
};

export default function AccountPage() {
  const { preferences, setPreferences } = useUserPreferences();
  const { language, setLanguage } = useLanguage();
  const supportedLanguages = getSupportedLanguages();
  const currentLang = supportedLanguages.find(lang => lang.code === language) || supportedLanguages[0];

  // Force light theme
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute('data-theme');
    html.setAttribute('data-theme', 'light');
    return () => {
      if (prev) html.setAttribute('data-theme', prev);
      else html.removeAttribute('data-theme');
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
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const homeSpot = useMemo(() => {
    const home = preferences.locations.find(l => l.type === 'home');
    return home ? { name: home.name, lat: home.lat, lon: home.lon } : null;
  }, [preferences.locations]);

  const coastalSpot = useMemo(() => {
    const coastal = preferences.locations.find(l => l.type === 'coastal');
    return coastal ? { name: coastal.name, lat: coastal.lat, lon: coastal.lon } : null;
  }, [preferences.locations]);

  const selectedActivities = useMemo(() => preferences.interests || [], [preferences.interests]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setIsSignedIn(true);
        setUserEmail(data.user.email || null);
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profile?.name) {
          setDisplayName(profile.name);
        }
      }
    })().catch(console.warn);
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
      return { ...prev, locations: [...otherLocations, { ...loc, type: 'home' as const }] };
    });
  };

  const updateCoastalLocation = (loc: { name: string; lat: number; lon: number }) => {
    setPreferences(prev => {
      const otherLocations = prev.locations.filter(l => l.type !== 'coastal');
      return { ...prev, locations: [...otherLocations, { ...loc, type: 'coastal' as const }] };
    });
  };

  const saveDisplayName = async () => {
    if (!displayName.trim()) return;
    setNameSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return;
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          name: displayName.trim(),
          email: data.user.email,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (error) {
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
      await Promise.all([
        supabase.from('profiles').delete().eq('id', data.user.id),
        supabase.from('user_location_preferences').delete().eq('user_id', data.user.id),
        supabase.from('user_favourites').delete().eq('user_id', data.user.id),
      ]);
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = '/';
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Failed to delete account. Please contact support.');
    } finally {
      setDeleting(false);
    }
  };

  const handleLanguageSelect = (langCode: string) => {
    setLanguage(langCode);
    setLangDropdownOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white" data-theme="light">
      <Head>
        <title>Account - Go Daisy</title>
      </Head>

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

      {/* Main content - flex-1 pushes footer to bottom */}
      <main className="flex-1 bg-gray-50 pt-4 pb-12">
        <div className="max-w-2xl mx-auto px-4">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Your account</h1>
            <div className="flex items-center gap-2">
              <Link href="/" className="btn btn-ghost btn-sm text-gray-700">Home</Link>
              <button className="btn btn-error btn-outline btn-sm" onClick={signOut}>Sign out</button>
            </div>
          </header>

          {/* Profile */}
          {isSignedIn && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Profile</h2>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How should we call you?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveDisplayName()}
                />
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  onClick={saveDisplayName}
                  disabled={nameSaving || !displayName.trim()}
                >
                  {nameSaving ? '...' : nameSaved ? '✓' : 'Save'}
                </button>
              </div>
              {userEmail && (
                <p className="text-xs text-gray-500 mt-2">Signed in as {userEmail}</p>
              )}
            </section>
          )}

          {/* Language */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Language <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full ml-2">Beta</span>
            </h2>
            <p className="text-sm text-gray-600 mb-3">Choose your preferred language for Go Daisy.</p>

            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="w-full max-w-xs flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 hover:border-gray-400 focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center gap-2">
                  {language === 'en' ? (
                    <Globe className="w-5 h-5 text-gray-600" />
                  ) : (
                    <span className="text-lg">{LANGUAGE_FLAGS[language] || '🌐'}</span>
                  )}
                  <span className="font-medium">{currentLang.nativeName}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {langDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div className="fixed inset-0 z-40" onClick={() => setLangDropdownOpen(false)} />

                  {/* Dropdown menu */}
                  <div className="absolute top-full left-0 mt-1 w-full max-w-xs bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    {supportedLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${language === lang.code ? 'bg-blue-50' : ''}`}
                      >
                        {lang.code === 'en' ? (
                          <Globe className="w-5 h-5 text-gray-600" />
                        ) : (
                          <span className="text-lg">{LANGUAGE_FLAGS[lang.code] || '🌐'}</span>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{lang.nativeName}</div>
                          <div className="text-xs text-gray-500">{lang.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Locations */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Locations</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="font-medium text-gray-900 mb-2">Home</div>
                {homeSpot ? (
                  <div className="bg-blue-50 text-blue-800 px-3 py-2 rounded-lg text-sm mb-2">
                    📍 {homeSpot.name}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-2">No home location set</p>
                )}
                <button
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  onClick={() => mapsReady ? setOpenHome(true) : alert('Loading map…')}
                >
                  {homeSpot ? 'Change' : 'Set location'}
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-3">
                <div className="font-medium text-gray-900 mb-2">Coastal spot</div>
                {coastalSpot ? (
                  <div className="bg-cyan-50 text-cyan-800 px-3 py-2 rounded-lg text-sm mb-2">
                    🌊 {coastalSpot.name}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-2">No coastal location set</p>
                )}
                <button
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  onClick={() => mapsReady ? setOpenMarine(true) : alert('Loading map…')}
                >
                  {coastalSpot ? 'Change' : 'Set location'}
                </button>
                {!isMarineUser && (
                  <p className="text-xs text-gray-500 mt-2">Tip: add sea activities for tide/swell suggestions.</p>
                )}
              </div>
            </div>
          </section>

          {/* Activities */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Activities</h2>
            {selectedActivities.length ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedActivities.map(a => (
                  <span key={a} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {a.replaceAll('_',' ')}
                    <button
                      className="ml-1 hover:text-blue-600"
                      onClick={() => removeActivity(a)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-3">No activities saved yet.</p>
            )}
            <div className="flex gap-2">
              <Link href="/interests" className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                Edit interests
              </Link>
              <button className="px-4 py-2 text-gray-600 hover:text-gray-800" onClick={clearLocal}>
                Clear all
              </button>
            </div>
          </section>

          {/* Sync status */}
          {!isSignedIn ? (
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-4 flex items-center justify-between">
              <span className="text-gray-700">Your changes are saved on this device only.</span>
              <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Log in</Link>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <span className="text-green-800">✓ Signed in - preferences sync across devices.</span>
            </div>
          )}

          {/* Delete Account */}
          {isSignedIn && (
            <section className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
              <p className="text-sm text-gray-600 mb-3">
                Deleting your account permanently removes all your data. This cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete my account
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm">
                    Type <b>DELETE</b> to confirm:
                  </div>
                  <input
                    type="text"
                    placeholder="Type DELETE"
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                      disabled={deleteConfirmText !== 'DELETE' || deleting}
                      onClick={handleDeleteAccount}
                    >
                      {deleting ? 'Deleting...' : 'Permanently delete'}
                    </button>
                    <button
                      className="px-4 py-2 text-gray-600"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Map dialogs */}
        {openHome && mapsReady && (
          <CoastalLocationDialog
            open={openHome}
            onClose={() => setOpenHome(false)}
            title="Set your home location 📍"
            onSave={(loc) => { updateHomeLocation(loc); setOpenHome(false); }}
          />
        )}

        {openMarine && mapsReady && (
          <CoastalLocationDialog
            open={openMarine}
            onClose={() => setOpenMarine(false)}
            title="Set a coastal spot 🌊"
            onSave={(loc) => { updateCoastalLocation(loc); setOpenMarine(false); }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
