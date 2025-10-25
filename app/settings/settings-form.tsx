'use client';
import { ACTIVITY_OPTIONS, ACTIVITY_NAME_MAP } from '../../data/activityTypes';
import { rankRecommendations, idToLabel } from './recommendations';
import CoastalLocationDialog, { BasicLocation } from '../../components/CoastalLocationDialog';

declare global {
  // Optional runtime-provided activity map (e.g. injected on window in demos)
  // We type it explicitly to avoid `any`.
  var __ACTIVITY_NAME_MAP__: { id: string; name: string }[] | undefined;
}
const __ACTIVITY_OPTIONS_FALLBACK: { id: string; name: string }[] =
  Array.isArray(globalThis?.__ACTIVITY_NAME_MAP__)
    ? globalThis.__ACTIVITY_NAME_MAP__!
    : [];
const OPTIONS = (typeof ACTIVITY_OPTIONS !== 'undefined' && Array.isArray(ACTIVITY_OPTIONS)) ? ACTIVITY_OPTIONS : __ACTIVITY_OPTIONS_FALLBACK;
const NAME_MAP: Record<string, string> = (typeof ACTIVITY_NAME_MAP !== 'undefined') ? ACTIVITY_NAME_MAP : Object.fromEntries(OPTIONS.map(o => [o.id, o.name]));

function normalise(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function findActivityId(input: string): string | null {
  if (!input) return null;
  const raw = input.trim();
  // Exact id match
  if (NAME_MAP[raw]) return raw;
  // Exact name match (case-insensitive)
  const n = normalise(raw);
  for (const opt of OPTIONS) {
    if (normalise(opt.name) === n) return opt.id;
  }
  // Loose startsWith match on name
  const m = OPTIONS.find(opt => normalise(opt.name).startsWith(n));
  if (m) return m.id;
  return null;
}
function activityLabel(id: string): string {
  return NAME_MAP[id] || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function writeDeviceProfileCache(current: Profile, patch: Partial<Profile>) {
  try {
    const nowIso = new Date().toISOString();
    const merged: Profile = {
      ...current,
      ...patch,
      preferences_json: {
        ...((current.preferences_json as object) || {}),
        ...(typeof patch.preferences_json === 'object' && patch.preferences_json ? patch.preferences_json as object : {}),
        // bump a device-side lastUpdated so Settings will prefer device on next load
        lastUpdated: nowIso,
      },
    } as Profile;
    localStorage.setItem(LS_KEY, JSON.stringify(merged));
  } catch {/* ignore */}
}
import { useEffect, useMemo, useRef, useState } from 'react';
// import dynamic from 'next/dynamic';
// import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { supabase } from '../../lib/supabase/client';
import { useUserPreferences } from '../../context/UserPreferencesContext';

// const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

const DEFAULT_HOME_NAME = 'Home';
const DEFAULT_COAST_NAME = 'Coastal';

// JSON-like type for preferences
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

type PreferencesMap = { [key: string]: Json };

type Profile = {
  name: string | null;
  email: string | null;
  home_lat: number | null;
  home_lon: number | null;
  coast_lat: number | null;
  coast_lon: number | null;
  activities: string[] | null;
  preferences_json: { [key: string]: Json } | null;
  updated_at?: string | null;
};

type SettingsFormProps = { initial: Profile | null };

/** Local storage key for Go Daisy profile cache */
const LS_KEY = 'godaisy.profile';
/** Local storage key for dismissed recommendations */
const RECO_DISMISSED_LS = 'godaisy.reco.dismissed';

/** Parse an ISO date safely and return epoch ms (0 if invalid) */
function ts(value?: string | null): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

/** Safely extract lastUpdated ISO string from a preferences_json blob */
function getPrefsLastUpdated(
  prefs: Profile | (Profile & { lastUpdated?: string }) | null | undefined
): string | undefined {
  const pj = prefs?.preferences_json as { lastUpdated?: Json } | null | undefined;
  const v = pj?.lastUpdated;
  return typeof v === 'string' ? v : undefined;
}


function getSpotNames(prefs: Profile | null | undefined) {
  const pj = (prefs?.preferences_json || {}) as Record<string, Json>;
  const home_name = (pj['home_name'] as string) || DEFAULT_HOME_NAME;
  const coast_name = (pj['coast_name'] as string) || DEFAULT_COAST_NAME;
  return { home_name, coast_name };
}
function setSpotNames(prefs: Record<string, Json> | null | undefined, home_name: string, coast_name: string) {
  return { ...(prefs || {}), home_name, coast_name };
}

function toFirstName(name?: string | null): string {
  const first = (name ?? '').trim().split(/\s+/)[0];
  if (!first) return '';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

// Promise timeout helper so UI can't get stuck forever
async function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return await Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`Timed out after ${ms}ms`)), ms)),
  ]);
}

// Lightweight debug logger — enable by `localStorage.setItem('godaisy.debug', '1')`
function dbgEnabled(): boolean {
  try {
    // Allow a window flag too: window.__GODAISY_DEBUG__ = true
    const winFlag = typeof window !== 'undefined'
      ? (('__GODAISY_DEBUG__' in window)
          ? (window as unknown as { __GODAISY_DEBUG__?: boolean }).__GODAISY_DEBUG__
          : undefined)
      : undefined;
    const ls = typeof localStorage !== 'undefined' && localStorage.getItem('godaisy.debug') === '1';
    return Boolean(winFlag || ls);
  } catch {
    return false;
  }
}
function dbg(...args: unknown[]) {
  if (dbgEnabled()) {
    console.debug('[settings/security]', ...args);
  }
}



export default function SettingsForm({ initial }: SettingsFormProps) {
  const [p, setP] = useState<Profile>(
    initial ?? {
      name: '',
      email: null,
      home_lat: null,
      home_lon: null,
      coast_lat: null,
      coast_lon: null,
      activities: [],
      preferences_json: {},
      updated_at: null,
    }
  );

  const { preferences, setPreferences } = useUserPreferences();

  // Track unsaved changes and intercept navigation
  const [isDirty, setIsDirty] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);


  const [_saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [_source, setSource] = useState<'server' | 'device'>('server');

  const [homeName, setHomeName] = useState(getSpotNames(p).home_name);
  const [coastName, setCoastName] = useState(getSpotNames(p).coast_name);

  // Location dialog state
  const [showHomeLocationDialog, setShowHomeLocationDialog] = useState(false);
  const [showCoastalLocationDialog, setShowCoastalLocationDialog] = useState(false);

  // Auth display + password update state
  const [emailDisplay, setEmailDisplay] = useState<string | null>(p.email ?? null);
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  // Track if user actually interacted with password fields to avoid autofill noise
  const [pwTouched, setPwTouched] = useState(false);

  // Dismissed recommendation handling
  const [dismissedRecos, setDismissedRecos] = useState<Set<string>>(new Set());
  function persistDismissed(next: Set<string>) {
    try { localStorage.setItem(RECO_DISMISSED_LS, JSON.stringify([...next])); } catch { /* ignore */ }
  }
  function dismissSuggestion(id: string) {
    setDismissedRecos(prev => {
      const next = new Set(prev);
      next.add(id);
      persistDismissed(next);
      return next;
    });
  }

  // Baselines to detect per-section changes
  const [baselineName, setBaselineName] = useState<string>(initial?.name ?? '');
  const [baselineActivities, setBaselineActivities] = useState<string[]>(
    Array.isArray(initial?.activities) ? [...(initial!.activities as string[])] : []
  );
  const [baselineHome, setBaselineHome] = useState<{lat: number|null, lon: number|null, name: string}>(
    { lat: initial?.home_lat ?? null, lon: initial?.home_lon ?? null, name: getSpotNames(initial).home_name }
  );
  const [baselineCoast, setBaselineCoast] = useState<{lat: number|null, lon: number|null, name: string}>(
    { lat: initial?.coast_lat ?? null, lon: initial?.coast_lon ?? null, name: getSpotNames(initial).coast_name }
  );
  const [hydrated, setHydrated] = useState(false);

  // Derived dirtiness
  const dirtyBasics = (p.name ?? '') !== baselineName;
  const dirtyInterests = (() => {
    const a = new Set(p.activities ?? []);
    const b = new Set(baselineActivities);
    if (a.size !== b.size) return true;
    for (const x of a) if (!b.has(x)) return true;
    return false;
  })();
  const dirtyLocations = (
    p.home_lat !== baselineHome.lat ||
    p.home_lon !== baselineHome.lon ||
    homeName !== baselineHome.name ||
    p.coast_lat !== baselineCoast.lat ||
    p.coast_lon !== baselineCoast.lon ||
    coastName !== baselineCoast.name
  );


  const [newActivity, setNewActivity] = useState('');
  const activities = useMemo(() => (p.activities ?? []), [p.activities]);
  
  const suggestions = useMemo(() => {
    // Ask for a generous pool, then filter out dismissed and already selected
    const pool = rankRecommendations(activities, { limit: 3 + Math.max(3, dismissedRecos.size) });
    const selectedSet = new Set(activities);
    const filtered = pool.filter(id => !selectedSet.has(id) && !dismissedRecos.has(id));
    return filtered.slice(0, 3);
  }, [activities, dismissedRecos]);

  // Pull device (localStorage) snapshot if present and prefer the most recent
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;

      const device = JSON.parse(raw) as Profile & { lastUpdated?: string };
      const deviceUpdated = ts(getPrefsLastUpdated(device) ?? device.updated_at);

      const serverUpdated = ts(getPrefsLastUpdated(initial ?? null) ?? initial?.updated_at);

      if (deviceUpdated > serverUpdated) {
        setP({
          name: device.name ?? '',
          email: device.email ?? null,
          home_lat: device.home_lat ?? null,
          home_lon: device.home_lon ?? null,
          coast_lat: device.coast_lat ?? null,
          coast_lon: device.coast_lon ?? null,
          activities: device.activities ?? [],
          preferences_json: device.preferences_json ?? {},
          updated_at: device.updated_at ?? new Date(deviceUpdated).toISOString(),
        });
        setBaselineName(device.name ?? '');
        setBaselineActivities(Array.isArray(device.activities) ? [...device.activities] : []);
        setSource('device');
        const dn = getSpotNames(device);
        setHomeName(dn.home_name);
        setCoastName(dn.coast_name);
      } else {
        setSource('server');
        setBaselineName(initial?.name ?? '');
        setBaselineActivities(Array.isArray(initial?.activities) ? [...(initial!.activities as string[])] : []);
        const sn = getSpotNames(initial ?? null);
        setHomeName(sn.home_name);
        setCoastName(sn.coast_name);
      }
      setHydrated(true);
    } catch {
      // ignore JSON errors
    }
    // run only on first mount; use initial as hint
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Load previously dismissed recommendations from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECO_DISMISSED_LS);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) setDismissedRecos(new Set(arr.filter((x: unknown) => typeof x === 'string')));
    } catch { /* ignore */ }
  }, []);
  // Patch helper and global dirty refresh
  async function patchProfile(partial: Partial<Profile>) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      location.href = '/login';
      return;
    }
    const prevUpdatedAt = p.updated_at || null;

    const { data: after, error } = await supabase
      .from('profiles')
      .update(partial)
      .eq('id', user.id)
      .eq('updated_at', prevUpdatedAt)
      .select('updated_at')
      .maybeSingle();

    if (error) {
      setMsg(`🌧️ Something went sideways: ${error.message}`);
      return false;
    }
    if (!after) {
      // Could refetch here; for simplicity, show a gentle hint.
      setMsg('Your data changed elsewhere. Please refresh and try again.');
      return false;
    }

    const updatedAt = after.updated_at as string | null;
    const next = { ...p, ...partial, updated_at: updatedAt || new Date().toISOString() } as Profile;
    setP(next);

    // write to device cache
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch { /* ignore */ }

    setSource('server');
    return true;
  }

  function refreshGlobalDirty() {
    if (!hydrated) { setIsDirty(false); return; }
    const anyDirty = dirtyBasics || dirtyInterests || dirtyLocations || (pwTouched && (!!newPw || !!newPw2));
    setIsDirty(anyDirty);
  }

  useEffect(() => {
    refreshGlobalDirty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyBasics, dirtyInterests, newPw, newPw2, pwTouched, hydrated]);

  // One-time sync from UserPreferences context into the form so UI reflects current interests/locations
  const [didSyncContext, setDidSyncContext] = useState(false);
  useEffect(() => {
    if (didSyncContext) return;
    if (!preferences) return;

    const home = preferences.locations.find(l => l.type === 'home') || preferences.locations[0];
    const coastal = preferences.locations.find(l => l.type === 'coastal');

    setHomeName(home?.name || DEFAULT_HOME_NAME);
    setCoastName(coastal?.name || DEFAULT_COAST_NAME);

    setP(prev => ({
      ...prev,
      home_lat: home?.lat ?? prev.home_lat,
      home_lon: home?.lon ?? prev.home_lon,
      coast_lat: coastal?.lat ?? prev.coast_lat,
      coast_lon: coastal?.lon ?? prev.coast_lon,
      activities: Array.isArray(preferences.interests) ? [...preferences.interests] : prev.activities,
    }));

    if (!hydrated) {
      if (Array.isArray(preferences.interests)) {
        setBaselineActivities([...(preferences.interests as string[])]);
      }
      setHydrated(true);
    }

    setDidSyncContext(true);
  }, [preferences, didSyncContext, hydrated]);

  // Subscribe to realtime changes for this user's profile and refresh form if changed elsewhere
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('profiles-self')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        }, async () => {
          const { data: fresh } = await supabase
            .from('profiles')
            .select('name,email,home_lat,home_lon,coast_lat,coast_lon,activities,preferences_json,updated_at')
            .eq('id', user.id)
            .single();
          if (fresh) {
            setP(fresh as Profile);
            const { home_name, coast_name } = getSpotNames(fresh as Profile);
            setHomeName(home_name);
            setCoastName(coast_name);
            setSource('server');
          }
        })
        .subscribe();
    })();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  // Load current authenticated user's email for display
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const em = user?.email ?? null;
        if (em) {
          setEmailDisplay(em);
          // Only write into profile state if it is missing or different
          setP(prev => (prev.email === em ? prev : { ...prev, email: em }));
        }
      } catch { /* ignore */ }
    })();
  }, [p.email]);

  // Warn when leaving the page with unsaved changes (browser close/refresh)
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // Intercept in-app link clicks within the settings page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onClick = (evt: MouseEvent) => {
      if (!isDirty) return;
      const target = evt.target as HTMLElement | null;
      const anchor = target?.closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return;
      const ok = window.confirm('You have unsaved changes. Leave without saving?');
      if (!ok) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [isDirty]);

  // A friendly, Go Daisy–style heading blurb derived from user name
  const greeting = useMemo(() => {
    const first = toFirstName(p.name);
    return first ? `Hello ${first} 🌼` : 'Hello 🌼';
  }, [p.name]);

  async function _save() {
    setSaving(true);
    setMsg(null);

    // make sure we have a user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      location.href = '/login';
      return;
    }

    const prevUpdatedAt = p.updated_at || null; // last server ts we saw
    const nowIso = new Date().toISOString();
    const payload = {
      name: p.name,
      home_lat: p.home_lat,
      home_lon: p.home_lon,
      coast_lat: p.coast_lat,
      coast_lon: p.coast_lon,
      activities: p.activities ?? [],
      preferences_json: {
        ...((p.preferences_json as object) || {}),
        ...setSpotNames(p.preferences_json as Record<string, Json>, homeName, coastName),
        lastUpdated: nowIso,
      },
    };

    // Try optimistic update guarded by the last known updated_at
    const { data: after, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .eq('updated_at', prevUpdatedAt)
      .select('updated_at')
      .maybeSingle();

    if (error) {
      setMsg(`🌧️ Something went sideways: ${error.message}`);
      setSaving(false);
      return;
    }

    if (!after) {
      // Stale write: server row changed since we loaded. Refetch and merge.
      const { data: fresh, error: refetchErr } = await supabase
        .from('profiles')
        .select('name,email,home_lat,home_lon,coast_lat,coast_lon,activities,preferences_json,updated_at')
        .eq('id', user.id)
        .single();

      if (refetchErr || !fresh) {
        setMsg('We couldn’t save because your data changed elsewhere. Please try again.');
        setSaving(false);
        return;
      }

      // Merge strategy: activities = union; coordinates = prefer newer server if present, otherwise keep local; names keep current UI
      const mergedActivities = Array.from(new Set([...(fresh.activities ?? []), ...(p.activities ?? [])]));

        const merged: Profile = {
          ...(fresh as Profile),
          activities: mergedActivities,
          // keep spot names in preferences_json from current UI
          preferences_json: setSpotNames((fresh.preferences_json as PreferencesMap) || {}, homeName, coastName),
        };

      setP(merged);
      const spots = getSpotNames(merged);
      setHomeName(spots.home_name);
      setCoastName(spots.coast_name);

      setMsg('Your settings were updated in another session. We refreshed your latest data — please review and Save again.');
      setSaving(false);
      setSource('server');
      return;
    }

    // Success: update local state + localStorage
    const nextUpdatedAt = after.updated_at as string | null;

    // Update app-wide preferences context so the rest of the app is in sync immediately
    try {
      setPreferences(prev => {
        const others = prev.locations.filter(l => l.type !== 'home' && l.type !== 'coastal');
        const nextHome = {
          name: homeName || DEFAULT_HOME_NAME,
          lat: p.home_lat ?? (prev.locations.find(l => l.type === 'home')?.lat ?? 0),
          lon: p.home_lon ?? (prev.locations.find(l => l.type === 'home')?.lon ?? 0),
          type: 'home' as const,
        };
        const nextCoastal = (p.coast_lat != null && p.coast_lon != null) || prev.locations.find(l => l.type === 'coastal')
          ? {
              name: coastName || DEFAULT_COAST_NAME,
              lat: p.coast_lat ?? (prev.locations.find(l => l.type === 'coastal')?.lat ?? 0),
              lon: p.coast_lon ?? (prev.locations.find(l => l.type === 'coastal')?.lon ?? 0),
              type: 'coastal' as const,
            }
          : undefined;

        return {
          ...prev,
          locations: nextCoastal ? [nextHome, nextCoastal, ...others] : [nextHome, ...others],
          interests: Array.isArray(p.activities) ? [...p.activities] : prev.interests,
        };
      });
    } catch { /* ignore */ }

    // Save to device cache too (for offline + first-load merge)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        ...p,
        ...payload,
        preferences_json: payload.preferences_json,
        updated_at: nextUpdatedAt || nowIso,
      }));
    } catch { /* ignore */ }

    setP(prev => ({ ...prev, updated_at: nextUpdatedAt || nowIso }));
    setMsg('Saved ✓');
    setSaving(false);
    setSource('server');
    setIsDirty(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    location.href = '/login';
  }

  function addActivity(id: string) {
    const set = new Set([...(p.activities || []), id]);
    const next = Array.from(set);
    setP({ ...p, activities: next });
    writeDeviceProfileCache(p, { activities: next });
    setIsDirty(true);
    // Also mark suggestion as consumed so it doesn't reappear
    setDismissedRecos(prev => {
      if (prev.has(id)) return prev;
      const nextSet = new Set(prev); nextSet.add(id); persistDismissed(nextSet); return nextSet;
    });
  }

  function removeActivity(a: string) {
    const next = (p.activities || []).filter(x => x !== a);
    setP({ ...p, activities: next });
    writeDeviceProfileCache(p, { activities: next });
    setIsDirty(true);
  }

  function addActivityFromInput() {
    const raw = newActivity.trim();
    if (!raw) return;
    const id = findActivityId(raw);
    if (!id) {
      setMsg('Please choose a valid activity from the Go Daisy list.');
      return;
    }
    addActivity(id);
    setNewActivity('');
  }

  async function updatePassword() {
    setPwErr(null); setPwMsg(null);
    dbg('updatePassword:start');
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const pw = newPw.trim();
    const pw2 = newPw2.trim();
    dbg('validate:inputs-present', { hasPw: Boolean(pw), hasPw2: Boolean(pw2), len: pw.length });

    // Basic client-side validation first
    if (!pw) { setPwErr('Please enter a new password.'); return; }
    if (pw.length < 8) { setPwErr('Password must be at least 8 characters.'); return; }
    if (pw !== pw2) { setPwErr('Passwords do not match.'); return; }

    // Quick connectivity check to avoid getting stuck on offline browsers
    if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
      dbg('offline-detected');
      setPwErr('You appear to be offline — reconnect and try again.');
      return;
    }

    setPwBusy(true);
    dbg('busy:true');
    try {
      // Ensure session is valid before attempting update
      const { data: sessionData, error: sessErr } = await withTimeout(supabase.auth.getSession(), 8000);
      dbg('session:response', { hasError: Boolean(sessErr), hasSession: Boolean(sessionData?.session) });
      if (sessErr) {
        setPwErr(sessErr.message || 'Could not read session.');
        return;
      }
      const session = sessionData?.session || null;
      if (!session) {
        setPwErr('You need to be signed in to change your password.');
        return;
      }

      // Try update with a hard timeout so UI cannot hang indefinitely
      dbg('supabase.updateUser:call');
      const { error } = await withTimeout(supabase.auth.updateUser({ password: pw }), 15000);
      dbg('supabase.updateUser:response', { hasError: Boolean(error) });
      if (error) {
        // Common Supabase errors: rate limits, password policy, re-auth required
        const msg =
          /rate/i.test(error.message) ? 'Too many attempts — please wait a minute and try again.' :
          /password/i.test(error.message) ? error.message :
          error.message || 'Could not update password.';
        setPwErr(msg);
        return;
      }

      dbg('success');
      setPwMsg('Password updated ✓');
      setNewPw(''); setNewPw2(''); setShowPw(false); setPwTouched(false);
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Unknown error');
      dbg('error', { message: err.message });
      // Timeout or network error — surface a friendly message
      if (/Timed out/.test(err.message)) {
        setPwErr('This is taking longer than expected. It may have timed out — please check your connection and try again.');
      } else {
        setPwErr(err.message || 'Could not update password.');
      }
    } finally {
      const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      dbg('done', { ms: Math.round(t1 - t0) });
      setPwBusy(false);
    }
  }

  // Use catalogue mapping when available
  const getActivityLabel = activityLabel;

  return (
    <main ref={containerRef} className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Header with sign out */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
          <p className="opacity-70 text-sm">Help us personalise your experience and recommendations.</p>
        </div>
        <button className="btn btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </header>

      {hydrated && isDirty && (
        <div className="alert alert-warning">
          <span>You have unsaved changes. Don’t forget to click <strong>Save changes</strong>.</span>
        </div>
      )}

      {/* Name */}
      <section className="card bg-base-100 shadow-sm">
        <div className="card-body space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <div>
              <h2 className="card-title">Personal Details</h2>
              <p className="text-sm opacity-70 -mt-1">Help us personalise your experience and recommendations</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="form-control w-full">
              <span className="label-text">What should we call you?</span>
              <input
                className="input input-bordered w-full"
                placeholder="e.g. Alex"
                value={p.name ?? ''}
                onChange={(e) => { setP({ ...p, name: e.target.value }); setIsDirty(true); }}
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text">Email (account)</span>
              <input
                className="input input-bordered w-full"
                value={emailDisplay ?? ''}
                readOnly
                aria-readonly
                title="Your account email"
              />
            </label>
          </div>
          {/* Inline actions for basics */}
          {dirtyBasics && (
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setP(prev => ({ ...prev, name: baselineName }));
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const ok = await patchProfile({ name: p.name });
                  if (ok) {
                    setBaselineName(p.name ?? '');
                    setMsg('Name saved ✓');
                  }
                }}
              >
                Save
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Locations */}
      <section className="card bg-base-100 shadow-sm">
        <div className="card-body space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <div>
              <h2 className="card-title">Your Locations</h2>
              <p className="text-sm opacity-70 -mt-1">Set your home and favourite coastal locations for better recommendations</p>
            </div>
          </div>

          {/* Locations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Home Location */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold opacity-70 flex items-center gap-2">
                🏠 Home Location
              </h3>
              {p.home_lat && p.home_lon ? (
                <div className="border border-base-300 rounded-lg p-4 space-y-3 bg-base-100">
                  <div className="space-y-1">
                    <div className="font-semibold text-base">{homeName || 'Home'}</div>
                    <div className="text-sm opacity-60">
                      {p.home_lat.toFixed(4)}°, {p.home_lon.toFixed(4)}°
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-outline w-full"
                    onClick={() => setShowHomeLocationDialog(true)}
                  >
                    Change Location
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-outline btn-block h-auto py-6 flex-col gap-2"
                  onClick={() => setShowHomeLocationDialog(true)}
                >
                  <span className="text-2xl">📍</span>
                  <span>Set Home Location</span>
                </button>
              )}
            </div>

            {/* Coastal Location */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold opacity-70 flex items-center gap-2">
                🌊 Coastal Location
              </h3>
              {p.coast_lat && p.coast_lon ? (
                <div className="border border-base-300 rounded-lg p-4 space-y-3 bg-base-100">
                  <div className="space-y-1">
                    <div className="font-semibold text-base">{coastName || 'Coastal'}</div>
                    <div className="text-sm opacity-60">
                      {p.coast_lat.toFixed(4)}°, {p.coast_lon.toFixed(4)}°
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-outline w-full"
                    onClick={() => setShowCoastalLocationDialog(true)}
                  >
                    Change Location
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-outline btn-block h-auto py-6 flex-col gap-2"
                  onClick={() => setShowCoastalLocationDialog(true)}
                >
                  <span className="text-2xl">📍</span>
                  <span>Set Coastal Location</span>
                </button>
              )}
            </div>
          </div>
          {/* Inline actions for locations */}
          {dirtyLocations && (
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setP(prev => ({
                    ...prev,
                    home_lat: baselineHome.lat,
                    home_lon: baselineHome.lon,
                    coast_lat: baselineCoast.lat,
                    coast_lon: baselineCoast.lon,
                  }));
                  setHomeName(baselineHome.name);
                  setCoastName(baselineCoast.name);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const ok = await patchProfile({
                    home_lat: p.home_lat,
                    home_lon: p.home_lon,
                    coast_lat: p.coast_lat,
                    coast_lon: p.coast_lon,
                    preferences_json: setSpotNames(p.preferences_json as Record<string, Json>, homeName, coastName),
                  });
                  if (ok) {
                    setBaselineHome({ lat: p.home_lat, lon: p.home_lon, name: homeName });
                    setBaselineCoast({ lat: p.coast_lat, lon: p.coast_lon, name: coastName });
                    setMsg('Locations saved ✓');
                  }
                }}
              >
                Save
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Interests */}
      <section className="card bg-base-100 shadow-sm">
        <div className="card-body space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <div>
                <h2 className="card-title">Your Interests</h2>
                <p className="text-sm opacity-70">Select activities you enjoy or want to try. We&apos;ll use this to suggest the best days for each activity.</p>
              </div>
            </div>
            <div className="badge badge-primary badge-outline">
              {activities.length} selected
            </div>
          </div>

          {/* Lozenges grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(activities.length ? activities : []).map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => removeActivity(slug)}
                className="btn btn-outline justify-start h-10 normal-case rounded-xl flex items-center gap-2"
                title="Click to remove"
              >
                <span className="text-success">✓</span>
                <span className="truncate">{getActivityLabel(slug)}</span>
              </button>
            ))}
            {!activities.length && (
              <div className="text-sm opacity-60 col-span-full">No activities yet.</div>
            )}
          </div>

          {/* Recommended based on your interests */}
          {suggestions.length > 0 && (
            <div className="mt-1">
              <div className="text-sm opacity-70 mb-2">You might also like</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {suggestions.map((id) => (
                  <div key={id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addActivity(id)}
                      className="btn btn-outline justify-start h-10 normal-case rounded-xl flex items-center gap-2 border-accent text-accent hover:bg-accent/10"
                      title="Add to your interests"
                    >
                      <span className="text-accent">+</span>
                      <span className="truncate">{idToLabel(id)}</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Dismiss suggestion"
                      className="btn btn-ghost btn-xs"
                      onClick={() => dismissSuggestion(id)}
                      title="Not interested"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add activity (progressive disclosure) */}
          <div className="mt-2 rounded-box border border-base-300/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">➕</span>
              <div className="font-medium">Don&apos;t see your favourite activity?</div>
            </div>
            <label className="form-control w-full">
              <span className="label-text">Add an interest</span>
              <div className="flex gap-2">
                <input
                  className="input input-bordered flex-1"
                  placeholder="Type activity name (e.g., Rock climbing, Photography)"
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addActivityFromInput(); } }}
                  list="activities-list"
                />
                <button
                  type="button"
                  className={`btn btn-primary ${newActivity.trim().length > 0 ? '' : 'btn-disabled'}`}
                  onClick={addActivityFromInput}
                >
                  Add
                </button>
              </div>
            </label>
            <datalist id="activities-list">
              {OPTIONS.map(o => (
                <option key={o.id} value={o.name} />
              ))}
            </datalist>
          </div>
          {/* Inline actions for interests */}
          {dirtyInterests && (
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setP(prev => ({ ...prev, activities: [...baselineActivities] }));
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const ok = await patchProfile({ activities: p.activities ?? [] });
                  if (ok) {
                    setBaselineActivities([...(p.activities ?? [])]);
                    setMsg('Interests saved ✓');
                  }
                }}
              >
                Save
              </button>
            </div>
          )}

          {msg && <div className="text-sm opacity-80">{msg}</div>}
        </div>
      </section>

      {/* Security */}
      <section className="card bg-base-100 shadow-sm">
        <div className="card-body space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <div>
              <h2 className="card-title">Security</h2>
              <p className="text-sm opacity-70 -mt-1">Update your password.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="form-control">
              <span className="label-text">New password</span>
              <div className="join w-full">
                <input
                  className="input input-bordered join-item w-full"
                  type={showPw ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  onFocus={() => setPwTouched(true)}
                  autoComplete="new-password"
                  name="new-password"
                />
                <button type="button" className="btn join-item" onClick={() => setShowPw(s => !s)} aria-pressed={showPw}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="form-control">
              <span className="label-text">Confirm new password</span>
              <div className="join w-full">
                <input
                  className="input input-bordered"
                  type={showPw ? 'text' : 'password'}
                  value={newPw2}
                  onChange={(e) => setNewPw2(e.target.value)}
                  onFocus={() => setPwTouched(true)}
                  autoComplete="new-password"
                  name="new-password-confirm"
                />
              </div>
            </div>
            <div className="form-control items-start sm:items-end">
              <button
                type="button"
                className={`btn btn-primary ${pwBusy || !pwTouched || (!newPw && !newPw2) ? 'btn-disabled' : ''}`}
                onClick={updatePassword}
              >
                {pwBusy ? (<><span className="loading loading-dots" aria-hidden="true" /> Updating…</>) : 'Update password'}
              </button>
              {pwTouched && (newPw || newPw2) ? (
                <button
                  type="button"
                  className="btn btn-ghost ml-2"
                  onClick={() => { setNewPw(''); setNewPw2(''); setShowPw(false); setPwTouched(false); }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {(pwErr || pwMsg) && (
            <div className={`text-sm ${pwErr ? 'text-error' : 'text-success'}`}>{pwErr ?? pwMsg}</div>
          )}
        </div>
      </section>

      {/* Delete account */}
      <section className="card bg-base-100 shadow-sm border border-error/30">
        <div className="card-body space-y-3">
          <h2 className="card-title text-error">Danger zone</h2>
          <p className="text-sm opacity-70">Delete your Go Daisy account and data. This cannot be undone.</p>
          <DeleteAccount />
        </div>
      </section>

      {/* Location Dialogs */}
      <CoastalLocationDialog
        open={showHomeLocationDialog}
        onClose={() => setShowHomeLocationDialog(false)}
        title="Set your home location"
        onSave={(loc: BasicLocation) => {
          setP({ ...p, home_lat: loc.lat, home_lon: loc.lon });
          setHomeName(loc.name);
          setIsDirty(true);
          setShowHomeLocationDialog(false);
        }}
        homeLocation={p.home_lat && p.home_lon ? { name: homeName, lat: p.home_lat, lon: p.home_lon, type: 'home' } : undefined}
      />

      <CoastalLocationDialog
        open={showCoastalLocationDialog}
        onClose={() => setShowCoastalLocationDialog(false)}
        title="Set your coastal location"
        onSave={(loc: BasicLocation) => {
          setP({ ...p, coast_lat: loc.lat, coast_lon: loc.lon });
          setCoastName(loc.name);
          setIsDirty(true);
          setShowCoastalLocationDialog(false);
        }}
        homeLocation={p.home_lat && p.home_lon ? { name: homeName, lat: p.home_lat, lon: p.home_lon, type: 'home' } : undefined}
        coastalLocation={p.coast_lat && p.coast_lon ? { name: coastName, lat: p.coast_lat, lon: p.coast_lon, type: 'coastal' } : undefined}
      />

    </main>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function confirmDelete() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to delete account.');
      location.href = '/login';
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to delete account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn btn-outline btn-error" onClick={() => setOpen(true)}>
        Delete account
      </button>

      {open && (
        <dialog open className="modal">
          <div className="modal-box">
            <h3 className="font-semibold text-lg">Are you sure?</h3>
            <p className="py-2 text-sm opacity-80">
              This will permanently remove your Go Daisy account and associated data.
            </p>
            {err && <p className="text-error text-sm">{err}</p>}
            <div className="modal-action">
              <button className="btn" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button className="btn btn-error" onClick={confirmDelete} disabled={busy}>
                {busy ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setOpen(false)}><button>close</button></form>
        </dialog>
      )}
    </>
  );
}