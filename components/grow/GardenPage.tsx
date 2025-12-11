import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  Pencil
} from 'lucide-react';
import { GuildModalEnhanced } from './GuildModalEnhanced';
import type { GuildCompanion } from '../../lib/grow/guild';
import { api } from '../../lib/grow/api';
import { AddPlantDialog } from './AddPlantDialog';
import { EditPlantDialog } from './EditPlantDialog';
import type { SerializedPlant } from '../../lib/grow/server/plants';
import { buildGrowLoginUrl, GROW_ROOT_PATH } from '../../lib/grow/routes';
import { useImageCompression } from '../../hooks/useImageCompression';
import { SkeletonGardenPage } from './GrowSkeletons';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image compression hook
  const {
    compress: compressImage,
    statusMessage: compressionMessage,
    savingsText,
    isProcessing: isCompressing,
  } = useImageCompression();
  
  // Plant inventory state
  const [plants, setPlants] = useState<Plant[]>([]);
  
  // Mock climate zone - in real app, get from user profile
  const userClimateZone = 'atlantic_mild';

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
      url: 'https://images.unsplash.com/photo-1592150621744-aca4f9dbd4c4?w=400',
      date: new Date(2025, 10, 10),
      tags: ['tomatoes', 'harvest'],
      location: 'Raised Bed 1',
      plants: ['Cherry Tomatoes'],
      description: 'First ripe tomatoes of the season!'
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
      date: new Date(2025, 9, 15),
      tags: ['flowers', 'roses'],
      location: 'Front Garden',
      plants: ['Peace Rose']
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400',
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

  const handleIdentifyPhoto = () => {
    if (!identifyPhoto) {
      toast.error('Please select a photo first');
      return;
    }
    
    setIsIdentifying(true);
    // TODO: Call actual API when available
    // const endpoint = identifyMode === 'plant' ? '/api/daisy/identify-plant' : '/api/daisy/identify-pest';
    setTimeout(() => {
      setIsIdentifying(false);
      toast.info('Identification coming soon!', {
        description: 'This feature is currently under development.',
      });
    }, 2000);
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

    // Compress for upload
    try {
      const compressionResult = await compressImage(file, {
        maxSizeMB: 4,
        maxDimension: 1920,
        preserveExif: true,
      });
      setIdentifyPhoto(compressionResult.file);
    } catch (err) {
      console.error('[GardenPage] Compression failed, using original:', err);
      setIdentifyPhoto(file);
    }
  };

  // Clear selected photo
  const handleClearPhoto = () => {
    setIdentifyPhoto(null);
    setIdentifyPhotoPreview(null);
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
      
      // Optimistically update UI
      setPlants(prevPlants => prevPlants.filter(p => p.id !== plantId));
      console.log(`🗑️ [GardenPage] Optimistically removed plant from UI`);
      
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
            <Sprout className="h-8 w-8 text-green-600" />
            My Garden
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your plants, identify species, and document your journey
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plants" className="flex items-center gap-2">
            <Sprout className="h-4 w-4" />
            My Plants
          </TabsTrigger>
          <TabsTrigger value="identify" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Identify
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Gallery
          </TabsTrigger>
        </TabsList>

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
              >
                <Plus className="h-4 w-4" />
                Add Plant
              </Button>
            </div>
          </div>

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
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plants.map((plant) => (
                <Card key={plant.id} className={`border-2 ${getHealthColor(plant.health)}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{plant.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{plant.type}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={getHealthColor(plant.health)}>
                          {plant.health}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeletePlant(plant.id, plant.name)}
                          title="Remove plant"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Droplets className="h-3 w-3 mr-1" />
                        Water
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
              ))}
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
                  {/* Compression status */}
                  {isCompressing && (
                    <div className="mt-2 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {compressionMessage || 'Optimizing image...'}
                    </div>
                  )}
                  {!isCompressing && savingsText && (
                    <div className="mt-2 text-center text-xs text-green-600 flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Image optimized: {savingsText}
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={handleIdentifyPhoto} 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isIdentifying || isCompressing || !identifyPhoto}
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
