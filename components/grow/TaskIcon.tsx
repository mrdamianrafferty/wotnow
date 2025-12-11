'use client';

import React from 'react';
import Image from 'next/image';
import {
  Droplets,
  Scissors,
  Sprout,
  Leaf,
  Shovel,
  Bug,
  Sun,
  Snowflake,
  TreeDeciduous,
  Flower2,
  Apple,
  Package,
  Calendar,
  ClipboardList,
  ShoppingCart,
  Thermometer,
  Wind,
  CloudRain,
  Moon,
  type LucideIcon
} from 'lucide-react';

// Available woodcut icons (30 total):
// apron.png, ax.png, boots.png, bucket.png, compost.png, fertilise.png,
// fiddle-leaf-fig-plant.png, garden-fork.png, gardener.png, gloves.png,
// harvest-basket.png, inspect.png, journal.png, leave.png, leave-2.png,
// leave-3.png, leave-4.png, little-garden-fork.png, little-shovel.png,
// mulch.png, rake.png, rubber-tree-plant.png, scissors.png, scissors-2.png,
// scissors-3.png, shovel.png, soli-test-kit.png, vintage-water-spray-can.png,
// watering-can.png, watering-can-2.png, weed.png

// Map task codes to woodcut image paths
// These woodcut-style illustrations provide a cohesive, artisanal aesthetic
const WOODCUT_ICONS: Record<string, string> = {
  // === WATERING TASKS ===
  'water': '/grow/icons/watering-can.png',
  'watering': '/grow/icons/watering-can.png',
  'irrigate': '/grow/icons/watering-can.png',
  'irrigation': '/grow/icons/watering-can.png',
  'deep-water': '/grow/icons/watering-can-2.png',
  'mist': '/grow/icons/vintage-water-spray-can.png',
  'misting': '/grow/icons/vintage-water-spray-can.png',
  'spray': '/grow/icons/vintage-water-spray-can.png',
  
  // === PRUNING/CUTTING TASKS ===
  'prune': '/grow/icons/scissors.png',
  'pruning': '/grow/icons/scissors.png',
  'trim': '/grow/icons/scissors-2.png',
  'trimming': '/grow/icons/scissors-2.png',
  'deadhead': '/grow/icons/scissors-3.png',
  'deadheading': '/grow/icons/scissors-3.png',
  'cut': '/grow/icons/scissors.png',
  'cutting': '/grow/icons/scissors.png',
  'pinch': '/grow/icons/scissors-2.png',
  'pinching': '/grow/icons/scissors-2.png',
  
  // === PLANTING TASKS ===
  'plant': '/grow/icons/fiddle-leaf-fig-plant.png',
  'planting': '/grow/icons/fiddle-leaf-fig-plant.png',
  'transplant': '/grow/icons/rubber-tree-plant.png',
  'transplanting': '/grow/icons/rubber-tree-plant.png',
  'repot': '/grow/icons/rubber-tree-plant.png',
  'repotting': '/grow/icons/rubber-tree-plant.png',
  'pot': '/grow/icons/fiddle-leaf-fig-plant.png',
  
  // === SOWING/SEEDS ===
  'sow': '/grow/icons/leave-2.png',
  'sowing': '/grow/icons/leave-2.png',
  'seed': '/grow/icons/leave-2.png',
  'seeds': '/grow/icons/leave-2.png',
  'seedling': '/grow/icons/leave-3.png',
  'seedlings': '/grow/icons/leave-3.png',
  'germinate': '/grow/icons/leave-2.png',
  'germination': '/grow/icons/leave-2.png',
  'propagate': '/grow/icons/leave-4.png',
  'propagation': '/grow/icons/leave-4.png',
  
  // === HARVESTING ===
  'harvest': '/grow/icons/harvest-basket.png',
  'harvesting': '/grow/icons/harvest-basket.png',
  'pick': '/grow/icons/harvest-basket.png',
  'picking': '/grow/icons/harvest-basket.png',
  'collect': '/grow/icons/bucket.png',
  'collecting': '/grow/icons/bucket.png',
  'gather': '/grow/icons/harvest-basket.png',
  'gathering': '/grow/icons/harvest-basket.png',
  
  // === SOIL/DIGGING ===
  'dig': '/grow/icons/shovel.png',
  'digging': '/grow/icons/shovel.png',
  'soil': '/grow/icons/shovel.png',
  'prepare': '/grow/icons/little-shovel.png',
  'preparation': '/grow/icons/little-shovel.png',
  'amend': '/grow/icons/shovel.png',
  'bed': '/grow/icons/shovel.png',
  'beds': '/grow/icons/shovel.png',
  'test': '/grow/icons/soli-test-kit.png',
  'soil-test': '/grow/icons/soli-test-kit.png',
  'ph': '/grow/icons/soli-test-kit.png',
  
  // === RAKING/CLEANUP ===
  'rake': '/grow/icons/rake.png',
  'raking': '/grow/icons/rake.png',
  'leaves': '/grow/icons/rake.png',
  'cleanup': '/grow/icons/rake.png',
  'clean': '/grow/icons/rake.png',
  'tidy': '/grow/icons/rake.png',
  
  // === WEEDING ===
  'weed': '/grow/icons/weed.png',
  'weeding': '/grow/icons/weed.png',
  'weeds': '/grow/icons/weed.png',
  'hoe': '/grow/icons/little-garden-fork.png',
  'hoeing': '/grow/icons/little-garden-fork.png',
  
  // === COMPOSTING/TURNING ===
  'fork': '/grow/icons/garden-fork.png',
  'turn': '/grow/icons/garden-fork.png',
  'turning': '/grow/icons/garden-fork.png',
  'aerate': '/grow/icons/garden-fork.png',
  'aeration': '/grow/icons/garden-fork.png',
  'compost': '/grow/icons/compost.png',
  'composting': '/grow/icons/compost.png',
  
  // === FEEDING/FERTILIZING ===
  'feed': '/grow/icons/fertilise.png',
  'feeding': '/grow/icons/fertilise.png',
  'fertilize': '/grow/icons/fertilise.png',
  'fertilizing': '/grow/icons/fertilise.png',
  'fertilise': '/grow/icons/fertilise.png',
  'fertilising': '/grow/icons/fertilise.png',
  'nutrient': '/grow/icons/fertilise.png',
  'nutrients': '/grow/icons/fertilise.png',
  
  // === MULCHING ===
  'mulch': '/grow/icons/mulch.png',
  'mulching': '/grow/icons/mulch.png',
  'cover': '/grow/icons/mulch.png',
  
  // === PEST/DISEASE INSPECTION ===
  'inspect': '/grow/icons/inspect.png',
  'inspection': '/grow/icons/inspect.png',
  'check': '/grow/icons/inspect.png',
  'monitor': '/grow/icons/inspect.png',
  'monitoring': '/grow/icons/inspect.png',
  'pest': '/grow/icons/inspect.png',
  'pests': '/grow/icons/inspect.png',
  'disease': '/grow/icons/inspect.png',
  'scout': '/grow/icons/inspect.png',
  'scouting': '/grow/icons/inspect.png',
  
  // === PLANNING/JOURNALING ===
  'plan': '/grow/icons/journal.png',
  'planning': '/grow/icons/journal.png',
  'journal': '/grow/icons/journal.png',
  'record': '/grow/icons/journal.png',
  'note': '/grow/icons/journal.png',
  'notes': '/grow/icons/journal.png',
  'log': '/grow/icons/journal.png',
  'schedule': '/grow/icons/journal.png',
  
  // === GENERAL GARDENING ===
  'garden': '/grow/icons/gardener.png',
  'gardening': '/grow/icons/gardener.png',
  'grow': '/grow/icons/leave.png',
  'growing': '/grow/icons/leave.png',
  'maintain': '/grow/icons/little-garden-fork.png',
  'maintenance': '/grow/icons/little-garden-fork.png',
  'care': '/grow/icons/gloves.png',
  'caring': '/grow/icons/gloves.png',
  
  // === WINTER/PROTECTION ===
  'protect': '/grow/icons/gloves.png',
  'protection': '/grow/icons/gloves.png',
  'winter': '/grow/icons/boots.png',
  'winterize': '/grow/icons/boots.png',
  'frost': '/grow/icons/boots.png',
  'cold': '/grow/icons/boots.png',
  
  // === EQUIPMENT/TOOLS ===
  'tools': '/grow/icons/little-garden-fork.png',
  'equipment': '/grow/icons/apron.png',
  'gear': '/grow/icons/apron.png',
  'chop': '/grow/icons/ax.png',
  'chopping': '/grow/icons/ax.png',
  'wood': '/grow/icons/ax.png',
  
  // === FALLBACK CATEGORIES ===
  'general': '/grow/icons/gardener.png',
  'default': '/grow/icons/leave.png',
};

// Fallback Lucide icons when woodcut not available
const FALLBACK_ICONS: Record<string, LucideIcon> = {
  'water': Droplets,
  'prune': Scissors,
  'plant': Sprout,
  'sow': Leaf,
  'harvest': Apple,
  'dig': Shovel,
  'pest': Bug,
  'winter': Snowflake,
  'summer': Sun,
  'shade': TreeDeciduous,
  'flower': Flower2,
  'store': Package,
  'plan': Calendar,
  'list': ClipboardList,
  'buy': ShoppingCart,
  'temperature': Thermometer,
  'weather': CloudRain,
  'wind': Wind,
  'night': Moon,
  'default': Sprout,
};

// Map size to optimized icon directory
// desktop: 192px (hero displays on desktop)
// mobile: 96px (card displays, default)
// small: 48px (list items, compact views)
const SIZE_TO_DIR: Record<string, string> = {
  sm: 'small',      // 48px - list items
  md: 'small',      // 48px - compact views
  lg: 'mobile',     // 96px - standard icons
  xl: 'mobile',     // 96px - larger icons
  hero: 'desktop',  // 192px - hero displays
};

interface TaskIconProps {
  taskCode: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  useWoodcut?: boolean;
  className?: string;
}

export function TaskIcon({ taskCode, size = 'md', useWoodcut = true, className = '' }: TaskIconProps) {
  const code = taskCode.toLowerCase();
  
  // Get the appropriate directory for this size
  const iconDir = SIZE_TO_DIR[size] || 'mobile';
  
  // Determine icon size in pixels for display
  const sizeMap: Record<string, number> = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 48,
    hero: 96,
  };
  const pixelSize = sizeMap[size];
  
  // Tailwind size classes
  const sizeClassMap: Record<string, string> = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-12 w-12',
    hero: 'h-24 w-24',
  };
  const iconClassName = sizeClassMap[size];
  
  // Helper to get the optimized icon path
  const getIconPath = (basePath: string): string => {
    // basePath is like '/grow/icons/watering-can.png'
    // Convert to '/grow/icons/mobile/watering-can.png'
    return basePath.replace('/grow/icons/', `/grow/icons/${iconDir}/`);
  };
  
  // Find woodcut icon if available
  if (useWoodcut) {
    // Check for exact match first
    if (WOODCUT_ICONS[code]) {
      const iconPath = getIconPath(WOODCUT_ICONS[code]);
      return (
        <Image
          src={iconPath}
          alt={taskCode}
          width={pixelSize}
          height={pixelSize}
          className={`${iconClassName} object-contain ${className}`}
          unoptimized
        />
      );
    }
    
    // Check for partial match (e.g., "water-tomatoes" contains "water")
    const partialMatch = Object.keys(WOODCUT_ICONS).find(key => code.includes(key));
    if (partialMatch) {
      const iconPath = getIconPath(WOODCUT_ICONS[partialMatch]);
      return (
        <Image
          src={iconPath}
          alt={taskCode}
          width={pixelSize}
          height={pixelSize}
          className={`${iconClassName} object-contain ${className}`}
          unoptimized
        />
      );
    }
  }
  
  // Fall back to Lucide icon
  const FallbackIcon = FALLBACK_ICONS[code] 
    || Object.entries(FALLBACK_ICONS).find(([key]) => code.includes(key))?.[1]
    || FALLBACK_ICONS['default'];
  
  return <FallbackIcon className={`${iconClassName} ${className}`} />;
}
