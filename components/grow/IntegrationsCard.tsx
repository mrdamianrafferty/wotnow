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
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

interface Integration {
  id: string;
  integration_type: 'tempest' | 'ambient_weather' | 'rachio';
  station_id: string;
  device_name: string;
  is_active: boolean;
  last_sync_at?: string;
  metadata?: Record<string, unknown>;
}

interface IntegrationCardProps {
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const INTEGRATION_INFO = {
  tempest: {
    name: 'Tempest Weather',
    description: 'WeatherFlow Tempest weather station',
    icon: Wind,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    setupUrl: 'https://tempestwx.com/settings/tokens',
    tokenLabel: 'Personal Access Token',
    tokenHelp: 'Get your token from Settings > Data Authorizations > Create Token in the Tempest web app',
  },
  ambient_weather: {
    name: 'Ambient Weather',
    description: 'Ambient Weather station with soil sensors',
    icon: Thermometer,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    setupUrl: 'https://ambientweather.net/account',
    tokenLabel: 'API Key',
    tokenHelp: 'Get your API key from your Ambient Weather account page',
  },
  rachio: {
    name: 'Rachio',
    description: 'Smart irrigation controller',
    icon: Droplets,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    setupUrl: 'https://app.rach.io',
    tokenLabel: 'API Key',
    tokenHelp: 'Get your API key from Profile > API key in the Rachio app',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function IntegrationsCard({ className = '' }: IntegrationCardProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const supabase = createClient();

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
  }, [supabase]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleConnect = async (type: string) => {
    if (!tokenInput.trim()) {
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

      const bodyKey = type === 'tempest' ? 'token' : 'apiKey';

      const response = await fetch(`/api/grow/integrations/${type}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ [bodyKey]: tokenInput.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`${INTEGRATION_INFO[type as keyof typeof INTEGRATION_INFO].name} connected!`);
        setAddingType(null);
        setTokenInput('');
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

  const handleDisconnect = async (integration: Integration) => {
    if (!confirm(`Disconnect ${integration.device_name}?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `/api/grow/integrations/${integration.integration_type}/connect?integrationId=${integration.id}`,
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
        `/api/grow/integrations/${integration.integration_type}/sync?integrationId=${integration.id}`,
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

  const connectedTypes = integrations.map(i => i.integration_type);
  const availableTypes = Object.keys(INTEGRATION_INFO).filter(
    type => !connectedTypes.includes(type as Integration['integration_type'])
  );

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <CloudSun className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Integrations</h3>
            <p className="text-sm text-gray-500">
              {integrations.length === 0
                ? 'Connect weather stations & irrigation'
                : `${integrations.length} connected`}
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
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {/* Connected Integrations */}
                  {integrations.length > 0 && (
                    <div className="space-y-3">
                      {integrations.map(integration => {
                        const info = INTEGRATION_INFO[integration.integration_type];
                        const Icon = info.icon;

                        return (
                          <div
                            key={integration.id}
                            className={`p-3 rounded-lg border ${info.bgColor} border-gray-200`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Icon className={`h-5 w-5 ${info.color}`} />
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">
                                    {integration.device_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {info.name} • Synced {formatLastSync(integration.last_sync_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
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
                                  onClick={() => handleDisconnect(integration)}
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

                  {/* Add New Integration */}
                  {availableTypes.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">Add Integration</p>

                      {addingType ? (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          {(() => {
                            const info = INTEGRATION_INFO[addingType as keyof typeof INTEGRATION_INFO];
                            return (
                              <>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <info.icon className={`h-4 w-4 ${info.color}`} />
                                  <span>{info.name}</span>
                                </div>

                                <Input
                                  type="password"
                                  placeholder={info.tokenLabel}
                                  value={tokenInput}
                                  onChange={(e) => setTokenInput(e.target.value)}
                                  className="text-sm"
                                />

                                <p className="text-xs text-gray-500 flex items-start gap-1">
                                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {info.tokenHelp}
                                </p>

                                <a
                                  href={info.setupUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                                >
                                  Get your {info.tokenLabel.toLowerCase()}
                                  <ExternalLink className="h-3 w-3" />
                                </a>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setAddingType(null);
                                      setTokenInput('');
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleConnect(addingType)}
                                    disabled={isSubmitting || !tokenInput.trim()}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    {isSubmitting ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
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
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {availableTypes.map(type => {
                            const info = INTEGRATION_INFO[type as keyof typeof INTEGRATION_INFO];
                            const Icon = info.icon;

                            return (
                              <button
                                key={type}
                                onClick={() => setAddingType(type)}
                                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                              >
                                <div className={`w-8 h-8 rounded-full ${info.bgColor} flex items-center justify-center`}>
                                  <Icon className={`h-4 w-4 ${info.color}`} />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-sm">{info.name}</p>
                                  <p className="text-xs text-gray-500">{info.description}</p>
                                </div>
                                <Plus className="h-4 w-4 text-gray-400" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {integrations.length === 0 && availableTypes.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      All available integrations connected
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
