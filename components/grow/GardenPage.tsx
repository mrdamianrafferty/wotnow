import React, { useState, useEffect, useCallback, useRef, startTransition, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { 
  Sprout, 
  Camera, 
  Upload,
  Search,
  Plus,
  Droplets,
  Bug,
  AlertCircle,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Loader2,
  CheckCircle2,
  Trees,
  Trash2,
  X,
  Pencil,
  Info,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { GuildModalEnhanced } from './GuildModalEnhanced';
import type { GuildCompanion } from '../../lib/grow/guild';
import { api } from '../../lib/grow/api';
import { AddPlantDialog } from './AddPlantDialog';
import { EditPlantDialog } from './EditPlantDialog';
import { PlantSpeciesInfo } from './PlantSpeciesInfo';
import type { PlantSpecies } from '../../lib/grow/species';
import type { SerializedPlant } from '../../lib/grow/server/plants';
import { buildGrowLoginUrl, GROW_ROOT_PATH } from '../../lib/grow/routes';
import { SkeletonGardenPage } from './GrowSkeletons';
import { getPlantImage } from '../../lib/grow/plantImages';
import { ThreatCard } from './ThreatCard';
import { PLANT_IMAGE_MAP } from '../../lib/grow/plantImages';
import type { PlantIdentificationResult } from '../../lib/grow/plantIdentificationService';

type ThreatRiskBand = 'none' | 'low' | 'moderate' | 'high' | 'severe';

type ThreatAssessment = {
  threatId: string;
  slug: string;
  commonName: string;
  scientificName: string | null;
  threatType: string;
  severityDefault: number;
  score: number;
  band: ThreatRiskBand;
  matchedHosts: Array<{ kind: string; key: string; strength: number }>;
  matchedRules: Array<{ ruleId: string; title: string; score: number }>;
  reasons: string[];
  cardJson: Record<string, unknown>;
};

type ThreatsApiResponse = {
  threats: ThreatAssessment[];
};

interface Plant {
  id: string;
  name: string;
  type: string;
  planted: Date;
  location: string;
  health: 'excellent' | 'good' | 'fair' | 'poor';
  lastWatered?: Date;
  notes?: string;
}

interface GardenPhoto {
  id: string;
  url: string;
  date: Date;
  tags: string[];
  location?: string;
  plants?: string[];
  description?: string;
}

type RawPlant = {
  id: string;
  name: string;
  type: string;
  location?: string | null;
  health?: Plant['health'] | null;
  planted?: string | Date | null;
  createdAt?: string | Date | null;
  lastWatered?: string | Date | null;
  notes?: string | null;
};

function slugifyForImageKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function stripParentheticals(value: string): string {
  return value.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function findBestPlantImageKey(plantName: string): string | null {
  const raw = plantName?.trim();
  if (!raw) return null;

  const candidates = [raw, stripParentheticals(raw)]
    .map(slugifyForImageKey)
    .filter(Boolean);

  for (const key of candidates) {
    if (PLANT_IMAGE_MAP[key]) return key;
  }

  // Most map keys are "common-name-scientific-name". Try matching by common-name prefix.
  const prefixes = new Set<string>();
  for (const c of candidates) {
    prefixes.add(c);
    prefixes.add(`${c}-`);
  }

  const keys = Object.keys(PLANT_IMAGE_MAP);
  for (const prefix of prefixes) {
    const hit = keys.find((k) => k.startsWith(prefix));
    if (hit) return hit;
  }

  return null;
}

const normalizePlant = (raw: RawPlant): Plant => {
  const plantedValue = raw.planted ? new Date(raw.planted) : new Date();
  const lastWateredValue = raw.lastWatered ? new Date(raw.lastWatered) : undefined;
  const healthValue = raw.health ?? 'good';
  const allowedHealth: Plant['health'][] = ['excellent', 'good', 'fair', 'poor'];
  const safeHealth = allowedHealth.includes(healthValue as Plant['health'])
    ? (healthValue as Plant['health'])
    : 'good';

  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    planted: plantedValue,
    location: raw.location ?? 'Garden',
    health: safeHealth,
    lastWatered: lastWateredValue,
    notes: raw.notes ?? undefined,
  };
};

export function GardenPage() {
  const [activeTab, setActiveTab] = useState('plants');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifyMode, setIdentifyMode] = useState<'plant' | 'pest'>('plant');
  const [guildModalOpen, setGuildModalOpen] = useState(false);
  const [isLoadingPlants, setIsLoadingPlants] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddPlantDialogOpen, setIsAddPlantDialogOpen] = useState(false);
  const [isEditPlantDialogOpen, setIsEditPlantDialogOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  
  // Photo upload state for identification
  const [identifyPhoto, setIdentifyPhoto] = useState<File | null>(null);
  const [identifyPhotoPreview, setIdentifyPhotoPreview] = useState<string | null>(null);
  const [identifyResult, setIdentifyResult] = useState<PlantIdentificationResult | null>(null);
  const [identifyProvider, setIdentifyProvider] = useState<'openai' | 'plantid'>('openai');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Plant inventory state
  const [plants, setPlants] = useState<Plant[]>([]);
  
  // Track recently added plants for animation
  const [newlyAddedPlantIds, setNewlyAddedPlantIds] = useState<Set<string>>(new Set());
  
  // Track plants being deleted for exit animation
  const [deletingPlantIds, setDeletingPlantIds] = useState<Set<string>>(new Set());

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'recent' | 'health'>('name-asc');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');

  // Threats state
  const [isLoadingThreats, setIsLoadingThreats] = useState(false);
  const [threats, setThreats] = useState<ThreatAssessment[]>([]);
  
  // Species info cache - maps plant type (species name) to species data
  const [speciesCache, setSpeciesCache] = useState<Map<string, PlantSpecies>>(new Map());
  const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);
  
  // Mock climate zone - in real app, get from user profile
  const userClimateZone = 'atlantic_mild';

  // Derive unique plant types and locations for filter options
  const uniqueTypes = useMemo(() => {
    const types = [...new Set(plants.map(p => p.type))].filter(Boolean).sort();
    return types;
  }, [plants]);

  const uniqueLocations = useMemo(() => {
    const locations = [...new Set(plants.map(p => p.location))].filter(Boolean).sort();
    return locations;
  }, [plants]);

  // Filter and sort plants
  const filteredAndSortedPlants = useMemo(() => {
    let result = [...plants];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.type.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      result = result.filter(p => p.type === filterType);
    }

    // Apply location filter
    if (filterLocation !== 'all') {
      result = result.filter(p => p.location === filterLocation);
    }

    // Apply sorting
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'recent':
        result.sort((a, b) => b.planted.getTime() - a.planted.getTime());
        break;
      case 'health':
        const healthOrder = { poor: 0, fair: 1, good: 2, excellent: 3 };
        result.sort((a, b) => healthOrder[a.health] - healthOrder[b.health]);
        break;
    }

    return result;
  }, [plants, searchQuery, filterType, filterLocation, sortBy]);

  const loadThreats = useCallback(async () => {
    try {
      setIsLoadingThreats(true);

      const token = localStorage.getItem('access_token');
      if (!token) {
        setThreats([]);
        return;
      }

      const resp = await fetch('/api/grow/threats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.warn('[GardenPage] Failed to load threats', resp.status, text);
        setThreats([]);
        return;
      }

      const data = (await resp.json()) as ThreatsApiResponse;
      setThreats(Array.isArray(data?.threats) ? data.threats : []);
    } catch (error) {
      console.error('[GardenPage] Error loading threats', error);
      setThreats([]);
    } finally {
      setIsLoadingThreats(false);
    }
  }, []);

  const redirectToLogin = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const candidate = window.location.pathname.startsWith(GROW_ROOT_PATH)
      ? `${window.location.pathname}${window.location.search}`
      : GROW_ROOT_PATH;
    window.location.replace(buildGrowLoginUrl(candidate));
  }, []);

  const loadPlants = useCallback(async () => {
    try {
      setIsLoadingPlants(true);
      console.log('🌱 [GardenPage] Loading plants from backend...');
      
      // Check if user is authenticated
      const token = localStorage.getItem('access_token');
      console.log('🌱 [GardenPage] Auth token present:', !!token);

      if (!token) {
        redirectToLogin();
        return;
      }

      const response = await api.getUserPlants();
      console.log('🌱 [GardenPage] Backend response:', response);
      
      if (Array.isArray(response?.plants)) {
        const plantsWithDates = (response.plants as RawPlant[])
          .map(normalizePlant);
        setPlants(plantsWithDates);
        console.log(`✅ [GardenPage] Loaded ${plantsWithDates.length} plants from backend`);
        
        // Log first few plants for debugging
        if (plantsWithDates.length > 0) {
          console.log('🌱 [GardenPage] First 3 plants:', plantsWithDates.slice(0, 3).map((p: Plant) => ({ id: p.id, name: p.name, type: p.type })));
        }
      } else {
        console.log('⚠️ [GardenPage] No plants in response, setting empty array');
        setPlants([]);
      }
    } catch (error: unknown) {
      console.error('❌ [GardenPage] Failed to load plants:', error);
      const err = error as { message?: string; stack?: string };
      console.error('❌ [GardenPage] Error details:', err.message, err.stack);
      
      // Don't show starter plants - let user add their own
      setPlants([]);
      if (err?.message === 'Not authenticated') {
        toast.error('Please sign in to view your garden', {
          description: 'Redirecting you to the sign-in page.',
        });
        redirectToLogin();
      } else {
        toast.error('Could not load plants', {
          description: 'Unable to connect to server. Your garden is empty.',
        });
      }
    } finally {
      setIsLoadingPlants(false);
    }
  }, [redirectToLogin]);

  // Load plants from backend on mount
  useEffect(() => {
    startTransition(() => {
      void loadPlants();
    });
  }, [loadPlants]);

  useEffect(() => {
    startTransition(() => {
      void loadThreats();
    });
  }, [loadThreats]);

  // Fetch species info for all plants when plants change
  useEffect(() => {
    if (plants.length === 0) return;

    const fetchSpeciesInfo = async () => {
      // Get unique plant names that we don't already have cached
      // Use plant.name (e.g., "Tomato", "Basil") not plant.type (category like "vegetable", "herb")
      const uncachedNames = [...new Set(plants.map(p => p.name.toLowerCase()))]
        .filter(name => !speciesCache.has(name));

      console.log('🌱 [Species] Fetching species for:', uncachedNames.slice(0, 5), '... total:', uncachedNames.length);

      if (uncachedNames.length === 0) {
        console.log('🌱 [Species] All species already cached');
        return;
      }

      setIsLoadingSpecies(true);
      try {
        const newSpecies = await api.getPlantSpeciesBatch(uncachedNames);
        console.log('🌱 [Species] Fetched species count:', newSpecies.size);
        console.log('🌱 [Species] Species names found:', [...newSpecies.keys()].slice(0, 5));
        setSpeciesCache(prev => {
          const updated = new Map(prev);
          newSpecies.forEach((species, key) => {
            updated.set(key, species);
          });
          return updated;
        });
      } catch (error) {
        console.error('Failed to fetch species info:', error);
      } finally {
        setIsLoadingSpecies(false);
      }
    };

    void fetchSpeciesInfo();
  }, [plants, speciesCache]);

  const handlePlantAdded = (plant: SerializedPlant) => {
    const rawPlant: RawPlant = {
      id: plant.id,
      name: plant.name,
      type: plant.type,
      location: plant.location ?? null,
      health: plant.health as Plant['health'] | null,
      planted: plant.planted ?? null,
      lastWatered: plant.lastWatered ?? null,
      notes: plant.notes ?? null,
    };

    // Track the new plant ID for animation
    setNewlyAddedPlantIds((prev) => new Set([...prev, plant.id]));
    
    // Clear animation flag after animation completes (400ms sprout + buffer)
    setTimeout(() => {
      setNewlyAddedPlantIds((prev) => {
        const next = new Set(prev);
        next.delete(plant.id);
        return next;
      });
    }, 600);

    setPlants((previous) => [...previous, normalizePlant(rawPlant)]);
  };

  const handleEditPlant = (plant: Plant) => {
    setEditingPlant(plant);
    setIsEditPlantDialogOpen(true);
  };

  const handlePlantUpdated = (updatedPlant: Plant) => {
    setPlants((previous) =>
      previous.map((p) => (p.id === updatedPlant.id ? updatedPlant : p))
    );
  };

  const mockPhotos: GardenPhoto[] = [
    {
      id: '1',
      url: '/gardening.jpg',
      date: new Date(2025, 10, 10),
      tags: ['tomatoes', 'harvest'],
      location: 'Raised Bed 1',
      plants: ['Cherry Tomatoes'],
      description: 'First ripe tomatoes of the season!'
    },
    {
      id: '2',
      url: '/gardening.jpg',
      date: new Date(2025, 9, 15),
      tags: ['flowers', 'roses'],
      location: 'Front Garden',
      plants: ['Peace Rose']
    },
    {
      id: '3',
      url: '/gardening.jpg',
      date: new Date(2025, 8, 1),
      tags: ['garden', 'overview'],
      description: 'Late summer garden looking lush'
    }
  ];

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-white border border-l-4 border-l-green-500 border-green-200';
      case 'good': return 'text-blue-600 bg-white border border-l-4 border-l-blue-500 border-blue-200';
      case 'fair': return 'text-yellow-600 bg-white border border-l-4 border-l-yellow-500 border-yellow-200';
      case 'poor': return 'text-red-600 bg-white border border-l-4 border-l-red-500 border-red-200';
      default: return 'text-gray-600 bg-white border border-l-4 border-l-gray-400 border-gray-200';
    }
  };

  const handleIdentifyPhoto = async () => {
    if (!identifyPhoto) {
      toast.error('Please select a photo first');
      return;
    }
    
    setIsIdentifying(true);
    setIdentifyResult(null);
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
    
    try {
      console.log('[GardenPage] Starting identification...', {
        provider: identifyProvider,
        mode: identifyMode,
        imageSize: identifyPhoto.size,
      });
      
      // Build form data for multipart upload
      const formData = new FormData();
      formData.append('image', identifyPhoto);
      formData.append('data', JSON.stringify({
        mode: identifyMode,
        context: {
          climateZone: userClimateZone,
          month: new Date().getMonth() + 1,
          userPlants: plants.map(p => p.name),
        },
        provider: identifyProvider,
      }));

      const response = await fetch('/api/grow/identify-plant', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('[GardenPage] Response received:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Identification failed');
      }

      const result: PlantIdentificationResult = await response.json();
      console.log('[GardenPage] Identification result:', result);
      setIdentifyResult(result);

      if (result.success) {
        const name = result.mode === 'plant' 
          ? result.species?.name 
          : result.diagnosis?.name;
        toast.success(`Identified: ${name || 'Unknown'}`, {
          description: `Confidence: ${Math.round((result.confidence || 0) * 100)}% • Cost: €${result.cost.toFixed(3)}`,
        });
      } else {
        toast.error('Could not identify', {
          description: result.error || result.reasoning || 'Please try with a clearer photo',
        });
      }
    } catch (error) {
      console.error('[GardenPage] Identification error:', error);
      toast.error('Identification failed', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsIdentifying(false);
    }
  };

  // Simple canvas-based resize for plant ID (much faster than browser-image-compression)
  const quickResize = async (file: File, maxDim: number = 1024): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              reject(new Error('Canvas toBlob failed'));
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle photo selection from file input
  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview from original
    const reader = new FileReader();
    reader.onloadend = () => {
      setIdentifyPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Skip resize for small files (under 500KB) - instant
    if (file.size < 500 * 1024) {
      console.log('[GardenPage] File already small, skipping resize:', file.size);
      setIdentifyPhoto(file);
      return;
    }

    // Use simple canvas resize instead of browser-image-compression (much faster)
    try {
      console.log('[GardenPage] Quick resizing image from', file.size);
      const resized = await quickResize(file, 1024);
      console.log('[GardenPage] Resized to', resized.size);
      setIdentifyPhoto(resized);
    } catch (err) {
      console.error('[GardenPage] Resize failed, using original:', err);
      setIdentifyPhoto(file);
    }
  };

  // Clear selected photo
  const handleClearPhoto = () => {
    setIdentifyPhoto(null);
    setIdentifyPhotoPreview(null);
    setIdentifyResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file input
  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleDeletePlant = async (plantId: string, plantName: string) => {
    console.log(`🗑️ [GardenPage] Attempting to delete plant: id=${plantId}, name=${plantName}`);
    
    try {
      // Check auth first
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Please sign in to delete plants.', {
          description: 'Redirecting you to the sign-in page.',
        });
        redirectToLogin();
        return;
      }
      
      // Start exit animation
      setDeletingPlantIds((prev) => new Set([...prev, plantId]));
      
      // Wait for animation to complete (500ms leaf-fall animation)
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Remove from UI
      setPlants(prevPlants => prevPlants.filter(p => p.id !== plantId));
      setDeletingPlantIds((prev) => {
        const next = new Set(prev);
        next.delete(plantId);
        return next;
      });
      console.log(`🗑️ [GardenPage] Removed plant from UI after animation`);
      
      // Delete from backend
      console.log(`🗑️ [GardenPage] Calling api.deletePlant(${plantId})...`);
      const response = await api.deletePlant(plantId);
      console.log(`🗑️ [GardenPage] Delete response:`, response);
      
      toast.success('Plant removed', {
        description: `${plantName} has been removed from your garden.`,
      });
      
      console.log(`✅ [GardenPage] Successfully deleted plant ${plantId} (${plantName})`);
    } catch (error: unknown) {
      console.error('❌ [GardenPage] Failed to delete plant:', error);
      const err = error as { message?: string; stack?: string };
      console.error('❌ [GardenPage] Error message:', err.message);
      console.error('❌ [GardenPage] Error stack:', err.stack);

      if (err?.message === 'Not authenticated') {
        toast.error('Please sign in to delete plants.', {
          description: 'Redirecting you to the sign-in page.',
        });
        redirectToLogin();
        return;
      }
      
      // Reload plants to restore state
      console.log('🔄 [GardenPage] Reloading plants to restore state...');
      await loadPlants();
      
      toast.error('Failed to delete plant', {
        description: err.message || 'Could not remove plant from garden. Please try again.',
      });
    }
  };

  const handleGuildSelected = async (companions: GuildCompanion[]) => {
    console.log('🌱 [GardenPage] handleGuildSelected called with', companions.length, 'companions');
    console.log('🌱 [GardenPage] Current plants state:', plants.map(p => ({ id: p.id, name: p.name })));
    
    // Check auth
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Please sign in to add plants to your garden.', {
        description: 'Redirecting you to the sign-in page.',
      });
      redirectToLogin();
      return;
    }
    
    // Convert companions to Plant format
    const newPlants: Plant[] = companions.map((c, index) => ({
      id: `temp-${Date.now()}-${index}`, // Temporary ID, backend will generate real one
      name: c.companionName,
      type: c.companionCategory || 'Companion',
      planted: new Date(),
      location: 'Guild Planting',
      health: 'good' as const,
      notes: c.notes || `Added from ${c.guildName || 'guild'}. Role: ${c.role}`
    }));
    
    console.log('🌱 [GardenPage] Converted', newPlants.length, 'companions to Plant format');
    
    // Deduplicate: Check if plant with same name already exists
    const existingNames = new Set(plants.map(p => p.name.toLowerCase()));
    console.log('🌱 [GardenPage] Existing plant names:', Array.from(existingNames));
    
    const uniqueNewPlants = newPlants.filter(
      p => !existingNames.has(p.name.toLowerCase())
    );
    const duplicateCount = newPlants.length - uniqueNewPlants.length;
    
    console.log('🌱 [GardenPage] Unique new plants:', uniqueNewPlants.length);
    console.log('🌱 [GardenPage] Duplicate count:', duplicateCount);
    
    if (uniqueNewPlants.length === 0) {
      toast.info('All selected plants are already in your garden!', {
        description: 'No new plants were added.',
      });
      return;
    }
    
    // Save to backend
    try {
      setIsSaving(true);
      console.log('💾 [GardenPage] Calling api.bulkAddPlants with', uniqueNewPlants.length, 'plants...');
      const response = await api.bulkAddPlants(uniqueNewPlants);
      console.log('💾 [GardenPage] Backend response:', response);
      
      // Update local state with backend IDs
      if (Array.isArray(response?.plants)) {
        const savedPlants = (response.plants as Array<RawPlant & { createdAt?: string | Date | null }>)
          .map((plant) => normalizePlant({
            ...plant,
            planted: plant.planted ?? plant.createdAt ?? new Date().toISOString(),
          }));
        
        console.log('💾 [GardenPage] Saved plants from backend:', savedPlants.map((p: Plant) => ({ id: p.id, name: p.name })));
        
        setPlants(prevPlants => {
          const updated = [...prevPlants, ...savedPlants];
          console.log('🌱 [GardenPage] Updated plants state. Total now:', updated.length);
          return updated;
        });
        
        console.log(`✅ [GardenPage] Successfully saved ${savedPlants.length} plants to backend`);
      } else {
        console.warn('⚠️ [GardenPage] Backend response missing plants array');
        // Fallback: add to local state even if backend fails
        setPlants(prevPlants => [...prevPlants, ...uniqueNewPlants]);
      }
    } catch (error: unknown) {
      console.error('❌ [GardenPage] Failed to save plants to backend:', error);
      const err = error as { message?: string };
      console.error('❌ [GardenPage] Error message:', err.message);
      
      if (err?.message === 'Not authenticated') {
        toast.error('Please sign in to add plants to your garden.', {
          description: 'Redirecting you to the sign-in page.',
        });
        redirectToLogin();
        return;
      }

      // Still add to local state for offline-first experience
      setPlants(prevPlants => [...prevPlants, ...uniqueNewPlants]);
      toast.warning('Plants added locally', {
        description: 'Could not sync with server. Changes will sync when connection is restored.',
      });
    } finally {
      setIsSaving(false);
    }
    
    // Switch to plants tab to show the new additions
    setActiveTab('plants');
    
    // Show success toast
    if (duplicateCount > 0) {
      toast.success(`Added ${uniqueNewPlants.length} new plants! 🌱`, {
        description: `Skipped ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''} already in your garden.`,
      });
    } else {
      toast.success(`Added ${uniqueNewPlants.length} plants to your garden! 🌱`, {
        description: uniqueNewPlants.slice(0, 3).map(p => p.name).join(', ') + (uniqueNewPlants.length > 3 ? ` and ${uniqueNewPlants.length - 3} more` : ''),
      });
    }
  };

  if (isLoadingPlants) {
    return <SkeletonGardenPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Sprout className="h-8 w-8 text-green-600" aria-hidden="true" />
            My Garden
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your plants, identify species, and document your journey
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plants" className="flex items-center gap-2">
            <Sprout className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">My Plants</span>
            <span className="sm:hidden">Plants</span>
          </TabsTrigger>
          <TabsTrigger value="threats" className="flex items-center gap-2">
            <Bug className="h-4 w-4" aria-hidden="true" />
            Threats
          </TabsTrigger>
          <TabsTrigger value="identify" className="flex items-center gap-2">
            <Search className="h-4 w-4" aria-hidden="true" />
            Identify
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Camera className="h-4 w-4" aria-hidden="true" />
            Gallery
          </TabsTrigger>
        </TabsList>

        {/* Tab: Threats */}
        <TabsContent value="threats" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium">Potential Threats</h2>
            <Button
              variant="outline"
              onClick={() => void loadThreats()}
              disabled={isLoadingThreats}
              className="flex items-center gap-2"
            >
              {isLoadingThreats ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
              Refresh
            </Button>
          </div>

          {isLoadingThreats ? (
            <Card className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading threats…
              </div>
            </Card>
          ) : threats.length === 0 ? (
            <Card className="p-12 text-center">
              <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No threats matched yet</h3>
              <p className="text-muted-foreground">
                Add plants and garden features in onboarding to see tailored warnings.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {threats.map((t) => (
                <ThreatCard key={t.threatId} threat={t} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 1: My Plants */}
        <TabsContent value="plants" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium">Plant Inventory</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setGuildModalOpen(true)}
                disabled={isSaving}
                className="flex items-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trees className="h-4 w-4" />
                )}
                Make a Guild
              </Button>
              <Button
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                disabled={isSaving}
                onClick={() => setIsAddPlantDialogOpen(true)}
                aria-label="Add a new plant to your garden"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Plant
              </Button>
            </div>
          </div>

          {/* Search, Sort, and Filter Controls */}
          {plants.length > 0 && (
            <div className="space-y-3">
              {/* Search and Sort Row */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search plants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">A → Z</SelectItem>
                    <SelectItem value="name-desc">Z → A</SelectItem>
                    <SelectItem value="recent">Recently Added</SelectItem>
                    <SelectItem value="health">Health (needs attention)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Pills Row */}
              {(uniqueTypes.length > 1 || uniqueLocations.length > 1) && (
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  
                  {/* Type filter pills */}
                  {uniqueTypes.length > 1 && (
                    <>
                      <button
                        onClick={() => setFilterType('all')}
                        className={`px-3 py-1 text-sm rounded-full transition-all duration-200 ${
                          filterType === 'all' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                      >
                        All Types
                      </button>
                      {uniqueTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => setFilterType(filterType === type ? 'all' : type)}
                          className={`px-3 py-1 text-sm rounded-full transition-all duration-200 ${
                            filterType === type 
                              ? 'bg-green-600 text-white' 
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </>
                  )}
                  
                  {/* Location filter pills */}
                  {uniqueLocations.length > 1 && (
                    <>
                      <span className="text-muted-foreground mx-1">|</span>
                      <button
                        onClick={() => setFilterLocation('all')}
                        className={`px-3 py-1 text-sm rounded-full transition-all duration-200 flex items-center gap-1 ${
                          filterLocation === 'all' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                      >
                        <MapPin className="h-3 w-3" />
                        All
                      </button>
                      {uniqueLocations.map(loc => (
                        <button
                          key={loc}
                          onClick={() => setFilterLocation(filterLocation === loc ? 'all' : loc)}
                          className={`px-3 py-1 text-sm rounded-full transition-all duration-200 flex items-center gap-1 ${
                            filterLocation === loc 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          }`}
                        >
                          <MapPin className="h-3 w-3" />
                          {loc}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Results count */}
              {(searchQuery || filterType !== 'all' || filterLocation !== 'all') && (
                <p className="text-sm text-muted-foreground">
                  Showing {filteredAndSortedPlants.length} of {plants.length} plants
                  {searchQuery && <span> matching &quot;{searchQuery}&quot;</span>}
                </p>
              )}
            </div>
          )}

          {plants.length === 0 ? (
            <Card className="p-12 text-center">
              <Sprout className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No plants yet</h3>
              <p className="text-muted-foreground mb-4">
                Start your garden by adding plants or creating a guild!
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => setGuildModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Trees className="h-4 w-4 mr-2" />
                  Make a Guild
                </Button>
                <Button variant="outline" onClick={() => setIsAddPlantDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Plant
                </Button>
              </div>
            </Card>
          ) : filteredAndSortedPlants.length === 0 ? (
            <Card className="p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No plants match your filters</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filters to see more plants.
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setFilterLocation('all');
                }}
              >
                Clear Filters
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedPlants.map((plant) => {
                const speciesSlug = speciesCache.get(plant.name.toLowerCase())?.slug ?? plant.name.toLowerCase().replace(/\s+/g, '-');
                const speciesUrl = `/grow/species/${encodeURIComponent(speciesSlug)}`;
                const isNewlyAdded = newlyAddedPlantIds.has(plant.id);
                const isDeleting = deletingPlantIds.has(plant.id);
                
                // Build animation classes
                let animationClass = '';
                if (isDeleting) {
                  animationClass = 'motion-safe:animate-leaf-fall motion-reduce:animate-fade-out';
                } else if (isNewlyAdded) {
                  animationClass = 'motion-safe:animate-sprout motion-reduce:animate-fade-in';
                }
                
                return (
                <Card 
                  key={plant.id} 
                  className={`border-2 ${getHealthColor(plant.health)} ${animationClass} transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="pr-2">
                        <Link href={speciesUrl} className="hover:underline">
                          <CardTitle className="text-lg cursor-pointer hover:text-green-600 transition-colors">{plant.name}</CardTitle>
                        </Link>
                        <p className="text-sm text-muted-foreground">{plant.type}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className={getHealthColor(plant.health)}>
                            {plant.health}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeletePlant(plant.id, plant.name)}
                            aria-label={`Remove ${plant.name} from garden`}
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        </div>

                        {(() => {
                          const key = findBestPlantImageKey(plant.name);
                          const src = key ? (getPlantImage(key, 'xl') ?? getPlantImage(key, 'lg') ?? getPlantImage(key, 'medium')) : null;
                          if (!src) return null;
                          return (
                            <Link href={speciesUrl} className="block">
                              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border bg-white cursor-pointer hover:ring-2 hover:ring-green-500 transition-all">
                                <Image
                                  src={src}
                                  alt={`${plant.name} in ${plant.location}`}
                                  fill
                                  className="object-contain p-1"
                                  sizes="(max-width: 768px) 96px, 192px"
                                />
                              </div>
                            </Link>
                          );
                        })()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Planted: {plant.planted.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{plant.location}</span>
                    </div>
                    {plant.lastWatered && (
                      <div className="flex items-center gap-2 text-sm">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span>Last watered: {plant.lastWatered.toLocaleDateString()}</span>
                      </div>
                    )}
                    {plant.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        {plant.notes}
                      </p>
                    )}
                    
                    {/* Species Information */}
                    <PlantSpeciesInfo 
                      species={speciesCache.get(plant.name.toLowerCase()) ?? null}
                      isLoading={isLoadingSpecies && !speciesCache.has(plant.name.toLowerCase())}
                    />
                    
                    <div className="flex gap-2 pt-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link
                          href={`/grow/species/${encodeURIComponent(
                            speciesCache.get(plant.name.toLowerCase())?.slug ?? plant.name
                          )}`}
                        >
                          <Info className="h-3 w-3 mr-1" />
                          Find out more
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleEditPlant(plant)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-green-600">
                  {plants.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Plants</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-green-600">
                  {plants.filter(p => p.health === 'excellent').length}
                </p>
                <p className="text-sm text-muted-foreground">Excellent Health</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-yellow-600">
                  {plants.filter(p => p.health === 'fair' || p.health === 'poor').length}
                </p>
                <p className="text-sm text-muted-foreground">Need Attention</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-blue-600">
                  {new Set(plants.map(p => p.location)).size}
                </p>
                <p className="text-sm text-muted-foreground">Locations</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Identify */}
        <TabsContent value="identify" className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={identifyMode === 'plant' ? 'default' : 'outline'}
              onClick={() => setIdentifyMode('plant')}
              className={`flex-1 ${identifyMode === 'plant' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              <Sprout className="h-4 w-4 mr-2" />
              🌿 Identify Plant
            </Button>
            <Button
              variant={identifyMode === 'pest' ? 'default' : 'outline'}
              onClick={() => setIdentifyMode('pest')}
              className={`flex-1 ${identifyMode === 'pest' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
            >
              <Bug className="h-4 w-4 mr-2" />
              🐛 Identify Pest/Problem
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {identifyMode === 'plant' ? (
                  <>
                    <Sprout className="h-5 w-5 text-green-600" />
                    Plant Identification
                  </>
                ) : (
                  <>
                    <Bug className="h-5 w-5 text-orange-600" />
                    Pest & Problem Identification
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {identifyMode === 'plant' 
                  ? 'Take a photo of a plant to identify its species and get care information.'
                  : 'Take a photo of pests, diseases, or plant problems to get diagnosis and treatment options.'}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {/* Upload area */}
              {!identifyPhotoPreview ? (
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={handleChooseFile}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop an image, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports images up to 20MB (will be optimized automatically)
                  </p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button variant="outline" onClick={(e) => { e.stopPropagation(); handleChooseFile(); }}>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-base-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={identifyPhotoPreview}
                      alt="Photo to identify"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={handleClearPhoto}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleIdentifyPhoto} 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isIdentifying || !identifyPhoto}
              >
                {isIdentifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Identifying...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Identify {identifyMode === 'plant' ? 'Plant' : 'Pest'}
                  </>
                )}
              </Button>

              {/* Provider Toggle (for testing) */}
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <span className="text-xs text-muted-foreground">AI Provider:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setIdentifyProvider('openai')}
                    className={`px-2 py-1 text-xs rounded ${
                      identifyProvider === 'openai' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    OpenAI
                  </button>
                  <button
                    onClick={() => setIdentifyProvider('plantid')}
                    className={`px-2 py-1 text-xs rounded ${
                      identifyProvider === 'plantid' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    Plant.id
                  </button>
                </div>
              </div>

              {/* Identification Result */}
              {identifyResult && identifyResult.success && (
                <Card className={`${identifyResult.mode === 'plant' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {identifyResult.mode === 'plant' 
                            ? identifyResult.species?.name 
                            : identifyResult.diagnosis?.name}
                        </h4>
                        {identifyResult.mode === 'plant' && identifyResult.species?.scientificName && (
                          <p className="text-sm italic text-muted-foreground">
                            {identifyResult.species.scientificName}
                          </p>
                        )}
                        {identifyResult.mode === 'pest' && identifyResult.diagnosis?.type && (
                          <Badge variant="outline" className="mt-1">
                            {identifyResult.diagnosis.type}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {Math.round((identifyResult.confidence || 0) * 100)}%
                        </div>
                        <p className="text-xs text-muted-foreground">confidence</p>
                      </div>
                    </div>

                    {/* Wikipedia Description (expandable) */}
                    {identifyResult.mode === 'plant' && identifyResult.species?.wikiDescription && (
                      <div className="text-sm text-muted-foreground">
                        <p className="line-clamp-3">
                          {identifyResult.species.wikiDescription}
                        </p>
                        {identifyResult.species.wikiDescription.length > 200 && (
                          <details className="mt-1">
                            <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                              Show full description...
                            </summary>
                            <p className="mt-2 text-sm">
                              {identifyResult.species.wikiDescription}
                            </p>
                          </details>
                        )}
                      </div>
                    )}
                    
                    {/* Fallback to reasoning if no wiki description */}
                    {identifyResult.reasoning && !identifyResult.species?.wikiDescription && (
                      <p className="text-sm text-muted-foreground">
                        {identifyResult.reasoning}
                      </p>
                    )}

                    {identifyResult.alternatives && identifyResult.alternatives.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Other possibilities:</p>
                        <div className="flex flex-wrap gap-1">
                          {identifyResult.alternatives.slice(0, 3).map((alt, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {alt.name} ({Math.round(alt.confidence * 100)}%)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {identifyResult.mode === 'pest' && identifyResult.treatment && identifyResult.treatment.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Treatment:</p>
                        <ul className="text-sm space-y-1">
                          {identifyResult.treatment.slice(0, 3).map((step, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-green-600">•</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>Provider: {identifyResult.provider === 'openai' ? 'OpenAI Vision' : 'Plant.id'}</span>
                      <span>Cost: €{identifyResult.cost.toFixed(3)}</span>
                    </div>
                    
                    {/* Watering Requirements */}
                    {identifyResult.mode === 'plant' && identifyResult.species?.watering && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">💧 Watering needs:</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {(() => {
                              const w = identifyResult.species.watering;
                              const avg = (w.min + w.max) / 2;
                              if (avg <= 1.5) return '🌵 Low (drought tolerant)';
                              if (avg <= 2.5) return '💧 Moderate';
                              return '💦 High (keep moist)';
                            })()}
                          </span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3].map((level) => (
                              <div
                                key={level}
                                className={`w-3 h-3 rounded-full ${
                                  level <= identifyResult.species!.watering!.max
                                    ? 'bg-blue-500'
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Edible Parts */}
                    {identifyResult.mode === 'plant' && identifyResult.species?.edibleParts && identifyResult.species.edibleParts.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">🍽️ Edible parts:</p>
                        <div className="flex flex-wrap gap-1">
                          {identifyResult.species.edibleParts.map((part, i) => (
                            <Badge key={i} variant="secondary" className="text-xs capitalize">
                              {part}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Propagation Methods */}
                    {identifyResult.mode === 'plant' && identifyResult.species?.propagationMethods && identifyResult.species.propagationMethods.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">🌱 Propagation:</p>
                        <div className="flex flex-wrap gap-1">
                          {identifyResult.species.propagationMethods.map((method, i) => (
                            <Badge key={i} variant="outline" className="text-xs capitalize">
                              {method}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Multi-language names (Plant.id only) */}
                    {identifyResult.mode === 'plant' && identifyResult.species?.commonNamesByLanguage && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Names in other languages:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(identifyResult.species.commonNamesByLanguage)
                            .filter(([lang]) => lang !== 'en')
                            .slice(0, 6)
                            .map(([lang, names]) => (
                              <Badge key={lang} variant="outline" className="text-xs">
                                <span className="font-medium uppercase">{lang}:</span>&nbsp;{(names as string[])[0]}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                    
                    {/* External Links (Wikipedia, GBIF, iNaturalist) */}
                    {identifyResult.mode === 'plant' && (
                      identifyResult.species?.wikiUrl || 
                      identifyResult.species?.gbifId || 
                      identifyResult.species?.inaturalistId
                    ) && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">🔗 Learn more:</p>
                        <div className="flex flex-wrap gap-2">
                          {identifyResult.species?.wikiUrl && (
                            <a
                              href={identifyResult.species.wikiUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              📖 Wikipedia
                            </a>
                          )}
                          {identifyResult.species?.gbifId && (
                            <a
                              href={`https://www.gbif.org/species/${identifyResult.species.gbifId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              🌍 GBIF
                            </a>
                          )}
                          {identifyResult.species?.inaturalistId && (
                            <a
                              href={`https://www.inaturalist.org/taxa/${identifyResult.species.inaturalistId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              🦎 iNaturalist
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Link to species page - use common name for slug (matches our database) */}
                    {identifyResult.mode === 'plant' && identifyResult.species?.name && (
                      <div className="pt-2 border-t">
                        <Link
                          href={`/grow/species/${encodeURIComponent(
                            // Use common name for slug (our DB slugs are based on common names)
                            identifyResult.species.name
                              .toLowerCase()
                              .replace(/\s+/g, '-')
                          )}`}
                          className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 hover:underline"
                        >
                          <Sprout className="h-4 w-4" />
                          View {identifyResult.species.name} care guide →
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {identifyResult && !identifyResult.success && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">Identification Failed</h4>
                        <p className="text-sm text-muted-foreground">
                          {identifyResult.error || 'Could not identify. Please try with a clearer photo.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Info Cards */}
              {identifyMode === 'plant' && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">Plant Identification</h4>
                        <p className="text-sm text-muted-foreground">
                          Upload a photo to identify plants and get detailed care information. Results include common name, scientific name, and growing requirements.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {identifyMode === 'pest' && (
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">AI-Powered Diagnosis</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Get instant identification of common garden pests, diseases, and nutrient deficiencies. 
                          Includes both organic and conventional treatment options, plus Integrated Pest Management (IPM) guides.
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Can identify:</span>
                          </div>
                          <ul className="ml-4 space-y-1 text-muted-foreground">
                            <li>• Common garden pests (aphids, caterpillars, beetles)</li>
                            <li>• Plant diseases (blight, mildew, rust)</li>
                            <li>• Nutrient deficiencies (nitrogen, iron, etc.)</li>
                            <li>• Environmental stress (frost, sun damage)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Gallery */}
        <TabsContent value="gallery" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium">Garden Gallery</h2>
            <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
              <Camera className="h-4 w-4" />
              Add Photo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockPhotos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden">
                <div className="aspect-square relative">
                  <Image
                    src={photo.url}
                    alt={photo.description || 'Garden photo'}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  />
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    {photo.date.toLocaleDateString()}
                  </p>
                  {photo.description && (
                    <p className="text-sm mb-2">{photo.description}</p>
                  )}
                  {photo.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      {photo.location}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {photo.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Guild Modal */}
      <GuildModalEnhanced
        open={guildModalOpen}
        onClose={() => setGuildModalOpen(false)}
        climateZone={userClimateZone}
        onGuildSelected={handleGuildSelected}
      />
      <AddPlantDialog
        open={isAddPlantDialogOpen}
        onOpenChange={setIsAddPlantDialogOpen}
        onPlantAdded={handlePlantAdded}
      />
      <EditPlantDialog
        open={isEditPlantDialogOpen}
        onOpenChange={setIsEditPlantDialogOpen}
        plant={editingPlant}
        onPlantUpdated={handlePlantUpdated}
      />
    </div>
  );
}
