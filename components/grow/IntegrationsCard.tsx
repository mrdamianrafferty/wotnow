/**
 * Integrations Management Card
 *
 * Settings card for managing third-party integrations
 * (weather stations, irrigation controllers).
 *
 * @module components/grow/IntegrationsCard
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import {
  CloudSun,
  Droplets,
  Thermometer,
  Wind,
  RefreshCw,
  Plus,
  Trash2,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Target,
  Leaf,
  Lock,
  Crown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useGrowSubscription } from '@/hooks/useGrowSubscription';
import Link from 'next/link';

// =============================================================================
// TYPES
// =============================================================================

type IntegrationType = 'tempest' | 'ambient_weather' | 'rachio' | 'hydrawise' | 'netatmo' | 'ecowitt' | 'weatherlink';

interface Integration {
  id: string;
  provider: IntegrationType;
  external_id?: string;
  device_id?: string;
  device_name: string;
  status: string;
  last_sync_at?: string;
  metadata?: Record<string, unknown>;
}

interface IntegrationCardProps {
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Categories for grouping integrations
type IntegrationCategory = 'weather' | 'irrigation';

interface IntegrationConfig {
  name: string;
  description: string;
  benefit: string; // Clear user benefit
  icon: typeof Wind;
  color: string;
  bgColor: string;
  setupUrl: string;
  tokenLabel: string;
  tokenHelp: string;
  authType: 'token' | 'oauth' | 'dual_token';
  category: IntegrationCategory;
  features: string[]; // Feature badges
  popular?: boolean; // Highlight popular options
}

const INTEGRATION_INFO: Record<IntegrationType, IntegrationConfig> = {
  // Weather Stations (ordered by popularity/ease of use)
  netatmo: {
    name: 'Netatmo',
    description: 'One-click setup via your Netatmo account',
    benefit: 'Actual temperature & humidity from your garden',
    icon: CloudSun,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    setupUrl: 'https://my.netatmo.com',
    tokenLabel: 'Connect with Netatmo',
    tokenHelp: 'Click Connect to securely link your Netatmo account - no API keys needed',
    authType: 'oauth',
    category: 'weather',
    features: ['Easy Setup', 'Indoor + Outdoor'],
    popular: true,
  },
  ecowitt: {
    name: 'Ecowitt',
    description: 'Budget-friendly stations with soil sensors',
    benefit: 'Real soil moisture & temperature at multiple depths',
    icon: Thermometer,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    setupUrl: 'https://www.ecowitt.net/home/index',
    tokenLabel: 'API Key',
    tokenHelp: 'Find your API key in Settings > API on ecowitt.net',
    authType: 'token',
    category: 'weather',
    features: ['Soil Sensors', 'Great Value'],
    popular: true,
  },
  ambient_weather: {
    name: 'Ambient Weather',
    description: 'Feature-rich stations with optional soil probes',
    benefit: 'Hyperlocal weather + soil conditions for your exact location',
    icon: Thermometer,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    setupUrl: 'https://ambientweather.net/account',
    tokenLabel: 'API Key',
    tokenHelp: 'Get your API key from your Ambient Weather account page',
    authType: 'token',
    category: 'weather',
    features: ['Soil Sensors', 'Rain Gauge'],
  },
  tempest: {
    name: 'Tempest',
    description: 'Premium wireless weather system',
    benefit: 'Professional-grade data including lightning detection',
    icon: Wind,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    setupUrl: 'https://tempestwx.com/settings/tokens',
    tokenLabel: 'Personal Access Token',
    tokenHelp: 'Create a token in Settings > Data Authorizations in the Tempest web app',
    authType: 'token',
    category: 'weather',
    features: ['Lightning', 'UV Index', 'Haptic Rain'],
  },
  weatherlink: {
    name: 'Davis WeatherLink',
    description: 'Professional-grade Davis instruments',
    benefit: 'Research-quality data trusted by agricultural pros',
    icon: Wind,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    setupUrl: 'https://www.weatherlink.com/account',
    tokenLabel: 'API Key & Secret',
    tokenHelp: 'Get your API Key and Secret from Account > API v2 in WeatherLink',
    authType: 'dual_token',
    category: 'weather',
    features: ['Soil Sensors', 'Pro Grade'],
  },
  // Irrigation Controllers
  rachio: {
    name: 'Rachio',
    description: 'Smart WiFi sprinkler controller',
    benefit: 'Auto-skip watering when rain is coming or soil is wet',
    icon: Droplets,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    setupUrl: 'https://app.rach.io',
    tokenLabel: 'API Key',
    tokenHelp: 'Find your API key in Profile > API key in the Rachio app',
    authType: 'token',
    category: 'irrigation',
    features: ['Smart Skip', 'Zone Control'],
    popular: true,
  },
  hydrawise: {
    name: 'Hydrawise',
    description: 'Hunter Industries smart controller',
    benefit: 'Weather-adjusted watering schedules based on your garden',
    icon: Droplets,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    setupUrl: 'https://app.hydrawise.com/config/account',
    tokenLabel: 'API Key',
    tokenHelp: 'Find your API key in Account Settings in the Hydrawise app',
    authType: 'token',
    category: 'irrigation',
    features: ['Zone Control', 'Scheduling'],
  },
};

// Category info for headers
const CATEGORY_INFO = {
  weather: {
    title: 'Weather Stations',
    subtitle: 'Replace forecasts with real data from your garden',
    icon: CloudSun,
    benefit: 'Weather forecasts cover large areas and can be off by several degrees. Your own station gives you exact conditions where your plants actually grow.',
  },
  irrigation: {
    title: 'Irrigation Controllers',
    subtitle: 'Smart watering based on actual conditions',
    icon: Droplets,
    benefit: 'Connect your sprinkler system to automatically adjust watering based on rainfall, soil moisture, and weather forecasts.',
  },
};

// Stable Supabase client (created once outside the component to prevent re-render loops)
const supabase = createClient();

// =============================================================================
// COMPONENT
// =============================================================================

export function IntegrationsCard({ className = '' }: IntegrationCardProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [secretInput, setSecretInput] = useState(''); // For WeatherLink
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | null>(null);

  const { canUse, isLoading: subscriptionLoading } = useGrowSubscription();

  // Check if user can access hardware integrations (paid feature)
  const canAccessIntegrations = canUse('hardwareIntegrations');

  // Helper to determine data source status
  const hasWeatherStation = integrations.some(
    i => INTEGRATION_INFO[i.provider].category === 'weather'
  );
  const hasIrrigation = integrations.some(
    i => INTEGRATION_INFO[i.provider].category === 'irrigation'
  );

  const fetchIntegrations = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/grow/integrations', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleConnect = async (type: string) => {
    const info = INTEGRATION_INFO[type as keyof typeof INTEGRATION_INFO];

    // Handle OAuth flow (Netatmo)
    if (info.authType === 'oauth') {
      setIsSubmitting(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast.error('Please log in');
          return;
        }

        const response = await fetch(`/api/grow/integrations/${type}/authorize`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.authUrl) {
          // Redirect to OAuth provider
          window.location.href = data.authUrl;
        } else {
          toast.error(data.error || 'Failed to start authorization');
        }
      } catch (error) {
        console.error('OAuth error:', error);
        toast.error('Failed to start authorization');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Handle dual token (WeatherLink)
    if (info.authType === 'dual_token') {
      if (!tokenInput.trim() || !secretInput.trim()) {
        toast.error('Please enter both API Key and API Secret');
        return;
      }
    } else if (!tokenInput.trim()) {
      toast.error('Please enter your API token');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in');
        return;
      }

      let body: Record<string, string>;
      if (type === 'tempest') {
        body = { token: tokenInput.trim() };
      } else if (type === 'weatherlink') {
        body = { apiKey: tokenInput.trim(), apiSecret: secretInput.trim() };
      } else {
        body = { apiKey: tokenInput.trim() };
      }

      const response = await fetch(`/api/grow/integrations/${type}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`${info.name} connected!`);
        setAddingType(null);
        setTokenInput('');
        setSecretInput('');
        fetchIntegrations();
      } else {
        toast.error(data.error || 'Failed to connect');
      }
    } catch (error) {
      console.error('Connect error:', error);
      toast.error('Failed to connect integration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [confirmDisconnect, setConfirmDisconnect] = useState<Integration | null>(null);

  const handleRequestDisconnect = (integration: Integration) => {
    setConfirmDisconnect(integration);
  };

  const handleDisconnect = async (integration: Integration) => {
    setConfirmDisconnect(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `/api/grow/integrations/${integration.provider}/connect?integrationId=${integration.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Integration disconnected');
        fetchIntegrations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect');
    }
  };

  const handleSync = async (integration: Integration) => {
    setSyncingId(integration.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `/api/grow/integrations/${integration.provider}/sync?integrationId=${integration.id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Data synced successfully');
        fetchIntegrations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to sync');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync data');
    } finally {
      setSyncingId(null);
    }
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const connectedTypes = integrations.map(i => i.provider);
  const availableTypes = Object.keys(INTEGRATION_INFO).filter(
    type => !connectedTypes.includes(type as IntegrationType)
  ) as IntegrationType[];

  // Group available integrations by category
  const availableByCategory = {
    weather: availableTypes.filter(t => INTEGRATION_INFO[t].category === 'weather'),
    irrigation: availableTypes.filter(t => INTEGRATION_INFO[t].category === 'irrigation'),
  };

  // Group connected integrations by category
  const connectedByCategory = {
    weather: integrations.filter(i => INTEGRATION_INFO[i.provider].category === 'weather'),
    irrigation: integrations.filter(i => INTEGRATION_INFO[i.provider].category === 'irrigation'),
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${canAccessIntegrations ? 'bg-purple-100' : 'bg-gray-100'}`}>
            {canAccessIntegrations ? (
              <CloudSun className="h-5 w-5 text-purple-600" />
            ) : (
              <Lock className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Hardware Integrations</h3>
              {!canAccessIntegrations && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                  Premium
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {!canAccessIntegrations ? (
                'Connect weather stations & irrigation'
              ) : integrations.length === 0 ? (
                'Get more accurate data from your garden'
              ) : hasWeatherStation ? (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  Using real data from your garden
                </span>
              ) : (
                `${integrations.length} connected`
              )}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              {isLoading || subscriptionLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : !canAccessIntegrations ? (
                /* Upgrade prompt for free users */
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Crown className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">
                          Connect Your Weather Station
                        </h4>
                        <p className="text-sm text-gray-700 mt-1">
                          Hardware integrations are available on paid plans. Connect your weather station or irrigation controller to get:
                        </p>
                        <ul className="mt-3 space-y-2">
                          <li className="flex items-center gap-2 text-sm text-gray-700">
                            <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <span>Actual temperature & humidity from your garden</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-gray-700">
                            <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <span>Soil moisture data at multiple depths</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-gray-700">
                            <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <span>Smart watering that skips when soil is wet</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm text-gray-700">
                            <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <span>Tasks based on real conditions, not forecasts</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <Link
                      href="/grow/premium"
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium py-2.5 px-4 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
                    >
                      <Lock className="h-4 w-4" />
                      Upgrade to Unlock
                    </Link>
                  </div>

                  <p className="text-xs text-center text-gray-500">
                    Starting at €3.99/month • Cancel anytime
                  </p>
                </div>
              ) : addingType ? (
                /* Adding a specific integration */
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {(() => {
                    const info = INTEGRATION_INFO[addingType as IntegrationType];
                    const Icon = info.icon;
                    return (
                      <>
                        {/* Integration header */}
                        <div className={`p-4 rounded-lg ${info.bgColor}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full bg-white/50 flex items-center justify-center`}>
                              <Icon className={`h-5 w-5 ${info.color}`} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{info.name}</h4>
                              <p className="text-sm text-gray-700 mt-1">{info.benefit}</p>
                            </div>
                          </div>
                        </div>

                        {/* Setup instructions */}
                        <div className="space-y-3">
                          {info.authType === 'oauth' ? (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-600 flex items-start gap-2">
                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                {info.tokenHelp}
                              </p>
                            </div>
                          ) : info.authType === 'dual_token' ? (
                            <>
                              <Input
                                type="password"
                                placeholder="API Key"
                                value={tokenInput}
                                onChange={(e) => setTokenInput(e.target.value)}
                                className="text-sm"
                              />
                              <Input
                                type="password"
                                placeholder="API Secret"
                                value={secretInput}
                                onChange={(e) => setSecretInput(e.target.value)}
                                className="text-sm"
                              />
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-600">{info.tokenHelp}</p>
                                <a
                                  href={info.setupUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-2"
                                >
                                  Open {info.name} settings
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </>
                          ) : (
                            <>
                              <Input
                                type="password"
                                placeholder={info.tokenLabel}
                                value={tokenInput}
                                onChange={(e) => setTokenInput(e.target.value)}
                                className="text-sm"
                              />
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-600">{info.tokenHelp}</p>
                                <a
                                  href={info.setupUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-2"
                                >
                                  Open {info.name} settings
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAddingType(null);
                              setSelectedCategory(null);
                              setTokenInput('');
                              setSecretInput('');
                            }}
                            disabled={isSubmitting}
                            className="flex-1"
                          >
                            Back
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleConnect(addingType)}
                            disabled={
                              isSubmitting ||
                              (info.authType === 'token' && !tokenInput.trim()) ||
                              (info.authType === 'dual_token' && (!tokenInput.trim() || !secretInput.trim()))
                            }
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : info.authType === 'oauth' ? (
                              <>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Connect
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Connect
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              ) : selectedCategory ? (
                /* Showing integrations in a category */
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  {/* Category header */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronUp className="h-4 w-4 rotate-[-90deg]" />
                    </button>
                    <h4 className="font-medium text-gray-900">
                      {CATEGORY_INFO[selectedCategory].title}
                    </h4>
                  </div>

                  {/* Connected in this category */}
                  {connectedByCategory[selectedCategory].length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">Connected</p>
                      {connectedByCategory[selectedCategory].map(integration => {
                        const info = INTEGRATION_INFO[integration.provider];
                        const Icon = info.icon;
                        return (
                          <div
                            key={integration.id}
                            className={`p-3 rounded-lg ${info.bgColor} border border-gray-100`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Icon className={`h-5 w-5 ${info.color}`} />
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">
                                    {integration.device_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Synced {formatLastSync(integration.last_sync_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSync(integration)}
                                  disabled={syncingId === integration.id}
                                  className="h-8 w-8 p-0"
                                >
                                  {syncingId === integration.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRequestDisconnect(integration)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Available in this category */}
                  {availableByCategory[selectedCategory].length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase">Available</p>
                      {availableByCategory[selectedCategory].map(type => {
                        const info = INTEGRATION_INFO[type];
                        const Icon = info.icon;
                        return (
                          <button
                            key={type}
                            onClick={() => setAddingType(type)}
                            className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors text-left cursor-pointer"
                          >
                            <div className={`w-10 h-10 rounded-full ${info.bgColor} flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`h-5 w-5 ${info.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 text-sm">{info.name}</p>
                                {info.popular && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                                    Popular
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">{info.description}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {info.features.map(feature => (
                                  <span
                                    key={feature}
                                    className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                                  >
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ) : (
                /* Main view - category selection */
                <div className="space-y-4">
                  {/* Data source indicator */}
                  {hasWeatherStation && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-emerald-600" />
                        <p className="text-sm font-medium text-emerald-800">
                          Using your weather station data
                        </p>
                      </div>
                      <p className="text-xs text-emerald-700 mt-1 ml-6">
                        Tasks and alerts are based on actual conditions in your garden, not regional forecasts.
                      </p>
                    </div>
                  )}

                  {/* Category cards */}
                  {(['weather', 'irrigation'] as IntegrationCategory[]).map(category => {
                    const catInfo = CATEGORY_INFO[category];
                    const CatIcon = catInfo.icon;
                    const connected = connectedByCategory[category];
                    const available = availableByCategory[category];
                    const hasConnected = connected.length > 0;

                    if (available.length === 0 && connected.length === 0) return null;

                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full ${hasConnected ? 'bg-emerald-100' : 'bg-gray-100'} flex items-center justify-center`}>
                            <CatIcon className={`h-5 w-5 ${hasConnected ? 'text-emerald-600' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{catInfo.title}</h4>
                              {hasConnected && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                  {connected.length} connected
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{catInfo.subtitle}</p>
                            {!hasConnected && (
                              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                {catInfo.benefit}
                              </p>
                            )}
                          </div>
                          <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg] mt-1" />
                        </div>
                      </button>
                    );
                  })}

                  {/* Quick tip for no integrations */}
                  {!hasWeatherStation && !hasIrrigation && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Leaf className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">
                            Improve your growing results
                          </p>
                          <p className="text-xs text-amber-700 mt-1">
                            Weather forecasts can be off by 2-5°C. A weather station in your garden gives you the exact conditions your plants experience.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Disconnect confirmation */}
              {confirmDisconnect && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-4"
                >
                  <p className="text-sm font-medium text-red-800 mb-3">
                    Disconnect {confirmDisconnect.device_name}?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDisconnect(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDisconnect(confirmDisconnect)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      Disconnect
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
