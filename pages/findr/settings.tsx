import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { Mail, TrendingUp, AlertCircle } from 'lucide-react';
import CoastalLocationDialog, { BasicLocation } from '../../components/CoastalLocationDialog';
import { supabase } from '../../lib/supabase/client';
import { useFavourites } from '../../hooks/useFavourites';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import FindrFooter from '../../components/FindrFooter';
import type { FindrUserSettings } from '../api/findr/user-settings';

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
  { id: 'pier', label: 'Pier', icon: '🏗️' },
  { id: 'sandy_beach', label: 'Sandy Beach', icon: '🏖️' },
  { id: 'rocky_shore', label: 'Rocky Shore', icon: '🪨' },
  { id: 'estuary', label: 'Estuary', icon: '🌊' },
  { id: 'deep_sea', label: 'Deep Sea', icon: '⛴️' },
  { id: 'reef', label: 'Reef', icon: '🪸' },
  { id: 'harbour', label: 'Harbour', icon: '⚓' },
  { id: 'river_mouth', label: 'River Mouth', icon: '🌊' },
];

export default function FindrSettingsPage() {
  const router = useRouter();
  const { favourites, user, loading: favLoading } = useFavourites();
  const {
    preferences: notificationPrefs,
    isLoading: notifLoading,
    updatePreferences: updateNotifPrefs,
  } = useNotificationPreferences();

  const [settings, setSettings] = useState<FindrUserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Dialog states
  const [showHomeDialog, setShowHomeDialog] = useState(false);
  const [showFishingDialog, setShowFishingDialog] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings
  const loadSettings = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/findr/user-settings', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success && data.settings) {
        setSettings(data.settings);
      } else {
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
      console.error('Failed to load settings:', error);
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

  // Only fetch settings when user is loaded and not loading
  useEffect(() => {
    if (!favLoading && user) {
      loadSettings();
    }
  }, [user, favLoading, loadSettings]);

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

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/findr/user-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
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
                    className="input input-bordered w-full placeholder:text-base-content/50"
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
                          <h4 className="font-semibold">Hot Bite Alerts</h4>
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
                          <h4 className="font-semibold">Daily Email Digest</h4>
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
                          <h4 className="font-semibold">Weekly Forecast</h4>
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
                  {settings.homeLocation ? (
                    <div className="border border-base-300 rounded-lg p-4 space-y-3 bg-base-100">
                      <div className="space-y-1">
                        <div className="font-semibold text-base text-base-content">{settings.homeLocation.name || 'Home'}</div>
                        <div className="text-sm text-base-content/60">
                          {settings.homeLocation.lat.toFixed(4)}°, {settings.homeLocation.lon.toFixed(4)}°
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
                  {settings.fishingLocation ? (
                    <div className="border border-base-300 rounded-lg p-4 space-y-3 bg-base-100">
                      <div className="space-y-1">
                        <div className="font-semibold text-base text-base-content">{settings.fishingLocation.name || 'Fishing Spot'}</div>
                        <div className="text-sm text-base-content/60">
                          {settings.fishingLocation.lat.toFixed(4)}°, {settings.fishingLocation.lon.toFixed(4)}°
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
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <div>
                    <h2 className="card-title text-base-content">Favourite Species</h2>
                    <p className="text-sm text-base-content/70">Manage your favourite fish to track</p>
                  </div>
                </div>
                <div className="badge badge-primary badge-outline">
                  {favourites.length} species
                </div>
              </div>
              <p className="text-sm text-base-content">
                Add favourite species from the predictions page or{' '}
                <Link href="/findr/favourites" className="link link-primary">
                  manage your favourites
                </Link>
                .
              </p>
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
          onSave={(loc: BasicLocation) => {
            setSettings({
              ...settings,
              homeLocation: { lat: loc.lat, lon: loc.lon, name: loc.name },
            });
            setIsDirty(true);
            setShowHomeDialog(false);
          }}
          homeLocation={
            settings.homeLocation
              ? {
                  name: settings.homeLocation.name || 'Home',
                  lat: settings.homeLocation.lat,
                  lon: settings.homeLocation.lon,
                  type: 'home',
                }
              : undefined
          }
        />

        <CoastalLocationDialog
          open={showFishingDialog}
          onClose={() => setShowFishingDialog(false)}
          title="Set your fishing location"
          onSave={(loc: BasicLocation) => {
            setSettings({
              ...settings,
              fishingLocation: { lat: loc.lat, lon: loc.lon, name: loc.name },
            });
            setIsDirty(true);
            setShowFishingDialog(false);
          }}
          homeLocation={
            settings.homeLocation
              ? {
                  name: settings.homeLocation.name || 'Home',
                  lat: settings.homeLocation.lat,
                  lon: settings.homeLocation.lon,
                  type: 'home',
                }
              : undefined
          }
          coastalLocation={
            settings.fishingLocation
              ? {
                  name: settings.fishingLocation.name || 'Fishing Spot',
                  lat: settings.fishingLocation.lat,
                  lon: settings.fishingLocation.lon,
                  type: 'coastal',
                }
              : undefined
          }
        />
      <FindrFooter />
    </>
  );
}
