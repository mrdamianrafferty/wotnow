import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { Mail, TrendingUp, AlertCircle } from 'lucide-react';
import CoastalLocationDialog, { BasicLocation } from '../../components/CoastalLocationDialog';
import { supabase } from '../../lib/supabase/client';
import { useFavourites } from '../../hooks/useFavourites';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { useUnifiedLocation } from '../../context/UnifiedLocationContext';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import FindrFooter from '../../components/FindrFooter';
import type { FindrUserSettings } from '../api/findr/user-settings';
import { SPECIES_IMAGE_MAP } from '../../data/speciesImageMap';
import type { SavedLocation } from '../../types/multiLocation';

const TECHNIQUES = [
  { id: 'spinning', label: 'Spinning' },
  { id: 'fly_fishing', label: 'Fly Fishing' },
  { id: 'bottom_fishing', label: 'Bottom Fishing' },
  { id: 'trolling', label: 'Trolling' },
  { id: 'jigging', label: 'Jigging' },
  { id: 'surfcasting', label: 'Surfcasting' },
  { id: 'lure_fishing', label: 'Lure Fishing' },
];

const HABITATS = [
  { id: 'rocky_shores', label: 'Rocky Shores', icon: '🪨' },
  { id: 'sandy_beaches', label: 'Sandy Beaches', icon: '🏖️' },
  { id: 'rocky_reefs', label: 'Rocky Reefs', icon: '🪸' },
  { id: 'piers', label: 'Piers & Jetties', icon: '🏗️' },
  { id: 'harbours', label: 'Harbours & Marinas', icon: '⚓' },
  { id: 'estuaries', label: 'Estuaries', icon: '🌊' },
  { id: 'seagrass_beds', label: 'Seagrass Beds', icon: '🌿' },
  { id: 'wrecks', label: 'Wrecks', icon: '🚢' },
];

const MAX_REGIONAL_SUGGESTIONS = 50;
const MAX_GLOBAL_FALLBACK_SUGGESTIONS = 12;
const REGIONAL_FETCH_MIN_RESULTS = 200; // Request extra rows so we still have 50 after filtering favourites/dismissals.
const REGIONAL_DEFAULT_MIN_SCORE = 0.35;
const REGIONAL_MIN_SCORE_FLOOR = 0.0;
const REGIONAL_MIN_SCORE_STEP = 0.05;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GLOBAL_FALLBACK_SPECIES_CODES = [
  'SNR',
  '91F278',
  '17799E',
  'E0E710',
  '34CD60',
  'C413E5',
  '04BC28',
  '4B29C0',
  '779F9B',
  'D1A073',
  '2A5836',
  'SBA',
  'SBR',
  '2BD-BREAM',
  '28A108',
  '5726F7',
  '4F1DB2',
  '720F4B',
  '92F10A',
  'FD782D',
  'YFT',
  'ALB',
  'BET',
  'DOL',
  'WAH',
  'SWO',
  'SMA',
  'AD05CC',
  '9A2958',
  'A3C183',
  '6093F7',
  '8CE959',
  'ROO',
  '7F6482',
  '8F5EC6',
  'B4F26D',
  'PTR',
  'PHS',
  'HAL',
  'COD',
  'HAD',
  'CHI',
  'ATS',
  'SOK',
  'STB',
  'CDA012',
  'BDF304',
  'DD85DD',
  '3DD951',
];
const GLOBAL_FALLBACK_NOTE = 'Findr staple pick while we gather more data for your waters';

interface FavouriteChipDisplay {
  code: string;
  label: string;
  scientificName: string | null;
  slug: string | null;
}

function dedupeFavouriteChips(items: FavouriteChipDisplay[]): FavouriteChipDisplay[] {
  if (items.length <= 1) return items;
  const unique = new Map<string, FavouriteChipDisplay>();
  for (const item of items) {
    if (!unique.has(item.code)) {
      unique.set(item.code, item);
    }
  }
  return Array.from(unique.values());
}

export default function FindrSettingsPage() {
  const router = useRouter();
  const { favourites, favouriteDetails, user, loading: favLoading, addFavourite, removeFavourite, isFavourited } = useFavourites();
  const {
    preferences: notificationPrefs,
    isLoading: notifLoading,
    updatePreferences: updateNotifPrefs,
  } = useNotificationPreferences();
  const { homeLocation, coastalLocation, updateLocationBySlot } = useUnifiedLocation();

  const [settings, setSettings] = useState<FindrUserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const hasMounted = useRef(false);

  // Dialog states
  const [showHomeDialog, setShowHomeDialog] = useState(false);
  const [showFishingDialog, setShowFishingDialog] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingAddCode, setPendingAddCode] = useState<string | null>(null);
  const [pendingRemoveCode, setPendingRemoveCode] = useState<string | null>(null);
  const [pendingDismissCode, setPendingDismissCode] = useState<string | null>(null);
  const [dismissedSuggestionCodes, setDismissedSuggestionCodes] = useState<string[]>([]);
  const {
    suggestions: regionalSuggestions,
    loading: regionalSuggestionsLoading,
    error: regionalSuggestionsError,
    regionId: regionalSuggestionsRegionId,
    refresh: refreshRegionalSuggestions,
    canSuggest: hasRegionalSuggestions,
    requestMore: requestMoreRegionalSuggestions,
    canRequestMore: canRequestMoreRegionalSuggestions,
  } = useRegionalSpeciesSuggestions(homeLocation);
  const favouriteCodeSet = useMemo(() => {
    const codes = favouriteDetails
      .map((detail) => detail.speciesCode)
      .filter((code): code is string => Boolean(code))
      .map((code) => code.trim().toUpperCase());

    if (codes.length > 0) {
      return new Set(codes);
    }

    const fallbackCodes = favourites
      .filter((id) => !UUID_PATTERN.test(id))
      .map((code) => code.trim().toUpperCase());

    return new Set(fallbackCodes);
  }, [favouriteDetails, favourites]);

  const favouriteItems = useMemo(() => {
    const sortByLabel = (items: FavouriteChipDisplay[]) => items.sort((a, b) => a.label.localeCompare(b.label));

    if (favouriteDetails.length > 0) {
      const mapped = favouriteDetails
        .map((detail) => {
          const fallbackCode = detail.speciesCode ?? detail.speciesId;
          const code = fallbackCode?.trim().toUpperCase();
          if (!code) return null;
          const mapInfo = SPECIES_IMAGE_MAP[code];
          return {
            code,
            label: detail.name || mapInfo?.name || code,
            scientificName: detail.scientificName || mapInfo?.scientificName || null,
            slug: mapInfo?.slug || null,
          } satisfies FavouriteChipDisplay;
        })
        .filter((item): item is FavouriteChipDisplay => Boolean(item));

      return sortByLabel(dedupeFavouriteChips(mapped));
    }

    const mapped = favourites
      .map((rawCode) => {
        const code = rawCode?.trim().toUpperCase();
        if (!code) return null;
        const speciesInfo = SPECIES_IMAGE_MAP[code];
        return {
          code,
          label: speciesInfo?.name || code,
          scientificName: speciesInfo?.scientificName || null,
          slug: speciesInfo?.slug || null,
        } satisfies FavouriteChipDisplay;
      })
      .filter((item): item is FavouriteChipDisplay => Boolean(item));

    return sortByLabel(dedupeFavouriteChips(mapped));
  }, [favouriteDetails, favourites]);
  const dismissedSuggestionSet = useMemo(() => new Set(dismissedSuggestionCodes.map((code) => code.toUpperCase())), [dismissedSuggestionCodes]);
  const filteredRegionalSuggestions = useMemo(() => {
    return regionalSuggestions
      .filter((suggestion) => {
        if (favouriteCodeSet.has(suggestion.code)) return false;
        return !isFavourited(suggestion.code);
      })
      .filter((suggestion) => !dismissedSuggestionSet.has(suggestion.code));
  }, [regionalSuggestions, isFavourited, dismissedSuggestionSet, favouriteCodeSet]);

  const availableRegionalSuggestions = useMemo(() => {
    const regionalLimited = filteredRegionalSuggestions.slice(0, MAX_REGIONAL_SUGGESTIONS);
    const shouldPadWithFallbacks =
      regionalLimited.length < MAX_REGIONAL_SUGGESTIONS &&
      (!hasRegionalSuggestions || (!regionalSuggestionsLoading && !canRequestMoreRegionalSuggestions));

    if (!shouldPadWithFallbacks) {
      return regionalLimited;
    }

    const neededFallbacks = Math.min(
      MAX_GLOBAL_FALLBACK_SUGGESTIONS,
      MAX_REGIONAL_SUGGESTIONS - regionalLimited.length,
    );

    if (neededFallbacks <= 0) {
      return regionalLimited;
    }

    const exclusions = new Set<string>();
    regionalLimited.forEach((suggestion) => exclusions.add(suggestion.code));
    favouriteCodeSet.forEach((code) => exclusions.add(code));
    dismissedSuggestionSet.forEach((code) => exclusions.add(code));

    const fallbackSuggestions: RegionalSpeciesSuggestion[] = [];
    for (const code of GLOBAL_FALLBACK_SPECIES_CODES) {
      if (fallbackSuggestions.length >= neededFallbacks) break;
      if (exclusions.has(code)) continue;
      if (isFavourited(code)) continue;

      const info = SPECIES_IMAGE_MAP[code];
      if (!info) continue;

      fallbackSuggestions.push({
        code,
        label: info.name || code,
        scientificName: info.scientificName || null,
        availabilityScore: 0,
        confidence: 0,
        source: 'global-fallback',
        originNote: GLOBAL_FALLBACK_NOTE,
      });
      exclusions.add(code);
    }

    return [...regionalLimited, ...fallbackSuggestions];
  }, [
    filteredRegionalSuggestions,
    favouriteCodeSet,
    dismissedSuggestionSet,
    isFavourited,
    hasRegionalSuggestions,
    regionalSuggestionsLoading,
    canRequestMoreRegionalSuggestions,
  ]);

  const hasGlobalFallbacks = useMemo(
    () => availableRegionalSuggestions.some((suggestion) => suggestion.source === 'global-fallback'),
    [availableRegionalSuggestions],
  );

  useEffect(() => {
    setDismissedSuggestionCodes([]);
  }, [homeLocation?.rectangleCode]);

  useEffect(() => {
    if (!hasRegionalSuggestions) return;
    if (regionalSuggestionsLoading) return;
    if (filteredRegionalSuggestions.length >= MAX_REGIONAL_SUGGESTIONS) return;
    if (!canRequestMoreRegionalSuggestions) return;
    void requestMoreRegionalSuggestions();
  }, [
    filteredRegionalSuggestions.length,
    hasRegionalSuggestions,
    regionalSuggestionsLoading,
    canRequestMoreRegionalSuggestions,
    requestMoreRegionalSuggestions,
  ]);

  // Load settings
  const loadSettings = useCallback(async () => {
    if (!user) {
      console.log('[Settings] Cannot load - no user');
      return;
    }

    try {
      console.log('[Settings] Loading settings for user:', user.id);
      setLoading(true);
      const response = await fetch('/api/findr/user-settings', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success && data.settings) {
        console.log('[Settings] Loaded settings from API:', {
          hasDisplayName: !!data.settings.displayName,
          techniquesCount: data.settings.fishingTechniques?.length ?? 0,
          habitatsCount: data.settings.favoriteHabitats?.length ?? 0,
        });
        setSettings(data.settings);
      } else {
        console.log('[Settings] No settings found, using defaults');
        // Initialize with defaults if no settings exist
        setSettings({
          displayName: null,
          email: user.email || null,
          hasBoat: false,
          fishingTechniques: [],
          favoriteHabitats: [],
          homeLocation: null,
          fishingLocation: null,
          preferencesJson: {},
          updatedAt: null,
        });
      }
    } catch (error) {
      console.error('[Settings] Failed to load settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check session on mount to prevent premature redirects
  useEffect(() => {
    const checkSession = async () => {
      await supabase.auth.getSession();
      setSessionChecked(true);
    };
    checkSession();
  }, []);

  // Load settings on mount - this ensures settings reload every time user visits the page
  useEffect(() => {
    console.log('[Settings] Mount effect triggered:', {
      favLoading,
      hasUser: !!user,
      hasMounted: hasMounted.current,
    });

    if (!favLoading && user && !hasMounted.current) {
      console.log('[Settings] Conditions met - loading settings');
      hasMounted.current = true;
      loadSettings();
    }
  }, [favLoading, user, loadSettings]);

  // Reset mount flag when component unmounts so it loads again on next mount
  useEffect(() => {
    console.log('[Settings] Component mounted');
    return () => {
      console.log('[Settings] Component unmounting - resetting hasMounted flag');
      hasMounted.current = false;
    };
  }, []);

  // Check if user is authenticated - but only after we've verified the session
  // This prevents redirect race conditions during initial page load
  useEffect(() => {
    if (sessionChecked && !favLoading && !user) {
      router.push('/findr/auth?redirect=/findr/settings');
    }
  }, [sessionChecked, user, favLoading, router]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Auto-clear transient status messages
  useEffect(() => {
    if (!message) {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
      return;
    }

    messageTimeoutRef.current = setTimeout(() => {
      setMessage(null);
      messageTimeoutRef.current = null;
    }, 6000);

    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
    };
  }, [message]);

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setMessage(null);

      // Don't send locations - they're managed by UnifiedLocationContext
      const { homeLocation: _, fishingLocation: __, ...settingsToSave } = settings;

      const response = await fetch('/api/findr/user-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settingsToSave),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setIsDirty(false);
        await loadSettings(); // Reload to get updated timestamp
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    try {
      setPasswordBusy(true);
      setPasswordMessage(null);

      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setPasswordMessage({ type: 'error', text: error.message });
      } else {
        setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
        setNewPassword('');
        setConfirmPassword('');
        setShowPassword(false);
      }
    } catch (error) {
      console.error('Failed to update password:', error);
      setPasswordMessage({ type: 'error', text: 'Failed to update password' });
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/findr');
  };

  const toggleTechnique = (technique: string) => {
    if (!settings) return;
    const techniques = settings.fishingTechniques.includes(technique)
      ? settings.fishingTechniques.filter(t => t !== technique)
      : [...settings.fishingTechniques, technique];
    setSettings({ ...settings, fishingTechniques: techniques });
    setIsDirty(true);
  };

  const favouriteCount = favouriteDetails.length || favouriteItems.length;

  const requestSuggestionTopUp = useCallback(async () => {
    if (!hasRegionalSuggestions) return;
    try {
      if (canRequestMoreRegionalSuggestions) {
        await requestMoreRegionalSuggestions();
      } else {
        await refreshRegionalSuggestions();
      }
    } catch (error) {
      console.error('[Settings] Failed to refresh regional suggestions', error);
    }
  }, [
    hasRegionalSuggestions,
    canRequestMoreRegionalSuggestions,
    requestMoreRegionalSuggestions,
    refreshRegionalSuggestions,
  ]);

  const handleRemoveFavouriteChip = async (code: string, label: string) => {
    try {
      setPendingRemoveCode(code);
      await removeFavourite(code);
      setMessage({ type: 'success', text: `${label} removed from favourites` });
    } catch (error) {
      console.error('Failed to remove favourite', error);
      setMessage({ type: 'error', text: `Failed to remove ${label}` });
    } finally {
      setPendingRemoveCode(null);
    }
  };

  const handleAddFavouriteFromSuggestion = async (code: string, label: string) => {
    const normalizedCode = code.trim().toUpperCase();
    try {
      setPendingAddCode(normalizedCode);
      await addFavourite(normalizedCode, { speciesCode: normalizedCode, speciesName: label });
      setMessage({ type: 'success', text: `${label} added to favourites` });
      setDismissedSuggestionCodes((prev) => prev.filter((item) => item !== normalizedCode));
      void requestSuggestionTopUp();
    } catch (error) {
      console.error('Failed to add favourite', error);
      setMessage({ type: 'error', text: `Failed to add ${label}` });
    } finally {
      setPendingAddCode(null);
    }
  };

  const handleDismissSuggestion = async (code: string, label: string) => {
    const normalizedCode = code.trim().toUpperCase();
    setPendingDismissCode(normalizedCode);
    setDismissedSuggestionCodes((prev) => (prev.includes(normalizedCode) ? prev : [...prev, normalizedCode]));
    setMessage({ type: 'success', text: `${label} hidden from suggestions` });
    try {
      await requestSuggestionTopUp();
    } finally {
      setPendingDismissCode(null);
    }
  };

  const toggleHabitat = (habitat: string) => {
    if (!settings) return;
    const habitats = settings.favoriteHabitats.includes(habitat)
      ? settings.favoriteHabitats.filter(h => h !== habitat)
      : [...settings.favoriteHabitats, habitat];
    setSettings({ ...settings, favoriteHabitats: habitats });
    setIsDirty(true);
  };

  const handleNotificationToggle = async (field: 'hot_bite_alerts_enabled' | 'daily_email_enabled' | 'weekly_forecast_enabled', value: boolean) => {
    try {
      await updateNotifPrefs.mutateAsync({ [field]: value });
      setMessage({ type: 'success', text: 'Notification settings updated!' });
    } catch (error) {
      console.error('Failed to update notifications:', error);
      setMessage({ type: 'error', text: 'Failed to update notification settings' });
    }
  };

  // Show loading spinner while checking session or loading data
  if (!sessionChecked || favLoading || loading) {
    return (
      <>
        <Head>
          <title>Settings - Findr</title>
          <meta name="description" content="Manage your Findr settings and preferences" />
        </Head>
        <FindrNavigation />
        <div className="flex items-center justify-center min-h-screen">
          <span className="loading loading-spinner loading-lg" />
        </div>
        <FindrFooter />
      </>
    );
  }

  if (!user || !settings) {
    return null;
  }

  const greeting = settings.displayName ? `Hello ${settings.displayName} 🎣` : 'Hello 🎣';

  return (
    <>
      <Head>
        <title>Settings - Findr</title>
        <meta name="description" content="Manage your Findr settings and preferences" />
      </Head>
      <FindrNavigation />
        <main className="max-w-4xl mx-auto p-6 space-y-8 mb-20 bg-base-200 min-h-screen">
          {/* Header */}
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-base-content">{greeting}</h1>
              <p className="text-base-content/70 text-sm">Customize your fishing experience</p>
            </div>
            <button className="btn btn-ghost" onClick={handleSignOut}>
              Sign out
            </button>
          </header>

          {/* Unsaved changes warning */}
          {isDirty && (
            <div className="alert alert-warning">
              <span>You have unsaved changes. Don&apos;t forget to click <strong>Save Settings</strong>.</span>
            </div>
          )}

          {/* Success/Error Message */}
          {message && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              <span>{message.text}</span>
            </div>
          )}

          {/* Personal Details */}
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">👤</span>
                <div>
                  <h2 className="card-title text-base-content">Personal Details</h2>
                  <p className="text-sm text-base-content/70 -mt-1">How we address you in Findr</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="form-control w-full">
                  <span className="label-text text-base-content">Display Name</span>
                  <input
                    className="input input-bordered w-full text-base-content bg-base-100 placeholder:text-base-content/50"
                    placeholder="e.g. Captain Hook"
                    value={settings.displayName || ''}
                    onChange={(e) => {
                      setSettings({ ...settings, displayName: e.target.value });
                      setIsDirty(true);
                    }}
                  />
                </label>

                <label className="form-control w-full">
                  <span className="label-text text-base-content">Email (account)</span>
                  <input
                    className="input input-bordered w-full text-base-content"
                    value={settings.email || ''}
                    readOnly
                    aria-readonly
                    title="Your account email"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <div>
                  <h2 className="card-title text-base-content">Fishing Alerts</h2>
                  <p className="text-sm text-base-content/70 -mt-1">Get notified when conditions are perfect for your favourite species</p>
                </div>
              </div>

              {notifLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="loading loading-spinner loading-lg text-primary" />
                </div>
              ) : notificationPrefs ? (
                <div className="space-y-4">
                  {/* Hot Bite Alerts */}
                  <div className="card bg-base-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                            <AlertCircle size={20} className="text-error" />
                          </div>
                          <h4 className="font-semibold text-base-content">Hot Bite Alerts</h4>
                        </div>
                        <p className="text-xs text-base-content/60 ml-12">
                          Instant in-app notifications when favourite species reach 85%+ confidence. Perfect for last-minute fishing trips!
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-error"
                        checked={notificationPrefs.hot_bite_alerts_enabled ?? true}
                        onChange={(e) => handleNotificationToggle('hot_bite_alerts_enabled', e.target.checked)}
                        disabled={updateNotifPrefs.isPending}
                      />
                    </div>
                  </div>

                  {/* Daily Email Digest */}
                  <div className="card bg-base-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0">
                            <Mail size={20} className="text-info" />
                          </div>
                          <h4 className="font-semibold text-base-content">Daily Email Digest</h4>
                        </div>
                        <p className="text-xs text-base-content/60 ml-12 mb-3">
                          Daily summary of all favourites, organized by confidence tiers: Hot Bites (85%+), Good Conditions (70-84%), and Status Updates (&lt;70%). Maximum 1 email per day.
                        </p>
                        <div className="ml-12 text-xs text-base-content/50">
                          Sent daily at 8:00 AM
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-info"
                        checked={notificationPrefs.daily_email_enabled ?? false}
                        onChange={(e) => handleNotificationToggle('daily_email_enabled', e.target.checked)}
                        disabled={updateNotifPrefs.isPending}
                      />
                    </div>
                  </div>

                  {/* Weekly Forecast Email */}
                  <div className="card bg-base-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                            <TrendingUp size={20} className="text-success" />
                          </div>
                          <h4 className="font-semibold text-base-content">Weekly Forecast</h4>
                        </div>
                        <p className="text-xs text-base-content/60 ml-12 mb-3">
                          7-day confidence forecast for each favourite species with best fishing days highlighted. Perfect for planning weekend trips!
                        </p>
                        <div className="ml-12 text-xs text-base-content/50">
                          Sent every Monday at 8:00 AM
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-success"
                        checked={notificationPrefs.weekly_forecast_enabled ?? false}
                        onChange={(e) => handleNotificationToggle('weekly_forecast_enabled', e.target.checked)}
                        disabled={updateNotifPrefs.isPending}
                      />
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div className="alert alert-info">
                    <AlertCircle size={16} />
                    <div className="text-xs">
                      Add species to your favourites to start receiving personalized fishing alerts and forecasts.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* Fishing Style */}
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⛵</span>
                <div>
                  <h2 className="card-title text-base-content">Your Fishing Style</h2>
                  <p className="text-sm text-base-content/70 -mt-1">Help us tailor recommendations to your setup</p>
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={settings.hasBoat}
                    onChange={(e) => {
                      setSettings({ ...settings, hasBoat: e.target.checked });
                      setIsDirty(true);
                    }}
                  />
                  <span className="label-text text-base-content">I fish from a boat</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="label-text font-semibold text-base-content">Favourite Techniques</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {TECHNIQUES.map((tech) => (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={() => toggleTechnique(tech.id)}
                      className={`btn btn-sm ${
                        settings.fishingTechniques.includes(tech.id)
                          ? 'btn-primary'
                          : 'btn-outline border-base-content/30 text-base-content hover:bg-base-content/10'
                      }`}
                    >
                      {settings.fishingTechniques.includes(tech.id) && '✓ '}
                      {tech.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-text font-semibold text-base-content">Favourite Habitats</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {HABITATS.map((habitat) => (
                    <button
                      key={habitat.id}
                      type="button"
                      onClick={() => toggleHabitat(habitat.id)}
                      className={`btn btn-sm ${
                        settings.favoriteHabitats.includes(habitat.id)
                          ? 'btn-primary'
                          : 'btn-outline border-base-content/30 text-base-content hover:bg-base-content/10'
                      }`}
                    >
                      {habitat.icon} {habitat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Locations */}
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📍</span>
                <div>
                  <h2 className="card-title text-base-content">Your Locations</h2>
                  <p className="text-sm text-base-content/70 -mt-1">Set your home and favourite fishing spots</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Home Location */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-base-content/70 flex items-center gap-2">
                    🏠 Home Location
                  </h3>
                  {homeLocation ? (
                    <div className="border border-base-300 rounded-lg p-4 space-y-3 bg-base-100">
                      <div className="space-y-1">
                        <div className="font-semibold text-base text-base-content">{homeLocation.name || 'Home'}</div>
                        <div className="text-sm text-base-content/60">
                          {homeLocation.lat.toFixed(4)}°, {homeLocation.lon.toFixed(4)}°
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-outline border-base-content/30 text-base-content hover:bg-base-content/10 w-full"
                        onClick={() => setShowHomeDialog(true)}
                      >
                        Change Location
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-outline border-base-content/30 text-base-content hover:bg-base-content/10 btn-block h-auto py-6 flex-col gap-2"
                      onClick={() => setShowHomeDialog(true)}
                    >
                      <span className="text-2xl">📍</span>
                      <span className="text-base-content">Set Home Location</span>
                    </button>
                  )}
                </div>

                {/* Fishing Location */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-base-content/70 flex items-center gap-2">
                    🎣 Fishing Location
                  </h3>
                  {coastalLocation ? (
                    <div className="border border-base-300 rounded-lg p-4 space-y-3 bg-base-100">
                      <div className="space-y-1">
                        <div className="font-semibold text-base text-base-content">{coastalLocation.name || 'Fishing Spot'}</div>
                        <div className="text-sm text-base-content/60">
                          {coastalLocation.lat.toFixed(4)}°, {coastalLocation.lon.toFixed(4)}°
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-outline border-base-content/30 text-base-content hover:bg-base-content/10 w-full"
                        onClick={() => setShowFishingDialog(true)}
                      >
                        Change Location
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-outline border-base-content/30 text-base-content hover:bg-base-content/10 btn-block h-auto py-6 flex-col gap-2"
                      onClick={() => setShowFishingDialog(true)}
                    >
                      <span className="text-2xl">📍</span>
                      <span className="text-base-content">Set Fishing Location</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Favourite Species */}
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <div>
                    <h2 className="card-title text-base-content">Favourite Species</h2>
                    <p className="text-sm text-base-content/70">Add or remove species so alerts stay focused</p>
                  </div>
                </div>
                <div className="badge badge-primary badge-outline">
                  {favouriteCount} species
                </div>
              </div>

              {favouriteItems.length ? (
                <div className="flex flex-wrap gap-2">
                  {favouriteItems.map((fav) => (
                    <span
                      key={fav.code}
                      className="badge badge-lg gap-2 bg-base-200 text-base-content border border-base-300"
                    >
                      <span>{fav.label}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4"
                        onClick={() => handleRemoveFavouriteChip(fav.code, fav.label)}
                        aria-label={`Remove ${fav.label}`}
                        disabled={pendingRemoveCode === fav.code}
                      >
                        {pendingRemoveCode === fav.code ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          '×'
                        )}
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-base-300 rounded-lg p-4 text-sm text-base-content/70">
                  No favourite species yet. Add a few below to personalise your alerts.
                </div>
              )}

              <div className="divider my-0" />

              <div className="space-y-3 border border-base-300 rounded-xl p-4 bg-base-200/40">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-base-content">Add from your home water</p>
                    <p className="text-sm text-base-content/70">
                      We pull regional staples for {homeLocation?.name || 'your saved home location'}
                      {regionalSuggestionsRegionId ? ` (${regionalSuggestionsRegionId})` : ''}.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => refreshRegionalSuggestions()}
                    disabled={!hasRegionalSuggestions || regionalSuggestionsLoading}
                  >
                    {regionalSuggestionsLoading ? 'Refreshing…' : 'Refresh list'}
                  </button>
                </div>

                {!homeLocation ? (
                  <p className="text-sm text-base-content/70">
                    Set a home location above to unlock quick-add suggestions.
                  </p>
                ) : !hasRegionalSuggestions ? (
                  <p className="text-sm text-base-content/70">
                    We need an ICES rectangle for {homeLocation.name}. Update the location using the button above so we can
                    suggest species from the correct home waters.
                  </p>
                ) : regionalSuggestionsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-base-content/70">
                    <span className="loading loading-spinner loading-sm" />
                    Loading regional species…
                  </div>
                ) : availableRegionalSuggestions.length ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availableRegionalSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.code}
                          className="rounded-lg border border-base-300 bg-base-100/70 p-3 space-y-2 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-base-content">{suggestion.label}</p>
                              {suggestion.scientificName && (
                                <p className="text-xs text-base-content/60 italic">{suggestion.scientificName}</p>
                              )}
                            </div>
                            {suggestion.source === 'global-fallback' && (
                              <span className="badge badge-outline badge-xs text-[10px]">Global staple</span>
                            )}
                          </div>
                          {suggestion.source === 'global-fallback' ? (
                            <p className="text-xs text-base-content/60">
                              {suggestion.originNote || GLOBAL_FALLBACK_NOTE}
                            </p>
                          ) : (
                            <p className="text-xs text-base-content/60">
                              Availability score {suggestion.availabilityScore.toFixed(2)} · Confidence {Math.round(suggestion.confidence)}%
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary flex-1"
                              onClick={() => handleAddFavouriteFromSuggestion(suggestion.code, suggestion.label)}
                              disabled={pendingAddCode === suggestion.code}
                            >
                              {pendingAddCode === suggestion.code ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                'Add'
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost text-base-content/70"
                              onClick={() => handleDismissSuggestion(suggestion.code, suggestion.label)}
                              disabled={pendingDismissCode === suggestion.code}
                            >
                              {pendingDismissCode === suggestion.code ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                'Dismiss'
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasGlobalFallbacks && (
                      <p className="text-xs text-base-content/60">
                        We topped up the list with Findr staples while your region is quiet. Tap refresh later to see new local
                        action as it arrives.
                      </p>
                    )}
                    {!regionalSuggestionsLoading &&
                      !canRequestMoreRegionalSuggestions &&
                      availableRegionalSuggestions.length < MAX_REGIONAL_SUGGESTIONS && (
                        <p className="text-xs text-base-content/60">
                          That&apos;s everything we have for this region right now. We&apos;ll surface more once new data lands.
                        </p>
                      )}
                  </div>
                ) : (
                  <p className="text-sm text-base-content/70">
                    All suggested species for this region are already in your favourites. Great work!
                  </p>
                )}

                {regionalSuggestionsError && (
                  <p className="text-sm text-error">{regionalSuggestionsError}</p>
                )}

                <p className="text-xs text-base-content/60">
                  Need more control? You can also{' '}
                  <Link href="/findr/favourites" className="link link-primary">
                    manage your favourites
                  </Link>{' '}
                  from the dedicated page.
                </p>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="card bg-base-100 shadow-sm">
            <div className="card-body space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔐</span>
                <div>
                  <h2 className="card-title text-base-content">Security</h2>
                  <p className="text-sm text-base-content/70 -mt-1">Update your password</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="form-control">
                  <span className="label-text text-base-content">New password</span>
                  <div className="join w-full">
                    <input
                      className="input input-bordered join-item w-full text-base-content placeholder:text-base-content/50"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="btn join-item text-base-content"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div className="form-control">
                  <span className="label-text text-base-content">Confirm new password</span>
                  <input
                    className="input input-bordered text-base-content placeholder:text-base-content/50"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePasswordChange}
                disabled={passwordBusy || !newPassword || !confirmPassword}
              >
                {passwordBusy ? (
                  <>
                    <span className="loading loading-dots" /> Updating...
                  </>
                ) : (
                  'Update password'
                )}
              </button>

              {passwordMessage && (
                <div className={`text-sm ${passwordMessage.type === 'error' ? 'text-error' : 'text-success'}`}>
                  {passwordMessage.text}
                </div>
              )}
            </div>
          </section>

          {/* Save Button */}
          <div className="card bg-base-100 shadow-sm border-2 border-primary">
            <div className="card-body">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <p className="font-semibold">Ready to save your changes?</p>
                  <p className="text-sm text-base-content/70">Your settings will be updated immediately</p>
                </div>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                >
                  {saving ? (
                    <>
                      <span className="loading loading-spinner" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Location Dialogs */}
        <CoastalLocationDialog
          open={showHomeDialog}
          onClose={() => setShowHomeDialog(false)}
          title="Set your home location"
          onSave={async (loc: BasicLocation) => {
            try {
              await updateLocationBySlot({
                slot: 'home',
                coordinates: { lat: loc.lat, lon: loc.lon },
                name: loc.name,
                resolveRectangle: true,
                makeActive: true,
              });
              setShowHomeDialog(false);
              setMessage({ type: 'success', text: 'Home location saved!' });
            } catch (error) {
              console.error('[Settings] Failed to save home location', error);
              setMessage({ type: 'error', text: 'Failed to save home location. Please try again.' });
            }
          }}
          homeLocation={
            homeLocation
              ? {
                  name: homeLocation.name || 'Home',
                  lat: homeLocation.lat,
                  lon: homeLocation.lon,
                  type: 'home',
                }
              : undefined
          }
        />

        <CoastalLocationDialog
          open={showFishingDialog}
          onClose={() => setShowFishingDialog(false)}
          title="Set your fishing location"
          onSave={async (loc: BasicLocation) => {
            try {
              await updateLocationBySlot({
                slot: 'coastal',
                coordinates: { lat: loc.lat, lon: loc.lon },
                name: loc.name,
                resolveRectangle: true,
              });
              setShowFishingDialog(false);
              setMessage({ type: 'success', text: 'Fishing location saved!' });
            } catch (error) {
              console.error('[Settings] Failed to save fishing location', error);
              setMessage({ type: 'error', text: 'Failed to save fishing location. Please try again.' });
            }
          }}
          homeLocation={
            homeLocation
              ? {
                  name: homeLocation.name || 'Home',
                  lat: homeLocation.lat,
                  lon: homeLocation.lon,
                  type: 'home',
                }
              : undefined
          }
          coastalLocation={
            coastalLocation
              ? {
                  name: coastalLocation.name || 'Fishing Spot',
                  lat: coastalLocation.lat,
                  lon: coastalLocation.lon,
                  type: 'coastal',
                }
              : undefined
          }
        />
      <FindrFooter />
    </>
  );
}

interface RegionalSpeciesSuggestion {
  code: string;
  label: string;
  scientificName: string | null;
  availabilityScore: number;
  confidence: number;
  source: 'regional' | 'global-fallback';
  originNote?: string;
}

interface RegionalSpeciesApiRow {
  code?: string;
  id?: string;
  commonName?: string;
  scientificName?: string | null;
  availabilityScore?: number | string;
  confidence?: number | string;
}

function useRegionalSpeciesSuggestions(homeLocation: SavedLocation | null) {
  const rectangleCode = homeLocation?.rectangleCode?.trim().toUpperCase() || null;
  const [suggestions, setSuggestions] = useState<RegionalSpeciesSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [currentMinScore, setCurrentMinScore] = useState(REGIONAL_DEFAULT_MIN_SCORE);
  const [exhausted, setExhausted] = useState(false);

  type FetchMode = 'replace' | 'merge';
  interface FetchOptions {
    minScore?: number;
    mode?: FetchMode;
  }

  const clampMinScore = (value: number) => {
    return Number(Math.max(REGIONAL_MIN_SCORE_FLOOR, Math.min(REGIONAL_DEFAULT_MIN_SCORE, value)).toFixed(2));
  };

  const fetchSuggestions = useCallback(async (options: FetchOptions = {}) => {
    if (!rectangleCode) {
      setSuggestions([]);
      setError(null);
      setRegionId(null);
      setLoading(false);
      setCurrentMinScore(REGIONAL_DEFAULT_MIN_SCORE);
      setExhausted(false);
      return;
    }

    const mode: FetchMode = options.mode ?? 'replace';
    const targetMinScore = clampMinScore(
      typeof options.minScore === 'number' ? options.minScore : REGIONAL_DEFAULT_MIN_SCORE
    );

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        icesSquare: rectangleCode,
        minScore: targetMinScore.toFixed(2),
        minResults: REGIONAL_FETCH_MIN_RESULTS.toString(),
      });

      const response = await fetch(`/api/findr/species/regional?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch species (${response.status})`);
      }

      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to load regional species');
      }

      const rows: RegionalSpeciesSuggestion[] = Array.isArray(data.species)
        ? (data.species as RegionalSpeciesApiRow[])
            .map<RegionalSpeciesSuggestion>((item) => ({
              code: (item.code || item.id || '').toString().trim().toUpperCase(),
              label: item.commonName || item.code || 'Unnamed species',
              scientificName: item.scientificName || null,
              availabilityScore: Number(item.availabilityScore) || 0,
              confidence: Number(item.confidence) || 0,
              source: 'regional',
            }))
            .filter((item): item is RegionalSpeciesSuggestion => Boolean(item.code))
        : [];

      let newlyAdded = 0;
      setSuggestions((prev) => {
        const base = mode === 'merge' ? prev : [];
        const map = new Map(base.map((item) => [item.code, item]));
        newlyAdded = 0;

        rows.forEach((item) => {
          const existing = map.get(item.code);
          if (!existing) {
            newlyAdded++;
            map.set(item.code, item);
            return;
          }

          if (
            item.availabilityScore > existing.availabilityScore ||
            (item.availabilityScore === existing.availabilityScore && item.confidence > existing.confidence)
          ) {
            map.set(item.code, item);
          }
        });

        const merged = Array.from(map.values()).sort((a, b) => {
          if (b.availabilityScore !== a.availabilityScore) {
            return b.availabilityScore - a.availabilityScore;
          }
          if (b.confidence !== a.confidence) {
            return b.confidence - a.confidence;
          }
          return a.code.localeCompare(b.code);
        });

        return merged;
      });

      setRegionId(data.regionId || rectangleCode);
      setCurrentMinScore(targetMinScore);
      if (targetMinScore <= REGIONAL_MIN_SCORE_FLOOR + 1e-6) {
        setExhausted(newlyAdded === 0);
      } else {
        setExhausted(false);
      }
    } catch (err) {
      console.error('[settings] Regional species fetch failed', err);
      setError(err instanceof Error ? err.message : 'Failed to load regional species');
      setSuggestions([]);
      setRegionId(rectangleCode);
    } finally {
      setLoading(false);
    }
  }, [rectangleCode]);

  useEffect(() => {
    if (!rectangleCode) {
      setSuggestions([]);
      setError(null);
      setRegionId(null);
      setLoading(false);
      setCurrentMinScore(REGIONAL_DEFAULT_MIN_SCORE);
      setExhausted(false);
      return;
    }

    setSuggestions([]);
    setRegionId(null);
    setError(null);
    setExhausted(false);
    void fetchSuggestions({ mode: 'replace', minScore: REGIONAL_DEFAULT_MIN_SCORE });
  }, [rectangleCode, fetchSuggestions]);

  const refreshRegionalSuggestions = useCallback(async () => {
    await fetchSuggestions({ mode: 'replace', minScore: REGIONAL_DEFAULT_MIN_SCORE });
  }, [fetchSuggestions]);

  const requestMoreRegionalSuggestions = useCallback(async () => {
    if (!rectangleCode) return;
    if (loading) return;
    if (exhausted) return;

    const nextMinScore = clampMinScore(currentMinScore - REGIONAL_MIN_SCORE_STEP);
    if (nextMinScore === currentMinScore) {
      setExhausted(true);
      return;
    }

    await fetchSuggestions({ mode: 'merge', minScore: nextMinScore });
  }, [rectangleCode, loading, exhausted, currentMinScore, fetchSuggestions]);

  const canRequestMore = Boolean(rectangleCode) && !exhausted && currentMinScore > REGIONAL_MIN_SCORE_FLOOR + 1e-6;

  return {
    suggestions,
    loading,
    error,
    regionId,
    refresh: refreshRegionalSuggestions,
    canSuggest: Boolean(rectangleCode),
    requestMore: requestMoreRegionalSuggestions,
    canRequestMore,
    currentMinScore,
  };
}
