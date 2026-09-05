import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import CoastalLocationDialog from '@/components/CoastalLocationDialog';
import Script from 'next/script';
import Link from 'next/link';
import { PageHeader } from '../components/call/PageHeader';
import Footer from '../components/footer';
import { supabase } from '@/lib/supabase/client';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { Globe, ChevronDown, Coffee, Beer, Flower2, Loader2, PartyPopper, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getSupportedLanguages } from '@/lib/user/language';
import { useGoDaisyPushNotifications } from '@/hooks/useGoDaisyPushNotifications';
import { GODAISY_TIP_PRODUCTS } from '@/lib/godaisy/tipProducts';
import type { TipPackage } from '@/lib/grow/revenueCat';

/** Map product IDs to Lucide icons and accent colours */
const TIP_ICON_MAP: Record<string, { icon: typeof Coffee; accent: string; bg: string }> = {
  godaisy_tip_coffee: { icon: Coffee, accent: 'text-[#0F766E]', bg: 'bg-[#0F766E]/5 border-[#0F766E]/20' },
  godaisy_tip_pint:   { icon: Beer,   accent: 'text-[#D4A84A]', bg: 'bg-[#D4A84A]/10 border-[#D4A84A]/25' },
  godaisy_tip_boost:  { icon: Flower2, accent: 'text-[#4F46E5]', bg: 'bg-[#4F46E5]/5 border-[#4F46E5]/20' },
};

/** Sort order for tip products — cheapest first */
const TIP_SORT_ORDER = ['godaisy_tip_coffee', 'godaisy_tip_pint', 'godaisy_tip_boost'];

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
  const router = useRouter();
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
  /*
   * PREFERENCE TEXT NEVER RENDERS ON THE SERVER.
   *
   * The locations come from `UserPreferencesContext`, which has no localStorage
   * to read during SSR and falls back to its default — London. The client then
   * hydrates with the real place and React reports a mismatch: "Server: London,
   * UK. Client: Colunga." A visible, logged hydration error on the account page,
   * and it predates this redesign.
   *
   * Held back one frame rather than fixed in the context, because the default
   * is right for everything else that reads it — it is only wrong to PRINT one
   * before the stored value has been read.
   *
   * EVERY branch on a stored spot has to wait, not only the name. Gating the
   * place text alone left the button beneath it flipping "Set location" →
   * "Change", which is the same mismatch one element further down — and it was
   * reported by a user, not by me, because I fixed the symptom I could see
   * rather than every read of the value behind it.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Platform detection + Tip Jar
  const [isIOSNative, setIsIOSNative] = useState(false);
  const [tipPackages, setTipPackages] = useState<TipPackage[]>([]);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [tipError, setTipError] = useState<string | null>(null);
  const [tipSuccess, setTipSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (cancelled) return;
        const native = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
        setIsIOSNative(native);

        if (native) {
          const { fetchTipPackages } = await import('@/lib/grow/revenueCat');
          const pkgs = await fetchTipPackages();
          if (cancelled) return;
          const tipIds = new Set(GODAISY_TIP_PRODUCTS.map((p) => p.id));
          setTipPackages(pkgs.filter((pkg) => tipIds.has(pkg.identifier)));
        }
      } catch (err) {
        console.error('[Account] Tip jar load failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleTipPurchase = async (pkg: TipPackage) => {
    try {
      setPurchasingId(pkg.identifier);
      setTipError(null);
      setTipSuccess(false);

      const { purchaseTip } = await import('@/lib/grow/revenueCat');
      const purchased = await purchaseTip(pkg.identifier);

      if (purchased) {
        setTipSuccess(true);
      }
    } catch (err) {
      console.error('[Account] Tip purchase failed:', err);
      setTipError(err instanceof Error ? err.message : 'Purchase failed. Please try again.');
    } finally {
      setPurchasingId(null);
    }
  };

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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete account');
      }

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


  // ---------------------------------------------------------------------------
  // NOTIFICATION PREFERENCES
  // ---------------------------------------------------------------------------

  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    error: pushError,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
  } = useGoDaisyPushNotifications();

  interface NotifPrefs {
    weatherAlerts: boolean;
    extremeWeather: boolean;
    activityRecommendations: boolean;
    astronomyAlerts: boolean;
    tideAlerts: boolean;
    quietStartHour: number;
    quietEndHour: number;
  }

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    weatherAlerts: true,
    extremeWeather: true,
    activityRecommendations: true,
    astronomyAlerts: true,
    tideAlerts: true,
    quietStartHour: 22,
    quietEndHour: 7,
  });
  const [notifPrefsLoading, setNotifPrefsLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  const loadNotifPrefs = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setNotifPrefsLoading(false); return; }

      const response = await fetch('/api/godaisy/push/preferences', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) setNotifPrefs(data.preferences);
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    } finally {
      setNotifPrefsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pushSubscribed) loadNotifPrefs();
    else setNotifPrefsLoading(false);
  }, [pushSubscribed, loadNotifPrefs]);

  const saveNotifPref = async (key: keyof NotifPrefs, value: boolean | number) => {
    setNotifSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/godaisy/push/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (res.ok) setNotifPrefs(prev => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error('Failed to save notification preference:', err);
    } finally {
      setNotifSaving(false);
    }
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

      {/* The slim header, not AppHeader: this page is one of the ordinary ones
          now, and the wordmark plus the menu is the whole of the navigation
          the redesign has. */}
      <PageHeader title="Account" />

      <main className="gd-acct">
        <div className="gd-acct-inner">
          <header className="gd-acct-top">
            <h1 className="gd-acct-h1">Your account</h1>
            {/*
              * GATED, LIKE EVERYTHING ELSE ON THE PAGE.
              *
              * This one button was not. So a signed-out visitor got "Sign out"
              * at the top — which does nothing they need — while the sign-in
              * prompt sat further down and the whole signed-in half of the
              * page, delete-your-account included, was correctly hidden. The
              * page looked like it offered nothing but signing out.
              *
              * `mounted` as well as `isSignedIn`: the answer comes from an
              * async `getUser`, so the server renders neither state and the
              * client must not render a different one on its first pass.
              */}
            {mounted && isSignedIn && (
              <button className="gd-acct-signout" onClick={signOut}>Sign out</button>
            )}
          </header>

          {/* Profile */}
          {isSignedIn && (
            <section className="gd-acct-block">
              <h2 className="gd-acct-h2">Profile</h2>
              <label className="gd-acct-label">
                How should we call you?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your name"
                  className="gd-field"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveDisplayName()}
                />
                <button
                  className="gd-btn"
                  onClick={saveDisplayName}
                  disabled={nameSaving || !displayName.trim()}
                >
                  {nameSaving ? '...' : nameSaved ? '✓' : 'Save'}
                </button>
              </div>
              {userEmail && (
                <p className="gd-acct-note">Signed in as {userEmail}</p>
              )}
            </section>
          )}

          {/* Subscription success banner */}
          {router.query.subscription === 'success' && router.query.app === 'godaisy' && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 mb-4 text-center">
              <p className="text-cyan-800 font-medium">
                Welcome to Go Daisy+! Your subscription is now active.
              </p>
            </div>
          )}



          {/* Language */}
          <section className="gd-acct-block">
            <h2 className="gd-acct-h2">
              Language
            </h2>
            <p className="gd-acct-note">Choose your preferred language for Go Daisy.</p>

            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="gd-picker"
              >
                <div className="flex items-center gap-2">
                  {language === 'en' ? (
                    <Globe className="w-5 h-5" />
                  ) : (
                    <span className="text-lg">{LANGUAGE_FLAGS[language] || '🌐'}</span>
                  )}
                  <span className="font-medium">{currentLang.nativeName}</span>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {langDropdownOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div className="fixed inset-0 z-40" onClick={() => setLangDropdownOpen(false)} />

                  {/* Dropdown menu */}
                  <div className="gd-picker-menu">
                    {supportedLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={`gd-picker-item${language === lang.code ? ' is-on' : ''}`}
                      >
                        {lang.code === 'en' ? (
                          <Globe className="w-5 h-5" />
                        ) : (
                          <span className="text-lg">{LANGUAGE_FLAGS[lang.code] || '🌐'}</span>
                        )}
                        <div>
                          <div className="gd-acct-card-title">{lang.nativeName}</div>
                          <div className="gd-acct-note">{lang.name}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Locations */}
          <section className="gd-acct-block">
            <h2 className="gd-acct-h2">Locations</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="gd-acct-card">
                <div className="gd-acct-card-title">Home</div>
                {!mounted ? (
                  <p className="gd-acct-note">…</p>
                ) : homeSpot ? (
                  <p className="gd-acct-place">{homeSpot.name}</p>
                ) : (
                  <p className="gd-acct-note">No home location set</p>
                )}
                <button
                  className="gd-acct-btn"
                  onClick={() => mapsReady ? setOpenHome(true) : alert('Loading map…')}
                >
                  {!mounted ? 'Change' : homeSpot ? 'Change' : 'Set location'}
                </button>
              </div>

              <div className="gd-acct-card">
                <div className="gd-acct-card-title">Coastal spot</div>
                {!mounted ? (
                  <p className="gd-acct-note">…</p>
                ) : coastalSpot ? (
                  <p className="gd-acct-place">{coastalSpot.name}</p>
                ) : (
                  <p className="gd-acct-note">No coastal location set</p>
                )}
                <button
                  className="gd-acct-btn"
                  onClick={() => mapsReady ? setOpenMarine(true) : alert('Loading map…')}
                >
                  {!mounted ? 'Change' : coastalSpot ? 'Change' : 'Set location'}
                </button>
                {/* Gated on `mounted` for the same reason the place name is:
                    `preferences.interests` is empty on the server and full on the
                    client's first render, so an ungated tip is in the server HTML
                    and absent from the client's — which is a hydration mismatch,
                    not a cosmetic one. */}
                {mounted && !isMarineUser && (
                  <p className="gd-acct-note">Tip: add sea activities for tide/swell suggestions.</p>
                )}
              </div>
            </div>
          </section>

          {/* Activities */}
          <section className="gd-acct-block">
            <h2 className="gd-acct-h2">Activities</h2>
            {/* Same hydration rule as the locations block: the saved interests
                are not known on the server, so the choice between the chip list
                and the empty line has to wait for the client. */}
            {!mounted ? (
              <p className="gd-acct-note">…</p>
            ) : selectedActivities.length ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedActivities.map(a => (
                  <span key={a} className="gd-chip">
                    {a.replaceAll('_',' ')}
                    <button
                      aria-label="Remove"
                      onClick={() => removeActivity(a)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="gd-acct-note">No activities saved yet.</p>
            )}
            {/* `/start`, not `/interests`. They do the same job and `/start`
                does it better — grouped, ordered by what people recognise, and
                in this design. The old picker was the last thing in the
                redesigned app still opening a screen from the previous one. */}
            <div className="gd-acct-row-actions">
              <Link href="/start" className="gd-acct-btn">Edit activities</Link>
              <button className="gd-acct-btn" onClick={clearLocal}>Clear all</button>
            </div>
          </section>

          {/*
            * THE OFF SWITCH NEEDS NO ACCOUNT, BECAUSE THE ON SWITCH DID NOT.
            *
            * `/start` asks for notification permission during onboarding, and
            * onboarding deliberately requires no account — so the common case
            * was somebody turning notifications ON with no account and then
            * finding nothing in the app to turn them OFF, because this whole
            * section was gated on `isSignedIn`. Offering a thing and hiding
            * its undo is not a dark pattern by intent, but it is one by
            * effect, and Apple treats it as one either way.
            *
            * What genuinely needs an account is the per-type preferences and
            * quiet hours, because those persist server-side against a user id.
            * Those stay gated, below, and say so.
            *
            * Still hidden on iOS native: there the notifications are the
            * system's, and iOS Settings is where they are managed.
            */}
          {mounted && !isIOSNative && (
            <section className="gd-acct-block">
              <h2 className="gd-acct-h2">Notifications</h2>
              <p className="gd-acct-note">
                Get alerts for weather, activity recommendations, and more.
              </p>

              {!pushSupported ? (
                <div className="gd-note">
                  This browser cannot deliver notifications. Chrome, Firefox and
                  Edge can, and so can Go Daisy on iPhone.
                </div>
              ) : pushPermission === 'denied' ? (
                <div className="gd-note gd-note--bad">
                  Notifications are switched off for Go Daisy. You can turn them
                  back on in your device settings.
                </div>
              ) : (
                <>
                  {/* Enable/Disable toggle */}
                  <div className="gd-note">
                    <div>
                      <div className="gd-acct-card-title">
                        {pushSubscribed ? 'Notifications enabled' : 'Enable notifications'}
                      </div>
                      <div className="gd-acct-note">
                        {pushSubscribed
                          ? 'Receiving alerts on this device'
                          : 'Turn on to receive weather alerts and activity tips'}
                      </div>
                    </div>
                    <button
                      className={pushSubscribed ? 'gd-btn gd-btn--quiet' : 'gd-btn'}
                      disabled={pushLoading || notifPrefsLoading}
                      onClick={async () => {
                        if (pushSubscribed) {
                          await pushUnsubscribe();
                        } else {
                          const ok = await pushSubscribe();
                          if (!ok && pushError) alert(pushError);
                        }
                      }}
                    >
                      {pushLoading ? '...' : pushSubscribed ? 'Disable' : 'Enable'}
                    </button>
                  </div>

                  {/* What each notification is about, and when it may not
                      arrive. Persisted against a user id, so it needs one. */}
                  {pushSubscribed && !isSignedIn && (
                    <p className="gd-acct-note">
                      <Link href="/login">Sign in</Link> to choose which
                      notifications you get and to set quiet hours. Turning them
                      off here works either way.
                    </p>
                  )}

                  {/* Preferences - only when subscribed */}
                  {isSignedIn && pushSubscribed && !notifPrefsLoading && (
                    <div className="space-y-2">
                      <NotifToggle
                        label="Extreme weather"
                        desc="Storms, heat waves, heavy frost"
                        checked={notifPrefs.extremeWeather}
                        onChange={(v) => saveNotifPref('extremeWeather', v)}
                        disabled={notifSaving}
                      />
                      <NotifToggle
                        label="Weather alerts"
                        desc="Wind, rain, UV warnings"
                        checked={notifPrefs.weatherAlerts}
                        onChange={(v) => saveNotifPref('weatherAlerts', v)}
                        disabled={notifSaving}
                      />
                      <NotifToggle
                        label="Activity tips"
                        desc="Great conditions for your activities"
                        checked={notifPrefs.activityRecommendations}
                        onChange={(v) => saveNotifPref('activityRecommendations', v)}
                        disabled={notifSaving}
                      />
                      <NotifToggle
                        label="Astronomy alerts"
                        desc="ISS passes, meteor showers, eclipses"
                        checked={notifPrefs.astronomyAlerts}
                        onChange={(v) => saveNotifPref('astronomyAlerts', v)}
                        disabled={notifSaving}
                      />
                      {isMarineUser && (
                        <NotifToggle
                          label="Tide alerts"
                          desc="Significant tide events at your coast"
                          checked={notifPrefs.tideAlerts}
                          onChange={(v) => saveNotifPref('tideAlerts', v)}
                          disabled={notifSaving}
                        />
                      )}

                      {/* Quiet hours */}
                      <div className="gd-acct-subblock">
                        <div className="call-label gd-acct-label">Quiet hours</div>
                        <div className="gd-acct-quiet-row">
                          <span>From</span>
                          <select
                            className="gd-select"
                            value={notifPrefs.quietStartHour}
                            onChange={(e) => saveNotifPref('quietStartHour', parseInt(e.target.value))}
                            disabled={notifSaving}
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                            ))}
                          </select>
                          <span>to</span>
                          <select
                            className="gd-select"
                            value={notifPrefs.quietEndHour}
                            onChange={(e) => saveNotifPref('quietEndHour', parseInt(e.target.value))}
                            disabled={notifSaving}
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                            ))}
                          </select>
                        </div>
                        <p className="gd-acct-note">No notifications during these hours</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* Tip Jar — iOS native only */}
          {isIOSNative && (
            <section className="gd-acct-block">
              <h2 className="gd-acct-h2">Tip Jar</h2>
              <p className="gd-acct-note">
                Love Go Daisy? Leave a one-off tip to help keep things running.
              </p>

              {tipSuccess && (
                <div className="gd-note gd-note--good">
                  <PartyPopper className="h-5 w-5 shrink-0" />
                  <p className="">
                    Thank you for the tip! You&apos;re a legend.
                  </p>
                </div>
              )}
              {tipError && (
                <div className="gd-note gd-note--bad">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="">{tipError}</p>
                </div>
              )}

              <div className="space-y-3">
                {tipPackages.length > 0 ? (
                  [...tipPackages].sort((a, b) =>
                    TIP_SORT_ORDER.indexOf(a.identifier) - TIP_SORT_ORDER.indexOf(b.identifier)
                  ).map((pkg) => {
                    const product = GODAISY_TIP_PRODUCTS.find(
                      (p) => p.id === pkg.identifier
                    );
                    const style = TIP_ICON_MAP[pkg.identifier];
                    const Icon = style?.icon ?? Coffee;

                    return (
                      <button
                        key={pkg.identifier}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all
                          ${style?.bg ?? 'bg-gray-50 border-gray-200'}
                          ${purchasingId ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md active:scale-[0.98]'}`}
                        disabled={!!purchasingId}
                        onClick={() => handleTipPurchase(pkg)}
                      >
                        <div className={`p-2.5 bg-white rounded-lg shadow-sm ${style?.accent ?? 'text-gray-600'}`}>
                          {purchasingId === pkg.identifier ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Icon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="gd-acct-card-title">
                            {product?.label ?? pkg.title}
                          </div>
                          <div className="gd-acct-note">One-off tip</div>
                        </div>
                        <span className={`font-bold text-base ${style?.accent ?? 'text-gray-700'}`}>
                          {pkg.priceString}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="gd-note">
                    Tip jar is loading. If this persists, try restarting the app.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Sync status */}
          {!isSignedIn ? (
            <div className="gd-note">
              <span>Your changes are saved on this device only.</span>
              <Link href="/login" className="gd-btn">Log in</Link>
            </div>
          ) : (
            <div className="gd-note gd-note--good">
              <span>Signed in — your preferences sync across devices.</span>
            </div>
          )}

          {/* Delete Account */}
          {/*
              * DELETING AN ACCOUNT IS A REAL OPTION, NOT A DARE.
              *
              * It was headed "Danger Zone" in red at the bottom of an
              * 872-line page — the language of a place you should not be
              * rather than of a thing you are entitled to do. Apple requires
              * this to exist and to be findable, and a person closing an
              * account is usually already unhappy; making it feel like a trap
              * is the last impression the product leaves.
              *
              * So: a plain heading, plain language about what goes, and the
              * same typed confirmation — that stays, because it is genuinely
              * irreversible and a stray tap should not do it.
              */}
          {/*
              * ALWAYS RENDERED, EVEN SIGNED OUT.
              *
              * It used to be gated on `isSignedIn`, so a signed-out visitor —
              * and an App Store reviewer, who arrives signed out — found no
              * mention of account deletion anywhere in the app. Apple requires
              * the path to exist AND to be findable, and "it appears once you
              * are logged in" is not findable by anyone looking for it.
              *
              * Signed out, it says what it is and where to sign in. The
              * destructive control itself still needs a session, because
              * deleting an account requires knowing whose.
              */}
          {mounted && (
            <section className="gd-acct-block is-danger">
              <h2 className="gd-acct-h2">Delete your account</h2>
              <p className="gd-acct-note">
                This removes your account and everything stored against it — your places,
                your activities, your notification settings. It happens immediately and it
                cannot be undone.
              </p>

              {!isSignedIn ? (
                <p className="gd-acct-note">
                  <Link href="/login">Sign in</Link> to delete your account. If you have
                  never signed in there is no account to delete — nothing is stored
                  against you beyond this browser, and <button type="button" className="gd-linkish" onClick={clearLocal}>clearing
                  what is saved here</button> removes it.
                </p>
              ) : !showDeleteConfirm ? (
                <button className="gd-acct-danger-btn" onClick={() => setShowDeleteConfirm(true)}>
                  Delete my account
                </button>
              ) : (
                <div className="gd-acct-danger-confirm">
                  <label className="gd-acct-label" htmlFor="delete-confirm">
                    Type DELETE to confirm
                  </label>
                  <input
                    id="delete-confirm"
                    type="text"
                    placeholder="DELETE"
                    className="gd-acct-input"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    autoComplete="off"
                  />
                  <div className="gd-acct-danger-row">
                    <button
                      className="gd-acct-danger-btn is-armed"
                      disabled={deleteConfirmText !== 'DELETE' || deleting}
                      onClick={handleDeleteAccount}
                    >
                      {deleting ? 'Deleting…' : 'Delete it'}
                    </button>
                    <button
                      className="gd-acct-signout"
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                    >
                      Keep my account
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

// ---------------------------------------------------------------------------
// Notification toggle sub-component
// ---------------------------------------------------------------------------

function NotifToggle({
  label,
  desc,
  checked,
  onChange,
  disabled,
  plusRequired,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  plusRequired?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`gd-toggle${checked ? ' is-on' : ''}`}
    >
      <div>
        <div className="flex items-center gap-1.5">
          <span className="gd-toggle-label">{label}</span>
          {plusRequired && (
            <span className="text-[10px] font-medium bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">Plus</span>
          )}
        </div>
        <div className="gd-acct-note">{desc}</div>
      </div>
      <div
        className="gd-toggle-box"
      >
        {checked && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
