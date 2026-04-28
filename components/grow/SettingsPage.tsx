'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { cn } from '../ui/utils';
import { toast } from 'sonner';
import {
  Settings,
  MapPin,
  Globe,
  LogOut,
  Sprout,
  Loader2,
  Save,
  User,
  Leaf,
  Sun,
  Droplets,
  Mountain,
  Sparkles,
  BookOpen,
  RefreshCw,
  Trash2,
  AlertTriangle,
  FileText,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { auth, type AuthUser } from '../../lib/grow/auth';
import { api } from '../../lib/grow/api';
import { buildGrowLoginUrl, GROW_ROOT_PATH } from '../../lib/grow/routes';
import { GrowLocationDialog } from './GrowLocationDialog';
import { GrowLanguageSelector } from './GrowLanguageSelector';
import { NotificationPreferencesCard } from './NotificationPreferencesCard';
import { IntegrationsCard } from './IntegrationsCard';
import { SubscriptionCard } from './SubscriptionCard';
import { PricingOverview } from './PricingOverview';

// Onboarding data structure (mirrors OnboardingFlow.tsx)
interface OnboardingData {
  location?: string;
  gardenFeatures?: string[];
  soilType?: string;
  sunExposure?: string;
  moisture?: string;
  interests?: string[];
  skillLevel?: string;
  contentDepth?: string;
  climateZone?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
}

// Options (same as OnboardingFlow.tsx)
const gardenFeatureOptions = [
  { id: 'lawn', label: 'Lawn', emoji: '🌿' },
  { id: 'veg_plot', label: 'Vegetable Plot', emoji: '🥕' },
  { id: 'greenhouse_heated', label: 'Greenhouse (Heated)', emoji: '🏡' },
  { id: 'greenhouse_unheated', label: 'Greenhouse (Unheated)', emoji: '🌤️' },
  { id: 'containers', label: 'Containers & Pots', emoji: '🪴' },
  { id: 'balcony', label: 'Balcony / Small Space', emoji: '🌇' },
  { id: 'wild_area', label: 'Wild Area', emoji: '🦋' },
  { id: 'orchard', label: 'Orchard / Fruit Trees', emoji: '🍎' },
];

const soilTypeOptions = [
  { id: 'clay', label: 'Clay', emoji: '🧱' },
  { id: 'sandy', label: 'Sandy', emoji: '🏖️' },
  { id: 'loam', label: 'Loam', emoji: '🪨' },
  { id: 'silty', label: 'Silty', emoji: '🌀' },
  { id: 'peaty', label: 'Peaty', emoji: '🍂' },
  { id: 'chalky', label: 'Chalky', emoji: '🪨' },
];

const sunExposureOptions = [
  { id: 'full_sun', label: 'Full Sun (6+ hrs)', emoji: '☀️' },
  { id: 'partial_sun', label: 'Partial Sun (3-6 hrs)', emoji: '⛅' },
  { id: 'shade', label: 'Shade (<3 hrs)', emoji: '🌙' },
];

const moistureOptions = [
  { id: 'dry', label: 'Dry', emoji: '🏜️' },
  { id: 'moist', label: 'Moist', emoji: '💧' },
  { id: 'wet', label: 'Wet', emoji: '🌧️' },
];

const interestOptions = [
  { id: 'flowers', label: 'Flowers', emoji: '🌸' },
  { id: 'lawn_care', label: 'Lawn Care', emoji: '🌿' },
  { id: 'ornamental_trees', label: 'Ornamental Trees', emoji: '🌳' },
  { id: 'fruit_trees', label: 'Fruit Trees', emoji: '🍎' },
  { id: 'vegetables', label: 'Vegetables', emoji: '🥦' },
  { id: 'herbs', label: 'Herbs', emoji: '🌿' },
  { id: 'wildlife', label: 'Wildlife & Pollinators', emoji: '🦋' },
  { id: 'indoor_plants', label: 'Indoor Plants', emoji: '🪴' },
];

const experienceOptions = [
  { id: 'beginner', label: 'Beginner', emoji: '🌱' },
  { id: 'intermediate', label: 'Intermediate', emoji: '🌿' },
  { id: 'advanced', label: 'Advanced', emoji: '🌳' },
];

const contentDepthOptions = [
  { id: 'quick_tips', label: 'Quick Tips', emoji: '⚡' },
  { id: 'detailed_guides', label: 'Detailed Guides', emoji: '📘' },
  { id: 'expert_insights', label: 'Expert Insights', emoji: '🧠' },
];

const STORAGE_KEY = 'userInterests';

export function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [isLookingUpElevation, setIsLookingUpElevation] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Form state
  const [formData, setFormData] = useState<OnboardingData>({
    location: '',
    gardenFeatures: [],
    soilType: '',
    sunExposure: '',
    moisture: '',
    interests: [],
    skillLevel: '',
    contentDepth: '',
  });

  // Track if form has been modified
  const [hasChanges, setHasChanges] = useState(false);

  const redirectToLogin = useCallback(() => {
    const targetUrl = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : GROW_ROOT_PATH;
    router.replace(buildGrowLoginUrl(targetUrl));
  }, [router]);

  // Load user and preferences on mount
  useEffect(() => {
    let isMounted = true;

    const loadUserAndPreferences = async () => {
      try {
        const userData = await auth.getUser();
        if (!isMounted) return;

        if (!userData) {
          redirectToLogin();
          return;
        }

        setUser(userData);

        // Try to load preferences from Supabase first
        let loadedFromSupabase = false;
        try {
          const { preferences } = await api.getGrowPreferences();
          if (preferences && isMounted) {
            setFormData(prev => ({
              ...prev,
              location: preferences.location || '',
              gardenFeatures: preferences.gardenFeatures || [],
              soilType: preferences.soilType || '',
              sunExposure: preferences.sunExposure || '',
              moisture: preferences.moisture || '',
              interests: preferences.interests || [],
              skillLevel: preferences.skillLevel || '',
              contentDepth: preferences.contentDepth || '',
              climateZone: preferences.climateZone || undefined,
              latitude: preferences.latitude || undefined,
              longitude: preferences.longitude || undefined,
              elevation: preferences.elevation || undefined,
            }));
            loadedFromSupabase = true;
            console.log('[Settings] Loaded preferences from Supabase');
          }
        } catch (e) {
          console.warn('[Settings] Could not load from Supabase, falling back to localStorage:', e);
        }

        // Fall back to localStorage if Supabase didn't have preferences
        if (!loadedFromSupabase) {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as OnboardingData;
              if (isMounted) {
                setFormData(prev => ({
                  ...prev,
                  location: parsed.location || '',
                  gardenFeatures: parsed.gardenFeatures || [],
                  soilType: parsed.soilType || '',
                  sunExposure: parsed.sunExposure || '',
                  moisture: parsed.moisture || '',
                  interests: parsed.interests || [],
                  skillLevel: parsed.skillLevel || '',
                  contentDepth: parsed.contentDepth || '',
                  climateZone: parsed.climateZone,
                  latitude: parsed.latitude,
                  longitude: parsed.longitude,
                  elevation: parsed.elevation,
                }));
                console.log('[Settings] Loaded preferences from localStorage');
              }
            } catch (e) {
              console.warn('Failed to parse stored preferences:', e);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        if (isMounted) {
          redirectToLogin();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUserAndPreferences();

    return () => {
      isMounted = false;
    };
  }, [redirectToLogin]);

  // Handle form field changes
  const updateField = <K extends keyof OnboardingData>(
    field: K,
    value: OnboardingData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Toggle array field (for checkboxes)
  const toggleArrayField = (field: 'gardenFeatures' | 'interests', id: string) => {
    setFormData(prev => {
      const current = prev[field] || [];
      const updated = current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id];
      return { ...prev, [field]: updated };
    });
    setHasChanges(true);
  };

  // Handle location update - also auto-fetch elevation
  const handleLocationSave = async (location: { name: string; lat: number; lon: number }) => {
    setFormData(prev => ({
      ...prev,
      location: location.name,
      latitude: location.lat,
      longitude: location.lon,
    }));
    setHasChanges(true);
    setShowLocationDialog(false);
    toast.success('Location updated');

    // Auto-fetch elevation for the new location
    setIsLookingUpElevation(true);
    try {
      const response = await fetch(
        `/api/grow/elevation?lat=${location.lat}&lon=${location.lon}`
      );
      const data = await response.json();

      if (response.ok && !data.error && data.elevation != null) {
        setFormData(prev => ({ ...prev, elevation: data.elevation }));
        toast.success(`Elevation: ${data.elevation}m`);
      }
    } catch (error) {
      console.warn('Auto elevation lookup failed:', error);
      // Silently fail - user can manually look up later
    } finally {
      setIsLookingUpElevation(false);
    }
  };

  // Handle elevation lookup
  const handleElevationLookup = async () => {
    if (!formData.latitude || !formData.longitude) {
      toast.error('Set a location first to look up elevation');
      return;
    }

    setIsLookingUpElevation(true);
    try {
      const response = await fetch(
        `/api/grow/elevation?lat=${formData.latitude}&lon=${formData.longitude}`
      );
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch elevation');
      }

      updateField('elevation', data.elevation);
      toast.success(`Elevation: ${data.elevation}m`);
    } catch (error) {
      console.error('Elevation lookup failed:', error);
      toast.error('Could not look up elevation');
    } finally {
      setIsLookingUpElevation(false);
    }
  };

  // Save preferences
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage (as backup/cache)
      const existingData = localStorage.getItem(STORAGE_KEY);
      const existing = existingData ? JSON.parse(existingData) : {};
      const merged = { ...existing, ...formData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

      // Save to Supabase (primary storage)
      try {
        await api.saveGrowPreferences(formData as Record<string, unknown>);
        console.log('[Settings] Saved preferences to Supabase');
      } catch (e) {
        console.warn('Could not sync preferences to Supabase:', e);
        // Continue anyway - localStorage has the data
      }

      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push('/grow');
    } catch (error) {
      console.error('Failed to sign out:', error);
      toast.error('Failed to sign out');
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');

      // Clear local storage
      localStorage.clear();

      // Sign out and redirect
      await auth.signOut();
      router.push('/grow');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Settings className="h-6 w-6 text-green-600" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your garden profile and preferences
          </p>
        </div>
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">{user?.name || 'User'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <Separator />

          {/* Delete Account */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-600">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowDeleteDialog(false)}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-slate-900 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete Account
              </CardTitle>
              <CardDescription>
                This action cannot be undone. All your data will be permanently deleted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Your account and profile</li>
                  <li>All garden preferences</li>
                  <li>All saved plants and data</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-confirm">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </Label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscription Section */}
      <SubscriptionCard />

      {/* Pricing Overview */}
      <PricingOverview />

      {/* Location Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Garden Location
          </CardTitle>
          <CardDescription>
            Your location helps us provide accurate weather and planting recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              {formData.location ? (
                <>
                  <p className="font-medium">{formData.location}</p>
                  <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                    {formData.climateZone && (
                      <span>Climate: {formData.climateZone.replace(/_/g, ' ')}</span>
                    )}
                    <span>
                      Elevation: {formData.elevation != null ? `${formData.elevation}m` : 'Not set'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No location set</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowLocationDialog(true)}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {formData.location ? 'Change' : 'Set Location'}
              </Button>
              {formData.latitude && formData.longitude && (
                <Button
                  variant="outline"
                  onClick={handleElevationLookup}
                  disabled={isLookingUpElevation}
                >
                  {isLookingUpElevation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Mountain className="h-4 w-4 mr-2" />
                      Elevation
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            Language
            <Badge variant="secondary" className="ml-2 text-xs">🌱 Beta</Badge>
          </CardTitle>
          <CardDescription>
            Choose your preferred language for the app interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Some content may not be fully translated yet
            </p>
            <GrowLanguageSelector buttonVariant="outline" />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences Section */}
      <NotificationPreferencesCard />

      {/* Third-Party Integrations Section */}
      <IntegrationsCard />

      {/* Garden Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sprout className="h-5 w-5" />
            Garden Profile
          </CardTitle>
          <CardDescription>
            Tell us about your garden to get personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Garden Features */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600" />
              Garden Features
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {gardenFeatureOptions.map(option => {
                const checked = formData.gardenFeatures?.includes(option.id) || false;
                return (
                <label
                  key={option.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                    checked ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'hover:bg-muted/50'
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleArrayField('gardenFeatures', option.id)}
                    indicator={<Sprout className="w-4 h-4 text-emerald-500" />}
                  />
                  <span className="text-lg">{option.emoji}</span>
                  <span className="text-sm">{option.label}</span>
                </label>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Soil Type */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-amber-600" />
              Soil Type
            </Label>
            <Select
              value={formData.soilType || '__none__'}
              onValueChange={v => updateField('soilType', v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your soil type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                {soilTypeOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex items-center gap-2">
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sun Exposure */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-yellow-500" />
              Sun Exposure
            </Label>
            <Select
              value={formData.sunExposure || '__none__'}
              onValueChange={v => updateField('sunExposure', v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sun exposure" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                {sunExposureOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex items-center gap-2">
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Moisture */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              Typical Moisture
            </Label>
            <Select
              value={formData.moisture || '__none__'}
              onValueChange={v => updateField('moisture', v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select moisture level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                {moistureOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex items-center gap-2">
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Interests */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--gd-amber)]" />
              Gardening Interests
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {interestOptions.map(option => {
                const checked = formData.interests?.includes(option.id) || false;
                return (
                <label
                  key={option.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors',
                    checked ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'hover:bg-muted/50'
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleArrayField('interests', option.id)}
                    indicator={<Sprout className="w-4 h-4 text-emerald-500" />}
                  />
                  <span className="text-lg">{option.emoji}</span>
                  <span className="text-sm">{option.label}</span>
                </label>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Experience Level */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-green-600" />
              Experience Level
            </Label>
            <Select
              value={formData.skillLevel || '__none__'}
              onValueChange={v => updateField('skillLevel', v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                {experienceOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex items-center gap-2">
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Depth */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Content Preference
            </Label>
            <Select
              value={formData.contentDepth || '__none__'}
              onValueChange={v => updateField('contentDepth', v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="How detailed should tips be?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                {contentDepthOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex items-center gap-2">
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Re-run Onboarding */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Start Fresh</p>
              <p className="text-sm text-muted-foreground">
                Re-run the onboarding wizard to update all your garden settings
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/grow/onboarding')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-run Onboarding
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Legal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/grow/privacy"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Privacy Policy</span>
          </Link>
          <Link
            href="/grow/terms"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Terms of Service</span>
          </Link>
          <Link
            href="/grow/support"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Support</span>
          </Link>
        </CardContent>
      </Card>

      {/* Floating Save Button (shows when scrolled) */}
      {hasChanges && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 shadow-lg pointer-events-auto"
            size="lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {/* Location Dialog */}
      <GrowLocationDialog
        open={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
        onSave={handleLocationSave}
      />
    </div>
  );
}

export default SettingsPage;
